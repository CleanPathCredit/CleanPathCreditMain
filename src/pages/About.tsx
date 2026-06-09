import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { ShieldCheck, Scale, Globe, HeartHandshake } from "lucide-react";

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://cleanpathcredit.com/about#aboutpage",
      url: "https://cleanpathcredit.com/about",
      name: "About Clean Path Credit",
      isPartOf: { "@id": "https://cleanpathcredit.com/#website" },
      mainEntity: { "@id": "https://cleanpathcredit.com/#founder" },
    },
    {
      "@type": "Person",
      "@id": "https://cleanpathcredit.com/#founder",
      name: "Alex Serratos",
      jobTitle: "Founder & Credit Restoration Specialist",
      worksFor: { "@id": "https://cleanpathcredit.com/#organization" },
      url: "https://cleanpathcredit.com/about",
      description:
        "Alex Serratos is the founder of Clean Path Credit, a Texas credit-services organization. He began helping people repair their credit in 2020 — starting with his own family — and has since personally guided around 100 people in using their FCRA rights to dispute inaccurate, incomplete, or unverifiable items on their credit reports.",
      knowsAbout: [
        "Credit repair",
        "FCRA disputes",
        "Credit Repair Organizations Act (CROA)",
        "Texas Finance Code Chapter 393",
        "Mortgage readiness",
      ],
    },
  ],
};

const VALUES: [React.ComponentType<{ className?: string }>, string, string][] = [
  [Scale, "Only what the law allows", "We dispute items that appear inaccurate, incomplete, or unverifiable under the FCRA — and never claim to remove accurate information."],
  [ShieldCheck, "No advance fees, ever", "You're billed per completed dispute round, never upfront. It's the law (CROA §404), and it's how it should be."],
  [HeartHandshake, "Honesty over hype", "No guaranteed scores, no 'secret' letters. We tell you plainly what credit repair can and can't do."],
  [Globe, "Bilingual by design", "Full service in English and Spanish — contracts, disputes, and weekly updates — for the families we serve across Texas."],
];

export function About() {
  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="About Clean Path Credit — Founder Alex Serratos | Clean Path Credit"
        description="Meet Alex Serratos, founder of Clean Path Credit — a Texas credit-services organization built on honest, FCRA-grounded credit repair with no advance fees and no guarantees."
        canonical="https://cleanpathcredit.com/about"
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32 pb-24">
        {/* Hero */}
        <section className="px-6 max-w-3xl mx-auto mb-14 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-3xl font-semibold text-white shadow-sm">
            AS
          </div>
          <h1 className="mb-2 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Alex Serratos
          </h1>
          <p className="text-lg font-medium text-emerald-700">Founder, Clean Path Credit</p>
        </section>

        {/* Bio */}
        <section className="px-6 max-w-3xl mx-auto mb-16 space-y-5 text-lg leading-relaxed text-zinc-700">
          <p>
            Alex Serratos didn't set out to build a credit-repair company — he set out to help his mom. When she
            needed to fix her credit to buy a car and a home, Alex taught himself how credit reporting and the Fair
            Credit Reporting Act (FCRA) dispute process actually work, and walked her through it. It worked for her.
            So he did the same for his father, his neighbor, his friends — and himself.
          </p>
          <p>
            That was back when COVID shut everything down. Since 2020, word spread — from family, to friends of
            friends, to real estate agents and clients from his property-management business — and Alex has personally
            helped around 100 people understand what's on their credit reports and use their FCRA rights to dispute
            items that are inaccurate, incomplete, or unverifiable. What began as helping his own family became Clean
            Path Credit.
          </p>
          <p>
            Alex built the company around one principle: a credit-repair company should do exactly what the law
            allows — and say so plainly. That means no advance fees, no guaranteed-outcome promises, and full
            compliance with the Credit Repair Organizations Act (CROA) and Texas Finance Code Chapter 393. It also
            means meeting Texas's Spanish-speaking families where they are, with full service in Spanish.
          </p>
          <p>
            What drives the work is the people behind each file — families trying to qualify for a mortgage, finance
            a reliable car, or stop paying the "bad-credit tax." Alex turns the FCRA's protections into a clear,
            round-by-round process clients can follow — and stays honest about what credit repair can and can't do.
          </p>
          <p>
            That same standard goes into everything he writes. Alex authors Clean Path Credit's plain-English guides —
            from{" "}
            <a href="/credit-repair-rights-texas" className="font-medium text-emerald-700 hover:text-emerald-600">your credit repair rights in Texas</a>{" "}
            to{" "}
            <a href="/blog/how-to-know-if-credit-repair-company-is-legitimate" className="font-medium text-emerald-700 hover:text-emerald-600">how to tell if a credit repair company is legitimate</a>{" "}
            and{" "}
            <a href="/blog/how-to-fix-your-credit-to-buy-a-house-texas" className="font-medium text-emerald-700 hover:text-emerald-600">how to get your credit mortgage-ready</a>{" "}
            — so the rights he exercises for clients are the same ones he teaches readers to use themselves.
          </p>
        </section>

        {/* Values */}
        <section className="px-6 max-w-5xl mx-auto mb-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl mb-8 text-center">
            What Clean Path Credit stands for
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(([Icon, title, body], i) => (
              <div key={i} className="rounded-3xl border border-zinc-100 bg-white p-7 shadow-sm">
                <Icon className="h-7 w-7 text-emerald-500 mb-3" />
                <h3 className="text-lg font-semibold text-zinc-900 mb-1.5">{title}</h3>
                <p className="text-zinc-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-zinc-900 md:text-4xl mb-5">
            Ready when you are
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Start with a free 15-minute credit audit — no obligation, no upfront fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/how-it-works#quiz-funnel"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800"
            >
              Start My Free Analysis
            </a>
            <a
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              How It Works
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
