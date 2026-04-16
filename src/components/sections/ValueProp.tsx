import React from "react";
import { motion } from "motion/react";
import { HoverCard } from "@/components/ui/HoverCard";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export function ValueProp() {
  const features = [
    {
      icon: Zap,
      title: "AI Finds What You Can't",
      description: "Our system scans your full credit profile across all 3 bureaus to pinpoint inaccurate, unverifiable, and outdated items that are silently dragging your score down.",
    },
    {
      icon: ShieldCheck,
      title: "Specialists Fight to Remove Them",
      description: "Our certified specialists craft custom credit correction strategies — built specifically for your credit profile, never one-size-fits-all — and use federal law to force bureaus to delete negative items from your report.",
    },
    {
      icon: Activity,
      title: "You Watch the Score Go Up",
      description: "Track every correction, deletion, and score change in your private client portal. Full transparency, no guessing, and a specialist in your corner every step of the way.",
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
            Most credit companies use generic, mass-produced methods that fail most people. We use AI to find the exact items to target, then our specialists execute a structured strategy to remove them.
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
                <h3 className="mb-3 text-xl font-medium text-zinc-900">{feature.title}</h3>
                <p className="text-zinc-600 leading-relaxed">{feature.description}</p>
              </HoverCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
