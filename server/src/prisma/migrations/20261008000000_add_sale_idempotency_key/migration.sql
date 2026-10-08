-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "saleKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleKey_key" ON "Sale"("saleKey");

