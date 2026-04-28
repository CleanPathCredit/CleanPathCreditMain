/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin-only modal for editing OR deleting a registered client.
 *
 *  - PATCH via /api/admin/client/[id] — name/phone/address/goal/challenge
 *    /plan/status/progress
 *  - DELETE via /api/admin/client/[id] — removes the Clerk user AND the
 *    Supabase profile (cascades to messages + documents). Irreversible.
 *    Gated behind a "type DELETE to confirm" sub-panel so a mis-click
 *    can't nuke a paying customer.
 *
 * Email is immutable here — it's Clerk-managed. To change it, update the
 * user in Clerk first, the Clerk webhook syncs email back to profiles
 * on user.updated.
 */

import React, { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ClientRecord, Plan, ClientStatus } from "@/types/database";

const PLAN_OPTIONS: Plan[] = ["free", "diy", "standard", "premium"];
const STATUS_OPTIONS: ClientStatus[] = [
  "pending_connection",
  "missing_id",
  "ready_for_audit",
  "audit_in_progress",
  "audit_complete",
  "disputes_drafted",
  "disputes_sent",
  "waiting_on_bureau",
  "bureau_responded",
  "results_received",
  "complete",
];

interface EditClientModalProps {
  open:       boolean;
  client:     ClientRecord | null;
  onClose:    () => void;
  onSaved?:   (updated: ClientRecord) => void;
  onDeleted?: (id: string) => void;
}

export function EditClientModal({ open, client, onClose, onSaved, onDeleted }: EditClientModalProps) {
  const { session } = useSession();
  const [form, setForm]   = useState<ClientRecord | null>(client);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Same type-DELETE confirmation pattern as EditLeadModal — idle by
  // default, admin has to click the trash button to reveal the confirm
  // sub-panel, then literally type "DELETE" to enable the destructive
  // action.
  const [confirmStage, setConfirmStage] = useState<"idle" | "confirming">("idle");
  const [confirmText, setConfirmText]   = useState("");

  useEffect(() => {
    setForm(client);
    setError(null);
    setSaving(false);
    setConfirmStage("idle");
    setConfirmText("");
  }, [client?.id, open]);

  if (!open || !form) return null;

  const close = () => {
    if (saving) return;
    onClose();
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

      const resp = await fetch(`/api/admin/client/${encodeURIComponent(form.id)}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        // cannot_delete_self is the one error worth translating — it's the
        // common case where an admin clicks the nuke button on their own
        // row to see what happens.
        const msg = data.error === "cannot_delete_self"
          ? "You can't delete your own admin account from here."
          : data.error ?? `Delete failed (${resp.status}).`;
        setError(msg);
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

  const handleSave = async () => {
    setError(null);
    if (!form) return;
    setSaving(true);
    try {
      const token = session ? await session.getToken() : null;
      if (!token) { setError("Session expired. Please reload."); return; }

      const body = {
        full_name:   form.full_name,
        phone:       form.phone,
        address:     form.address,
        goal:        form.goal,
        challenge:   form.challenge,
        plan:        form.plan,
        status:      form.status,
        progress:    form.progress,
        admin_notes: form.admin_notes,
      };

      const resp = await fetch(`/api/admin/client/${encodeURIComponent(form.id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        setError(data.error ?? `Save failed (${resp.status}).`);
        return;
      }
      const data = await resp.json() as { client: ClientRecord };
      onSaved?.(data.client);
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
            <h3 className="text-lg font-bold text-zinc-900">Edit client</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Email is immutable (managed by Clerk). To change it, update the user in Clerk first.
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
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Email (read-only)</label>
              <input
                type="email"
                readOnly
                disabled
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm text-zinc-500"
                value={form.email}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Phone</label>
              <input
                type="tel"
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Address</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value || null })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Goal</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={form.goal ?? ""}
                onChange={(e) => setForm({ ...form, goal: e.target.value || null })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Challenge</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={form.challenge ?? ""}
                onChange={(e) => setForm({ ...form, challenge: e.target.value || null })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Plan</label>
              <select
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })}
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Status</label>
              <select
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm bg-white"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Progress ({form.progress}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                className="w-full"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Free-form admin notes — not shown to the client, not synced to
              GHL. Use for context like "spouse is co-applicant",
              "preferred contact time: evenings", etc. */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Admin notes</label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y"
              value={form.admin_notes ?? ""}
              onChange={(e) => setForm({ ...form, admin_notes: e.target.value || null })}
              placeholder="Context that helps the team but shouldn't be in the client-visible profile."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {confirmStage === "confirming" && (
            <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 space-y-3">
              <div className="flex items-start gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">This will permanently:</p>
                  <ul className="list-disc ml-5">
                    <li>Delete the Clerk user (they lose dashboard access)</li>
                    <li>Delete the Supabase profile + all messages + all documents</li>
                  </ul>
                  <p className="pt-1">
                    GHL contacts and Stripe subscriptions are <em>not</em> touched — handle those separately if needed.
                  </p>
                  <p className="pt-1">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm.
                  </p>
                </div>
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
                  {saving ? "Deleting…" : "Delete client"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            {onDeleted ? (
              <button
                type="button"
                onClick={() => setConfirmStage("confirming")}
                disabled={saving || confirmStage === "confirming"}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm disabled:opacity-50"
                title="Delete client"
                aria-label="Delete client"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={saving} className="h-10 px-5">
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
