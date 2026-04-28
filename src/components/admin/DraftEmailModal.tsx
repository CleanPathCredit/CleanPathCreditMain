/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AI-assisted follow-up email drafter. On open, hits
 * /api/admin/lead/[id]/draft-email to generate a personalized email from
 * the lead's quiz answers. The admin then edits, copies to clipboard, and
 * sends via their own mail client / GHL / wherever.
 *
 * Intentionally human-in-the-loop — we never send the email for the
 * admin. Generative AI for credit-repair outreach needs a human review
 * pass before it touches a prospect's inbox (hallucinated promises =
 * CROA liability).
 */

import React, { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { Sparkles, X, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LeadSubmission } from "@/types/database";

interface DraftEmailModalProps {
  open:    boolean;
  lead:    LeadSubmission | null;
  onClose: () => void;
}

export function DraftEmailModal({ open, lead, onClose }: DraftEmailModalProps) {
  const { session } = useSession();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [subject, setSubject]   = useState("");
  const [body, setBody]         = useState("");
  const [model, setModel]       = useState<string | null>(null);
  const [copied, setCopied]     = useState<"subject" | "body" | "both" | null>(null);

  const generate = async (leadId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = session ? await session.getToken() : null;
      if (!token) { setError("Session expired. Please reload."); return; }

      const resp = await fetch(`/api/admin/lead/${encodeURIComponent(leadId)}/draft-email`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        const msg = data.error === "openrouter_not_configured"
          ? "OpenRouter isn't configured. Set OPENROUTER_API_KEY in Vercel env."
          : data.error ?? `Draft failed (${resp.status}).`;
        setError(msg);
        return;
      }
      const data = await resp.json() as { subject: string; body: string; model: string };
      setSubject(data.subject);
      setBody(data.body);
      setModel(data.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on open. User can regen anytime via the refresh button.
  useEffect(() => {
    if (open && lead) {
      setSubject("");
      setBody("");
      setError(null);
      setCopied(null);
      generate(lead.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  if (!open || !lead) return null;

  const copy = async (kind: "subject" | "body" | "both") => {
    const text =
      kind === "subject" ? subject :
      kind === "body"    ? body    :
      `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Clipboard copy blocked by the browser. Select manually and copy.");
    }
  };

  const close = () => {
    if (loading) return;  // don't abandon an in-flight generation
    onClose();
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
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Draft follow-up email</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Personalized for {lead.full_name || lead.email}. Review + edit before sending.
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 -mr-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
            aria-label="Close"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-700">Subject</label>
              <button
                onClick={() => copy("subject")}
                disabled={loading || !subject}
                className="text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-40 inline-flex items-center gap-1"
              >
                {copied === "subject" ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={loading ? "Generating…" : "Email subject"}
              disabled={loading}
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-700">Body</label>
              <button
                onClick={() => copy("body")}
                disabled={loading || !body}
                className="text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-40 inline-flex items-center gap-1"
              >
                {copied === "body" ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
            <textarea
              rows={14}
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y font-sans"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={loading ? "Generating personalized email…" : "Email body"}
              disabled={loading}
            />
            <p className="text-[11px] text-zinc-400 mt-1.5">
              The draft uses [BOOKING_LINK] as a placeholder — replace with your Calendly URL before sending.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {model && !loading && (
            <p className="text-[11px] text-zinc-400">
              Drafted by <span className="font-mono">{model}</span> via OpenRouter.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => generate(lead.id)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-medium shadow-sm disabled:opacity-50"
              title="Generate a new draft"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{loading ? "Generating…" : "Regenerate"}</span>
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={loading} className="h-10 px-5">
                Close
              </Button>
              <Button
                type="button"
                onClick={() => copy("both")}
                disabled={loading || !subject || !body}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {copied === "both" ? <><Check className="h-4 w-4 mr-1.5" /> Copied</> : <><Copy className="h-4 w-4 mr-1.5" /> Copy subject + body</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
