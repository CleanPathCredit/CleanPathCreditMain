import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { db, auth } from "@/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { DocumentVault } from "@/components/dashboard/DocumentVault";
import type { UserData, ChatMessage } from "@/types/user";
import {
  CheckCircle2, LogOut, Shield, Lock, FileText, Download,
  HelpCircle, MessageSquare, BookOpen, X, Send,
  LayoutDashboard, FolderLock, List, LifeBuoy, Menu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type SidebarTab = "dashboard" | "vault" | "masterlist" | "support";

const STATUS_STEPS = [
  { key: "deep_dive_audit", label: "Deep-Dive Audit", description: "Full analysis of all 3 bureau reports." },
  { key: "aggressive_dispute", label: "Aggressive Dispute Strategy", description: "Custom dispute letters crafted." },
  { key: "bureau_processing", label: "Bureau Processing - 30 Days", description: "Bureaus have 30 days to investigate." },
  { key: "results_update", label: "Results & Score Update", description: "Deletions and score changes reported." },
];

function getStepStatus(profileStatus: string, stepKey: string): "completed" | "active" | "pending" {
  const order = ["deep_dive_audit", "aggressive_dispute", "bureau_processing", "results_update"];
  const statusMap: Record<string, number> = {
    pending_connection: -1,
    missing_id: -1,
    ready_for_audit: 0,
    audit_in_progress: 0,
    audit_complete: 1,
    disputes_drafted: 1,
    disputes_sent: 2,
    waiting_on_bureau: 2,
    bureau_responded: 3,
    results_received: 3,
    complete: 4,
  };
  const currentLevel = statusMap[profileStatus] ?? -1;
  const stepLevel = order.indexOf(stepKey);

  if (currentLevel > stepLevel) return "completed";
  if (currentLevel === stepLevel) return "active";
  return "pending";
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [profile?.messages, isChatOpen]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "client",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(profile?.messages ?? []), message];
    await updateDoc(doc(db, "users", user.uid), { messages: updatedMessages });
    setNewMessage("");
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );

  const sidebarItems: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "vault", label: "Document Vault", icon: <FolderLock className="h-5 w-5" /> },
    { id: "masterlist", label: "The Master List", icon: <List className="h-5 w-5" /> },
    { id: "support", label: "Support & Tickets", icon: <LifeBuoy className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Top Header */}
      <header className="bg-[#111111] text-white px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Clean Path Credit" className="h-8 w-8 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-tight">Clean Path Credit</span>
              <span className="text-[8px] font-medium text-zinc-400 tracking-widest uppercase leading-tight">Powered by AI</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 hidden md:inline-block">{user?.email}</span>
          <Button
            variant="outline"
            onClick={logout}
            className="h-8 px-3 text-xs bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — Desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-[#111111] min-h-[calc(100vh-48px)] sticky top-12 p-3 gap-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === item.id
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </aside>

        {/* Sidebar — Mobile overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/40 z-50 md:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-64 bg-[#111111] z-50 md:hidden p-4 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 mb-6 px-3">
                  <img src="/logo.png" alt="Clean Path Credit" className="h-8 w-8 object-contain" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm leading-tight">Clean Path Credit</span>
                    <span className="text-[8px] font-medium text-zinc-500 tracking-widest uppercase leading-tight">Powered by AI</span>
                  </div>
                </div>
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                      activeTab === item.id
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">
              Welcome to your Clean Path, {profile?.fullName?.split(" ")[0] || "Client"}
            </h1>
          </div>

          <AnimatePresence mode="wait">
            {/* ====== DASHBOARD TAB ====== */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Dispute Tracker */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-900 mb-6 tracking-tight">Dispute Tracker</h2>
                  <div className="space-y-6">
                    {STATUS_STEPS.map((step) => {
                      const stepStatus = getStepStatus(profile?.status || "pending_connection", step.key);
                      return (
                        <div key={step.key} className={`flex items-start gap-4 ${stepStatus === "pending" ? "opacity-50" : ""}`}>
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            stepStatus === "completed"
                              ? "bg-emerald-500"
                              : stepStatus === "active"
                              ? "bg-blue-500 animate-pulse"
                              : "bg-zinc-200"
                          }`}>
                            {stepStatus === "completed" && <CheckCircle2 className="h-4 w-4 text-white" />}
                            {stepStatus === "active" && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900">{step.label}</h3>
                            <p className="text-sm text-zinc-500 mt-0.5">
                              {stepStatus === "completed" ? "Completed" : stepStatus === "active" ? "Active" : "Pending"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Analysis Terminal */}
                {(profile?.status && profile.status !== "pending_connection" && profile.status !== "missing_id") && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-[#111111] p-6 md:p-8 shadow-2xl border border-zinc-800 font-mono text-sm overflow-hidden relative"
                  >
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <div className="absolute top-4 right-4 text-xs text-zinc-600">cleanpath-engine-v2.1</div>

                    <div className="mt-8 space-y-4">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-[#00FFA3] font-bold">~</span>
                        <span>cleanpath analyze --report-latest</span>
                      </div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[#00FFA3] font-bold">
                        Analysis Complete [720ms]
                      </motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-red-400 font-bold">
                        Negative Items Found: {profile?.negativeItems || 3}
                      </motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-[#00FFA3] font-bold">
                        Dispute Probability: High ({profile?.disputeProbability || 94}%)
                      </motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="text-zinc-300 pt-4">
                        &gt; Generating legally-backed dispute frameworks...
                        <div className="mt-3 h-1.5 w-full max-w-md bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: 2.5, duration: 2 }}
                            className="h-full bg-[#00FFA3]"
                          />
                        </div>
                      </motion.div>
                    </div>
                  </motion.section>
                )}

                {/* Resource Library */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-900 mb-6 tracking-tight">Resource Library</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "The 720 Credit Score Blueprint", type: "PDF Guide" },
                      { title: "How to Handle Debt Collectors", type: "E-Book" },
                      { title: "Understanding Credit Utilization", type: "Cheatsheet" },
                      { title: "Building Positive Credit History", type: "Action Plan" },
                    ].map((resource, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:shadow-sm transition-all group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900 text-sm">{resource.title}</h3>
                            <p className="text-xs font-medium text-zinc-500 mt-0.5">{resource.type}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full bg-white hover:bg-zinc-50 border-zinc-200">
                          <Download className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {/* ====== DOCUMENT VAULT TAB ====== */}
            {activeTab === "vault" && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DocumentVault profile={profile} />
              </motion.div>
            )}

            {/* ====== MASTER LIST TAB ====== */}
            {activeTab === "masterlist" && (
              <motion.div
                key="masterlist"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-900 mb-4 tracking-tight">The Master Financial List</h2>
                  <p className="text-sm text-zinc-500 mb-6">
                    Your curated list of credit-building tools, secured cards, and financial resources.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "Master Financial List 2024", type: "PDF Download" },
                      { title: "Top Secured Credit Cards", type: "Guide" },
                      { title: "Credit Builder Loan Directory", type: "Resource" },
                      { title: "Authorized User Tradeline Guide", type: "Strategy" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:shadow-sm transition-all group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900 text-sm">{item.title}</h3>
                            <p className="text-xs font-medium text-zinc-500 mt-0.5">{item.type}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full bg-white hover:bg-zinc-50 border-zinc-200">
                          <Download className="h-4 w-4 text-zinc-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {/* ====== SUPPORT TAB ====== */}
            {activeTab === "support" && (
              <motion.div
                key="support"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-900 mb-4 tracking-tight">Support & Tickets</h2>
                  <p className="text-sm text-zinc-500 mb-6">Send us a message and we'll get back to you shortly.</p>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="bg-zinc-50 p-4 border-b border-zinc-200 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#111111] flex items-center justify-center text-white">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 text-sm">Clean Path Support</h3>
                        <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Online
                        </p>
                      </div>
                    </div>
                    <div className="h-80 overflow-y-auto p-6 space-y-4 bg-white">
                      {(!profile?.messages || profile.messages.length === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-zinc-300" />
                          </div>
                          <p className="text-sm font-medium">Send us a message to get started.</p>
                        </div>
                      ) : (
                        profile.messages.map((msg: ChatMessage) => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-end gap-2 max-w-[85%]">
                              {msg.sender === 'admin' && (
                                <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center shrink-0 text-white">
                                  <Shield className="h-4 w-4" />
                                </div>
                              )}
                              <div className={`p-4 rounded-2xl ${
                                msg.sender === 'client'
                                  ? 'bg-[#2563EB] text-white rounded-br-sm'
                                  : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-zinc-400 mt-1.5 px-10">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-zinc-200">
                      <div className="flex gap-3">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type your message..."
                          className="flex-1 resize-none rounded-xl border border-zinc-200 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all min-h-[60px]"
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="h-auto px-5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] font-medium text-zinc-400 mt-2 text-center">Press Enter to send, Shift+Enter for new line.</p>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#111111] text-white shadow-xl hover:shadow-2xl flex items-center justify-center z-30 hover:scale-105 transition-all"
        aria-label="Open support chat"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Slide-over */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
            >
              <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#111111] flex items-center justify-center text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Clean Path Support</h3>
                    <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                      Online
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                {(!profile?.messages || profile.messages.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-zinc-300" />
                    </div>
                    <p className="text-sm font-medium">Send us a message to get started.</p>
                  </div>
                ) : (
                  profile.messages.map((msg: any) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-end gap-2 max-w-[85%]">
                        {msg.sender === 'admin' && (
                          <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center shrink-0 text-white">
                            <Shield className="h-4 w-4" />
                          </div>
                        )}
                        <div className={`p-4 rounded-2xl ${
                          msg.sender === 'client'
                            ? 'bg-[#2563EB] text-white rounded-br-sm'
                            : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm shadow-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-zinc-400 mt-1.5 px-10">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-5 border-t border-zinc-200 bg-white">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 resize-none rounded-xl border border-zinc-200 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all min-h-[80px]"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="h-auto px-5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] font-medium text-zinc-400 mt-2 text-center">Press Enter to send, Shift+Enter for new line.</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
