/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Route guard that enforces Clerk authentication and optional role checks.
 * Authorization source: Clerk session (is the user signed in?) +
 * Supabase profile.role (are they an admin?).
 * Never trusts router state or URL params for role determination.
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require this role. Omit to allow any authenticated user. */
  role?: "admin" | "client";
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { clerkUser, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  // Not signed in → redirect to login, preserving intended destination
  if (!clerkUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admin-only route: user must have role=admin in the Supabase profiles table
  if (role === "admin" && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
