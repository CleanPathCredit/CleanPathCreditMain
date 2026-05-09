/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Build-time blog generator.
 *
 * Reads markdown sources from `content/blog/*.md`, renders them to
 * server-rendered static HTML, and writes them to
 * `public/blog/<slug>/index.html`. Also generates `public/sitemap.xml`
 * and `public/feed.xml`.
 *
 * Why static HTML, not React-rendered:
 *   - Bing's crawler does not execute JavaScript reliably.
 *   - Twitter / Facebook / LinkedIn card scrapers do not execute JS.
 *   - Google CAN execute JS but treats SSR/static as higher-confidence
 *     content for ranking purposes.
 *   - Initial paint is faster (no JS bundle to download/parse).
 *
 * Why not MDX:
 *   - Posts are content-first, with prose + occasional images + links +
 *     an internal-link block at the bottom. No React components needed.
 *   - Plain markdown keeps the contributor surface near-zero (anyone can
 *     edit a .md file, no JSX learning).
 *
 * Run:
 *   npm run build:blog                  # one-shot
 *   (auto-runs as part of `npm run build` via the `prebuild` hook)
 *
 * Output is gitignored under public/blog/, public/sitemap.xml,
 * public/feed.xml — sources of truth are content/blog/*.md.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import readingTime from "reading-time";

// ---- Paths ------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SRC_DIR   = join(REPO_ROOT, "content", "blog");
const OUT_DIR   = join(REPO_ROOT, "public", "blog");
const SITE_URL  = "https://cleanpathcredit.com";

// ---- Branding (kept inline so the script is self-contained) -----------

const BRAND = {
  name:     "Clean Path Credit",
  phone:    "+1-346-399-5606",
  phoneDisplay: "(346) 399-5606",
  email:    "hello@cleanpathcredit.com",
  city:     "San Antonio",
  region:   "TX",
  country:  "US",
  ogImage:  `${SITE_URL}/og-image.png`,
  // Texas CSO Registration # — fill in the env var after registration
  // is approved. Until then the literal placeholder remains visible
  // (intentional — visible flag that production isn't ready yet).
  csoNumber: process.env.CPC_TEXAS_CSO_NUMBER ?? "[FILL IN AFTER APPROVAL]",
};

// ---- Frontmatter contract ---------------------------------------------

interface PostFrontmatter {
  title:        string;
  description:  string;            // ~150-160 char meta description
  slug:         string;            // URL slug, no leading slash
  publishedAt:  string;            // ISO date YYYY-MM-DD
  updatedAt?:   string;
  author?:      string;            // defaults to "Clean Path Credit Team"
  tags?:        string[];
  /**
   * `draft: true` excludes the post from sitemap/feed AND adds a
   * <meta name="robots" content="noindex"> tag. Useful for
   * pre-publish review on the live URL without ranking risk.
   */
  draft?:       boolean;
  /** Override OG image. Falls back to the site default. */
  ogImage?:     string;
  /** Internal-link block — array of {slug, anchor} for "related posts". */
  related?:     { slug: string; anchor: string }[];
  /** Override the canonical URL (rare — used when republishing). */
  canonical?:   string;
}

interface PostInput extends PostFrontmatter {
  bodyMd:    string;
  bodyHtml:  string;
  readMinutes: number;
}

// ---- Markdown rendering -----------------------------------------------

marked.setOptions({
  // GFM tables, fenced code, etc. — sane defaults for prose blogs.
  gfm:    true,
  breaks: false,
});

// ---- HTML page template -----------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type":    "ProfessionalService",
    name:       BRAND.name,
    image:      BRAND.ogImage,
    url:        SITE_URL,
    telephone:  BRAND.phone,
    email:      BRAND.email,
    address: {
      "@type":       "PostalAddress",
      addressLocality: BRAND.city,
      addressRegion: BRAND.region,
      addressCountry: BRAND.country,
    },
    areaServed:  "TX",
    description: "Texas-based credit-services organization. CROA-compliant credit-readiness program for first-time homebuyers and credit-challenged consumers.",
  };
}

