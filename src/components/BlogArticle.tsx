import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";

interface BlogArticleProps {
  /** SEO <title> (include the brand). */
  title: string;
  /** Visible H1. */
  h1: string;
  /** Meta description (~150-160 chars). */
  description: string;
  /** Slug after /blog/ — e.g. "are-credit-repair-companies-a-scam". */
  slug: string;
  /** YYYY-MM-DD. */
  datePublished: string;
  /** BCP-47 language tag; defaults to en-US. Spanish posts pass "es-US". */
  lang?: string;
  /** Optional Q&A pairs — also emitted as FAQPage schema for rich results / AI citation. */
  faqs?: { q: string; a: string }[];
  children: React.ReactNode;
}

/** Section heading inside a post body. */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 font-display text-2xl font-semibold tracking-tight text-zinc-900">{children}</h2>;
}
/** Body paragraph inside a post. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-zinc-700 leading-relaxed">{children}</p>;
}

export function BlogArticle({ title, h1, description, slug, datePublished, lang = "en-US", faqs, children }: BlogArticleProps) {
  const canonical = `https://cleanpathcredit.com/blog/${slug}`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      headline: h1,
      description,
      datePublished,
      dateModified: datePublished,
      inLanguage: lang,
      mainEntityOfPage: canonical,
      image: "https://cleanpathcredit.com/og-image.png",
      author: { "@type": "Organization", name: "Clean Path Credit", url: "https://cleanpathcredit.com/" },
      publisher: { "@id": "https://cleanpathcredit.com/#organization" },
    },
  ];
  if (faqs && faqs.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo title={title} description={description} canonical={canonical} />
      <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />
      <Navbar />

      <main className="relative pt-32 pb-24">
        <article className="px-6 max-w-3xl mx-auto" lang={lang.startsWith("es") ? "es" : undefined}>
          <a href="/blog" className="text-sm font-medium text-emerald-700 hover:text-emerald-600">
            ← {lang.startsWith("es") ? "Todos los artículos" : "All articles"}
          </a>
          <h1 className="mt-4 mb-8 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">{h1}</h1>
          <div className="space-y-5">{children}</div>

          <div className="mt-14 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-8 text-center">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-3">
              {lang.startsWith("es") ? "¿Quieres una revisión gratuita de tu crédito?" : "Want a free look at your own reports?"}
            </h2>
            <p className="text-zinc-600 mb-6">
              {lang.startsWith("es")
                ? "Agenda una auditoría de crédito gratuita de 15 minutos — sin compromiso y sin pagos por adelantado."
                : "Book a free 15-minute credit audit — no obligation, no upfront fees."}
            </p>
            <a
              href={lang.startsWith("es") ? "/es-comprador" : "/how-it-works#quiz-funnel"}
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-7 py-3.5 text-base font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800"
            >
              {lang.startsWith("es") ? "Empezar ahora" : "Start My Free Analysis"}
            </a>
            <p className="mt-5 text-xs text-zinc-500">
              {lang.startsWith("es")
                ? "Los resultados varían según cada caso. Clean Path Credit no garantiza resultados específicos."
                : "Results vary by individual circumstance. Clean Path Credit does not guarantee specific outcomes."}
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
