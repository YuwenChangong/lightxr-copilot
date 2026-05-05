-- Phase 9-B: Anonymous User Isolation
-- Run this in Supabase SQL Editor

-- 1. Add user_id column to captures table
ALTER TABLE captures
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Add user_id column to training_sessions table
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 3. Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_captures_user_id ON captures(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);