function blogPostingSchema(post: PostInput): Record<string, unknown> {
  return {
    "@context":     "https://schema.org",
    "@type":        "BlogPosting",
    mainEntityOfPage: {
      "@type":   "WebPage",
      "@id":     `${SITE_URL}/blog/${post.slug}`,
    },
    headline:       post.title,
    description:    post.description,
    image:          post.ogImage ?? BRAND.ogImage,
    datePublished:  post.publishedAt,
    dateModified:   post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name:    post.author ?? `${BRAND.name} Team`,
      url:     SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name:    BRAND.name,
      logo: {
        "@type": "ImageObject",
        url:     BRAND.ogImage,
      },
    },
  };
}

function renderRelatedBlock(related: PostFrontmatter["related"]): string {
  if (!related || related.length === 0) return "";
  const items = related
    .map(
      (r) => `<li><a href="/blog/${escapeHtml(r.slug)}">${escapeHtml(r.anchor)}</a></li>`,
    )
    .join("\n");
  return `
    <section class="related" aria-label="Related posts">
      <h2>Related</h2>
      <ul>
        ${items}
      </ul>
    </section>`;
}

function renderPostHtml(post: PostInput): string {
  const canonical = post.canonical ?? `${SITE_URL}/blog/${post.slug}`;
  const ogImage   = post.ogImage   ?? BRAND.ogImage;
  const indexable = !post.draft;

  const localSchemaJson = JSON.stringify(localBusinessSchema());
  const postSchemaJson  = JSON.stringify(blogPostingSchema(post));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.title)} — ${escapeHtml(BRAND.name)}</title>
  <meta name="description" content="${escapeHtml(post.description)}" />
  <meta name="author" content="${escapeHtml(post.author ?? `${BRAND.name} Team`)}" />
  ${indexable ? "" : '<meta name="robots" content="noindex,nofollow" />'}
  <link rel="canonical" href="${canonical}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(post.title)}" />
  <meta property="og:description" content="${escapeHtml(post.description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="${escapeHtml(BRAND.name)}" />
  <meta property="article:published_time" content="${escapeHtml(post.publishedAt)}" />
  ${post.updatedAt ? `<meta property="article:modified_time" content="${escapeHtml(post.updatedAt)}" />` : ""}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(post.title)}" />
  <meta name="twitter:description" content="${escapeHtml(post.description)}" />
  <meta name="twitter:image" content="${ogImage}" />

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  <script type="application/ld+json">${localSchemaJson}</script>
  <script type="application/ld+json">${postSchemaJson}</script>

  <style>
    :root {
      --emerald: #0a6e3d;
      --emerald-50: #f0fdf4;
      --zinc-900: #18181b;
      --zinc-700: #3f3f46;
      --zinc-500: #71717a;
      --zinc-300: #d4d4d8;
      --zinc-100: #f4f4f5;
      --zinc-50:  #fafafa;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      color: var(--zinc-900);
      background: #fff;
      font-size: 17px;
      line-height: 1.7;
    }
    .topbar {
      border-bottom: 1px solid var(--zinc-100);
      background: #fff;
    }
    .topbar-inner {
      max-width: 720px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .topbar a {
      color: var(--zinc-700);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    .topbar a:hover { color: var(--emerald); }
    .brand-name { color: var(--zinc-900); font-weight: 700; }
    article {
      max-width: 720px;
      margin: 0 auto;
      padding: 56px 24px 80px;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      font-weight: 700;
      color: var(--emerald);
      margin-bottom: 12px;
    }
    h1 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 42px;
      line-height: 1.1;
      margin: 0 0 16px;
      letter-spacing: -0.01em;
    }
    .meta {
      color: var(--zinc-500);
      font-size: 14px;
      margin-bottom: 36px;
    }
    article h2 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 28px;
      margin: 40px 0 14px;
    }
    article h3 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 22px;
      margin: 32px 0 10px;
    }
    article p { margin: 0 0 18px; }
    article a { color: var(--emerald); }
    article a:hover { text-decoration: underline; }
    article ul, article ol { padding-left: 24px; margin: 0 0 18px; }
    article li { margin-bottom: 6px; }
    article blockquote {
      margin: 24px 0;
      padding: 14px 20px;
      border-left: 3px solid var(--emerald);
      background: var(--emerald-50);
      color: #14532d;
      font-size: 16px;
      border-radius: 2px;
    }
    article code {
      background: var(--zinc-100);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 14px;
      font-family: "JetBrains Mono", Menlo, Consolas, monospace;
    }
    article pre {
      background: var(--zinc-100);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 14px;
    }
    article hr {
      border: none;
      border-top: 1px solid var(--zinc-100);
      margin: 40px 0;
    }
    .related {
      margin-top: 56px;
      padding-top: 24px;
      border-top: 1px solid var(--zinc-100);
    }
    .related h2 {
      font-size: 20px;
      margin: 0 0 12px;
    }
    .related ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .related li { margin-bottom: 8px; }
    .related a { font-weight: 600; }
    .cta-block {
      margin-top: 56px;
      padding: 28px;
      background: var(--zinc-50);
      border: 1px solid var(--zinc-100);
      border-radius: 12px;
      text-align: center;
    }
    .cta-block h3 {
      margin: 0 0 8px;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 22px;
    }
    .cta-block p {
      margin: 0 0 16px;
      color: var(--zinc-700);
      font-size: 15px;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background: var(--zinc-900);
      color: #fff;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 600;
      font-size: 15px;
    }
    .cta-button:hover { background: var(--emerald); }
    footer.site {
      border-top: 1px solid var(--zinc-100);
      padding: 32px 24px;
      max-width: 720px;
      margin: 0 auto;
      color: var(--zinc-500);
      font-size: 13px;
      line-height: 1.6;
    }
    footer.site .nap { color: var(--zinc-700); margin-bottom: 8px; }
    footer.site .compliance { font-style: italic; margin-top: 12px; }
    @media (max-width: 600px) {
      h1 { font-size: 32px; }
      article { padding: 36px 20px 60px; }
    }
  </style>
