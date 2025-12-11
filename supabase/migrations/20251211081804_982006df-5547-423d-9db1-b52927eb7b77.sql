-- Update existing 'Active' cases to 'Draft'
UPDATE cases SET status = 'Draft' WHERE status = 'Active';