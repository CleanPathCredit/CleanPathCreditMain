/**
 * Renders a JSON-LD <script> tag for per-page structured data (LocalBusiness,
 * FAQPage, etc.). Rendered in the page body — search engines and AI crawlers
 * parse ld+json anywhere in the document, and the prerender step captures it
 * into the static HTML. Sitewide Organization/Service schema lives in
 * index.html; this is for page-specific schema.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inject; no user input is included.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
