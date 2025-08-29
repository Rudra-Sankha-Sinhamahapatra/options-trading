/*
  Warnings:

  - You are about to alter the column `stopLoss` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `takeProfit` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `userAmount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `closePrice` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - You are about to alter the column `marketPrice` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `BigInt`.
  - Added the required column `decimals` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "decimals" INTEGER NOT NULL,
ADD COLUMN     "userAmountDecimal" INTEGER,
ALTER COLUMN "stopLoss" SET DATA TYPE BIGINT,
ALTER COLUMN "takeProfit" SET DATA TYPE BIGINT,
ALTER COLUMN "userAmount" DROP NOT NULL,
ALTER COLUMN "userAmount" SET DATA TYPE BIGINT,
ALTER COLUMN "closePrice" SET DATA TYPE BIGINT,
ALTER COLUMN "marketPrice" SET DATA TYPE BIGINT;
