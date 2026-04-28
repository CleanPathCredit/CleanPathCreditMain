/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * DisputeLettersPanel — client-facing view of generated dispute-letter
 * packets, grouped by round.
 *
 * Reads from `letter_rounds` + `letter_packets` filtered to the
 * caller's profile (RLS enforces the scope; this component does not
 * trust client-side filtering for security).
 *
 * Plan gating happens at the call site via <PlanGate
 * feature="dispute_letters" />. This component itself assumes the
 * caller has already been admitted.
 */

import { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download,
  FileText,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import type {
  LetterRound,
  LetterPacket,
  LetterRoundStatus,
} from "@/types/database";

interface RoundView extends LetterRound {
  packets: LetterPacket[];
}

const STATUS_COPY: Record<LetterRoundStatus, { label: string; tone: string }> = {
  pending_payment:    { label: "Awaiting payment",            tone: "amber" },
  pending_report:     { label: "Waiting on credit report",    tone: "amber" },
  drafting:           { label: "Drafting",                    tone: "blue"  },
  letters_generated:  { label: "Letters generated",           tone: "emerald" },
  pending_notary:     { label: "Awaiting notary",             tone: "blue"  },
  notarized:          { label: "Notarized — awaiting mailing", tone: "blue" },
  sent:               { label: "Sent (certified mail)",       tone: "emerald" },
  complete:           { label: "Complete",                    tone: "emerald" },
};

const TONE_CLASSES: Record<string, string> = {
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  blue:    "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function DisputeLettersPanel() {
  const { clerkUser, supabase } = useAuth();
  const { session } = useSession();
  const [rounds, setRounds] = useState<RoundView[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingRoundId, setPayingRoundId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!clerkUser) return;
    let active = true;
    (async () => {
      const { data: rs } = await supabase
        .from("letter_rounds")
        .select("*")
        .eq("profile_id", clerkUser.id)
        .order("round_number", { ascending: true });

      const out: RoundView[] = [];
      for (const r of rs ?? []) {
        const { data: packets } = await supabase
          .from("letter_packets")
          .select("*")
          .eq("letter_round_id", r.id)
          .eq("is_current", true);
        out.push({ ...r, packets: packets ?? [] });
      }
      if (active) {
        setRounds(out);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clerkUser?.id, supabase]);

  const downloadPacket = async (packet: LetterPacket) => {
    if (!packet.document_id) return;
    const { data: doc } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", packet.document_id)
      .single();
    if (!doc) return;
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 900);
    if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
  };

  /**
   * Open Stripe Checkout for an unpaid round. The session is created
   * server-side via /api/letters/checkout with metadata.letter_round_id
   * pre-set, so when payment completes the existing Stripe webhook
   * flips this round's payment_cleared_at and unlocks generation.
   */
  const payForRound = async (roundId: string) => {
    if (!session) return;
    setPayingRoundId(roundId);
    setPayError(null);
    try {
      const token = await session.getToken();
      const res = await fetch("/api/letters/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ letter_round_id: roundId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPayError(data.error ?? `Payment unavailable (HTTP ${res.status})`);
        return;
      }
      // Same-tab redirect; Stripe sends them back to /dashboard?paid=true
      // on success, which will refresh this view and show the unlocked
      // status next time it mounts.
      window.location.href = data.url;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : String(e));
    } finally {
      setPayingRoundId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Loading your dispute letters…
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <ShieldCheck className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-900">
          No dispute letters yet
        </h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
          Once your specialist drafts your letters, every bureau's packet will
          appear here for download. Each round shows up as it's generated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex items-start gap-4">
        <Lock className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            How to use these letters
          </h3>
          <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
            Each round produces one PDF per credit bureau. Print them on plain
            paper, get them notarized (609 rounds only), and mail them by{" "}
            <strong>certified mail with return receipt</strong> to the address
            printed at the top of each letter. Keep the green return-receipt
            cards — they prove the bureaus received your dispute.
          </p>
        </div>
      </div>

      {payError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {payError}
        </div>
      )}

      {rounds.map((r) => {
        const tone = STATUS_COPY[r.status];
        const needsPayment = !r.payment_cleared_at;
        const isPaying = payingRoundId === r.id;
        return (
          <section
            key={r.id}
            className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
          >
            <header className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-zinc-900">
                  {r.letter_type} — Round {r.round_number}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {r.letters_generated_at
                    ? `Generated ${new Date(r.letters_generated_at).toLocaleDateString()}`
                    : "Not generated yet"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TONE_CLASSES[tone.tone]}`}
                >
                  {tone.tone === "emerald" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {tone.label}
                </span>
                {needsPayment && (
                  <button
                    onClick={() => payForRound(r.id)}
                    disabled={isPaying}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CreditCard className="h-3 w-3" />
                    {isPaying ? "Opening checkout…" : `Pay for Round ${r.round_number}`}
                  </button>
                )}
              </div>
            </header>

            <div className="px-5 py-4">
              {r.packets.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Letters for this round haven't been generated yet. You'll get
                  an email when they're ready.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {r.packets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => downloadPacket(p)}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-red-500 group-hover:border-emerald-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 capitalize">
                          {p.bureau ?? "creditor"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          v{p.version} · PDF
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-zinc-400 group-hover:text-emerald-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
