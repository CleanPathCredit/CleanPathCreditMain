/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SignUp } from "@clerk/clerk-react";

export function Register() {
  // Pre-fill from quiz funnel lead stored in sessionStorage (no PII in URL)
  const initialValues: Record<string, string> = {};
  try {
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
  } catch { /* sessionStorage unavailable — form starts empty */ }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <SignUp
        routing="path"
        path="/register"
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
    </div>
  );
}
