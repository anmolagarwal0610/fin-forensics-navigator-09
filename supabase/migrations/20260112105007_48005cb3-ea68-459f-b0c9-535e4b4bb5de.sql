-- Create fund_trail_views table for storing saved node positions
CREATE TABLE public.fund_trail_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  positions JSONB NOT NULL,
  filters JSONB,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id)
);

-- Enable RLS on fund_trail_views
ALTER TABLE public.fund_trail_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fund_trail_views
CREATE POLICY "Users can view their own fund trail views"
  ON public.fund_trail_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cases WHERE cases.id = fund_trail_views.case_id 
    AND cases.creator_id = auth.uid()
  ));

CREATE POLICY "Users can insert fund trail views for their cases"
  ON public.fund_trail_views FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM cases WHERE cases.id = fund_trail_views.case_id 
    AND cases.creator_id = auth.uid()
  ));

CREATE POLICY "Users can update their own fund trail views"
  ON public.fund_trail_views FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM cases WHERE cases.id = fund_trail_views.case_id 
    AND cases.creator_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own fund trail views"
  ON public.fund_trail_views FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM cases WHERE cases.id = fund_trail_views.case_id 
    AND cases.creator_id = auth.uid()
  ));

-- Create shared_fund_trails table for shareable links
CREATE TABLE public.shared_fund_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  short_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT false,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  view_count INTEGER DEFAULT 0
);

-- Enable RLS on shared_fund_trails
ALTER TABLE public.shared_fund_trails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_fund_trails
CREATE POLICY "Users can view their shared fund trails"
  ON public.shared_fund_trails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create shared fund trails"
  ON public.shared_fund_trails FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM cases WHERE cases.id = shared_fund_trails.case_id 
            AND cases.creator_id = auth.uid())
  );

CREATE POLICY "Users can update their shared fund trails"
  ON public.shared_fund_trails FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their shared fund trails"
  ON public.shared_fund_trails FOR DELETE
  USING (user_id = auth.uid());

-- Create shared-fund-trails storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-fund-trails', 'shared-fund-trails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shared-fund-trails bucket
CREATE POLICY "Shared fund trails are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shared-fund-trails');

-- Add indexes for performance
CREATE INDEX idx_fund_trail_views_case_id ON public.fund_trail_views(case_id);
CREATE INDEX idx_shared_fund_trails_short_code ON public.shared_fund_trails(short_code);
CREATE INDEX idx_shared_fund_trails_case_id ON public.shared_fund_trails(case_id);
CREATE INDEX idx_shared_fund_trails_user_id ON public.shared_fund_trails(user_id);