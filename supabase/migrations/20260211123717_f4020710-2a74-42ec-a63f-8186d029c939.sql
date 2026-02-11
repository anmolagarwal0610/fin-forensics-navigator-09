
-- Allow admins to UPDATE any case (needed for setting status to Processing, etc.)
CREATE POLICY "Admins can update all cases"
ON public.cases
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Allow admins to INSERT jobs for any user's case
CREATE POLICY "Admins can insert jobs"
ON public.jobs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Allow admins to UPDATE any job
CREATE POLICY "Admins can update jobs"
ON public.jobs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Allow admins to view all jobs
CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- Allow admins to INSERT files for any case
CREATE POLICY "Admins can create files for any case"
ON public.case_files
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Allow admins to UPDATE files for any case
CREATE POLICY "Admins can update files for any case"
ON public.case_files
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text));

-- Allow admins to DELETE files for any case
CREATE POLICY "Admins can delete files for any case"
ON public.case_files
FOR DELETE
USING (has_role(auth.uid(), 'admin'::text));

-- Allow admins full CRUD on case_csv_files
CREATE POLICY "Admins can view all CSV files"
ON public.case_csv_files
FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can create CSV files for any case"
ON public.case_csv_files
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can update CSV files for any case"
ON public.case_csv_files
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can delete CSV files for any case"
ON public.case_csv_files
FOR DELETE
USING (has_role(auth.uid(), 'admin'::text));

-- Allow admins to INSERT events for any case
CREATE POLICY "Admins can create events for any case"
ON public.events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Allow admins to view events for any case
CREATE POLICY "Admins can view all events"
ON public.events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- Allow admins to upload to case-files storage bucket
CREATE POLICY "Admins can upload to case-files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'case-files' AND has_role(auth.uid(), 'admin'::text));

-- Allow admins to update case-files storage
CREATE POLICY "Admins can update case-files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'case-files' AND has_role(auth.uid(), 'admin'::text));

-- Allow admins to delete from case-files storage
CREATE POLICY "Admins can delete case-files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'case-files' AND has_role(auth.uid(), 'admin'::text));

-- Allow admins to upload to result-files storage bucket
CREATE POLICY "Admins can upload to result-files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'result-files' AND has_role(auth.uid(), 'admin'::text));
