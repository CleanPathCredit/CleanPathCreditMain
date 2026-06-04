import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { motion } from "motion/react";
import {
  MapPin,
  ShieldCheck,
  Scale,
  FileSearch,
  Globe,
  CheckCircle2,
} from "lucide-react";

// FAQ content drives BOTH the visible accordion and the FAQPage JSON-LD —
// single source of truth keeps the rich result and the page in sync.
// All answers are CROA-safe: no guaranteed outcomes, no "removal" of accurate
// items, no specific score/timeframe promises.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does credit repair cost in San Antonio?",
    a: "Clean Path Credit bills per completed dispute round after the work is documented — there are no advance fees, as required by the federal Credit Repair Organizations Act (CROA). Pricing depends on the complexity of your file. Book a free 15-minute audit to get an exact quote for your situation.",
  },
  {
    q: "How long does credit repair take in San Antonio, TX?",
    a: "Under the Fair Credit Reporting Act (FCRA §611), the credit bureaus must investigate a dispute within 30 days. Most files involve more than one round of disputes. Individual timelines vary based on how many items are challenged, how furnishers respond, and the accuracy of what's being reported — we never promise a specific result or date.",
  },
  {
    q: "Is Clean Path Credit licensed to operate in San Antonio?",
    a: "Clean Path Credit operates under CROA, the FCRA, and the Texas Finance Code Chapter 393, which governs credit services organizations (CSOs) in Texas. Our Texas CSO registration is pending approval, and we carry the surety bond Texas law requires.",
  },
  {
    q: "Do you offer credit repair in Spanish in San Antonio?",
    a: "Yes. Contracts, dispute letters, weekly updates, and phone/text communication are all available in Spanish. See our Spanish-language page at cleanpathcredit.com/es-comprador for details.",
  },
  {
    q: "Do you serve Bexar County and the surrounding areas?",
    a: "Yes. We serve the entire San Antonio metro — including Bexar, Comal, Guadalupe, Medina, and Atascosa counties. As a service-area business, everything is handled remotely, so there's no office visit required.",
  },
  {
    q: "Can you help if I have collections or medical bills on my report?",
    a: "We review collections, medical bills, late payments, and charge-offs and dispute items that appear inaccurate, incomplete, or unverifiable under FCRA §611 and §623. We cannot remove information that is accurate and verifiable — and any company that promises otherwise is making a claim CROA prohibits.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FinancialService",
      "@id": "https://cleanpathcredit.com/credit-repair-san-antonio#localbusiness",
      name: "Clean Path Credit",
      url: "https://cleanpathcredit.com/credit-repair-san-antonio",
      image: "https://cleanpathcredit.com/og-image.png",
      logo: "https://cleanpathcredit.com/logo.png",
      telephone: "+1-346-399-5606",
      email: "hello@cleanpathcredit.com",
      priceRange: "$$",
      currenciesAccepted: "USD",
      description:
        "Credit repair and restoration for San Antonio, TX. FCRA-backed dispute strategies and AI-assisted report audits for buyers preparing for mortgage, auto, and business funding. Bilingual English/Spanish service.",
      knowsLanguage: ["en", "es"],
      areaServed: [
        { "@type": "City", name: "San Antonio", containedInPlace: { "@type": "State", name: "Texas" } },
        { "@type": "AdministrativeArea", name: "Bexar County" },
      ],
      geo: { "@type": "GeoCoordinates", latitude: 29.42412, longitude: -98.49363 },
      address: { "@type": "PostalAddress", addressLocality: "San Antonio", addressRegion: "TX", addressCountry: "US" },
      availableLanguage: ["English", "Spanish"],
      parentOrganization: { "@id": "https://cleanpathcredit.com/#organization" },
      sameAs: ["https://www.google.com/search?kgmid=/g/11z9r1pbsh"],
    },
    {
      "@type": "FAQPage",
      "@id": "https://cleanpathcredit.com/credit-repair-san-antonio#faq",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export function CreditRepairSanAntonio() {
  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Credit Repair in San Antonio, TX | Clean Path Credit"
        description="Credit repair in San Antonio, TX — FCRA-backed dispute strategy and AI-assisted report audits for buyers getting mortgage-ready. Bilingual English/Spanish. No advance fees. Free 15-minute audit."
        canonical="https://cleanpathcredit.com/credit-repair-san-antonio"
        alternates={[
          { hreflang: "en", href: "https://cleanpathcredit.com/credit-repair-san-antonio" },
          { hreflang: "es", href: "https://cleanpathcredit.com/es/reparacion-de-credito-san-antonio" },
          { hreflang: "x-default", href: "https://cleanpathcredit.com/credit-repair-san-antonio" },
        ]}
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32">
        {/* Hero */}
        <section className="px-6 text-center max-w-4xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 mb-6">
              <MapPin className="h-4 w-4" /> Serving San Antonio &amp; Bexar County
            </span>
            <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              Credit Repair in San Antonio, TX
            </h1>
            <p className="text-lg font-medium text-zinc-700 md:text-xl max-w-3xl mx-auto">
              FCRA-backed dispute strategy and AI-assisted credit report audits for San Antonio families getting
              ready to buy a home, finance a car, or fund a business — in English or Spanish, with no upfront fees.
            </p>
          </motion.div>
        </section>

        {/* Local context */}
        <section className="px-6 max-w-3xl mx-auto mb-20 text-zinc-700 leading-relaxed space-y-5">
          <p>
            San Antonio is one of the largest first-time-homebuyer markets in Texas, and for thousands of families
            across the South Side, West Side, Stone Oak, and the I-35 corridor, a single low credit score is the
            main thing standing between them and a mortgage approval. Credit repair won't change accurate history —
            but a surprising number of the items dragging scores down are inaccurate, incomplete, or unverifiable,
            and those are exactly what the law lets you challenge.
          </p>
          <p>
            Clean Path Credit is a Texas-based, bilingual credit-services organization. We audit your reports from
            all three bureaus, build a dispute strategy around your specific file, and submit challenges under the
            Fair Credit Reporting Act on your behalf — the same rights you hold yourself, executed consistently and
            tracked round by round. Everything is handled remotely, so there's no office to drive to.
          </p>
        </section>

        {/* What we address */}
        <section className="px-6 max-w-5xl mx-auto mb-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl mb-10 text-center">
            What We Help San Antonio Clients Address
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              ["Medical & utility collections", "New FCRA rules removed many paid medical collections and small-balance items; remaining ones often fail strict reporting standards."],
              ["Late payments & charge-offs", "Among the most challengeable items when they fail the FCRA's accuracy, completeness, or verifiability tests."],
              ["Mixed-file & military PCS errors", "San Antonio's large JBSA / Randolph / Lackland community sees credit-file mix-ups from frequent PCS moves — these are directly addressable."],
              ["High utilization", "Balances above ~30% signal risk across all three bureaus; we coach a strategic reset that's often the fastest legitimate score lever."],
            ].map(([title, body], i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl border border-zinc-100 bg-white p-7 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <FileSearch className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-1.5">{title}</h3>
                    <p className="text-zinc-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Spanish callout */}
        <section className="px-6 max-w-4xl mx-auto mb-20">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-8 flex flex-col sm:flex-row items-start gap-5">
            <Globe className="h-8 w-8 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Reparación de crédito en San Antonio — en español</h2>
              <p className="text-zinc-700 leading-relaxed mb-4" lang="es">
                Ofrecemos servicio completo en español: contratos, cartas de disputa, y actualizaciones semanales.
                Si te estás preparando para comprar casa con ITIN o ingresos en efectivo, podemos ayudarte.
              </p>
              <a href="/es-comprador" lang="es" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600">
                Ver la página en español →
              </a>
            </div>
          </div>
        </section>

        {/* Your rights */}
        <section className="bg-zinc-900 py-20 text-white">
          <div className="px-6 max-w-4xl mx-auto">
            <h2 className="font-display text-3xl font-semibold md:text-4xl mb-10 text-center">
              Your Rights Before You Sign Anything
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                [Scale, "No advance fees", "Federal law (CROA §404) prohibits charging for credit repair before the work is performed."],
                [ShieldCheck, "3-day right to cancel", "You can cancel the contract within three business days at no cost (CROA §405)."],
                [CheckCircle2, "Texas CSO + surety bond", "We operate under Texas Finance Code Ch. 393. CSO registration is pending approval; a surety bond is in place."],
              ].map(([Icon, title, body], i) => (
                <div key={i} className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700">
                  <Icon className="h-7 w-7 text-emerald-400 mb-3" />
                  <h3 className="font-semibold text-lg mb-1.5">{title as string}</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">{body as string}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 max-w-3xl mx-auto py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl mb-10 text-center">
            San Antonio Credit Repair — FAQ
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
          <h2 className="font-display text-3xl font-semibold text-zinc-900 md:text-4xl mb-5">
            Ready to get mortgage-ready in San Antonio?
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Start with a free 15-minute audit. We'll show you what's on your reports and what the plan looks like —
            with no obligation and no upfront fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/how-it-works#quiz-funnel"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800"
            >
              Start My Free Analysis
            </a>
            <a
              href="/unlock"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              View Plans
            </a>
          </div>
          <p className="mt-6 text-xs text-zinc-500">Results vary by individual circumstance. Clean Path Credit does not guarantee specific outcomes.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
