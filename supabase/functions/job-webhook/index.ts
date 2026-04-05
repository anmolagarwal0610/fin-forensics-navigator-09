import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

/**
 * Verify HMAC-SHA256 webhook signature
 */
async function verifyWebhookSignature(
  signature: string | null,
  body: string,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const expectedSigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const expectedSig = Array.from(new Uint8Array(expectedSigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Constant-time comparison to prevent timing attacks
  return signature === expectedSig;
}

/**
 * Sanitize filename to be compatible with Supabase Storage
 * Replaces characters that are not allowed in storage keys
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[[\]()]/g, '_')  // Replace brackets and parentheses with underscores
    .replace(/\s+/g, '_')       // Replace spaces with underscores
    .replace(/__+/g, '_')       // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, '');     // Trim leading/trailing underscores
}

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
        
        // Sanitize filename for storage (remove special characters)
        const sanitizedFileName = sanitizeFileName(fileName);
        
        // Upload to Supabase Storage with sanitized name
        const storagePath = `${userId}/${caseId}/csv/original/${sanitizedFileName}`;
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
        
        // Derive PDF filename from original CSV name (for display)
        // Keep original name for user recognition
        const pdfFileName = fileName.replace('.csv', '.pdf');
        
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
        
        console.log(`[CSV Extract] ✓ Successfully processed: ${fileName} (stored as ${sanitizedFileName}) -> ${pdfFileName}`);
        successCount++;
        
      } catch (fileError: unknown) {
        const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
        console.error(`[CSV Extract] Error processing ${fileName}:`, errorMessage);
      }
    }
    
    console.log(`[CSV Extract] Complete: ${successCount}/${csvFiles.length} CSVs processed for case ${caseId}`);
    
    if (successCount === 0 && csvFiles.length > 0) {
      throw new Error('Failed to process any CSV files from the ZIP');
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('[CSV Extract] Fatal error:', errorMessage);
    throw error;
  }
}

serve(async (req) => {
  console.log("=== Job Webhook Received ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('X-Signature');
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("[Security] WEBHOOK_SECRET not configured");
      return new Response("Server configuration error", { 
        status: 500,
        headers: corsHeaders 
      });
    }
    
    // VERIFY SIGNATURE BEFORE PROCESSING
    const isValid = await verifyWebhookSignature(signature, rawBody, webhookSecret);
    
    if (!isValid) {
      console.error("[Security] Invalid webhook signature - unauthorized request blocked");
      return new Response("Unauthorized", { 
        status: 401,
        headers: corsHeaders 
      });
    }
    
    console.log("[Security] ✓ Webhook signature verified");
    
    // Parse the validated payload
    const payload = JSON.parse(rawBody);
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateCaseStatus(supabase: any, payload: any) {
  const caseId = payload.session_id || payload.sessionId;
  console.log(`Updating case ${caseId} status for task ${payload.task} with status ${payload.status}`);

  // Treat PENDING, RUNNING, and STARTED as "Processing" statuses
  if (["PENDING", "RUNNING", "STARTED"].includes(payload.status)) {
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
      console.log(`Case ${caseId} set to Processing (status: ${payload.status})`);
    }

  } else if (payload.status === "SUCCEEDED") {
    // Handle success based on task type
    if (payload.task === "initial-parse") {
      // Extract and upload individual CSV files FIRST before updating status
      try {
        console.log(`[CSV Extract] Starting extraction for case ${caseId} from ${payload.url}`);
        await extractAndUploadCsvs(supabase, payload.url, caseId, payload.user_id || payload.userId);
        console.log(`[CSV Extract] Successfully completed extraction for case ${caseId}`);
      } catch (extractError: unknown) {
        const errorMessage = extractError instanceof Error ? extractError.message : "Unknown error";
        console.error("[CSV Extract] Extraction failed:", errorMessage);
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
      // Check if case already has a result - if so, this is an "add files" scenario
      const { data: existingCase } = await supabase
        .from("cases")
        .select("result_zip_url")
        .eq("id", caseId)
        .single();
      
      const updateData: any = { 
        status: "Ready",
        hitl_stage: null
      };
      
      // NEW SECURE FLOW: Check for result_file_id (uploaded via upload-result-file)
      if (payload.result_file_id) {
        console.log(`[Secure Storage] Using result_file_id: ${payload.result_file_id}`);
        // File already uploaded via upload-result-file edge function
        // Frontend will use get-result-file to fetch signed URL
        // Don't set result_zip_url - this signals to frontend to use secure flow
        
        // Mark old result files as non-current if any
        const userId = payload.user_id || payload.userId;
        await supabase
          .from("result_files")
          .update({ is_current: false })
          .eq("case_id", caseId)
          .eq("user_id", userId)
          .neq("id", payload.result_file_id);
          
      } else if (payload.url) {
        // LEGACY FLOW: Still has public URL (for backwards compatibility)
        console.log(`[Legacy Storage] Using public URL: ${payload.url}`);
        updateData.result_zip_url = payload.url;
        
        // If there's an existing result, move it to previous_result_zip_url
        if (existingCase?.result_zip_url) {
          updateData.previous_result_zip_url = existingCase.result_zip_url;
          console.log(`[Add Files] Moving previous result to previous_result_zip_url`);
        }
      }
      
      const { error: caseError } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseId);
      
      if (caseError) {
        console.error("Failed to update case to Ready:", caseError);
      } else {
        const flowType = payload.result_file_id ? "secure storage" : "legacy URL";
        console.log(`Case ${caseId} set to Ready via ${flowType}`);
      }
      
      // TODO: Track page usage for final-analysis
      // The backend needs to send pages_processed in the webhook payload
      // Then call: await supabase.rpc('track_page_usage', {
      //   p_user_id: payload.user_id || payload.userId,
      //   p_pages_processed: payload.pages_processed
      // });
    }

    const { error: eventError } = await supabase
      .from("events")
      .insert({
        case_id: caseId,
        type: "analysis_ready",
        payload: { 
          job_id: payload.job_id, 
          result_url: payload.url,
          stage: payload.task // 'initial-parse' or 'final-analysis' or 'parse-statements'
        }
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
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendApiKey) {
        console.warn("RESEND_API_KEY not configured, skipping failure email");
      } else {
        // Fetch case details
        const { data: caseData } = await supabase
          .from("cases")
          .select("name, creator_id, created_at")
          .eq("id", caseId)
          .single();
        
        if (caseData) {
          // Fetch user email and file count in parallel
          const [userResult, fileCountResult] = await Promise.all([
            supabase.auth.admin.getUserById(caseData.creator_id),
            supabase.from("case_files").select("*", { count: "exact", head: true }).eq("case_id", caseId),
          ]);
          const userData = userResult.data;
          const fileCount = fileCountResult.count ?? 'Unknown';
          
          const currentYear = new Date().getFullYear();
          const timestamp = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
            dateStyle: "full",
            timeStyle: "long",
          }).replace("India Standard Time", "IST").replace("GMT+5:30", "IST");

          const analysisStarted = new Date(caseData.created_at).toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
            dateStyle: "full",
            timeStyle: "long",
          }).replace("India Standard Time", "IST").replace("GMT+5:30", "IST");
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                  .error-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 4px; }
                  .details-box { background: white; padding: 20px; border-radius: 4px; margin: 16px 0; border: 1px solid #e5e7eb; }
                  .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
                    <h1 style="margin: 0; font-size: 24px;">⚠️ Analysis Failed</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Case Processing Error</p>
                  </div>
                  
                  <div class="content">
                    <div class="error-box">
                      <p style="margin: 0;"><strong>Case:</strong> ${caseData.name}</p>
                      <p style="margin: 8px 0 0 0;"><strong>Case ID:</strong> ${caseId}</p>
                    </div>
                    
                    <div class="details-box">
                      <p style="margin: 0 0 8px;"><strong>Job ID:</strong> ${payload.job_id}</p>
                      <p style="margin: 0 0 8px;"><strong>Task:</strong> ${payload.task}</p>
                      <p style="margin: 0 0 8px;"><strong>Time Analysis Started:</strong> ${analysisStarted}</p>
                      <p style="margin: 0 0 8px;"><strong>Number of Files:</strong> ${fileCount}</p>
                      <p style="margin: 0 0 8px;"><strong>Error:</strong></p>
                      <code style="display: block; background: #f9fafb; padding: 12px; border-radius: 4px; color: #dc2626; font-size: 13px; word-break: break-word;">${payload.error || 'Unknown error'}</code>
                    </div>
                    
                    <p style="margin: 16px 0 8px;"><strong>User:</strong> ${userData?.user?.email || 'Unknown'}</p>
                    <p style="margin: 0 0 8px;"><strong>User ID:</strong> ${caseData.creator_id}</p>
                    <p style="margin: 0;"><strong>Timestamp:</strong> ${timestamp}</p>
                  </div>
                  
                  <div class="footer">
                    <p style="margin: 0;">This is an automated notification from FinNavigator AI</p>
                    <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">© ${currentYear} FinNavigator AI. All rights reserved.</p>
                  </div>
                </div>
              </body>
            </html>
          `;
          
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "FinNavigator Alerts <help@finnavigatorai.com>",
              to: ["hello@finnavigatorai.com"],
              subject: `[FAILURE ALERT] Case Analysis Failed - ${caseData.name}`,
              html: emailHtml,
            }),
          });
          
          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("Failed to send failure notification:", errorText);
          } else {
            console.log(`Failure notification email sent for case ${caseId}`);
          }
        }
      }
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
      console.error("Failed to send failure notification email:", errorMessage);
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
