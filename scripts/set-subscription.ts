import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";
import { ingestSubscription } from "../src/services/ipo-ingest-service";
import { isManualSubscriptionSource, manualSubscriptionSource } from "../src/utils/subscription-source";

/**
 * Enters subscription figures by hand for IPOs no automatic source covers,
 * mainly SME issues listed only on BSE (read from the IPO's page on
 * bseindia.com). Saved with the time the figures are "as on", labelled on the
 * site as "Entered manually from <source>", and used for the day-wise table.
 * IPOs that already have official NSE figures are refused unless --force.
 *
 *   npm run subscription:set -- missing
 *   npm run subscription:set -- <slug> --total 4.12 [--qib 1.2] [--nii 8.5] [--bnii 9.1] [--snii 7.3]
 *                               [--retail 3.9] [--emp 1.1] [--sh 2.0] [--source BSE] [--time "30 Oct 17:00"]
 *   npm run subscription:set -- undo <slug>       removes the latest manual entry for that IPO
 */

const FIELDS = { qib: "qib", nii: "nii", bnii: "niiBig", snii: "niiSmall", retail: "retail", emp: "employee", sh: "shareholders", total: "total" } as const;

function parseTime(text: string | undefined): Date {
  if (!text) return new Date();
  // "30 Oct 17:00", "30 Oct 2026 17:00", "2026-10-30 17:00" or "2026-10-30" (IST).
  const iso = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text.trim());
  const named = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*(?:\s+(\d{4}))?(?:\s+(\d{1,2}):(\d{2}))?$/.exec(text.trim());
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let day: string | null = null;
  let hour = "17";
  let minute = "00";
  if (iso) {
    day = iso[1];
    if (iso[2]) [hour, minute] = [iso[2], iso[3]];
  } else if (named) {
    const month = months.indexOf(named[2].toLowerCase());
    if (month < 0) throw new Error(`Unknown month in --time "${text}".`);
    const year = named[3] ?? String(new Date().getFullYear());
    day = `${year}-${String(month + 1).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
    if (named[4]) [hour, minute] = [named[4], named[5]];
  }
  if (!day) throw new Error(`--time must look like "30 Oct 17:00" or "2026-10-30 17:00", got "${text}".`);
  const date = new Date(`${day}T${hour.padStart(2, "0")}:${minute}:00+05:30`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --time "${text}".`);
  if (date.getTime() > Date.now() + 5 * 60_000) throw new Error("The time cannot be in the future.");
  return date;
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const positional = args.filter((arg, index) => !arg.startsWith("--") && !args[index - 1]?.startsWith("--"));
  const [first, second] = positional;

  if (!first || first === "missing") {
    const now = new Date();
    const rows = await prisma.ipo.findMany({
      where: {
        openDate: { lte: now },
        closeDate: { gte: new Date(now.getTime() - 3 * 86_400_000) },
        OR: [{ listingDate: null }, { listingDate: { gt: now } }],
      },
      orderBy: { closeDate: "asc" },
      select: {
        slug: true,
        companyName: true,
        ipoType: true,
        exchange: true,
        closeDate: true,
        subscriptions: { orderBy: { subscriptionDate: "desc" }, take: 1, select: { source: true, total: true, sourceUpdatedAt: true } },
      },
    });
    const since = new Date(now.getTime() - 20 * 3_600_000);
    const needing = rows.filter((row) => {
      const last = row.subscriptions[0];
      return !last || !last.total || Number(last.total) === 0 || (isManualSubscriptionSource(last.source) && (last.sourceUpdatedAt ?? now) < since);
    });
    console.log(`Open or just-closed IPOs without current subscription figures: ${needing.length}`);
    for (const row of needing) {
      const last = row.subscriptions[0];
      console.log(
        `  ${row.slug.padEnd(14)} ${row.companyName.padEnd(44)} ${row.ipoType} ${row.exchange.padEnd(4)} closes ${row.closeDate?.toISOString().slice(0, 10)}  ${last ? `last ${Number(last.total).toFixed(2)}x (${last.source})` : "no figures yet"}`,
      );
    }
    if (!first) console.log('\nUsage: npm run subscription:set -- <slug> --total 4.12 [--qib ..] [--nii ..] [--retail ..] [--time "30 Oct 17:00"]');
    return;
  }

  if (first === "undo") {
    const ipo = await prisma.ipo.findUnique({ where: { slug: second ?? "" }, select: { id: true, companyName: true } });
    if (!ipo) throw new Error(`No IPO with slug "${second}".`);
    const latest = await prisma.subscription.findFirst({
      where: { ipoId: ipo.id, source: { startsWith: "manual:" } },
      orderBy: { subscriptionDate: "desc" },
    });
    if (!latest) throw new Error(`${ipo.companyName} has no manual subscription entry.`);
    await prisma.subscription.delete({ where: { id: latest.id } });
    console.log(`Removed manual entry (total ${Number(latest.total).toFixed(2)}x, ${latest.source}) for ${ipo.companyName}.`);
    return;
  }

  const slug = first;
  const figures: Record<string, number | null> = {};
  for (const [flag, field] of Object.entries(FIELDS)) {
    const raw = option(flag);
    if (raw === undefined) {
      figures[field] = null;
      continue;
    }
    const value = Number(raw.replace(/x$/i, ""));
    if (!Number.isFinite(value) || value < 0 || value > 100_000) throw new Error(`--${flag} must be a number of times, e.g. 4.12`);
    figures[field] = value;
  }
  if (figures.total === null) throw new Error("--total is required (the overall times subscribed).");
  const publisher = option("source") ?? "BSE";
  const asOn = parseTime(option("time"));

  const ipo = await prisma.ipo.findUnique({
    where: { slug },
    select: {
      id: true,
      companyName: true,
      openDate: true,
      subscriptions: { where: { source: { in: ["bse+nse", "nse-sme-total"] } }, take: 1, select: { id: true } },
    },
  });
  if (!ipo) throw new Error(`No IPO with slug "${slug}". Run "npm run subscription:set -- missing" to see slugs.`);
  if (ipo.openDate && asOn < ipo.openDate) throw new Error("That time is before the IPO opened.");
  if (ipo.subscriptions.length > 0 && !args.includes("--force")) {
    throw new Error(`${ipo.companyName} already has official NSE figures, which are updated automatically. Add --force only if you are sure.`);
  }

  const saved = await ingestSubscription({
    ipoSlug: slug,
    ...figures,
    subscriptionDate: new Date().toISOString(),
    source: manualSubscriptionSource(publisher),
    sourceUpdatedAt: asOn.toISOString(),
  });
  if (!saved) throw new Error("Not saved (the same entry already exists, or a figure is invalid).");
  const parts = Object.entries(figures)
    .filter(([, value]) => value !== null)
    .map(([field, value]) => `${field} ${value!.toFixed(2)}x`)
    .join(", ");
  console.log(
    `Saved for ${ipo.companyName}: ${parts}, as on ${asOn.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST, source "${publisher}". It appears on the site within 5 minutes.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
