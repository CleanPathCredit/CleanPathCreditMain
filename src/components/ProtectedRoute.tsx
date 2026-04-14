/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Role = "admin" | "client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require the user to hold this role. Omit to allow any authenticated user. */
  role?: Role;
  /** Require the user's email to be verified. Defaults to true. */
  requireVerified?: boolean;
}

/**
 * Route guard that enforces authentication and (optionally) role + email
 * verification. Authorization is derived exclusively from Firebase Auth state
 * and Firestore-backed `userData` — never from router state or URL params.
 */
export function ProtectedRoute({
  children,
  role,
  requireVerified = true,
}: ProtectedRouteProps) {
  const { user, userData, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireVerified && !user.emailVerified) {
    return <Navigate to="/login" replace state={{ unverified: true }} />;
  }

  if (role === "admin" && !(isAdmin && userData?.role === "admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
