-- Zona horaria opcional del paciente, para mostrarle sus citas en su horario local.
ALTER TABLE "Client" ADD COLUMN "timezone" TEXT;
