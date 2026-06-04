import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { Scale, ShieldCheck, FileText, Landmark, AlertTriangle, CheckCircle2 } from "lucide-react";

const EN_URL = "https://cleanpathcredit.com/credit-repair-rights-texas";
const ES_URL = "https://cleanpathcredit.com/es/tus-derechos-reparacion-credito-texas";

const ALTERNATES = [
  { hreflang: "en", href: EN_URL },
  { hreflang: "es", href: ES_URL },
  { hreflang: "x-default", href: EN_URL },
];

// CROA-safe, citable reference in native Spanish. Describes the LAW — sin
// promesas de resultados, sin "eliminar" información correcta.
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Una empresa de reparación de crédito puede cobrarme antes de hacer el trabajo?",
    a: "No. La ley federal (Credit Repair Organizations Act, CROA §404) prohíbe cobrar o recibir dinero por servicios de reparación de crédito antes de que el trabajo se realice por completo. Una empresa que pide un pago por adelantado está violando la ley federal.",
  },
  {
    q: "¿Tengo derecho a cancelar un contrato de reparación de crédito?",
    a: "Sí. CROA §405 te da tres días hábiles para cancelar el contrato por cualquier motivo, sin costo. El contrato debe indicar este derecho claramente, y la empresa debe darte el aviso 'Derechos sobre tu archivo de crédito bajo la ley estatal y federal' antes de firmar.",
  },
  {
    q: "¿Es legal la reparación de crédito en Texas?",
    a: "Sí. Es legal y está regulada. A nivel federal por CROA y la Ley de Informe Justo de Crédito (FCRA). En Texas, las organizaciones de servicios de crédito (CSO) deben registrarse bajo el Capítulo 393 del Código Financiero de Texas y tener una fianza (surety bond). Puedes verificar el registro con la Oficina del Comisionado de Crédito al Consumidor de Texas (OCCC).",
  },
  {
    q: "¿Puedo reparar mi crédito si tengo un ITIN?",
    a: "Sí. Tus derechos bajo la FCRA para disputar información inexacta aplican igual con ITIN. Trabajamos con familias de estatus mixto que se preparan para comprar casa.",
  },
  {
    q: "¿Qué puedo hacer si una empresa viola la ley?",
    a: "CROA te da el derecho de demandar por daños reales, daños punitivos y honorarios de abogado. También puedes presentar quejas ante la FTC, la CFPB, la OCCC de Texas y la Fiscalía General de Texas.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": ES_URL + "#article",
      headline: "Tus Derechos en la Reparación de Crédito en Texas (CROA, FCRA y Código Financiero Cap. 393)",
      description:
        "Una guía en español, fácil de entender, sobre tus derechos legales al usar una empresa de reparación de crédito en Texas — bajo CROA, la FCRA y el Capítulo 393 del Código Financiero de Texas.",
      mainEntityOfPage: ES_URL,
      inLanguage: "es",
      datePublished: "2026-06-04",
      dateModified: "2026-06-04",
      author: { "@type": "Person", "@id": "https://cleanpathcredit.com/#founder", name: "Alex Serratos", url: "https://cleanpathcredit.com/about" },
      publisher: { "@id": "https://cleanpathcredit.com/#organization" },
    },
    {
      "@type": "FAQPage",
      "@id": ES_URL + "#faq",
      inLanguage: "es",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export function EsTusDerechosTexas() {
  return (
    <div lang="es" className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Tus Derechos en la Reparación de Crédito en Texas: CROA, FCRA y Cap. 393 | Clean Path Credit"
        description="Guía en español de tus derechos legales con una empresa de reparación de crédito en Texas — sin cargos por adelantado, 3 días para cancelar, disputas FCRA, registro CSO. Conoce la ley antes de firmar."
        canonical={ES_URL}
        alternates={ALTERNATES}
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32">
        {/* Hero */}
        <section className="px-6 text-center max-w-4xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 mb-6">
            <Scale className="h-4 w-4" /> Referencia de derechos del consumidor
          </span>
          <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
            Tus Derechos en la Reparación de Crédito en Texas
          </h1>
          <p className="text-lg font-medium text-zinc-700 md:text-xl max-w-3xl mx-auto">
            Antes de contratar a alguien, conoce lo que la ley te garantiza. Tres leyes protegen a los tejanos que
            usan una empresa de reparación de crédito — y marcan una línea clara entre una empresa legítima y una de
            la que debes alejarte.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            Por <a href="/about" className="font-medium text-emerald-700 hover:text-emerald-600">Alex Serratos</a>, fundador de Clean Path Credit · Actualizado en junio de 2026
          </p>
        </section>

        {/* CROA */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-7 w-7 text-emerald-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Federal: Ley de Organizaciones de Reparación de Crédito (CROA)
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            CROA (15 U.S.C. §1679 y siguientes) es la ley federal que rige a las empresas de reparación de crédito.
            Te da cuatro derechos que ninguna empresa puede ignorar:
          </p>
          <ul className="space-y-3 text-zinc-700 leading-relaxed">
            <li><strong>Sin cargos por adelantado (§404).</strong> Una empresa no puede cobrar dinero antes de que el servicio se realice por completo.</li>
            <li><strong>Contrato escrito + aviso (§405).</strong> Debes recibir el aviso "Derechos sobre tu archivo de crédito" <em>antes</em> de firmar, más un contrato que detalle servicios, términos y costo total.</li>
            <li><strong>3 días para cancelar (§405).</strong> Puedes cancelar por cualquier motivo dentro de tres días hábiles, sin costo.</li>
            <li><strong>Sin afirmaciones falsas (§404).</strong> Ninguna empresa puede garantizar un puntaje específico ni la eliminación de información correcta. Una garantía es, en sí misma, una violación.</li>
          </ul>
        </section>

        {/* FCRA */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-7 w-7 text-emerald-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Federal: Ley de Informe Justo de Crédito (FCRA)
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            La FCRA (15 U.S.C. §1681 y siguientes) te da los derechos de disputa que una empresa ejerce en tu nombre —
            los mismos que tú tienes:
          </p>
          <ul className="space-y-3 text-zinc-700 leading-relaxed">
            <li><strong>Disputar información inexacta (§611).</strong> Puedes disputar cualquier punto que creas inexacto, incompleto o no verificable. El buró debe investigar, generalmente dentro de 30 días, y corregir o eliminar lo que no pueda verificar.</li>
            <li><strong>Disputar con el acreedor (§623).</strong> También puedes disputar directamente con el acreedor o la agencia de cobro que reporta el punto.</li>
            <li><strong>Reportes de crédito gratis.</strong> Tienes derecho a reportes gratis de cada buró (AnnualCreditReport.com).</li>
            <li><strong>El límite.</strong> La información correcta, verificable y vigente no se puede eliminar — eso no es un servicio, es una promesa falsa.</li>
          </ul>
        </section>

        {/* Texas */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <Landmark className="h-7 w-7 text-emerald-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Texas: Código Financiero Capítulo 393
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            Además de la ley federal, Texas regula a las "organizaciones de servicios de crédito" (CSO) bajo el
            Capítulo 393 del Código Financiero. Una empresa legítima en Texas debe:
          </p>
          <ul className="space-y-3 text-zinc-700 leading-relaxed">
            <li><strong>Registrarse como CSO</strong> y darte la declaración informativa requerida por ley antes de cualquier contrato.</li>
            <li><strong>Tener una fianza (surety bond)</strong> que protege al consumidor si la empresa no cumple sus obligaciones.</li>
            <li><strong>Seguir las reglas de contrato de Texas</strong>, que refuerzan las protecciones de CROA.</li>
          </ul>
          <p className="text-zinc-700 leading-relaxed mt-4">
            Puedes verificar el registro de una empresa con la <strong>Oficina del Comisionado de Crédito al Consumidor de Texas (OCCC)</strong> antes de firmar.
          </p>
        </section>

        {/* Verificar */}
        <section className="bg-zinc-900 py-16 text-white mb-14">
          <div className="px-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              <h2 className="font-display text-2xl font-semibold md:text-3xl">Verifica cualquier empresa en 5 minutos</h2>
            </div>
            <ol className="space-y-3 text-zinc-200 leading-relaxed list-decimal pl-6">
              <li>Confirma que <strong>no cobran por adelantado</strong> (CROA §404).</li>
              <li>Pide ver el contrato y el aviso de derechos <strong>antes</strong> de firmar.</li>
              <li>Confirma el <strong>derecho a cancelar en 3 días</strong> por escrito.</li>
              <li>Verifica el <strong>registro CSO + la fianza</strong> con la OCCC de Texas.</li>
              <li>Aléjate de quien prometa un puntaje específico, eliminaciones garantizadas, o venda un "CPN".</li>
            </ol>
          </div>
        </section>

        {/* Si violan la ley */}
        <section className="px-6 max-w-3xl mx-auto mb-14">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Si una empresa viola la ley
            </h2>
          </div>
          <p className="text-zinc-700 leading-relaxed mb-4">
            CROA te da el derecho de demandar por daños reales, daños punitivos y honorarios de abogado. También
            puedes presentar quejas ante:
          </p>
          <ul className="space-y-2 text-zinc-700 leading-relaxed">
            <li>la <strong>Comisión Federal de Comercio (FTC)</strong> — reportefraude.ftc.gov,</li>
            <li>la <strong>Oficina de Protección Financiera del Consumidor (CFPB)</strong> — consumerfinance.gov/es,</li>
            <li>la <strong>OCCC de Texas</strong>, y</li>
            <li>la <strong>Fiscalía General de Texas</strong>.</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="px-6 max-w-3xl mx-auto pb-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl mb-8 text-center">
            Tus derechos — Preguntas frecuentes
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
            Trabaja con alguien que respeta estos derechos
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Clean Path Credit opera bajo las tres leyes — sin cargos por adelantado, con contrato y aviso por escrito,
            el derecho a cancelar en 3 días, y sin promesas de resultados. Empieza con una auditoría gratis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/es-comprador" className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800">
              Empezar mi análisis gratis
            </a>
            <a href="/es/reparacion-de-credito-san-antonio" className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-50">
              Reparación de crédito en San Antonio
            </a>
          </div>
          <p className="mt-8 text-xs text-zinc-400 max-w-2xl mx-auto">
            Esta página es información general sobre derechos del consumidor, no asesoría legal. Para tu situación
            específica, consulta a un abogado. Citas legales: CROA (15 U.S.C. §1679 y ss.), FCRA (15 U.S.C. §1681 y
            ss.), Código Financiero de Texas Capítulo 393.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
