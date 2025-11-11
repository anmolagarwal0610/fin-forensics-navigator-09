import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        user_id: payload.userId || null,
        session_id: payload.sessionId || null,
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
    if (payload.sessionId) {
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
  const caseId = payload.sessionId;
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
      const { error: caseError } = await supabase
        .from("cases")
        .update({ 
          status: "Review",
          hitl_stage: "review",
          csv_zip_url: payload.url
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
