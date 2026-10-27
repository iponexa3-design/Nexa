-- NII split (above Rs 10 lakh / Rs 2-10 lakh) and shareholder quota, for the day-wise subscription table.
ALTER TABLE "subscriptions" ADD COLUMN "nii_big" DECIMAL(65,30);
ALTER TABLE "subscriptions" ADD COLUMN "nii_small" DECIMAL(65,30);
ALTER TABLE "subscriptions" ADD COLUMN "shareholders" DECIMAL(65,30);
