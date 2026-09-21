-- CreateEnum
CREATE TYPE "IpoType" AS ENUM ('MAINBOARD', 'SME');

-- CreateEnum
CREATE TYPE "IpoStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSED', 'LISTED');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateTable
CREATE TABLE "ipos" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "symbol" TEXT,
    "ipo_type" "IpoType" NOT NULL,
    "exchange" TEXT NOT NULL,
    "status" "IpoStatus" NOT NULL DEFAULT 'UPCOMING',
    "price_band_low" DECIMAL(65,30),
    "price_band_high" DECIMAL(65,30),
    "issue_size" DECIMAL(65,30),
    "lot_size" INTEGER,
    "open_date" TIMESTAMP(3),
    "close_date" TIMESTAMP(3),
    "allotment_date" TIMESTAMP(3),
    "listing_date" TIMESTAMP(3),
    "actual_listing_price" DECIMAL(65,30),
    "face_value" DECIMAL(65,30),
    "issue_price" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmp_history" (
    "id" TEXT NOT NULL,
    "ipo_id" TEXT NOT NULL,
    "gmp" DECIMAL(65,30) NOT NULL,
    "gmp_percentage" DECIMAL(65,30),
    "estimated_listing_price" DECIMAL(65,30),
    "estimated_gain_per_share" DECIMAL(65,30),
    "estimated_gain_per_lot" DECIMAL(65,30),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3),

    CONSTRAINT "gmp_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "ipo_id" TEXT NOT NULL,
    "qib" DECIMAL(65,30),
    "nii" DECIMAL(65,30),
    "retail" DECIMAL(65,30),
    "employee" DECIMAL(65,30),
    "total" DECIMAL(65,30),
    "subscription_date" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "last_updated" TIMESTAMP(3),
    "status" "DataSourceStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ipos_slug_key" ON "ipos"("slug");

-- CreateIndex
CREATE INDEX "ipos_status_idx" ON "ipos"("status");

-- CreateIndex
CREATE INDEX "gmp_history_ipo_id_recorded_at_idx" ON "gmp_history"("ipo_id", "recorded_at");

-- CreateIndex
CREATE INDEX "subscriptions_ipo_id_subscription_date_idx" ON "subscriptions"("ipo_id", "subscription_date");

-- AddForeignKey
ALTER TABLE "gmp_history" ADD CONSTRAINT "gmp_history_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "ipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "ipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
