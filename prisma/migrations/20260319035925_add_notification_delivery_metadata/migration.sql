-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "schoolId" TEXT,
    "recipientChannel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipientEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "summary" TEXT NOT NULL,
    "payloadJson" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    CONSTRAINT "NotificationEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NotificationEvent" ("createdAt", "entityId", "entityType", "id", "notificationType", "payloadJson", "processedAt", "recipientChannel", "recipientEmail", "schoolId", "status", "summary", "updatedAt") SELECT "createdAt", "entityId", "entityType", "id", "notificationType", "payloadJson", "processedAt", "recipientChannel", "recipientEmail", "schoolId", "status", "summary", "updatedAt" FROM "NotificationEvent";
DROP TABLE "NotificationEvent";
ALTER TABLE "new_NotificationEvent" RENAME TO "NotificationEvent";
CREATE INDEX "NotificationEvent_schoolId_createdAt_idx" ON "NotificationEvent"("schoolId", "createdAt");
CREATE INDEX "NotificationEvent_status_createdAt_idx" ON "NotificationEvent"("status", "createdAt");
CREATE INDEX "NotificationEvent_notificationType_createdAt_idx" ON "NotificationEvent"("notificationType", "createdAt");
CREATE INDEX "NotificationEvent_entityType_entityId_idx" ON "NotificationEvent"("entityType", "entityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
