-- Phase 4: add 4 new TemplateKind values.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TemplateKind" ADD VALUE 'CORPORATE_BLUE';
ALTER TYPE "TemplateKind" ADD VALUE 'VIBRANT_POP';
ALTER TYPE "TemplateKind" ADD VALUE 'WARM_SAND';
ALTER TYPE "TemplateKind" ADD VALUE 'MIDNIGHT_PRO';

