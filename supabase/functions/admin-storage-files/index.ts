import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StorageFile {
  id: string;
  name: string;
  path: string;
  bucket_id: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  case_name: string | null;
  case_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Parse query parameters
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket");
    const fileType = url.searchParams.get("file_type");
    const sortBy = url.searchParams.get("sort_by") || "created_at";
    const sortOrder = url.searchParams.get("sort_order") || "desc";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Call the RPC function that can access storage.objects
    const { data: objects, error: rpcError } = await serviceClient.rpc(
      "admin_list_storage_objects",
      {
        p_bucket_id: bucket || null,
        p_file_type_category: fileType || null,
        p_sort_by: sortBy === "size" ? "size" : "created_at",
        p_sort_order: sortOrder === "asc" ? "asc" : "desc",
        p_limit: Math.min(limit, 200),
        p_offset: offset,
      }
    );

    if (rpcError) {
      console.error("Error calling admin_list_storage_objects:", rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message, code: rpcError.code }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract unique user IDs and case IDs from paths for enrichment
    const userIds = new Set<string>();
    const caseIds = new Set<string>();

    for (const obj of objects || []) {
      const pathParts = obj.name.split('/');
      if (pathParts.length >= 2) {
        // Pattern: user_id/case_id/filename
        if (pathParts[0].match(/^[a-f0-9-]{36}$/i)) {
          userIds.add(pathParts[0]);
        }
        if (pathParts[1].match(/^[a-f0-9-]{36}$/i)) {
          caseIds.add(pathParts[1]);
        }
      }
      // Also check for case_xxx pattern in filename
      const caseMatch = obj.name.match(/case_([a-f0-9-]{36})/i);
      if (caseMatch) {
        caseIds.add(caseMatch[1]);
      }
    }

    // Fetch users for email lookup (only the ones we need)
    const userMap = new Map<string, { email: string; name: string | null }>();
    if (userIds.size > 0) {
      const { data: { users: allUsers } } = await serviceClient.auth.admin.listUsers();
      for (const u of allUsers || []) {
        if (userIds.has(u.id)) {
          userMap.set(u.id, { email: u.email || '', name: u.user_metadata?.full_name || null });
        }
      }
    }

    // Fetch cases for case name lookup (only the ones we need)
    const caseMap = new Map<string, { name: string; creator_id: string }>();
    if (caseIds.size > 0) {
      const { data: cases } = await serviceClient
        .from("cases")
        .select("id, name, creator_id")
        .in("id", Array.from(caseIds));
      
      for (const c of cases || []) {
        caseMap.set(c.id, { name: c.name, creator_id: c.creator_id });
        // Also add the creator to userIds for lookup
        if (c.creator_id && !userMap.has(c.creator_id)) {
          userIds.add(c.creator_id);
        }
      }

      // Fetch any additional users we discovered from cases
      if (userIds.size > userMap.size) {
        const { data: { users: moreUsers } } = await serviceClient.auth.admin.listUsers();
        for (const u of moreUsers || []) {
          if (userIds.has(u.id) && !userMap.has(u.id)) {
            userMap.set(u.id, { email: u.email || '', name: u.user_metadata?.full_name || null });
          }
        }
      }
    }

    // Get total count from first result (all rows have the same total_count)
    const totalCount = objects?.length > 0 ? objects[0].total_count : 0;

    // Process and enrich files
    const files: StorageFile[] = (objects || []).map((obj: any) => {
      // Extract file extension from name
      const ext = obj.name.split('.').pop()?.toLowerCase() || 'unknown';

      // Try to extract case_id and user_id from path
      const pathParts = obj.name.split('/');
      let userId: string | null = null;
      let caseId: string | null = null;

      if (pathParts.length >= 2) {
        if (pathParts[0].match(/^[a-f0-9-]{36}$/i)) {
          userId = pathParts[0];
        }
        if (pathParts[1].match(/^[a-f0-9-]{36}$/i)) {
          caseId = pathParts[1];
        }
      }

      // Also check for case_xxx pattern in filename
      const caseMatch = obj.name.match(/case_([a-f0-9-]{36})/i);
      if (caseMatch) {
        caseId = caseMatch[1];
      }

      // Get user info
      const userInfo = userId ? userMap.get(userId) : null;
      
      // Get case info
      const caseInfo = caseId ? caseMap.get(caseId) : null;
      
      // If we got case info, use the case creator for user info
      const finalUserInfo = caseInfo ? userMap.get(caseInfo.creator_id) : userInfo;

      return {
        id: obj.id,
        name: obj.name.split('/').pop() || obj.name,
        path: obj.name,
        bucket_id: obj.bucket_id,
        file_type: ext,
        size_bytes: obj.size_bytes || 0,
        created_at: obj.created_at,
        user_email: finalUserInfo?.email || null,
        user_name: finalUserInfo?.name || null,
        case_name: caseInfo?.name || null,
        case_id: caseId,
      };
    });

    return new Response(
      JSON.stringify({ files, total: totalCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin-storage-files:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
