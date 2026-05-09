---
title: "Replace with the post title (will appear in browser tab + Google SERP)"
description: "150-160 character meta description. Should answer 'what will I learn?' in one sentence with the main keyword in the first 100 chars."
slug: "url-slug-here-no-leading-slash"
publishedAt: "2026-05-09"
# updatedAt: "2026-05-15"   # uncomment when you edit a published post
author: "Clean Path Credit Team"
tags: ["credit-repair", "fcra"]
# Set draft: true to render the post but exclude it from the index, sitemap,
# and feed. Adds a noindex robots tag. Useful for preview-link review.
draft: true
# Optional — falls back to /og-image.png at site level if unset.
# ogImage: "https://cleanpathcredit.com/og/post-slug.png"
# Internal-link block at the bottom of the post.
related:
  - { slug: "another-post-slug", anchor: "Another post — read this next" }
---

Open with a 1-paragraph hook that names the reader's situation in their words. Don't bury the lede — the reader is here because they Googled a question, give them a clear answer in the first 60 seconds.

## Use H2 for major sections

Body copy. Markdown is fully supported.

- Lists work
- Bold (`**bold**`) and italic (`*italic*`) work
- Inline code with backticks
- [Links](https://example.com) work
- Internal links to other Clean Path pages: [/quiz](/) and [/partners](/partners)

### H3 for sub-sections

Continue.

> Block quotes render as a green-accented callout. Use them sparingly for the **one** key insight per section.

```
Code blocks render in a monospace box.
```

---

## Compliance posture for every post

- No outcome guarantees ("may", "average", "designed to" — never "will" / "guaranteed" / "in 30 days")
- No fabricated testimonials (FTC Endorsement Guides 16 CFR Part 255)
- No FICO score numbers in the title or first 200 words
- "Results vary" disclaimer is auto-added in the page footer — don't duplicate it in the body
- Texas CSO Registration # is auto-added in the page footer
- Run `/mirofish compliance-validation` on the title + intro + closing CTA before publishing

## Closing

The build script auto-injects a CTA block at the end of every post linking to the readiness check at `/`. Don't write your own CTA at the end of the body — the auto-injected one is the one that's been A/B tested.
