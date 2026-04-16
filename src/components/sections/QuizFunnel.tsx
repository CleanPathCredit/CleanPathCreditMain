import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

type Step = 1 | 2 | 3 | 4 | 5;

// Pre-purchase funnel event (free 15-min credit audit). A separate Calendly
// event exists for post-purchase onboarding (cleanpathcredit/30minutesuccesscall)
// — that one lives in the Dashboard flow, not this quiz.
const CALENDLY_URL = "https://calendly.com/cleanpathcredit/free-15-min-credit-audit-strategy-call";
const CALENDLY_EMBED_URL = `${CALENDLY_URL}?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=00bc7d`;
const CALENDLY_SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

// Minimal typing for Calendly's global so we can call initInlineWidget
// without pulling in the whole @types/calendly package.
declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

const STEP_1_OPTIONS = [
  { id: 'home', label: 'Buy a Dream Home', fact: 'We specialize in removing derogatory marks to drop mortgage rates and get you clear to close.' },
  { id: 'car', label: 'Finance a Vehicle', fact: 'Stop overpaying! We target the dings causing 18%+ auto interest rates.' },
  { id: 'business', label: 'Secure Business Funding', fact: 'Leverage OPM. We sweep personal profiles so you can secure real business capital.' },
  { id: 'clean', label: 'Clean Profile / Stop Calls', fact: 'Take control of your life. 89% of DIYers fail—we do the heavy lifting for you.' },
];

const STEP_2_OPTIONS = [
  { id: 'medical', label: 'Medical or Utility Collections', fact: "Fact: Paying a collection doesn't remove it. We use federal laws to legally challenge and delete them." },
  { id: 'late', label: 'Late Payments/ Collections', fact: 'One late payment/ collection can cost you 50+ points. We aggressively target these for removal.' },
  { id: 'bankruptcies', label: 'Bankruptcies / Liens', fact: 'Yes, even public records can be challenged using our advanced Section 609 AI-powered dispute strategies.' },
  { id: 'balances', label: 'High Credit Card Balances', fact: "We will build you a custom 'Master Financial List' to optimize your credit utilization." },
  { id: 'unsure', label: "I'm Not Sure", fact: "That's exactly what our free deep-dive audit is for. We'll find the hidden errors." },
];

