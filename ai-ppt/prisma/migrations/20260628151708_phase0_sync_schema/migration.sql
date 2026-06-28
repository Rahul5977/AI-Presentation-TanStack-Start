-- Phase 0: sync migration history with schema.prisma
-- Adds brand_kit, deck_payment, presentation_member, presentation_version,
-- user_usage_counter, usage_event tables + related enums/columns/indexes/FKs.
-- Purely additive (no DROP); safe on existing data. Generated via prisma migrate diff.

-- CreateEnum
CREATE TYPE "PresentationMemberRole" AS ENUM ('EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('PRESENTATIONS_CREATED', 'SLIDES_GENERATED', 'EXPORTS', 'SOURCE_IMPORTS', 'SLIDE_ASSISTANT_REQUESTS');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('PRESENTATION_CREATED', 'SLIDE_GENERATION_STARTED', 'EXPORT_DOWNLOADED', 'SOURCE_IMPORTED', 'SLIDE_ASSISTANT_USED');

-- CreateEnum
CREATE TYPE "TextTransformAction" AS ENUM ('MAKE_SHORTER', 'MORE_FORMAL', 'ADD_STATISTIC');

-- AlterTable
ALTER TABLE "draft" ADD COLUMN     "themeOverrides" JSONB;

-- AlterTable
ALTER TABLE "draft_slide" ADD COLUMN     "slideData" JSONB;

-- AlterTable
ALTER TABLE "presentation" ADD COLUMN     "brandAccentColor" TEXT,
ADD COLUMN     "brandKitId" TEXT,
ADD COLUMN     "brandLogoUrl" TEXT,
ADD COLUMN     "brandPrimaryColor" TEXT,
ADD COLUMN     "citationMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "themeOverrides" JSONB;

-- AlterTable
ALTER TABLE "slide" ADD COLUMN     "slideData" JSONB;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "brand_kit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseTemplate" "TemplateKind" NOT NULL DEFAULT 'MINIMAL_MONO',
    "overrides" JSONB NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amountInr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "credits" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_member" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PresentationMemberRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentation_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_version" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presentation_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_usage_counter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_usage_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presentationId" TEXT,
    "metric" "UsageMetric" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "type" "UsageEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_kit_userId_updatedAt_idx" ON "brand_kit"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "deck_payment_userId_idx" ON "deck_payment"("userId");

-- CreateIndex
CREATE INDEX "deck_payment_razorpayOrderId_idx" ON "deck_payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "presentation_member_userId_idx" ON "presentation_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "presentation_member_presentationId_userId_key" ON "presentation_member"("presentationId", "userId");

-- CreateIndex
CREATE INDEX "presentation_version_presentationId_createdAt_idx" ON "presentation_version"("presentationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_usage_counter_userId_periodStart_idx" ON "user_usage_counter"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "user_usage_counter_userId_metric_periodStart_key" ON "user_usage_counter"("userId", "metric", "periodStart");

-- CreateIndex
CREATE INDEX "usage_event_userId_createdAt_idx" ON "usage_event"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "usage_event_type_createdAt_idx" ON "usage_event"("type", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "presentation_shareToken_key" ON "presentation"("shareToken");

-- CreateIndex
CREATE INDEX "presentation_shareToken_idx" ON "presentation"("shareToken");

-- AddForeignKey
ALTER TABLE "brand_kit" ADD CONSTRAINT "brand_kit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_payment" ADD CONSTRAINT "deck_payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation" ADD CONSTRAINT "presentation_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "brand_kit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_member" ADD CONSTRAINT "presentation_member_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_member" ADD CONSTRAINT "presentation_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_version" ADD CONSTRAINT "presentation_version_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_usage_counter" ADD CONSTRAINT "user_usage_counter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

