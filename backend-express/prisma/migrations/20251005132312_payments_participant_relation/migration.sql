/*
  Warnings:

  - A unique constraint covering the columns `[session_id,user_id]` on the table `participants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[session_id,wallet_address]` on the table `participants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."payments" ADD COLUMN     "participant_id" TEXT;

-- CreateIndex
CREATE INDEX "participants_session_id_idx" ON "public"."participants"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_session_id_user_id_key" ON "public"."participants"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_session_id_wallet_address_key" ON "public"."participants"("session_id", "wallet_address");

-- CreateIndex
CREATE INDEX "payments_session_id_idx" ON "public"."payments"("session_id");

-- CreateIndex
CREATE INDEX "payments_participant_id_idx" ON "public"."payments"("participant_id");

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
