-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "closePrice" DECIMAL(65,30),
ADD COLUMN     "marketPrice" DECIMAL(65,30),
ALTER COLUMN "updatedAt" DROP DEFAULT;
