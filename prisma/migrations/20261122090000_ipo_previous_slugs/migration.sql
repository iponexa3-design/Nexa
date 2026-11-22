-- Earlier slugs of an IPO (feed renames and merged duplicates); their pages redirect to the current slug.
ALTER TABLE "ipos" ADD COLUMN "previous_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
