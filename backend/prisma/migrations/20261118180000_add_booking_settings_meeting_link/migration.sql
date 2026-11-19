-- Enlace fijo de videollamada del profesional (opcional), para incluirlo en la confirmacion y el recordatorio.
ALTER TABLE "BookingSettings" ADD COLUMN "meetingLink" TEXT;
