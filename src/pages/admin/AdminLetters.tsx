/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Admin → Letters management page.
 *
 * Internal-only. Lets the firm:
 *   - Pick a client
 *   - Create a `letter_round` for that client (609 R1-R4 or 611)
 *   - For each bureau, attach negative items (account name, number,
 *     status, optional 611 dispute_reason / believed_correct)
 *   - Click "Generate" to call /api/letters/generate which renders the
 *     PDFs and stores them in Supabase Storage
 *
 * Out-of-scope for this MVP (tracked separately):
 *   - Stripe payment-cleared gate (admin can ignore for now)
 *   - 3-day CROA cancellation hold
 *   - 623 letters
 *   - Resend email delivery
 */

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { isInCroaHold, croaHoldUntil } from "@/lib/letters/croaHold";
import {
  ChevronLeft,
  Plus,
  FileText,
  Sparkles,
  Trash2,
  Download,
  Clock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import type {
  Profile,
  LetterRound,
  BureauReport,
  NegativeItem,
  LetterPacket,
  Bureau,
  LetterType,
  AccountStatus,
} from "@/types/database";

const BUREAUS: ReadonlyArray<Bureau> = ["equifax", "transunion", "experian"];
const ACCOUNT_STATUSES: ReadonlyArray<AccountStatus> = [
  "charge_off",
  "collection",
  "not_in_good_standing",
];

type RoundWithChildren = LetterRound & {
  bureauReports: (BureauReport & { items: NegativeItem[] })[];
  packets: LetterPacket[];
};

export function AdminLetters() {
  const { profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const { session } = useSession();

  const [clients, setClients] = useState<Profile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundWithChildren[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin-only guard
  useEffect(() => {
    if (loading) return;
    if (!isAdmin) navigate("/login");
  }, [loading, isAdmin, navigate]);

  // Load client list
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("created_at", { ascending: false })
      .then(({ data }) => setClients(data ?? []));
  }, [isAdmin, supabase]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  // Load rounds + nested bureau reports + items + packets for selected client
  const reloadRounds = async (clientId: string) => {
    const { data: rs } = await supabase
      .from("letter_rounds")
      .select("*")
      .eq("profile_id", clientId)
      .order("round_number", { ascending: true });

    if (!rs) {
      setRounds([]);
      return;
    }

    const out: RoundWithChildren[] = [];
    for (const r of rs) {
      const { data: brs } = await supabase
        .from("bureau_reports")
        .select("*")
        .eq("letter_round_id", r.id);
      const bureauReports: (BureauReport & { items: NegativeItem[] })[] = [];
      for (const br of brs ?? []) {
        const { data: items } = await supabase
          .from("negative_items")
          .select("*")
          .eq("bureau_report_id", br.id)
          .order("display_order", { ascending: true });
        bureauReports.push({ ...br, items: items ?? [] });
      }
      const { data: packets } = await supabase
        .from("letter_packets")
        .select("*")
        .eq("letter_round_id", r.id)
        .eq("is_current", true);
      out.push({ ...r, bureauReports, packets: packets ?? [] });
    }
    setRounds(out);
  };

  useEffect(() => {
    if (!selectedClientId) {
      setRounds([]);
      return;
    }
    reloadRounds(selectedClientId);
  }, [selectedClientId]);

  // ── Mutations ─────────────────────────────────────────────────────
  const createRound = async (
    letterType: LetterType,
    roundNumber: number,
  ) => {
    if (!selectedClientId) return;
    setError(null);
    const { error } = await supabase.from("letter_rounds").insert({
      profile_id: selectedClientId,
      letter_type: letterType,
      round_number: roundNumber,
      status: "drafting",
    });
    if (error) setError(error.message);
    else reloadRounds(selectedClientId);
  };

  const addBureauReport = async (roundId: string, bureau: Bureau) => {
    setError(null);
    const { error } = await supabase
      .from("bureau_reports")
      .insert({ letter_round_id: roundId, bureau });
    if (error) setError(error.message);
    else if (selectedClientId) reloadRounds(selectedClientId);
  };

  const addItem = async (
    bureauReportId: string,
    item: {
      account_name: string;
      account_number: string;
      account_status: AccountStatus;
      dispute_reason?: string;
      believed_correct?: string;
    },
  ) => {
    setError(null);
    const { error } = await supabase
      .from("negative_items")
      .insert({ ...item, bureau_report_id: bureauReportId });
    if (error) setError(error.message);
    else if (selectedClientId) reloadRounds(selectedClientId);
  };

  /**
   * Manually mark a round's payment as cleared. Use this for offline /
   * out-of-band payments (cash, ACH outside Stripe, comp'd rounds for
   * existing clients). Sets the same `payment_cleared_at` column that
   * the Stripe webhook would set, so the API gate sees both paths the
   * same way. The "PAID OFFLINE" tracking string lets you distinguish
   * manual vs Stripe-driven clears later.
   */
  const markPaid = async (roundId: string) => {
    if (!confirm("Mark this round as paid? Use only when payment was collected outside Stripe.")) return;
    setError(null);
    const { error } = await supabase
      .from("letter_rounds")
      .update({
        payment_cleared_at: new Date().toISOString(),
        payment_stripe_id:  "PAID_OFFLINE",
        status:             "drafting",
      })
      .eq("id", roundId);
    if (error) setError(error.message);
    else if (selectedClientId) reloadRounds(selectedClientId);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("negative_items").delete().eq("id", id);
    if (selectedClientId) reloadRounds(selectedClientId);
  };

  const generate = async (round: RoundWithChildren) => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const token = await session.getToken();
      const res = await fetch("/api/letters/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ letter_round_id: round.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      if (selectedClientId) await reloadRounds(selectedClientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 -ml-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900"
            aria-label="Back to admin"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Dispute Letters</h1>
            <p className="text-xs text-zinc-500">
              Internal — generate FCRA dispute letter packets per client.
            </p>
          </div>
        </div>
        {profile?.email && (
          <div className="text-xs text-zinc-500">{profile.email}</div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Client picker */}
        <section>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Client
          </label>
          <select
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value || null)}
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? "(no name)"} — {c.email}
              </option>
            ))}
          </select>
        </section>

        {selectedClient && (
          <>
            {/* Create new round */}
            <section className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">
                New round
              </h2>
              <RoundCreator onCreate={createRound} existing={rounds} />
            </section>

            {/* Existing rounds */}
            <section className="space-y-6">
              {rounds.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                  No rounds yet for this client.
                </div>
              )}
              {rounds.map((r) => (
                <RoundCard
                  key={r.id}
                  round={r}
                  busy={busy}
                  contractDate={selectedClient.created_at}
                  onAddBureau={(b) => addBureauReport(r.id, b)}
                  onAddItem={(brId, item) => addItem(brId, item)}
                  onDeleteItem={deleteItem}
                  onGenerate={() => generate(r)}
                  onMarkPaid={() => markPaid(r.id)}
                  onDownload={downloadPacket}
                />
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// ── RoundCreator ────────────────────────────────────────────────────
function RoundCreator({
  onCreate,
  existing,
}: {
  onCreate: (lt: LetterType, rn: number) => void;
  existing: RoundWithChildren[];
}) {
  const [letterType, setLetterType] = useState<LetterType>("609");
  const [roundNumber, setRoundNumber] = useState(1);

  const exists = existing.some(
    (r) => r.letter_type === letterType && r.round_number === roundNumber,
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Letter type</label>
        <select
          value={letterType}
          onChange={(e) => setLetterType(e.target.value as LetterType)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="609">609 (verifiable proof)</option>
          <option value="611">611 (per-item dispute)</option>
          {/* 623 deferred until template lands */}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Round #</label>
        <select
          value={roundNumber}
          onChange={(e) => setRoundNumber(Number(e.target.value))}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          {(letterType === "609" ? [1, 2, 3, 4] : [1]).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onCreate(letterType, roundNumber)}
        disabled={exists}
      >
        <Plus className="h-4 w-4" /> {exists ? "Already exists" : "Create round"}
      </Button>
    </div>
  );
}

// ── RoundCard ───────────────────────────────────────────────────────
function RoundCard({
  round,
  busy,
  contractDate,
  onAddBureau,
  onAddItem,
  onDeleteItem,
  onGenerate,
  onMarkPaid,
  onDownload,
}: {
  round: RoundWithChildren;
  busy: boolean;
  /** ISO timestamp from profiles.created_at — used for the CROA hold window. */
  contractDate: string;
  onAddBureau: (b: Bureau) => void;
  onAddItem: (
    bureauReportId: string,
    item: {
      account_name: string;
      account_number: string;
      account_status: AccountStatus;
      dispute_reason?: string;
      believed_correct?: string;
    },
  ) => void;
  onDeleteItem: (id: string) => void;
  onGenerate: () => void;
  onMarkPaid: () => void;
  onDownload: (p: LetterPacket) => void;
}) {
  const usedBureaus = new Set(round.bureauReports.map((b) => b.bureau));
  const remainingBureaus = BUREAUS.filter((b) => !usedBureaus.has(b));
  const totalItems = round.bureauReports.reduce(
    (s, br) => s + br.items.length,
    0,
  );

  // CROA §407 — Round 1 only; freezes until 3 business days after the
  // contract date. Mirrored server-side in /api/letters/generate so a
  // determined admin can't bypass by hitting the API directly.
  const contractDt = new Date(contractDate);
  const inHold = isInCroaHold(contractDt, round.round_number);
  const holdUntil = croaHoldUntil(contractDt, round.round_number);

  // Payment gate — mirrors the server check in /api/letters/generate.
  // The Stripe webhook flips payment_cleared_at when a checkout session
  // with metadata.letter_round_id completes; "Mark as paid" is the
  // manual override for offline payments. Either path unlocks generation.
  const paid = !!round.payment_cleared_at;
  const paidOffline = round.payment_stripe_id === "PAID_OFFLINE";

  const generateDisabled = busy || totalItems === 0 || inHold || !paid;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-zinc-900">
            {round.letter_type} — Round {round.round_number}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Status: {round.status}
            {round.letters_generated_at && (
              <>
                {" "}· generated{" "}
                {new Date(round.letters_generated_at).toLocaleString()}
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {inHold && holdUntil && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                <Clock className="h-3 w-3" />
                CROA hold — unlocks {holdUntil.toLocaleDateString()}
              </span>
            )}
            {paid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Paid {paidOffline ? "(offline)" : ""}
                {round.payment_cleared_at && (
                  <> · {new Date(round.payment_cleared_at).toLocaleDateString()}</>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800">
                <DollarSign className="h-3 w-3" />
                Awaiting payment
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {remainingBureaus.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onAddBureau(e.target.value as Bureau);
                  e.target.value = "";
                }
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs"
            >
              <option value="">+ Add bureau</option>
              {remainingBureaus.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
          {!paid && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkPaid}
            >
              <DollarSign className="h-4 w-4" />
              Mark paid
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onGenerate}
            disabled={generateDisabled}
          >
            <Sparkles className="h-4 w-4" />
            {busy
              ? "Generating…"
              : inHold
                ? "Held (CROA)"
                : !paid
                  ? "Awaiting payment"
                  : "Generate letters"}
          </Button>
        </div>
      </div>

      {/* Generated packets */}
      {round.packets.length > 0 && (
        <div className="px-5 py-3 border-b border-zinc-100 bg-emerald-50/30 flex flex-wrap gap-2">
          {round.packets.map((p) => (
            <button
              key={p.id}
              onClick={() => onDownload(p)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="h-3 w-3" />
              {p.bureau} v{p.version}
            </button>
          ))}
        </div>
      )}

      {/* Bureau report sections */}
      <div className="divide-y divide-zinc-100">
        {round.bureauReports.length === 0 && (
          <div className="px-5 py-6 text-sm text-zinc-500">
            No bureau reports yet — add one to start entering items.
          </div>
        )}
        {round.bureauReports.map((br) => (
          <BureauSection
            key={br.id}
            bureauReport={br}
            isLetter611={round.letter_type === "611"}
            onAddItem={(item) => onAddItem(br.id, item)}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </div>
    </div>
  );
}

// ── BureauSection ───────────────────────────────────────────────────
function BureauSection({
  bureauReport,
  isLetter611,
  onAddItem,
  onDeleteItem,
}: {
  bureauReport: BureauReport & { items: NegativeItem[] };
  isLetter611: boolean;
  onAddItem: (item: {
    account_name: string;
    account_number: string;
    account_status: AccountStatus;
    dispute_reason?: string;
    believed_correct?: string;
  }) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [status, setStatus] = useState<AccountStatus>("collection");
  const [reason, setReason] = useState("");
  const [correct, setCorrect] = useState("");

  const submit = () => {
    if (!accountName.trim() || !accountNumber.trim()) return;
    onAddItem({
      account_name: accountName.trim(),
      account_number: accountNumber.trim(),
      account_status: status,
      dispute_reason: isLetter611 ? reason.trim() || undefined : undefined,
      believed_correct: isLetter611 ? correct.trim() || undefined : undefined,
    });
    setAccountName("");
    setAccountNumber("");
    setReason("");
    setCorrect("");
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-bold text-zinc-900 capitalize">
          {bureauReport.bureau}
        </span>
        <span className="text-xs text-zinc-400">
          ({bureauReport.items.length} item{bureauReport.items.length === 1 ? "" : "s"})
        </span>
      </div>

      {bureauReport.items.length > 0 && (
        <table className="w-full text-xs mb-3 border border-zinc-100 rounded">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Number</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              {isLetter611 && (
                <>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                  <th className="px-3 py-2 text-left font-medium">Correct</th>
                </>
              )}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {bureauReport.items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 text-zinc-900">{it.account_name}</td>
                <td className="px-3 py-2 font-mono text-zinc-700">
                  {it.account_number}
                </td>
                <td className="px-3 py-2 text-zinc-600">{it.account_status}</td>
                {isLetter611 && (
                  <>
                    <td className="px-3 py-2 text-zinc-600">{it.dispute_reason ?? ""}</td>
                    <td className="px-3 py-2 text-zinc-600">{it.believed_correct ?? ""}</td>
                  </>
                )}
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => onDeleteItem(it.id)}
                    className="text-zinc-400 hover:text-red-600"
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add-item form */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <input
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="Account name (e.g. BANK OF AMERICA)"
          className="rounded border border-zinc-200 px-2 py-1.5 text-xs"
        />
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="Account # (e.g. 5555****1234)"
          className="rounded border border-zinc-200 px-2 py-1.5 text-xs font-mono"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountStatus)}
          className="rounded border border-zinc-200 px-2 py-1.5 text-xs"
        >
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {isLetter611 && (
          <>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for dispute"
              className="rounded border border-zinc-200 px-2 py-1.5 text-xs"
            />
            <input
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
              placeholder="What I believe is correct"
              className="rounded border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={!accountName.trim() || !accountNumber.trim()}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
