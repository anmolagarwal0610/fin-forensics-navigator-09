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

    // Fetch storage objects using service role
    let query = serviceClient
      .from("objects")
      .select("id, name, bucket_id, created_at, metadata")
      .schema("storage");

    if (bucket) {
      query = query.eq("bucket_id", bucket);
    }

    // Apply sorting
    query = query.order(sortBy === "size" ? "metadata->size" : "created_at", {
      ascending: sortOrder === "asc",
    });

    query = query.range(offset, offset + limit - 1);

    const { data: objects, error: objectsError } = await query;

    if (objectsError) {
      console.error("Error fetching objects:", objectsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch storage files" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users for email lookup
    const { data: { users: allUsers } } = await serviceClient.auth.admin.listUsers();
    const userMap = new Map(allUsers?.map(u => [u.id, { email: u.email, name: u.user_metadata?.full_name }]) || []);

    // Get all cases for case name lookup
    const { data: allCases } = await serviceClient
      .from("cases")
      .select("id, name, creator_id");
    const caseMap = new Map(allCases?.map(c => [c.id, { name: c.name, creator_id: c.creator_id }]) || []);

    // Process and enrich files
    const files: StorageFile[] = (objects || []).map((obj: any) => {
      // Extract file type from name
      const ext = obj.name.split('.').pop()?.toLowerCase() || 'unknown';
      const sizeBytes = obj.metadata?.size || 0;

      // Try to extract case_id and user_id from path
      // Pattern: {user_id}/{case_id}/filename OR case_{case_id}_*
      const pathParts = obj.name.split('/');
      let userId: string | null = null;
      let caseId: string | null = null;

      if (pathParts.length >= 2) {
        // Pattern: user_id/case_id/filename
        userId = pathParts[0];
        caseId = pathParts[1];
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

      // Filter by file type if specified
      if (fileType && ext.toLowerCase() !== fileType.toLowerCase()) {
        return null;
      }

      return {
        id: obj.id,
        name: obj.name.split('/').pop() || obj.name,
        path: obj.name,
        bucket_id: obj.bucket_id,
        file_type: ext,
        size_bytes: sizeBytes,
        created_at: obj.created_at,
        user_email: finalUserInfo?.email || null,
        user_name: finalUserInfo?.name || null,
        case_name: caseInfo?.name || null,
        case_id: caseId,
      };
    }).filter(Boolean);

    // Sort by size if requested (metadata sorting might not work perfectly)
    if (sortBy === "size") {
      files.sort((a, b) => {
        const diff = (a?.size_bytes || 0) - (b?.size_bytes || 0);
        return sortOrder === "asc" ? diff : -diff;
      });
    }

    return new Response(
      JSON.stringify({ files, total: files.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin-storage-files:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
