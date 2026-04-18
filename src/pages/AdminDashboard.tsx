/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import type {
  ClientRecord, Message, ClientStatus, Document as DocRow,
  LeadSubmission, UrgencyTier,
} from "@/types/database";
import {
  LogOut, Users, FileText, Settings, ChevronLeft, Send, Download,
  Eye, ShieldCheck, CheckCircle2, AlertCircle, Menu, X, Flame, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AddLeadModal } from "@/components/admin/AddLeadModal";

const STATUS_OPTIONS: { value: ClientStatus; label: string; color: string }[] = [
  { value: "missing_id",       label: "Missing ID",         color: "bg-red-50 text-red-700 border-red-200" },
  { value: "ready_for_audit",  label: "Ready for Audit",    color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "audit_complete",   label: "Audit Complete",     color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "disputes_sent",    label: "Round 1 Sent",       color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "waiting_on_bureau",label: "Waiting on Bureau",  color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "results_received", label: "Results Received",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

function statusColor(v?: string) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.color ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
}
function statusLabel(v?: string) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label ?? "Pending";
}

// Urgency tier badge colors — mirror the ring colors on the results page
// so admin sees the same visual priority the lead saw. Higher urgency =
// warmer color = more attention needed.
const TIER_BADGE: Record<UrgencyTier, string> = {
  urgent:   "bg-red-50 text-red-700 border-red-200",
  elevated: "bg-amber-50 text-amber-700 border-amber-200",
  moderate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const TIER_LABEL: Record<UrgencyTier, string> = {
  urgent:   "Urgent",
  elevated: "Elevated",
  moderate: "Moderate",
  low:      "Low",
};

// Compact time-ago for the leads list. Full dates would steal too much
// column width in a dense admin table.
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)     return "just now";
  if (mins < 60)    return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AdminDashboard() {
  const { clerkUser, profile: adminProfile, logout } = useAuth();
  const navigate = useNavigate();
  const supabase = useSupabaseClient();

  const [clients, setClients]             = useState<ClientRecord[]>([]);
  const [leads, setLeads]                 = useState<LeadSubmission[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<ClientRecord | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [documents, setDocuments]         = useState<DocRow[]>([]);
  const [newMessage, setNewMessage]       = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [view, setView]                   = useState<"clients" | "leads">("clients");
  const [addLeadOpen, setAddLeadOpen]     = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Guard — only admins
  useEffect(() => {
    if (!clerkUser || adminProfile?.role !== "admin") {
      navigate("/login");
    }
  }, [clerkUser, adminProfile?.role, navigate]);

  // Load client list with real-time updates
  useEffect(() => {
    if (adminProfile?.role !== "admin") return;

    supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setClients(data ?? []); setLoading(false); });

    const channel = supabase
      .channel("profiles:clients")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: "role=eq.client" },
        () => {
          supabase.from("profiles").select("*").eq("role", "client").order("created_at", { ascending: false })
            .then(({ data }) => setClients(data ?? []));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adminProfile?.role]);

  // Load quiz leads — every submission to /api/lead lands here, even pre-
  // registration. Real-time subscription so fresh leads show up without a
  // manual refresh. Capped at 200 rows; full history is in GHL anyway.
  useEffect(() => {
    if (adminProfile?.role !== "admin") return;

    const fetchLeads = () =>
      supabase
        .from("lead_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data }) => setLeads(data ?? []));

    fetchLeads();

    const channel = supabase
      .channel("lead_submissions:all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_submissions" }, fetchLeads)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adminProfile?.role]);

  // When a client is selected — load their messages + documents
  useEffect(() => {
    if (!selected) { setMessages([]); setDocuments([]); return; }

    supabase.from("messages").select("*").eq("profile_id", selected.id).order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    supabase.from("documents").select("*").eq("profile_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setDocuments(data ?? []));

    // Real-time messages for this thread
    const ch = supabase.channel(`admin-messages:${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `profile_id=eq.${selected.id}` },
        (p) => setMessages((prev) => [...prev, p.new as Message]))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const updateClientStatus = async (clientId: string, status: ClientStatus) => {
    const progressMap: Partial<Record<ClientStatus, number>> = {
      missing_id: 10, ready_for_audit: 25, audit_complete: 50,
      disputes_sent: 75, waiting_on_bureau: 85, results_received: 100,
    };
    await supabase.from("profiles").update({ status, progress: progressMap[status] ?? 0 }).eq("id", clientId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected) return;
    await supabase.from("messages").insert({ profile_id: selected.id, sender: "admin", body: newMessage.trim() });
    setNewMessage("");
  };

  const getDocumentUrl = async (path: string) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 900); // 15-min URL
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500">Loading Admin Portal…</div>;

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111111] text-zinc-400 flex flex-col border-r border-zinc-800 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <img src="/logo.png" alt="Clean Path Credit" className="h-10 w-10 object-contain" /> Clean Path
            </h1>
            <p className="text-[9px] mt-1 text-zinc-500 uppercase tracking-widest font-medium">Admin Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white md:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => { setSelected(null); setView("clients"); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors text-left ${!selected && view === "clients" ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 hover:text-zinc-200"}`}>
            <Users className="h-5 w-5" /> Clients
          </button>
          <button onClick={() => { setSelected(null); setView("leads"); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors text-left ${!selected && view === "leads" ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 hover:text-zinc-200"}`}>
            <Flame className="h-5 w-5" /> Leads
            {leads.length > 0 && (
              <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">
                {leads.length}
              </span>
            )}
          </button>
          <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors text-left opacity-50 cursor-not-allowed" disabled>
            <FileText className="h-5 w-5" /> Documents
          </button>
          <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors text-left opacity-50 cursor-not-allowed" disabled>
            <Settings className="h-5 w-5" /> Settings
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <div className="px-4 py-3 mb-2 text-xs text-zinc-500 truncate">{clerkUser?.emailAddresses[0]?.emailAddress}</div>
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors text-left">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {!selected && view === "clients" ? (
            /* ── CLIENT LIST ── */
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 overflow-auto p-4 sm:p-8">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-zinc-100 rounded-lg md:hidden" aria-label="Open sidebar">
                      <Menu className="h-5 w-5 text-zinc-500" />
                    </button>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Client Management</h2>
                      <p className="text-zinc-500 mt-1 text-sm">Manage active clients, documents, and client files.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddLeadOpen(true)}
                      title="Add lead manually"
                      aria-label="Add lead manually"
                      className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Lead</span>
                    </button>
                    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" /> {clients.length} Clients
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Client</th>
                        <th className="px-6 py-4 font-medium">Urgency</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Progress</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {clients.map((c) => {
                        // Stitch the registered client to their most-recent
                        // quiz submission by email (case-insensitive). Cheap
                        // client-side match — leads list is capped at 200.
                        const lead = leads.find(l => l.email.toLowerCase() === c.email.toLowerCase());
                        const tier = lead?.urgency_tier as UrgencyTier | undefined;
                        return (
                          <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-medium text-zinc-900">{c.full_name ?? "Unnamed Client"}</div>
                              <div className="text-zinc-500 text-xs mt-0.5">{c.email}</div>
                              {c.phone && <div className="text-zinc-400 text-xs mt-0.5">{c.phone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              {lead && lead.urgency_score !== null ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-semibold text-zinc-900">{lead.urgency_score}</span>
                                    <span className="text-[10px] text-zinc-400">/ 100</span>
                                  </div>
                                  {tier && (
                                    <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${TIER_BADGE[tier]}`}>
                                      {TIER_LABEL[tier]}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(c.status)}`}>
                                {statusLabel(c.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-full bg-zinc-100 rounded-full h-2 max-w-[120px] overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${c.progress}%` }} />
                                </div>
                                <span className="text-xs font-medium text-zinc-600 w-8">{c.progress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="outline" className="h-9 px-4 text-sm bg-white hover:bg-zinc-50 shadow-sm" onClick={() => setSelected(c)}>
                                Manage
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {clients.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                          <Users className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                          No clients yet.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : !selected && view === "leads" ? (
            /* ── LEADS LIST ── quiz funnel submissions, registered-or-not ── */
            <motion.div key="leads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 overflow-auto p-4 sm:p-8">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-zinc-100 rounded-lg md:hidden" aria-label="Open sidebar">
                      <Menu className="h-5 w-5 text-zinc-500" />
                    </button>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Quiz Leads</h2>
                      <p className="text-zinc-500 mt-1 text-sm">Every quiz submission — registered or not — sorted newest first. Data flows directly from /api/lead.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddLeadOpen(true)}
                      title="Add lead manually"
                      aria-label="Add lead manually"
                      className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Lead</span>
                    </button>
                    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm flex items-center gap-2">
                      <Flame className="h-4 w-4 text-emerald-500" /> {leads.length} Leads
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Lead</th>
                        <th className="px-6 py-4 font-medium">Urgency</th>
                        <th className="px-6 py-4 font-medium">Goal</th>
                        <th className="px-6 py-4 font-medium">Obstacles</th>
                        <th className="px-6 py-4 font-medium">Recommended</th>
                        <th className="px-6 py-4 font-medium">Submitted</th>
                        <th className="px-6 py-4 font-medium">Registered?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {leads.map((l) => {
                        const tier = l.urgency_tier as UrgencyTier | null;
                        const registered = clients.some(c => c.email.toLowerCase() === l.email.toLowerCase());
                        return (
                          <tr key={l.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-zinc-900">{l.full_name ?? "Unnamed Lead"}</div>
                              <div className="text-zinc-500 text-xs mt-0.5">{l.email}</div>
                              {l.phone && <div className="text-zinc-400 text-xs mt-0.5">{l.phone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              {l.urgency_score !== null ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-semibold text-zinc-900">{l.urgency_score}</span>
                                    <span className="text-[10px] text-zinc-400">/ 100</span>
                                  </div>
                                  {tier && (
                                    <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${TIER_BADGE[tier]}`}>
                                      {TIER_LABEL[tier]}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-700 capitalize">{l.goal ?? "—"}</td>
                            <td className="px-6 py-4 text-xs text-zinc-700">
                              {l.obstacles.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {l.obstacles.map(o => (
                                    <span key={o} className="inline-block bg-zinc-100 text-zinc-700 rounded px-1.5 py-0.5 text-[10px]">{o}</span>
                                  ))}
                                </div>
                              ) : "—"}
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-700 capitalize">{l.recommended_offer ?? "—"}</td>
                            <td className="px-6 py-4 text-xs text-zinc-500 whitespace-nowrap">{timeAgo(l.created_at)}</td>
                            <td className="px-6 py-4 text-xs">
                              {registered ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                                </span>
                              ) : (
                                <span className="text-zinc-400">No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {leads.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                          <Flame className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                          No leads yet — submissions will appear here in real time.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── CLIENT DETAIL ── */
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
              <header className="bg-white border-b border-zinc-200 px-4 sm:px-8 py-4 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <div className="flex items-center gap-3 sm:gap-6">
                  <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-zinc-100 rounded-lg md:hidden" aria-label="Open sidebar">
                    <Menu className="h-5 w-5 text-zinc-500" />
                  </button>
                  <button onClick={() => setSelected(null)} className="p-2 -ml-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{selected.full_name ?? "Unnamed Client"}</h2>
                    <p className="text-sm text-zinc-500">{selected.email} · {selected.phone ?? "No phone"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-zinc-500">Status:</span>
                  <select
                    value={selected.status}
                    onChange={(e) => updateClientStatus(selected.id, e.target.value as ClientStatus)}
                    className={`text-sm font-medium rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/20 cursor-pointer appearance-none pr-8 ${statusColor(selected.status)}`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.2em 1.2em" }}>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value} className="text-zinc-900 bg-white">{o.label}</option>)}
                  </select>
                </div>
              </header>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left: Profile + Documents */}
                <div className="w-full md:w-1/2 p-4 sm:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-200 bg-zinc-50/50 space-y-8">
                  {/* Profile */}
                  <section>
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" /> Client Profile
                    </h3>
                    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm grid grid-cols-2 gap-4">
                      <div><div className="text-xs text-zinc-500 mb-1">Full Name</div><div className="font-medium text-zinc-900">{selected.full_name ?? "—"}</div></div>
                      <div><div className="text-xs text-zinc-500 mb-1">Phone</div><div className="font-medium text-zinc-900">{selected.phone ?? "—"}</div></div>
                      <div className="col-span-2"><div className="text-xs text-zinc-500 mb-1">Address</div><div className="font-medium text-zinc-900">{selected.address ?? "—"}</div></div>
                      <div><div className="text-xs text-zinc-500 mb-1">Goal</div><div className="font-medium text-zinc-900 capitalize">{selected.goal?.replace(/-/g, " ") ?? "—"}</div></div>
                      <div><div className="text-xs text-zinc-500 mb-1">Challenge</div><div className="font-medium text-zinc-900 capitalize">{selected.challenge?.replace(/-/g, " ") ?? "—"}</div></div>
                    </div>
                  </section>

                  {/* Documents */}
                  <section>
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-zinc-400" /> Secure Document Vault
                    </h3>
                    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                      {documents.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                          <p className="text-sm">No documents uploaded yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-100">
                          {documents.map((doc) => (
                            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 group">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${doc.mime_type === "application/pdf" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="font-medium text-zinc-900 text-sm">{doc.name}</div>
                                  <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                    {doc.status === "verified"
                                      ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                                      : <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> Pending</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => getDocumentUrl(doc.storage_path)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md" aria-label="View document">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button onClick={() => getDocumentUrl(doc.storage_path)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md" aria-label="Download document">
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right: Messenger */}
                <div className="w-full md:w-1/2 flex flex-col bg-white min-h-[300px]">
                  <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 shrink-0">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                      <Send className="h-4 w-4 text-zinc-400" /> Two-Way Messenger
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Messages appear directly in the client's portal.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                          <Send className="h-5 w-5 text-zinc-300" />
                        </div>
                        <p className="text-sm">No messages yet. Start the conversation.</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                            msg.sender === "admin" ? "bg-[#111111] text-white rounded-br-sm" : "bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm shadow-sm"}`}>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1.5">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 border-t border-zinc-200 bg-white shrink-0">
                    <div className="flex gap-3">
                      <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a message to the client…"
                        className="flex-1 resize-none rounded-xl border border-zinc-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 min-h-[80px]" />
                      <Button onClick={sendMessage} disabled={!newMessage.trim()} className="h-auto px-6 rounded-xl bg-[#111111] text-white hover:bg-black">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Manual-lead entry modal. Mounted at the dashboard root so it's not
          clipped by the sidebar/main-column overflow:hidden. Closes itself
          on success; the realtime INSERT subscription on lead_submissions
          pushes the new row into the table with no explicit refetch. */}
      <AddLeadModal open={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
    </div>
  );
}
