/**
 * IndexNow submitter — pings IndexNow (Bing, Yandex, Seznam, Naver) to crawl
 * our URLs immediately instead of waiting for organic discovery.
 *
 * Run after a content deploy:  npm run indexnow
 *
 * NOTE: Google does NOT use IndexNow (it has its own pipeline — use GSC
 * "Request Indexing" for Google). But Bing powers ChatGPT Search and Copilot,
 * so fast Bing indexing has real GEO value beyond Bing's own market share.
 *
 * Ownership is proven by the key file served at:
 *   https://cleanpathcredit.com/<KEY>.txt   (public/<KEY>.txt)
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = 'a3f9c1e7b2d84056f1a9c3e5b7d2048f';
const HOST = 'cleanpathcredit.com';
const SITEMAP = join(process.cwd(), 'public', 'sitemap.xml');

async function main() {
  let xml;
  try {
    xml = await readFile(SITEMAP, 'utf8');
  } catch (e) {
    console.warn('[indexnow] could not read sitemap:', e.message);
    return;
  }

  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urlList.length === 0) {
    console.warn('[indexnow] no <loc> URLs found in sitemap — nothing to submit');
    return;
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    // 200 = accepted, 202 = accepted (pending verification). Both are success.
    console.log(`[indexnow] submitted ${urlList.length} URLs — HTTP ${res.status} ${res.statusText}`);
    if (res.status >= 400) {
      const text = await res.text().catch(() => '');
      console.warn('[indexnow] non-success response body:', text.slice(0, 300));
    }
  } catch (e) {
    console.warn('[indexnow] submit failed (non-blocking):', e.message);
  }
}

main();
