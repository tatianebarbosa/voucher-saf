-- CreateTable
CREATE TABLE "VoucherRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
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
    "installmentCount" INTEGER
);

-- CreateIndex
CREATE INDEX "VoucherRequest_status_idx" ON "VoucherRequest"("status");

-- CreateIndex
CREATE INDEX "VoucherRequest_schoolName_idx" ON "VoucherRequest"("schoolName");

-- CreateIndex
CREATE INDEX "VoucherRequest_ticketNumber_idx" ON "VoucherRequest"("ticketNumber");
