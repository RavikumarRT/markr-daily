-- Remove academic_year column from students table
ALTER TABLE public.students DROP COLUMN IF EXISTS academic_year;

-- Remove academic_year column from attendance_sessions table
ALTER TABLE public.attendance_sessions DROP COLUMN IF EXISTS academic_year;