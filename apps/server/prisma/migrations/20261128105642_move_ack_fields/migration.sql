-- Columns that rebuild the Ack of a retried SubmitMove (UC-06 E3). They are NOT NULL without a
-- default: nothing commits moves before this migration (SubmitMove is US-20), so the table is empty.
-- CreateEnum
CREATE TYPE "check_state" AS ENUM ('NONE', 'CHECK', 'CHECKMATE', 'STALEMATE');

-- AlterTable
ALTER TABLE "move" ADD COLUMN     "check_state" "check_state" NOT NULL,
ADD COLUMN     "fen" TEXT NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL;
