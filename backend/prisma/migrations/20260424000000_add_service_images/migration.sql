-- Migration: add images[] field to Service model
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT '{}';
