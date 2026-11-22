import { normalizeCompanyName } from "@/services/gmp-tracker";
import { toDateKey } from "@/utils/ipo-status";

/**
 * The feed identifies an IPO by its slug, and occasionally changes it (for
 * example "johsoncab" corrected to "johnsoncab"). Saved under the new slug,
 * the IPO would appear twice. Two records are the same IPO when the company
 * name (ignoring "Limited" and punctuation), the board and the opening date
 * all match. Undated announcements are left alone: they are handled by
 * dropSupersededAnnouncements.
 */
export interface IpoIdentity {
  companyName: string;
  ipoType: string;
  openDate?: Date | string | null;
}

export function ipoIdentityKey(ipo: IpoIdentity): string | null {
  const open = toDateKey(ipo.openDate ?? null);
  const name = normalizeCompanyName(ipo.companyName);
  if (!open || !name) return null;
  return `${name}|${ipo.ipoType}|${open}`;
}

export function isSameIpo(a: IpoIdentity, b: IpoIdentity): boolean {
  const key = ipoIdentityKey(a);
  return key !== null && key === ipoIdentityKey(b);
}

export interface DuplicateCandidate extends IpoIdentity {
  id: string;
  slug: string;
  updatedAt: Date;
}

export interface DuplicateGroup<T extends DuplicateCandidate> {
  /** The record that stays: the one the feed updated most recently. */
  keep: T;
  /** Records merged into `keep` and then removed. */
  merge: T[];
}

/** Groups of records that are the same IPO. */
export function findDuplicateGroups<T extends DuplicateCandidate>(ipos: T[]): DuplicateGroup<T>[] {
  const byKey = new Map<string, T[]>();
  for (const ipo of ipos) {
    const key = ipoIdentityKey(ipo);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), ipo]);
  }
  return [...byKey.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const sorted = [...group].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return { keep: sorted[0], merge: sorted.slice(1) };
    });
}
