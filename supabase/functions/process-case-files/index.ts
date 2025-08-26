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
    const { caseId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const backendApiUrl = Deno.env.get('BACKEND_API_URL')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing case files for case:', caseId);

    // Get case files from database with retries to avoid race condition
    const caseFiles = await fetchCaseFilesWithRetry(supabase, caseId, 5, 400);
    console.log('[process-case-files] Final files list:', caseFiles.length, '=>', caseFiles.map((f: any) => f.file_name));

    // Get user ID from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Authorization header present. Token length:', token?.length || 0);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error('Invalid user token');
    }
    console.log('Authenticated user id:', user.id);
    // Create zip file with all uploaded files
    const zipFileName = `case_${caseId}_${Date.now()}.zip`;
    const zipBlob = await createZipFile(supabase, caseFiles, user.id, caseId);
    
    // Upload zip file to storage
    const { data: zipUpload, error: zipError } = await supabase.storage
      .from('case-files')
      .upload(`${user.id}/zips/${zipFileName}`, zipBlob, {
        contentType: 'application/zip'
      });

    if (zipError) {
      throw new Error(`Failed to upload zip: ${zipError.message}`);
    }

    console.log('ZIP uploaded to storage:', JSON.stringify(zipUpload));

    // Create signed URL for the zip file (valid for 8 hours)
    const { data: signed, error: signedError } = await supabase.storage
      .from('case-files')
      .createSignedUrl(`${user.id}/zips/${zipFileName}`, 60 * 60 * 8);

    if (signedError || !signed?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${signedError?.message}`);
    }

    console.log('Zip file uploaded. Signed URL:', signed.signedUrl);

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
    console.log('[process-case-files] BACKEND_API_URL:', backendApiUrl);
    if (isLocal) {
      console.warn('[process-case-files] Warning: BACKEND_API_URL appears to be a local/private address. Edge Functions may not reach your laptop unless it is publicly accessible.');
    }
    console.log('Calling backend with payload:', backendPayload);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const backendResponse = await fetch(backendApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    console.log('Backend response status:', backendResponse.status, backendResponse.statusText);

    const rawText = await backendResponse.text();
    console.log('Backend raw response body (truncated):', rawText?.slice(0, 1000));

    if (!backendResponse.ok) {
      throw new Error(`Backend API call failed: ${backendResponse.status} ${backendResponse.statusText} | Body: ${rawText?.slice(0, 1000)}`);
    }

    let backendResult: any;
    try {
      backendResult = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      console.error('Failed to parse backend JSON response:', e);
      throw new Error('Backend returned non-JSON response');
    }

    console.log('Backend response parsed JSON:', backendResult);

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
    
    // If we have a caseId, update the case status to indicate processing with ETA
    if (caseId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const etaTime = new Date();
        etaTime.setHours(etaTime.getHours() + 4); // Add 4 hours
        
        await supabase
          .from('cases')
          .update({ 
            status: 'Processing',
            analysis_status: 'processing'
          })
          .eq('id', caseId);
          
        // Add error event with ETA
        await supabase
          .from('events')
          .insert({
            case_id: caseId,
            type: 'analysis_submitted',
            payload: { 
              error: 'Backend processing failed, estimated completion in 4 hours',
              eta: etaTime.toISOString()
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

// Helper to wait between retries
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry fetching case files to avoid race conditions where inserts aren't yet visible
async function fetchCaseFilesWithRetry(supabase: any, caseId: string, maxAttempts = 5, baseDelayMs = 400) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[process-case-files] Fetch attempt ${attempt}/${maxAttempts} for case ${caseId}`);
    const { data, error } = await supabase
      .from('case_files')
      .select('*')
      .eq('case_id', caseId)
      .eq('type', 'upload');

    if (error) {
      console.error('[process-case-files] Error fetching case_files:', error);
    } else {
      const count = data?.length || 0;
      console.log(`[process-case-files] case_files count on attempt ${attempt}:`, count);
      if (count > 0) return data;
    }

    if (attempt < maxAttempts) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[process-case-files] No files yet, retrying after ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('No files found for this case after retries');
}

async function createZipFile(supabase: any, files: any[], userId: string, caseId: string): Promise<Blob> {
  console.log('Creating ZIP from files:', files.map((f: any) => f.file_name));
  const zip = new JSZip();

  for (const file of files) {
    const objectPath = `${userId}/${caseId}/${file.file_name}`;
    try {
      console.log('Downloading from storage:', objectPath);
      const { data: fileBlob, error } = await supabase.storage
        .from('case-files')
        .download(objectPath);

      if (error) {
        console.error(`Download error for ${objectPath}:`, error);
        continue;
      }

      if (fileBlob) {
        const buffer = await fileBlob.arrayBuffer();
        zip.file(file.file_name, buffer);
        console.log(`Added to ZIP: ${file.file_name} (${buffer.byteLength} bytes)`);
      }
    } catch (error) {
      console.error(`Failed to download file ${objectPath}:`, error);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'uint8array' });
  console.log('ZIP generated. Size (bytes):', zipContent.byteLength);
  return new Blob([zipContent], { type: 'application/zip' });
}