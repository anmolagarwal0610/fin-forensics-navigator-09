import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing short code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find share record
    const { data: share, error: shareError } = await supabase
      .from('shared_fund_trails')
      .select('*')
      .eq('short_code', code)
      .maybeSingle();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: "Share link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if revoked
    if (share.is_revoked) {
      return new Response(
        JSON.stringify({ error: "This share link has been revoked" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This share link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment view count (non-blocking)
    supabase
      .from('shared_fund_trails')
      .update({ view_count: (share.view_count || 0) + 1 })
      .eq('id', share.id)
      .then(() => {});

    // Get HTML from storage
    const { data: file, error: downloadError } = await supabase.storage
      .from('shared-fund-trails')
      .download(share.storage_path);

    if (downloadError || !file) {
      console.error('Storage download error:', downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve shared content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let html = await file.text();

    // Fetch saved view positions for this case
    const { data: savedView } = await supabase
      .from('fund_trail_views')
      .select('positions, filters')
      .eq('case_id', share.case_id)
      .maybeSingle();

    // SYNCHRONOUS injection - modify DATA object directly where it's defined
    if (savedView?.positions) {
      const positionsJson = JSON.stringify(savedView.positions);
      
      // Find the DATA object definition and inject savedPositions into it
      html = html.replace(
        /(const\s+DATA\s*=\s*\{[^}]*savedPositions\s*:\s*)null/,
        `$1${positionsJson}`
      );
      
      // Also patch savedPositions variable if it exists separately
      html = html.replace(
        /(let\s+savedPositions\s*=\s*)null/,
        `$1${positionsJson}`
      );
    }
    
    if (savedView?.filters) {
      const filtersJson = JSON.stringify(savedView.filters);
      html = html.replace(
        /(savedFilters\s*:\s*)null/,
        `$1${filtersJson}`
      );
    }
    
    // Additional script to disable save in shared view
    const injection = `
      <script>
        (function() {
          document.addEventListener('DOMContentLoaded', function() {
            window.IS_SHARED_VIEW = true;
            if (typeof window.saveView === 'function') {
              window.saveView = function() {
                console.log('Save is disabled in shared view');
                return null;
              };
            }
          });
        })();
      </script>
    `;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${injection}</head>`);
    } else if (html.includes('</html>')) {
      html = html.replace('</html>', `${injection}</html>`);
    } else {
      html = injection + html;
    }

    // Return HTML content directly
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600" // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error("Error in get-shared-fund-trail:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});