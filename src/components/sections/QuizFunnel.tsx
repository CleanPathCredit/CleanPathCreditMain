import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_1_OPTIONS = [
  { id: 'home', label: 'Buy a Dream Home', fact: 'We specialize in removing derogatory marks to drop mortgage rates and get you clear to close.' },
  { id: 'car', label: 'Finance a Vehicle', fact: 'Stop overpaying! We target the dings causing 18%+ auto interest rates.' },
  { id: 'business', label: 'Secure Business Funding', fact: 'Leverage OPM. We sweep personal profiles so you can secure real business capital.' },
  { id: 'clean', label: 'Clean Profile / Stop Calls', fact: 'Take control of your life. 89% of DIYers fail—we do the heavy lifting for you.' },
];

const STEP_2_OPTIONS = [
  { id: 'medical', label: 'Medical or Utility Collections', fact: "Fact: Paying a collection doesn't remove it. We use federal laws to legally challenge and delete them." },
  { id: 'late', label: 'Late Payments/ Collections', fact: 'One late payment/ collection can cost you 50+ points. We aggressively target these for removal.' },
  { id: 'bankruptcies', label: 'Bankruptcies / Liens', fact: 'Yes, even public records can be challenged using our advanced Section AI powered strategies.' },
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

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  };

  const getEndDate = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    return endDate;
  };

  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const generateGoogleCalendarLink = () => {
    const start = formatDateForCalendar(getTomorrowDate());
    const end = formatDateForCalendar(getEndDate(getTomorrowDate()));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Credit+Strategy+Session&dates=${start}/${end}&details=Your+free+30-minute+Credit+Strategy+Session+with+Clean+Path+Credit.&location=Online`;
  };

  const generateIcsFile = () => {
    const start = formatDateForCalendar(getTomorrowDate());
    const end = formatDateForCalendar(getEndDate(getTomorrowDate()));
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Credit Strategy Session\nDESCRIPTION:Your free 30-minute Credit Strategy Session with Clean Path Credit.\\n\\nPlease update the time to match your Calendly booking.\nLOCATION:Online\nDTSTART:${start}\nDTEND:${end}\nEND:VEVENT\nEND:VCALENDAR`;
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
  };

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

    // Send lead data to webhook
    fetch("https://services.leadconnectorhq.com/hooks/da0KTegxFQ62eqS73TQv/webhook-trigger/aef6b546-5e8e-4d0b-96b6-c92d57a4e80e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    }).catch(error => console.error("Error sending lead data:", error));
    
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
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Find out if this will work for you
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Take our free 60-second analysis to see exactly how we can help you reach your goals.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 h-1.5 w-full bg-zinc-100">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: '20%' }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          <div className="p-8 sm:p-12 min-h-[400px]">
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
                  <h3 className="text-2xl font-semibold text-zinc-900 mb-2">What is your primary financial goal right now?</h3>
                  <p className="text-zinc-500 mb-8">We customize our dispute strategies based on exactly what you are trying to achieve.</p>
                  
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

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  <h3 className="text-2xl font-semibold text-zinc-900 mb-8">What do you feel is currently holding your score down?</h3>
                  
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
                  <h3 className="text-2xl font-semibold text-zinc-900 mb-8">Let's get a baseline of where you are at.</h3>
                  
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center flex-grow py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                      <p className="text-lg font-medium text-zinc-900">Analyzing Profile...</p>
                      <p className="text-zinc-500">Matching with optimal dispute strategies</p>
                    </div>
                  ) : (
                    <div className="space-y-6 flex-grow">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">What is your estimated credit score?</label>
                        <select 
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
                        <label className="block text-sm font-medium text-zinc-700 mb-2">What is your approximate annual income?</label>
                        <select 
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
                        <label className="block text-sm font-medium text-zinc-700 mb-2">What is your ideal credit score?</label>
                        <select 
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
                        <label className="block text-sm font-medium text-zinc-700 mb-2">How soon do you want to reach your goal?</label>
                        <select 
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

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full items-center text-center"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-3xl font-semibold text-zinc-900 mb-4">Application Received & Approved!</h3>
                  <p className="text-lg text-zinc-600 mb-8 max-w-lg">
                    Based on your answers, you are eligible for a free 30-minute Credit Strategy Session. We will review your report line-by-line and show you exactly how to reach your goal.
                  </p>
                  
                  <a 
                    href="https://calendly.com/perfectcredit780/30min" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full max-w-md"
                  >
                    <Button className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
                      Book Now
                    </Button>
                  </a>

                  <div className="mt-8 pt-8 border-t border-zinc-100 w-full max-w-md text-left">
                    <p className="text-sm font-medium text-zinc-900 mb-4 text-center">Don't forget your appointment! Add to your calendar:</p>
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-10">
                      <a href={generateGoogleCalendarLink()} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Google
                        </Button>
                      </a>
                      <a href={generateIcsFile()} download="credit-strategy-session.ics">
                        <Button variant="outline" size="sm" className="gap-1.5 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Apple
                        </Button>
                      </a>
                      <a href={generateIcsFile()} download="credit-strategy-session.ics">
                        <Button variant="outline" size="sm" className="gap-1.5 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Outlook
                        </Button>
                      </a>
                    </div>

                    <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
                      <h4 className="text-xl font-semibold text-zinc-900 mb-3">Next Step: Create Your Clean Path Client Portal</h4>
                      <p className="text-zinc-600 mb-4">Don't wait for your call to get started. Create your free client account now to:</p>
                      <ul className="space-y-2 mb-6 text-zinc-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          Access our dispute tracking tools.
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          View your credit journey progress.
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          Download your Master Financial List and premium credit resources.
                        </li>
                      </ul>
                      <a href={`/register?name=${encodeURIComponent(formData.fullName)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}`}>
                        <Button variant="primary" className="w-full h-12">
                          Create My Free Account
                        </Button>
                      </a>
                    </div>
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
