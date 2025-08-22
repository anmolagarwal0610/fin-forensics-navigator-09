
-- Create enum for case status
CREATE TYPE case_status AS ENUM ('Active', 'Processing', 'Ready', 'Archived');

-- Create enum for event types
CREATE TYPE event_type AS ENUM ('created', 'files_uploaded', 'analysis_submitted', 'analysis_ready', 'note_added');

-- Create enum for file types
CREATE TYPE file_type AS ENUM ('upload', 'result');

-- Create cases table
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  creator_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT NOT NULL DEFAULT '#3A86FF',
  tags TEXT[] DEFAULT '{}',
  status case_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case_files table
CREATE TABLE public.case_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  type file_type NOT NULL DEFAULT 'upload',
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  type event_type NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cases
CREATE POLICY "Users can view their own cases" 
  ON public.cases 
  FOR SELECT 
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own cases" 
  ON public.cases 
  FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own cases" 
  ON public.cases 
  FOR UPDATE 
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own cases" 
  ON public.cases 
  FOR DELETE 
  USING (auth.uid() = creator_id);

-- Create RLS policies for case_files
CREATE POLICY "Users can view files for their cases" 
  ON public.case_files 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_files.case_id 
    AND cases.creator_id = auth.uid()
  ));

CREATE POLICY "Users can create files for their cases" 
  ON public.case_files 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_files.case_id 
    AND cases.creator_id = auth.uid()
  ) AND auth.uid() = uploaded_by);

CREATE POLICY "Users can update files for their cases" 
  ON public.case_files 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_files.case_id 
    AND cases.creator_id = auth.uid()
  ));

CREATE POLICY "Users can delete files for their cases" 
  ON public.case_files 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_files.case_id 
    AND cases.creator_id = auth.uid()
  ));

-- Create RLS policies for events
CREATE POLICY "Users can view events for their cases" 
  ON public.events 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = events.case_id 
    AND cases.creator_id = auth.uid()
  ));

CREATE POLICY "Users can create events for their cases" 
  ON public.events 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = events.case_id 
    AND cases.creator_id = auth.uid()
  ));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on cases
CREATE TRIGGER update_cases_updated_at 
    BEFORE UPDATE ON public.cases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
