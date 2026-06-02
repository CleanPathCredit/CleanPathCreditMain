/**
 * Post-build prerender for the Vite/React SPA.
 *
 * WHY: the app is client-rendered, so crawlers receive an empty <div id="root">.
 * This step builds the SPA normally (vite build), serves dist/ locally, opens
 * each PUBLIC route in headless Chrome, waits for React to render real content
 * (including React 19 hoisted <title>/<meta>), and saves the resulting HTML as
 * dist/<route>/index.html. Vercel serves those static files directly (rewrites
 * run after the filesystem), while the SPA fallback still covers authed routes.
 *
 * Router/provider-agnostic: touches zero app code. Pages still hydrate into the
 * live React app for users.
 *
 * GRACEFUL: any failure (Chromium missing on CI, route timeout) logs a warning
 * and exits 0 — the deploy still ships the working SPA, just without prerender.
 *
 * Only PUBLIC, indexable routes are listed. Authed/noindex routes (/dashboard,
 * /admin, /login, /register, /welcome, /sms-consent) are intentionally excluded
 * and continue to serve via the SPA fallback.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const PORT = 4178;
const ROUTES = [
  '/',
  '/how-it-works',
  '/unlock',
  '/privacy',
  '/terms',
  '/es-comprador',
  '/partners',
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
  '.map': 'application/json',
};

async function startServer(template) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const ext = extname(urlPath);
        // Serve a real static asset if it exists and has an extension.
        if (ext && existsSync(join(DIST, urlPath))) {
          const data = await readFile(join(DIST, urlPath));
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          res.end(data);
          return;
        }
        // SPA fallback: serve the IN-MEMORY original template (not re-read from
        // disk) so prerendering '/' can't poison later routes' fallback.
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(template);
      } catch {
        res.writeHead(500);
        res.end('error');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html not found — skipping prerender');
    return;
  }

  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
    console.warn('[prerender] puppeteer unavailable — shipping SPA without prerender:', e.message);
    return;
  }

  const template = await readFile(join(DIST, 'index.html'));
  const server = await startServer(template);

  let browser;
  let ok = 0;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const route of ROUTES) {
      const page = await browser.newPage();
      try {
        await page.goto(`http://localhost:${PORT}${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        // Wait for the lazy route chunk to mount real text (not the spinner).
        await page.waitForFunction(
          () => {
            const r = document.getElementById('root');
            return r && r.innerText && r.innerText.replace(/\s+/g, ' ').trim().length > 500;
          },
          { timeout: 20000 },
        );
        // Settle: let React 19 hoist metadata + any late content paint.
        await new Promise((r) => setTimeout(r, 800));

        const html = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML));
        const outDir = route === '/' ? DIST : join(DIST, route);
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, 'index.html'), html, 'utf8');
        ok += 1;
        console.log(`[prerender] ✓ ${route}  (${html.length.toLocaleString()} bytes)`);
      } catch (e) {
        console.warn(`[prerender] ✗ ${route}: ${e.message}`);
      } finally {
        await page.close();
      }
    }
  } catch (e) {
    console.warn('[prerender] browser launch failed — shipping SPA without prerender:', e.message);
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(`[prerender] done — ${ok}/${ROUTES.length} routes prerendered`);
}

main().catch((e) => {
  // Never block the deploy on a prerender failure.
  console.warn('[prerender] non-blocking failure:', e.message);
});
