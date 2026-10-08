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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "held" INTEGER NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL,
    "purity" REAL NOT NULL,
    "laborFee" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("categoryId", "description", "id", "image", "laborFee", "purity", "stock", "title", "updatedAt", "weight") SELECT "categoryId", "description", "id", "image", "laborFee", "purity", "stock", "title", "updatedAt", "weight" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashierId" INTEGER NOT NULL,
    "cashierName" TEXT NOT NULL,
    "payment" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "change" INTEGER NOT NULL,
    "goldRate" REAL NOT NULL,
    "lockedAt" DATETIME NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "promoCodes" TEXT NOT NULL DEFAULT '',
    "saleKey" TEXT,
    "depositPaid" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Sale" ("amountPaid", "cashierId", "cashierName", "change", "createdAt", "discount", "goldRate", "id", "lockedAt", "payment", "promoCodes", "saleKey", "subtotal", "total") SELECT "amountPaid", "cashierId", "cashierName", "change", "createdAt", "discount", "goldRate", "id", "lockedAt", "payment", "promoCodes", "saleKey", "subtotal", "total" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_saleKey_key" ON "Sale"("saleKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_quoteId_key" ON "Reservation"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_paypalOrderId_key" ON "Reservation"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_saleId_key" ON "Reservation"("saleId");

