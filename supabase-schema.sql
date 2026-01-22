-- Create the leads table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  budget_bracket TEXT NOT NULL CHECK (budget_bracket IN ('Low', 'Mid', 'High')),
  status TEXT NOT NULL CHECK (status IN ('New', 'Contacted', 'Won', 'Lost')),
  pain_point TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can restrict this later)
-- For now, we'll allow all operations with the anon key
CREATE POLICY "Allow all operations for anon users" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);
