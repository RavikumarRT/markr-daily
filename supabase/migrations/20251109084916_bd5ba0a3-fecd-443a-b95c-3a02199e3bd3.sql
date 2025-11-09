-- Fix security warnings by setting search_path on functions

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_session_counts() CASCADE;

-- Recreate function to update updated_at timestamp with proper search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate trigger for department_heads
CREATE TRIGGER update_department_heads_updated_at
    BEFORE UPDATE ON public.department_heads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate function to update session counts with proper search_path
CREATE OR REPLACE FUNCTION update_session_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.attendance_sessions
        SET present_count = present_count + 1
        WHERE session_id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.attendance_sessions
        SET present_count = present_count - 1
        WHERE session_id = OLD.session_id;
    END IF;
    RETURN NULL;
END;
$$;

-- Recreate trigger to auto-update session counts
CREATE TRIGGER update_session_present_count
    AFTER INSERT OR DELETE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_session_counts();