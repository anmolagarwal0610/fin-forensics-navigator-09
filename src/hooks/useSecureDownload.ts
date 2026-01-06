import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SecureFileInfo {
  signedUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

/**
 * Hook for securely downloading result files from Supabase Storage.
 * Handles both new secure storage and legacy public URLs for backwards compatibility.
 */
export function useSecureDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Get a signed URL for a result file (secure storage)
   * Handles 401 by attempting session refresh and retry once
   */
  const getSecureFileUrl = useCallback(async (
    caseId: string,
    fileType: 'result_zip' | 'csv_zip' = 'result_zip'
  ): Promise<SecureFileInfo | null> => {
    const invokeFunction = async (accessToken: string): Promise<SecureFileInfo | null> => {
      console.log('[SecureDownload] Fetching secure file for case:', caseId, 'type:', fileType);
      
      const response = await supabase.functions.invoke('get-result-file', {
        body: { caseId, fileType },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.error) {
        // Check if it's a 401 error
        const is401 = response.error.message?.includes('401') || 
                      response.error.message?.includes('Unauthorized') ||
                      (response.error as any)?.status === 401;
        if (is401) {
          throw new Error('AUTH_EXPIRED');
        }
        console.error('[SecureDownload] Edge function error:', response.error);
        return null;
      }

      // Check if file not found (legacy case - no secure file exists)
      if (response.data?.notFound) {
        console.log('[SecureDownload] No secure file found, will try legacy URL');
        return null;
      }

      console.log('[SecureDownload] ✓ Got signed URL');
      return response.data as SecureFileInfo;
    };

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('[SecureDownload] No active session for secure file access');
        return null;
      }

      try {
        return await invokeFunction(session.access_token);
      } catch (error) {
        // If auth expired, try to refresh and retry once
        if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
          console.log('[SecureDownload] Auth expired, attempting refresh...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session?.access_token) {
            console.error('[SecureDownload] Session refresh failed:', refreshError?.message);
            toast({
              title: 'Session expired',
              description: 'Please sign in again.',
              variant: 'destructive'
            });
            return null;
          }
          
          console.log('[SecureDownload] Session refreshed, retrying...');
          return await invokeFunction(refreshData.session.access_token);
        }
        throw error;
      }
    } catch (error) {
      console.error('[SecureDownload] Failed to get secure file URL:', error);
      return null;
    }
  }, []);

  /**
   * Download a result file - tries secure storage first, falls back to legacy URL
   */
  const downloadResultFile = useCallback(async (
    caseId: string,
    legacyUrl: string | null | undefined,
    fileType: 'result_zip' | 'csv_zip' = 'result_zip',
    suggestedFileName?: string
  ) => {
    setIsDownloading(true);
    
    try {
      // First, try to get from secure storage
      const secureFile = await getSecureFileUrl(caseId, fileType);
      
      let downloadUrl: string;
      let fileName: string;

      if (secureFile) {
        // Use secure signed URL
        console.log('[SecureDownload] Using secure storage');
        downloadUrl = secureFile.signedUrl;
        fileName = suggestedFileName || secureFile.fileName || 'download.zip';
      } else if (legacyUrl) {
        // Fall back to legacy public URL
        console.log('[SecureDownload] Using legacy URL');
        downloadUrl = legacyUrl;
        fileName = suggestedFileName || 'download.zip';
      } else {
        throw new Error('No download URL available');
      }

      // Download the file
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Download started' });
      
    } catch (error) {
      console.error('Download error:', error);
      toast({ 
        title: 'Download failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  }, [getSecureFileUrl]);

  /**
   * Fetch file content (ZIP) for parsing - tries secure storage first, falls back to legacy URL
   */
  const fetchFileForParsing = useCallback(async (
    caseId: string,
    legacyUrl: string | null | undefined,
    fileType: 'result_zip' | 'csv_zip' = 'result_zip'
  ): Promise<ArrayBuffer | null> => {
    try {
      // First, try to get from secure storage
      const secureFile = await getSecureFileUrl(caseId, fileType);
      
      let fetchUrl: string;

      if (secureFile) {
        console.log('[SecureDownload] Fetching from secure storage');
        fetchUrl = secureFile.signedUrl;
      } else if (legacyUrl) {
        console.log('[SecureDownload] Fetching from legacy URL');
        fetchUrl = legacyUrl;
      } else {
        console.error('[SecureDownload] No URL available for parsing');
        return null;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Failed to fetch file for parsing:', error);
      return null;
    }
  }, [getSecureFileUrl]);

  return { 
    downloadResultFile, 
    fetchFileForParsing,
    getSecureFileUrl,
    isDownloading 
  };
}
