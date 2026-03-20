import React from "react";
import { motion } from "motion/react";
import { HoverCard } from "@/components/ui/HoverCard";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export function ValueProp() {
  const features = [
    {
      icon: Zap,
      title: "AI-Driven Disputes",
      description: "Our algorithms analyze your credit report to identify errors and generate highly effective dispute letters instantly.",
    },
    {
      icon: ShieldCheck,
      title: "Proven Methods",
      description: "We use strategies backed by the Fair Credit Reporting Act (FCRA) to ensure maximum compliance and success rates.",
    },
    {
      icon: Activity,
      title: "Real-Time Tracking",
      description: "Monitor your progress with our developer-grade dashboard. See updates as soon as they happen.",
    },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            The modern way to repair credit.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Stop relying on slow, manual processes. Our AI systems automate the heavy lifting, giving you faster results and complete transparency.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
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
