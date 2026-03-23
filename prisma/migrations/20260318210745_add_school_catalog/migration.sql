-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalSchoolId" TEXT,
    "schoolName" TEXT NOT NULL,
    "schoolEmail" TEXT,
    "schoolStatus" TEXT,
    "cluster" TEXT,
    "safOwner" TEXT,
    "city" TEXT,
    "state" TEXT,
    "cnpj" TEXT,
    "tradeName" TEXT,
    "region" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "School_externalSchoolId_key" ON "School"("externalSchoolId");

-- CreateIndex
CREATE INDEX "School_schoolName_idx" ON "School"("schoolName");

-- CreateIndex
CREATE INDEX "School_schoolStatus_idx" ON "School"("schoolStatus");

-- CreateIndex
CREATE INDEX "School_cluster_idx" ON "School"("cluster");

-- CreateIndex
CREATE INDEX "School_state_idx" ON "School"("state");

-- CreateIndex
CREATE INDEX "School_cnpj_idx" ON "School"("cnpj");
