/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
const CreditRepairSanAntonio = lazy(() => import("@/pages/CreditRepairSanAntonio").then(m => ({ default: m.CreditRepairSanAntonio })));
const Faq          = lazy(() => import("@/pages/Faq").then(m => ({ default: m.Faq })));
const CreditRepairHouston = lazy(() => import("@/pages/CreditRepairHouston").then(m => ({ default: m.CreditRepairHouston })));
const Blog          = lazy(() => import("@/pages/Blog").then(m => ({ default: m.Blog })));
const BlogScam      = lazy(() => import("@/pages/blog/AreCreditRepairCompaniesAScam").then(m => ({ default: m.AreCreditRepairCompaniesAScam })));
const BlogGuarantee = lazy(() => import("@/pages/blog/DoCreditRepairCompaniesGuaranteeResults").then(m => ({ default: m.DoCreditRepairCompaniesGuaranteeResults })));
const BlogLegit     = lazy(() => import("@/pages/blog/HowToKnowIfCreditRepairCompanyIsLegitimate").then(m => ({ default: m.HowToKnowIfCreditRepairCompanyIsLegitimate })));
const BlogEsItin    = lazy(() => import("@/pages/blog/es/RepararCreditoConItin").then(m => ({ default: m.RepararCreditoConItin })));
const BlogHowLong   = lazy(() => import("@/pages/blog/HowLongDoesCreditRepairTake").then(m => ({ default: m.HowLongDoesCreditRepairTake })));
const BlogEsEstafa  = lazy(() => import("@/pages/blog/es/ReparacionDeCreditoEsEstafa").then(m => ({ default: m.ReparacionDeCreditoEsEstafa })));
const BlogEsTiempo  = lazy(() => import("@/pages/blog/es/CuantoTiempoTardaReparacionCredito").then(m => ({ default: m.CuantoTiempoTardaReparacionCredito })));
const BlogDiy       = lazy(() => import("@/pages/blog/CanIFixMyCreditMyself").then(m => ({ default: m.CanIFixMyCreditMyself })));
const About         = lazy(() => import("@/pages/About").then(m => ({ default: m.About })));
const EsReparacionSA = lazy(() => import("@/pages/EsReparacionSanAntonio").then(m => ({ default: m.EsReparacionSanAntonio })));
const BlogChooseSA  = lazy(() => import("@/pages/blog/HowToChooseCreditRepairSanAntonio").then(m => ({ default: m.HowToChooseCreditRepairSanAntonio })));
const BlogHouse     = lazy(() => import("@/pages/blog/CreditScoreToBuyHouseTexas").then(m => ({ default: m.CreditScoreToBuyHouseTexas })));
const BlogVs        = lazy(() => import("@/pages/blog/CreditRepairVsCounselingVsDebtSettlement").then(m => ({ default: m.CreditRepairVsCounselingVsDebtSettlement })));
const BlogFixHouse  = lazy(() => import("@/pages/blog/HowToFixCreditToBuyHouseTexas").then(m => ({ default: m.HowToFixCreditToBuyHouseTexas })));
const RightsTexas   = lazy(() => import("@/pages/CreditRepairRightsTexas").then(m => ({ default: m.CreditRepairRightsTexas })));
const EsDerechos    = lazy(() => import("@/pages/EsTusDerechosTexas").then(m => ({ default: m.EsTusDerechosTexas })));

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
              <Route path="/credit-repair-san-antonio" element={<CreditRepairSanAntonio />} />
              <Route path="/credit-repair-houston" element={<CreditRepairHouston />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/are-credit-repair-companies-a-scam" element={<BlogScam />} />
              <Route path="/blog/do-credit-repair-companies-guarantee-results" element={<BlogGuarantee />} />
              <Route path="/blog/how-to-know-if-credit-repair-company-is-legitimate" element={<BlogLegit />} />
              <Route path="/blog/es/reparar-credito-con-itin" element={<BlogEsItin />} />
              <Route path="/blog/how-long-does-credit-repair-take" element={<BlogHowLong />} />
              <Route path="/blog/es/reparacion-de-credito-es-estafa" element={<BlogEsEstafa />} />
              <Route path="/blog/es/cuanto-tiempo-tarda-reparacion-credito" element={<BlogEsTiempo />} />
              <Route path="/blog/can-i-fix-my-credit-myself" element={<BlogDiy />} />
              <Route path="/blog/credit-score-to-buy-a-house-texas" element={<BlogHouse />} />
              <Route path="/blog/credit-repair-vs-credit-counseling-vs-debt-settlement" element={<BlogVs />} />
              <Route path="/blog/how-to-fix-your-credit-to-buy-a-house-texas" element={<BlogFixHouse />} />
              <Route path="/blog/how-to-choose-credit-repair-company-san-antonio" element={<BlogChooseSA />} />
              <Route path="/about" element={<About />} />
              <Route path="/credit-repair-rights-texas" element={<RightsTexas />} />
              <Route path="/es/tus-derechos-reparacion-credito-texas" element={<EsDerechos />} />
              <Route path="/es/reparacion-de-credito-san-antonio" element={<EsReparacionSA />} />
              {/* /upgrade is 301-redirected to /unlock at the edge (vercel.json) */}
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
        </AuthProvider>
      </Router>
    </ClerkProvider>
  );
}
