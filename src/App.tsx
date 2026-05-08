/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EbookModal } from "@/components/EbookModal";
import { useEbookPopup } from "@/hooks/useEbookPopup";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const Landing = lazy(() => import("@/pages/Landing").then(m => ({ default: m.Landing })));
const Login = lazy(() => import("@/pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("@/pages/Register").then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminLetters   = lazy(() => import("@/pages/admin/AdminLetters").then(m => ({ default: m.AdminLetters })));
const Methodology = lazy(() => import("@/pages/Methodology").then(m => ({ default: m.Methodology })));
const Welcome     = lazy(() => import("@/pages/Welcome").then(m => ({ default: m.Welcome })));
const Terms       = lazy(() => import("@/pages/Terms").then(m => ({ default: m.Terms })));
const Privacy     = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.Privacy })));
const Unlock      = lazy(() => import("@/pages/Unlock").then(m => ({ default: m.Unlock })));
const EsComprador = lazy(() => import("@/pages/EsComprador").then(m => ({ default: m.EsComprador })));
const SmsConsent  = lazy(() => import("@/pages/SmsConsent").then(m => ({ default: m.SmsConsent })));
const Partners    = lazy(() => import("@/pages/Partners").then(m => ({ default: m.Partners })));

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

/**
 * Renders the routed app shell + the global EbookModal trigger. Lives
 * inside ClerkProvider + Router so `useEbookPopup` can read both
 * `useUser()` (skip signed-in users) and `window.location.pathname`
 * (path-based suppression list).
 */
function AppShell(): React.ReactElement {
  const ebookController = useEbookPopup();
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<Methodology />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/unlock"   element={<Unlock />} />
              {/* Alias: marketing teams sometimes reach for /upgrade instead */}
              <Route path="/upgrade"  element={<Unlock />} />
              {/* Spanish consumer-facing landing page — Track A4/B2 funnel
                  destination. Do NOT point paid ads/SMS/leave-behinds at
                  this URL until Texas CSO registration is approved and the
                  number is filled into EsComprador.tsx footer. See file
                  header for full compliance gate list. */}
              <Route path="/es-comprador" element={<EsComprador />} />
              {/* SMS opt-in capture page for A2P 10DLC compliance.
                  Public, no-auth, noindex. The exact opt-in language
                  rendered next to the consent checkbox MUST stay in
                  lockstep with api/sms-consent.ts CONSENT_TEXT_V1 and
                  the Twilio A2P registration. Update all three together
                  or A2P review will reject the registration. */}
              <Route path="/sms-consent" element={<SmsConsent />} />
              {/* Partners program intake page — Track A4/A6 inbound.
                  Public marketing + application form for mortgage LOs,
                  brokers, real estate agents, and dealership F&I managers.
                  See file header for compliance posture (RESPA §8,
                  CROA §404, TCPA). */}
              <Route path="/partners" element={<Partners />} />
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
              <Route
                path="/admin/letters"
                element={
                  <ProtectedRoute role="admin">
                    <AdminLetters />
                  </ProtectedRoute>
                }
              />
        </Routes>
      </Suspense>
      <EbookModal controller={ebookController} />
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Router>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </Router>
    </ClerkProvider>
  );
}
