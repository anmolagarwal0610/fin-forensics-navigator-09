import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  console.log("=== Upload Result File ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key (shared secret between backend and edge function)
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("BACKEND_API_KEY");
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error("[Security] Invalid API key");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    console.log("[Security] ✓ API key verified");

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const caseId = formData.get("case_id") as string;
    const userId = formData.get("user_id") as string;
    const jobId = formData.get("job_id") as string;
    const fileType = formData.get("file_type") as string || "result_zip";

    if (!file || !caseId || !userId) {
      console.error("[Validation] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, case_id, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Upload] Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) for case ${caseId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique storage path
    const timestamp = Date.now();
    const storagePath = `${userId}/${caseId}/${fileType}_${timestamp}.zip`;

    // Upload to private bucket
    const { error: uploadError } = await supabase.storage
      .from("result-files")
      .upload(storagePath, file, {
        contentType: "application/zip",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload] Storage error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log(`[Upload] File uploaded to: ${storagePath}`);

    // Mark previous files of this type as not current
    const { error: updateError } = await supabase
      .from("result_files")
      .update({ is_current: false })
      .eq("case_id", caseId)
      .eq("file_type", fileType)
      .eq("is_current", true);

    if (updateError) {
      console.warn("[Upload] Failed to mark previous files as not current:", updateError);
    }

    // Insert metadata record
    const { data: resultFile, error: dbError } = await supabase
      .from("result_files")
      .insert({
        case_id: caseId,
        user_id: userId,
        job_id: jobId || null,
        storage_path: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
        file_type: fileType,
        is_current: true,
        expires_at: null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Upload] Database error:", dbError);
      // Cleanup uploaded file on DB failure
      await supabase.storage.from("result-files").remove([storagePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log(`[Upload] ✓ Result file recorded: ${resultFile.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        result_file_id: resultFile.id,
        storage_path: storagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Upload] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
