/**
 * Credit-bureau dispute addresses for FCRA dispute mailings.
 *
 * Addresses are baked into code rather than stored in the database because
 * they almost never change and a typo would mis-route every customer letter.
 * If a bureau publishes a new dispute address, update the constant here and
 * ship — no migration needed.
 */

import type { Bureau } from "@/types/database";

export interface BureauAddress {
  /** Display name as it should appear at the top of the letter */
  displayName: string;
  /** Mailing address — joined with newlines in the rendered letter */
  addressLines: string[];
}

export const BUREAU_ADDRESSES: Record<Bureau, BureauAddress> = {
  equifax: {
    displayName: "Equifax",
    addressLines: ["P.O. Box 740256", "Atlanta, GA 30374-0256"],
  },
  transunion: {
    displayName: "TransUnion",
    addressLines: ["P.O. Box 2000", "Chester, PA 19022-2000"],
  },
  experian: {
    displayName: "Experian",
    addressLines: ["P.O. Box 4500", "Allen, TX 75013"],
  },
};

export const ALL_BUREAUS: ReadonlyArray<Bureau> = [
  "equifax",
  "transunion",
  "experian",
];
