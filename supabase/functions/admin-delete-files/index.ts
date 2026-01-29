import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteResult {
  path: string;
  success: boolean;
  error?: string;
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  return 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract client metadata for audit logging
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create client with user's token to verify they're admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin using service role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { files } = body as { files: Array<{ bucket_id: string; path: string }> };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files specified for deletion" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit bulk delete to 100 files at a time
    if (files.length > 100) {
      return new Response(
        JSON.stringify({ error: "Maximum 100 files can be deleted at once" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} deleting ${files.length} files from IP ${clientIP}`);

    // Delete files grouped by bucket
    const results: DeleteResult[] = [];
    const bucketGroups = new Map<string, string[]>();

    for (const file of files) {
      if (!bucketGroups.has(file.bucket_id)) {
        bucketGroups.set(file.bucket_id, []);
      }
      bucketGroups.get(file.bucket_id)!.push(file.path);
    }

    for (const [bucketId, paths] of bucketGroups) {
      const { data, error } = await serviceClient.storage
        .from(bucketId)
        .remove(paths);

      if (error) {
        console.error(`Error deleting from ${bucketId}:`, error);
        for (const path of paths) {
          results.push({ path: `${bucketId}/${path}`, success: false, error: error.message });
        }
      } else {
        for (const path of paths) {
          results.push({ path: `${bucketId}/${path}`, success: true });
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Log the admin action with IP and user agent
    await serviceClient.rpc("log_admin_action", {
      p_admin_id: user.id,
      p_target_user_id: user.id,
      p_action: "bulk_delete_storage_files",
      p_details: {
        files_count: files.length,
        successful: successful,
        failed: failed,
      },
      p_ip_address: clientIP,
      p_user_agent: userAgent,
    });

    return new Response(
      JSON.stringify({
        message: `Deleted ${successful} files${failed > 0 ? `, ${failed} failed` : ''}`,
        results,
        summary: { successful, failed, total: files.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin-delete-files:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
