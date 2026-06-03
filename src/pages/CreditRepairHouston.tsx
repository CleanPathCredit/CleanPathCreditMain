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

// CROA-safe FAQ — single source of truth for the visible section and the
// FAQPage JSON-LD. No guaranteed outcomes, no removal of accurate items.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does credit repair cost in Houston?",
    a: "Clean Path Credit bills per completed dispute round after the work is documented — no advance fees, as required by the federal Credit Repair Organizations Act (CROA). Pricing depends on your file's complexity. Book a free 15-minute audit for an exact quote.",
  },
  {
    q: "How long does credit repair take in Houston, TX?",
    a: "Each dispute round follows the Fair Credit Reporting Act's 30-day bureau investigation window (FCRA §611), and most files involve more than one round. Timelines vary with the number of items disputed and how furnishers respond — we never promise a specific result or date.",
  },
  {
    q: "Is Clean Path Credit local to Houston?",
    a: "Yes — our number, (346) 399-5606, is a Houston area code, and we serve the greater Houston metro. We operate under CROA, the FCRA, and Texas Finance Code Chapter 393; our Texas CSO registration is pending approval and we carry the required surety bond.",
  },
  {
    q: "Do you offer credit repair in Spanish in Houston?",
    a: "Yes. Houston is one of the most bilingual metros in the country, and we provide full service in Spanish — contracts, dispute letters, and weekly updates. See cleanpathcredit.com/es-comprador.",
  },
  {
    q: "Which Houston-area counties do you serve?",
    a: "We serve the entire Houston metro — Harris, Fort Bend, Montgomery, Brazoria, and Galveston counties — from the Energy Corridor and Katy to Sugar Land, Pearland, and the East End. As a service-area business, everything is handled remotely.",
  },
  {
    q: "Can you help with collections or medical bills on my report?",
    a: "We review collections, medical bills, late payments, and charge-offs and dispute items that appear inaccurate, incomplete, or unverifiable under FCRA §611 and §623. We cannot remove information that is accurate and verifiable — any company that promises otherwise is making a claim CROA prohibits.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FinancialService",
      "@id": "https://cleanpathcredit.com/credit-repair-houston#localbusiness",
      name: "Clean Path Credit",
      url: "https://cleanpathcredit.com/credit-repair-houston",
      image: "https://cleanpathcredit.com/og-image.png",
      logo: "https://cleanpathcredit.com/logo.png",
      telephone: "+1-346-399-5606",
      email: "hello@cleanpathcredit.com",
      priceRange: "$$",
      currenciesAccepted: "USD",
      description:
        "Credit repair and restoration for Houston, TX. FCRA-backed dispute strategies and AI-assisted report audits for buyers preparing for mortgage, auto, and business funding. Bilingual English/Spanish service.",
      knowsLanguage: ["en", "es"],
      areaServed: [
        { "@type": "City", name: "Houston", containedInPlace: { "@type": "State", name: "Texas" } },
        { "@type": "AdministrativeArea", name: "Harris County" },
      ],
      geo: { "@type": "GeoCoordinates", latitude: 29.76043, longitude: -95.3698 },
      address: { "@type": "PostalAddress", addressLocality: "Houston", addressRegion: "TX", addressCountry: "US" },
      availableLanguage: ["English", "Spanish"],
      parentOrganization: { "@id": "https://cleanpathcredit.com/#organization" },
      sameAs: ["https://www.google.com/search?kgmid=/g/11z9r1pbsh"],
    },
    {
      "@type": "FAQPage",
      "@id": "https://cleanpathcredit.com/credit-repair-houston#faq",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export function CreditRepairHouston() {
  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Credit Repair in Houston, TX | Clean Path Credit"
        description="Credit repair in Houston, TX — FCRA-backed dispute strategy and AI-assisted report audits for buyers getting mortgage-ready. Bilingual English/Spanish. Local Houston number, no advance fees."
        canonical="https://cleanpathcredit.com/credit-repair-houston"
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32">
        <section className="px-6 text-center max-w-4xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 mb-6">
              <MapPin className="h-4 w-4" /> Serving Houston &amp; Harris County
            </span>
            <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              Credit Repair in Houston, TX
            </h1>
            <p className="text-lg font-medium text-zinc-700 md:text-xl max-w-3xl mx-auto">
              FCRA-backed dispute strategy and AI-assisted credit report audits for Houston families getting ready
              to buy a home, finance a car, or fund a business — in English or Spanish, from a local Houston team.
            </p>
          </motion.div>
        </section>

        <section className="px-6 max-w-3xl mx-auto mb-20 text-zinc-700 leading-relaxed space-y-5">
          <p>
            Houston is the largest city in Texas and one of the most diverse housing markets in the country — from
            the Energy Corridor and Katy to Sugar Land, Pearland, and the East End, working families across Harris
            County are trying to get mortgage-ready in a fast-moving market. For many, the obstacle isn't income —
            it's a credit report carrying inaccurate, incomplete, or unverifiable items that quietly hold the score
            down.
          </p>
          <p>
            Clean Path Credit is a Texas-based, bilingual credit-services organization with a local Houston number
            ((346) 399-5606). We audit your reports from all three bureaus, build a dispute strategy around your
            specific file, and submit challenges under the Fair Credit Reporting Act on your behalf — the same
            rights you hold yourself, executed consistently and tracked round by round. Everything is handled
            remotely, so there's no office to drive to across Houston traffic.
          </p>
        </section>

        <section className="px-6 max-w-5xl mx-auto mb-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl mb-10 text-center">
            What We Help Houston Clients Address
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              ["Medical & utility collections", "With the Texas Medical Center nearby, medical-billing items are common; many fail strict reporting standards or were already removed under new FCRA rules."],
              ["Late payments & charge-offs", "Among the most challengeable items when they fail the FCRA's accuracy, completeness, or verifiability tests."],
              ["Mixed-file & identity errors", "Houston's size means more file mix-ups between people with similar names — directly addressable under the FCRA."],
              ["High utilization", "Balances above ~30% signal risk across all three bureaus; a strategic reset is often the fastest legitimate score lever."],
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

        <section className="px-6 max-w-4xl mx-auto mb-20">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-8 flex flex-col sm:flex-row items-start gap-5">
            <Globe className="h-8 w-8 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Reparación de crédito en Houston — en español</h2>
              <p className="text-zinc-700 leading-relaxed mb-4" lang="es">
                Houston es una de las ciudades más bilingües del país. Ofrecemos servicio completo en español:
                contratos, cartas de disputa, y actualizaciones semanales. Si te preparas para comprar casa con
                ITIN o ingresos en efectivo, podemos ayudarte.
              </p>
              <a href="/es-comprador" lang="es" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600">
                Ver la página en español →
              </a>
            </div>
          </div>
        </section>

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

        <section className="px-6 max-w-3xl mx-auto py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl mb-10 text-center">
            Houston Credit Repair — FAQ
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

        <section className="px-6 pb-24 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-zinc-900 md:text-4xl mb-5">
            Ready to get mortgage-ready in Houston?
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Start with a free 15-minute audit. We'll show you what's on your reports and what the plan looks like —
            no obligation, no upfront fees.
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
