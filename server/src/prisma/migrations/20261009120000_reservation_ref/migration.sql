-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "ref" TEXT;

-- Backfill rows made before refs were stored with the code they were already shown (the id's last 6 characters).
UPDATE "Reservation" SET "ref" = 'R-' || upper(substr("id", -6));

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_ref_key" ON "Reservation"("ref");
