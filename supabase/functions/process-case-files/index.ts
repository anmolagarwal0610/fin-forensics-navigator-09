import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, fileNames } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // BACKEND_API_URL should only contain the base URL (e.g., https://your-backend.ngrok.io)
    // This function appends the specific endpoint path: /parse-statements/
    const backendApiUrl = Deno.env.get('BACKEND_API_URL')!;
    
    if (!backendApiUrl) {
      throw new Error('BACKEND_API_URL environment variable is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing case files for case:', caseId);
    console.log('File count:', fileNames?.length || 'all files in folder');

    // Get user ID from JWT token using anon key client
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication error');
      throw new Error('Invalid user token');
    }
    console.log('Processing files for authenticated user');

    // Get files from storage directly
    const storageFiles = await getStorageFiles(supabase, user.id, caseId, fileNames);
    console.log('Found files for processing:', storageFiles.length);

    // Create zip file with all uploaded files
    const zipFileName = `case_${caseId}_${Date.now()}.zip`;
    const zipBlob = await createZipFromStorage(supabase, storageFiles, user.id, caseId);
    
    // Upload zip file to storage
    const { data: zipUpload, error: zipError } = await supabase.storage
      .from('case-files')
      .upload(`${user.id}/zips/${zipFileName}`, zipBlob, {
        contentType: 'application/zip'
      });

    if (zipError) {
      throw new Error(`Failed to upload zip: ${zipError.message}`);
    }

    console.log('ZIP file created and uploaded successfully');

    // Create signed URL for the zip file (valid for 8 hours)
    const { data: signed, error: signedError } = await supabase.storage
      .from('case-files')
      .createSignedUrl(`${user.id}/zips/${zipFileName}`, 60 * 60 * 8);

    if (signedError || !signed?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${signedError?.message}`);
    }

    console.log('Zip file ready for backend processing');

    // Update case status to processing
    await supabase
      .from('cases')
      .update({ 
        status: 'Processing',
        analysis_status: 'processing'
      })
      .eq('id', caseId);

    // Call backend API with zip file URL
    const backendPayload = {
      sessionId: caseId,
      zipUrl: signed.signedUrl,
      userId: user.id
    };

    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|10\.|172\.(1[6-9]|2\d|3[0-1])|192\.168\.)/i.test(backendApiUrl);
    console.log('Backend API URL configured:', isLocal ? 'local environment' : 'production environment');
    if (isLocal) {
      console.warn('Warning: Backend API appears to be local. Ensure it is publicly accessible.');
    }
    console.log('Initiating backend analysis');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

    const backendResponse = await fetch(`${backendApiUrl}/parse-statements/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    console.log('Backend response status:', backendResponse.status);

    const rawText = await backendResponse.text();
    if (!backendResponse.ok) {
      console.error('Backend error response:', rawText?.slice(0, 500));
    }

    if (!backendResponse.ok) {
      throw new Error(`Backend API call failed: ${backendResponse.status} ${backendResponse.statusText}`);
    }

    let backendResult: any;
    try {
      backendResult = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      console.error('Failed to parse backend JSON response');
      throw new Error('Backend returned non-JSON response');
    }

    console.log('Backend analysis completed successfully');

    // Update case with result zip URL from backend response
    await supabase
      .from('cases')
      .update({ 
        status: 'Ready',
        analysis_status: 'completed',
        result_zip_url: backendResult.url
      })
      .eq('id', caseId);

    // Add completion event
    await supabase
      .from('events')
      .insert({
        case_id: caseId,
        type: 'analysis_ready',
        payload: { resultZipUrl: backendResult.url }
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Analysis completed successfully',
      resultZipUrl: backendResult.url
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-case-files:', error);
    
    // Get caseId for error handling
    let caseId: string | null = null;
    try {
      const body = await req.clone().json();
      caseId = body.caseId;
    } catch (e) {
      // Ignore JSON parsing errors
    }
    
    // If we have a caseId, update the case status based on error type
    if (caseId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        let status = 'Failed';
        let errorMessage = error.message;
        
        // Check if it's a timeout error
        if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
          status = 'Timeout';
          errorMessage = 'Analysis timed out. Consider reducing the number of files.';
        }
        
        await supabase
          .from('cases')
          .update({ 
            status: status as any,
            analysis_status: 'failed'
          })
          .eq('id', caseId);
          
        // Add error event
        await supabase
          .from('events')
          .insert({
            case_id: caseId,
            type: 'analysis_submitted',
            payload: { 
              error: errorMessage,
              timestamp: new Date().toISOString()
            }
          });
      } catch (updateError) {
        console.error('Failed to update case status on error:', updateError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Get files from storage either by provided names or by listing the folder
async function getStorageFiles(supabase: any, userId: string, caseId: string, fileNames?: string[]): Promise<string[]> {
  if (fileNames && fileNames.length > 0) {
    console.log('Using provided file names');
    return fileNames;
  }

  console.log('Listing all files in case folder');
  const folderPath = `${userId}/${caseId}`;
  const { data: files, error } = await supabase.storage
    .from('case-files')
    .list(folderPath);

  if (error) {
    console.error('Error listing storage files');
    throw new Error(`Failed to list files in storage: ${error.message}`);
  }

  const storageFileNames = files?.map((file: any) => file.name) || [];
  console.log('Found files in storage:', storageFileNames.length);
  return storageFileNames;
}

async function createZipFromStorage(supabase: any, fileNames: string[], userId: string, caseId: string): Promise<Blob> {
  console.log('Creating ZIP from files:', fileNames.length);
  const zip = new JSZip();

  for (const fileName of fileNames) {
    const objectPath = `${userId}/${caseId}/${fileName}`;
    try {
      const { data: fileBlob, error } = await supabase.storage
        .from('case-files')
        .download(objectPath);

      if (error) {
        console.error(`Download error for file: ${fileName}`);
        continue;
      }

      if (fileBlob) {
        const buffer = await fileBlob.arrayBuffer();
        zip.file(fileName, buffer);
        console.log(`Added file to ZIP: ${fileName}`);
      }
    } catch (error) {
      console.error(`Failed to download file: ${fileName}`);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'uint8array' });
  console.log('ZIP generated successfully, size:', Math.round(zipContent.byteLength / 1024), 'KB');
  return new Blob([zipContent], { type: 'application/zip' });
}
