/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreditReportView — renders the most recent parsed credit report for
 * a user. Shows:
 *
 *   - Three score cards (Equifax / TransUnion / Experian) with the
 *     score model (VantageScore 3.0 / FICO 8 / etc.)
 *   - Aggregate stats (total accounts, open, negatives, utilization)
 *   - Full accounts table, negatives highlighted, dispute-eligible
 *     items flagged with a visual pill
 *
 * Two modes via props: `profileId` for admin viewing another user's
 * report, or omit it to view the signed-in user's own. In both cases,
 * auth + access control happen server-side via /api/credit-report/*.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import {
  TrendingUp, Scale, AlertTriangle, CheckCircle2, FileText,
  RefreshCw, ChevronDown, Info,
} from "lucide-react";
import type { CreditReport, CreditReportAccount } from "@/types/database";

interface CreditReportViewProps {
  /** When provided (admin use), fetches the given profile's latest
   *  report. Omitted = the signed-in user's own. */
  profileId?: string;
}

type Bureau = "eq" | "tu" | "ex";

const BUREAU_META: Record<Bureau, { label: string; color: string; bg: string }> = {
  eq: { label: "Equifax",    color: "#d9534f", bg: "bg-red-50"     },
  tu: { label: "TransUnion", color: "#00a0df", bg: "bg-sky-50"     },
  ex: { label: "Experian",   color: "#1d4f91", bg: "bg-blue-50"    },
};

function scoreTier(s: number | null): { label: string; color: string } {
  if (s === null)     return { label: "—",         color: "text-zinc-400"   };
  if (s >= 740)       return { label: "Excellent", color: "text-emerald-600" };
  if (s >= 670)       return { label: "Good",      color: "text-emerald-500" };
  if (s >= 580)       return { label: "Fair",      color: "text-amber-600"   };
  return               { label: "Poor",      color: "text-red-600"     };
}

function formatMoney(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", year: "numeric",
    });
  } catch {
    return s;
  }
}

/** Ring visualization matching the quiz-funnel urgency ring but inverted —
 *  higher score = fuller + greener ring. Score range is 300–850, so we
 *  normalize to 0–1 before computing stroke-dashoffset. */
function ScoreRing({ score, label, color }: { score: number | null; label: string; color: string }) {
  const tier = scoreTier(score);
  const pct  = score === null ? 0 : Math.max(0, Math.min(1, (score - 300) / 550));
  const R    = 44;
  const C    = 2 * Math.PI * R;
  const ringColor =
    score === null       ? "#d4d4d8"
    : score >= 740       ? "#10b981"
    : score >= 670       ? "#22c55e"
    : score >= 580       ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#e4e4e7" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1.2s ease-out, stroke 0.6s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-zinc-900">{score ?? "—"}</div>
          <div className={`text-[10px] font-medium ${tier.color}`}>{tier.label}</div>
        </div>
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</div>
    </div>
  );
}

