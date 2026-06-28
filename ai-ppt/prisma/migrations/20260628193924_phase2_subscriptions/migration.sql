-- Phase 2: Paddle subscription billing.
-- Adds subscription + webhook_event tables and SubscriptionStatus enum.
-- Additive; no data loss.

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'paddle',
    "gatewayCustomerId" TEXT,
    "gatewaySubscriptionId" TEXT,
    "priceId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_event" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'paddle',
    "gatewayEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_userId_key" ON "subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_gatewaySubscriptionId_key" ON "subscription"("gatewaySubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_gatewayCustomerId_idx" ON "subscription"("gatewayCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_gatewayEventId_key" ON "webhook_event"("gatewayEventId");

-- CreateIndex
CREATE INDEX "webhook_event_type_processedAt_idx" ON "webhook_event"("type", "processedAt");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

