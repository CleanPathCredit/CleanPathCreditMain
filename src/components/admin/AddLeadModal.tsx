/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin-only modal for creating a lead by hand — e.g. after a phone call or
 * walk-in that didn't come through the public quiz. Posts to /api/admin/lead
 * using the caller's Clerk session token; the endpoint verifies admin role
 * before upserting into GHL + writing a row to lead_submissions.
 *
 * The Leads table's realtime INSERT subscription picks up the new row, so
 * no explicit refetch is needed after submit — we just close the modal.
 */

import React, { useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Option ids mirror the quiz funnel so downstream tier/recommendation logic
// treats manual leads identically to quiz leads.
const GOAL_OPTIONS = [
  { id: "home",     label: "Buy a home" },
  { id: "car",      label: "Finance a vehicle" },
  { id: "business", label: "Secure business funding" },
  { id: "clean",    label: "Clean profile / stop calls" },
];
const OBSTACLE_OPTIONS = [
  { id: "medical",      label: "Medical / utility collections" },
  { id: "late",         label: "Late payments / collections" },
  { id: "bankruptcies", label: "Bankruptcies / liens" },
  { id: "balances",     label: "High credit card balances" },
  { id: "unsure",       label: "Not sure" },
];
const CREDIT_SCORE_OPTIONS = [
  { id: "below-550", label: "Below 550" },
  { id: "550-619",   label: "550–619" },
  { id: "620-679",   label: "620–679" },
  { id: "680+",      label: "680+" },
];
const INCOME_OPTIONS = [
  { id: "under-30k", label: "Under $30k" },
  { id: "30k-50k",   label: "$30k–$50k" },
  { id: "50k-80k",   label: "$50k–$80k" },
  { id: "80k+",      label: "$80k+" },
];
const IDEAL_SCORE_OPTIONS = [
  { id: "600s", label: "600s" },
  { id: "700s", label: "700s" },
  { id: "800",  label: "800" },
];
const TIMELINE_OPTIONS = [
  { id: "asap",         label: "ASAP" },
  { id: "3-6-months",   label: "3–6 months" },
  { id: "6-12-months",  label: "6–12 months" },
];

const DEFAULT_STATE = {
  fullName:    "",
  email:       "",
  phone:       "",
  goal:        "",
  obstacles:   [] as string[],
  creditScore: "",
  income:      "",
  idealScore:  "",
  timeline:    "",
  notes:       "",
};

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional callback after a successful insert — useful if you want to
   *  surface a toast / scroll to the new row. The realtime subscription
   *  handles the list refresh on its own. */
  onCreated?: () => void;
}

export function AddLeadModal({ open, onClose, onCreated }: AddLeadModalProps) {
  const { session } = useSession();
  const [form, setForm]         = useState(DEFAULT_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  if (!open) return null;

  const close = () => {
    if (submitting) return;      // don't abandon an in-flight request
    setForm(DEFAULT_STATE);      // reset for next open
    setError(null);
    onClose();
  };

  const toggleObstacle = (id: string) => {
    setForm((prev) => ({
      ...prev,
      obstacles: prev.obstacles.includes(id)
        ? prev.obstacles.filter((x) => x !== id)
        : [...prev.obstacles, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Minimum bar: email is the only hard requirement (matches /api/admin/lead).
    // Full name + phone are validated at the backend too but we want a
    // friendly message here before the round-trip.
    if (!form.fullName.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim())    { setError("Email is required.");     return; }

    setSubmitting(true);
    try {
      const token = session ? await session.getToken() : null;
      if (!token) {
        setError("Session expired. Please reload and try again.");
        return;
      }
      const resp = await fetch("/api/admin/lead", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        setError(data.error ?? `Request failed (${resp.status}).`);
        return;
      }
      onCreated?.();
      setForm(DEFAULT_STATE);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      onClick={close}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Add lead manually</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Syncs to GoHighLevel + appears on the Leads tab immediately.</p>
          </div>
          <button
            onClick={close}
            className="p-2 -mr-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Required */}
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">Contact</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Full name *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Quiz dimensions */}
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">Quiz answers (all optional)</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Goal</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                >
                  <option value="">—</option>
                  {GOAL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Timeline</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.timeline}
                  onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                >
                  <option value="">—</option>
                  {TIMELINE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Credit score range</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.creditScore}
                  onChange={(e) => setForm({ ...form, creditScore: e.target.value })}
                >
                  <option value="">—</option>
                  {CREDIT_SCORE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Income range</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.income}
                  onChange={(e) => setForm({ ...form, income: e.target.value })}
                >
                  <option value="">—</option>
                  {INCOME_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Ideal score</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.idealScore}
                  onChange={(e) => setForm({ ...form, idealScore: e.target.value })}
                >
                  <option value="">—</option>
                  {IDEAL_SCORE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Obstacles (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {OBSTACLE_OPTIONS.map((o) => {
                    const selected = form.obstacles.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleObstacle(o.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Notes</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Call context, referral source, anything sales should know (lands on the GHL contact note)."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={submitting}
              className="h-10 px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? "Saving…" : "Create lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