export function QuizFunnel() {
  const [step, setStep] = useState<Step>(1);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedObstacle, setSelectedObstacle] = useState<string | null>(null);
  const [showFact, setShowFact] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFinalAnalyzing, setIsFinalAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Calendly booking state — set when Calendly fires event_scheduled postMessage.
  // Drives the progressive disclosure on step 5: before booking the lead sees
  // only the inline Calendly widget; after booking they see the confirmation
  // and the create-account CTA.
  const [bookedEvent, setBookedEvent] = useState<unknown>(null);

  // Callback ref instead of useRef: fires synchronously when Framer Motion
  // finally inserts the div into the DOM (which is deferred ~300ms by
  // AnimatePresence mode="wait"). This triggers the init effect below.
  const [calHost, setCalHost] = useState<HTMLDivElement | null>(null);

  // Initialize Calendly inline widget once the host div is actually in the DOM.
  //
  // Why explicit initInlineWidget() instead of relying on widget.js auto-scan:
  // React mounts the host <div> AFTER widget.js has already done its one-time
  // DOM scan, so auto-init misses our element. We call initInlineWidget()
  // ourselves as soon as both the script is loaded AND calHost is set.
  //
  // Why calHost instead of a plain useRef: AnimatePresence mode="wait" defers
  // mounting the step-5 content until the step-4 exit animation completes
  // (~300ms). By that time the useEffect with [step] deps has already run and
  // bailed out because the ref was null. Using state for the callback ref means
  // React re-renders (and re-runs this effect) the moment the div mounts.
  useEffect(() => {
    if (!calHost) return;
    if (bookedEvent) return;

    let cancelled = false;

    function initWidget() {
      if (cancelled || !calHost) return;
      if (!window.Calendly?.initInlineWidget) {
        // Script not ready yet — retry until it appears.
        setTimeout(initWidget, 50);
        return;
      }
      // Clear any prior content (idempotent for dev HMR re-runs)
      calHost.innerHTML = "";
      window.Calendly.initInlineWidget({
        url:           CALENDLY_EMBED_URL,
        parentElement: calHost,
      });
    }

    if (window.Calendly?.initInlineWidget) {
      initWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${CALENDLY_SCRIPT_SRC}"]`,
      );
      if (existing) {
        // Script tag exists but may still be loading
        if (existing.getAttribute('data-loaded') === 'true') {
          initWidget();
        } else {
          existing.addEventListener('load', () => {
            existing.setAttribute('data-loaded', 'true');
            initWidget();
          }, { once: true });
        }
      } else {
        const script = document.createElement('script');
        script.src   = CALENDLY_SCRIPT_SRC;
        script.async = true;
        script.addEventListener('load', () => {
          script.setAttribute('data-loaded', 'true');
          initWidget();
        }, { once: true });
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [calHost, bookedEvent]);

  // Listen for Calendly's postMessage booking confirmation.
  // Only attach the listener once the widget is actually in the DOM (calHost set).
  useEffect(() => {
    if (!calHost) return;
    function handleMessage(e: MessageEvent) {
      if (typeof e.origin !== 'string' || !e.origin.includes('calendly.com')) return;
      const data = e.data as { event?: string; payload?: unknown };
      if (data?.event === 'calendly.event_scheduled') {
        setBookedEvent(data.payload ?? {});
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [calHost]);

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

  const handleOptionSelect = (stepNumber: 1 | 2, optionId: string) => {
    if (stepNumber === 1) {
      setSelectedGoal(optionId);
    } else {
      setSelectedObstacle(optionId);
    }
    setShowFact(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFinalAnalyzing(true);
    setAnalysisProgress(0);

    // Send lead data to the CRM via a same-origin backend proxy. Never embed
    // raw webhook URLs (or secrets) in client code — anyone could replay or
    // spam them. The proxy is expected to validate + forward server-side.
    // Configure the endpoint with VITE_LEAD_WEBHOOK_URL (e.g. "/api/lead").
    const leadEndpoint = import.meta.env.VITE_LEAD_WEBHOOK_URL;
    if (leadEndpoint) {
      fetch(leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).catch((error) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("Error sending lead data:", error);
        }
      });
    }
    
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsFinalAnalyzing(false);
        setStep(5);
      }, 1000);
    }, 2500);
  };

  return (
    <section id="quiz-funnel" className="py-24 bg-zinc-50">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            Find out if this will work for you
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
              animate={{ width: `${(step / 5) * 100}%` }}
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
                  <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-2">What is your primary financial goal right now?</h3>
                  <p className="text-sm sm:text-base text-zinc-500 mb-6 sm:mb-8">We customize our dispute strategies based on exactly what you are trying to achieve.</p>
                  
                  <div className="grid gap-4 flex-grow">
                    {STEP_1_OPTIONS.map((option) => {
                      const isSelected = selectedGoal === option.id;
                      return (
                        <motion.div
                          key={option.id}
                          onClick={() => !showFact && handleOptionSelect(1, option.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!showFact) handleOptionSelect(1, option.id);
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
                  <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6 sm:mb-8">What do you feel is currently holding your score down?</h3>
                  
                  <div className="grid gap-4 flex-grow">
                    {STEP_2_OPTIONS.map((option) => {
                      const isSelected = selectedObstacle === option.id;
                      return (
                        <motion.div
                          key={option.id}
                          onClick={() => !showFact && handleOptionSelect(2, option.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!showFact) handleOptionSelect(2, option.id);
                            }
                          }}
                          className={`relative w-full rounded-xl border-2 p-6 text-left transition-all duration-300 cursor-pointer ${
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
                                className="block text-lg font-medium text-zinc-900"
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
                      <p className="text-zinc-500">Matching with optimal dispute strategies</p>
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
                        <label htmlFor="quiz-timeline" className="block text-sm font-medium text-zinc-700 mb-2">How soon do you want to reach your goal?</label>
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

                        <Button type="submit" className="w-full h-14 text-lg mt-4">
                          See My Results
                        </Button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}

              {step === 5 && !bookedEvent && (
                <motion.div
                  key="step5-book"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-3">
                      You qualify for a free Credit Strategy Session
                    </h3>
                    <p className="text-base sm:text-lg text-zinc-600 mb-6 max-w-lg">
                      On this 15-minute call we&apos;ll pop the hood on your 3-bureau report,
                      pinpoint the exact negative items holding your score hostage, and show
                      you the legal strategies we use to remove them.
                    </p>
                    <p className="text-sm font-medium text-emerald-600 mb-6">
                      Pick a time that works for you ↓
                    </p>
                  </div>

                  {/* Calendly inline widget — initialized via initInlineWidget()
                      once this div mounts (calHost callback ref triggers the
                      effect). We don't rely on widget.js auto-scan because that
                      runs before React inserts this element. */}
                  <div
                    ref={setCalHost}
                    className="w-full rounded-xl overflow-hidden border border-zinc-200"
                    style={{ minWidth: '320px', height: '580px' }}
                  />

                  {/* Trust signals below the widget — keep these after the calendar
                      so the primary action (picking a time) wins the fold. */}
                  <div className="mt-8 pt-8 border-t border-zinc-100 w-full max-w-xl mx-auto">
                    <p className="text-sm font-semibold text-zinc-900 mb-4 text-center">
                      What you&apos;ll get on the call:
                    </p>
                    <ul className="space-y-2.5 text-sm text-zinc-700">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Free review of all 3 bureau reports
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        AI-powered audit of your negative items
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Custom game plan based on your profile — no script
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Zero obligation to buy anything
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Led by a certified credit specialist, not a call center
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {step === 5 && bookedEvent && (
                <motion.div
                  key="step5-booked"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full items-center text-center"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-3">
                    You&apos;re booked!
                  </h3>
                  <p className="text-base sm:text-lg text-zinc-600 mb-8 max-w-lg">
                    Check your email for the calendar invite and call link. See you then.
                  </p>

                  <div className="w-full max-w-md bg-gradient-to-br from-emerald-50 to-sky-50 rounded-2xl p-6 border border-emerald-100 text-left">
                    <h4 className="text-xl font-semibold text-zinc-900 mb-2">
                      While you wait — get a head start
                    </h4>
                    <p className="text-zinc-600 mb-5">
                      Create your free portal now and start reviewing your plan the
                      moment we hang up the call.
                    </p>
                    <ul className="space-y-2.5 mb-6 text-sm text-zinc-700">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Track your dispute progress in real time
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Download our complete Master Financial List
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Access premium guides and dispute templates
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Message your specialist directly
                      </li>
                    </ul>
                    <Link
                      to="/register"
                      onClick={() => {
                        // Store lead data in sessionStorage so Register can pre-fill
                        // the Clerk form without exposing PII in the URL (logs/history).
                        try {
                          sessionStorage.setItem("cpc_lead", JSON.stringify({
                            name:  formData.fullName,
                            email: formData.email,
                          }));
                        } catch { /* sessionStorage unavailable — Register falls back gracefully */ }
                      }}
                    >
                      <Button variant="primary" className="w-full h-12">
                        Create My Free Account
                      </Button>
                    </Link>
                  </div>

                  <p className="mt-6 text-xs text-zinc-400">
                    Need to change your time?{" "}
                    <a
                      href={CALENDLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline"
                    >
                      Reschedule here
                    </a>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
