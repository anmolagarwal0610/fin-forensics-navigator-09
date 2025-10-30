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
    const { caseId } = await req.json();
    console.log('Final analysis request:', { caseId });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // BACKEND_API_URL should only contain the base URL (e.g., https://your-backend.ngrok.io)
    // This function appends the specific endpoint path: /final-analysis/
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

    // Get all CSV files for this case
    const { data: csvFiles, error: csvError } = await supabase
      .from('case_csv_files')
      .select('*')
      .eq('case_id', caseId);

    if (csvError || !csvFiles || csvFiles.length === 0) {
      throw new Error('No CSV files found for this case');
    }

    console.log('Found CSV files:', csvFiles.length);

    // Create ZIP of final CSV files (original or corrected)
    const zip = new JSZip();

    for (const csvFile of csvFiles) {
      const csvUrl = csvFile.is_corrected && csvFile.corrected_csv_url 
        ? csvFile.corrected_csv_url 
        : csvFile.original_csv_url;

      console.log(`Downloading ${csvFile.pdf_file_name.replace('.pdf', '.csv')}:`, csvFile.is_corrected ? 'corrected' : 'original');

      const response = await fetch(csvUrl);
      if (!response.ok) {
        console.warn(`Failed to download CSV for ${csvFile.pdf_file_name}`);
        continue;
      }

      const csvBlob = await response.blob();
      zip.file(csvFile.pdf_file_name.replace('.pdf', '.csv'), csvBlob);
    }

    const finalZipBlob = await zip.generateAsync({ type: "blob" });
    console.log('Created final CSV ZIP, size:', finalZipBlob.size);

    // Upload final CSV ZIP to storage
    const finalZipFileName = `${caseId}_final_csvs_${Date.now()}.zip`;
    const finalZipPath = `${user.id}/${caseId}/${finalZipFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('case-files')
      .upload(finalZipPath, finalZipBlob, {
        contentType: 'application/zip',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload final CSV ZIP: ${uploadError.message}`);
    }

    // Generate signed URL for final CSV ZIP
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('case-files')
      .createSignedUrl(finalZipPath, 3600);

    if (signedUrlError || !signedUrlData) {
      throw new Error('Failed to generate signed URL for final CSV ZIP');
    }

    const finalCsvZipUrl = signedUrlData.signedUrl;
    console.log('Final CSV ZIP uploaded, calling backend final-analysis');

    // Update case status to Processing with final analysis stage
    await supabase
      .from('cases')
      .update({ 
        status: 'Processing',
        hitl_stage: 'final_analysis'
      })
      .eq('id', caseId);

    // Call backend /final-analysis/
    const backendResponse = await fetch(`${backendApiUrl}/final-analysis/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: caseId,
        zipUrl: finalCsvZipUrl,
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
          payload: { error: errorText, stage: 'final_analysis' }
        });

      // Auto-send support ticket
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_name')
          .eq('user_id', user.id)
          .single();

        await supabase.functions.invoke('send-support-ticket', {
          body: {
            ticketType: 'auto',
            queryType: 'Backend Processing Failed',
            subject: `Final Analysis Failed - ${caseData.name}`,
            description: `The backend failed during the final analysis stage. Case: ${caseData.name}. User needs immediate assistance.`,
            userEmail: user.email,
            userId: user.id,
            organizationName: profile?.organization_name,
            caseId: caseId,
            caseName: caseData.name,
            zipUrl: finalCsvZipUrl,
            errorDetails: errorText,
            stage: 'final_analysis'
          }
        });
        console.log('Auto-generated support ticket sent');
      } catch (ticketError) {
        console.error('Failed to send auto support ticket:', ticketError);
      }

      throw new Error(`Backend final analysis failed: ${errorText}`);
    }

    const backendData = await backendResponse.json();
    console.log('Backend response:', backendData);

    const resultZipUrl = backendData.url;

    if (!resultZipUrl) {
      throw new Error('No result ZIP URL returned from backend');
    }

    // Update case with results
    await supabase
      .from('cases')
      .update({ 
        status: 'Ready',
        result_zip_url: resultZipUrl,
        hitl_stage: null
      })
      .eq('id', caseId);

    await supabase
      .from('events')
      .insert({
        case_id: caseId,
        type: 'analysis_ready',
        payload: { result_url: resultZipUrl, stage: 'final_analysis' }
      });

    console.log('Final analysis complete, case Ready');

    return new Response(
      JSON.stringify({ success: true, message: 'Final analysis complete', resultUrl: resultZipUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error in final-analysis-files:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
