/*
  Warnings:

  - You are about to drop the column `pibotMessagesId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_pibotMessagesId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pibotMessagesId";

-- AddForeignKey
ALTER TABLE "PibotMessages" ADD CONSTRAINT "PibotMessages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
