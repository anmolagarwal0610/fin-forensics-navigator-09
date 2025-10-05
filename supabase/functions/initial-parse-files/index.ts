import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, fileNames } = await req.json();
    console.log('Initial parse request:', { caseId, fileNames });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // BACKEND_API_URL should only contain the base URL (e.g., https://your-backend.ngrok.io)
    // This function appends the specific endpoint path: /initial-parse/
    const backendApiUrl = Deno.env.get("BACKEND_API_URL")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log('Authenticated user:', user.id);

    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found');
    }

    // Get files from storage
    const files = await getStorageFiles(supabase, fileNames, user.id, caseId);
    console.log('Retrieved files:', files.length);

    // Create ZIP of PDFs
    const pdfZipBlob = await createZipFromStorage(supabase, files, user.id, caseId);
    console.log('Created PDF ZIP, size:', pdfZipBlob.size);

    // Upload PDF ZIP to storage
    const pdfZipFileName = `${caseId}_pdfs_${Date.now()}.zip`;
    const pdfZipPath = `${user.id}/${caseId}/${pdfZipFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('case-files')
      .upload(pdfZipPath, pdfZipBlob, {
        contentType: 'application/zip',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF ZIP: ${uploadError.message}`);
    }

    // Generate signed URL for PDF ZIP
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('case-files')
      .createSignedUrl(pdfZipPath, 3600);

    if (signedUrlError || !signedUrlData) {
      throw new Error('Failed to generate signed URL for PDF ZIP');
    }

    const pdfZipUrl = signedUrlData.signedUrl;
    console.log('PDF ZIP uploaded, calling backend initial-parse');

    // Update case status to Processing with initial parse stage
    await supabase
      .from('cases')
      .update({ 
        status: 'Processing',
        hitl_stage: 'initial_parse'
      })
      .eq('id', caseId);

    // Call backend /initial-parse/
    const backendResponse = await fetch(`${backendApiUrl}/initial-parse/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: caseId,
        zipUrl: pdfZipUrl,
        userId: user.id
      })
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error:', errorText);
      
      await supabase
        .from('cases')
        .update({ status: 'Failed', hitl_stage: null })
        .eq('id', caseId);

      await supabase
        .from('events')
        .insert({
          case_id: caseId,
          type: 'analysis_submitted',
          payload: { error: errorText, stage: 'initial_parse' }
        });

      throw new Error(`Backend initial parse failed: ${errorText}`);
    }

    const backendData = await backendResponse.json();
    console.log('Backend response:', backendData);

    const csvZipUrl = backendData.url;

    if (!csvZipUrl) {
      throw new Error('No CSV ZIP URL returned from backend');
    }

    // Download CSV ZIP
    const csvZipResponse = await fetch(csvZipUrl);
    if (!csvZipResponse.ok) {
      throw new Error('Failed to download CSV ZIP from backend');
    }

    const csvZipBlob = await csvZipResponse.blob();
    const csvZipArrayBuffer = await csvZipBlob.arrayBuffer();
    
    // Extract CSV files from ZIP
    const csvZip = await JSZip.loadAsync(csvZipArrayBuffer);
    console.log('CSV ZIP extracted, files:', Object.keys(csvZip.files).length);

    // Upload individual CSV files and create records
    for (const [fileName, file] of Object.entries(csvZip.files)) {
      if (file.dir || !fileName.endsWith('.csv')) continue;

      const csvContent = await file.async('blob');
      const csvPath = `${user.id}/${caseId}/csv/${fileName}`;

      // Upload CSV to storage
      const { error: csvUploadError } = await supabase.storage
        .from('case-files')
        .upload(csvPath, csvContent, {
          contentType: 'text/csv',
          upsert: true
        });

      if (csvUploadError) {
        console.error(`Failed to upload ${fileName}:`, csvUploadError);
        continue;
      }

      // Generate signed URL for CSV
      const { data: csvSignedData } = await supabase.storage
        .from('case-files')
        .createSignedUrl(csvPath, 86400); // 24 hour expiry

      if (csvSignedData) {
        // Create case_csv_files record
        const pdfFileName = fileName.replace('.csv', '.pdf');
        await supabase
          .from('case_csv_files')
          .insert({
            case_id: caseId,
            pdf_file_name: pdfFileName,
            original_csv_url: csvSignedData.signedUrl,
            is_corrected: false
          });
      }
    }

    // Update case to Review status
    await supabase
      .from('cases')
      .update({ 
        status: 'Review',
        hitl_stage: 'review',
        csv_zip_url: csvZipUrl
      })
      .eq('id', caseId);

    await supabase
      .from('events')
      .insert({
        case_id: caseId,
        type: 'analysis_submitted',
        payload: { stage: 'initial_parse', csv_count: Object.keys(csvZip.files).filter(f => f.endsWith('.csv')).length }
      });

    console.log('Initial parse complete, case in Review status');

    return new Response(
      JSON.stringify({ success: true, message: 'Initial parse complete' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error in initial-parse-files:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function getStorageFiles(
  supabase: any,
  fileNames: string[] | undefined,
  userId: string,
  caseId: string
): Promise<string[]> {
  if (fileNames && fileNames.length > 0) {
    return fileNames;
  }

  const { data, error } = await supabase.storage
    .from('case-files')
    .list(`${userId}/${caseId}`);

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data.map((file: any) => file.name);
}

async function createZipFromStorage(
  supabase: any,
  fileNames: string[],
  userId: string,
  caseId: string
): Promise<Blob> {
  const zip = new JSZip();

  for (const fileName of fileNames) {
    const filePath = `${userId}/${caseId}/${fileName}`;
    const { data, error } = await supabase.storage
      .from('case-files')
      .download(filePath);

    if (error) {
      console.warn(`Could not download ${fileName}:`, error.message);
      continue;
    }

    zip.file(fileName, data);
  }

  return await zip.generateAsync({ type: "blob" });
}
