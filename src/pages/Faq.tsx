import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { motion } from "motion/react";

// Question-headed, self-contained, statute-grounded answer blocks. This format
// is optimized for Google featured snippets + AI Overviews / ChatGPT / Perplexity
// citation. Every answer is CROA-safe: no guaranteed outcomes, no promise to
// remove accurate items, no specific score or timeframe claims. The same array
// powers the visible page and the FAQPage JSON-LD.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Are credit repair companies legal?",
    a: "Yes. In the United States, credit repair is regulated by the Credit Repair Organizations Act (CROA), which requires a written contract, prohibits charging fees before services are performed, mandates a 3-day right to cancel, and forbids guaranteed-outcome claims. The disputes a credit repair company files are the same rights consumers hold themselves under the Fair Credit Reporting Act (FCRA §611). In Texas, credit services organizations must also register under Texas Finance Code Chapter 393 and post a surety bond.",
  },
  {
    q: "How does credit repair work?",
    a: "A credit repair company reviews your reports from Equifax, Experian, and TransUnion, identifies items that appear inaccurate, incomplete, or unverifiable, and submits disputes on your behalf under FCRA §611 (to the bureaus) and §623 (to the furnisher that reported the item). The bureaus must investigate within 30 days and correct or remove anything they cannot verify. Credit repair cannot remove accurate, verifiable information.",
  },
  {
    q: "How long does credit repair take?",
    a: "One dispute round follows the FCRA's 30-day bureau investigation window, and most files involve more than one round. How long the overall process takes depends on the number and type of items disputed and how furnishers respond. No legitimate company can promise a specific result or date — and any 'fix your credit in 30 days, guaranteed' claim is exactly what CROA prohibits.",
  },
  {
    q: "Do credit repair companies guarantee results?",
    a: "No — and that is a good sign, not a weakness. CROA §404 makes it illegal for a credit repair company to guarantee the removal of any item or a specific score increase, because bureau and furnisher responses are outside any company's control. A company can honestly commit to the process — dispute rounds submitted, written updates, FCRA-grounded challenges — but not to a guaranteed outcome.",
  },
  {
    q: "What can a credit repair company actually do — and not do?",
    a: "It can dispute items that appear inaccurate, incomplete, or unverifiable, file under FCRA §611 and §623, and coach you on building positive credit. It cannot legally remove information that is accurate and verifiable, create a 'new' credit identity (CPN numbers are a form of fraud), or guarantee a score. Accurate negative items remain until they age off on the timeline the FCRA sets.",
  },
  {
    q: "How do I know if a credit repair company is legitimate?",
    a: "Check for five things: a written contract, no fees charged before work is performed, a clearly stated 3-day right to cancel, an active state registration (in Texas, a CSO registration with the Office of Consumer Credit Commissioner), and a surety bond. A legitimate company also never promises guaranteed results or asks you to misrepresent your identity to the bureaus.",
  },
  {
    q: "Can I repair my credit myself?",
    a: "Yes. The dispute rights a credit repair company uses are the same rights you have under the FCRA — you can request your free reports, identify errors, and dispute them directly with the bureaus and furnishers at no cost. People hire a company for the time, the consistency across multiple rounds, and the experience handling complex files, not because the rights are exclusive.",
  },
  {
    q: "What is a '609 dispute letter'?",
    a: "FCRA §609 is the section that gives you the right to request information and disclosures about what's in your file — it is not a loophole that forces deletion of accurate debts. The popular idea that a '609 letter' magically erases negative items is a myth. Real disputes succeed under FCRA §611 when an item is inaccurate, incomplete, or cannot be verified — not because of a specific letter template.",
  },
  {
    q: "Does credit repair help me buy a house?",
    a: "It can help by addressing inaccurate or unverifiable items that lower your score before you apply for a mortgage. Separately, the FHFA-approved scoring models (FICO 10T and VantageScore 4.0) that Fannie Mae and Freddie Mac began accepting in 2025 can factor in rent and utility payment history — which can expand eligibility for buyers with thin or non-traditional files, including ITIN borrowers.",
  },
  {
    q: "Is credit repair available in Spanish?",
    a: "Yes. Clean Path Credit provides full service in Spanish — contracts, dispute letters, and weekly updates — for Spanish-speaking buyers across Texas. See our Spanish-language page at cleanpathcredit.com/es-comprador.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://cleanpathcredit.com/faq#faq",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function Faq() {
  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Credit Repair FAQ — Is It Legal? How It Works | Clean Path Credit"
        description="Straight, law-grounded answers about credit repair: is it legal, how it works (FCRA §611/§623), how long it takes, guarantees, and how to spot a legitimate company. Texas, English & Spanish."
        canonical="https://cleanpathcredit.com/faq"
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32">
        <section className="px-6 text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              Credit Repair, Answered Honestly
            </h1>
            <p className="text-lg font-medium text-zinc-700 md:text-xl">
              Clear, law-grounded answers to the questions people actually ask before hiring help — what's legal,
              what works, and what no one can promise.
            </p>
          </motion.div>
        </section>

        <section className="px-6 max-w-3xl mx-auto pb-20">
          <div className="space-y-5">
            {FAQS.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className="rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm"
              >
                <h2 className="text-xl font-semibold text-zinc-900 mb-3">{f.q}</h2>
                <p className="text-zinc-600 leading-relaxed">{f.a}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-6 pb-24 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-zinc-900 md:text-4xl mb-5">
            Still have questions about your file?
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Book a free 15-minute audit and we'll walk through exactly what's on your reports — no obligation,
            no upfront fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/how-it-works#quiz-funnel"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800"
            >
              Start My Free Analysis
            </a>
            <a
              href="/credit-repair-san-antonio"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              Credit Repair in San Antonio
            </a>
          </div>
          <p className="mt-6 text-xs text-zinc-500">Results vary by individual circumstance. Clean Path Credit does not guarantee specific outcomes.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
