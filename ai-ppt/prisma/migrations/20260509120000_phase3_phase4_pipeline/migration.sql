-- AlterEnum
ALTER TYPE "PresentationStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

-- CreateEnum
CREATE TYPE "SlideStatus" AS ENUM ('PENDING', 'CONTENT_READY', 'IMAGE_READY', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SLIDE_CONTENT_GENERATE', 'SLIDE_IMAGE_GENERATE', 'SLIDE_IMAGE_UPLOAD', 'PRESENTATION_FINALIZE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "draft" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "audience" "AudienceType" NOT NULL,
    "audienceCustom" TEXT,
    "tone" "ToneType" NOT NULL,
    "lengthPreset" "LengthPreset" NOT NULL,
    "customSlideCount" INTEGER,
    "language" TEXT NOT NULL,
    "template" "TemplateKind" NOT NULL,
    "imageStyle" "ImageStyle" NOT NULL,
    "depth" "DepthType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_slide" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "bullets" JSONB NOT NULL,
    "visualConcept" TEXT NOT NULL,
    "speakerNotesHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slide" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "sourceDraftSlideId" TEXT,
    "status" "SlideStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "bullets" JSONB NOT NULL,
    "visualConcept" TEXT NOT NULL,
    "speakerNotes" TEXT,
    "layoutHints" JSONB,
    "imagePrompt" TEXT,
    "imageAssetId" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentReadyAt" TIMESTAMP(3),
    "imageReadyAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_job" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "slideId" TEXT,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "slideId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'imagekit',
    "providerFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "draft_presentationId_key" ON "draft"("presentationId");

-- CreateIndex
CREATE INDEX "draft_updatedAt_idx" ON "draft"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "draft_slide_draftId_position_idx" ON "draft_slide"("draftId", "position");

-- CreateIndex
CREATE INDEX "slide_presentationId_position_idx" ON "slide"("presentationId", "position");

-- CreateIndex
CREATE INDEX "slide_presentationId_status_idx" ON "slide"("presentationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "generation_job_idempotencyKey_key" ON "generation_job"("idempotencyKey");

-- CreateIndex
CREATE INDEX "generation_job_status_createdAt_idx" ON "generation_job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "generation_job_presentationId_type_idx" ON "generation_job"("presentationId", "type");

-- CreateIndex
CREATE INDEX "generation_job_slideId_type_idx" ON "generation_job"("slideId", "type");

-- CreateIndex
CREATE INDEX "asset_presentationId_createdAt_idx" ON "asset"("presentationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "asset_slideId_createdAt_idx" ON "asset"("slideId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "presentation_status_updatedAt_idx" ON "presentation"("status", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "draft" ADD CONSTRAINT "draft_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_slide" ADD CONSTRAINT "draft_slide_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide" ADD CONSTRAINT "slide_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "slide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
