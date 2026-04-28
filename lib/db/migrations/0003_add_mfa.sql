-- Migration: Add MFA (TOTP) support
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
