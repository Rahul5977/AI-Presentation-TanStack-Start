-- Phase 1 (W3a): async outline generation.
-- Adds DraftStatus enum + draft.status/lastError, and JobType.OUTLINE_GENERATE.
-- Additive; existing drafts default to OUTLINE_READY. No data loss.

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('OUTLINE_PENDING', 'OUTLINE_GENERATING', 'OUTLINE_READY', 'OUTLINE_FAILED');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'OUTLINE_GENERATE';

-- AlterTable
ALTER TABLE "draft" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "status" "DraftStatus" NOT NULL DEFAULT 'OUTLINE_READY';

