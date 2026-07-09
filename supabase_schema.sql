-- Supabase Schema for Gate Pass Management System

-- 1. App Users Table (Simple standalone login system, bypasses Supabase Auth)
CREATE TABLE app_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  plain_password TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert Default Admin User
INSERT INTO app_users (username, email, plain_password, role, is_active)
VALUES ('admin', 'admin@stretchline.com', 'admin123', 'admin', true);


-- 2. Raw Upload Tables (temp storage before master generation)
-- We use a session_id to group uploads together
CREATE TABLE raw_invoice_details (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL,
  invoice TEXT,
  name TEXT,
  invoice_date TEXT,
  order_no TEXT,
  line TEXT,
  release TEXT,
  qty_invoiced DECIMAL,
  extended_price DECIMAL,
  do_bol TEXT,
  dispatch_date TEXT,
  cust_po TEXT
);

CREATE TABLE raw_so_details (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL,
  order_no TEXT,
  ship_via_description TEXT
);

CREATE TABLE raw_rma_details (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL,
  rma TEXT,
  original_invoice TEXT,
  reason TEXT
);

CREATE TABLE raw_locations_details (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL,
  do_bol TEXT,
  consignee_address_3 TEXT
);

-- 3. Master Data
CREATE TABLE master_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL,
  invoice TEXT,
  name TEXT,
  invoice_date TEXT,
  order_no TEXT,
  line TEXT,
  release TEXT,
  qty_invoiced DECIMAL,
  extended_price DECIMAL,
  do_bol TEXT,
  ship_via_description TEXT,
  consignee_address_3 TEXT,
  rma TEXT,
  reason TEXT,
  rma_status BOOLEAN DEFAULT false,
  pending_fields JSONB,
  cust_po TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Settings Tables
CREATE TABLE company_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT DEFAULT 'Stretchline (Private) Limited - Mount Lavinia',
  business_address TEXT,
  registered_address TEXT,
  contact_line TEXT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default company settings
INSERT INTO company_settings (company_name, contact_line) 
VALUES ('Stretchline (Private) Limited - Mount Lavinia', 'Tel: +94 11 273 0000 | Fax: +94 11 273 0001');

CREATE TABLE drivers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_name TEXT NOT NULL,
  vehicle_number TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  nic TEXT
);

CREATE TABLE delivery_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Insert default time slots
INSERT INTO time_slots (label) VALUES ('Morning'), ('Evening');

-- 5. Gate Pass Records
CREATE TABLE gate_pass_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gate_pass_no TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  vehicle_number TEXT,
  driver_name TEXT,
  phone_number TEXT,
  nic TEXT,
  customer_name TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  status TEXT DEFAULT 'issued',
  rows JSONB NOT NULL,
  total_mtrs DECIMAL NOT NULL,
  total_value DECIMAL NOT NULL,
  total_cartons INTEGER NOT NULL,
  invoice_count INTEGER NOT NULL
);

-- End of Schema

-- 6. Row Level Security (RLS) Policies
-- Enables RLS on all tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_invoice_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_so_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_rma_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_locations_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_pass_records ENABLE ROW LEVEL SECURITY;

-- Note: Because this application uses a custom user authentication table (app_users) 
-- instead of Supabase Auth, requests will be seen as 'anon' role by Supabase.
-- These policies allow 'anon' to read and write data to make the app function, 
-- while having RLS strictly enabled. 

CREATE POLICY "Allow anon read and write on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on raw_invoice_details" ON raw_invoice_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on raw_so_details" ON raw_so_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on raw_rma_details" ON raw_rma_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on raw_locations_details" ON raw_locations_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on master_data" ON master_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on delivery_locations" ON delivery_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on time_slots" ON time_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read and write on gate_pass_records" ON gate_pass_records FOR ALL USING (true) WITH CHECK (true);
