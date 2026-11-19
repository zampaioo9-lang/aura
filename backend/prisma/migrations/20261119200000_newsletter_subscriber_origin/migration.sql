-- Origen del suscriptor de la Revista: de que red o enlace llego. Columnas opcionales (los registros anteriores quedan en NULL).
ALTER TABLE "NewsletterSubscriber"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "campaign" TEXT,
  ADD COLUMN "landingPage" TEXT;
