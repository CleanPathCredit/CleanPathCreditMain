import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const CALENDLY_URL =
  'https://calendly.com/cleanpathcredit/free-15-min-credit-audit-strategy-call';

// Approval readiness model. Deliberately conservative — FCRA/CROA prohibits
// promising specific score outcomes, so this is framed as "readiness for your
// goal" (0-95), not "you will hit 750". Replace with real client outcome data
// once the dashboard pulls bureau pulls and tracks point deltas per package.
const SCORE_BASE: Record<string, number> = {
  'below-550': 25,
  '550-619':   42,
  '620-679':   60,
  '680+':      78,
};
const OBSTACLE_DELTA: Record<string, number> = {
  medical:      -6,
  late:         -12,
  bankruptcies: -18,
  balances:     -4,
  unsure:       -10,
};
const TIMELINE_DELTA: Record<string, number> = {
  'asap':         0,
  '3-6-months':   4,
  '6-12-months':  8,
};

function computeReadiness(
  creditScore: string,
  obstacles: string[],
  timeline: string,
): number {
  const base = SCORE_BASE[creditScore] ?? 40;

  // Stack obstacles but don't double-penalize — the worst item takes its full
  // weight, additional items add at half weight. Picking 3 pain points should
  // deepen the diagnosis, not unfairly tank the score.
  const deltas    = obstacles.map((o) => OBSTACLE_DELTA[o] ?? 0).sort((a, b) => a - b);
  const primary   = deltas[0] ?? 0;
  const additional = deltas.slice(1).reduce((sum, d) => sum + d * 0.5, 0);

  const tim = TIMELINE_DELTA[timeline] ?? 0;
  return Math.round(Math.max(10, Math.min(92, base + primary + additional + tim)));
}

interface ReadinessTier {
  key:     'green' | 'yellow' | 'amber' | 'red';
  label:   string;
  tagline: string;
  color:   string;
}

function readinessTier(score: number): ReadinessTier {
  if (score >= 70) return { key: 'green',  label: 'Strong foundation',  tagline: 'Targeted adjustments can unlock premium rates quickly.',             color: '#10b981' };
  if (score >= 50) return { key: 'yellow', label: 'Promising profile',  tagline: 'A focused repair plan can close the gap to your goal.',             color: '#eab308' };
  if (score >= 30) return { key: 'amber',  label: 'Priority items',     tagline: "You're one structured system away from the score you need.",        color: '#f59e0b' };
  return                   { key: 'red',   label: 'Fast action advised', tagline: 'The fastest path is a fully done-for-you removal system.',          color: '#ef4444' };
}

// 2–3 line diagnosis shown under the score ring. Intentionally honest about
// what the tier means for approvals without crossing into CROA-prohibited
// "we'll get you to X" territory.
function diagnosisFor(tierKey: ReadinessTier['key']): string {
  switch (tierKey) {
    case 'red':
      return "At this level, most lenders treat you as higher risk — typically denials, notably higher APRs, and limited program access. The good news: the items keeping you here are almost always correctable.";
    case 'amber':
      return "You're in the 'work to do' band. The items on your reports responsible for this are usually the most responsive to a structured, consistent dispute process.";
    case 'yellow':
      return "Promising profile. A focused pass on the 2–3 items pulling your score down hardest typically closes the gap to your goal in 3–6 months.";
    case 'green':
    default:
      return "Strong foundation. At this level, targeted optimization — utilization ratios, minor reporting inconsistencies — is often enough to unlock premium rates and tier-1 programs.";
  }
}

// Step 3 timeline question is rephrased per goal so it reads like a promise
// instead of a homework question. "Sell the vacation, not the flight."
function timelineQuestionFor(goal: string | null): string {
  switch (goal) {
    case 'home':     return 'When do you want to be holding the keys?';
    case 'car':      return 'When do you want to be driving off the lot?';
    case 'business': return 'When do you want your business funded?';
    case 'clean':    return 'When do you want to stop worrying about your credit?';
    default:         return 'When do you want to hit your goal?';
  }
}