</head>
<body>

<header class="topbar">
  <div class="topbar-inner">
    <a href="/" class="brand-name">${escapeHtml(BRAND.name)}</a>
    <nav><a href="/blog/">Blog</a></nav>
  </div>
</header>

<article>
  <div class="eyebrow">Clean Path Blog</div>
  <h1>${escapeHtml(post.title)}</h1>
  <div class="meta">
    Published ${escapeHtml(post.publishedAt)}${post.updatedAt && post.updatedAt !== post.publishedAt ? ` · Updated ${escapeHtml(post.updatedAt)}` : ""} · ${post.readMinutes} min read
  </div>

  ${post.bodyHtml}

  <aside class="cta-block">
    <h3>Find out where you stand — free, 60 seconds.</h3>
    <p>Take the Clean Path readiness check. No credit pull. No commitment. Just a real answer about your timeline to mortgage-ready.</p>
    <a href="/" class="cta-button">Take the readiness check →</a>
  </aside>

  ${renderRelatedBlock(post.related)}
</article>

<footer class="site">
  <div class="nap">
    <strong>${escapeHtml(BRAND.name)}</strong> · <a href="${SITE_URL}" style="color:inherit">cleanpathcredit.com</a> · <a href="tel:${BRAND.phone}" style="color:inherit">${escapeHtml(BRAND.phoneDisplay)}</a> · <a href="mailto:${BRAND.email}" style="color:inherit">${escapeHtml(BRAND.email)}</a> · ${escapeHtml(BRAND.city)}, ${escapeHtml(BRAND.region)}
  </div>
  <div>Texas CSO Registration #${escapeHtml(BRAND.csoNumber)} · CROA / FCRA / RESPA / TSR Compliant</div>
  <div class="compliance">
    Results vary. ${escapeHtml(BRAND.name)} does not guarantee specific credit-score outcomes or loan qualification. You have the right to dispute inaccurate information on your credit report at no cost.
  </div>
</footer>

