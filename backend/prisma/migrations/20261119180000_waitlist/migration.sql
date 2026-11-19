-- Lista de espera: interruptor por perfil y tabla de personas que esperan un horario
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'ATTENDED');

ALTER TABLE "BookingSettings" ADD COLUMN "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaitlistEntry_profileId_status_idx" ON "WaitlistEntry"("profileId", "status");
CREATE INDEX "WaitlistEntry_profileId_date_idx" ON "WaitlistEntry"("profileId", "date");

ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
