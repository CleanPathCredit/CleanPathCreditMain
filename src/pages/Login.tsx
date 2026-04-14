import React from "react";
import { SignIn, ClerkLoading, ClerkLoaded } from "@clerk/clerk-react";

export function Login() {
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
          forceRedirectUrl="/dashboard"
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
