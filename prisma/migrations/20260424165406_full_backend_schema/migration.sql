/*
  Warnings:

  - You are about to drop the `PlatformCredential` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `credentialId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `participantAvatar` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `participantEmail` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `participantLink` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `credentialId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `direction` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `credentialId` on the `ScheduledPost` table. All the data in the column will be lost.
  - You are about to drop the column `credentialIds` on the `ScheduledPost` table. All the data in the column will be lost.
  - You are about to drop the column `platforms` on the `ScheduledPost` table. All the data in the column will be lost.
  - Added the required column `channelId` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderType` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channelIds` to the `ScheduledPost` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PlatformCredential_platform_isActive_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PlatformCredential";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'SUPPORTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "appId" TEXT,
    "appSecret" TEXT,
    "webhookSecret" TEXT,
    "widgetKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserChannel" (
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "channelId"),
    CONSTRAINT "UserChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "command" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "channelIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "customerId" TEXT,
    "externalId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("createdAt", "externalId", "id", "isArchived", "lastMessage", "lastMessageAt", "participantName", "participantPhone", "unreadCount", "updatedAt") SELECT "createdAt", "externalId", "id", "isArchived", "lastMessage", "lastMessageAt", "participantName", "participantPhone", "unreadCount", "updatedAt" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE INDEX "Conversation_channelId_status_lastMessageAt_idx" ON "Conversation"("channelId", "status", "lastMessageAt");
CREATE INDEX "Conversation_assignedToUserId_status_idx" ON "Conversation"("assignedToUserId", "status");
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");
CREATE UNIQUE INDEX "Conversation_channelId_externalId_key" ON "Conversation"("channelId", "externalId");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "sentByUserId" TEXT,
    "externalId" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "conversationId", "createdAt", "externalId", "id", "mediaType", "mediaUrl", "status") SELECT "content", "conversationId", "createdAt", "externalId", "id", "mediaType", "mediaUrl", "status" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_conversationId_timestamp_idx" ON "Message"("conversationId", "timestamp");
CREATE INDEX "Message_externalId_idx" ON "Message"("externalId");
CREATE TABLE "new_ScheduledPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelIds" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "captionFb" TEXT,
    "captionZalo" TEXT,
    "captionTiktok" TEXT,
    "captionWeb" TEXT,
    "mediaUrls" TEXT,
    "mediaType" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "publishResults" TEXT,
    "errorLog" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScheduledPost" ("caption", "captionFb", "captionTiktok", "captionZalo", "createdAt", "errorLog", "id", "mediaType", "mediaUrls", "publishResults", "scheduledAt", "status", "updatedAt") SELECT "caption", "captionFb", "captionTiktok", "captionZalo", "createdAt", "errorLog", "id", "mediaType", "mediaUrls", "publishResults", "scheduledAt", "status", "updatedAt" FROM "ScheduledPost";
DROP TABLE "ScheduledPost";
ALTER TABLE "new_ScheduledPost" RENAME TO "ScheduledPost";
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON "ScheduledPost"("status", "scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "Channel_platform_isActive_idx" ON "Channel"("platform", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_platform_accountId_key" ON "Channel"("platform", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "QuickReply_command_key" ON "QuickReply"("command");
