-- Partial/full refund tracking on payments.
ALTER TABLE "payments" ADD COLUMN "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "refundedAt" TIMESTAMP(3);
