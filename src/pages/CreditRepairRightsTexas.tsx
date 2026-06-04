import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { Scale, ShieldCheck, FileText, Landmark, AlertTriangle, CheckCircle2 } from "lucide-react";

const URL = "https://cleanpathcredit.com/credit-repair-rights-texas";

// CROA-safe, citable reference. All statements describe the LAW (CROA, FCRA,
// Texas Finance Code Ch. 393) — no outcome claims about Clean Path's service.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Can a credit repair company charge me before doing the work?",
    a: "No. The federal Credit Repair Organizations Act (CROA §404) prohibits charging or collecting any money for credit repair services before those services are fully performed. A company demanding an upfront fee is violating federal law.",
  },
  {
    q: "Do I have the right to cancel a credit repair contract?",
    a: "Yes. CROA §405 gives you three business days to cancel a credit repair contract for any reason, at no cost. The contract must clearly disclose this right, and the company must provide the 'Consumer Credit File Rights Under State and Federal Law' notice before you sign.",
  },
  {
    q: "Is credit repair legal in Texas?",
    a: "Yes. Credit repair is legal and regulated. Federally it falls under CROA and the Fair Credit Reporting Act (FCRA). In Texas, credit services organizations (CSOs) must register under Texas Finance Code Chapter 393 and post a surety bond. You can verify registration with the Texas Office of Consumer Credit Commissioner (OCCC).",
  },
  {
    q: "What can I dispute on my credit report?",
    a: "Under FCRA §611 you can dispute any item you believe is inaccurate, incomplete, or unverifiable, and the credit bureau must investigate (generally within 30 days). You cannot have accurate, verifiable, and timely information removed — no one can, and any company promising that is making a claim the law prohibits.",
  },
  {
    q: "What can I do if a credit repair company breaks the law?",
    a: "CROA gives consumers a private right to sue for actual damages, punitive damages, and attorney's fees. You can also file complaints with the Federal Trade Commission (FTC), the Consumer Financial Protection Bureau (CFPB), the Texas OCCC, and the Texas Attorney General.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": URL + "#article",
      headline: "Your Credit Repair Rights in Texas (CROA, FCRA & Texas Finance Code Ch. 393)",
      description:
        "A plain-English reference to your legal rights when using a credit repair company in Texas — under the federal CROA, the FCRA, and Texas Finance Code Chapter 393.",
      mainEntityOfPage: URL,
      inLanguage: "en",
      datePublished: "2026-06-04",
      dateModified: "2026-06-04",
      author: { "@type": "Person", "@id": "https://cleanpathcredit.com/#founder", name: "Alex Serratos", url: "https://cleanpathcredit.com/about" },
      publisher: { "@id": "https://cleanpathcredit.com/#organization" },
    },
    {
      "@type": "FAQPage",
      "@id": URL + "#faq",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export function CreditRepairRightsTexas() {
  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Your Credit Repair Rights in Texas: CROA, FCRA & Ch. 393 | Clean Path Credit"
        description="A plain-English reference to your legal rights with a credit repair company in Texas — no advance fees, 3-day cancellation, FCRA disputes, CSO registration. Know the law before you sign."
        canonical={URL}
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32">
        {/* Hero */}
        <section className="px-6 text-center max-w-4xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 mb-6">
            <Scale className="h-4 w-4" /> Consumer rights reference
          </span>
          <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
            Your Credit Repair Rights in Texas
          </h1>
          <p className="text-lg font-medium text-zinc-700 md:text-xl max-w-3xl mx-auto">
            Before you hire anyone, know what the law guarantees you. Three laws protect Texans who use a credit
            repair company — and they draw a clear line between a legitimate operator and one you should walk away from.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            By <a href="/about" className="font-medium text-emerald-700 hover:text-emerald-600">Alex Serratos</a>, Founder of Clean Path Credit · Updated June 2026
          </p>
        </section>

        {/* CROA */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-7 w-7 text-emerald-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Federal: the Credit Repair Organizations Act (CROA)
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            CROA (15 U.S.C. §1679 et seq.) is the federal law governing credit repair companies. It gives you four
            rights that are not optional for any company:
          </p>
          <ul className="space-y-3 text-zinc-700 leading-relaxed">
            <li><strong>No advance fees (§404).</strong> A company cannot charge or collect any money before the credit repair services are fully performed.</li>
            <li><strong>A written contract + disclosure (§405).</strong> You must receive the "Consumer Credit File Rights Under State and Federal Law" notice <em>before</em> you sign, plus a contract that itemizes services, terms, and total cost.</li>
            <li><strong>A 3-day right to cancel (§405).</strong> You can cancel for any reason within three business days at no cost.</li>
            <li><strong>No false or misleading claims (§404).</strong> No company can guarantee a specific score increase or the removal of accurate information. A guarantee is itself a violation.</li>
          </ul>
        </section>

        {/* FCRA */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-7 w-7 text-emerald-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Federal: the Fair Credit Reporting Act (FCRA)
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            The FCRA (15 U.S.C. §1681 et seq.) gives you the dispute rights a credit repair company exercises on your
            behalf — the same rights you hold yourself:
          </p>
          <ul className="space-y-3 text-zinc-700 leading-relaxed">
            <li><strong>Dispute inaccurate items (§611).</strong> You can dispute any item you believe is inaccurate, incomplete, or unverifiable. The bureau must investigate, generally within 30 days, and correct or delete anything it cannot verify.</li>
            <li><strong>Dispute with the furnisher (§623).</strong> You can also dispute directly with the creditor or collector reporting the item, which has its own obligation to investigate.</li>
            <li><strong>Free credit reports.</strong> You're entitled to free reports from each bureau (AnnualCreditReport.com), and additional free reports in certain situations.</li>
            <li><strong>The limit.</strong> Accurate, verifiable, and timely information cannot be removed by anyone — that's not a service, it's a false promise.</li>
          </ul>
        </section>

        {/* Texas */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <Landmark className="h-7 w-7 text-emerald-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Texas: Finance Code Chapter 393
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            On top of federal law, Texas regulates "credit services organizations" (CSOs) under Finance Code Chapter
            393. A legitimate Texas credit repair company must:
          </p>
          <ul className="space-y-3 text-zinc-700 leading-relaxed">
            <li><strong>Register as a CSO</strong> and provide you the statutorily required information statement before any contract.</li>
            <li><strong>Post a surety bond</strong> that protects consumers if the company fails to meet its obligations.</li>
            <li><strong>Follow Texas contract rules</strong>, which mirror and reinforce CROA's no-advance-fee and cancellation protections.</li>
          </ul>
          <p className="text-zinc-700 leading-relaxed mt-4">
            You can verify a company's registration with the <strong>Texas Office of Consumer Credit Commissioner (OCCC)</strong> before signing anything.
          </p>
        </section>

        {/* Verify */}
        <section className="bg-zinc-900 py-16 text-white mb-14">
          <div className="px-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              <h2 className="font-display text-2xl font-semibold md:text-3xl">Verify any company in 5 minutes</h2>
            </div>
            <ol className="space-y-3 text-zinc-200 leading-relaxed list-decimal pl-6">
              <li>Confirm they charge <strong>no advance fees</strong> (CROA §404).</li>
              <li>Ask to see the contract and the rights disclosure <strong>before</strong> signing.</li>
              <li>Confirm the <strong>3-day cancellation right</strong> is in writing.</li>
              <li>Verify Texas <strong>CSO registration + surety bond</strong> with the OCCC.</li>
              <li>Walk away from anyone promising a specific score, guaranteed removals, or selling a "CPN."</li>
            </ol>
            <p className="mt-6 text-sm text-zinc-400">
              For the full walkthrough, see our guide:{" "}
              <a href="/blog/how-to-choose-credit-repair-company-san-antonio" className="text-emerald-400 hover:text-emerald-300 underline">How to Choose a Credit Repair Company in San Antonio</a>.
            </p>
          </div>
        </section>

        {/* If they break the law */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              If a company breaks the law
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            CROA gives you a private right to sue for actual damages, punitive damages, and attorney's fees. You can
            also file complaints with:
          </p>
          <ul className="space-y-2 text-zinc-700 leading-relaxed">
            <li>the <strong>Federal Trade Commission</strong> (reportfraud.ftc.gov),</li>
            <li>the <strong>Consumer Financial Protection Bureau</strong> (consumerfinance.gov/complaint),</li>
            <li>the <strong>Texas OCCC</strong>, and</li>
            <li>the <strong>Texas Attorney General</strong>'s consumer protection division.</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="px-6 max-w-3xl mx-auto pb-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl mb-8 text-center">
            Credit repair rights — FAQ
          </h2>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">{f.q}</h3>
                <p className="text-zinc-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-24 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-semibold text-zinc-900 md:text-3xl mb-5">
            Working with someone who respects these rights
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Clean Path Credit operates under all three laws — no advance fees, written contract and disclosure, the
            3-day cancellation right, and no outcome guarantees. Start with a free 15-minute audit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/how-it-works#quiz-funnel" className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800">
              Start My Free Analysis
            </a>
            <a href="/credit-repair-san-antonio" className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-50">
              San Antonio Credit Repair
            </a>
          </div>
          <p className="mt-8 text-xs text-zinc-400 max-w-2xl mx-auto">
            This page is general information about consumer rights, not legal advice. For advice about your specific
            situation, consult a licensed attorney. Statutory citations: CROA (15 U.S.C. §1679 et seq.), FCRA (15
            U.S.C. §1681 et seq.), Texas Finance Code Chapter 393.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
