import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Shield } from "lucide-react";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 z-50 w-full border-b border-zinc-200/50 bg-white/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight text-zinc-900">Clean Path Credit</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="/" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">Home</a>
          <a href="/how-it-works" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">How It Works</a>
        </div>

        <div className="flex items-center gap-4">
          <a href="/login" className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 md:block">Log in</a>
          <a href="#quiz-funnel" onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault();
              document.getElementById('quiz-funnel')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}>
            <Button variant="primary" className="h-9 px-4 text-xs">Find out if this will work for you</Button>
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
