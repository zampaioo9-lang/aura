import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  META_WA_TOKEN: process.env.META_WA_TOKEN || '',
  META_WA_PHONE_NUMBER_ID: process.env.META_WA_PHONE_NUMBER_ID || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY || '',
  STRIPE_PRICE_YEARLY: process.env.STRIPE_PRICE_YEARLY || '',
  STRIPE_PRICE_LIFETIME_LAUNCH: process.env.STRIPE_PRICE_LIFETIME_LAUNCH || '',
  STRIPE_PRICE_LIFETIME: process.env.STRIPE_PRICE_LIFETIME || '',
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
  PAYPAL_PLAN_MONTHLY: process.env.PAYPAL_PLAN_MONTHLY || '',
  PAYPAL_PLAN_YEARLY: process.env.PAYPAL_PLAN_YEARLY || '',
  PAYPAL_BASE_URL: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
};
