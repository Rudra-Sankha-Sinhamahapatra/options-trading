-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('SPOT', 'LEVARAGE');

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "leverage" INTEGER,
ADD COLUMN     "margin" BIGINT,
ADD COLUMN     "marginDecimal" INTEGER,
ADD COLUMN     "ordertype" "public"."OrderType" NOT NULL DEFAULT 'SPOT',
ADD COLUMN     "pnl" BIGINT,
ALTER COLUMN "qty" DROP NOT NULL;
