-- Track when a cart.abandoned event was pushed to Hayyak, so the reminder cron
-- never notifies the same abandonment twice.
ALTER TABLE "abandoned_carts" ADD COLUMN "hayyakNotifiedAt" TIMESTAMP(3);
