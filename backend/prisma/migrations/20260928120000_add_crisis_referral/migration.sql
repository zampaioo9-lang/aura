-- CreateTable
CREATE TABLE "CrisisReferral" (
    "id" TEXT NOT NULL,
    "riskEventId" TEXT NOT NULL,
    "profileId" TEXT,
    "emailSuccess" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrisisReferral_riskEventId_key" ON "CrisisReferral"("riskEventId");