</body>
</html>
`;
}

// ---- Index page (lists all published posts) --------------------------

function renderIndexHtml(posts: PostInput[]): string {
  const visible = posts
    .filter((p) => !p.draft)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const items = visible
    .map(
      (p) => `
      <li class="post-card">
        <a href="/blog/${escapeHtml(p.slug)}">
          <h2>${escapeHtml(p.title)}</h2>
          <p class="desc">${escapeHtml(p.description)}</p>
          <p class="meta">${escapeHtml(p.publishedAt)} · ${p.readMinutes} min read</p>
        </a>
      </li>`,
    )
    .join("\n");

  const localSchemaJson = JSON.stringify(localBusinessSchema());

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog — ${escapeHtml(BRAND.name)}</title>
  <meta name="description" content="Practical, compliance-aware credit-readiness writing from Clean Path Credit. FICO 10T, VantageScore 4.0, FCRA disputes, ITIN/cash-income paths, and the difference between credit repair and credit counseling." />
  <link rel="canonical" href="${SITE_URL}/blog/" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Blog — ${escapeHtml(BRAND.name)}" />
  <meta property="og:url" content="${SITE_URL}/blog/" />
  <meta property="og:image" content="${BRAND.ogImage}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(BRAND.name)} Blog" href="/feed.xml" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  <script type="application/ld+json">${localSchemaJson}</script>

  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      color: #18181b;
      background: #fff;
      font-size: 17px;
      line-height: 1.7;
    }
    .topbar {
      border-bottom: 1px solid #f4f4f5;
    }
    .topbar-inner {
      max-width: 720px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .topbar a {
      color: #3f3f46;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    .topbar a:hover { color: #0a6e3d; }
    .brand-name { color: #18181b; font-weight: 700; }

    .hero {
      max-width: 720px;
      margin: 0 auto;
      padding: 56px 24px 24px;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      font-weight: 700;
      color: #0a6e3d;
      margin-bottom: 12px;
    }
    h1 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 42px;
      line-height: 1.1;
      margin: 0 0 14px;
      letter-spacing: -0.01em;
    }
    .hero p { color: #3f3f46; margin: 0; }

    .post-list {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 24px 80px;
      list-style: none;
    }
    .post-card {
      border-top: 1px solid #f4f4f5;
      padding: 24px 0;
    }
    .post-card a {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .post-card h2 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 26px;
      margin: 0 0 8px;
      color: #18181b;
    }
    .post-card a:hover h2 { color: #0a6e3d; }
    .post-card .desc { margin: 0 0 8px; color: #3f3f46; font-size: 15px; }
    .post-card .meta { margin: 0; color: #71717a; font-size: 13px; }

    .empty {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 24px 80px;
      color: #71717a;
      font-style: italic;
    }

    footer.site {
      border-top: 1px solid #f4f4f5;
      padding: 32px 24px;
      max-width: 720px;
      margin: 0 auto;
      color: #71717a;
      font-size: 13px;
      line-height: 1.6;
    }
    footer.site .nap { color: #3f3f46; margin-bottom: 8px; }
    footer.site .compliance { font-style: italic; margin-top: 12px; }
    @media (max-width: 600px) {
      h1 { font-size: 32px; }
    }
  </style>
</head>
<body>

<header class="topbar">
  <div class="topbar-inner">
    <a href="/" class="brand-name">${escapeHtml(BRAND.name)}</a>
    <nav><a href="/">Home</a></nav>
  </div>
</header>

<section class="hero">
  <div class="eyebrow">Clean Path Blog</div>
  <h1>Practical, compliance-aware writing on credit and homeownership.</h1>
  <p>FICO 10T &amp; VantageScore 4.0, FCRA dispute frameworks, the real difference between credit repair and credit counseling, and how the 2026 mortgage landscape changed for first-time buyers.</p>
</section>

${visible.length === 0
  ? '<div class="empty">No posts yet. New posts ship to the calendar in <code>docs/launch/blog-content-calendar.md</code>.</div>'
  : `<ul class="post-list">\n${items}\n</ul>`
}

<footer class="site">
  <div class="nap">
    <strong>${escapeHtml(BRAND.name)}</strong> · <a href="${SITE_URL}" style="color:inherit">cleanpathcredit.com</a> · <a href="tel:${BRAND.phone}" style="color:inherit">${escapeHtml(BRAND.phoneDisplay)}</a> · <a href="mailto:${BRAND.email}" style="color:inherit">${escapeHtml(BRAND.email)}</a> · ${escapeHtml(BRAND.city)}, ${escapeHtml(BRAND.region)}
  </div>
  <div>Texas CSO Registration #${escapeHtml(BRAND.csoNumber)} · CROA / FCRA / RESPA / TSR Compliant</div>
  <div class="compliance">
    Results vary. ${escapeHtml(BRAND.name)} does not guarantee specific credit-score outcomes or loan qualification.
  </div>
</footer>

</body>
</html>
`;
}

