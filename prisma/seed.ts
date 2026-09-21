import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Example from the product spec: price band 400-420, GMP 50, lot size 35.
  const openIpo = await prisma.ipo.upsert({
    where: { slug: "sample-open-ipo" },
    update: {},
    create: {
      companyName: "Sample Open Ltd",
      slug: "sample-open-ipo",
      ipoType: "MAINBOARD",
      exchange: "NSE, BSE",
      status: "OPEN",
      priceBandLow: 400,
      priceBandHigh: 420,
      issueSize: 500,
      lotSize: 35,
      openDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      closeDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      faceValue: 10,
      gmps: {
        create: {
          gmp: 50,
          gmpPercentage: 11.9,
          estimatedListingPrice: 470,
          estimatedGainPerShare: 50,
          estimatedGainPerLot: 1750,
          source: "manual-seed",
        },
      },
      subscriptions: {
        create: {
          qib: 12.5,
          nii: 8.2,
          retail: 3.1,
          total: 7.4,
          subscriptionDate: new Date(),
          source: "manual-seed",
        },
      },
    },
  });

  const upcomingIpo = await prisma.ipo.upsert({
    where: { slug: "sample-upcoming-sme-ipo" },
    update: {},
    create: {
      companyName: "Sample Upcoming SME Ltd",
      slug: "sample-upcoming-sme-ipo",
      ipoType: "SME",
      exchange: "NSE SME",
      status: "UPCOMING",
      priceBandLow: 90,
      priceBandHigh: 96,
      issueSize: 25,
      lotSize: 1200,
      openDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      closeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      faceValue: 10,
      gmps: {
        create: {
          gmp: 8,
          gmpPercentage: 8.33,
          estimatedListingPrice: 104,
          estimatedGainPerShare: 8,
          estimatedGainPerLot: 9600,
          source: "manual-seed",
        },
      },
    },
  });

  const listedIpo = await prisma.ipo.upsert({
    where: { slug: "sample-recently-listed-ipo" },
    update: {},
    create: {
      companyName: "Sample Listed Ltd",
      slug: "sample-recently-listed-ipo",
      ipoType: "MAINBOARD",
      exchange: "NSE, BSE",
      status: "LISTED",
      priceBandLow: 250,
      priceBandHigh: 265,
      issueSize: 800,
      lotSize: 56,
      openDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      closeDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      allotmentDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      listingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      issuePrice: 265,
      actualListingPrice: 288,
      faceValue: 10,
      gmps: {
        create: {
          gmp: 30,
          gmpPercentage: 11.32,
          estimatedListingPrice: 295,
          estimatedGainPerShare: 30,
          estimatedGainPerLot: 1680,
          source: "manual-seed",
        },
      },
    },
  });

  console.log("Seeded IPOs:", {
    open: openIpo.companyName,
    upcoming: upcomingIpo.companyName,
    listed: listedIpo.companyName,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
