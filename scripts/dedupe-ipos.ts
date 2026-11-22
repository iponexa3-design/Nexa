import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";
import { findDuplicateGroups } from "../src/services/ipo-dedupe";

/**
 * Merges IPOs stored twice because the feed changed their slug (for example
 * "johsoncab" and "johnsoncab"). The record the feed updated most recently
 * stays; GMP and subscription history move to it, fields it lacks (listing
 * price, issue price, lot size, registrar) are filled from the duplicate, and
 * the duplicate's slug redirects to it. New renames are handled during import.
 *
 *   npm run ipos:dedupe            shows what would be merged (changes nothing)
 *   npm run ipos:dedupe -- --apply merges them
 */

async function main() {
  const apply = process.argv.includes("--apply");
  const ipos = await prisma.ipo.findMany();
  const groups = findDuplicateGroups(ipos);

  if (groups.length === 0) {
    console.log("No duplicate IPOs found.");
    return;
  }

  for (const { keep, merge } of groups) {
    console.log(`${keep.companyName}: keep "${keep.slug}", merge ${merge.map((ipo) => `"${ipo.slug}"`).join(", ")}`);
    if (!apply) continue;

    await prisma.$transaction(async (tx) => {
      const filled: Record<string, unknown> = {};
      for (const duplicate of merge) {
        for (const field of ["actualListingPrice", "issuePrice", "lotSize", "registrar", "allotmentDate", "listingDate"] as const) {
          if (keep[field] === null && filled[field] === undefined && duplicate[field] !== null) filled[field] = duplicate[field];
        }
        await tx.gmp.updateMany({ where: { ipoId: duplicate.id }, data: { ipoId: keep.id } });
        await tx.subscription.updateMany({ where: { ipoId: duplicate.id }, data: { ipoId: keep.id } });
      }
      const previousSlugs = [...new Set([...keep.previousSlugs, ...merge.flatMap((ipo) => [...ipo.previousSlugs, ipo.slug])])];
      await tx.ipo.deleteMany({ where: { id: { in: merge.map((ipo) => ipo.id) } } });
      await tx.ipo.update({ where: { id: keep.id }, data: { ...filled, previousSlugs } });
      if (Object.keys(filled).length > 0) console.log(`  filled from the duplicate: ${Object.keys(filled).join(", ")}`);
    });
    console.log("  merged");
  }

  if (!apply) console.log(`\n${groups.length} duplicate group(s). Nothing changed; run again with --apply to merge.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
