
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    passing_score INTEGER NOT NULL DEFAULT 50,
    is_proctored BOOLEAN NOT NULL DEFAULT true,
    max_violations INTEGER NOT NULL DEFAULT 5,
    allow_face_detection BOOLEAN NOT NULL DEFAULT true,
    allow_voice_detection BOOLEAN NOT NULL DEFAULT true,
    allow_tab_switch_detection BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
    options JSONB,
    correct_answer TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Exam sessions table
CREATE TABLE public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'terminated', 'paused')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    score INTEGER,
    total_violations INTEGER NOT NULL DEFAULT 0,
    answers JSONB DEFAULT '{}',
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    termination_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- Violations table
CREATE TABLE public.violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('face_not_detected', 'multiple_faces', 'voice_detected', 'tab_switch', 'browser_switch', 'copy_paste', 'right_click', 'suspicious_behavior')),
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'moderate', 'critical')),
    description TEXT,
    snapshot_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Enable realtime for violations
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exam_sessions_updated_at BEFORE UPDATE ON public.exam_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- exams: admins create, all authenticated read published
CREATE POLICY "Anyone can view published exams" ON public.exams FOR SELECT TO authenticated USING (status = 'published' OR auth.uid() = created_by);
CREATE POLICY "Creators can insert exams" ON public.exams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update own exams" ON public.exams FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete own exams" ON public.exams FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- questions: viewable if exam is accessible
CREATE POLICY "Questions viewable with exam access" ON public.questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (status = 'published' OR created_by = auth.uid()))
);
CREATE POLICY "Exam creators can manage questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND created_by = auth.uid())
);
CREATE POLICY "Exam creators can update questions" ON public.questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND created_by = auth.uid())
);
CREATE POLICY "Exam creators can delete questions" ON public.questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND created_by = auth.uid())
);

-- exam_sessions
CREATE POLICY "Users can view own sessions" ON public.exam_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Exam creators can view sessions" ON public.exam_sessions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND created_by = auth.uid())
);
CREATE POLICY "Users can create own sessions" ON public.exam_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.exam_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- violations
CREATE POLICY "Users can view own violations" ON public.violations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Exam creators can view violations" ON public.violations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exam_sessions es JOIN public.exams e ON e.id = es.exam_id WHERE es.id = session_id AND e.created_by = auth.uid())
);
CREATE POLICY "Users can insert own violations" ON public.violations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