// "Cost of inaction" section — goal-specific concrete dollar math. Numbers
// are conservative industry-standard defaults (Freddie Mac PMMS, Experian
// FICO-to-APR data, CFPB credit-based insurance studies). Swap for measured
// client outcomes once the dashboard is collecting them.
interface CostOfInaction {
  headline: string;
  items:    string[];
}
function costOfInactionFor(goal: string | null): CostOfInaction {
  switch (goal) {
    case 'home': return {
      headline: 'Every month you wait, the math gets worse:',
      items: [
        "Roughly 1.5% higher mortgage APR at your current profile. On a $300K home, that's about $275 more per month — around $99,000 over 30 years.",
        'Limited to FHA and subprime programs with stricter debt-to-income and down-payment rules.',
        'Bureau files age. Denied applications stay on record for two years. Rate windows open and close.',
      ],
    };
    case 'car': return {
      headline: 'Your current profile is quietly costing you every month:',
      items: [
        '3–6% higher auto APR than prime — typically $100–$300 more per month on a financed vehicle.',
        'Pushed toward buy-here-pay-here dealers with shorter terms and harder contracts.',
        'In the 42 states that credit-score drivers, insurance premiums run about 30% higher on average.',
      ],
    };
    case 'business': return {
      headline: "Here's what a thin personal file is blocking right now:",
      items: [
        'SBA 7(a) and 504 loans typically need 680+ personal credit — currently out of reach.',
        'Alternative lenders charge 15–25% APR when prime business credit sits around 8–11%.',
        'Business cards, vendor lines, and equipment financing pull personal credit. Without a clean file, most applications quietly decline.',
      ],
    };
    case 'clean':
    default: return {
      headline: 'The "bad credit tax" shows up in more places than most people realize:',
      items: [
        'Credit-based insurance premiums can run meaningfully higher than the prime-credit equivalent — CFPB analysis has documented gaps north of 70% in some markets.',
        'Security deposits on utilities, phones, and apartments that prime-credit neighbors simply skip.',
        'Higher APRs on every card and loan you already carry — compounding every month the profile goes unfixed.',
      ],
    };
  }
}

interface GoalInsight {
  headline: string;
  points:   string[];
}

// Goal → "what becomes possible" — adapted from the sibling form's value
// props (industry-plausible ranges; replace with measured outcomes later).
function goalInsight(goal: string | null): GoalInsight {
  switch (goal) {
    case 'home': return {
      headline: 'Your path to the mortgage rate you actually deserve',
      points: [
        'Drop your mortgage rate 1–2% — typically $40K–$100K saved over 30 years',
        'Meet 640+, 660+, 680+ lender cutoffs currently out of reach',
        'Access conventional loan programs with lower down-payment requirements',
      ],
    };
    case 'car': return {
      headline: 'Stop overpaying on auto interest',
      points: [
        'Typical APR reduction of 3–6% after targeted profile repair',
        'Move from subprime / buy-here-pay-here to prime lender terms',
        'Monthly savings of $100–$300 on a typical financed vehicle',
      ],
    };
    case 'business': return {
      headline: 'Unlock capital your profile currently blocks',
      points: [
        'SBA 7(a) / 504 loans — personal credit is the primary qualifier',
        'Business lines of credit — most require 650+ personal score',
        'Lower personal-guarantee exposure and collateral requirements',
      ],
    };
    case 'clean':
    default: return {
      headline: 'Stop paying the "bad credit tax"',
      points: [
        'Lower APR on every card and loan you already carry',
        'No more security deposits on utilities, apartments, or phones',
        'Reduced insurance premiums in states that score-rate drivers',
      ],
    };
  }
}

// Obstacle → "how we attack this" — plain-English, FCRA-grounded.
function obstacleInsight(obstacle: string | null): { headline: string; body: string } {
  switch (obstacle) {
    case 'medical': return {
      headline: 'Medical & utility collections',
      body:     'New FCRA rules removed paid medical collections and collections under $500 from reports. Many remaining medical items also fail strict reporting standards — which is exactly the gap we work in.',
    };
    case 'late': return {
      headline: 'Late payments & collections',
      body:     "Late marks are among the most challengeable items on a report — they frequently fail the FCRA's accuracy, completeness, or verifiability standards. That's the wedge we use to force removal.",
    };
    case 'bankruptcies': return {
      headline: 'Bankruptcies & public records',
      body:     'Account-level items tied to a discharged bankruptcy are routinely reported incorrectly — those are directly addressable. The public record itself has a separate, specific strategy.',
    };
    case 'balances': return {
      headline: 'High utilization',
      body:     'Utilization above 30% signals risk across all three bureaus. A one-cycle utilization reset paired with strategic balance distribution is often the single fastest score lever available.',
    };
    case 'unsure':
    default: return {
      headline: "What's actually on your report",
      body:     "Most people don't know exactly what's hurting their score — which is exactly what our free audit surfaces. You'll leave the call knowing every item and the plan for each one.",
    };
  }
}

