-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('user', 'admin');
CREATE TYPE session_type AS ENUM ('Placement', 'Workshop', 'Seminar', 'Class', 'Other');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'ended');
CREATE TYPE scan_method AS ENUM ('barcode', 'manual', 'bulk');
CREATE TYPE gender_type AS ENUM ('M', 'F', 'Other');

-- Department Heads Table (Users)
CREATE TABLE IF NOT EXISTS public.department_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(50),
    role app_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.department_heads ENABLE ROW LEVEL SECURITY;

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
    student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usn VARCHAR(20) NOT NULL,
    id_num VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    branch VARCHAR(50),
    dob DATE,
    gender gender_type,
    mobile_num VARCHAR(15),
    email VARCHAR(100),
    photo TEXT,
    academic_year VARCHAR(10) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.department_heads(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usn, uploaded_by),
    UNIQUE(id_num, uploaded_by)
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create indexes for students
CREATE INDEX idx_students_year_branch ON public.students(academic_year, branch);
CREATE INDEX idx_students_uploaded_by ON public.students(uploaded_by);
CREATE INDEX idx_students_usn ON public.students(usn);
CREATE INDEX idx_students_id_num ON public.students(id_num);

-- Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name VARCHAR(200) NOT NULL,
    department VARCHAR(50),
    academic_year VARCHAR(10) NOT NULL,
    session_type session_type DEFAULT 'Class',
    started_by UUID NOT NULL REFERENCES public.department_heads(id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status session_status DEFAULT 'active',
    total_students INT DEFAULT 0,
    present_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes for sessions
CREATE INDEX idx_sessions_year_status ON public.attendance_sessions(academic_year, status);
CREATE INDEX idx_sessions_started_by ON public.attendance_sessions(started_by);
CREATE INDEX idx_sessions_start_time ON public.attendance_sessions(start_time);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(session_id) ON DELETE CASCADE,
    student_usn VARCHAR(20) NOT NULL,
    student_id UUID REFERENCES public.students(student_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_method scan_method DEFAULT 'barcode',
    UNIQUE(session_id, student_usn)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create indexes for attendance records
CREATE INDEX idx_records_session ON public.attendance_records(session_id);
CREATE INDEX idx_records_timestamp ON public.attendance_records(timestamp);
CREATE INDEX idx_records_student ON public.attendance_records(student_usn);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.department_heads(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for audit logs
CREATE INDEX idx_logs_user_action ON public.audit_logs(user_id, action);
CREATE INDEX idx_logs_timestamp ON public.audit_logs(timestamp);

-- RLS Policies for department_heads
CREATE POLICY "Users can view their own profile"
    ON public.department_heads FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.department_heads FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for students
CREATE POLICY "Users can view their own uploaded students"
    ON public.students FOR SELECT
    USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert their own students"
    ON public.students FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own students"
    ON public.students FOR UPDATE
    USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own students"
    ON public.students FOR DELETE
    USING (auth.uid() = uploaded_by);

-- RLS Policies for attendance_sessions
CREATE POLICY "Users can view their own sessions"
    ON public.attendance_sessions FOR SELECT
    USING (auth.uid() = started_by);

CREATE POLICY "Users can create sessions"
    ON public.attendance_sessions FOR INSERT
    WITH CHECK (auth.uid() = started_by);

CREATE POLICY "Users can update their own sessions"
    ON public.attendance_sessions FOR UPDATE
    USING (auth.uid() = started_by);

CREATE POLICY "Users can delete their own sessions"
    ON public.attendance_sessions FOR DELETE
    USING (auth.uid() = started_by);

-- RLS Policies for attendance_records
CREATE POLICY "Users can view attendance for their sessions"
    ON public.attendance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions
            WHERE session_id = attendance_records.session_id
            AND started_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert attendance for their sessions"
    ON public.attendance_records FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions
            WHERE session_id = attendance_records.session_id
            AND started_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete attendance for their sessions"
    ON public.attendance_records FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions
            WHERE session_id = attendance_records.session_id
            AND started_by = auth.uid()
        )
    );

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for department_heads
CREATE TRIGGER update_department_heads_updated_at
    BEFORE UPDATE ON public.department_heads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update session counts
CREATE OR REPLACE FUNCTION update_session_counts()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update session counts
CREATE TRIGGER update_session_present_count
    AFTER INSERT OR DELETE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_session_counts();