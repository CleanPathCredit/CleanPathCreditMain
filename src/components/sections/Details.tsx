import React from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

export function Details() {
  const steps = [
    {
      title: "1. Connect your credit profile",
      description: "Securely link all 3 credit bureaus. Our AI instantly analyzes your report for negative items, inaccuracies, and quick wins.",
    },
    {
      title: "2. Upload your ID securely",
      description: "Upload your valid driver's license or passport and social security card. We use bank-level encryption to keep your data safe.",
    },
    {
      title: "3. Video verify & mail",
      description: "Schedule a quick video chat with our online notary. Once verified, we print, notarize, and mail your dispute letters via certified mail.",
    },
  ];

  return (
    <section className="relative overflow-hidden py-32 px-6 bg-zinc-50 border-y border-zinc-200">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              How our system works
            </h2>
            <p className="mb-12 text-lg text-zinc-600">
              We've engineered a platform that handles the complexities of credit repair so you don't have to. It's fast, transparent, and built for results.
            </p>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  className="group flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white hover:shadow-sm"
                >
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-medium text-zinc-900">{step.title}</h3>
                    <p className="text-zinc-600 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Abstract UI Representation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative h-[600px] w-full rounded-3xl border border-zinc-200 bg-zinc-950 p-8 shadow-2xl overflow-hidden"
          >
            {/* Window Controls */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
            </div>

            {/* Mock UI elements */}
            <div className="relative z-10 mt-8 flex flex-col gap-6 font-mono text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">~</span>
                <span className="text-zinc-300">cleanpath analyze --report=latest</span>
              </div>
              
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-zinc-300">Analysis Complete</span>
                  <span className="text-emerald-400">720ms</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Negative Items Found:</span>
                    <span className="text-rose-400">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dispute Probability:</span>
                    <span className="text-emerald-400">High (94%)</span>
                  </div>
                  <div className="h-px w-full bg-zinc-800 my-4" />
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">❯</span>
                    <span className="text-zinc-300">Generating dispute letters...</span>
                  </div>
                  <motion.div 
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-1 bg-emerald-500 rounded-full mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <div className="text-xs text-zinc-500 mb-1">Equifax</div>
                  <div className="text-emerald-400">Dispute Sent</div>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <div className="text-xs text-zinc-500 mb-1">TransUnion</div>
                  <div className="text-emerald-400">Dispute Sent</div>
                </div>
              </div>
            </div>
            
            {/* Scanning beam effect */}
            <motion.div
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent blur-xl pointer-events-none"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
