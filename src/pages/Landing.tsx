import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ValueProp } from "@/components/sections/ValueProp";
import { Details } from "@/components/sections/Details";
import { Proof } from "@/components/sections/Proof";
import { CTA } from "@/components/sections/CTA";
import { QuizFunnel } from "@/components/sections/QuizFunnel";
import { GridPattern } from "@/components/ui/GridPattern";
import { ParticleDrift } from "@/components/ui/ParticleDrift";
import { AnimatedGradient } from "@/components/ui/AnimatedGradient";
import React, { useEffect } from "react";

export function Landing() {
  useEffect(() => {
    document.title = "Clean Path Credit | AI-Powered Credit Correction & Optimization";
  }, []);

  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Navbar />
      
      <main className="relative">
        {/* Background Effects for Hero */}
        <div className="absolute inset-x-0 top-0 h-screen overflow-hidden pointer-events-none">
          <GridPattern />
          <AnimatedGradient />
          <ParticleDrift />
        </div>

        <Hero />

        {/* Gradient fade: hero → value prop */}
        <div className="h-24 bg-gradient-to-b from-white via-zinc-50/50 to-transparent" />

        <ValueProp />
        <Details />

        {/* Gradient fade: details → proof */}
        <div className="h-16 bg-gradient-to-b from-zinc-50 to-white" />

        <Proof />
        <CTA />

        {/* Gradient fade: CTA → quiz */}
        <div className="h-16 bg-gradient-to-b from-zinc-900 to-zinc-50" />

        <QuizFunnel />
      </main>

      <Footer />
    </div>
  );
}
