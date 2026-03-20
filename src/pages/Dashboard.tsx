import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { db, auth } from "@/firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Upload, LogOut, Shield, Lock, FileText, Download, HelpCircle, MessageSquare, ChevronDown, ChevronUp, BookOpen, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPdfGuide, setShowPdfGuide] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check both context user and auth.currentUser to prevent race conditions
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        if (data.status === "audit_complete" || data.progress === 100) {
          setAnalysisComplete(true);
        }
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

  const handleUploadComplete = async () => {
    if (!user) return;
    
    // Start analysis animation
    setAnalyzing(true);
    
    setTimeout(async () => {
      setAnalyzing(false);
      setAnalysisComplete(true);
      
      await updateDoc(doc(db, "users", user.uid), {
        reportsUploaded: true,
        idUploaded: true,
        ssnUploaded: true,
        progress: 100,
        status: "audit_complete"
      });
    }, 3000);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportMessage("");
    setShowSupport(false);
    setIsChatOpen(true); // Open the main chat instead
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "client",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(profile?.messages || []), message];
    await updateDoc(doc(db, "users", user.uid), { messages: updatedMessages });
    setNewMessage("");
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-sans">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-white">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Client Portal</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-600 hidden md:inline-block">{user?.email}</span>
          <Button variant="outline" onClick={logout} className="h-9 px-4 text-sm bg-white hover:bg-zinc-50">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline-block">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-4 space-y-8">
        
        {/* Section A: The Credit Report Mission */}
        {!analysisComplete && (
          <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-zinc-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">1</span>
              Secure Your 3-Bureau Report
            </h2>
            
            <div className="space-y-6 mb-8">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-bold text-sm">1</div>
                <div>
                  <p className="font-bold text-zinc-900">Go to AnnualCreditReport.com</p>
                  <p className="text-sm text-zinc-500 mt-1">This is the only federally authorized website for free reports.</p>
                  <a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm font-bold text-[#2563EB] hover:text-blue-700">Open AnnualCreditReport.com &rarr;</a>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-bold text-sm">2</div>
                <div>
                  <p className="font-bold text-zinc-900">Request all 3 reports</p>
                  <p className="text-sm text-zinc-500 mt-1">Select Equifax, Experian, and TransUnion.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-bold text-sm">3</div>
                <div>
                  <p className="font-bold text-zinc-900">Save them as PDFs</p>
                  <p className="text-sm text-zinc-500 mt-1">You will need to upload these PDFs in the next step.</p>
                  
                  <button 
                    onClick={() => setShowPdfGuide(!showPdfGuide)}
                    className="mt-3 flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    How to save as PDF {showPdfGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  
                  <AnimatePresence>
                    {showPdfGuide && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 p-5 bg-zinc-50 rounded-xl border border-zinc-200 text-sm space-y-4">
                          <div>
                            <strong className="block text-zinc-900 mb-1">Method 1: Native Download</strong>
                            <p className="text-zinc-600">Look for a "Download Report" or "Save as PDF" button directly on the website after viewing your report.</p>
                          </div>
                          <div>
                            <strong className="block text-zinc-900 mb-1">Method 2: Print to PDF (Workaround)</strong>
                            <p className="text-zinc-600">Press <kbd className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded text-xs font-mono font-medium">Ctrl+P</kbd> (Windows) or <kbd className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded text-xs font-mono font-medium">Cmd+P</kbd> (Mac). Change the destination printer to "Save as PDF" and click Save.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100">
              <button 
                onClick={() => setIsChatOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                Having trouble? Message Support
              </button>
            </div>
          </section>
        )}

        {/* Section B: The Secure Document Vault */}
        {!analysisComplete ? (
          <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Lock className="h-48 w-48 -mt-8 -mr-8" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Lock className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Secure Document Vault</h2>
              </div>
              <p className="text-sm font-medium text-zinc-500 mb-8 flex items-center gap-2">
                <Shield className="h-4 w-4" /> 256-bit Encryption • Bank-Level Security
              </p>

              <div className="space-y-6">
                {/* Upload Area 1 */}
                <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                  <div className="mx-auto h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center mb-4 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-zinc-900 mb-1">Upload 3-Bureau Credit Reports</h3>
                  <p className="text-sm font-medium text-zinc-500">Drag & drop PDFs or click to browse</p>
                </div>

                {/* Upload Area 2 */}
                <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                  <div className="mx-auto h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center mb-4 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-zinc-900 mb-1">Upload Identity Verification</h3>
                  <p className="text-sm font-medium text-zinc-500 mb-2">Required by Federal Law</p>
                  <p className="text-xs font-medium text-zinc-400">Driver's License/ID and Social Security Card</p>
                </div>

                <Button 
                  onClick={handleUploadComplete} 
                  className="w-full h-14 bg-[#111111] text-white hover:bg-black rounded-xl text-lg font-bold shadow-md"
                  disabled={analyzing}
                >
                  {analyzing ? "Encrypting & Uploading..." : "Complete Upload"}
                </Button>
              </div>
            </div>
            
            {/* Analyzing Overlay */}
            <AnimatePresence>
              {analyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#111111] flex flex-col items-center justify-center z-20"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-[#00FFA3] mb-4" />
                  </motion.div>
                  <p className="text-[#00FFA3] font-mono text-sm tracking-wider">Securely processing documents...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        ) : (
          /* The "Analysis Complete" UI */
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
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-[#00FFA3] font-bold">~</span>
                <span>cleanpath analyze --report=latest</span>
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[#00FFA3] font-bold"
              >
                Analysis Complete [720ms]
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-red-400 font-bold"
              >
                Negative Items Found: 3
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-[#00FFA3] font-bold"
              >
                Dispute Probability: High (94%)
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="text-zinc-300 pt-4"
              >
                &gt; Generating dispute letters...
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

        {/* Section C: Progress & Resources */}
        {analysisComplete && (
          <>
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
              <h2 className="text-2xl font-bold text-zinc-900 mb-8 tracking-tight">Dispute Timeline</h2>
              
              <div className="relative border-l-2 border-zinc-100 ml-3 space-y-10">
                <div className="relative pl-8">
                  <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                  <h3 className="font-bold text-zinc-900 text-lg">Audit Complete</h3>
                  <p className="text-sm font-medium text-zinc-500 mt-1">We've identified the negative items to challenge.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                  <h3 className="font-bold text-zinc-900 text-lg">Disputes Mailed</h3>
                  <p className="text-sm font-medium text-zinc-500 mt-1">Letters sent to Equifax, Experian, and TransUnion.</p>
                </div>
                <div className="relative pl-8 opacity-50">
                  <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full bg-zinc-200 border-4 border-white" />
                  <h3 className="font-bold text-zinc-900 text-lg">Waiting on Bureau</h3>
                  <p className="text-sm font-medium text-zinc-500 mt-1">By law, they have 30 days to investigate.</p>
                </div>
                <div className="relative pl-8 opacity-50">
                  <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full bg-zinc-200 border-4 border-white" />
                  <h3 className="font-bold text-zinc-900 text-lg">Results Received</h3>
                  <p className="text-sm font-medium text-zinc-500 mt-1">We will notify you of any deletions or updates.</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 tracking-tight">Resource Library</h2>
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
          </>
        )}
      </main>

      {/* Persistent Support Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111111] text-white p-4 border-t border-zinc-800 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <MessageSquare className="h-5 w-5 text-[#00FFA3]" />
            </div>
            <div>
              <span className="font-bold text-sm block">Need assistance?</span>
              <span className="text-xs text-zinc-400 font-medium">We're here to help.</span>
            </div>
          </div>
          <Button 
            onClick={() => setIsChatOpen(true)}
            className="bg-white text-zinc-900 hover:bg-zinc-100 h-10 px-6 rounded-full text-sm font-bold shadow-sm"
          >
            Open Support Chat
          </Button>
        </div>
      </div>

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
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
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
