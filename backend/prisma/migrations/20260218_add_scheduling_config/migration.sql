-- AddColumn: serviceAvailabilities relation on Service (no SQL needed, relation only)

-- CreateTable: BookingSettings
CREATE TABLE IF NOT EXISTS "BookingSettings" (
    "id"                 TEXT        NOT NULL,
    "profileId"          TEXT        NOT NULL,
    "bufferMinutes"      INTEGER     NOT NULL DEFAULT 0,
    "advanceBookingDays" INTEGER     NOT NULL DEFAULT 60,
    "minAdvanceHours"    INTEGER     NOT NULL DEFAULT 1,
    "cancellationHours"  INTEGER     NOT NULL DEFAULT 24,
    "autoConfirm"        BOOLEAN     NOT NULL DEFAULT false,
    "timezone"           TEXT        NOT NULL DEFAULT 'America/Mexico_City',
    "language"           TEXT        NOT NULL DEFAULT 'es',
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ScheduleBlock
CREATE TABLE IF NOT EXISTS "ScheduleBlock" (
    "id"        TEXT        NOT NULL,
    "profileId" TEXT        NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime"   TEXT,
    "isAllDay"  BOOLEAN     NOT NULL DEFAULT true,
    "reason"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ServiceAvailability
CREATE TABLE IF NOT EXISTS "ServiceAvailability" (
    "id"        TEXT        NOT NULL,
    "serviceId" TEXT        NOT NULL,
    "dayOfWeek" INTEGER     NOT NULL,
    "startTime" TEXT        NOT NULL,
    "endTime"   TEXT        NOT NULL,
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAvailability_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex: BookingSettings.profileId
CREATE UNIQUE INDEX IF NOT EXISTS "BookingSettings_profileId_key" ON "BookingSettings"("profileId");

-- Indexes: ScheduleBlock
CREATE INDEX IF NOT EXISTS "ScheduleBlock_profileId_idx"            ON "ScheduleBlock"("profileId");
CREATE INDEX IF NOT EXISTS "ScheduleBlock_profileId_startDate_endDate_idx" ON "ScheduleBlock"("profileId", "startDate", "endDate");

-- Indexes: ServiceAvailability
CREATE INDEX IF NOT EXISTS "ServiceAvailability_serviceId_idx"          ON "ServiceAvailability"("serviceId");
CREATE INDEX IF NOT EXISTS "ServiceAvailability_serviceId_dayOfWeek_idx" ON "ServiceAvailability"("serviceId", "dayOfWeek");

-- ForeignKeys
ALTER TABLE "BookingSettings"   ADD CONSTRAINT "BookingSettings_profileId_fkey"   FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleBlock"     ADD CONSTRAINT "ScheduleBlock_profileId_fkey"     FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceAvailability" ADD CONSTRAINT "ServiceAvailability_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger para updatedAt automático (BookingSettings)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_booking_settings_updated_at') THEN
    CREATE TRIGGER set_booking_settings_updated_at BEFORE UPDATE ON "BookingSettings" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_schedule_block_updated_at') THEN
    CREATE TRIGGER set_schedule_block_updated_at BEFORE UPDATE ON "ScheduleBlock" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_service_availability_updated_at') THEN
    CREATE TRIGGER set_service_availability_updated_at BEFORE UPDATE ON "ServiceAvailability" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
