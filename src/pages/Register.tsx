/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SignUp, ClerkLoading, ClerkLoaded } from "@clerk/clerk-react";

export function Register() {
  // Pre-fill from two possible sources (highest priority first):
  //
  //   1. URL query params (?email=X&name=Y) — sent by form.cleanpathcredit.com
  //      after a lead books a free audit call. We read them once, move them to
  //      sessionStorage, and strip them from the URL so PII doesn't sit in
  //      browser history or server logs.
  //
  //   2. sessionStorage key "cpc_lead" — written by the main-site QuizFunnel
  //      (step 5 progressive disclosure) to pass email + name without PII in URL.
  const initialValues: Record<string, string> = {};
  try {
    // Source 1: URL params from form site
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get("email");
    const urlName  = params.get("name");
    if (urlEmail || urlName) {
      // Move to sessionStorage and clean the URL in one shot
      const lead = { email: urlEmail ?? "", name: urlName ?? "" };
      sessionStorage.setItem("cpc_lead", JSON.stringify(lead));
      // Replace URL without the PII params (no extra history entry)
      const clean = window.location.pathname;
      window.history.replaceState(null, "", clean);
    }

    // Source 2: sessionStorage (main-site quiz OR just-migrated URL params)
    const raw = sessionStorage.getItem("cpc_lead");
    if (raw) {
      const lead = JSON.parse(raw) as { name?: string; email?: string };
      if (lead.name) {
        initialValues.firstName = lead.name.split(" ")[0] ?? "";
        initialValues.lastName  = lead.name.split(" ").slice(1).join(" ") ?? "";
      }
      if (lead.email) initialValues.emailAddress = lead.email;
      sessionStorage.removeItem("cpc_lead"); // consume once
    }
  } catch { /* sessionStorage / history API unavailable — form starts empty */ }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <ClerkLoading>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          <span className="text-sm font-medium text-zinc-400">Loading...</span>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        initialValues={initialValues}
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "rounded-2xl shadow-xl border border-zinc-100 bg-white",
            headerTitle: "text-2xl font-semibold text-zinc-900",
            headerSubtitle: "text-sm text-zinc-500",
            formButtonPrimary:
              "bg-zinc-900 hover:bg-zinc-800 text-white rounded-full h-11 font-medium transition-colors",
            formFieldInput:
              "rounded-lg border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500",
            footerActionLink: "text-emerald-600 hover:text-emerald-500 font-medium",
            formFieldLabel: "text-sm font-medium text-zinc-700",
          },
          variables: {
            colorPrimary: "#10b981",
            colorTextOnPrimaryBackground: "#ffffff",
            borderRadius: "0.5rem",
            fontFamily: "inherit",
          },
        }}
      />
      </ClerkLoaded>
    </div>
  );
}
