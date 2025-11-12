import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function extractAndUploadCsvs(
  supabase: any,
  zipUrl: string,
  caseId: string,
  userId: string
) {
  console.log(`[CSV Extract] Downloading ZIP from: ${zipUrl}`);
  
  try {
    // Download ZIP file from backend
    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`Failed to download ZIP: ${response.status} ${response.statusText}`);
    }
    
    const zipBlob = await response.blob();
    const arrayBuffer = await zipBlob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Find all CSV files
    const csvFiles = Object.keys(zip.files).filter(name => 
      name.toLowerCase().endsWith('.csv') && 
      !name.startsWith('__MACOSX') &&
      !name.includes('/')  // Only root-level CSVs
    );
    
    console.log(`[CSV Extract] Found ${csvFiles.length} CSV files in ZIP`);
    
    let successCount = 0;
    
    for (const fileName of csvFiles) {
      try {
        console.log(`[CSV Extract] Processing: ${fileName}`);
        
        // Get CSV content as blob
        const csvContent = await zip.files[fileName].async('blob');
        
        // Upload to Supabase Storage
        const storagePath = `${userId}/${caseId}/csv/original/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('case-files')
          .upload(storagePath, csvContent, { 
            upsert: true,
            contentType: 'text/csv'
          });
        
        if (uploadError) {
          console.error(`[CSV Extract] Upload failed for ${fileName}:`, uploadError);
          continue;
        }
        
        // Generate signed URL (24 hours)
        const { data: signedData, error: signedError } = await supabase.storage
          .from('case-files')
          .createSignedUrl(storagePath, 86400);
        
        if (signedError || !signedData) {
          console.error(`[CSV Extract] Signed URL failed for ${fileName}:`, signedError);
          continue;
        }
        
        // Derive PDF filename from CSV name
        // Example: "AL_Extract.csv" -> "AL Extract.pdf"
        const pdfFileName = fileName
          .replace('.csv', '.pdf')
          .replace(/_/g, ' ');
        
        // Insert record into case_csv_files
        const { error: insertError } = await supabase
          .from('case_csv_files')
          .insert({
            case_id: caseId,
            pdf_file_name: pdfFileName,
            original_csv_url: signedData.signedUrl,
            is_corrected: false
          });
        
        if (insertError) {
          console.error(`[CSV Extract] DB insert failed for ${fileName}:`, insertError);
          continue;
        }
        
        console.log(`[CSV Extract] ✓ Successfully processed: ${fileName} -> ${pdfFileName}`);
        successCount++;
        
      } catch (fileError: any) {
        console.error(`[CSV Extract] Error processing ${fileName}:`, fileError.message);
      }
    }
    
    console.log(`[CSV Extract] Complete: ${successCount}/${csvFiles.length} CSVs processed for case ${caseId}`);
    
    if (successCount === 0 && csvFiles.length > 0) {
      throw new Error('Failed to process any CSV files from the ZIP');
    }
    
  } catch (error: any) {
    console.error('[CSV Extract] Fatal error:', error.message);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Job webhook received:", JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert job row (handles both job-started and job-finished events)
    const { data, error } = await supabase
      .from("jobs")
      .upsert({
        id: payload.job_id,
        task: payload.task,
        user_id: payload.user_id || payload.userId || null,
        session_id: payload.session_id || payload.sessionId || null,
        input_url: payload.input_url || payload.zipUrl,
        status: payload.status,
        url: payload.url || null,
        error: payload.error || null,
        idempotency_key: payload.idempotency_key || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Job upserted successfully:", JSON.stringify(data, null, 2));

    // Update cases table based on job status
    const sessionId = payload.session_id || payload.sessionId;
    if (sessionId) {
      await updateCaseStatus(supabase, payload);
    }

    return new Response(
      JSON.stringify({ success: true, job: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateCaseStatus(supabase: any, payload: any) {
  const caseId = payload.session_id || payload.sessionId;
  console.log(`Updating case ${caseId} status for task ${payload.task} with status ${payload.status}`);

  if (payload.status === "STARTED") {
    // Set case to Processing
    const { error: caseError } = await supabase
      .from("cases")
      .update({ 
        status: "Processing",
        hitl_stage: payload.task === 'initial-parse' ? 'initial_parse' : 
                   payload.task === 'final-analysis' ? 'final_analysis' : null
      })
      .eq("id", caseId);
    
    if (caseError) {
      console.error("Failed to update case to Processing:", caseError);
    } else {
      console.log(`Case ${caseId} set to Processing`);
    }

  } else if (payload.status === "SUCCEEDED") {
    // Handle success based on task type
    if (payload.task === "initial-parse") {
      // Extract and upload individual CSV files FIRST before updating status
      try {
        console.log(`[CSV Extract] Starting extraction for case ${caseId} from ${payload.url}`);
        await extractAndUploadCsvs(supabase, payload.url, caseId, payload.user_id || payload.userId);
        console.log(`[CSV Extract] Successfully completed extraction for case ${caseId}`);
      } catch (extractError: any) {
        console.error("[CSV Extract] Extraction failed:", extractError.message);
        // Mark case as failed since we can't proceed with review
        await supabase
          .from("cases")
          .update({ 
            status: "Failed",
            hitl_stage: null,
            updated_at: new Date().toISOString() 
          })
          .eq("id", caseId);
        
        return; // Don't proceed with Review status if extraction failed
      }
      
      // ONLY update case status to Review AFTER CSV extraction is complete
      const { error: caseError } = await supabase
        .from("cases")
        .update({ 
          status: "Review",
          hitl_stage: "review",
          csv_zip_url: payload.url,
          updated_at: new Date().toISOString() 
        })
        .eq("id", caseId);
      
      if (caseError) {
        console.error("Failed to update case to Review:", caseError);
      } else {
        console.log(`Case ${caseId} set to Review with csv_zip_url: ${payload.url}`);
      }
      
    } else if (payload.task === "final-analysis" || payload.task === "parse-statements") {
      const { error: caseError } = await supabase
        .from("cases")
        .update({ 
          status: "Ready",
          result_zip_url: payload.url,
          hitl_stage: null
        })
        .eq("id", caseId);
      
      if (caseError) {
        console.error("Failed to update case to Ready:", caseError);
      } else {
        console.log(`Case ${caseId} set to Ready with result_zip_url: ${payload.url}`);
      }
    }

    const { error: eventError } = await supabase
      .from("events")
      .insert({
        case_id: caseId,
        type: "analysis_ready",
        payload: { job_id: payload.job_id, result_url: payload.url }
      });
    
    if (eventError) {
      console.error("Failed to insert analysis_ready event:", eventError);
    }

  } else if (payload.status === "FAILED") {
    // Handle failure
    const { error: caseError } = await supabase
      .from("cases")
      .update({ 
        status: "Failed",
        hitl_stage: null
      })
      .eq("id", caseId);
    
    if (caseError) {
      console.error("Failed to update case to Failed:", caseError);
    } else {
      console.log(`Case ${caseId} set to Failed. Error: ${payload.error}`);
    }

    // Send failure notification email
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      // Fetch case details
      const { data: caseData } = await supabase
        .from("cases")
        .select("name, creator_id")
        .eq("id", caseId)
        .single();
      
      if (caseData) {
        // Fetch user email
        const { data: userData } = await supabase.auth.admin.getUserById(caseData.creator_id);
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Analysis Failed</h2>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Case:</strong> ${caseData.name}</p>
              <p style="margin: 8px 0 0 0;"><strong>Case ID:</strong> ${caseId}</p>
            </div>
            <p><strong>Job ID:</strong> ${payload.job_id}</p>
            <p><strong>Task:</strong> ${payload.task}</p>
            <p><strong>Error:</strong></p>
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 4px; margin: 8px 0;">
              <code style="color: #dc2626; font-size: 14px;">${payload.error || 'Unknown error'}</code>
            </div>
            <p><strong>User:</strong> ${userData?.user?.email || 'Unknown'}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification from FinNavigator AI.</p>
          </div>
        `;
        
        await resend.emails.send({
          from: "FinNavigator Alerts <help@finnavigatorai.com>",
          to: ["hello@finnavigatorai.com"],
          subject: `[FAILURE ALERT] Case Analysis Failed - ${caseData.name}`,
          html: emailHtml,
        });
        
        console.log(`Failure notification email sent for case ${caseId}`);
      }
    } catch (emailError: any) {
      console.error("Failed to send failure notification email:", emailError.message);
      // Don't throw - email failure shouldn't block webhook
    }

    const { error: eventError } = await supabase
      .from("events")
      .insert({
        case_id: caseId,
        type: "analysis_submitted",
        payload: { job_id: payload.job_id, error: payload.error }
      });
    
    if (eventError) {
      console.error("Failed to insert analysis_submitted event:", eventError);
    }
  }
}
