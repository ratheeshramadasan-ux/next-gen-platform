import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/ratheesh/next-gen-platform/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  ALTER TABLE platform.applications
    ADD COLUMN IF NOT EXISTS app_code          TEXT,
    ADD COLUMN IF NOT EXISTS application_type  TEXT,
    ADD COLUMN IF NOT EXISTS business_owner    TEXT,
    ADD COLUMN IF NOT EXISTS technical_owner   TEXT,
    ADD COLUMN IF NOT EXISTS description       TEXT,
    ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS timezone          TEXT NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS is_24x7           BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS customer_id       UUID REFERENCES platform.customers(id)
`);
console.log('✅ applications extended');

await pool.query(`
  CREATE TABLE IF NOT EXISTS platform.app_operating_hours (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES platform.applications(id) ON DELETE CASCADE,
    day_of_week    INT NOT NULL,       -- 0=Sun,1=Mon,...,6=Sat
    is_closed      BOOLEAN NOT NULL DEFAULT false,
    start_time     TEXT,              -- "06:00"
    end_time       TEXT,              -- "22:00"
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(application_id, day_of_week)
  )
`);
console.log('✅ app_operating_hours created');

await pool.query(`
  CREATE TABLE IF NOT EXISTS platform.app_blackout_periods (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id   UUID NOT NULL REFERENCES platform.applications(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    start_date       TIMESTAMPTZ NOT NULL,
    end_date         TIMESTAMPTZ NOT NULL,
    is_recurring     BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule  TEXT,
    bot_policy       TEXT NOT NULL DEFAULT 'BLOCK',
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);
console.log('✅ app_blackout_periods created');

await pool.query(`
  CREATE TABLE IF NOT EXISTS platform.app_freeze_windows (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES platform.applications(id) ON DELETE CASCADE,
    reason         TEXT NOT NULL,
    start_at       TIMESTAMPTZ NOT NULL,
    end_at         TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    impact         TEXT NOT NULL DEFAULT 'BLOCK_ALL',
    created_by     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at    TIMESTAMPTZ,
    resolved_by    TEXT
  )
`);
console.log('✅ app_freeze_windows created');

const r = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='platform' AND table_name IN
  ('app_operating_hours','app_blackout_periods','app_freeze_windows')
`);
console.log(`\nVerified ${r.rows.length}/3 new tables`);
await pool.end();
