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
    console.log("Job webhook received:", payload);

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

    console.log("Job upserted:", data);

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

  if (payload.status === "STARTED") {
    // Set case to Processing
    await supabase
      .from("cases")
      .update({ 
        status: "Processing",
        hitl_stage: payload.task === 'initial-parse' ? 'initial_parse' : 
                   payload.task === 'final-analysis' ? 'final_analysis' : null
      })
      .eq("id", caseId);

  } else if (payload.status === "SUCCEEDED") {
    // Handle success based on task type
    if (payload.task === "initial-parse") {
      await supabase
        .from("cases")
        .update({ 
          status: "Review",
          hitl_stage: "review",
          csv_zip_url: payload.url
        })
        .eq("id", caseId);
      
    } else if (payload.task === "final-analysis" || payload.task === "parse-statements") {
      await supabase
        .from("cases")
        .update({ 
          status: "Ready",
          result_zip_url: payload.url,
          hitl_stage: null
        })
        .eq("id", caseId);
    }

    await supabase
      .from("events")
      .insert({
        case_id: caseId,
        type: "analysis_ready",
        payload: { job_id: payload.job_id, result_url: payload.url }
      });

  } else if (payload.status === "FAILED") {
    // Handle failure
    await supabase
      .from("cases")
      .update({ 
        status: "Failed",
        hitl_stage: null
      })
      .eq("id", caseId);

    await supabase
      .from("events")
      .insert({
        case_id: caseId,
        type: "analysis_submitted",
        payload: { job_id: payload.job_id, error: payload.error }
      });
  }
}
