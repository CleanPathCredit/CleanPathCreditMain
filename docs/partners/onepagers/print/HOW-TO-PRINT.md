# How to download and print the partner one-pagers

These print-ready HTML files render as proper US Letter, single-page,
two-column leave-behinds. Open one in a browser and print — that's
the whole flow.

## Easiest path (zero setup)

1. **View any sheet in the browser via raw.githack.com** — copy and paste:

   ```
   https://raw.githack.com/CleanPathCredit/CleanPathCreditMain/claude/partner-agreement-template-sePyK/docs/partners/onepagers/print/lo.html
   ```

   Replace `lo.html` with `re-agent.html`, `auto-dealer.html`, or `credit-union.html`.

   (After this PR is merged to `main`, swap `claude/partner-agreement-template-sePyK` for `main` in the URL.)

2. Hit **Cmd + P** (Mac) or **Ctrl + P** (Windows).

3. In the print dialog:
   - **Destination:** your printer, OR "Save as PDF"
   - **Paper:** US Letter (8.5 × 11 in)
   - **Orientation:** Portrait
   - **Margins:** Default (or "None" — the file has its own padding)
   - **Scale:** 100%
   - **Headers and footers:** OFF (uncheck this — otherwise the browser adds a date stamp)
   - **Background graphics:** ON (so the emerald accent prints)

4. Print or Save.

## Adding your QR code

All four sheets share a single QR file: **`qr-partners.png`**. Drop one PNG into this folder with that filename and it appears on every sheet. If the file isn't there, a clean dashed placeholder prints in its place.

**Two options to get your QR onto the sheet before printing:**

### Option A — local download (recommended)

1. Download the `docs/partners/onepagers/print/` folder from GitHub:
   - Open https://github.com/CleanPathCredit/CleanPathCreditMain/tree/claude/partner-agreement-template-sePyK/docs/partners/onepagers/print
   - Use the green "Code" button → "Download ZIP" (downloads the whole repo, then extract just this folder), or
   - Use a tool like [download-directory.github.io](https://download-directory.github.io/) to grab just this folder.

2. Save your QR PNG into the folder as **`qr-partners.png`**.

3. Open `index.html` in your browser → click any sheet → print.

### Option B — print without QR, then stick or stamp it on

If you already have a QR sticker or stamp:

1. Open the sheet via raw.githack.com (URL above).
2. Print the sheet — the dashed placeholder will print.
3. Place your physical QR sticker over the placeholder square.

## Using a print shop

Most local print shops (FedEx, Office Depot, Vistaprint, local commercial printers) will accept a PDF. So:

1. Open each sheet, **Save as PDF** (one PDF per channel).
2. Email the four PDFs to the print shop.
3. Spec to give them:
   - 8.5 × 11 in (US Letter), portrait
   - Single-sided
   - 100lb cover stock OR 80lb text stock — matte finish preferred
   - Color print (the emerald accent matters)
   - Quantity: start with 50–100 per channel for first run

## Notes

- The HTML files are self-contained — fonts fall back to Cormorant Garamond → Georgia → Times if the brand serif isn't installed. To get the exact look, install [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Inter](https://fonts.google.com/specimen/Inter) free from Google Fonts.
- Compliance footer is identical across all four — Texas CSO #, surety bond, statute compliance line, results-not-guaranteed disclaimer.
- The `[FILL IN AFTER APPROVAL]` placeholder for the Texas CSO Registration # MUST be replaced with your actual registration number before any sheet goes to a print shop.

## Quick links once this PR is merged

After PR #26 merges to `main`, the files will live at:

```
https://raw.githack.com/CleanPathCredit/CleanPathCreditMain/main/docs/partners/onepagers/print/index.html
https://raw.githack.com/CleanPathCredit/CleanPathCreditMain/main/docs/partners/onepagers/print/lo.html
https://raw.githack.com/CleanPathCredit/CleanPathCreditMain/main/docs/partners/onepagers/print/re-agent.html
https://raw.githack.com/CleanPathCredit/CleanPathCreditMain/main/docs/partners/onepagers/print/auto-dealer.html
https://raw.githack.com/CleanPathCredit/CleanPathCreditMain/main/docs/partners/onepagers/print/credit-union.html
```

Bookmark the index page — it's the easiest way to grab any sheet on demand.
