-- 1. Create the trigger function for auto-updating timestamps
-- (You only need to run this once per database)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. App Users Table
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL, -- 'organization_signup' or 'user_signup'
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Organization Credentials Table
CREATE TABLE IF NOT EXISTS organization_credentials (
    id SERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    credentials JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attach the trigger to organization_credentials
DROP TRIGGER IF EXISTS update_org_credentials_modtime ON organization_credentials;
CREATE TRIGGER update_org_credentials_modtime
    BEFORE UPDATE ON organization_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 5. GMPRO Responses Table
CREATE TABLE IF NOT EXISTS gmpro_responses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Vehicle Types Table
CREATE TABLE IF NOT EXISTS vehicle_types (
    id integer PRIMARY KEY,
    organization_id uuid,
    name text,
    count integer,
    is_active boolean,
    created_at timestamp with time zone
);

-- 7. Vehicle Specifications Table
CREATE TABLE IF NOT EXISTS vehicle_specs (
    id integer PRIMARY KEY,
    type_id integer,
    max_cbm numeric(10,2),
    max_weight_kg integer,
    length_cm numeric(10,2),
    width_cm numeric(10,2),
    height_cm numeric(10,2)
);

-- 8. Migrations / Safety checks
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE app_users SET name = 'User' WHERE name IS NULL;
ALTER TABLE app_users ALTER COLUMN name SET NOT NULL;

ALTER TABLE vehicle_specs ADD COLUMN IF NOT EXISTS length_cm numeric(10,2);
ALTER TABLE vehicle_specs ADD COLUMN IF NOT EXISTS width_cm numeric(10,2);
ALTER TABLE vehicle_specs ADD COLUMN IF NOT EXISTS height_cm numeric(10,2);
ALTER TABLE vehicle_specs DROP COLUMN IF EXISTS created_at;

ALTER TABLE vehicle_types ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE vehicle_types ALTER COLUMN name DROP NOT NULL;

ALTER TABLE gmpro_responses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE gmpro_responses ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS calc_count INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS calc_count INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS total_calc_count INTEGER DEFAULT 0;