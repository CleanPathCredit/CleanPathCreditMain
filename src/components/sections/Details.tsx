import React from "react";
import { motion, useInView } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useRef } from "react";

/** Animated counter — counts from 0 to `target` when in view */
function Counter({ target, suffix = "", className }: { target: number; suffix?: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return <span ref={ref} className={className}>{count}{suffix}</span>;
}

/** Bureau brand colors (for indicator dots) */
const BUREAUS = [
  { name: "Equifax",    color: "#d9534f", delay: 0   },
  { name: "TransUnion", color: "#00a0df", delay: 0.6 },
  { name: "Experian",   color: "#1d4f91", delay: 1.2 },
];

export function Details() {
  const terminalRef = useRef(null);
  const terminalInView = useInView(terminalRef, { once: true, margin: "-100px" });

  const steps = [
    {
      title: "1. Connect your credit profile",
      description: "Securely link your 3-bureau report so we can identify what's impacting your score — inaccurate, outdated, or unverifiable items.",
    },
    {
      title: "2. Verify your identity securely",
      description: "Upload your ID so your case is filed properly and your information stays protected. Bank-level encryption at every step.",
    },
    {
      title: "3. Review, notarize & submit",
      description: "Schedule a brief video verification with our online notary. Once complete, we prepare and submit your case across all three bureaus.",
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
              Your path to a higher score
            </h2>
            <p className="mb-12 text-lg text-zinc-600">
              A guided process that handles the complexity for you — so you always know what's happening and what's next.
            </p>

            {/* Vertical connector line reads the three steps as a single
                journey instead of three disconnected rows. Absolutely
                positioned under the checkmark column so hover states on
                the step cards remain unaffected. */}
            <div className="relative space-y-8">
              <div
                aria-hidden="true"
                className="absolute left-[30px] top-8 bottom-8 w-px bg-gradient-to-b from-emerald-200 via-emerald-200 to-transparent"
              />
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  className="group relative flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white hover:shadow-sm"
                >
                  <div className="flex-shrink-0 mt-1 relative z-10">
                    {/* Solid white background on the checkmark so the
                        connector line behind it is masked — otherwise the
                        line visibly crosses the icon. */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-zinc-900">{step.title}</h3>
                    <p className="text-zinc-600 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Friction-breaker — reassures the user this isn't an all-day
                ordeal before they commit to clicking Start. */}
            <p className="mt-10 text-sm text-zinc-500">
              Most clients complete this in under 10 minutes.
            </p>
          </motion.div>

          {/* Abstract UI Representation */}
          <motion.div
            ref={terminalRef}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative h-[650px] w-full rounded-3xl border border-zinc-200 bg-zinc-950 p-8 shadow-2xl overflow-hidden"
          >
            {/* Window Controls — colored */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>

            {/* Mock UI elements */}
            <div className="relative z-10 mt-8 flex flex-col gap-6 font-mono text-sm text-zinc-400">
              {/* Command line */}
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">~</span>
                <span className="text-zinc-300">cleanpath analyze --report=latest</span>
                {/* Blinking cursor */}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "steps(1)" }}
                  className="inline-block w-2 h-4 bg-emerald-400 ml-0.5"
                />
              </div>

              {/* Analysis results panel */}
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-zinc-300">Analysis Complete</span>
                  <span className="text-emerald-400">720ms</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Negative Items Found:</span>
                    <span className="text-rose-400 font-semibold">
                      {terminalInView ? <Counter target={3} /> : "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Removal Likelihood:</span>
                    <span className="text-emerald-400 font-semibold">
                      High ({terminalInView ? <Counter target={94} suffix="%" /> : "0%"})
                    </span>
                  </div>
                  <div className="h-px w-full bg-zinc-800 my-4" />

                  {/* Score projection */}
                  <div className="flex justify-between items-center">
                    <span>Score Projection:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400">
                        {terminalInView ? <Counter target={583} /> : "0"}
                      </span>
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-zinc-500"
                      >→</motion.span>
                      <span className="text-emerald-400 font-bold">
                        {terminalInView ? <Counter target={720} /> : "0"}
                      </span>
                    </div>
                  </div>

                  <div className="h-px w-full bg-zinc-800 my-4" />

                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">❯</span>
                    <span className="text-zinc-300">Preparing your custom correction strategy...</span>
                  </div>
                  <motion.div
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-1 bg-emerald-500 rounded-full mt-2"
                  />
                </div>
              </div>

              {/* Bureau cards — staggered reveal with brand colors + logos */}
              <div className="grid grid-cols-3 gap-3">
                {BUREAUS.map((bureau) => (
                  <motion.div
                    key={bureau.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={terminalInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.5 + bureau.delay, duration: 0.5, ease: "easeOut" }}
                    className="rounded-xl bg-zinc-900 border border-zinc-800 p-4"
                  >
                    {/* Bureau indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: bureau.color }} />
                      <span className="text-xs text-zinc-500">{bureau.name}</span>
                    </div>
                    {/* Bureau "logo" — stylized text in brand color */}
                    <div className="text-[10px] font-bold tracking-wider uppercase mb-2 opacity-60" style={{ color: bureau.color }}>
                      {bureau.name === "Equifax" && (
                        <svg viewBox="0 0 80 16" className="h-3 w-auto" fill={bureau.color}>
                          <text x="0" y="13" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif">equifax</text>
                        </svg>
                      )}
                      {bureau.name === "TransUnion" && (
                        <svg viewBox="0 0 100 16" className="h-3 w-auto" fill={bureau.color}>
                          <text x="0" y="13" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif">transunion</text>
                        </svg>
                      )}
                      {bureau.name === "Experian" && (
                        <svg viewBox="0 0 80 16" className="h-3 w-auto" fill={bureau.color}>
                          <text x="0" y="13" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif">experian</text>
                        </svg>
                      )}
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={terminalInView ? { opacity: 1 } : {}}
                      transition={{ delay: 2.0 + bureau.delay, duration: 0.3 }}
                      className="text-emerald-400 text-xs font-medium"
                    >
                      ✓ Submitted
                    </motion.div>
                  </motion.div>
                ))}
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
