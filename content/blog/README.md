# Blog Source — `content/blog/`

This directory holds the markdown sources for every blog post on cleanpathcredit.com.

The build script (`scripts/build-blog.ts`) reads these files at build time and generates static HTML at `public/blog/<slug>/index.html`, plus `public/sitemap.xml` and `public/feed.xml`. The generated files are gitignored (build artifacts); the markdown files in this directory are the source of truth.

## How to add a post

1. Copy `_template.md` to a new file. Filename convention: `<calendar-number>-<slug>.md` (matches the topic numbers in `docs/launch/blog-content-calendar.md`).

2. Fill in the frontmatter:

   ```yaml
   ---
   title: "Your post title"
   description: "150-160 char meta description with the main keyword in the first 100 chars"
   slug: "url-slug-here"
   publishedAt: "2026-05-09"
   author: "Clean Path Credit Team"
   tags: ["credit-repair", "fcra"]
   draft: true                  # flip to false when ready to ship
   related:
     - { slug: "another-post", anchor: "Another post — read this next" }
   ---
   ```

3. Write the body in markdown. Don't write your own closing CTA — the build script auto-injects the readiness-check CTA at the bottom of every post (consistency = better A/B testing).

4. **Use the FindQuestions voice-mode hack** for unique-enough-to-rank content:
   - Open ChatGPT or Claude
   - Paste this prompt: *"I'm writing a blog post answering [POST TITLE]. Ask me 10 questions, one at a time. Wait for my answer before asking the next question. Focus on practical actionable steps with realistic expectations and zero outcome guarantees. I'll answer in voice mode."*
   - Voice-mode answers are unique enough to rank — far more original than what you'd write at a keyboard
   - Have the model assemble the answers into a draft, then edit
   - See `docs/launch/blog-content-calendar.md` for per-post voice-mode prompts on Tier 1 topics

5. **Run the compliance gate before flipping `draft: false`:**
   - `/mirofish compliance-validation` on the title + intro + any factual claim
   - Attorney redline (first 3 Tier 1 posts; subsequent posts can inherit pattern unless new compliance terrain)

6. Build and preview locally:

   ```bash
   npm run build:blog          # generates HTML
   npx serve dist              # or any static server, then visit /blog/<slug>
   ```

   Or simpler — push the branch, let the Vercel preview deploy build it.

## Frontmatter reference

| Field | Required? | Notes |
|---|---|---|
| `title` | yes | Browser title + Google SERP. Aim for 50-60 chars. |
| `description` | yes | Meta description. 150-160 chars. Main keyword in first 100. |
| `slug` | yes | URL slug, no leading slash. Lowercase, hyphens, no dots. |
| `publishedAt` | yes | ISO date `YYYY-MM-DD`. |
| `updatedAt` | no | ISO date. Adds `<meta property="article:modified_time">`. |
| `author` | no | Defaults to "Clean Path Credit Team". |
| `tags` | no | Free-form array. Not currently surfaced in UI but used for future filtering. |
| `draft` | no | `true` excludes from sitemap/feed/index AND adds `noindex` robots tag. Defaults to `false`. |
| `ogImage` | no | Override the site default OG image. Use absolute URL. |
| `related` | no | Array of `{slug, anchor}` for the auto-generated "Related" block at the bottom of the post. |
| `canonical` | no | Override the canonical URL. Rare — only when republishing from another source. |

## What the build does for SEO

Every post gets:

- Server-rendered HTML (Bing + social card scrapers don't run JS)
- `<title>`, `<meta description>`, `<link rel=canonical>`
- Open Graph tags (og:title, og:description, og:image, og:url, og:type=article)
- Twitter Card tags (twitter:card=summary_large_image)
- `BlogPosting` schema.org JSON-LD
- `ProfessionalService` LocalBusiness schema (NAP-consistent with the GMB listing — Google connects the citations across the site, blog posts, and GMB)
- Auto-injected reading-time estimate
- Auto-injected closing CTA → `/` (readiness check)
- Compliance footer with Texas CSO Registration #, NAP, "results vary" disclaimer

Site root gets:

- `/sitemap.xml` listing every published post + main funnel pages
- `/feed.xml` RSS feed
- Both regenerated on every build

## Directory layout

```
content/blog/
├── README.md                  ← this file
├── _template.md               ← copy this for new posts (underscore prefix excludes from build)
├── 19-do-credit-repair-companies-guarantee-results.md   ← actual posts
├── 04-are-credit-repair-companies-actually-a-scam.md    ← (future)
└── 01-do-i-really-need-to-hire-someone.md               ← (future)
```

Files starting with `_` are excluded from the build (used for templates, drafts, internal-only docs).

## Files NOT in this directory

- `public/blog/*` — generated HTML output (gitignored)
- `public/sitemap.xml` — generated (gitignored)
- `public/feed.xml` — generated (gitignored)
- `docs/launch/blog-content-calendar.md` — the editorial roadmap (40 topics across 3 tiers + voice-mode prompts)

## Compliance reminders

- **No outcome guarantees** anywhere in copy (CROA §404)
- **No fabricated testimonials** — substantiation file required for any factual claim about a real client
- **No FICO score numbers** in title or first 200 words (Meta Special Ad Category trigger)
- **Spanish posts** point to `/es-comprador`, not `/`. Bilingual reviewer required before publish.
- **Texas CSO Registration #** auto-rendered in footer — set `CPC_TEXAS_CSO_NUMBER` env var in Vercel after registration is approved (until then the literal `[FILL IN AFTER APPROVAL]` placeholder appears as a visible flag that production isn't ready)
