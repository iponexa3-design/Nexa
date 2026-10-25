export type IpoType = "MAINBOARD" | "SME";

export interface IpoScheduleItem {
  event: string;
  date: string;
}

export interface IpoSubscriptionSummary {
  sharesOffered: number | null;
  sharesBid: number | null;
  timesSubscribed: number | null;
  updatedAt: string | null;
}

export interface IpoResearchData {
  minimumInvestment: number | null;
  listingGain: string | null;
  logoUrl: string | null;
  prospectusUrl: string | null;
  infoUrl: string | null;
  nseInfoUrl: string | null;
  bseInfoUrl: string | null;
  about: string | null;
  strengths: string[];
  risks: string[];
  mediaCoverageLinks: string[];
  schedule: IpoScheduleItem[];
  subscription: IpoSubscriptionSummary | null;
}

/**
 * Shape every IPO data provider must normalize its raw response into,
 * before it reaches validation/ingestion. Keeps the rest of the app
 * provider-agnostic (see src/providers/ipo-data-provider.ts).
 */
export interface NormalizedIpo {
  companyName: string;
  slug: string;
  symbol?: string | null;
  ipoType: IpoType;
  exchange: string;
  priceBandLow?: number | null;
  priceBandHigh?: number | null;
  issueSize?: number | null;
  lotSize?: number | null;
  openDate?: string | null;
  closeDate?: string | null;
  allotmentDate?: string | null;
  listingDate?: string | null;
  actualListingPrice?: number | null;
  faceValue?: number | null;
  issuePrice?: number | null;
  research?: IpoResearchData | null;
}

export interface NormalizedGmp {
  ipoSlug: string;
  gmp: number;
  source: string;
  sourceUpdatedAt?: string | null;
}

export interface NormalizedSubscription {
  ipoSlug: string;
  qib?: number | null;
  nii?: number | null;
  retail?: number | null;
  employee?: number | null;
  total?: number | null;
  subscriptionDate?: string | null;
  source: string;
  sourceUpdatedAt?: string | null;
}
