import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Shield, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Register() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    fullName: searchParams.get("name") || "",
    phone: searchParams.get("phone") || "",
    email: searchParams.get("email") || "",
    password: "",
    confirmPassword: "",
    goal: "",
    challenge: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const password = formData.password;
  
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password);
  const reqNoTriple = password.length === 0 || !/(.)\1\1/.test(password);
  
  const nameParts = formData.fullName.toLowerCase().split(' ').filter(p => p.length > 2);
  const emailParts = formData.email.toLowerCase().split('@').flatMap(p => p.split('.')).filter(p => p.length > 2);
  const forbiddenWords = [...nameParts, ...emailParts, 'password', 'cleanpath', 'credit'];
  const reqNoPersonal = password.length === 0 || !forbiddenWords.some(word => password.toLowerCase().includes(word));
  
  const reqNoPattern = password.length === 0 || !/(1234|abcd|qwerty|asdf|zxcv|password)/i.test(password);

  const isPasswordValid = reqLength && reqUpper && reqLower && reqNumber && reqSpecial && reqNoTriple && reqNoPersonal && reqNoPattern;
  const passwordsMatch = password === formData.confirmPassword && password.length > 0;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const isAdmin = formData.email.toLowerCase() === "perfectcredit780@gmail.com";
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        goal: formData.goal,
        challenge: formData.challenge,
        role: isAdmin ? "admin" : "client",
        progress: 0,
        status: "pending_connection",
        createdAt: new Date().toISOString(),
        idUploaded: false,
        ssnUploaded: false,
        videoVerified: false,
      });
      
      if (isAdmin) {
        navigate("/admin", { state: { role: "admin" } });
      } else {
        navigate("/dashboard", { state: { role: "client" } });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const RequirementItem = ({ met, text }: { met: boolean, text: string }) => (
    <div className="flex items-start gap-1.5 text-xs">
      {met ? (
        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-red-600 flex-shrink-0" />
      )}
      <span className={met ? "text-zinc-600" : "text-zinc-600"}>{text}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl bg-white p-8 shadow-xl border border-zinc-100"
            >
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold text-zinc-900">Secure Account Creation</h2>
                <p className="mt-2 text-sm text-zinc-500">Bank-level security. 256-bit encryption.</p>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-zinc-700 mb-2 underline">Password Requirements</p>
                    <RequirementItem met={reqLength} text="MUST contain at least 8 characters (12+ recommended)" />
                    <RequirementItem met={reqUpper} text="MUST contain at least one uppercase letter" />
                    <RequirementItem met={reqLower} text="MUST contain at least one lowercase letter" />
                    <RequirementItem met={reqNumber} text="MUST contain at least one number" />
                    <RequirementItem met={reqSpecial} text="MUST contain at least one special character (!&quot;#$%&'()*+,-./:;<=>?@[\]^_`{|}~)" />
                    <RequirementItem met={reqNoTriple} text="MAY NOT contain more than two identical characters in a row" />
                    <RequirementItem met={reqNoPersonal} text="MAY NOT contain first name, last name, email address mailbox or domain, company name or commonly used passwords" />
                    <RequirementItem met={reqNoPattern} text="MAY NOT match commonly used password character patterns" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <div className="mt-3">
                    <RequirementItem met={passwordsMatch} text="Passwords match" />
                  </div>
                </div>

                {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

                <Button type="submit" className="w-full h-11 mt-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-full" disabled={loading}>
                  {loading ? "Processing..." : "Create Secure Account"}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-zinc-600">
                Already have an account? <a href="/login" className="font-medium text-emerald-600 hover:text-emerald-500">Sign in</a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
