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
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing short code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find share record
    const { data: share, error: shareError } = await supabase
      .from("shared_fund_trails")
      .select("*")
      .eq("short_code", code)
      .maybeSingle();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Share link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if revoked
    if (share.is_revoked) {
      return new Response(JSON.stringify({ error: "This share link has been revoked" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This share link has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment view count (non-blocking)
    supabase
      .from("shared_fund_trails")
      .update({ view_count: (share.view_count || 0) + 1 })
      .eq("id", share.id)
      .then(() => {});

    // Get HTML from storage
    const { data: file, error: downloadError } = await supabase.storage
      .from("shared-fund-trails")
      .download(share.storage_path);

    if (downloadError || !file) {
      console.error("Storage download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to retrieve shared content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = await file.text();

    // Fetch saved view data for this case (using new view_data column)
    const { data: savedView } = await supabase
      .from("fund_trail_views")
      .select("view_data")
      .eq("case_id", share.case_id)
      .maybeSingle();

    // Build injection script: load saved view + disable save in shared mode
    const viewDataJson = savedView?.view_data ? JSON.stringify(savedView.view_data) : "null";

    const injection = `
      <script>
        (function() {
          window.IS_SHARED_VIEW = true;
          var savedViewData = ${viewDataJson};
          
          function setupSharedView() {
            // Load saved view data if available
            if (savedViewData && typeof window.loadFundTrailView === 'function') {
              window.loadFundTrailView(savedViewData);
            }
            
            // Disable save function
            if (typeof window.saveView === 'function') {
              window.saveView = function() {
                console.log('Save is disabled in shared view');
                return null;
              };
            }
            
            // Hide the Save View button
            var saveBtn = document.getElementById('saveViewBtn');
            if (saveBtn) {
              saveBtn.style.display = 'none';
            }
            
            // Hide Reset to Original button in filters
            var resetOriginalBtn = document.getElementById('resetOriginalBtn');
            if (resetOriginalBtn) {
              resetOriginalBtn.style.display = 'none';
            }
            
            // Override updateUIState to never show save button
            if (typeof window.updateUIState === 'function') {
              var originalUpdateUIState = window.updateUIState;
              window.updateUIState = function() {
                originalUpdateUIState();
                var btn = document.getElementById('saveViewBtn');
                if (btn) btn.style.display = 'none';
              };
            }
          }
          
          // Run immediately
          setupSharedView();
          
          // Also run after DOM ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupSharedView);
          }
          
          // And after delays to catch late renders and ensure loadFundTrailView is available
          setTimeout(setupSharedView, 100);
          setTimeout(setupSharedView, 500);
          setTimeout(setupSharedView, 1500);
        })();
      </script>
    `;

    // Inject before </body> for better timing
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${injection}</body>`);
    } else if (html.includes("</html>")) {
      html = html.replace("</html>", `${injection}</html>`);
    } else {
      html = html + injection;
    }

    // Return HTML content directly
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error in get-shared-fund-trail:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
