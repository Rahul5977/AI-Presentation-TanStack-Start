-- Phase 1 (W2): per-job AI token + cost accounting on generation_job.
-- Additive nullable columns; no data loss.

-- AlterTable
ALTER TABLE "generation_job" ADD COLUMN     "estCostUsd" DOUBLE PRECISION,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "provider" TEXT;

