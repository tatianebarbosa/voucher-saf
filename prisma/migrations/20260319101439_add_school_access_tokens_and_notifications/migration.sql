-- CreateTable
CREATE TABLE "SchoolAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "revokedAt" DATETIME,
    "recipientEmail" TEXT,
    "requestedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAccessToken_tokenHash_key" ON "SchoolAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SchoolAccessToken_userId_tokenType_createdAt_idx" ON "SchoolAccessToken"("userId", "tokenType", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolAccessToken_userId_tokenType_expiresAt_idx" ON "SchoolAccessToken"("userId", "tokenType", "expiresAt");

-- CreateIndex
CREATE INDEX "SchoolAccessToken_tokenType_expiresAt_idx" ON "SchoolAccessToken"("tokenType", "expiresAt");
