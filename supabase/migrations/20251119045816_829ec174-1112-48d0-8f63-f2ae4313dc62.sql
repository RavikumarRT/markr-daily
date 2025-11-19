-- Set all existing students to batch 2022
UPDATE public.students 
SET batch_year = '2022' 
WHERE batch_year IS NULL;