/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin-only modal for editing OR deleting a persisted lead_submissions row.
 *
 *  - PATCH via /api/admin/lead/[id] — any field except id/source/ghl_*.
 *  - DELETE via /api/admin/lead/[id] — irreversible, gated behind a second
 *    "type DELETE" confirmation to stop a mis-click from losing a lead.
 *
 * The Leads table's realtime channel only catches INSERT events, so we
 * apply the updated / removed row optimistically via the onSaved /
 * onDeleted callbacks in the parent.
 */

import React, { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LeadSubmission, UrgencyTier, RecommendedOffer } from "@/types/database";

const GOAL_OPTIONS = [
  { id: "",         label: "—" },
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
const CREDIT_SCORE_OPTIONS = ["", "below-550", "550-619", "620-679", "680+"];
const INCOME_OPTIONS       = ["", "under-30k", "30k-50k", "50k-80k", "80k+"];
const IDEAL_SCORE_OPTIONS  = ["", "600s", "700s", "800"];
const TIMELINE_OPTIONS     = ["", "asap", "3-6-months", "6-12-months"];
const TIER_OPTIONS: (UrgencyTier | "")[]         = ["", "low", "moderate", "elevated", "urgent"];
const OFFER_OPTIONS: (RecommendedOffer | "")[]   = ["", "diy", "accelerated", "executive"];

interface EditLeadModalProps {
  open:        boolean;
  lead:        LeadSubmission | null;
  onClose:     () => void;
  onSaved?:    (updated: LeadSubmission) => void;
  onDeleted?:  (id: string) => void;
}

export function EditLeadModal({ open, lead, onClose, onSaved, onDeleted }: EditLeadModalProps) {
  const { session } = useSession();
  const [form, setForm]         = useState<LeadSubmission | null>(lead);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  // Delete confirmation state — user must type DELETE (case-insensitive
  // match, but trimmed) to enable the button. Resets on modal close.
  const [confirmStage, setConfirmStage] = useState<"idle" | "confirming">("idle");
  const [confirmText, setConfirmText]   = useState("");

  // Reset internal state every time a new lead is opened.
  useEffect(() => {
    setForm(lead);
    setError(null);
    setConfirmStage("idle");
    setConfirmText("");
    setSaving(false);
  }, [lead?.id, open]);

  if (!open || !form) return null;

  const close = () => {
    if (saving) return;
    onClose();
  };

  const toggleObstacle = (id: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.obstacles.includes(id);
      return {
        ...prev,
        obstacles: has ? prev.obstacles.filter((x) => x !== id) : [...prev.obstacles, id],
      };
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setError(null);
    if (!form.email.trim()) { setError("Email is required."); return; }

    setSaving(true);
    try {
      const token = session ? await session.getToken() : null;
      if (!token) { setError("Session expired. Please reload."); return; }

      const body = {
        full_name:          form.full_name,
        email:              form.email.trim(),
        phone:              form.phone,
        goal:               form.goal,
        obstacles:          form.obstacles,
        credit_score_range: form.credit_score_range,
        income_range:       form.income_range,
        ideal_score:        form.ideal_score,
        timeline:           form.timeline,
        urgency_score:      form.urgency_score,
        urgency_tier:       form.urgency_tier,
        recommended_offer:  form.recommended_offer,
      };

      const resp = await fetch(`/api/admin/lead/${encodeURIComponent(form.id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        setError(data.error ?? `Save failed (${resp.status}).`);
        return;
      }
      const data = await resp.json() as { lead: LeadSubmission };
      onSaved?.(data.lead);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE exactly to confirm.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const token = session ? await session.getToken() : null;
      if (!token) { setError("Session expired. Please reload."); return; }

      const resp = await fetch(`/api/admin/lead/${encodeURIComponent(form.id)}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        setError(data.error ?? `Delete failed (${resp.status}).`);
        return;
      }
      onDeleted?.(form.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
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
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Edit lead</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Changes sync to the admin dashboard immediately. GHL is not auto-updated — mirror changes there if needed.
            </p>
          </div>
          <button
            onClick={close}
            className="p-2 -mr-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
            aria-label="Close"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact */}
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">Contact</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.full_name ?? ""}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value || null })}
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
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                />
              </div>
            </div>
          </div>

          {/* Quiz dimensions */}
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">Quiz answers</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Goal</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.goal ?? ""}
                  onChange={(e) => setForm({ ...form, goal: e.target.value || null })}
                >
                  {GOAL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Timeline</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.timeline ?? ""}
                  onChange={(e) => setForm({ ...form, timeline: e.target.value || null })}
                >
                  {TIMELINE_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Credit score range</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.credit_score_range ?? ""}
                  onChange={(e) => setForm({ ...form, credit_score_range: e.target.value || null })}
                >
                  {CREDIT_SCORE_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Income range</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.income_range ?? ""}
                  onChange={(e) => setForm({ ...form, income_range: e.target.value || null })}
                >
                  {INCOME_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Ideal score</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.ideal_score ?? ""}
                  onChange={(e) => setForm({ ...form, ideal_score: e.target.value || null })}
                >
                  {IDEAL_SCORE_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Recommended offer</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.recommended_offer ?? ""}
                  onChange={(e) => setForm({ ...form, recommended_offer: (e.target.value || null) as RecommendedOffer | null })}
                >
                  {OFFER_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Obstacles</label>
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
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Urgency score (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.urgency_score ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, urgency_score: v === "" ? null : Number(v) });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Urgency tier</label>
                <select
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                  value={form.urgency_tier ?? ""}
                  onChange={(e) => setForm({ ...form, urgency_tier: (e.target.value || null) as UrgencyTier | null })}
                >
                  {TIER_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Delete confirmation sub-panel — only appears after clicking
              the trash button. Type-DELETE pattern mirrors GitHub's repo
              deletion flow: deliberate, forces pause. */}
          {confirmStage === "confirming" && (
            <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 space-y-3">
              <div className="flex items-start gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  This will permanently delete the lead from Supabase. GHL keeps its copy.
                  Type <span className="font-mono font-bold">DELETE</span> to confirm.
                </p>
              </div>
              <input
                type="text"
                className="w-full rounded-lg border border-red-300 p-2.5 text-sm font-mono bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setConfirmStage("idle"); setConfirmText(""); setError(null); }}
                  disabled={saving}
                  className="h-9 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || confirmText.trim().toUpperCase() !== "DELETE"}
                  className="h-9 px-4 text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {saving ? "Deleting…" : "Delete lead"}
                </Button>
              </div>
            </div>
          )}

          {/* Footer actions — delete on the left, save on the right. */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setConfirmStage("confirming")}
              disabled={saving || confirmStage === "confirming"}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm disabled:opacity-50"
              title="Delete lead"
              aria-label="Delete lead"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={saving}
                className="h-10 px-5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
