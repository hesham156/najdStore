-- Multi-rule conditional visibility for custom product fields (AND/OR of several
-- rules), superseding the legacy single condFieldKey/condValue pair.
ALTER TABLE "product_fields" ADD COLUMN "condLogic" TEXT;
ALTER TABLE "product_fields" ADD COLUMN "conditions" JSONB;
