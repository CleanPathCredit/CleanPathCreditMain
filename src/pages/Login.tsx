import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Shield } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
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
