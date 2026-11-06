-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STOREKEEPER', 'ENGINEER', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'ON_LOAN', 'PROJECT', 'MAINTENANCE', 'RESERVED', 'LOST', 'DISPOSED');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'DAMAGED', 'BROKEN');

-- CreateEnum
CREATE TYPE "TxAction" AS ENUM ('REGISTERED', 'CHECK_OUT', 'TRANSFER', 'CHECK_IN', 'RESERVE', 'CANCEL_RESERVATION', 'REMINDER', 'LOST', 'FOUND', 'MAINTENANCE', 'REPAIRED', 'DISPOSED', 'CALIBRATION', 'CALIBRATION_REJECTED');

-- CreateEnum
CREATE TYPE "CalResult" AS ENUM ('ACCEPT', 'REJECT');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ENGINEER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "section" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "storageLocation" TEXT,
    "pic" TEXT,
    "picEmail" TEXT,
    "section" TEXT,
    "project" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "Condition" NOT NULL DEFAULT 'GOOD',
    "purchaseDate" TIMESTAMP(3),
    "purchaseValue" DECIMAL(15,2),
    "warrantyEnd" TIMESTAMP(3),
    "calRequired" BOOLEAN NOT NULL DEFAULT false,
    "calDue" TIMESTAMP(3),
    "calIntervalMonths" INTEGER NOT NULL DEFAULT 12,
    "currentLocation" TEXT,
    "inspectionSite" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "dueBack" TIMESTAMP(3),
    "reservedFor" TEXT,
    "reservedSection" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "action" "TxAction" NOT NULL,
    "loanType" "AssetStatus",
    "fromPic" TEXT,
    "toPic" TEXT,
    "section" TEXT,
    "inspectionSite" TEXT,
    "dueBack" TIMESTAMP(3),
    "condition" "Condition",
    "note" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calibration" (
    "id" SERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "calibratedAt" TIMESTAMP(3) NOT NULL,
    "intervalMonths" INTEGER NOT NULL,
    "vendor" TEXT,
    "certificateNo" TEXT,
    "certificateFile" TEXT,
    "result" "CalResult" NOT NULL,
    "nextDue" TIMESTAMP(3),
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calibration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_key" ON "Section"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "Asset_calDue_idx" ON "Asset"("calDue");

-- CreateIndex
CREATE INDEX "Transaction_assetId_createdAt_idx" ON "Transaction"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Calibration_assetId_calibratedAt_idx" ON "Calibration"("assetId", "calibratedAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
