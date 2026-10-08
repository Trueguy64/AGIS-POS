-- CreateTable
CREATE TABLE "Sale" (
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
    "promoCodes" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "itemId" TEXT,
    "title" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "purity" REAL NOT NULL,
    "laborFee" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
