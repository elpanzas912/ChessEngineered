-- Supabase Schema for ChessPeps
-- Run this in Supabase Dashboard → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    user_progress JSONB DEFAULT '{}',
    course_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC function to get daily event counts (for analytics)
CREATE OR REPLACE FUNCTION public.get_daily_event_counts_by_timezone(
    p_user_id UUID,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (date_str TEXT, event_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_TIMESTAMP(last_attempt_timestamp / 1000.0) AT TIME ZONE p_timezone::TEXT as date_str,
        COUNT(*)::BIGINT as event_count
    FROM public.profiles,
    LATERAL jsonb_each(user_progress) as openings(opening_slug, opening_data),
    LATERAL jsonb_each(opening_data->'lines') as lines(line_pgn, line_data)
    WHERE id = p_user_id
      AND (line_data->>'lastAttemptTimestamp')::BIGINT IS NOT NULL
    GROUP BY date_str;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Allow realtime on profiles
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
