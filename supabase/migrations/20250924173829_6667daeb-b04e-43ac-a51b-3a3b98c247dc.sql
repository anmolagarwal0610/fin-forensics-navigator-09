-- Enable real-time updates for the cases table
-- Set REPLICA IDENTITY FULL to capture complete row data during updates
ALTER TABLE public.cases REPLICA IDENTITY FULL;

-- Add the cases table to the supabase_realtime publication
-- This enables real-time broadcasting of changes to subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;