import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import { motion } from "motion/react";
import { MapPin, ShieldCheck, Scale, FileSearch, CheckCircle2 } from "lucide-react";

const EN_URL = "https://cleanpathcredit.com/credit-repair-san-antonio";
const ES_URL = "https://cleanpathcredit.com/es/reparacion-de-credito-san-antonio";

// Reciprocal hreflang for the EN/ES San Antonio pair (also set on the English page).
const ALTERNATES = [
  { hreflang: "en", href: EN_URL },
  { hreflang: "es", href: ES_URL },
  { hreflang: "x-default", href: EN_URL },
];

// FAQ drives the visible accordion AND the FAQPage JSON-LD. CROA-safe: sin
// garantías de resultados, sin "eliminar" información correcta, sin plazos prometidos.
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Cuánto cuesta la reparación de crédito en San Antonio?",
    a: "Clean Path Credit cobra por ronda de disputa completada, después de documentar el trabajo — no hay cargos por adelantado, como lo exige la ley federal (Credit Repair Organizations Act, CROA). El precio depende de la complejidad de tu caso. Agenda una auditoría gratis de 15 minutos para recibir una cotización exacta.",
  },
  {
    q: "¿Cuánto tarda la reparación de crédito en San Antonio, TX?",
    a: "Según la Ley de Informe Justo de Crédito (FCRA §611), los burós de crédito deben investigar una disputa dentro de 30 días. La mayoría de los casos requieren más de una ronda. Los tiempos varían según cuántos puntos se disputen y cómo respondan los acreedores — nunca prometemos un resultado o una fecha específica.",
  },
  {
    q: "¿Clean Path Credit está autorizado para operar en San Antonio?",
    a: "Clean Path Credit opera bajo CROA, la FCRA y el Capítulo 393 del Código Financiero de Texas, que regula a las organizaciones de servicios de crédito (CSO) en Texas. Nuestro registro CSO de Texas está pendiente de aprobación y contamos con la fianza (surety bond) que exige la ley.",
  },
  {
    q: "¿Puedo reparar mi crédito con un ITIN?",
    a: "Sí. Trabajamos con familias que tienen ITIN o ingresos en efectivo y se están preparando para comprar casa. Los derechos bajo la FCRA para disputar información inexacta aplican igual con ITIN — y entendemos las necesidades de los archivos de crédito de estatus mixto.",
  },
  {
    q: "¿Atienden el condado de Bexar y las áreas cercanas?",
    a: "Sí. Servimos toda el área metropolitana de San Antonio — incluyendo los condados de Bexar, Comal, Guadalupe, Medina y Atascosa. Como negocio de área de servicio, todo se maneja de forma remota, sin necesidad de visitar una oficina.",
  },
  {
    q: "¿Pueden ayudarme si tengo cuentas en colección o cuentas médicas?",
    a: "Revisamos colecciones, cuentas médicas, pagos atrasados y charge-offs, y disputamos los puntos que parezcan inexactos, incompletos o no verificables bajo la FCRA §611 y §623. No podemos eliminar información que sea correcta y verificable — y cualquier empresa que prometa lo contrario está haciendo una afirmación que CROA prohíbe.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FinancialService",
      "@id": ES_URL + "#localbusiness",
      name: "Clean Path Credit",
      url: ES_URL,
      image: "https://cleanpathcredit.com/og-image.png",
      logo: "https://cleanpathcredit.com/logo.png",
      telephone: "+1-346-399-5606",
      email: "hello@cleanpathcredit.com",
      priceRange: "$$",
      currenciesAccepted: "USD",
      inLanguage: "es",
      description:
        "Reparación de crédito en San Antonio, TX. Estrategias de disputa respaldadas por la FCRA y auditorías de reporte asistidas por IA para familias que se preparan para comprar casa, auto o financiar un negocio. Servicio completo en español.",
      knowsLanguage: ["es", "en"],
      areaServed: [
        { "@type": "City", name: "San Antonio", containedInPlace: { "@type": "State", name: "Texas" } },
        { "@type": "AdministrativeArea", name: "Bexar County" },
      ],
      geo: { "@type": "GeoCoordinates", latitude: 29.42412, longitude: -98.49363 },
      address: { "@type": "PostalAddress", addressLocality: "San Antonio", addressRegion: "TX", addressCountry: "US" },
      availableLanguage: ["Spanish", "English"],
      parentOrganization: { "@id": "https://cleanpathcredit.com/#organization" },
      sameAs: ["https://www.google.com/search?kgmid=/g/11z9r1pbsh"],
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

export function EsReparacionSanAntonio() {
  return (
    <div lang="es" className="relative min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Seo
        title="Reparación de Crédito en San Antonio, TX | Clean Path Credit"
        description="Reparación de crédito en San Antonio, TX — estrategia de disputa respaldada por la FCRA y auditorías de reporte, para familias que se preparan para comprar casa. Servicio en español, con ITIN. Sin cargos por adelantado. Auditoría gratis."
        canonical={ES_URL}
        alternates={ALTERNATES}
      />
      <JsonLd data={SCHEMA} />
      <Navbar />

      <main className="relative pt-32">
        {/* Hero */}
        <section className="px-6 text-center max-w-4xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 mb-6">
              <MapPin className="h-4 w-4" /> Servimos San Antonio y el condado de Bexar
            </span>
            <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              Reparación de Crédito en San Antonio, TX
            </h1>
            <p className="text-lg font-medium text-zinc-700 md:text-xl max-w-3xl mx-auto">
              Estrategia de disputa respaldada por la FCRA y auditorías de crédito asistidas por IA para familias de
              San Antonio que se preparan para comprar casa, financiar un auto o abrir un negocio — todo en español,
              sin cargos por adelantado.
            </p>
          </motion.div>
        </section>

        {/* Contexto local */}
        <section className="px-6 max-w-3xl mx-auto mb-20 text-zinc-700 leading-relaxed space-y-5">
          <p>
            San Antonio es uno de los mercados de compradores de primera vivienda más grandes de Texas, y para miles
            de familias en el South Side, el West Side, Stone Oak y el corredor del I-35, un puntaje de crédito bajo
            es lo único que las separa de la aprobación de una hipoteca. La reparación de crédito no cambia el
            historial correcto — pero muchos de los puntos que bajan tu puntaje son inexactos, incompletos o no
            verificables, y esos son exactamente los que la ley te permite disputar.
          </p>
          <p>
            Clean Path Credit es una organización de servicios de crédito basada en Texas, con servicio completo en
            español. Auditamos tus reportes de los tres burós, creamos una estrategia de disputa según tu caso y
            presentamos los reclamos bajo la FCRA en tu nombre — los mismos derechos que tienes tú, ejecutados de
            forma constante y con seguimiento ronda por ronda. Todo se maneja de forma remota; no hay oficina a la
            que manejar.
          </p>
        </section>

        {/* Qué atendemos */}
        <section className="px-6 max-w-5xl mx-auto mb-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl mb-10 text-center">
            Lo que ayudamos a resolver en San Antonio
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              ["Cuentas médicas y de colección", "Las nuevas reglas de la FCRA quitaron muchas cuentas médicas pagadas y de saldo pequeño; las que quedan a menudo no cumplen los estándares estrictos de reporte."],
              ["Pagos atrasados y charge-offs", "Están entre los puntos más disputables cuando fallan las pruebas de exactitud, integridad o verificabilidad de la FCRA."],
              ["Crédito con ITIN e ingresos en efectivo", "Atendemos a familias de estatus mixto que se preparan para una hipoteca — los derechos de la FCRA aplican igual con ITIN."],
              ["Utilización alta", "Saldos por encima del ~30% indican riesgo en los tres burós; te guiamos en un reajuste estratégico que suele ser la palanca legítima más rápida."],
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

        {/* Tus derechos */}
        <section className="bg-zinc-900 py-20 text-white">
          <div className="px-6 max-w-4xl mx-auto">
            <h2 className="font-display text-3xl font-semibold md:text-4xl mb-10 text-center">
              Tus derechos antes de firmar
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                [Scale, "Sin cargos por adelantado", "La ley federal (CROA §404) prohíbe cobrar por reparación de crédito antes de realizar el trabajo."],
                [ShieldCheck, "3 días para cancelar", "Puedes cancelar el contrato dentro de tres días hábiles sin costo (CROA §405)."],
                [CheckCircle2, "CSO de Texas + fianza", "Operamos bajo el Capítulo 393 del Código Financiero de Texas. El registro CSO está pendiente de aprobación; la fianza está vigente."],
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
            Reparación de crédito en San Antonio — Preguntas frecuentes
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
            ¿Lista o listo para prepararte y comprar casa en San Antonio?
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Empieza con una auditoría gratis de 15 minutos. Te mostramos qué hay en tus reportes y cómo se ve el plan
            — sin compromiso y sin cargos por adelantado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/es-comprador"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-transform hover:scale-105 hover:bg-zinc-800"
            >
              Empezar mi análisis gratis
            </a>
            <a
              href="/credit-repair-san-antonio"
              hrefLang="en"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-8 py-4 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              View in English
            </a>
          </div>
          <p className="mt-6 text-xs text-zinc-500">Los resultados varían según cada caso. Clean Path Credit no garantiza resultados específicos.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
