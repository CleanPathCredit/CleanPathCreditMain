/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Admin-only modal that creates a Clerk invitation for a prospective
 * client. Used in two contexts on the AdminDashboard:
 *   1. "Add Client" button on the Clients list — empty form
 *   2. "Convert to Client" button on each Lead row — pre-filled
 *      from the lead's email/name/phone
 *
 * Posts to /api/admin/invite-client which verifies admin role,
 * creates a Clerk invitation, and returns the invitation URL. Clerk
 * sends the email automatically; we also surface the URL so the
 * admin can share via SMS / their preferred channel.
 *
 * The new client lands in the Clients list once they accept the
 * invitation and complete sign-in (the existing Clerk webhook
 * creates the profiles row on user.created and auto-links to a
 * matching lead_submissions row by email).
 */

import React, { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { X, Mail, CheckCircle2, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface InviteClientModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, indicates this invitation was triggered from a lead row
   *  ("Convert to Client"). Stored on Clerk publicMetadata so the
   *  signup webhook can use it as a binding hint. */
  leadId?: string;
  /** Pre-fill values when opening from a lead row. */
  prefillEmail?:    string;
  prefillFullName?: string;
  prefillPhone?:    string;
}

interface InviteResponse {
  ok?:             boolean;
  invitation_url?: string | null;
  invitation_id?:  string;
  email?:          string;
  error?:          string;
  hint?:           string;
  clerk_user_id?:  string;
}

export function InviteClientModal({
  open,
  onClose,
  leadId,
  prefillEmail    = "",
  prefillFullName = "",
  prefillPhone    = "",
}: InviteClientModalProps) {
  const { session } = useSession();
  const [email, setEmail]       = useState(prefillEmail);
  const [fullName, setFullName] = useState(prefillFullName);
  const [phone, setPhone]       = useState(prefillPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [hint, setHint]         = useState<string | null>(null);
  const [success, setSuccess]   = useState<{ url: string | null; email: string } | null>(null);

  // Reset form whenever the modal is reopened — pre-fills win.
  useEffect(() => {
    if (open) {
      setEmail(prefillEmail);
      setFullName(prefillFullName);
      setPhone(prefillPhone);
      setError(null);
      setHint(null);
      setSuccess(null);
      setSubmitting(false);
    }
  }, [open, prefillEmail, prefillFullName, prefillPhone]);

  if (!open) return null;

  const submit = async () => {
    if (!session) return;
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setHint(null);
    try {
      const token = await session.getToken();
      const res = await fetch("/api/admin/invite-client", {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email:    email.trim(),
          fullName: fullName.trim() || undefined,
          phone:    phone.trim()    || undefined,
          lead_id:  leadId          || undefined,
        }),
      });
      const data = (await res.json()) as InviteResponse;
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        if (data.hint) setHint(data.hint);
        return;
      }
      setSuccess({
        url:   data.invitation_url ?? null,
        email: data.email ?? email.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const copyUrl = async () => {
    if (!success?.url) return;
    try {
      await navigator.clipboard.writeText(success.url);
    } catch {
      // Clipboard API can fail in non-secure contexts; fall back to
      // showing a prompt the admin can manually copy from.
      prompt("Copy this invitation URL:", success.url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                {leadId ? "Convert to Client" : "Add Client"}
              </h3>
              <p className="text-xs text-zinc-500">Sends a Clerk invitation by email.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-emerald-800">
                <div className="font-semibold">Invitation sent.</div>
                <div>Clerk emailed <strong>{success.email}</strong> with a sign-in link.</div>
              </div>
            </div>
            {success.url && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
                  Backup invitation link
                </label>
                <p className="text-xs text-zinc-500 mb-2">
                  In case the email doesn't arrive (spam folder, custom email server, etc.) you can also share this link via SMS or your CRM.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={success.url}
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-700"
                  />
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <div className="font-semibold">{error}</div>
                  {hint && <div className="text-xs mt-0.5 text-red-700">{hint}</div>}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Clerk will email a sign-in link. Once the customer signs in for the first time, their profile is created automatically and any matching quiz lead is linked to their account by email.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={submit}
                disabled={submitting || !email.trim() || !email.includes("@")}
              >
                {submitting ? "Sending…" : leadId ? "Send invitation" : "Add Client"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
