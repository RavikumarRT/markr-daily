-- Add batch_year column to attendance_sessions table
ALTER TABLE public.attendance_sessions 
ADD COLUMN batch_year character varying;

-- Update existing sessions to have a default batch_year
UPDATE public.attendance_sessions 
SET batch_year = '2022' 
WHERE batch_year IS NULL;