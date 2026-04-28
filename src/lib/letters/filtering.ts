/**
 * Pure filtering / grouping helpers for dispute-letter generation.
 *
 * These run both server-side (during PDF generation) and client-side (for
 * the admin preview screen). Keep them free of Supabase, fetch, or React.
 */

import type { Bureau, NegativeItem } from "@/types/database";
import { ALL_BUREAUS } from "./bureaus";

/**
 * Filter rule per the playbook:
 *   include items that are charged off, in collections, or otherwise
 *   not in good standing. Late-but-current accounts are NOT included.
 *
 * The DB CHECK constraint already restricts `account_status` to those
 * three values, so this is effectively an identity filter today — but
 * keeping it explicit means a future status value (e.g. `'late_30'`)
 * can be added without silently leaking onto letters.
 */
export function isDisputable(item: Pick<NegativeItem, "account_status">): boolean {
  return (
    item.account_status === "charge_off" ||
    item.account_status === "collection" ||
    item.account_status === "not_in_good_standing"
  );
}

/**
 * Sort items the way the rendered letter table should display them.
 * Falls back to creation order when display_order ties.
 */
export function sortForLetter<T extends Pick<NegativeItem, "display_order" | "created_at">>(
  items: ReadonlyArray<T>,
): T[] {
  return [...items].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

/**
 * Map of bureau → items belonging to that bureau, after status filtering
 * and display-order sorting. Bureaus with zero disputable items are
 * present with an empty array so callers can decide whether to skip
 * generating a letter for that bureau.
 */
export type ItemsByBureau<T extends NegativeItem> = Record<Bureau, T[]>;

export interface ItemWithBureau extends NegativeItem {
  bureau: Bureau;
}

export function groupByBureau<T extends ItemWithBureau>(
  items: ReadonlyArray<T>,
): ItemsByBureau<T> {
  const out: ItemsByBureau<T> = {
    equifax: [],
    transunion: [],
    experian: [],
  };
  for (const item of items) {
    if (!isDisputable(item)) continue;
    out[item.bureau].push(item);
  }
  for (const b of ALL_BUREAUS) {
    out[b] = sortForLetter(out[b]);
  }
  return out;
}
