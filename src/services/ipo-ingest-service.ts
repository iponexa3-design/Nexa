import { prisma } from "@/db/prisma";
import type { NormalizedGmp, NormalizedIpo, NormalizedSubscription } from "@/types/ipo";
import {
  findDuplicateSlugs,
  validateGmp,
  validateIpo,
  validateSubscription,
} from "@/services/ipo-validation";
import { calculateListingFigures } from "@/services/calculations";
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

    const priceBandHigh = ipo.priceBandHigh ? Number(ipo.priceBandHigh) : null;
    const lotSize = ipo.lotSize ?? null;
    const figures = calculateListingFigures(gmp.gmp, priceBandHigh, lotSize);

    await prisma.gmp.create({
      data: {
        ipoId: ipo.id,
        gmp: gmp.gmp,
        gmpPercentage: figures.gmpPercentage,
        estimatedListingPrice: figures.estimatedListingPrice,
        estimatedGainPerShare: figures.estimatedGainPerShare,
        estimatedGainPerLot: figures.estimatedGainPerLot,
        source: gmp.source,
        sourceUpdatedAt: gmp.sourceUpdatedAt ? new Date(gmp.sourceUpdatedAt) : null,
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

    await prisma.subscription.create({
      data: {
        ipoId: ipo.id,
        qib: subscription.qib,
        nii: subscription.nii,
        retail: subscription.retail,
        employee: subscription.employee,
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
    actualListingPrice: ipo.actualListingPrice ?? null,
    faceValue: ipo.faceValue ?? null,
    issuePrice: ipo.issuePrice ?? null,
  };
}