// Typical post-repair point improvement windows. Conservative, legally-safe
// ranges — we never promise a specific number. Per-package numbers will be
// swapped for measured cohort data once the dashboard gathers it.
const IMPROVEMENT_RANGES = {
  diy:      { min: 20,  max: 60,  label: 'DIY Blueprint'      },
  standard: { min: 60,  max: 140, label: 'Accelerated Audit'  },
  premium:  { min: 100, max: 200, label: 'Executive Funding'  },
};

// Cloudflare Turnstile runtime shim — script is loaded in index.html.
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: string | HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const STEP_1_OPTIONS = [
  { id: 'home', label: 'Buy a Dream Home', fact: 'We specialize in removing derogatory marks to drop mortgage rates and get you clear to close.' },
  { id: 'car', label: 'Finance a Vehicle', fact: 'Stop overpaying! We target the dings causing 18%+ auto interest rates.' },
  { id: 'business', label: 'Secure Business Funding', fact: 'Leverage OPM. We sweep personal profiles so you can secure real business capital.' },
  { id: 'clean', label: 'Clean Profile / Stop Calls', fact: 'Take control of your life. 89% of DIYers fail—we do the heavy lifting for you.' },
];

const STEP_2_OPTIONS = [
  { id: 'medical', label: 'Medical or Utility Collections', fact: "Fact: Paying a collection doesn't remove it. We use federal laws to legally challenge and delete them." },
  { id: 'late', label: 'Late Payments/ Collections', fact: 'One late payment/ collection can cost you 50+ points. We aggressively target these for removal.' },
  { id: 'bankruptcies', label: 'Bankruptcies / Liens', fact: "Even public records can be challenged when they're incomplete, unverifiable, or misreported — which they often are. The account-level items tied to the bankruptcy often come off too." },
  { id: 'balances', label: 'High Credit Card Balances', fact: "We will build you a custom 'Master Financial List' to optimize your credit utilization." },
  { id: 'unsure', label: "I'm Not Sure", fact: "That's exactly what our free deep-dive audit is for. We'll find the hidden errors." },
];

