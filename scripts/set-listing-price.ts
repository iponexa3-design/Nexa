import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";

/**
 * Records the official listing price of an IPO (the exchange's listing-day
 * opening price), which the IPOAlerts feed does not provide.
 *
 *   npm run listing:set -- <slug> <price>      e.g.  npm run listing:set -- jpl 1342.50
 *   npm run listing:set -- <slug> clear        removes a wrongly entered price
 *   npm run listing:set -- missing             lists listed IPOs with no price yet
 */
async function main() {
  const [slug, rawPrice] = process.argv.slice(2);

  if (!slug || slug === "missing") {
    const rows = await prisma.ipo.findMany({
      where: { listingDate: { lte: new Date() }, actualListingPrice: null },
      orderBy: { listingDate: "desc" },
      select: { slug: true, companyName: true, listingDate: true },
    });
    console.log(`Listed IPOs without a listing price: ${rows.length}`);
    for (const row of rows) {
      console.log(`  ${row.listingDate?.toISOString().slice(0, 10)}  ${row.slug.padEnd(14)} ${row.companyName}`);
    }
    if (!slug) console.log("\nUsage: npm run listing:set -- <slug> <price | clear>");
    return;
  }

  const ipo = await prisma.ipo.findUnique({ where: { slug } });
  if (!ipo) throw new Error(`No IPO with slug "${slug}". Run "npm run listing:set -- missing" to see slugs.`);

  if (rawPrice === "clear") {
    await prisma.ipo.update({ where: { slug }, data: { actualListingPrice: null } });
    console.log(`Cleared listing price for ${ipo.companyName}.`);
    return;
  }

  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Listing price must be a positive number, got "${rawPrice ?? ""}".`);
  }
  if (ipo.listingDate && ipo.listingDate.getTime() > Date.now()) {
    throw new Error(`${ipo.companyName} lists on ${ipo.listingDate.toISOString().slice(0, 10)}; it has not listed yet.`);
  }

  await prisma.ipo.update({ where: { slug }, data: { actualListingPrice: price } });
  console.log(`Saved listing price ₹${price} for ${ipo.companyName}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
