-- Aviso al reagendar una cita
ALTER TYPE "NotificationType" ADD VALUE 'RESCHEDULED';

-- Codigo secreto por cita para cancelar o reagendar desde un enlace. Las citas existentes reciben uno propio.
ALTER TABLE "Booking" ADD COLUMN "manageToken" TEXT;
UPDATE "Booking" SET "manageToken" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') WHERE "manageToken" IS NULL;
CREATE UNIQUE INDEX "Booking_manageToken_key" ON "Booking"("manageToken");
