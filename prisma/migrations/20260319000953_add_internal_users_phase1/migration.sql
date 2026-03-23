-- CreateTable
CREATE TABLE "SchoolVoucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "schoolExternalId" TEXT,
    "schoolName" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL DEFAULT 'CAMPANHA',
    "campaignName" TEXT NOT NULL,
    "voucherCode" TEXT NOT NULL,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "quantitySent" INTEGER NOT NULL DEFAULT 0,
    "sentToEmail" TEXT,
    "sentAt" DATETIME,
    "expiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "sourceFile" TEXT,
    "sourceSheet" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolVoucher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SchoolVoucher_schoolId_idx" ON "SchoolVoucher"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolVoucher_schoolExternalId_idx" ON "SchoolVoucher"("schoolExternalId");

-- CreateIndex
CREATE INDEX "SchoolVoucher_schoolName_idx" ON "SchoolVoucher"("schoolName");

-- CreateIndex
CREATE INDEX "SchoolVoucher_voucherType_idx" ON "SchoolVoucher"("voucherType");

-- CreateIndex
CREATE INDEX "SchoolVoucher_campaignName_idx" ON "SchoolVoucher"("campaignName");

-- CreateIndex
CREATE INDEX "SchoolVoucher_voucherCode_idx" ON "SchoolVoucher"("voucherCode");

-- CreateIndex
CREATE INDEX "SchoolVoucher_status_idx" ON "SchoolVoucher"("status");

-- CreateIndex
CREATE INDEX "SchoolVoucher_expiresAt_idx" ON "SchoolVoucher"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
