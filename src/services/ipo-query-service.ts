import { prisma } from "@/db/prisma";
import { computeIpoStatus, type ComputedIpoStatus } from "@/utils/ipo-status";
import type { IpoType } from "@/generated/prisma/enums";

export interface IpoListItem {
  slug: string;
  companyName: string;
  ipoType: IpoType;
  exchange: string;
  status: ComputedIpoStatus;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  lotSize: number | null;
  issuePrice: number | null;
  actualListingPrice: number | null;
  openDate: Date | null;
  closeDate: Date | null;
  listingDate: Date | null;
  gmp: number | null;
  gmpPercentage: number | null;
  estimatedListingPrice: number | null;
  estimatedGainPerLot: number | null;
  gmpUpdatedAt: Date | null;
}

export interface HomepageIpoGroups {
  upcoming: IpoListItem[];
  open: IpoListItem[];
  recentlyListed: IpoListItem[];
}

const listItemInclude = {
  gmps: { orderBy: { recordedAt: "desc" as const }, take: 1 },
};

export async function getHomepageIpoGroups(): Promise<HomepageIpoGroups> {
  const ipos = await prisma.ipo.findMany({
    include: listItemInclude,
    orderBy: { updatedAt: "desc" },
  });

  const items = ipos.map(toListItem);

  const upcoming = items
    .filter((item) => item.status === "UPCOMING")
    .sort(byDateAsc((item) => item.openDate));

  const open = items
    .filter((item) => item.status === "OPEN")
    .sort(byDateAsc((item) => item.closeDate));

  const recentlyListed = items
    .filter((item) => item.status === "LISTED")
    .sort(byDateDesc((item) => item.listingDate))
    .slice(0, 12);

  return { upcoming, open, recentlyListed };
}

export interface IpoGmpHistoryEntry {
  gmp: number;
  gmpPercentage: number | null;
  estimatedListingPrice: number | null;
  recordedAt: Date;
  source: string;
  sourceUpdatedAt: Date | null;
}

export interface IpoSubscriptionEntry {
  qib: number | null;
  nii: number | null;
  retail: number | null;
  employee: number | null;
  total: number | null;
  subscriptionDate: Date | null;
  source: string;
  sourceUpdatedAt: Date | null;
}

export interface IpoDetail extends IpoListItem {
  symbol: string | null;
  issueSize: number | null;
  faceValue: number | null;
  allotmentDate: Date | null;
  estimatedGainPerShare: number | null;
  gmpSource: string | null;
  gmpUpdatedTime: Date | null;
  gmpHistory: IpoGmpHistoryEntry[];
  latestSubscription: IpoSubscriptionEntry | null;
  updatedAt: Date;
}

export async function getIpoBySlug(slug: string): Promise<IpoDetail | null> {
  const ipo = await prisma.ipo.findUnique({
    where: { slug },
    include: {
      gmps: { orderBy: { recordedAt: "desc" }, take: 20 },
      subscriptions: { orderBy: { subscriptionDate: "desc" }, take: 1 },
    },
  });

  if (!ipo) return null;

  const latestGmp = ipo.gmps[0];
  const latestSubscription = ipo.subscriptions[0];

  return {
    ...toListItem(ipo),
    symbol: ipo.symbol,
    issueSize: toNumber(ipo.issueSize),
    faceValue: toNumber(ipo.faceValue),
    openDate: ipo.openDate,
    closeDate: ipo.closeDate,
    allotmentDate: ipo.allotmentDate,
    estimatedGainPerShare: latestGmp ? toNumber(latestGmp.estimatedGainPerShare) : null,
    gmpSource: latestGmp?.source ?? null,
    gmpUpdatedTime: latestGmp?.sourceUpdatedAt ?? latestGmp?.recordedAt ?? null,
    gmpHistory: ipo.gmps.map((gmp) => ({
      gmp: toNumber(gmp.gmp) as number,
      gmpPercentage: toNumber(gmp.gmpPercentage),
      estimatedListingPrice: toNumber(gmp.estimatedListingPrice),
      recordedAt: gmp.recordedAt,
      source: gmp.source,
      sourceUpdatedAt: gmp.sourceUpdatedAt,
    })),
    latestSubscription: latestSubscription
      ? {
          qib: toNumber(latestSubscription.qib),
          nii: toNumber(latestSubscription.nii),
          retail: toNumber(latestSubscription.retail),
          employee: toNumber(latestSubscription.employee),
          total: toNumber(latestSubscription.total),
          subscriptionDate: latestSubscription.subscriptionDate,
          source: latestSubscription.source,
          sourceUpdatedAt: latestSubscription.sourceUpdatedAt,
        }
      : null,
    updatedAt: ipo.updatedAt,
  };
}

type IpoWithLatestGmp = Awaited<
  ReturnType<typeof prisma.ipo.findMany<{ include: typeof listItemInclude }>>
>[number];

function toListItem(ipo: IpoWithLatestGmp): IpoListItem {
  const latestGmp = ipo.gmps[0];

  return {
    slug: ipo.slug,
    companyName: ipo.companyName,
    ipoType: ipo.ipoType,
    exchange: ipo.exchange,
    status: computeIpoStatus(ipo),
    priceBandLow: toNumber(ipo.priceBandLow),
    priceBandHigh: toNumber(ipo.priceBandHigh),
    lotSize: ipo.lotSize,
    issuePrice: toNumber(ipo.issuePrice),
    actualListingPrice: toNumber(ipo.actualListingPrice),
    openDate: ipo.openDate,
    closeDate: ipo.closeDate,
    listingDate: ipo.listingDate,
    gmp: latestGmp ? (toNumber(latestGmp.gmp) as number) : null,
    gmpPercentage: latestGmp ? toNumber(latestGmp.gmpPercentage) : null,
    estimatedListingPrice: latestGmp ? toNumber(latestGmp.estimatedListingPrice) : null,
    estimatedGainPerLot: latestGmp ? toNumber(latestGmp.estimatedGainPerLot) : null,
    gmpUpdatedAt: latestGmp?.sourceUpdatedAt ?? latestGmp?.recordedAt ?? null,
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function byDateAsc<T>(getter: (item: T) => Date | null) {
  return (a: T, b: T) => (getter(a)?.getTime() ?? Infinity) - (getter(b)?.getTime() ?? Infinity);
}

function byDateDesc<T>(getter: (item: T) => Date | null) {
  return (a: T, b: T) => (getter(b)?.getTime() ?? 0) - (getter(a)?.getTime() ?? 0);
}
