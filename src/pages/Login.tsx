import React from "react";
import { useLocation } from "react-router-dom";
import { SignIn, ClerkLoading, ClerkLoaded } from "@clerk/clerk-react";

export function Login() {
  // Honor the destination ProtectedRoute was trying to reach before bouncing
  // the unauthenticated user here. Without this, an admin who opens /admin
  // while logged out gets sent to /dashboard after login and has to manually
  // re-navigate to /admin — annoying and breaks deep-links (e.g. shared
  // admin URLs in emails / Slack).
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  // Only accept same-origin paths to prevent open-redirect via crafted state.
  const redirectUrl = typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <ClerkLoading>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          <span className="text-sm font-medium text-zinc-400">Loading...</span>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn
          routing="hash"
          signUpUrl="/register"
          forceRedirectUrl={redirectUrl}
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
              identityPreviewText: "text-zinc-700",
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
