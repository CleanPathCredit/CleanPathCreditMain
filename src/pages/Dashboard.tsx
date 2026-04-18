/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { DocumentVault } from "@/components/dashboard/DocumentVault";
import { MasterList } from "@/components/dashboard/MasterList";
import { TravelResources } from "@/components/dashboard/TravelResources";
import { PlanGate } from "@/components/dashboard/PlanGate";
import { CreditScoreWidget } from "@/components/dashboard/CreditScoreWidget";
import { canAccess, PLAN_LABEL } from "@/lib/planAccess";
import type { Message, Plan } from "@/types/database";
import {
  CheckCircle2, LogOut, Shield, FileText, Download,
  MessageSquare, BookOpen, X, Send, Lock,
  LayoutDashboard, FolderLock, List, LifeBuoy, Menu, ChevronLeft, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ADMIN_PREVIEW_PLANS: Plan[] = ["free", "diy", "standard", "premium"];

type SidebarTab = "dashboard" | "vault" | "masterlist" | "support";

const STATUS_STEPS = [
  { key: "deep_dive_audit",    label: "Deep-Dive Audit",             description: "Full analysis of all 3 bureau reports." },
  { key: "aggressive_dispute", label: "Credit Correction Strategy", description: "Custom credit corrections prepared." },
  { key: "bureau_processing",  label: "Bureau Processing — 30 Days", description: "Bureaus have 30 days to investigate." },
  { key: "results_update",     label: "Results & Score Update",      description: "Deletions and score changes reported." },
];

function getStepStatus(profileStatus: string, stepKey: string): "completed" | "active" | "pending" {
  const order = ["deep_dive_audit","aggressive_dispute","bureau_processing","results_update"];
  const statusMap: Record<string, number> = {
    pending_connection: -1, missing_id: -1,
    ready_for_audit: 0,  audit_in_progress: 0,
    audit_complete: 1,   disputes_drafted: 1,
    disputes_sent: 2,    waiting_on_bureau: 2,
    bureau_responded: 3, results_received: 3, complete: 4,
  };
  const current = statusMap[profileStatus] ?? -1;
  const level   = order.indexOf(stepKey);
  if (current > level)  return "completed";
  if (current === level) return "active";
  return "pending";
}

export function Dashboard() {
  const { clerkUser, profile, isAdmin, logout, supabase } = useAuth();

  const [messages, setMessages]               = useState<Message[]>([]);
  const [newMessage, setNewMessage]           = useState("");
  const [activeTab, setActiveTab]             = useState<SidebarTab>("dashboard");
  const [isChatOpen, setIsChatOpen]           = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Admin-only plan preview. null means "use my real plan"; otherwise the
  // dashboard renders as if the admin were on the selected tier. Session-
  // scoped (resets on reload) so the admin never accidentally ships in a
  // stale preview mode.
  const [previewPlan, setPreviewPlan]         = useState<Plan | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effective plan used for all gating decisions on this page. Non-admins
  // always get their real plan — previewPlan is ignored outside admin.
  const effectivePlan: Plan | undefined =
    (isAdmin ? previewPlan : null) ?? profile?.plan;

  // ── Fetch messages and subscribe to new ones ───────────────────────────────
  useEffect(() => {
    if (!clerkUser) return;

    // Initial fetch
    supabase
      .from("messages")
      .select("*")
      .eq("profile_id", clerkUser.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    // Real-time subscription
    const channel = supabase
      .channel(`messages:${clerkUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `profile_id=eq.${clerkUser.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clerkUser?.id]);

  useEffect(() => {
    if (isChatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !clerkUser) return;
    await supabase.from("messages").insert({
      profile_id: clerkUser.id,
      sender: "client",
      body: newMessage.trim(),
    });
    setNewMessage("");
  };

  const sidebarItems: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard",   label: "Dashboard",       icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "vault",       label: "Document Vault",  icon: <FolderLock className="h-5 w-5" /> },
    { id: "masterlist",  label: "The Master List", icon: <List className="h-5 w-5" /> },
    { id: "support",     label: "Support & Tickets", icon: <LifeBuoy className="h-5 w-5" /> },
  ];

  const firstName = profile?.full_name?.split(" ")[0] ?? clerkUser?.firstName ?? "Client";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <header className="bg-[#111111] text-white px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="md:hidden p-2 hover:bg-zinc-800 rounded-lg" aria-label="Toggle menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Clean Path Credit" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-tight">Clean Path Credit</span>
              <span className="text-[8px] font-medium text-zinc-400 tracking-widest uppercase leading-tight">Client Portal</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {effectivePlan && (
            <span className={`hidden md:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              effectivePlan === "premium"  ? "bg-yellow-500/20 text-yellow-300" :
              effectivePlan === "standard" ? "bg-emerald-500/20 text-emerald-300" :
              effectivePlan === "diy"      ? "bg-blue-500/20 text-blue-300" :
                                             "bg-zinc-700 text-zinc-300"
            }`}>
              {PLAN_LABEL[effectivePlan]}
            </span>
          )}
          <span className="text-xs text-zinc-400 hidden md:inline-block">{clerkUser?.emailAddresses[0]?.emailAddress}</span>
          <Button variant="outline" onClick={logout} className="h-8 px-3 text-xs bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <LogOut className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Admin preview toolbar — visible only to admin users on the client
          dashboard. Lets admin render the page as any tier to validate plan
          gates + copy without needing dummy accounts. Amber accent signals
          "preview mode" so an admin never forgets they're in a simulated
          view. Resets on every page load (no persistence by design). */}
      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <Eye className="h-3.5 w-3.5" />
            <span className="font-semibold">Admin preview</span>
            <span className="text-amber-700">
              {previewPlan
                ? <>Viewing as <span className="font-semibold">{PLAN_LABEL[previewPlan]}</span></>
                : <>Viewing your real plan ({profile?.plan ? PLAN_LABEL[profile.plan] : "free"})</>}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-amber-700 hidden sm:inline">Switch view:</span>
            <div className="flex gap-1">
              {ADMIN_PREVIEW_PLANS.map((p) => {
                const active = (previewPlan ?? profile?.plan) === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPreviewPlan(p)}
                    className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                      active
                        ? "bg-amber-700 text-white"
                        : "bg-white text-amber-800 border border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {PLAN_LABEL[p]}
                  </button>
                );
              })}
            </div>
            {previewPlan !== null && (
              <button
                onClick={() => setPreviewPlan(null)}
                className="px-2.5 py-1 rounded-full font-medium text-amber-800 hover:bg-amber-100"
              >
                Reset
              </button>
            )}
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-zinc-900 text-white hover:bg-zinc-800"
            >
              <ChevronLeft className="h-3 w-3" />
              Admin
            </Link>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar — Desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-[#111111] min-h-[calc(100vh-48px)] sticky top-12 p-3 gap-1">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === item.id ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </aside>

        {/* Sidebar — Mobile */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-50 md:hidden" />
              <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-64 bg-[#111111] z-50 md:hidden p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-6 px-3">
                  <img src="/logo.png" alt="Clean Path Credit" className="h-10 w-10 object-contain" />
                  <span className="font-bold text-white text-sm">Clean Path Credit</span>
                </div>
                {sidebarItems.map((item) => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                      activeTab === item.id ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">Welcome back, {firstName}</h1>
          </div>

          <AnimatePresence mode="wait">
            {/* ── DASHBOARD ── */}
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                {/* Onboarding nudge */}
                {!profile?.id_uploaded && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-4">
                    <Shield className="h-6 w-6 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800">Action required: upload your ID to get started</p>
                      <p className="text-xs text-amber-700 mt-0.5">We need a government-issued ID and your Social Security card before we can begin your credit audit.</p>
                    </div>
                    <Button variant="outline" className="shrink-0 text-sm h-9" onClick={() => setActiveTab("vault")}>
                      Upload Now
                    </Button>
                  </div>
                )}

                {/* Credit Score */}
                <CreditScoreWidget profile={profile} />

                {/* Dispute Tracker */}
                <PlanGate feature="dispute_tracker" plan={effectivePlan} lightBlur={true}>
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-900 mb-6 tracking-tight">Progress Tracker</h2>
                  <div className="space-y-6">
                    {STATUS_STEPS.map((step) => {
                      const status = getStepStatus(profile?.status ?? "pending_connection", step.key);
                      return (
                        <div key={step.key} className={`flex items-start gap-4 ${status === "pending" ? "opacity-50" : ""}`}>
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            status === "completed" ? "bg-emerald-500" : status === "active" ? "bg-blue-500 animate-pulse" : "bg-zinc-200"}`}>
                            {status === "completed" && <CheckCircle2 className="h-4 w-4 text-white" />}
                            {status === "active"    && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900">{step.label}</h3>
                            <p className="text-sm text-zinc-500 mt-0.5">
                              {status === "completed" ? "Completed" : status === "active" ? "In progress" : "Pending"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                </PlanGate>

                {/* Resource Library */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-900 mb-1 tracking-tight">Resource Library</h2>
                  <p className="text-xs text-zinc-400 mb-6">
                    {canAccess(effectivePlan, "all_guides") ? "Full library unlocked" : "2 of 6 resources available — upgrade to unlock all"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "5 Steps to Understanding Your Credit Report", type: "Free Guide",   free: true  },
                      { title: "How Credit Scores Are Calculated",             type: "Free Guide",   free: true  },
                      { title: "The 720 Credit Score Blueprint",               type: "PDF Guide",    free: false },
                      { title: "How to Handle Debt Collectors",                type: "E-Book",       free: false },
                      { title: "Credit Correction Playbook",                     type: "Playbook",     free: false },
                      { title: "Building Positive Credit History",             type: "Action Plan",  free: false },
                    ].map((r, i) => {
                      const unlocked = r.free || canAccess(effectivePlan, "all_guides");
                      return (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${unlocked ? "border-zinc-200 hover:border-emerald-500 cursor-pointer" : "border-zinc-100 bg-zinc-50 cursor-not-allowed opacity-60"}`}>
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${unlocked ? "bg-zinc-50 text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600" : "bg-zinc-100 text-zinc-300"}`}>
                              {unlocked ? <BookOpen className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-zinc-900 text-sm">{r.title}</h3>
                              <p className="text-xs font-medium text-zinc-500 mt-0.5">{r.type}</p>
                            </div>
                          </div>
                          {unlocked ? (
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full bg-white hover:bg-zinc-50 border-zinc-200">
                              <Download className="h-4 w-4 text-zinc-500" />
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-400 shrink-0">Upgrade</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!canAccess(effectivePlan, "all_guides") && (
                    <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-emerald-800">Unlock all 6 resources + Credit Correction Playbook</p>
                      <a href="https://form.cleanpathcredit.com" className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                        See Plans →
                      </a>
                    </div>
                  )}
                </section>
              </motion.div>
            )}

            {/* ── VAULT ── */}
            {activeTab === "vault" && (
              <motion.div key="vault" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <PlanGate feature="document_vault" plan={effectivePlan} blurChildren={false}>
                  <DocumentVault />
                </PlanGate>
              </motion.div>
            )}

            {/* ── MASTER LIST ── */}
            {activeTab === "masterlist" && (
              <motion.div key="masterlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Section header always visible — never blurred */}
                <div className="mb-4 px-1">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">The Master Financial List</h2>
                  <p className="text-sm text-zinc-500 mt-1">10 curated resources our clients use to rebuild credit fast — secured cards, legal tools, and insider strategies.</p>
                </div>
                <PlanGate feature="master_list" plan={effectivePlan} blurChildren={true}>
                  <MasterList />
                </PlanGate>
                <TravelResources hasAccess={canAccess(effectivePlan, "master_list")} />
              </motion.div>
            )}

            {/* ── SUPPORT ── */}
            {activeTab === "support" && (
              <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <PlanGate feature="support_chat" plan={effectivePlan} blurChildren={false}>
                <ChatPanel
                  messages={messages}
                  newMessage={newMessage}
                  onMessageChange={setNewMessage}
                  onSend={sendMessage}
                  endRef={messagesEndRef}
                />
                </PlanGate>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating chat button — standard/premium only */}
      {canAccess(effectivePlan, "support_chat") && <button onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#111111] text-white shadow-xl hover:shadow-2xl flex items-center justify-center z-30 hover:scale-105 transition-all"
        aria-label="Open support chat">
        <MessageSquare className="h-6 w-6" />
      </button>}

      {/* Chat slide-over */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200">
              <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#111111] flex items-center justify-center text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Clean Path Support</h3>
                    <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Online
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ChatPanel
                messages={messages}
                newMessage={newMessage}
                onMessageChange={setNewMessage}
                onSend={sendMessage}
                endRef={messagesEndRef}
                compact
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared chat panel ────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: Message[];
  newMessage: string;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  endRef: React.RefObject<HTMLDivElement>;
  compact?: boolean;
}

function ChatPanel({ messages, newMessage, onMessageChange, onSend, endRef, compact }: ChatPanelProps) {
  return (
    <div className={`flex flex-col ${compact ? "flex-1" : "bg-white rounded-2xl shadow-sm border border-zinc-200"}`}>
      {!compact && (
        <div className="p-6 border-b border-zinc-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#111111] flex items-center justify-center text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">Clean Path Support</h3>
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Messages go directly to your specialist
            </p>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30 min-h-[200px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3 py-12">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-zinc-300" />
            </div>
            <p className="text-sm font-medium">Send your specialist a message to get started.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === "client" ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                msg.sender === "client"
                  ? "bg-[#2563EB] text-white rounded-br-sm"
                  : "bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm shadow-sm"}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
              </div>
              <span className="text-[10px] text-zinc-400 mt-1.5">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t border-zinc-200 bg-white">
        <div className="flex gap-3">
          <textarea
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Type your message…"
            className="flex-1 resize-none rounded-xl border border-zinc-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all min-h-[72px]"
          />
          <Button onClick={onSend} disabled={!newMessage.trim()} className="h-auto px-5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
