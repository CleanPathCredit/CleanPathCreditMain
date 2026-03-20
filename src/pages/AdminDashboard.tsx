import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "@/firebase";
import { collection, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { LogOut, Users, FileText, Settings, ChevronLeft, Send, Download, Eye, ShieldCheck, Clock, CheckCircle2, AlertCircle, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STATUS_OPTIONS = [
  { value: "missing_id", label: "Missing ID", color: "bg-red-50 text-red-700 border-red-200" },
  { value: "ready_for_audit", label: "Ready for Audit", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "audit_complete", label: "Audit Complete", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "disputes_sent", label: "Round 1 Sent", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "waiting_on_bureau", label: "Waiting on Bureau", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "results_received", label: "Results Received", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export function AdminDashboard() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stateRole = location.state?.role;
    if (!user || (userData?.role !== "admin" && stateRole !== "admin")) {
      navigate("/login");
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const clientList = usersList.filter(u => u.role !== "admin");
      setClients(clientList);
      
      if (selectedClient) {
        const updatedSelected = clientList.find(c => c.id === selectedClient.id);
        if (updatedSelected) setSelectedClient(updatedSelected);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userData, navigate, selectedClient?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedClient?.messages]);

  const updateClientStatus = async (clientId: string, status: string) => {
    let progress = 0;
    switch (status) {
      case "missing_id": progress = 10; break;
      case "ready_for_audit": progress = 25; break;
      case "audit_complete": progress = 50; break;
      case "disputes_sent": progress = 75; break;
      case "waiting_on_bureau": progress = 85; break;
      case "results_received": progress = 100; break;
      default: progress = 0;
    }
    await updateDoc(doc(db, "users", clientId), { status, progress });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "admin",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(selectedClient.messages || []), message];
    await updateDoc(doc(db, "users", selectedClient.id), { messages: updatedMessages });
    setNewMessage("");
  };

  const getStatusColor = (statusValue: string) => {
    const status = STATUS_OPTIONS.find(s => s.value === statusValue);
    return status ? status.color : "bg-zinc-100 text-zinc-700 border-zinc-200";
  };

  const getStatusLabel = (statusValue: string) => {
    const status = STATUS_OPTIONS.find(s => s.value === statusValue);
    return status ? status.label : "Pending";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500">Loading Admin Portal...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111111] text-zinc-400 flex flex-col border-r border-zinc-800 transform transition-transform duration-300 md:relative md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              Clean Path
            </h1>
            <p className="text-xs mt-1 text-zinc-500 uppercase tracking-wider font-medium">Admin Portal</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => { setSelectedClient(null); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors text-left ${!selectedClient ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <Users className="h-5 w-5" /> CRM Dashboard
          </button>
          <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors text-left">
            <FileText className="h-5 w-5" /> Documents
          </button>
          <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors text-left">
            <Settings className="h-5 w-5" /> Settings
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <div className="px-4 py-3 mb-2 text-xs text-zinc-500 truncate">
            {user?.email}
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-zinc-800/50 hover:text-zinc-200 rounded-lg transition-colors text-left">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedClient ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-auto p-4 sm:p-8"
            >
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="p-2 -ml-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 md:hidden"
                      aria-label="Open sidebar"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Client Management</h2>
                      <p className="text-zinc-500 mt-1 text-sm sm:text-base">Manage active clients, documents, and disputes.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" />
                      {clients.length} Active Clients
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Client Details</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Progress</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {clients.map(client => (
                        <tr key={client.id} className="hover:bg-zinc-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-medium text-zinc-900">{client.fullName || 'Unnamed Client'}</div>
                            <div className="text-zinc-500 text-xs mt-0.5">{client.email}</div>
                            {client.phone && <div className="text-zinc-400 text-xs mt-0.5">{client.phone}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                              {getStatusLabel(client.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-full bg-zinc-100 rounded-full h-2 max-w-[120px] overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${client.progress || 0}%` }}></div>
                              </div>
                              <span className="text-xs font-medium text-zinc-600 w-8">{client.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="outline" 
                              className="h-9 px-4 text-sm bg-white hover:bg-zinc-50 shadow-sm"
                              onClick={() => setSelectedClient(client)}
                            >
                              Manage Client
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                            <div className="flex flex-col items-center justify-center">
                              <Users className="h-10 w-10 text-zinc-300 mb-3" />
                              <p>No clients found in the system.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Detail Header */}
              <header className="bg-white border-b border-zinc-200 px-4 sm:px-8 py-4 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <div className="flex items-center gap-3 sm:gap-6">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 -ml-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 md:hidden"
                    aria-label="Open sidebar"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedClient(null)}
                    className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-zinc-900"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{selectedClient.fullName || 'Unnamed Client'}</h2>
                    <p className="text-sm text-zinc-500">{selectedClient.email} • {selectedClient.phone || 'No phone'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-zinc-500">Current Status:</div>
                  <select 
                    value={selectedClient.status || "missing_id"}
                    onChange={(e) => updateClientStatus(selectedClient.id, e.target.value)}
                    className={`text-sm font-medium rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/20 transition-shadow cursor-pointer appearance-none pr-8 relative ${getStatusColor(selectedClient.status)}`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.2em 1.2em` }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="text-zinc-900 bg-white">{opt.label}</option>
                    ))}
                  </select>
                </div>
              </header>

              {/* Detail Content Grid */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Column: Document Vault & Info */}
                <div className="w-full md:w-1/2 p-4 sm:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-200 bg-zinc-50/50">
                  <div className="max-w-xl mx-auto space-y-8">
                    
                    {/* Client Info Card */}
                    <section>
                      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-400" /> Client Profile
                      </h3>
                      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Full Name</div>
                            <div className="font-medium text-zinc-900">{selectedClient.fullName || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Phone</div>
                            <div className="font-medium text-zinc-900">{selectedClient.phone || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-zinc-500 mb-1">Address</div>
                            <div className="font-medium text-zinc-900">{selectedClient.address || '-'}</div>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Primary Goal</div>
                            <div className="font-medium text-zinc-900 capitalize">{selectedClient.goal?.replace(/-/g, ' ') || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Main Challenge</div>
                            <div className="font-medium text-zinc-900 capitalize">{selectedClient.challenge?.replace(/-/g, ' ') || '-'}</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Document Vault */}
                    <section>
                      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-zinc-400" /> Secure Document Vault
                      </h3>
                      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-zinc-100">
                          {/* Mock Documents - In a real app, these would come from selectedClient.documents */}
                          {[
                            { name: "Identity Verification (ID)", type: "Image", date: "Today, 10:42 AM", status: "verified" },
                            { name: "SSN Card", type: "Image", date: "Today, 10:45 AM", status: "pending" },
                            { name: "Experian_Credit_Report.pdf", type: "PDF", date: "Yesterday", status: "verified" },
                            { name: "Equifax_Credit_Report.pdf", type: "PDF", date: "Yesterday", status: "verified" },
                            { name: "TransUnion_Credit_Report.pdf", type: "PDF", date: "Yesterday", status: "verified" },
                          ].map((doc, i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${doc.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="font-medium text-zinc-900 text-sm">{doc.name}</div>
                                  <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                    {doc.date}
                                    {doc.status === 'verified' ? (
                                      <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> Pending Review</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors" aria-label="View document">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors" aria-label="Download document">
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                  </div>
                </div>

                {/* Right Column: Messenger */}
                <div className="w-full md:w-1/2 flex flex-col bg-white min-h-[300px]">
                  <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 shrink-0">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                      <Send className="h-4 w-4 text-zinc-400" /> Two-Way Messenger
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Messages appear directly in the client's portal.</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                    {(!selectedClient.messages || selectedClient.messages.length === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                          <Send className="h-5 w-5 text-zinc-300" />
                        </div>
                        <p className="text-sm">No messages yet. Start the conversation.</p>
                      </div>
                    ) : (
                      selectedClient.messages.map((msg: any) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-end gap-2 max-w-[80%]">
                            {msg.sender !== 'admin' && (
                              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 text-xs font-medium text-zinc-600">
                                {selectedClient.fullName?.charAt(0) || 'C'}
                              </div>
                            )}
                            <div className={`p-4 rounded-2xl ${
                              msg.sender === 'admin' 
                                ? 'bg-[#111111] text-white rounded-br-sm' 
                                : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm shadow-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1.5 px-10">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-zinc-200 bg-white shrink-0">
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
                        placeholder="Type a message to the client..."
                        className="flex-1 resize-none rounded-xl border border-zinc-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 transition-shadow min-h-[80px]"
                      />
                      <Button 
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="h-auto px-6 rounded-xl bg-[#111111] text-white hover:bg-black"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 text-center">Press Enter to send, Shift+Enter for new line.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
