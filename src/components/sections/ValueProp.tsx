import React from "react";
import { motion } from "motion/react";
import { HoverCard } from "@/components/ui/HoverCard";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export function ValueProp() {
  const features = [
    {
      icon: Zap,
      title: "Know what's holding your score back",
      description: "We scan your 3-bureau profile and pinpoint the exact items dragging your score down — inaccurate, outdated, or unverifiable.",
    },
    {
      icon: ShieldCheck,
      // Rewritten from "Specialists Fight to Remove Them" / "force bureaus to
      // delete" — the old phrasing implied guaranteed outcomes, which draws
      // CROA/FTC scrutiny. Bureaus comply with FCRA when disputes are valid;
      // they aren't "forced."
      title: "A plan built for your profile",
      description: "Our specialists don't reuse templates. Every challenge is structured around the specific items on your file and the FCRA standards they fail.",
    },
    {
      icon: Activity,
      // "Real time" refers to tracking (which is genuinely real-time), not
      // score movement (bureau reporting is monthly). The distinction
      // matters for compliance.
      title: "Watch every change in real time",
      description: "Track every correction, deletion, and score update in your private portal. No guessing — just progress you can see.",
    },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            The smarter way to correct credit.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Most credit companies run the same generic playbook on everyone. We start with your actual report, then build the plan around it.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{
                opacity: 1,
                y: [0, -8, 0],
                transition: {
                  opacity: { duration: 0.5, delay: index * 0.15 },
                  y: {
                    duration: 3 + index * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.15,
                  },
                },
              }}
              viewport={{ once: true, margin: "-80px" }}
            >
              <HoverCard className="group h-full">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition-colors duration-300 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                  <feature.icon className="h-6 w-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-zinc-900">{feature.title}</h3>
                <p className="text-zinc-600 leading-relaxed">{feature.description}</p>
              </HoverCard>
            </motion.div>
          ))}
        </div>

        {/* Micro-boost line — friction-breaker under the 3-card grid. */}
        <p className="mt-12 text-center text-sm sm:text-base text-zinc-500">
          Most clients start seeing movement within the first 30–45 days.
        </p>
      </div>
    </section>
  );
}
