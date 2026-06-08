import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { motion } from "motion/react";

// Add new posts here as they ship (slug must match the route + prerender ROUTES).
const POSTS: { slug: string; title: string; excerpt: string; date: string }[] = [
  {
    slug: "how-to-read-your-credit-report",
    title: "How to Read Your Credit Report (and Spot the Errors That Hurt You)",
    excerpt: "All five sections of your credit report explained, the errors that quietly cost you points, and how to dispute them under the FCRA — get all three reports free.",
    date: "June 8, 2026",
  },
  {
    slug: "es/reparar-credito-para-comprar-casa-texas",
    title: "Cómo Reparar tu Crédito para Comprar Casa en Texas",
    excerpt: "Guía en español, paso a paso: revisa tus reportes, disputa errores bajo la FCRA, baja tu utilización y prepárate para la hipoteca — sin promesas de puntaje ni fecha.",
    date: "8 de junio, 2026",
  },
  {
    slug: "should-you-give-credit-repair-company-account-access",
    title: "Should You Give a Credit Repair Company Access to Your Accounts?",
    excerpt: "Read-only credit reports: normal. Your bank login or control of your money: never. The exact account access a legitimate company needs — and the red flags to walk away from.",
    date: "June 7, 2026",
  },
  {
    slug: "how-to-fix-your-credit-to-buy-a-house-texas",
    title: "How to Fix Your Credit to Buy a House in Texas",
    excerpt: "The step-by-step playbook to get mortgage-ready: check your reports, dispute errors, lower utilization, and avoid the mistakes that sink approvals.",
    date: "June 6, 2026",
  },
  {
    slug: "credit-repair-vs-credit-counseling-vs-debt-settlement",
    title: "Credit Repair vs. Credit Counseling vs. Debt Settlement: What's the Difference?",
    excerpt: "Three services people constantly confuse. What each actually does, the risks, and how to tell which one fits your situation.",
    date: "June 6, 2026",
  },
  {
    slug: "credit-score-to-buy-a-house-texas",
    title: "What Credit Score Do You Need to Buy a House in Texas?",
    excerpt: "FHA, conventional, VA, USDA — the scores Texas lenders actually look for, what else matters, and how to get mortgage-ready (no promises).",
    date: "June 5, 2026",
  },
  {
    slug: "how-to-choose-credit-repair-company-san-antonio",
    title: "How to Choose a Credit Repair Company in San Antonio (2026 Guide)",
    excerpt: "A law-based vetting guide for San Antonio: the 7-point checklist, red flags, your CROA rights, and the exact questions to ask before you sign.",
    date: "June 4, 2026",
  },
  {
    slug: "are-credit-repair-companies-a-scam",
    title: "Are Credit Repair Companies a Scam? How to Tell the Difference",
    excerpt: "Some are, many aren't — and federal law (CROA) draws a surprisingly clear line. The scam patterns to walk away from.",
    date: "June 3, 2026",
  },
  {
    slug: "do-credit-repair-companies-guarantee-results",
    title: "Do Credit Repair Companies Guarantee Results? What the Law Says",
    excerpt: "No legitimate company does — CROA §404 makes it illegal. Why 'no guarantee' is the green flag you're looking for.",
    date: "June 3, 2026",
  },
  {
    slug: "how-to-know-if-credit-repair-company-is-legitimate",
    title: "How to Know If a Credit Repair Company Is Legitimate",
    excerpt: "A 5-minute vetting checklist grounded in CROA and Texas law: contract, no advance fees, cancellation right, registration, bond.",
    date: "June 3, 2026",
  },
  {
    slug: "es/reparar-credito-con-itin",
    title: "Cómo Reparar tu Crédito con ITIN en Texas",
    excerpt: "Guía en español: cómo reparar y construir crédito con ITIN, tus derechos bajo la FCRA, y cómo prepararte para comprar casa en Texas.",
    date: "3 de junio, 2026",
  },
  {
    slug: "how-long-does-credit-repair-take",
    title: "How Long Does Credit Repair Take?",
    excerpt: "The FCRA's 30-day dispute window, why most files need multiple rounds, and what actually speeds things up.",
    date: "June 3, 2026",
  },
  {
    slug: "es/reparacion-de-credito-es-estafa",
    title: "¿La Reparación de Crédito es una Estafa?",
    excerpt: "Cómo distinguir una empresa legítima de una estafa usando la ley CROA — y cómo verificar una compañía en Texas.",
    date: "3 de junio, 2026",
  },
  {
    slug: "es/cuanto-tiempo-tarda-reparacion-credito",
    title: "¿Cuánto Tiempo Tarda la Reparación de Crédito?",
    excerpt: "Expectativas reales: el plazo de 30 días de la FCRA y qué determina cuánto tarda tu caso.",
    date: "3 de junio, 2026",
  },
  {
    slug: "can-i-fix-my-credit-myself",
    title: "Can You Fix Your Credit Yourself?",
    excerpt: "You have the same FCRA rights a company uses. A step-by-step DIY guide — and when paying for help makes sense.",
    date: "June 3, 2026",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://cleanpathcredit.com/blog#collection",
  name: "Clean Path Credit Blog",
  url: "https://cleanpathcredit.com/blog",
  description: "Honest, law-grounded guides on credit repair, your FCRA rights, and getting mortgage-ready in Texas.",
  isPartOf: { "@id": "https://cleanpathcredit.com/#website" },
  hasPart: POSTS.map((p) => ({
    "@type": "Article",
    headline: p.title,
    url: `https://cleanpathcredit.com/blog/${p.slug}`,
  })),
};

export function Blog() {
  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Credit Repair Guides & FCRA Rights | Clean Path Credit Blog"
        description="Honest, law-grounded guides on credit repair, your rights under the FCRA, scams to avoid, and getting mortgage-ready in Texas — in English and Spanish."
        canonical="https://cleanpathcredit.com/blog"
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32 pb-24">
        <section className="px-6 text-center max-w-3xl mx-auto mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mb-5 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              The Clean Path Blog
            </h1>
            <p className="text-lg font-medium text-zinc-700 md:text-xl">
              Straight answers about credit repair, your FCRA rights, and getting mortgage-ready — no hype, no
              guarantees, just what the law actually says.
            </p>
          </motion.div>
        </section>

        <section className="px-6 max-w-3xl mx-auto">
          <div className="space-y-5">
            {POSTS.map((p, i) => (
              <motion.a
                key={p.slug}
                href={`/blog/${p.slug}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.2) }}
                className="block rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">{p.date}</p>
                <h2 className="text-xl font-semibold text-zinc-900 mb-2">{p.title}</h2>
                <p className="text-zinc-600 leading-relaxed">{p.excerpt}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-emerald-700">Read article →</span>
              </motion.a>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
