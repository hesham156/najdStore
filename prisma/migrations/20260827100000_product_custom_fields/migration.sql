-- Salla-style custom product fields (parallel to the variant-matrix system).
CREATE TABLE "product_fields" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "values" JSONB,
    "config" JSONB,
    "condFieldKey" TEXT,
    "condValue" TEXT,

    CONSTRAINT "product_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_fields_productId_idx" ON "product_fields"("productId");
CREATE UNIQUE INDEX "product_fields_productId_key_key" ON "product_fields"("productId", "key");

ALTER TABLE "product_fields" ADD CONSTRAINT "product_fields_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer-filled custom field values, stored on each order line for display.
ALTER TABLE "order_items" ADD COLUMN "customFields" JSONB;
