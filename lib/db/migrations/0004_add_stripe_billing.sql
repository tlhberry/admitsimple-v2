-- Migration: Add Stripe billing columns to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id varchar(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id varchar(255),
  ADD COLUMN IF NOT EXISTS subscription_status varchar(50) NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;

-- Backfill trial_ends_at for existing companies (30 days from their created_at)
UPDATE companies
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE trial_ends_at IS NULL;
