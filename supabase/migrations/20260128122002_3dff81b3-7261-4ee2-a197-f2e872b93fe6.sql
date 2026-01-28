-- Add RLS policy for admins to view all cases
CREATE POLICY "Admins can view all cases" 
ON public.cases 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all case files
CREATE POLICY "Admins can view all case files" 
ON public.case_files 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));