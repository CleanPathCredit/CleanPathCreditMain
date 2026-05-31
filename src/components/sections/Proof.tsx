import React from "react";
import { motion } from "motion/react";
import { HoverCard } from "@/components/ui/HoverCard";
import {
  ShieldCheck,
  UserCheck,
  FileSearch,
  Home,
  Languages,
  MailCheck,
} from "lucide-react";

export function Proof() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: "CROA-compliant by design",
      body: "Every dispute letter, consumer agreement, and disclosure is reviewed for compliance with the Credit Repair Organizations Act. We don't charge advance fees, we provide the required Consumer Credit File Rights notice, and you have an unconditional 3-day right to cancel.",
    },
    {
      icon: UserCheck,
      title: "One specialist per file",
      body: "Your case isn't passed between agents. One specialist knows your dispute history, your goals, and your timeline — the same person you talk to from week one through graduation.",
    },
    {
      icon: FileSearch,
      title: "FCRA-grounded dispute strategy",
      body: "Disputes are drafted under FCRA §611 (consumer-direct to bureaus) and §623 (direct to furnishers) — used together when the situation calls for it. No generic templates, no automated bulk filings.",
    },
    {
      icon: Home,
      title: "Built for mortgage readiness",
      body: "Most clients work with us specifically to qualify for a home purchase. We prepare files for FICO 10T and VantageScore 4.0 — the new mortgage-eligible scoring models being phased in by Fannie Mae and Freddie Mac under FHFA approval.",
    },
    {
      icon: Languages,
      title: "Bilingual delivery",
      body: "Full program available in English and Spanish, including consumer disclosures, dispute correspondence, and weekly progress reports. Your specialist communicates with you in the language you prefer.",
    },
    {
      icon: MailCheck,
      title: "Weekly written updates",
      body: "Every week, you receive a written status report: copies of bureau and furnisher responses, items resolved, items still in dispute, and the next round's plan. No black-box workflows, no surprises.",
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Built around real client work.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            We're collecting verified client reviews on Google and publishing them as they come in. While that's underway, here's exactly what working with Clean Path looks like.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{
                  opacity: 1,
                  y: [0, -6, 0],
                  transition: {
                    opacity: { duration: 0.5, delay: index * 0.1 },
                    y: {
                      duration: 3.5 + (index % 3) * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.2,
                    },
                  },
                }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <HoverCard className="h-full p-8 flex flex-col">
                  <div className="mb-6">
                    <Icon className="h-8 w-8 text-emerald-600" strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-semibold text-zinc-900">
                    {pillar.title}
                  </h3>
                  <p className="text-zinc-600 leading-relaxed flex-1">{pillar.body}</p>
                </HoverCard>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <a
            href="https://share.google/MNihGGj41IpwKPv0b"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Read verified Google reviews →
          </a>
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-center text-xs text-zinc-500 italic">
          Clean Path Credit does not guarantee any specific score change, item removal, approval outcome, or interest-rate savings. The Credit Repair Organizations Act prohibits any such guarantee. Individual outcomes depend on the accuracy of reported information, creditor and bureau response times, your continued participation, and factors outside our control.
        </p>
      </div>
    </section>
  );
}
