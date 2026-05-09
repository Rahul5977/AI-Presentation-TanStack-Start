-- CreateEnum
CREATE TYPE "PresentationStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('STUDENTS', 'PROFESSIONALS', 'INVESTORS', 'GENERAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ToneType" AS ENUM ('FORMAL', 'CASUAL', 'PERSUASIVE', 'EDUCATIONAL', 'INSPIRATIONAL');

-- CreateEnum
CREATE TYPE "LengthPreset" AS ENUM ('SHORT', 'MEDIUM', 'LONG', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ImageStyle" AS ENUM ('REALISTIC', 'ILLUSTRATION', 'MINIMAL', 'THREE_D', 'NONE');

-- CreateEnum
CREATE TYPE "DepthType" AS ENUM ('HIGH_LEVEL', 'BALANCED', 'DETAILED');

-- CreateEnum
CREATE TYPE "TemplateKind" AS ENUM ('MINIMAL_MONO', 'BOLD_GRADIENT', 'EDITORIAL_SERIF', 'TECH_DARK');

-- CreateTable
CREATE TABLE "presentation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "PresentationStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" "AudienceType" NOT NULL DEFAULT 'GENERAL',
    "audienceCustom" TEXT,
    "tone" "ToneType" NOT NULL DEFAULT 'EDUCATIONAL',
    "lengthPreset" "LengthPreset" NOT NULL DEFAULT 'MEDIUM',
    "customSlideCount" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'English',
    "template" "TemplateKind" NOT NULL DEFAULT 'MINIMAL_MONO',
    "imageStyle" "ImageStyle" NOT NULL DEFAULT 'ILLUSTRATION',
    "depth" "DepthType" NOT NULL DEFAULT 'BALANCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presentation_userId_updatedAt_idx" ON "presentation"("userId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "presentation" ADD CONSTRAINT "presentation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