export function QuizFunnel() {
  const [step, setStep] = useState<Step>(1);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  // Step 2 is multi-select — stacking pain points sharpens the results page
  // and gives us a clearer picture of the lead for the call.
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [showFact, setShowFact] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFinalAnalyzing, setIsFinalAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const [formData, setFormData] = useState({
    creditScore: '',
    income: '',
    idealScore: '',
    timeline: '',
    fullName: '',
    email: '',
    phone: '',
    consent: false,
  });

  // C-4 anti-bot state. Honeypot is an uncontrolled ref so legitimate users
  // never see re-renders; Turnstile token is state because submit must react
  // to it (button enable + race-condition guard).
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Results + booking flow. Readiness numbers are derived from the user's
  // quiz answers the moment they finish step 4, frozen into state so the
  // results page doesn't flicker if formData changes later.
  const sectionRef        = useRef<HTMLElement>(null);
  const calendlyWrapRef   = useRef<HTMLDivElement>(null);
  const [readiness, setReadiness] = useState<number>(0);
  const [hasBooked, setHasBooked] = useState(false);

  // Hide the global ElevenLabs chatbot while any part of the quiz section is
  // on-screen — the widget otherwise overlaps "Continue" on mobile and pulls
  // attention away from the funnel's primary CTA.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          document.body.classList.toggle('cpc-quiz-active', entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.body.classList.remove('cpc-quiz-active');
    };
  }, []);

  // Load Calendly's inline-widget script once the results step is reached.
  // Deferred to step 5 so the script isn't pulled for visitors who bounce
  // before completing the quiz. Calendly idempotently skips re-init if the
  // script is already on the page.
  useEffect(() => {
    if (step !== 5) return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]',
    );
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.body.appendChild(s);
  }, [step]);

  // Calendly dispatches window.postMessage events for every lifecycle step.
  // We only care about `calendly.event_scheduled` — fires once the attendee
  // clicks Confirm. At that point we swap to step 6 which surfaces the
  // account-creation CTA. The origin check guards against forged events.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://calendly.com') return;
      const data = e.data;
      if (data && typeof data === 'object' && data.event === 'calendly.event_scheduled') {
        setHasBooked(true);
        setStep(6);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Render the Turnstile widget once the lead-capture step is visible and the
  // Cloudflare script has loaded. Poll briefly because the script is `async`
  // and may resolve after React mounts the container.
  useEffect(() => {
    if (step !== 4 || isFinalAnalyzing) return;
    if (!TURNSTILE_SITE_KEY) return;
    if (turnstileWidgetIdRef.current) return;

    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      const ts = window.turnstile;
      const container = turnstileContainerRef.current;
      if (!ts || !container) return false;
      turnstileWidgetIdRef.current = ts.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
      });
      return true;
    };

    if (tryRender()) return;
    const interval = window.setInterval(() => {
      if (tryRender()) window.clearInterval(interval);
    }, 150);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [step, isFinalAnalyzing]);

  // Step 1 — single-select. Tap reveals the goal-specific fact + Continue.
  const handleGoalSelect = (optionId: string) => {
    setSelectedGoal(optionId);
    setShowFact(true);
  };

  // Step 2 — multi-select toggle. Selected cards expand inline to show their
  // fact; users can stack as many as apply. Continue lives at the bottom.
  const handleObstacleToggle = (optionId: string) => {
    setSelectedObstacles((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  };

  const handleNextStep = () => {
    setShowFact(false);
    setStep((prev) => (prev + 1) as Step);
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setStep(4);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // C-4: when Turnstile is configured, block submit until the challenge
    // resolves. Without this guard, fast clickers race past the async widget,
    // the server rejects the request, and the UI still advances — silently
    // dropping the lead (Seer-flagged on the sibling static form).
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError('Please wait for the security check to finish, then try again.');
      return;
    }

    setSubmitError(null);
    setIsFinalAnalyzing(true);
    setAnalysisProgress(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) return 95;
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    // Send lead data to the CRM via a same-origin backend proxy. Never embed
    // raw webhook URLs (or secrets) in client code — the proxy validates the
    // Turnstile token and honeypot server-side before forwarding.
    const leadEndpoint = import.meta.env.VITE_LEAD_WEBHOOK_URL || '/api/lead';
    const minDisplay = new Promise<void>(resolve => setTimeout(resolve, 2000));

    let ok = false;
    try {
      const response = await fetch(leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          goal: selectedGoal,
          obstacles: selectedObstacles,
          // Comma-joined string mirrors the array for CRM systems (GHL custom
          // fields are typically strings, not arrays — keep both so whichever
          // side of the integration consumes the payload, it works).
          obstacle: selectedObstacles.join(', '),
          // C-4 bot protection — server verifies both.
          website: honeypotRef.current?.value || '',
          cf_turnstile_token: turnstileToken,
        }),
      });
      ok = response.ok;
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Error sending lead data:', error);
      }
      ok = false;
    }

    await minDisplay;
    clearInterval(progressInterval);

    if (!ok) {
      // Block redirect — keep the user on step 4 so they can retry. Remove the
      // existing widget so the effect re-renders a fresh one into the form
      // container that is about to remount (isFinalAnalyzing → false).
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
      turnstileWidgetIdRef.current = null;
      setTurnstileToken(null);
      setAnalysisProgress(0);
      setIsFinalAnalyzing(false);
      setSubmitError("We couldn't submit your analysis. Please check your connection and try again.");
      return;
    }

    // Freeze the readiness score for the results page now — computing it
    // inline during render would recompute on every keystroke + re-render.
    setReadiness(computeReadiness(formData.creditScore, selectedObstacles, formData.timeline));

    setAnalysisProgress(100);
    setTimeout(() => {
      setIsFinalAnalyzing(false);
      setStep(5);
    }, 800);
  };

  return (
    <section ref={sectionRef} className="py-24 bg-zinc-50">
      <div className="mx-auto max-w-3xl px-6">
        {/* Who This Is For / Not For — pre-qualification filter */}
        <div className="mb-16 grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
            <h3 className="text-base font-semibold text-zinc-900 mb-4">This is for you if you're:</h3>
            <ul className="space-y-3 text-sm text-zinc-700">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>Serious about improving your credit</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>Ready to follow a structured system</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>Looking for real results — not shortcuts</span></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
            <h3 className="text-base font-semibold text-zinc-900 mb-4">This is not for you if you're:</h3>
            <ul className="space-y-3 text-sm text-zinc-700">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 text-red-400 font-bold">&#x2715;</span><span>Looking for instant overnight fixes</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 text-red-400 font-bold">&#x2715;</span><span>Not willing to follow guidance</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 text-red-400 font-bold">&#x2715;</span><span>Just curious with no intention to act</span></li>
            </ul>
          </div>
        </div>

        <div id="quiz-funnel" className="mb-12 text-center scroll-mt-24">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            See what's possible for your credit profile
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Take our free 60-second analysis to see exactly how we can help you reach your goals.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200" role="form" aria-label="Credit analysis quiz">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 h-1.5 w-full bg-zinc-100">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: '20%' }}
              animate={{ width: `${Math.min((step / 5) * 100, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          <div className="p-5 sm:p-8 md:p-12 min-h-[320px] sm:min-h-[400px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-2">What are you trying to unlock?</h3>
                  <p className="text-sm sm:text-base text-zinc-500 mb-6 sm:mb-8">Tell us where you're going. We'll build the plan backwards from there.</p>

                  <div className="grid gap-4 flex-grow">
                    {STEP_1_OPTIONS.map((option) => {
                      const isSelected = selectedGoal === option.id;
                      return (
                        <motion.div
                          key={option.id}
                          onClick={() => !showFact && handleGoalSelect(option.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!showFact) handleGoalSelect(option.id);
                            }
                          }}
                          className={`relative w-full rounded-xl border-2 p-4 sm:p-6 text-left transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-zinc-200 bg-white hover:border-emerald-200 hover:bg-zinc-50'
                          } ${showFact && !isSelected ? 'opacity-50 pointer-events-none' : ''}`}
                          animate={isSelected && showFact ? { scale: 1.02 } : { scale: 1 }}
                        >
                          <AnimatePresence mode="wait">
                            {!showFact || !isSelected ? (
                              <motion.span
                                key="label"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="block text-base sm:text-lg font-medium text-zinc-900"
                              >
                                {option.label}
                              </motion.span>
                            ) : (
                              <motion.div
                                key="fact"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-4"
                              >
                                <span className="block text-lg font-medium text-emerald-800">
                                  {option.fact}
                                </span>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextStep();
                                  }} 
                                  className="w-fit"
                                >
                                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-2">What's in the way?</h3>
                  <p className="text-sm sm:text-base text-zinc-500 mb-6 sm:mb-8">
                    Select all that apply — stacking pain points sharpens the plan we'll build for you.
                  </p>

                  <div className="grid gap-3 flex-grow">
                    {STEP_2_OPTIONS.map((option) => {
                      const isSelected = selectedObstacles.includes(option.id);
                      return (
                        <motion.div
                          key={option.id}
                          onClick={() => handleObstacleToggle(option.id)}
                          role="button"
                          aria-pressed={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleObstacleToggle(option.id);
                            }
                          }}
                          className={`relative w-full rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-zinc-200 bg-white hover:border-emerald-200 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300 bg-white'
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="flex-grow">
                              <span className="block text-base sm:text-lg font-medium text-zinc-900">
                                {option.label}
                              </span>
                              <AnimatePresence initial={false}>
                                {isSelected && (
                                  <motion.p
                                    key="fact"
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="text-sm text-emerald-800 overflow-hidden"
                                  >
                                    {option.fact}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={handleNextStep}
                      className="w-full h-12 text-base"
                      disabled={selectedObstacles.length === 0}
                    >
                      {selectedObstacles.length === 0
                        ? 'Select at least one to continue'
                        : `Continue (${selectedObstacles.length} selected)`}
                      {selectedObstacles.length > 0 && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6 sm:mb-8">Let's get a baseline of where you are at.</h3>
                  
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center flex-grow py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                      <p className="text-lg font-medium text-zinc-900">Analyzing Profile...</p>
                      <p className="text-zinc-500">Matching with the optimal removal strategy</p>
                    </div>
                  ) : (
                    <div className="space-y-6 flex-grow">
                      <div>
                        <label htmlFor="quiz-credit-score" className="block text-sm font-medium text-zinc-700 mb-2">What is your estimated credit score?</label>
                        <select
                          id="quiz-credit-score"
                          className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                          value={formData.creditScore}
                          onChange={(e) => setFormData({...formData, creditScore: e.target.value})}
                        >
                          <option value="">Select an option</option>
                          <option value="below-550">Below 550</option>
                          <option value="550-619">550-619</option>
                          <option value="620-679">620-679</option>
                          <option value="680+">680+</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="quiz-income" className="block text-sm font-medium text-zinc-700 mb-2">What is your approximate annual income?</label>
                        <select
                          id="quiz-income"
                          className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                          value={formData.income}
                          onChange={(e) => setFormData({...formData, income: e.target.value})}
                        >
                          <option value="">Select an option</option>
                          <option value="under-30k">Under $30k</option>
                          <option value="30k-50k">$30k-$50k</option>
                          <option value="50k-80k">$50k-$80k</option>
                          <option value="80k+">$80k+</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="quiz-ideal-score" className="block text-sm font-medium text-zinc-700 mb-2">What is your ideal credit score?</label>
                        <select
                          id="quiz-ideal-score"
                          className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                          value={formData.idealScore}
                          onChange={(e) => setFormData({...formData, idealScore: e.target.value})}
                        >
                          <option value="">Select an option</option>
                          <option value="600s">600s</option>
                          <option value="700s">700s</option>
                          <option value="800">Perfect 800</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="quiz-timeline" className="block text-sm font-medium text-zinc-700 mb-2">{timelineQuestionFor(selectedGoal)}</label>
                        <select
                          id="quiz-timeline"
                          className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                          value={formData.timeline}
                          onChange={(e) => setFormData({...formData, timeline: e.target.value})}
                        >
                          <option value="">Select an option</option>
                          <option value="asap">ASAP</option>
                          <option value="3-6-months">3-6 Months</option>
                          <option value="6-12-months">6-12 Months</option>
                        </select>
                      </div>

                      <Button 
                        onClick={handleAnalyze} 
                        className="w-full mt-8 h-14 text-lg"
                        disabled={!formData.creditScore || !formData.income || !formData.idealScore || !formData.timeline}
                      >
                        Next Step <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  {isFinalAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-6" />
                      <h3 className="text-2xl font-semibold text-zinc-900 mb-2">
                        {analysisProgress < 100 ? "Analyzing answers..." : "Analysis complete."}
                      </h3>
                      <div className="w-full max-w-xs bg-zinc-200 rounded-full h-2.5 mt-4 overflow-hidden">
                        <motion.div 
                          className="bg-emerald-600 h-2.5 rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${analysisProgress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-zinc-500 mt-3 font-medium">{Math.min(analysisProgress, 100)}%</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                          <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-semibold text-zinc-900">You are a great fit for our programs! 🙌</h3>
                        <p className="text-zinc-500 mt-2">Enter your details below to see your customized results.</p>
                      </div>
                      
                      <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Full Name</label>
                          <input 
                            type="text" 
                            required
                            className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Email Address *</label>
                          <input 
                            type="email" 
                            required
                            className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">Phone Number *</label>
                          <input 
                            type="tel" 
                            required
                            className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>

                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="consent"
                            required
                            className="mt-1 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            checked={formData.consent}
                            onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                          />
                          <label htmlFor="consent" className="text-sm text-zinc-600">
                            * I agree to receive text messages and emails regarding my credit analysis and scheduling.
                          </label>
                        </div>

                        {/* Honeypot — hidden from real users; bots that scrape and fill every
                            input will populate it and be rejected by /api/lead. */}
                        <div
                          aria-hidden="true"
                          style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 0, height: 0, overflow: 'hidden' }}
                        >
                          <label htmlFor="cpc-website">Website (leave empty)</label>
                          <input
                            ref={honeypotRef}
                            id="cpc-website"
                            name="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            defaultValue=""
                          />
                        </div>

                        {TURNSTILE_SITE_KEY && (
                          <div ref={turnstileContainerRef} className="flex justify-center" />
                        )}

                        {submitError && (
                          <p role="alert" aria-live="assertive" className="text-sm text-red-600">
                            {submitError}
                          </p>
                        )}

                        <Button
                          type="submit"
                          className="w-full h-14 text-lg mt-4"
                          disabled={Boolean(TURNSTILE_SITE_KEY) && !turnstileToken}
                        >
                          See My Results
                        </Button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}

              {step === 5 && (() => {
                const tier       = readinessTier(readiness);
                const goalData   = goalInsight(selectedGoal);
                const cost       = costOfInactionFor(selectedGoal);
                const firstName  = formData.fullName.trim().split(/\s+/)[0];
                const greeting   = firstName
                  ? `${firstName}, your credit is fixable — here's exactly what's in the way.`
                  : "Your credit is fixable — here's exactly what's in the way.";
                // One priority-item card per selected obstacle (falls back to
                // the "unsure" insight if somehow empty — shouldn't happen
                // because step 2's Continue is disabled at zero selections).
                const priorityItems = selectedObstacles.length > 0
                  ? selectedObstacles.map((o) => ({ id: o, ...obstacleInsight(o) }))
                  : [{ id: 'unsure', ...obstacleInsight('unsure') }];
                return (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col h-full"
                  >
                    {/* 1. HOOK — personalized, fixable, honest */}
                    <div className="text-center mb-8">
                      <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">
                        Your personalized credit analysis
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-3 leading-tight">
                        {greeting}
                      </h3>
                      <p className="text-zinc-600 max-w-lg mx-auto text-sm sm:text-base">
                        Right now your profile is quietly costing you — higher rates, fewer approvals, extra deposits. The good news: most of it is correctable.
                      </p>
                    </div>

                    {/* 2. SCORE RING + DIAGNOSIS (what the number means) */}
                    <div className="flex flex-col items-center mb-8">
                      <div className="relative w-40 h-40">
                        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="#e4e4e7" strokeWidth="10" />
                          <motion.circle
                            cx="60" cy="60" r="52" fill="none"
                            stroke={tier.color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 52}
                            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - readiness / 100) }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-4xl font-bold text-zinc-900">{readiness}</div>
                          <div className="text-[10px] tracking-[0.12em] uppercase text-zinc-500">of 100</div>
                        </div>
                      </div>
                      <div className="mt-4 text-center max-w-md">
                        <div className="text-sm font-semibold" style={{ color: tier.color }}>{tier.label}</div>
                        <div className="text-xs text-zinc-500 mt-1 mb-3">Approval readiness for your goal</div>
                        <p className="text-sm text-zinc-700 leading-relaxed">{diagnosisFor(tier.key)}</p>
                      </div>
                    </div>

                    {/* 3. PRIORITY ITEMS — stacked, one per obstacle */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 mb-5">
                      <div className="text-xs font-semibold tracking-[0.14em] uppercase text-amber-600 mb-3">
                        What we'll go after first
                      </div>
                      <div className="space-y-4">
                        {priorityItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className={
                              priorityItems.length > 1 && idx !== priorityItems.length - 1
                                ? 'pb-4 border-b border-zinc-100'
                                : ''
                            }
                          >
                            <h4 className="text-base sm:text-lg font-semibold text-zinc-900 mb-1">{item.headline}</h4>
                            <p className="text-sm text-zinc-700">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. WHAT BECOMES POSSIBLE — the vacation */}
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:p-6 mb-5">
                      <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-700 mb-2">
                        What becomes possible once this is fixed
                      </div>
                      <h4 className="text-base sm:text-lg font-semibold text-zinc-900 mb-3">{goalData.headline}</h4>
                      <ul className="space-y-2">
                        {goalData.points.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 5. COST OF INACTION — concrete, goal-specific */}
                    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 sm:p-6 mb-5">
                      <div className="text-xs font-semibold tracking-[0.14em] uppercase text-red-600 mb-2">
                        The cost of leaving this alone
                      </div>
                      <h4 className="text-base sm:text-lg font-semibold text-zinc-900 mb-3">{cost.headline}</h4>
                      <ul className="space-y-2">
                        {cost.items.map((c) => (
                          <li key={c} className="flex items-start gap-2 text-sm text-zinc-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 6. PROOF — improvement ranges with credibility anchor */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 mb-6">
                      <div className="text-xs font-semibold tracking-[0.14em] uppercase text-zinc-500 mb-1">
                        Based on similar profiles we've worked with
                      </div>
                      <h4 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4">
                        Typical point improvement after repair
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(['diy', 'standard', 'premium'] as const).map((plan) => {
                          const r = IMPROVEMENT_RANGES[plan];
                          return (
                            <div key={plan} className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-4 text-center">
                              <div className="text-[10px] tracking-[0.08em] uppercase text-zinc-500 mb-1">{r.label}</div>
                              <div className="text-xl sm:text-2xl font-bold text-emerald-700">+{r.min}–{r.max}</div>
                              <div className="text-[10px] text-zinc-500 mt-1">typical range</div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-4 leading-snug">
                        Typical outcomes — not guarantees. No legitimate credit service can promise a specific number. What we can promise is a structured, personalized plan built for your file and your goal.
                      </p>
                    </div>

                    {/* 7. TRANSITION */}
                    <p className="text-center text-base sm:text-lg font-medium text-zinc-800 mb-6 max-w-md mx-auto">
                      You're one structured system away from closing the gap.
                    </p>

                    {/* 8. CALENDLY — primary CTA, de-duped header, with fallback */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
                      <div className="text-center mb-5">
                        <div className="text-xs font-semibold tracking-[0.14em] uppercase text-blue-600 mb-2">
                          Your fastest path
                        </div>
                        <h4 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-4">
                          Your fastest path to fixing this starts here
                        </h4>
                        <div className="text-sm text-zinc-700 max-w-md mx-auto text-left space-y-2">
                          <p className="font-medium text-center mb-3">On the call we'll:</p>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>Pull the hood on your 3-bureau report together</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>Give you a line-by-line diagnosis of what's hurting your score</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>Hand you the exact removal plan — whether you hire us or not</span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 italic mt-4">No pressure. No obligation. Just clarity.</p>
                      </div>
                      <div
                        ref={calendlyWrapRef}
                        className="calendly-inline-widget"
                        data-url={`${CALENDLY_URL}?hide_event_type_details=1&hide_landing_page_details=1&hide_gdpr_banner=1&name=${encodeURIComponent(formData.fullName)}&email=${encodeURIComponent(formData.email)}`}
                        style={{ minWidth: '320px', height: '680px' }}
                      />
                      {/* Fallbacks — reCAPTCHA can fail inside the embed for
                          users with strict ad-blockers; new-tab link always
                          works. Account-first link preserves the lead if
                          they're not ready to book. */}
                      <div className="flex flex-col items-center gap-2 mt-4 text-center">
                        <a
                          href={`${CALENDLY_URL}?name=${encodeURIComponent(formData.fullName)}&email=${encodeURIComponent(formData.email)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
                        >
                          Trouble booking? Open Calendly in a new tab ↗
                        </a>
                        <Link
                          to="/register"
                          onClick={() => {
                            try {
                              sessionStorage.setItem('cpc_lead', JSON.stringify({
                                name:  formData.fullName,
                                email: formData.email,
                              }));
                            } catch { /* sessionStorage unavailable — Register handles the empty case */ }
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
                        >
                          Prefer to create your account first? You can book from your dashboard.
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {step === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full items-center text-center"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-3">Your call is booked.</h3>
                  <p className="text-base text-zinc-600 mb-2 max-w-lg">
                    Check your inbox — Calendly just sent a confirmation with the date, time, and calendar invite.
                  </p>
                  <p className="text-sm text-zinc-500 mb-8 max-w-lg">
                    Want to hit the ground running? Set up your free client portal now so we can review your 3-bureau report <em>before</em> the call — you'll get twice as much out of it.
                  </p>

                  <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-left">
                    <h4 className="text-lg font-semibold text-zinc-900 mb-3">Your free client portal includes:</h4>
                    <ul className="space-y-2 mb-6 text-sm text-zinc-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>Upload your 3-bureau report so we can pre-audit it</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>Track progress on every disputed item, per bureau</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>Access the Master Financial List — credit-builder tools we actually use</span>
                      </li>
                    </ul>
                    <Link
                      to="/register"
                      onClick={() => {
                        // Stash lead details so /register can pre-fill Clerk's
                        // form without putting PII in the URL (logs / history).
                        try {
                          sessionStorage.setItem('cpc_lead', JSON.stringify({
                            name:  formData.fullName,
                            email: formData.email,
                          }));
                        } catch { /* sessionStorage unavailable — Register handles the empty case */ }
                      }}
                    >
                      <Button variant="primary" className="w-full h-12">
                        Create a free account
                      </Button>
                    </Link>
                    <p className="text-[11px] text-zinc-400 mt-3 text-center">
                      Takes 30 seconds. No credit card required.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
