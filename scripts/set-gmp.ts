import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";
import { ingestGmp } from "../src/services/ipo-ingest-service";
import { MANUAL_GMP_PREFIX, manualGmpSource } from "../src/utils/gmp-source";

/**
 * Enters a GMP by hand for an IPO our data provider has no GMP for, e.g. a
 * figure read on another public GMP website. The value is stored with its
 * date and labelled on the site as "Entered manually from <source>"; a newer
 * value from the data provider replaces it automatically.
 *
 *   npm run gmp:set -- missing                          IPOs not listed yet with no GMP from the last 2 days
 *   npm run gmp:set -- <slug> <gmp> [--source Name] [--date YYYY-MM-DD]
 *                                                      e.g.  npm run gmp:set -- mksons 12 --source InvestorGain
 *   npm run gmp:set -- undo <slug>                      removes the latest manual entry for that IPO
 */
async function main() {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const [first, second] = args.filter((arg, index) => !arg.startsWith("--") && !args[index - 1]?.startsWith("--"));

  if (!first || first === "missing") {
    const since = new Date(Date.now() - 2 * 86_400_000);
    const rows = await prisma.ipo.findMany({
      where: {
        openDate: { not: null },
        OR: [{ listingDate: null }, { listingDate: { gt: new Date() } }],
        closeDate: { gte: new Date(Date.now() - 10 * 86_400_000) },
      },
      orderBy: { openDate: "asc" },
      select: {
        slug: true,
        companyName: true,
        openDate: true,
        gmps: { orderBy: { recordedAt: "desc" }, take: 1, select: { gmp: true, recordedAt: true, source: true } },
      },
    });
    const needing = rows.filter((row) => !row.gmps[0] || row.gmps[0].recordedAt < since);
    console.log(`IPOs not listed yet without a GMP from the last 2 days: ${needing.length}`);
    for (const row of needing) {
      const last = row.gmps[0];
      console.log(
        `  ${row.slug.padEnd(14)} ${row.companyName.padEnd(48)} ${last ? `last GMP ${last.gmp} (${last.recordedAt.toISOString().slice(0, 10)}, ${last.source})` : "no GMP yet"}`,
      );
    }
    if (!first) console.log("\nUsage: npm run gmp:set -- <slug> <gmp> [--source Name] [--date YYYY-MM-DD]");
    return;
  }

  if (first === "undo") {
    const ipo = await prisma.ipo.findUnique({ where: { slug: second ?? "" }, select: { id: true, companyName: true } });
    if (!ipo) throw new Error(`No IPO with slug "${second}".`);
    const latest = await prisma.gmp.findFirst({
      where: { ipoId: ipo.id, source: { startsWith: MANUAL_GMP_PREFIX } },
      orderBy: { recordedAt: "desc" },
    });
    if (!latest) throw new Error(`${ipo.companyName} has no manual GMP entry.`);
    await prisma.gmp.delete({ where: { id: latest.id } });
    console.log(`Removed manual GMP ${latest.gmp} (${latest.source}) for ${ipo.companyName}.`);
    return;
  }

  const slug = first;
  const gmp = Number(second);
  if (second === undefined || !Number.isFinite(gmp) || Math.abs(gmp) > 100_000) {
    throw new Error("GMP must be a number in rupees, e.g. 12 or -5 or 0.");
  }
  const publisher = option("source") ?? "InvestorGain";
  const date = option("date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date must look like 2026-10-30.");
  // A date alone means "quoted on that day" (noon IST); otherwise now.
  const quotedAt = date ? new Date(`${date}T12:00:00+05:30`) : new Date();
  if (quotedAt.getTime() > Date.now() + 60_000) throw new Error("The GMP date cannot be in the future.");

  const ipo = await prisma.ipo.findUnique({ where: { slug }, select: { companyName: true, listingDate: true } });
  if (!ipo) throw new Error(`No IPO with slug "${slug}". Run "npm run gmp:set -- missing" to see slugs.`);
  if (ipo.listingDate && ipo.listingDate <= new Date()) {
    throw new Error(`${ipo.companyName} has already listed; the site shows its actual listing price instead of GMP.`);
  }

  const saved = await ingestGmp({
    ipoSlug: slug,
    gmp,
    source: manualGmpSource(publisher),
    sourceUpdatedAt: quotedAt.toISOString(),
  });
  if (!saved) throw new Error("Not saved (same value and date already stored, or invalid).");
  console.log(
    `Saved GMP ₹${gmp} for ${ipo.companyName}, quoted ${quotedAt.toISOString().slice(0, 10)}, source "${publisher}". It appears on the site within 5 minutes.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
