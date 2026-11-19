-- Recordatorio de 1 hora antes de la cita
ALTER TYPE "NotificationType" ADD VALUE 'REMINDER_1H';

-- Preferencias de notificaciones y reglas de reserva configurables
ALTER TABLE "BookingSettings"
  ADD COLUMN "notificationPrefs" JSONB,
  ADD COLUMN "allowClientCancel" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "multiplePerSlot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxActiveBookingsPerClient" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "minDaysBetweenBookings" INTEGER NOT NULL DEFAULT 0;
