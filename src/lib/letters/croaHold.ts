/**
 * CROA §407 — three-business-day right of cancellation.
 *
 * The Credit Repair Organizations Act gives every consumer three
 * business days from contract execution to cancel without obligation.
 * The firm must not begin performing services (i.e. drafting or
 * sending dispute letters) inside that window.
 *
 * We enforce the hold on ROUND 1 only — once the cancel window has
 * lapsed for the original contract, subsequent rounds are no longer
 * subject to it. The starting point is `profiles.created_at`, which
 * the existing client signup writes when the consumer first signs up
 * (close enough to "contract date" for our purposes; if the firm
 * later adopts a separate contract-signed timestamp, swap that in).
 *
 * "Business days" here = Monday-Friday, excluding federal-holiday-
 * adjacent weekend skip but NOT excluding federal holidays themselves
 * (intentionally conservative — if a holiday falls inside the window,
 * we still don't extend, because the FTC's CROA guidance counts only
 * weekend exclusion). If a stricter interpretation is needed later
 * we can plug in a holiday list.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Add `n` business days to a Date, skipping Saturdays and Sundays.
 * Mutates a copy; original is untouched.
 */
export function addBusinessDays(start: Date, n: number): Date {
  const out = new Date(start.getTime());
  let added = 0;
  while (added < n) {
    out.setTime(out.getTime() + MS_PER_DAY);
    const d = out.getDay();
    if (d !== 0 && d !== 6) added += 1; // skip Sun(0) + Sat(6)
  }
  return out;
}

/**
 * Earliest moment at which letters for the given round may be drafted
 * or generated. Returns null when no hold applies.
 *
 *   roundNumber === 1  →  contract date + 3 business days
 *   roundNumber  >  1  →  no hold (returns null)
 */
export function croaHoldUntil(
  contractDate: Date,
  roundNumber: number,
): Date | null {
  if (roundNumber !== 1) return null;
  return addBusinessDays(contractDate, 3);
}

/**
 * True when a letter round is currently inside its CROA hold window.
 * The `now` parameter exists for testability and server-side use where
 * we want to pin "now" to the request time.
 */
export function isInCroaHold(
  contractDate: Date,
  roundNumber: number,
  now: Date = new Date(),
): boolean {
  const until = croaHoldUntil(contractDate, roundNumber);
  if (!until) return false;
  return now < until;
}
