/**
 * Render a sample 609 Round 1 letter to /tmp/sample-609-round1.pdf.
 *
 * Run with:
 *   npx tsx scripts/preview-letter.tsx
 *
 * Uses fixture consumer data — no DB or network. Output mirrors the
 * source Google Doc but with a real-sized table (no filler rows) and
 * uses Equifax as the example bureau. Notary acknowledgment page is
 * appended as page 2.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToFile } from "@react-pdf/renderer";
import { Letter609Round1 } from "@/components/letters/Letter609Round1";
import { BUREAU_ADDRESSES } from "@/lib/letters/bureaus";
import type { LetterRenderInput } from "@/lib/letters/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sample: LetterRenderInput = {
  consumer: {
    fullName: "Your Name",
    addressLines: ["Address", "City, State Zip"],
    ssnLast4: "0000",
    dateOfBirth: "1/1/1970",
  },
  bureau: "equifax",
  bureauAddress: BUREAU_ADDRESSES.equifax,
  round: { letterType: "609", roundNumber: 1 },
  letterDate: "January 1, 2016",
  rows: [
    { accountName: "Creditor 1", accountNumber: "1234567890",   verificationLabel: "Unverified Account" },
    { accountName: "Creditor 2", accountNumber: "etc",          verificationLabel: "Unverified Account" },
    { accountName: "Creditor 3", accountNumber: "5555****1234", verificationLabel: "Unverified Account" },
    { accountName: "Creditor 4", accountNumber: "9876****0001", verificationLabel: "Unverified Account" },
  ],
};

const out = path.resolve(__dirname, "..", "tmp", "sample-609-round1.pdf");
await renderToFile(<Letter609Round1 input={sample} />, out);
console.log("Wrote", out);
