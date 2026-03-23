-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VoucherRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "schoolId" TEXT,
    "schoolName" TEXT NOT NULL,
    "schoolExternalId" TEXT,
    "schoolEmail" TEXT,
    "ticketNumber" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "responsible1Name" TEXT NOT NULL,
    "responsible1Cpf" TEXT NOT NULL,
    "responsible2Name" TEXT NOT NULL,
    "responsible2Cpf" TEXT NOT NULL,
    "discountPercentage" INTEGER,
    "installmentCount" INTEGER,
    CONSTRAINT "VoucherRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VoucherRequest" ("createdAt", "discountPercentage", "id", "installmentCount", "justification", "origin", "requestType", "requesterName", "responsible1Cpf", "responsible1Name", "responsible2Cpf", "responsible2Name", "schoolName", "status", "ticketNumber", "updatedAt") SELECT "createdAt", "discountPercentage", "id", "installmentCount", "justification", "origin", "requestType", "requesterName", "responsible1Cpf", "responsible1Name", "responsible2Cpf", "responsible2Name", "schoolName", "status", "ticketNumber", "updatedAt" FROM "VoucherRequest";
DROP TABLE "VoucherRequest";
ALTER TABLE "new_VoucherRequest" RENAME TO "VoucherRequest";
CREATE INDEX "VoucherRequest_status_idx" ON "VoucherRequest"("status");
CREATE INDEX "VoucherRequest_schoolId_idx" ON "VoucherRequest"("schoolId");
CREATE INDEX "VoucherRequest_schoolName_idx" ON "VoucherRequest"("schoolName");
CREATE INDEX "VoucherRequest_schoolExternalId_idx" ON "VoucherRequest"("schoolExternalId");
CREATE INDEX "VoucherRequest_ticketNumber_idx" ON "VoucherRequest"("ticketNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
