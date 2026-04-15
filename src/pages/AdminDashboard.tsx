/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@clerk/clerk-react";
import { Button } from "@/components/ui/Button";
import type { ClientRecord, Message, ClientStatus, Document as DocRow } from "@/types/database";
import {
  LogOut, Users, FileText, Settings, ChevronLeft, Send, Download,
  Eye, ShieldCheck, CheckCircle2, AlertCircle, Menu, X, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

export function AdminDashboard() {
  const { clerkUser, logout, supabase } = useAuth();
  const { session } = useSession();

  const [clients, setClients]             = useState<ClientRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<ClientRecord | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [documents, setDocuments]         = useState<DocRow[]>([]);
  const [newMessage, setNewMessage]       = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClientRecord | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load client list via service-role API (bypasses Clerk→Supabase JWT/RLS).
  // ProtectedRoute already ensures role=admin before this component mounts.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const loadClients = async () => {
      try {
        const token = await session.getToken();
        const res = await fetch("/api/admin/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load clients (${res.status})`);
        const data = (await res.json()) as ClientRecord[];
        if (!cancelled) setClients(data ?? []);
      } catch (err) {
        if (!cancelled) console.error("Failed to load clients:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadClients();

    // Real-time: refetch the list whenever a client profile changes.
    // Subscription is best-effort — if it fails, manual refresh still works.
    const channel = supabase
      .channel("profiles:clients")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: "role=eq.client" },
          () => { loadClients(); })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, supabase]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, supabase]);

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

  const deleteClient = async () => {
    if (!confirmDelete || !session) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const token = await session.getToken();
      const res = await fetch("/api/admin/delete-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId: confirmDelete.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? `Request failed (${res.status})`);
      }
      // Optimistic removal — Realtime will also fire but this is instant.
      setClients((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      if (selected?.id === confirmDelete.id) setSelected(null);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeleting(false);
    }
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
              <img src="/logo.png" alt="Clean Path Credit" className="h-8 w-8 object-contain" /> Clean Path
            </h1>
            <p className="text-[9px] mt-1 text-zinc-500 uppercase tracking-widest font-medium">Admin Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white md:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => { setSelected(null); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors text-left ${!selected ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 hover:text-zinc-200"}`}>
            <Users className="h-5 w-5" /> CRM Dashboard
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
          {!selected ? (
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
                      <p className="text-zinc-500 mt-1 text-sm">Manage active clients, documents, and disputes.</p>
                    </div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-400" /> {clients.length} Clients
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Client</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Progress</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {clients.map((c) => (
                        <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-medium text-zinc-900">{c.full_name ?? "Unnamed Client"}</div>
                            <div className="text-zinc-500 text-xs mt-0.5">{c.email}</div>
                            {c.phone && <div className="text-zinc-400 text-xs mt-0.5">{c.phone}</div>}
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
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" className="h-9 px-4 text-sm bg-white hover:bg-zinc-50 shadow-sm" onClick={() => setSelected(c)}>
                                Manage
                              </Button>
                              <button
                                onClick={() => { setDeleteError(null); setConfirmDelete(c); }}
                                aria-label={`Delete ${c.full_name ?? c.email}`}
                                title="Delete client"
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clients.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                          <Users className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                          No clients yet.
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

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => !deleting && setConfirmDelete(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-md w-full p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-full bg-red-50 text-red-600 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900">Delete this client?</h3>
                  <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                    This will permanently delete{" "}
                    <span className="font-medium text-zinc-900">{confirmDelete.full_name ?? confirmDelete.email}</span>{" "}
                    and all of their messages, documents, and uploaded files. Their login will also be removed. This cannot be undone.
                  </p>
                  {deleteError && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      {deleteError}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}
                  className="h-10 px-4 text-sm">
                  Cancel
                </Button>
                <Button onClick={deleteClient} disabled={deleting}
                  className="h-10 px-4 text-sm bg-red-600 hover:bg-red-700 text-white">
                  {deleting ? "Deleting…" : "Delete client"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
