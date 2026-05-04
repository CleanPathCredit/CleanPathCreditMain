/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /es-comprador — Spanish consumer-facing landing page.
 *
 * Dual-function page:
 *   1. B2B2C handoff — LO/agent hands the printed leave-behind to a
 *      Latino buyer at the moment of credit denial; this URL is the
 *      digital equivalent.
 *   2. B2C funnel destination — the URL that Spanish IG/TikTok/FB
 *      video ads point at.
 *
 * Written to a Mexican-American working-class first-time buyer avatar.
 * See docs/launch/spanish-consumer-onepager.md for the cultural-register
 * notes and the underlying source content.
 *
 * Compliance posture:
 *   - CROA §404(a)(3): no outcome guarantees. "60 a 90 días en
 *     promedio" is intentional, not "garantizado."
 *   - CROA §405: 3-day cancellation right disclosed in plain Spanish.
 *   - Texas Finance Code Ch. 393: CSO registration number must be
 *     filled into the footer before any paid traffic, ads, SMS, or
 *     printed leave-behinds point at this URL. Soliciting CSO
 *     services without registration is itself a violation.
 *   - CFPB UDAAP guidance: Spanish marketing requires Spanish
 *     disclosures. The Statement of Consumer Credit File Rights, the
 *     consumer contract, and the 3-day cancellation notice must all
 *     be available in Spanish before this page accepts conversions.
 *
 * Env knobs:
 *   - VITE_CALENDLY_URL_ES — Spanish-language Calendly URL. Falls
 *     back to the existing English audit-call URL if unset, so the
 *     page never ships with a broken CTA.
 *   - VITE_PUBLIC_SMS_NUMBER — SMS contact (defaults to current line).
 *   - VITE_PUBLIC_CONTACT_EMAIL — contact email (defaults to
 *     hello@cleanpathcredit.com).
 */

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  FileSearch,
  Users,
  Calendar,
  MessageSquare,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const CALENDLY_URL_ES =
  (import.meta.env.VITE_CALENDLY_URL_ES as string | undefined) ??
  "https://calendly.com/cleanpathcredit/free-15-min-credit-audit-strategy-call";

const SMS_NUMBER =
  (import.meta.env.VITE_PUBLIC_SMS_NUMBER as string | undefined) ?? "(346) 399-5606";

const CONTACT_EMAIL =
  (import.meta.env.VITE_PUBLIC_CONTACT_EMAIL as string | undefined) ?? "hello@cleanpathcredit.com";

