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
    document.title = "Clean Path Credit";
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
        <ValueProp />
        <Details />
        <Proof />
        <CTA />
        <QuizFunnel />
      </main>

      <Footer />
    </div>
  );
}
