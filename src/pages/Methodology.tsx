import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { QuizFunnel } from "@/components/sections/QuizFunnel";
import { motion } from "motion/react";
import { CheckCircle2, Search, TrendingUp, XCircle, Check, Scale } from "lucide-react";
import React, { useEffect } from "react";

export function Methodology() {
  useEffect(() => {
    document.title = "How It Works | Clean Path Credit";
  }, []);

  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Navbar />
      
      <main className="relative pt-32">
        {/* 1. The Section Header */}
        <section className="px-6 text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mb-6 font-display text-5xl font-semibold tracking-tight text-zinc-900 md:text-7xl">
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                The System We Use to Turn Denials Into Approvals.
              </span>
            </h1>
            <p className="text-lg font-medium text-zinc-900 md:text-xl max-w-3xl mx-auto">
              This isn’t basic credit repair. This is a strategic, AI-assisted audit and removal system designed to eliminate inaccurate, unverifiable, and outdated items—fast.
            </p>
          </motion.div>
        </section>

        {/* 2. The Pattern Interrupt (Comparison Block) */}
        <section className="px-6 max-w-5xl mx-auto mb-24">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side */}
            <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8">
              <h3 className="mb-6 text-xl font-semibold text-zinc-900">
                The Industry Standard
              </h3>
              <ul className="space-y-4">
                {[
                  "Send the same generic requests to every bureau.",
                  "Hope something randomly gets removed.",
                  "Keep you paying month-to-month for years."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-700">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Right Side */}
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8 shadow-sm">
              <h3 className="mb-6 text-xl font-semibold text-zinc-900">
                The Clean Path Standard
              </h3>
              <ul className="space-y-4">
                {[
                  "Use AI to identify weak, inaccurate, or unverifiable accounts.",
                  "Apply legally backed challenge strategies using federal consumer protection law.",
                  "Target high-impact deletions first for fast score movement."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3. The "3-Step Framework" (The Core System) */}
        <section className="px-6 max-w-6xl mx-auto mb-24">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm"
            >
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-zinc-900">Step 1: Deep-Dive Profile Audit</h3>
              <p className="text-zinc-600 leading-relaxed">
                We scan your entire credit profile to identify inaccurate reporting, unverified medical collections, and high-impact negative items holding your score down.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm"
            >
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Scale className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-zinc-900">Step 2: Aggressive Legal Execution</h3>
              <p className="text-zinc-600 leading-relaxed">
                We don't just ask nicely. We deploy aggressive, legally backed challenge strategies using federal consumer protection law to force deletions.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm"
            >
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-zinc-900">Step 3: Score Optimization & Funding Prep</h3>
              <p className="text-zinc-600 leading-relaxed">
                We position your profile for approvals by optimizing your credit utilization, providing your Master Financial List, and prepping you for lenders.
              </p>
            </motion.div>
          </div>
        </section>

        {/* 4. The Payoff (Results Grid) */}
        <section className="bg-zinc-900 py-24 text-white">
          <div className="px-6 max-w-4xl mx-auto">
            <h2 className="font-display text-3xl font-semibold md:text-5xl mb-12 text-center">
              What This Means For You:
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Get \"Clear-to-Close\" on homes you were previously denied for.",
                "Refinance predatory, high-interest loans.",
                "Unlock 0% business funding and credit lines.",
                "Qualify for premium credit cards and lower insurance premiums."
              ].map((item, i) => (
                <div key={i} className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700 flex items-start gap-4">
                  <div className="mt-1 bg-emerald-500/20 p-1 rounded-full shrink-0">
                    <Check className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="font-medium text-lg leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. The Bottom Call-to-Action (CTA) */}
        <section className="px-6 py-24 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-4xl font-semibold text-zinc-900 md:text-5xl mb-6">
            See What’s Holding Your Score Back.
          </h2>
          <p className="text-xl text-zinc-600 mb-10">
            Get a personalized credit analysis to uncover exactly what’s keeping you from getting approved—and what it will take to fix it.
          </p>
          <a 
            href="#quiz-funnel"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800"
          >
            Start My Free Analysis
          </a>
        </section>

        {/* Lead Capture / Quiz Funnel */}
        <div id="quiz-funnel" className="border-t border-zinc-200 scroll-mt-24">
          <QuizFunnel />
        </div>
      </main>

      <Footer />
    </div>
  );
}
