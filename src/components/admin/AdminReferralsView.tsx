/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminReferralsView
 * ──────────────────
 * Admin-only operations panel for the referral program.
 *
 *   • Summary tiles       (pending payouts $, paid out lifetime $, counts)
 *   • Filter chips        (by status: pending / signup / purchased / paid_out / void)
 *   • Sortable table      (newest, by amount, by referrer)
 *   • Inline "Mark paid"  (purchased → paid_out, stamps paid_out_at server-side)
 *   • Inline "Void"       (any → void, records the row but stops payouts)
 *
 * The list is paged at 500 server-side; with $50 commissions that's ~$25k of
 * referral activity before we need real pagination — plenty of runway.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import {
  Gift, DollarSign, Check, X, AlertTriangle, ArrowUpDown, RefreshCw, Search,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Referrer {
  id:            string;
  full_name:     string | null;
  email:         string;
  referral_code: string | null;
}

interface ReferralRow {
  id:                  string;
  status:              "pending" | "signup" | "purchased" | "paid_out" | "void";
  referrer:            Referrer | null;
  referrer_profile_id: string | null;
  referral_code_used:  string;
  referred_profile_id: string | null;
  referred_email:      string | null;
  amount_cents:        number | null;
  stripe_session_id:   string | null;
  clicked_at:          string;
  signed_up_at:        string | null;
  purchased_at:        string | null;
  paid_out_at:         string | null;
}

interface ReferralListResponse {
  referrals: ReferralRow[];
  summary: {
    total:           number;
    pending_count:   number;
    signup_count:    number;
    purchased_count: number;
    paid_out_count:  number;
    void_count:      number;
    pending_cents:   number;
    paid_out_cents:  number;
  };
}

type StatusFilter = "all" | ReferralRow["status"];
type SortKey      = "clicked_at" | "purchased_at" | "amount_cents" | "referrer";

const STATUS_STYLE: Record<ReferralRow["status"], { label: string; cls: string }> = {
  pending:   { label: "Click",     cls: "bg-zinc-100 text-zinc-600" },
  signup:    { label: "Signup",    cls: "bg-blue-50 text-blue-700" },
  purchased: { label: "Purchased", cls: "bg-emerald-50 text-emerald-700" },
  paid_out:  { label: "Paid out",  cls: "bg-zinc-100 text-zinc-500" },
  void:      { label: "Void",      cls: "bg-red-50 text-red-600" },
};

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AdminReferralsView() {
  const { session } = useSession();

  const [data, setData]               = useState<ReferralListResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]           = useState("");
  const [sort, setSort]               = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "clicked_at", dir: "desc",
  });
  const [actingId, setActingId]       = useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const token = await session.getToken();
      if (!token) { setError("Not signed in"); return; }
      const res = await fetch("/api/admin/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`Failed to load (${res.status})`);
        return;
      }
      setData((await res.json()) as ReferralListResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: { status?: "paid_out" | "void"; amount_cents?: number }) => {
    if (!session) return;
    setActingId(id);
    try {
      const token = await session.getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/referrals/${id}`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Update failed: ${(err as { error?: string }).error ?? res.status}`);
        return;
      }
      await load();
    } finally {
      setActingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let rows = data.referrals.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        r.referrer?.full_name ?? "",
        r.referrer?.email     ?? "",
        r.referred_email      ?? "",
        r.referral_code_used,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      switch (sort.key) {
        case "amount_cents":
          return ((a.amount_cents ?? -1) - (b.amount_cents ?? -1)) * dir;
        case "purchased_at": {
          const av = a.purchased_at ? new Date(a.purchased_at).getTime() : 0;
          const bv = b.purchased_at ? new Date(b.purchased_at).getTime() : 0;
          return (av - bv) * dir;
        }
        case "referrer": {
          const an = (a.referrer?.full_name ?? a.referrer?.email ?? "").toLowerCase();
          const bn = (b.referrer?.full_name ?? b.referrer?.email ?? "").toLowerCase();
          return an.localeCompare(bn) * dir;
        }
        case "clicked_at":
        default:
          return (new Date(a.clicked_at).getTime() - new Date(b.clicked_at).getTime()) * dir;
      }
    });

    return rows;
  }, [data, statusFilter, search, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Gift className="h-6 w-6 text-emerald-600" /> Referrals
            </h2>
            <p className="text-zinc-500 mt-1 text-sm">
              Click → signup → purchase → payout. Mark referrals paid once you've sent the commission.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryTile
            label="Pending payout"
            value={formatCents(data?.summary.pending_cents ?? 0)}
            sub={`${data?.summary.purchased_count ?? 0} purchases`}
            accent="emerald"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <SummaryTile
            label="Paid out (lifetime)"
            value={formatCents(data?.summary.paid_out_cents ?? 0)}
            sub={`${data?.summary.paid_out_count ?? 0} payouts`}
            icon={<Check className="h-4 w-4" />}
          />
          <SummaryTile
            label="Signups (unconverted)"
            value={(data?.summary.signup_count ?? 0).toString()}
            sub="Awaiting purchase"
            icon={<Gift className="h-4 w-4" />}
          />
          <SummaryTile
            label="Total clicks"
            value={(((data?.summary.pending_count ?? 0)
                    + (data?.summary.signup_count ?? 0)
                    + (data?.summary.purchased_count ?? 0)
                    + (data?.summary.paid_out_count ?? 0))).toString()}
            sub={`${data?.summary.void_count ?? 0} voided`}
            icon={<ArrowUpDown className="h-4 w-4" />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Search referrer name, email, or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "purchased", "signup", "pending", "paid_out", "void"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {s === "all" ? "All" : STATUS_STYLE[s].label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
          <table className="w-full text-left text-sm min-w-[820px]">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort("referrer")} className="inline-flex items-center gap-1 hover:text-zinc-700">
                    Referrer <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">Referred</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">
                  <button onClick={() => toggleSort("amount_cents")} className="inline-flex items-center gap-1 hover:text-zinc-700">
                    Amount <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort("purchased_at")} className="inline-flex items-center gap-1 hover:text-zinc-700">
                    Purchased <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort("clicked_at")} className="inline-flex items-center gap-1 hover:text-zinc-700">
                    Clicked <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 text-sm">Loading referrals…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 text-sm">No referrals match the current filter.</td></tr>
              )}
              {filtered.map((r) => {
                const meta = STATUS_STYLE[r.status];
                const isActing = actingId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      {r.referrer ? (
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-900 truncate">{r.referrer.full_name ?? r.referrer.email}</div>
                          <div className="text-[11px] text-zinc-500 truncate">{r.referrer.email}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{r.referral_code_used}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-700 truncate max-w-[200px]">{r.referred_email ?? "—"}</div>
                      {r.referred_profile_id && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">Account created</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-800">{formatCents(r.amount_cents)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{timeAgo(r.purchased_at)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{timeAgo(r.clicked_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "purchased" && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Mark this referral as paid out (${formatCents(r.amount_cents)})?`)) {
                                patch(r.id, { status: "paid_out" });
                              }
                            }}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
                            title="Mark this referral commission as paid"
                          >
                            <Check className="h-3 w-3" /> Mark paid
                          </button>
                        )}
                        {r.status !== "void" && r.status !== "paid_out" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Void this referral? It will no longer be eligible for payout.")) {
                                patch(r.id, { status: "void" });
                              }
                            }}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-zinc-600 text-xs font-medium disabled:opacity-50"
                            title="Void this referral"
                          >
                            <X className="h-3 w-3" /> Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[11px] text-zinc-400">
          Showing {filtered.length}{filtered.length !== (data?.referrals.length ?? 0) && ` of ${data?.referrals.length ?? 0}`} referrals.
          List is capped at 500 rows server-side.
        </p>
      </div>
    </div>
  );
}

function SummaryTile({
  label, value, sub, icon, accent,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode; accent?: "emerald";
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      accent === "emerald"
        ? "border-emerald-100 bg-emerald-50/40"
        : "border-zinc-200 bg-white"
    }`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <span className={accent === "emerald" ? "text-emerald-600" : "text-zinc-400"}>{icon}</span>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent === "emerald" ? "text-emerald-700" : "text-zinc-900"}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>
    </div>
  );
}
