-- Reusable, named sets of custom fields that can be applied to any product.
CREATE TABLE "field_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_templates_pkey" PRIMARY KEY ("id")
);
