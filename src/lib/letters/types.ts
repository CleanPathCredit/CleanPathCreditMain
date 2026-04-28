/**
 * Domain types used by the letter-rendering layer.
 *
 * These are the shape the React-PDF templates consume — they're a
 * de-normalised view of the underlying tables, assembled by the API
 * handler before invoking the renderer. Templates should never reach
 * back into Supabase; everything they need lives on `LetterRenderInput`.
 */

import type { Bureau, LetterType } from "@/types/database";
import type { BureauAddress } from "./bureaus";

/** What identifies the consumer at the top of every letter. */
export interface ConsumerIdentity {
  fullName: string;
  addressLines: string[];      // street, "City, State Zip"
  /** Last four digits only; full SSN never leaves the server. */
  ssnLast4: string;
  /** Plain "MM/DD/YYYY" for display. */
  dateOfBirth: string;
}

/** A single row in the disputed-accounts table on the letter. */
export interface DisputeRow {
  accountName: string;        // "BANK OF AMERICA"
  accountNumber: string;      // verbatim, asterisks intact
  // Always "Unverified Account" on 609 letters; 611 uses dispute_reason here.
  verificationLabel: string;
}

/** Strongly-typed round identity (1-4 for 609, currently 1 for 611/623). */
export interface RoundIdentity {
  letterType: LetterType;
  roundNumber: number;
}

/** Everything a letter PDF template needs to render itself. */
export interface LetterRenderInput {
  consumer: ConsumerIdentity;
  bureau: Bureau;
  bureauAddress: BureauAddress;
  round: RoundIdentity;
  rows: DisputeRow[];
  /** ISO date string for the letter header, defaults to today server-side. */
  letterDate: string;
}
