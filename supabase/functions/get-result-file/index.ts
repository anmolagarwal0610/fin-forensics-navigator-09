import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== Get Result File ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("[Auth] No authorization header");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user with anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      console.error("[Auth] User verification failed:", authError);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    console.log(`[Auth] ✓ User verified: ${user.id}`);

    const { caseId, fileType = "result_zip" } = await req.json();

    if (!caseId) {
      return new Response(
        JSON.stringify({ error: "Missing case_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify case ownership
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("creator_id")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      console.error("[Access] Case not found:", caseId);
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check ownership or admin role
    const isOwner = caseData.creator_id === user.id;
    const { data: isAdmin } = await supabase.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });

    if (!isOwner && !isAdmin) {
      console.error(`[Security] User ${user.id} attempted to access case ${caseId} owned by ${caseData.creator_id}`);
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Access] ✓ User authorized (owner: ${isOwner}, admin: ${isAdmin})`);

    // Get current result file
    const { data: resultFile, error: fileError } = await supabase
      .from("result_files")
      .select("*")
      .eq("case_id", caseId)
      .eq("file_type", fileType)
      .eq("is_current", true)
      .maybeSingle();

    if (fileError) {
      console.error("[DB] Query error:", fileError);
      throw new Error(`Database query failed: ${fileError.message}`);
    }

    if (!resultFile) {
      console.log(`[File] No ${fileType} file found for case ${caseId}`);
      return new Response(
        JSON.stringify({ error: "Result file not found", notFound: true }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("result-files")
      .createSignedUrl(resultFile.storage_path, 3600);

    if (signedError || !signedData) {
      console.error("[Storage] Signed URL error:", signedError);
      throw new Error("Failed to generate download URL");
    }

    console.log(`[Download] ✓ Generated signed URL for case ${caseId}, file type: ${fileType}`);

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        fileName: resultFile.file_name,
        fileSize: resultFile.file_size_bytes,
        createdAt: resultFile.created_at,
        storagePath: resultFile.storage_path,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Download] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
