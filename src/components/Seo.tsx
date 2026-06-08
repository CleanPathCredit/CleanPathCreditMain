/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Per-route document metadata via React 19's native metadata hoisting.
 * Rendering <title>/<meta>/<link> anywhere in the component tree hoists
 * them into <head> automatically (React 19 "Document Metadata"). The
 * post-build prerender step (scripts/prerender.mjs) captures these into
 * each public route's static HTML, so crawlers get unique per-page meta.
 *
 * NOTE: the static <title>/<meta name="description">/<link rel="canonical">
 * AND the per-page Open Graph / Twitter tags (og:title, og:description,
 * og:url, og:type, twitter:title, twitter:description) were removed from
 * index.html so these per-page tags are the single source of truth (avoids
 * duplicate-tag conflicts). Only the CONSTANT social tags (og:image,
 * og:image:width/height, twitter:card, twitter:image) remain static in
 * index.html, since they're identical on every page.
 */
interface SeoProps {
  /** Page <title>. Keep CROA-safe: no guarantees / "remove" / fixed timeframes. */
  title: string;
  /** Meta description (~150-160 chars). */
  description: string;
  /** Absolute canonical URL, e.g. https://cleanpathcredit.com/how-it-works */
  canonical: string;
  /** Set on noindex pages (e.g. /sms-consent). */
  noindex?: boolean;
  /** hreflang alternates, e.g. [{ hreflang: "es", href: "https://.../es/..." }]. */
  alternates?: { hreflang: string; href: string }[];
  /** Open Graph type — "website" (default) for pages, "article" for blog posts. */
  ogType?: string;
}

export function Seo({ title, description, canonical, noindex, alternates, ogType = "website" }: SeoProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
      {/* Per-page Open Graph + Twitter. Constant og:image / twitter:card /
          twitter:image live in index.html (identical on every page). */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {alternates?.map((a) => (
        <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={a.href} />
      ))}
    </>
  );
}
