/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReferralCard
 * ─────────────
 * Dashboard card showing the user's referral code, share controls, and
 * lifecycle stats. Pulls from /api/referrals/me on mount.
 *
 * Surfaces:
 *   - The code itself (CPC-XXXXXX) in a copyable pill
 *   - "Copy link" + native Web Share fallback
 *   - 4 stat tiles: clicks · signups · purchases · pending payout
 *   - Optional recent activity list
 *
 * Compliance note:
 *   We pay $50 per qualified purchase. The DOM intentionally does NOT
 *   make any score-improvement claims tied to referrals — referrers earn
 *   for sharing, not for outcomes.
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { posthog } from "@/lib/posthog-client";
import { Users, Link2, Check, Share2, Gift, TrendingUp, DollarSign } from "lucide-react";

interface ReferralRow {
  id:             string;
  status:         string;
  referred_email: string | null;
  amount_cents:   number | null;
  clicked_at:     string;
  signed_up_at:   string | null;
  purchased_at:   string | null;
  paid_out_at:    string | null;
}

interface ReferralMeResponse {
  code:     string | null;
  shareUrl: string | null;
  stats: {
    clicks:         number;
    signups:        number;
    purchases:      number;
    pending_cents:  number;
    paid_out_cents: number;
  };
  recent: ReferralRow[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Clicked",   cls: "bg-zinc-100 text-zinc-600" },
  signup:    { label: "Signed up", cls: "bg-blue-50 text-blue-700" },
  purchased: { label: "Purchased — $50 due", cls: "bg-emerald-50 text-emerald-700" },
  paid_out:  { label: "Paid out",  cls: "bg-zinc-100 text-zinc-500" },
  void:      { label: "Voided",    cls: "bg-red-50 text-red-600" },
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export function ReferralCard() {
  const { clerkUser } = useAuth();
  const { session } = useClerkSession();
  const [data, setData]       = useState<ReferralMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session) return;
      try {
        const token = await session.getToken();
        if (!token) return;
        const res = await fetch("/api/referrals/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setData(null);
          return;
        }
        const json = (await res.json()) as ReferralMeResponse;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clerkUser?.id, session?.id]);

  const copyLink = async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      posthog.capture("referral_link_copied", { code: data.code });
    } catch {
      // Older browsers — surface the URL in a prompt as a graceful fallback
      window.prompt("Copy your referral link:", data.shareUrl);
      posthog.capture("referral_link_copied", { code: data.code, fallback: true });
    }
  };

  const nativeShare = async () => {
    if (!data?.shareUrl) return;
    if (typeof navigator.share !== "function") {
      copyLink();
      return;
    }
    posthog.capture("referral_share_clicked", { code: data.code });
    try {
      await navigator.share({
        title: "Clean Path Credit — get your free credit analysis",
        text:  "I used Clean Path Credit to fix my credit. Use my link for a free analysis:",
        url:   data.shareUrl,
      });
    } catch {
      // User canceled or share failed silently — no UX feedback needed.
    }
  };

  if (loading) {
    return (
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 bg-zinc-100 rounded" />
          <div className="h-12 bg-zinc-50 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="h-20 bg-zinc-50 rounded-xl" />
            <div className="h-20 bg-zinc-50 rounded-xl" />
            <div className="h-20 bg-zinc-50 rounded-xl" />
            <div className="h-20 bg-zinc-50 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  // Trigger should always assign a code on insert; if missing we hide
  // the card rather than show an error — the user will get one on their
  // next profile touch.
  if (!data?.code || !data.shareUrl) return null;

  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
      <div className="flex items-start justify-between mb-1 gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-600" />
            Refer & Earn
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Share your link. Earn <span className="font-semibold text-zinc-700">$50</span> for every friend who signs up and joins a paid plan.
          </p>
        </div>
      </div>

      {/* Share row */}
      <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Your link</div>
          <div className="font-mono text-sm text-zinc-800 truncate" title={data.shareUrl}>{data.shareUrl}</div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={copyLink}
            className={`h-10 px-4 text-sm rounded-xl shadow-sm transition-colors ${
              copied
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : "bg-[#111111] hover:bg-zinc-800 text-white"
            }`}
          >
            {copied ? (
              <><Check className="h-4 w-4 mr-1.5" /> Copied</>
            ) : (
              <><Link2 className="h-4 w-4 mr-1.5" /> Copy link</>
            )}
          </Button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button
              onClick={nativeShare}
              variant="outline"
              className="h-10 px-4 text-sm rounded-xl border-zinc-200 bg-white hover:bg-zinc-50"
            >
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Users className="h-4 w-4" />}        label="Clicks"     value={data.stats.clicks.toString()} />
        <StatTile icon={<TrendingUp className="h-4 w-4" />}   label="Signups"    value={data.stats.signups.toString()} />
        <StatTile icon={<Check className="h-4 w-4" />}        label="Purchases"  value={data.stats.purchases.toString()} />
        <StatTile icon={<DollarSign className="h-4 w-4" />}   label="Pending"    value={formatCents(data.stats.pending_cents)} accent />
      </div>

      {data.stats.paid_out_cents > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          Lifetime paid out: <span className="font-semibold text-zinc-700">{formatCents(data.stats.paid_out_cents)}</span>
        </p>
      )}

      {/* Recent activity */}
      {data.recent.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Recent activity</div>
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 overflow-hidden">
            {data.recent.map((r) => {
              const meta = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
              const when = r.purchased_at ?? r.signed_up_at ?? r.clicked_at;
              return (
                <li key={r.id} className="flex items-center justify-between p-3 text-sm bg-white">
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-800 truncate">{maskEmail(r.referred_email)}</div>
                    <div className="text-[11px] text-zinc-400">
                      {new Date(when).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.cls}`}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-5 text-[11px] text-zinc-400 leading-relaxed">
        Payouts processed monthly via the method you provide. Self-referrals,
        chargebacks, and refunds are not eligible. Clean Path Credit reserves
        the right to void fraudulent referrals.
      </p>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-emerald-100 bg-emerald-50/40" : "border-zinc-100 bg-zinc-50/40"}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <span className={accent ? "text-emerald-600" : "text-zinc-400"}>{icon}</span>
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${accent ? "text-emerald-700" : "text-zinc-900"}`}>{value}</div>
    </div>
  );
}

// Local hook — useAuth doesn't currently expose `session`, but we need it
// to pull a Clerk JWT for the API call. Keep this self-contained so we
// don't have to widen AuthContextType for one consumer.
import { useSession } from "@clerk/clerk-react";
function useClerkSession() {
  const { session } = useSession();
  return { session };
}