export function CreditReportView({ profileId }: CreditReportViewProps) {
  const { session } = useSession();

  const [report, setReport]           = useState<CreditReport | null>(null);
  const [accounts, setAccounts]       = useState<CreditReportAccount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showAllAccounts, setShowAll] = useState(false);

  const loadLatest = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = session ? await session.getToken() : null;
      if (!token) { setError("Session expired. Reload."); return; }

      // List → pick latest → fetch full with accounts.
      const qs = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
      const listResp = await fetch(`/api/credit-report/list${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listResp.ok) { setError("Couldn't load reports."); return; }
      const { reports } = await listResp.json() as { reports: CreditReport[] };

      // Prefer the newest success; fall back to newest overall so the UI
      // surfaces processing/failed states too.
      const latest =
        reports.find((r) => r.parse_status === "success") ??
        reports[0] ??
        null;
      if (!latest) { setReport(null); setAccounts([]); return; }

      const detailResp = await fetch(`/api/credit-report/${encodeURIComponent(latest.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!detailResp.ok) { setError("Couldn't load report detail."); return; }
      const detail = await detailResp.json() as {
        report: CreditReport;
        accounts: CreditReportAccount[];
      };
      setReport(detail.report);
      setAccounts(detail.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Negatives bubble to the top; within each group, higher balances first.
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.is_negative !== b.is_negative) return a.is_negative ? -1 : 1;
      return (b.balance ?? 0) - (a.balance ?? 0);
    });
  }, [accounts]);

  const visibleAccounts = showAllAccounts ? sortedAccounts : sortedAccounts.slice(0, 8);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading your credit profile…
        </div>
      </div>
    );
  }

  if (!report) {
    return null;  // Parent (Dashboard) is already showing the OnboardingWizard
  }

  if (report.parse_status === "processing") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-zinc-900">Analyzing your report…</div>
          <p className="text-xs text-zinc-600 mt-1">
            We're extracting scores and accounts. This usually takes 20–30 seconds. Refresh in a moment.
          </p>
          <button onClick={loadLatest} className="mt-3 text-xs text-emerald-700 underline underline-offset-2">
            Refresh now
          </button>
        </div>
      </div>
    );
  }

  if (report.parse_status === "failed") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-red-900">Couldn't analyze that report</div>
          <p className="text-xs text-red-800 mt-1">
            {report.parse_error ?? "The file was uploaded but the analyzer couldn't extract data. Your admin can investigate."}
          </p>
        </div>
      </div>
    );
  }

  // parse_status === 'success'
  const reportDate = report.report_date ?? report.processed_at?.slice(0, 10) ?? null;
  const negCount   = report.negative_items_count ?? accounts.filter((a) => a.is_negative).length;
  const disputable = accounts.filter((a) => a.dispute_eligible).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Your credit profile</h2>
          <p className="text-sm text-zinc-500">
            Report dated {formatDate(reportDate)} · {report.score_model ?? "score model unknown"} · parsed from your upload
          </p>
        </div>
        <button
          onClick={loadLatest}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Score rings */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-3 gap-4">
          <ScoreRing score={report.eq_score} label={BUREAU_META.eq.label} color={BUREAU_META.eq.color} />
          <ScoreRing score={report.tu_score} label={BUREAU_META.tu.label} color={BUREAU_META.tu.color} />
          <ScoreRing score={report.ex_score} label={BUREAU_META.ex.label} color={BUREAU_META.ex.color} />
        </div>
      </div>

      {/* Aggregate cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AggCard
          icon={<FileText className="h-4 w-4" />}
          label="Total accounts"
          value={report.total_accounts ?? "—"}
          sub={`${report.open_accounts ?? "—"} open · ${report.closed_accounts ?? "—"} closed`}
        />
        <AggCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Negative items"
          value={negCount}
          sub={`${disputable} flagged to challenge`}
          highlight={negCount > 0}
        />
        <AggCard
          icon={<Scale className="h-4 w-4" />}
          label="Utilization"
          value={report.total_utilization_pct !== null ? `${report.total_utilization_pct}%` : "—"}
          sub={
            report.total_utilization_pct === null      ? "no revolving data"
            : report.total_utilization_pct > 30        ? "above 30% — drag on score"
            : "below 30% — healthy"
          }
          highlight={(report.total_utilization_pct ?? 0) > 30}
        />
        <AggCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Inquiries (24mo)"
          value={report.inquiries_24mo ?? "—"}
          sub={(report.inquiries_24mo ?? 0) >= 6 ? "high — affects approvals" : "normal"}
        />
      </div>

      {/* Accounts table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Accounts on file</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Negatives highlighted. Items flagged for challenge are marked.
            </p>
          </div>
          <div className="text-xs text-zinc-500">
            {accounts.length} total · {negCount} negative
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No accounts extracted from this report.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-zinc-50/50 text-xs text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Creditor</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Balance</th>
                    <th className="px-5 py-3 font-medium">Limit</th>
                    <th className="px-5 py-3 font-medium">Bureaus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {visibleAccounts.map((a) => (
                    <tr
                      key={a.id}
                      className={a.is_negative ? "bg-red-50/30" : "hover:bg-zinc-50/60"}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-900">{a.creditor ?? "—"}</div>
                        {a.account_number_last4 && (
                          <div className="text-[10px] text-zinc-400">••{a.account_number_last4}</div>
                        )}
                        {a.dispute_eligible && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <Info className="h-2.5 w-2.5" />
                            Flagged: {a.dispute_reason ?? "review"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-600 capitalize">{a.account_type ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          a.is_negative
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {a.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-700">{formatMoney(a.balance)}</td>
                      <td className="px-5 py-3 text-xs text-zinc-700">{formatMoney(a.credit_limit)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {(["eq", "tu", "ex"] as Bureau[]).map((b) => {
                            const on = a.bureau_reporting.includes(b);
                            return (
                              <span
                                key={b}
                                title={`${BUREAU_META[b].label} ${on ? "reporting" : "not reporting"}`}
                                className={`inline-flex items-center justify-center h-5 w-6 rounded text-[9px] font-bold ${
                                  on ? BUREAU_META[b].bg : "bg-zinc-100 text-zinc-300"
                                }`}
                                style={on ? { color: BUREAU_META[b].color } : undefined}
                              >
                                {b.toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedAccounts.length > 8 && (
              <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/30 text-center">
                <button
                  onClick={() => setShowAll((s) => !s)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  {showAllAccounts ? "Show fewer" : `Show all ${sortedAccounts.length} accounts`}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAllAccounts ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FCRA disclaimer — keep visible whenever parsed data is rendered */}
      <div className="flex items-start gap-2 text-[11px] text-zinc-500 leading-relaxed">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <p>
          Flagged items reflect potential FCRA-grounded challenge angles — inaccurate, outdated, or unverifiable. We never guarantee a specific score change. Your strategist will review flagged items with you before disputes go out.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
    </div>
  );
}

function AggCard({
  icon, label, value, sub, highlight,
}: {
  icon:  React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?:  string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      highlight
        ? "bg-amber-50/40 border-amber-200"
        : "bg-white border-zinc-200"
    }`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
        {icon} {label}
      </div>
      <div className="text-xl font-bold text-zinc-900">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
