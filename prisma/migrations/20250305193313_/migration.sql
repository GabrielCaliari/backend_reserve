/*
  Warnings:

  - A unique constraint covering the columns `[api_identifier]` on the table `APIToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "APIToken_api_identifier_key" ON "APIToken"("api_identifier");
