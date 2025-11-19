-- Add batch_year column to students table
ALTER TABLE public.students 
ADD COLUMN batch_year VARCHAR(4) NULL;

-- Add index for better query performance on batch_year
CREATE INDEX idx_students_batch_year ON public.students(batch_year);

-- Add index for combined academic_year and batch_year queries
CREATE INDEX idx_students_year_batch ON public.students(academic_year, batch_year);

-- Add comment to explain the column
COMMENT ON COLUMN public.students.batch_year IS 'Year when the student joined (e.g., 2022, 2023, 2024)';
