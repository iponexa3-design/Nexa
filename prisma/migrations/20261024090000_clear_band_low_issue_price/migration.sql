-- The IPOAlerts adapter used to store the LOW end of a price band as the
-- issue price (e.g. 275 for a 275-289 band). Estimates and actual listing
-- gains must use the final/fixed issue price or, failing that, the disclosed
-- upper band, so clear those inferred values. Fixed-price issues
-- (low = high) keep their issue price.
UPDATE "ipos"
SET "issue_price" = NULL
WHERE "issue_price" IS NOT NULL
  AND "price_band_low" IS NOT NULL
  AND "price_band_high" IS NOT NULL
  AND "price_band_high" > "price_band_low"
  AND "issue_price" = "price_band_low";
