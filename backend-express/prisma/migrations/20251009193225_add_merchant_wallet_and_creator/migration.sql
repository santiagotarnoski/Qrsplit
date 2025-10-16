-- AlterTable
ALTER TABLE "public"."sessions" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "merchant_wallet" TEXT;

-- CreateIndex
CREATE INDEX "sessions_merchant_wallet_idx" ON "public"."sessions"("merchant_wallet");