// gtag is loaded globally by index.html; declare its window shape so
// the spanish_funnel_view event can be fired without a type error.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function EsComprador() {
  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.lang;
    document.title = "Clean Path Credit | Una casa para tu familia";
    document.documentElement.lang = "es";

    if (typeof window.gtag === "function") {
      window.gtag("event", "spanish_funnel_view", {
        page_location: "/es-comprador",
        language: "es",
      });
    }

    return () => {
      document.title = prevTitle;
      document.documentElement.lang = prevLang;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 sm:pb-0">
      {/* Header strip — keep the back-link and EN switcher minimal so the
          page reads as ad-conversion focused, not as part of a wider site. */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Clean Path Credit
          </Link>
          <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            English
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16 space-y-12 sm:space-y-16">
        {/* Hero */}
        <section className="text-center">
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">
            Programa bilingüe de preparación hipotecaria
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-900 leading-tight mb-4">
            Una casa para tu familia.
          </h1>
          <p className="text-xl sm:text-2xl text-zinc-600 mb-8">
            Empieza con tu crédito.
          </p>
          <a
            href={CALENDLY_URL_ES}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-emerald-600 text-white text-base font-semibold shadow-md hover:bg-emerald-700 transition-colors"
          >
            Reservar mi llamada gratis →
          </a>
          <p className="mt-3 text-sm text-zinc-500">
            15 minutos · En español · Sin compromiso
          </p>
        </section>

        {/* Section 1 — the pain in their voice */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-10 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-4">
            Has trabajado duro. Has pagado renta por años.
          </h2>
          <p className="text-lg text-zinc-700 leading-relaxed mb-3">
            Llevas años pagando $1,500, $2,000, $2,500 al mes en renta — dinero que no vuelve. Has cuidado a tus papás, a tus hijos, a tu familia. Has trabajado dos turnos, side jobs, lo que se necesita.
          </p>
          <p className="text-lg text-zinc-700 leading-relaxed mb-3">
            Y cuando llegas con el loan officer a preguntar por una casa, te dicen que tu credit score está muy bajo, que te falta historial, o que tu ingreso de cash no califica.
          </p>
          <p className="text-lg text-zinc-900 font-semibold leading-relaxed">
            No estás solo. Y eso está cambiando.
          </p>
        </section>

        {/* Section 2 — the opportunity (FICO 10T / VantageScore in plain Spanish) */}
        <section>
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3 text-center">
            Lo que cambió
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-6 text-center">
            Tu renta y tus biles ahora cuentan para calificar.
          </h2>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-6 sm:p-8">
            <p className="text-lg text-zinc-800 leading-relaxed mb-3">
              Por primera vez en más de 30 años, los pagos de tu <strong>renta</strong>, tu <strong>luz</strong>, tu <strong>agua</strong>, tu <strong>internet</strong>, y tus <strong>biles mensuales</strong> ahora sí cuentan para calificar para una hipoteca.
            </p>
            <p className="text-lg text-zinc-800 leading-relaxed mb-3">
              Fannie Mae y Freddie Mac — los dos prestamistas más grandes del país — están aceptando los nuevos puntajes de crédito (FICO 10T y VantageScore 4.0) que sí ven cómo vives, no solo si tienes tarjetas de crédito.
            </p>
            <p className="text-lg text-zinc-900 font-semibold leading-relaxed">
              Para muchos en nuestra comunidad, esto es lo más cerca que hemos estado de la casa propia.
            </p>
          </div>
        </section>

        {/* Section 3 — what Clean Path does */}
        <section>
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3 text-center">
            Qué hacemos
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-3 text-center">
            Te preparamos para calificar — paso a paso, en español.
          </h2>
          <p className="text-center text-zinc-600 mb-8">
            En 60 a 90 días en promedio.
          </p>
          <ul className="space-y-4">
            {[
              "Revisamos tu reporte de crédito de los tres burós (Equifax, Experian, TransUnion). Gratis, sin compromiso.",
              "Disputamos los errores que están bajando tu puntaje: medical bills viejos, cuentas que no son tuyas, fechas mal reportadas, cuentas pagadas que siguen apareciendo.",
              "Reportamos tu renta a los burós para que cuente como pago a tiempo (a través de servicios como Esusu, Boom, o RentReporters).",
              "Te conectamos con un loan officer (LO) que entiende a familias Latinas — bilingüe, con experiencia con FHA, ITIN, e ingresos no tradicionales.",
              "Te llamamos o te mandamos texto cada semana: qué se quitó, qué falta, cuándo estás listo para aplicar a la hipoteca.",
              "Todo en español. El contrato, las cartas, las disputas, las llamadas.",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-lg text-zinc-700 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 4 — explicit acknowledgments (the highest-trust block
            for ITIN borrowers, cash-income earners, mixed-status families) */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-10 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">
            Trabajamos con familias como la tuya
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-6">
            Tu situación no es un problema. Es lo normal en nuestra comunidad.
          </h2>
          <ul className="space-y-5">
            {[
              {
                q: "¿Tienes ITIN en lugar de Social Security?",
                a: "Sí, te ayudamos. Hay préstamos hipotecarios específicamente para borrowers con ITIN — te conectamos con los LOs que los hacen.",
              },
              {
                q: "¿Tu ingreso es de cash, side jobs, o múltiples trabajos?",
                a: "Sí, hay formas de calificar. Te ayudamos a documentarlo correctamente para que el LO lo pueda usar.",
              },
              {
                q: "¿Vives con tus papás, hermanos, o tienes una familia mixta?",
                a: "Sin problema. La hipoteca puede ser para uno, dos, o más miembros de la familia.",
              },
              {
                q: "¿Mandas dinero a la familia en México u otro país?",
                a: "Eso afecta tu DTI — lo sabemos y lo planeamos contigo.",
              },
              {
                q: "¿Nunca has tenido tarjeta de crédito?",
                a: "No es un obstáculo. Los nuevos puntajes (FICO 10T) cuentan tu renta y tus biles — no necesitas tarjetas.",
              },
            ].map((item) => (
              <li key={item.q}>
                <div className="font-semibold text-zinc-900 mb-1">{item.q}</div>
                <div className="text-zinc-700">{item.a}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 5 — trust block: "diferentes a las compañías de la radio" */}
        <section>
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3 text-center">
            Diferentes a las compañías de la radio
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-4 text-center">
            ¿Por qué somos diferentes?
          </h2>
          <p className="text-zinc-600 mb-3 max-w-2xl mx-auto text-center">
            Sabemos que las has escuchado. Las que prometen “borrar tu crédito malo en 30 días” y luego te cobran $2,000 por adelantado y desaparecen. Las que llaman a tus papás y les dicen que firmen sin entender el contrato.
          </p>
          <p className="text-zinc-700 mb-8 max-w-2xl mx-auto text-center font-semibold">
            Nosotros operamos diferente — y no es opción nuestra, es la ley:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "Sin pagos por adelantado",
                body: "Por ley federal (CROA), no podemos cobrarte ni un dólar por adelantado. Cobramos solo después de que ves resultados documentados.",
              },
              {
                icon: Calendar,
                title: "3 días para cancelar",
                body: "Tienes 3 días hábiles para cancelar el contrato sin pagar nada — sin preguntas.",
              },
              {
                icon: Users,
                title: "Una persona, todo el camino",
                body: "Una persona se encarga de tu caso de principio a fin. No te van a pasar de agent en agent.",
              },
              {
                icon: FileSearch,
                title: "Reporte por escrito cada semana",
                body: "Ves todas las cartas que enviamos a los burós, todas las respuestas que recibimos, y qué sigue.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-xl border border-zinc-200 p-5">
                <Icon className="h-6 w-6 text-emerald-600 mb-3" />
                <div className="font-semibold text-zinc-900 mb-1">{title}</div>
                <div className="text-sm text-zinc-700">{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6 — primary CTA */}
        <section className="bg-emerald-600 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-4xl font-semibold mb-3">Próximo paso</h2>
          <p className="text-lg sm:text-xl opacity-90 mb-2">
            Llamada gratis de 15 minutos. En español. Sin compromiso.
          </p>
          <p className="opacity-80 mb-8">
            Te avisamos en 48 horas si te podemos ayudar y aproximadamente cuánto tiempo tomaría.
          </p>
          <a
            href={CALENDLY_URL_ES}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-white text-emerald-700 text-base font-semibold shadow-md hover:bg-emerald-50 transition-colors"
          >
            Reservar mi llamada gratis →
          </a>
          <div className="mt-8 flex flex-col sm:flex-row sm:justify-center gap-4 sm:gap-8 text-sm opacity-90">
            <a
              href={`sms:${SMS_NUMBER.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center justify-center gap-2 hover:opacity-100"
            >
              <MessageSquare className="h-4 w-4" />
              Texto: {SMS_NUMBER}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 hover:opacity-100"
            >
              <Mail className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>

        {/* Compliance footer (Spanish) */}
        <section className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-200 pt-8">
          <p className="mb-3">
            <strong>Clean Path Credit</strong> — Restauración de Crédito y Preparación Hipotecaria.
          </p>
          <p className="mb-3">
            Cumplimos con la Credit Repair Organizations Act (CROA), la Fair Credit Reporting Act (FCRA), y el Texas Finance Code Capítulo 393.
            <br />
            Registro CSO de Texas: <strong>#[pendiente de aprobación]</strong> · Fianza (Surety Bond): <strong>[pendiente]</strong>
          </p>
          <p className="italic">
            Aviso legal: Clean Path Credit no garantiza ningún cambio específico en el puntaje de crédito, eliminación de cuentas, aprobación de préstamo, o ahorro en tasas de interés. La ley federal (CROA §404) prohíbe esas garantías. Los resultados individuales dependen de la exactitud de la información reportada, los tiempos de respuesta de los acreedores y burós, tu participación continua en el programa, y otros factores fuera de nuestro control.
          </p>
        </section>
      </main>

      {/* Sticky bottom CTA bar — mobile only. This avatar lives on phone;
          the persistent CTA is the single biggest mobile-conversion move. */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-zinc-200 px-4 py-3 sm:hidden shadow-lg">
        <div className="flex gap-2">
          <a
            href={CALENDLY_URL_ES}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center h-12 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
          >
            Llamada gratis →
          </a>
          <a
            href={`sms:${SMS_NUMBER.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center justify-center h-12 px-4 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-semibold"
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Texto
          </a>
        </div>
      </div>
    </div>
  );
}
