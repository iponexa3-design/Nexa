import { prisma } from "@/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { NormalizedGmp, NormalizedIpo, NormalizedSubscription } from "@/types/ipo";
import {
  findDuplicateSlugs,
  validateGmp,
  validateIpo,
  validateSubscription,
} from "@/services/ipo-validation";
import { calculateListingFigures, resolvePriceBasis } from "@/services/calculations";
import { computeIpoStatus } from "@/utils/ipo-status";
import { logger } from "@/utils/logger";

export interface IngestSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

export async function ingestIpos(ipos: NormalizedIpo[]): Promise<IngestSummary> {
  const summary: IngestSummary = { inserted: 0, updated: 0, skipped: 0 };
  const duplicateSlugs = new Set(findDuplicateSlugs(ipos));

  for (const ipo of ipos) {
    if (duplicateSlugs.has(ipo.slug)) {
      logger.warn("Skipping IPO with duplicate slug in provider response", {
        slug: ipo.slug,
      });
      summary.skipped++;
      continue;
    }

    const { valid, errors } = validateIpo(ipo);
    if (!valid) {
      logger.warn("Skipping invalid IPO record", { slug: ipo.slug, errors });
      summary.skipped++;
      continue;
    }

    try {
      const status = computeIpoStatus(ipo);
      const existing = await prisma.ipo.findUnique({ where: { slug: ipo.slug } });

      await prisma.ipo.upsert({
        where: { slug: ipo.slug },
        update: toIpoData(ipo, status),
        create: { slug: ipo.slug, ...toIpoData(ipo, status) },
      });

      if (existing) summary.updated++;
      else summary.inserted++;
    } catch (error) {
      logger.error("Failed to save IPO to database", {
        slug: ipo.slug,
        error: error instanceof Error ? error.message : String(error),
      });
      summary.skipped++;
    }
  }

  return summary;
}

