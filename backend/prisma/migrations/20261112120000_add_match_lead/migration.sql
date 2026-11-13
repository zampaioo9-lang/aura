-- CreateTable
CREATE TABLE "MatchLead" (
    "id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "matchedProfileIds" TEXT[],
    "name" TEXT,
    "whatsapp" TEXT,
    "selectedProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactedAt" TIMESTAMP(3),
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "MatchLead_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "matchLeadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_matchLeadId_key" ON "Booking"("matchLeadId");

-- CreateIndex
CREATE INDEX "MatchLead_selectedProfileId_idx" ON "MatchLead"("selectedProfileId");

-- AddForeignKey
ALTER TABLE "MatchLead" ADD CONSTRAINT "MatchLead_selectedProfileId_fkey" FOREIGN KEY ("selectedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_matchLeadId_fkey" FOREIGN KEY ("matchLeadId") REFERENCES "MatchLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
