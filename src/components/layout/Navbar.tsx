import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Shield, Menu, X } from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 z-50 w-full border-b border-zinc-200/50 bg-white/80 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src="/logo-icon.svg" alt="Clean Path Credit" className="h-9 w-9 object-contain" />
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight text-zinc-900 leading-tight">Clean Path Credit</span>
            <span className="text-[9px] font-medium text-zinc-400 tracking-widest uppercase leading-tight">Powered by AI</span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">Home</Link>
          <Link to="/how-it-works" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">How It Works</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 md:block">Log in</Link>
          <Link to="/register" className="hidden md:block">
            <Button variant="primary" className="h-9 px-4 text-sm">Create Free Account</Button>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-zinc-100 bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/how-it-works"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                How It Works
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="mt-2"
              >
                <Button variant="primary" className="w-full h-11 text-sm">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
