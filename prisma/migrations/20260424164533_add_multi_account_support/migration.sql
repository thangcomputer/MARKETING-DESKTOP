/*
  Warnings:

  - You are about to drop the column `label` on the `PlatformCredential` table. All the data in the column will be lost.
  - Added the required column `credentialId` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountName` to the `PlatformCredential` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantAvatar" TEXT,
    "participantPhone" TEXT,
    "participantEmail" TEXT,
    "participantLink" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PlatformCredential" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("createdAt", "externalId", "id", "isArchived", "lastMessage", "lastMessageAt", "participantAvatar", "participantName", "platform", "unreadCount", "updatedAt") SELECT "createdAt", "externalId", "id", "isArchived", "lastMessage", "lastMessageAt", "participantAvatar", "participantName", "platform", "unreadCount", "updatedAt" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE INDEX "Conversation_credentialId_lastMessageAt_idx" ON "Conversation"("credentialId", "lastMessageAt");
CREATE UNIQUE INDEX "Conversation_credentialId_externalId_key" ON "Conversation"("credentialId", "externalId");
CREATE TABLE "new_PlatformCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "appId" TEXT,
    "appSecret" TEXT,
    "pageId" TEXT,
    "webhookUrl" TEXT,
    "verifyToken" TEXT,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformCredential" ("accessToken", "appId", "appSecret", "createdAt", "expiresAt", "id", "isActive", "pageId", "platform", "refreshToken", "updatedAt") SELECT "accessToken", "appId", "appSecret", "createdAt", "expiresAt", "id", "isActive", "pageId", "platform", "refreshToken", "updatedAt" FROM "PlatformCredential";
DROP TABLE "PlatformCredential";
ALTER TABLE "new_PlatformCredential" RENAME TO "PlatformCredential";
CREATE INDEX "PlatformCredential_platform_isActive_idx" ON "PlatformCredential"("platform", "isActive");
CREATE TABLE "new_ScheduledPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialId" TEXT,
    "credentialIds" TEXT NOT NULL DEFAULT '[]',
    "platforms" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "captionFb" TEXT,
    "captionZalo" TEXT,
    "captionTiktok" TEXT,
    "mediaUrls" TEXT,
    "mediaType" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "publishResults" TEXT,
    "errorLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduledPost_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PlatformCredential" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledPost" ("caption", "createdAt", "credentialId", "errorLog", "id", "mediaType", "mediaUrls", "platforms", "publishResults", "scheduledAt", "status", "updatedAt") SELECT "caption", "createdAt", "credentialId", "errorLog", "id", "mediaType", "mediaUrls", "platforms", "publishResults", "scheduledAt", "status", "updatedAt" FROM "ScheduledPost";
DROP TABLE "ScheduledPost";
ALTER TABLE "new_ScheduledPost" RENAME TO "ScheduledPost";
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON "ScheduledPost"("status", "scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
