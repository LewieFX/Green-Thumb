-- Green Thumb - Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- NOTE: Plants are stored locally in lib/plants.json
-- plant_id fields reference the JSON plant id (e.g. 'tomato')
-- ============================================================

-- ============================================================
-- GARDENS (user's properties)
-- ============================================================
CREATE TABLE IF NOT EXISTS gardens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Garden',
  postcode TEXT,
  climate_zone TEXT
);

-- ============================================================
-- BEDS (individual raised beds, garden plots)
-- ============================================================
CREATE TABLE IF NOT EXISTS beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  garden_id UUID REFERENCES gardens(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  shape TEXT DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle')),
  width_m FLOAT,
  length_m FLOAT,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  soil_type TEXT,
  notes TEXT
);

-- ============================================================
-- PLANTINGS (plants currently or historically in a bed)
-- plant_id is the string key from lib/plants.json (e.g. 'tomato')
-- ============================================================
CREATE TABLE IF NOT EXISTS plantings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  bed_id UUID REFERENCES beds(id) ON DELETE CASCADE NOT NULL,
  plant_id TEXT NOT NULL,
  planted_date DATE,
  expected_harvest_date DATE,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'harvested', 'removed')),
  notes TEXT
);

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planting_id UUID REFERENCES plantings(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('watering', 'fertilising', 'harvest', 'pruning', 'custom')),
  due_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- ============================================================
-- PLANTING LOGS (history / crop rotation events)
-- ============================================================
CREATE TABLE IF NOT EXISTS planting_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planting_id UUID REFERENCES plantings(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  plant_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('planted', 'watered', 'fertilised', 'harvested', 'removed', 'other')),
  event_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE planting_logs ENABLE ROW LEVEL SECURITY;

-- Gardens: users can only access their own
CREATE POLICY "gardens_user_access" ON gardens
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Beds: access if you own the garden
CREATE POLICY "beds_user_access" ON beds
  USING (garden_id IN (SELECT id FROM gardens WHERE user_id = auth.uid()))
  WITH CHECK (garden_id IN (SELECT id FROM gardens WHERE user_id = auth.uid()));

-- Plantings: access if you own the bed's garden
CREATE POLICY "plantings_user_access" ON plantings
  USING (bed_id IN (SELECT b.id FROM beds b JOIN gardens g ON g.id = b.garden_id WHERE g.user_id = auth.uid()))
  WITH CHECK (bed_id IN (SELECT b.id FROM beds b JOIN gardens g ON g.id = b.garden_id WHERE g.user_id = auth.uid()));

-- Reminders: access via plantings
CREATE POLICY "reminders_user_access" ON reminders
  USING (planting_id IN (
    SELECT p.id FROM plantings p
    JOIN beds b ON b.id = p.bed_id
    JOIN gardens g ON g.id = b.garden_id
    WHERE g.user_id = auth.uid()
  ))
  WITH CHECK (planting_id IN (
    SELECT p.id FROM plantings p
    JOIN beds b ON b.id = p.bed_id
    JOIN gardens g ON g.id = b.garden_id
    WHERE g.user_id = auth.uid()
  ));

-- Logs: access via beds
CREATE POLICY "logs_user_access" ON planting_logs
  USING (bed_id IN (SELECT b.id FROM beds b JOIN gardens g ON g.id = b.garden_id WHERE g.user_id = auth.uid()))
  WITH CHECK (bed_id IN (SELECT b.id FROM beds b JOIN gardens g ON g.id = b.garden_id WHERE g.user_id = auth.uid()));
