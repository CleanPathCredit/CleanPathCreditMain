/**
 * Render every dispute letter template to /tmp for visual review.
 *
 * Run with:
 *   npx tsx scripts/preview-letter.tsx
 *
 * Produces:
 *   tmp/sample-609-round1.pdf   verifiable-proof demand
 *   tmp/sample-609-round2.pdf   second written request
 *   tmp/sample-609-round3.pdf   final warning, no boilerplate
 *   tmp/sample-609-round4.pdf   notice of pending litigation
 *   tmp/sample-611.pdf          per-item dispute, no notary
 *
 * Uses fixture consumer data — no DB or network calls.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToFile } from "@react-pdf/renderer";
import { Letter609Round1 } from "@/components/letters/Letter609Round1";
import { Letter609Round2 } from "@/components/letters/Letter609Round2";
import { Letter609Round3 } from "@/components/letters/Letter609Round3";
import { Letter609Round4 } from "@/components/letters/Letter609Round4";
import { Letter611 } from "@/components/letters/Letter611";
import { BUREAU_ADDRESSES } from "@/lib/letters/bureaus";
import type { LetterRenderInput } from "@/lib/letters/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "tmp");

const consumer = {
  fullName: "Your Name",
  addressLines: ["Address", "City, State Zip"],
  ssnLast4: "0000",
  dateOfBirth: "1/1/1970",
};
const letterDate = "January 1, 2016";
const rows = [
  { accountName: "Creditor 1", accountNumber: "1234567890",   verificationLabel: "Unverified Account" },
  { accountName: "Creditor 2", accountNumber: "etc",          verificationLabel: "Unverified Account" },
  { accountName: "Creditor 3", accountNumber: "5555****1234", verificationLabel: "Unverified Account" },
  { accountName: "Creditor 4", accountNumber: "9876****0001", verificationLabel: "Unverified Account" },
];

const baseInput: LetterRenderInput = {
  consumer,
  bureau: "equifax",
  bureauAddress: BUREAU_ADDRESSES.equifax,
  round: { letterType: "609", roundNumber: 1 },
  letterDate,
  rows,
};

const letter611Input = {
  consumer,
  bureauAddress: BUREAU_ADDRESSES.equifax,
  letterDate,
  rows: [
    { accountName: "Creditor 1", accountNumber: "1234567890",   disputeReason: "Account is not mine",         believedCorrect: "Remove from report" },
    { accountName: "Creditor 2", accountNumber: "5555****1234", disputeReason: "Balance is incorrect",        believedCorrect: "$0 — paid in full" },
    { accountName: "Creditor 3", accountNumber: "9876****0001", disputeReason: "Reported past statute date",  believedCorrect: "Remove from report" },
  ],
};

const targets: Array<[string, () => Promise<unknown>]> = [
  ["sample-609-round1.pdf", () => renderToFile(<Letter609Round1 input={{ ...baseInput, round: { letterType: "609", roundNumber: 1 } }} />, path.join(outDir, "sample-609-round1.pdf"))],
  ["sample-609-round2.pdf", () => renderToFile(<Letter609Round2 input={{ ...baseInput, round: { letterType: "609", roundNumber: 2 } }} />, path.join(outDir, "sample-609-round2.pdf"))],
  ["sample-609-round3.pdf", () => renderToFile(<Letter609Round3 input={{ ...baseInput, round: { letterType: "609", roundNumber: 3 } }} />, path.join(outDir, "sample-609-round3.pdf"))],
  ["sample-609-round4.pdf", () => renderToFile(<Letter609Round4 input={{ ...baseInput, round: { letterType: "609", roundNumber: 4 } }} />, path.join(outDir, "sample-609-round4.pdf"))],
  ["sample-611.pdf",         () => renderToFile(<Letter611 input={letter611Input} />,                                                     path.join(outDir, "sample-611.pdf"))],
];

for (const [name, render] of targets) {
  await render();
  console.log("Wrote", name);
}
