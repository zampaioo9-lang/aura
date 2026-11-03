-- CreateTable
CREATE TABLE "BlogRebuildState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "BlogRebuildState_pkey" PRIMARY KEY ("id")
);
