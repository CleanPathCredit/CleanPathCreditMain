import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Shield, Mail } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowVerificationMessage(false);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        setShowVerificationMessage(true);
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      // Need to sign in briefly to get the user object for resend
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
    } catch (err: any) {
      // Silently handle - rate limits etc.
    }
    setTimeout(() => setResending(false), 3000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-zinc-100">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to your client portal
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {showVerificationMessage && (
          <div className="mb-6 rounded-lg bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">Email Not Verified</p>
                <p className="text-xs text-amber-700 mb-3">
                  Please check your inbox and click the verification link before signing in.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2 transition-colors"
                >
                  {resending ? "Verification email sent!" : "Resend verification email"}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full h-11 mt-2" disabled={loading}>
            {loading ? "Please wait..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-600">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="font-medium text-emerald-600 hover:text-emerald-500"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
