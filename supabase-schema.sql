-- Supabase Schema for ChessEngineered
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

-- ── RPC function to get daily event counts (for analytics) ──
CREATE OR REPLACE FUNCTION public.get_daily_event_counts_by_timezone(
    p_user_id UUID,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (date_str TEXT, event_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (TO_TIMESTAMP(COALESCE(lp.last_attempt_timestamp, 0) / 1000.0) AT TIME ZONE p_timezone)::DATE::TEXT as date_str,
        COUNT(*)::BIGINT as event_count
    FROM public.line_progress lp
    WHERE lp.user_id = p_user_id
      AND lp.last_attempt_timestamp IS NOT NULL
    GROUP BY (TO_TIMESTAMP(COALESCE(lp.last_attempt_timestamp, 0) / 1000.0) AT TIME ZONE p_timezone)::DATE::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Normalized tables (replacing user_progress JSONB) ──

CREATE TABLE IF NOT EXISTS public.opening_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    opening_slug TEXT NOT NULL,
    drill_high_score INTEGER DEFAULT 0,
    time_high_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, opening_slug)
);

CREATE TABLE IF NOT EXISTS public.line_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    opening_slug TEXT NOT NULL,
    line_pgn TEXT NOT NULL,
    completions INTEGER DEFAULT 0,
    perfect_attempts INTEGER DEFAULT 0,
    last_attempt_timestamp BIGINT,
    confidence INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, opening_slug, line_pgn)
);

CREATE TABLE IF NOT EXISTS public.learned_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    opening_slug TEXT NOT NULL,
    line_pgn TEXT NOT NULL,
    learned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, opening_slug, line_pgn)
);

CREATE TABLE IF NOT EXISTS public.puzzle_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE,
    puzzle_elo INTEGER DEFAULT 1500,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for normalized tables
ALTER TABLE public.opening_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzle_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own opening_progress"
    ON public.opening_progress FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own line_progress"
    ON public.line_progress FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own learned_lines"
    ON public.learned_lines FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own puzzle_ratings"
    ON public.puzzle_ratings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opening_progress_user ON public.opening_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_line_progress_user ON public.line_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_line_progress_user_slug ON public.line_progress(user_id, opening_slug);
CREATE INDEX IF NOT EXISTS idx_learned_lines_user ON public.learned_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_lines_user_slug ON public.learned_lines(user_id, opening_slug);

-- Helper function to reconstruct user_progress JSONB for backwards compatibility
CREATE OR REPLACE FUNCTION public.get_user_progress(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    opening_row RECORD;
    line_row RECORD;
    slug_data JSONB;
BEGIN
    result := jsonb_set(result, '{puzzleELO}',
        COALESCE((SELECT to_jsonb(pr.puzzle_elo) FROM public.puzzle_ratings pr WHERE pr.user_id = p_user_id), '1500'));

    FOR opening_row IN
        SELECT opening_slug, drill_high_score, time_high_score
        FROM public.opening_progress WHERE user_id = p_user_id
    LOOP
        slug_data := jsonb_build_object(
            'drillHighScore', opening_row.drill_high_score,
            'timeHighScore', opening_row.time_high_score,
            'lines', '{}'::jsonb,
            'learnedLines', '[]'::jsonb
        );

        FOR line_row IN
            SELECT line_pgn, completions, perfect_attempts, last_attempt_timestamp, confidence
            FROM public.line_progress
            WHERE user_id = p_user_id AND opening_slug = opening_row.opening_slug
        LOOP
            slug_data := jsonb_set(
                slug_data,
                '{lines}',
                (slug_data->'lines') || jsonb_build_object(
                    line_row.line_pgn,
                    jsonb_build_object(
                        'completions', line_row.completions,
                        'perfectAttempts', line_row.perfect_attempts,
                        'lastAttemptTimestamp', line_row.last_attempt_timestamp,
                        'confidence', line_row.confidence
                    )
                )
            );
        END LOOP;

        slug_data := jsonb_set(
            slug_data,
            '{learnedLines}',
            COALESCE(
                (SELECT jsonb_agg(ll.line_pgn)
                 FROM public.learned_lines ll
                 WHERE ll.user_id = p_user_id AND ll.opening_slug = opening_row.opening_slug),
                '[]'::jsonb
            )
        );

        result := result || jsonb_build_object(opening_row.opening_slug, slug_data);
    END LOOP;

    RETURN result;
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
