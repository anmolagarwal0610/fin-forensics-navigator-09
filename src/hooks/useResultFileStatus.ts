import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ResultFileStatus {
  hasResultFile: boolean;
  isLoading: boolean;
  resultFileId: string | null;
}

/**
 * Hook to check if a case has result files available.
 * Checks the result_files table for current result files.
 * This supports the new secure storage flow where result_zip_url is null.
 */
export function useResultFileStatus(caseId: string | undefined): ResultFileStatus {
  const [hasResultFile, setHasResultFile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resultFileId, setResultFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setIsLoading(false);
      setHasResultFile(false);
      setResultFileId(null);
      return;
    }

    const checkResultFile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('result_files')
          .select('id')
          .eq('case_id', caseId)
          .eq('is_current', true)
          .eq('file_type', 'result_zip')
          .maybeSingle();

        if (error) {
          console.error('Error checking result file status:', error);
          setHasResultFile(false);
          setResultFileId(null);
        } else {
          setHasResultFile(!!data);
          setResultFileId(data?.id || null);
        }
      } catch (err) {
        console.error('Failed to check result file status:', err);
        setHasResultFile(false);
        setResultFileId(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkResultFile();
  }, [caseId]);

  return { hasResultFile, isLoading, resultFileId };
}
