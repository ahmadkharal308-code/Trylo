-- AlterTable: store admin rejection reason on the seller record (Gate 1)
ALTER TABLE "sellers" ADD COLUMN "rejectionReason" TEXT;