export async function ingestGmp(gmp: NormalizedGmp): Promise<boolean> {
  const { valid, errors } = validateGmp(gmp);
  if (!valid) {
    logger.warn("Skipping invalid GMP record", { ipoSlug: gmp.ipoSlug, errors });
    return false;
  }

  try {
    const ipo = await prisma.ipo.findUnique({ where: { slug: gmp.ipoSlug } });
    if (!ipo) {
      logger.warn("Skipping GMP for unknown IPO slug", { ipoSlug: gmp.ipoSlug });
      return false;
    }

    const basis = resolvePriceBasis({
      issuePrice: ipo.issuePrice ? Number(ipo.issuePrice) : null,
      priceBandLow: ipo.priceBandLow ? Number(ipo.priceBandLow) : null,
      priceBandHigh: ipo.priceBandHigh ? Number(ipo.priceBandHigh) : null,
    });
    const sourceUpdatedAt = gmp.sourceUpdatedAt ? new Date(gmp.sourceUpdatedAt) : null;
    // Each refresh re-reads the same latest quote; store it once so the GMP
    // history only grows when the source actually publishes a new value.
    const latest = await prisma.gmp.findFirst({
      where: { ipoId: ipo.id, source: gmp.source },
      orderBy: { recordedAt: "desc" },
    });
    if (
      latest &&
      Number(latest.gmp) === gmp.gmp &&
      (latest.sourceUpdatedAt?.getTime() ?? null) === (sourceUpdatedAt?.getTime() ?? null)
    ) {
      return false;
    }

    const lotSize = ipo.lotSize ?? null;
    const figures = calculateListingFigures(gmp.gmp, basis?.price ?? null, lotSize);

    await prisma.gmp.create({
      data: {
        ipoId: ipo.id,
        gmp: gmp.gmp,
        gmpPercentage: figures.gmpPercentage,
        estimatedListingPrice: figures.estimatedListingPrice,
        estimatedGainPerShare: figures.estimatedGainPerShare,
        estimatedGainPerLot: figures.estimatedGainPerLot,
        source: gmp.source,
        sourceUpdatedAt,
      },
    });
    return true;
  } catch (error) {
    logger.error("Failed to save GMP to database", {
      ipoSlug: gmp.ipoSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function ingestSubscription(
  subscription: NormalizedSubscription,
): Promise<boolean> {
  const { valid, errors } = validateSubscription(subscription);
  if (!valid) {
    logger.warn("Skipping invalid subscription record", {
      ipoSlug: subscription.ipoSlug,
      errors,
    });
    return false;
  }

  try {
    const ipo = await prisma.ipo.findUnique({ where: { slug: subscription.ipoSlug } });
    if (!ipo) {
      logger.warn("Skipping subscription for unknown IPO slug", {
        ipoSlug: subscription.ipoSlug,
      });
      return false;
    }

    // The same snapshot fetched again (NSE not updated since) is not stored
    // twice; it only fills in categories an older save did not have.
    if (subscription.sourceUpdatedAt) {
      const duplicate = await prisma.subscription.findFirst({
        where: { ipoId: ipo.id, source: subscription.source, sourceUpdatedAt: new Date(subscription.sourceUpdatedAt) },
        select: { id: true, niiBig: true, niiSmall: true, shareholders: true },
      });
      if (duplicate) {
        const missing = {
          ...(duplicate.niiBig === null && subscription.niiBig != null ? { niiBig: subscription.niiBig } : {}),
          ...(duplicate.niiSmall === null && subscription.niiSmall != null ? { niiSmall: subscription.niiSmall } : {}),
          ...(duplicate.shareholders === null && subscription.shareholders != null ? { shareholders: subscription.shareholders } : {}),
        };
        if (Object.keys(missing).length > 0) {
          await prisma.subscription.update({ where: { id: duplicate.id }, data: missing });
        }
        return false;
      }
    }

    await prisma.subscription.create({
      data: {
        ipoId: ipo.id,
        qib: subscription.qib,
        nii: subscription.nii,
        niiBig: subscription.niiBig,
        niiSmall: subscription.niiSmall,
        retail: subscription.retail,
        employee: subscription.employee,
        shareholders: subscription.shareholders,
        total: subscription.total,
        subscriptionDate: subscription.subscriptionDate
          ? new Date(subscription.subscriptionDate)
          : null,
        source: subscription.source,
        sourceUpdatedAt: subscription.sourceUpdatedAt
          ? new Date(subscription.sourceUpdatedAt)
          : null,
      },
    });
    return true;
  } catch (error) {
    logger.error("Failed to save subscription to database", {
      ipoSlug: subscription.ipoSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function toIpoData(ipo: NormalizedIpo, status: ReturnType<typeof computeIpoStatus>) {
  return {
    companyName: ipo.companyName,
    symbol: ipo.symbol ?? null,
    ipoType: ipo.ipoType,
    exchange: ipo.exchange,
    status,
    priceBandLow: ipo.priceBandLow ?? null,
    priceBandHigh: ipo.priceBandHigh ?? null,
    issueSize: ipo.issueSize ?? null,
    lotSize: ipo.lotSize ?? null,
    openDate: ipo.openDate ? new Date(ipo.openDate) : null,
    closeDate: ipo.closeDate ? new Date(ipo.closeDate) : null,
    allotmentDate: ipo.allotmentDate ? new Date(ipo.allotmentDate) : null,
    listingDate: ipo.listingDate ? new Date(ipo.listingDate) : null,
    // IPOAlerts never reports a listing price, so a missing value means
    // "unknown", not "cleared": leave any stored (manually entered) price alone.
    actualListingPrice: ipo.actualListingPrice ?? undefined,
    faceValue: ipo.faceValue ?? null,
    // A band-only feed record has no issue price; keep the final issue price
    // learned from the exchange's listing-day file instead of clearing it.
    issuePrice: ipo.issuePrice ?? undefined,
    researchData: ipo.research
      ? (ipo.research as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };
}
