/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useConversation } from "@elevenlabs/react";

const CHAT_PAGES = ["/", "/dashboard"];
const AGENT_ID   = "agent_5401kp5w96nqf65rw5wd46np1p4d";

function ChatWidget() {
  const { pathname } = useLocation();
  const show = CHAT_PAGES.includes(pathname);

  const conversation = useConversation({
    onConnect:    () => console.log("ElevenLabs connected"),
    onDisconnect: () => console.log("ElevenLabs disconnected"),
    onError:      (err) => console.error("ElevenLabs error:", err),
  });

  const handleStart = async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
  };

  if (!show) return null;

  const isConnected = conversation.status === "connected";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      {isConnected && (
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "8px 14px",
          fontSize: "13px",
          color: "#374151",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>
          {conversation.isSpeaking ? "Alex is speaking…" : "Listening…"}
        </div>
      )}
      <button
        onClick={isConnected ? () => conversation.endSession() : handleStart}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: isConnected ? "#ef4444" : "#059669",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        title={isConnected ? "End conversation" : "Talk to Alex"}
      >
        {isConnected ? (
          /* X icon */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          /* Mic icon */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
    </div>
  );
}

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const Landing = lazy(() => import("@/pages/Landing").then(m => ({ default: m.Landing })));
const Login = lazy(() => import("@/pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("@/pages/Register").then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const Methodology = lazy(() => import("@/pages/Methodology").then(m => ({ default: m.Methodology })));
const Welcome     = lazy(() => import("@/pages/Welcome").then(m => ({ default: m.Welcome })));

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-black" />
        <span className="text-sm font-medium text-zinc-500">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Router>
        <AuthProvider>
          <ChatWidget />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<Methodology />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </ClerkProvider>
  );
}
