import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-32 text-center">
      {/* Light Beam Effect */}
      <div className="absolute inset-x-0 top-0 h-[500px] overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-gradient-to-b from-blue-400/20 to-transparent blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mx-auto max-w-4xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800"
        >
          <Sparkles className="h-4 w-4" />
          <span>Introducing AI-Powered Credit Repair</span>
        </motion.div>

        <h1 className="mb-8 font-display text-5xl font-semibold tracking-tight text-zinc-900 md:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Turn Credit Denials Into <br className="hidden md:block" />
            Approvals
          </span>{" "}
          — Fast.
        </h1>

        <p className="mx-auto mb-6 max-w-3xl text-lg font-medium text-zinc-900 md:text-xl">
          We combine AI-powered audits with proven dispute strategies to remove the negative items keeping you from getting approved — so you can qualify for homes, funding, and better rates faster.
        </p>
        
        <div className="mb-10 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 border border-emerald-200">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span><strong>Ironclad Guarantee:</strong> Results guaranteed, or you don't pay.</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#quiz-funnel" onClick={(e) => {
            e.preventDefault();
            document.getElementById('quiz-funnel')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Button variant="primary" className="group h-12 px-8 text-base">
              Start Your Free Analysis
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </a>
          <a href="/how-it-works">
            <Button variant="outline" className="h-12 px-8 text-base">
              See How It Works
            </Button>
          </a>
        </div>

        {/* Trust Bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm font-medium text-zinc-500 opacity-80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <span>FCRA Compliant Specialists</span>
          </div>
          <div className="hidden h-1.5 w-1.5 rounded-full bg-zinc-300 sm:block" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Hundreds of Derogatory Marks Removed</span>
          </div>
        </div>
      </motion.div>

      {/* Abstract Parallax Shapes */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-emerald-100/20 blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, 30, 0],
          rotate: [0, -10, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -right-20 bottom-40 h-80 w-80 rounded-full bg-blue-100/20 blur-3xl"
      />
    </section>
  );
}