// ---- Sitemap + RSS ----------------------------------------------------

function renderSitemapXml(posts: PostInput[]): string {
  const staticUrls = [
    { loc: `${SITE_URL}/`,            changefreq: "weekly",  priority: "1.0" },
    { loc: `${SITE_URL}/how-it-works`, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE_URL}/partners`,    changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE_URL}/es-comprador`, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE_URL}/blog/`,        changefreq: "weekly",  priority: "0.9" },
    { loc: `${SITE_URL}/terms`,       changefreq: "yearly",  priority: "0.3" },
    { loc: `${SITE_URL}/privacy`,     changefreq: "yearly",  priority: "0.3" },
  ];

  const visiblePosts = posts.filter((p) => !p.draft);

  const urls = [
    ...staticUrls.map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    ),
    ...visiblePosts.map(
      (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.slug}</loc>
    <lastmod>${p.updatedAt ?? p.publishedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
    ),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function renderRssXml(posts: PostInput[]): string {
  const visiblePosts = posts
    .filter((p) => !p.draft)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const items = visiblePosts
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid>${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${escapeHtml(p.description)}</description>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(BRAND.name)} Blog</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Practical, compliance-aware writing on credit and homeownership from ${escapeHtml(BRAND.name)}.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
}

// ---- Pipeline ---------------------------------------------------------

async function build(): Promise<void> {
  if (!existsSync(SRC_DIR)) {
    console.warn(`[build-blog] No content directory at ${SRC_DIR} — nothing to build.`);
    return;
  }

  const files = readdirSync(SRC_DIR).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md",
  );

  if (files.length === 0) {
    console.warn(`[build-blog] No posts found in ${SRC_DIR}.`);
  }

  const posts: PostInput[] = [];
  for (const file of files) {
    const fullPath = join(SRC_DIR, file);
    const raw      = readFileSync(fullPath, "utf8");
    const parsed   = matter(raw);
    const fm       = parsed.data as Partial<PostFrontmatter>;

    if (!fm.title || !fm.description || !fm.slug || !fm.publishedAt) {
      console.error(`[build-blog] Skipping ${file} — missing required frontmatter (title, description, slug, publishedAt).`);
      continue;
    }

    const bodyMd   = parsed.content;
    const bodyHtml = await marked.parse(bodyMd);
    const stats    = readingTime(bodyMd);
    const post: PostInput = {
      title:        fm.title,
      description:  fm.description,
      slug:         fm.slug,
      publishedAt:  fm.publishedAt,
      updatedAt:    fm.updatedAt,
      author:       fm.author,
      tags:         fm.tags,
      draft:        fm.draft ?? false,
      ogImage:      fm.ogImage,
      related:      fm.related,
      canonical:    fm.canonical,
      bodyMd,
      bodyHtml,
      readMinutes:  Math.max(1, Math.round(stats.minutes)),
    };
    posts.push(post);
  }

  // Write each post.
  mkdirSync(OUT_DIR, { recursive: true });
  for (const post of posts) {
    const postDir = join(OUT_DIR, post.slug);
    mkdirSync(postDir, { recursive: true });
    writeFileSync(join(postDir, "index.html"), renderPostHtml(post), "utf8");
    console.log(`[build-blog] ✓ ${post.draft ? "(draft) " : ""}/blog/${post.slug}`);
  }

  // Index page.
  writeFileSync(join(OUT_DIR, "index.html"), renderIndexHtml(posts), "utf8");
  console.log(`[build-blog] ✓ /blog/ (index, ${posts.filter((p) => !p.draft).length} visible / ${posts.length} total)`);

  // Sitemap + RSS at site root.
  writeFileSync(join(REPO_ROOT, "public", "sitemap.xml"), renderSitemapXml(posts), "utf8");
  writeFileSync(join(REPO_ROOT, "public", "feed.xml"),    renderRssXml(posts),    "utf8");
  console.log(`[build-blog] ✓ /sitemap.xml + /feed.xml`);

  console.log(`[build-blog] Done. ${posts.length} post(s) processed.`);
}

build().catch((err) => {
  console.error("[build-blog] FAILED:", err);
  process.exit(1);
});
