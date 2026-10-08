-- AddColumn: Item.held (reservations counter)
ALTER TABLE "Item" ADD COLUMN "held" INTEGER NOT NULL DEFAULT 0;

-- AddColumn: Sale.depositPaid (THB already paid via PayPal collections)
ALTER TABLE "Sale" ADD COLUMN "depositPaid" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "goldRate" REAL NOT NULL,
    "priceSatang" INTEGER NOT NULL,
    "depositSatang" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "depositMinor" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "clientIp" TEXT,
    "status" TEXT NOT NULL,
    "paypalOrderId" TEXT,
    "captureStatus" TEXT,
    "capturedMinor" INTEGER,
    "claimedAt" DATETIME,
    "heldUntil" DATETIME NOT NULL,
    "saleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_quoteId_key" ON "Reservation"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_paypalOrderId_key" ON "Reservation"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_saleId_key" ON "Reservation"("saleId");
