import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get case files from database
    const { data: caseFiles, error: filesError } = await supabase
      .from('case_files')
      .select('*')
      .eq('case_id', caseId)
      .eq('type', 'upload');

    if (filesError) {
      throw new Error(`Failed to fetch case files: ${filesError.message}`);
    }

    if (!caseFiles || caseFiles.length === 0) {
      throw new Error('No files found for this case');
    }

    console.log('Found files:', caseFiles.length);

    // Get user ID from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Create zip file with all uploaded files
    const zipFileName = `case_${caseId}_${Date.now()}.zip`;
    const zipBlob = await createZipFile(supabase, caseFiles, user.id);
    
    // Upload zip file to storage
    const { data: zipUpload, error: zipError } = await supabase.storage
      .from('case-files')
      .upload(`${user.id}/zips/${zipFileName}`, zipBlob, {
        contentType: 'application/zip'
      });

    if (zipError) {
      throw new Error(`Failed to upload zip: ${zipError.message}`);
    }

    // Get public URL for the zip file
    const { data: zipUrl } = supabase.storage
      .from('case-files')
      .getPublicUrl(`${user.id}/zips/${zipFileName}`);

    console.log('Zip file created:', zipUrl.publicUrl);

    // Update case status to processing
    await supabase
      .from('cases')
      .update({ 
        status: 'Processing',
        analysis_status: 'processing'
      })
      .eq('id', caseId);

    // Call backend API with zip file URL
    const backendResponse = await fetch(backendApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: caseId,
        zipUrl: zipUrl.publicUrl,
        userId: user.id
      })
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend API call failed: ${backendResponse.statusText}`);
    }

    const backendResult = await backendResponse.json();
    console.log('Backend response:', backendResult);

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
      resultZipUrl: backendResult.resultZipUrl
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

async function createZipFile(supabase: any, files: any[], userId: string): Promise<Blob> {
  // Simple zip implementation - in production you might want to use a proper zip library
  const zipData = new Uint8Array();
  
  // For now, we'll create a simple concatenated file
  // In a real implementation, you'd use a proper zip library
  const fileContents = [];
  
  for (const file of files) {
    if (file.file_url) {
      try {
        const { data: fileBlob } = await supabase.storage
          .from('case-files')
          .download(`${userId}/${file.file_name}`);
        
        if (fileBlob) {
          fileContents.push({
            name: file.file_name,
            data: await fileBlob.arrayBuffer()
          });
        }
      } catch (error) {
        console.error(`Failed to download file ${file.file_name}:`, error);
      }
    }
  }
  
  // Create a simple zip-like structure (this is simplified)
  // In production, use a proper zip library like JSZip
  const combinedData = new Blob(fileContents.map(f => new Uint8Array(f.data)));
  return combinedData;
}