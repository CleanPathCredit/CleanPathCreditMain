import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="relative overflow-hidden py-32 px-6 bg-zinc-900 text-white">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]"
        />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-6 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Ready to rebuild your credit?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 md:text-xl">
            Join thousands of users who have successfully repaired their credit using our AI-driven platform. Start your free analysis today.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#quiz-funnel" onClick={(e) => {
              e.preventDefault();
              document.getElementById('quiz-funnel')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <Button variant="primary" className="group h-14 px-10 text-lg bg-white text-zinc-900 hover:bg-zinc-100">
                Get Started Now
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </a>
          </div>
          
          <p className="mt-6 text-sm text-zinc-500">
            No credit card required for initial analysis.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
