-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BorrowRequest" (
    "id" SERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "action" "TxAction" NOT NULL,
    "loanType" "AssetStatus" NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByEmail" TEXT,
    "requesterRole" TEXT NOT NULL,
    "section" TEXT,
    "inspectionSite" TEXT,
    "dueBack" TIMESTAMP(3),
    "note" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorrowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BorrowRequest_assetId_status_idx" ON "BorrowRequest"("assetId", "status");

-- CreateIndex
CREATE INDEX "BorrowRequest_status_createdAt_idx" ON "BorrowRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "BorrowRequest" ADD CONSTRAINT "BorrowRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
