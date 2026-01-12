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

    // Fetch saved view positions for this case
    const { data: savedView } = await supabase
      .from("fund_trail_views")
      .select("positions, filters")
      .eq("case_id", share.case_id)
      .maybeSingle();

    // FIXED: Inject saved positions with correct regex patterns
    if (savedView?.positions && Object.keys(savedView.positions).length > 0) {
      const positionsJson = JSON.stringify(savedView.positions);

      // Pattern 1: Replace "let savedPositions = DATA.savedPositions || null;"
      html = html.replace(
        /let\s+savedPositions\s*=\s*DATA\.savedPositions\s*\|\|\s*null\s*;/,
        `let savedPositions = ${positionsJson};`,
      );

      // Pattern 2: Also try "let savedPositions = null;" as fallback
      html = html.replace(/let\s+savedPositions\s*=\s*null\s*;/, `let savedPositions = ${positionsJson};`);

      // Set hasSavedView to true
      html = html.replace(/let\s+hasSavedView\s*=\s*!!savedPositions\s*;/, `let hasSavedView = true;`);

      // Also try direct false replacement
      html = html.replace(/let\s+hasSavedView\s*=\s*false\s*;/, `let hasSavedView = true;`);
    }

    // Inject saved filters
    if (savedView?.filters) {
      const { selectedOwners, topN } = savedView.filters;

      if (selectedOwners && Array.isArray(selectedOwners) && selectedOwners.length > 0) {
        const ownersJson = JSON.stringify(selectedOwners);
        // Replace the selectedOwners initialization
        html = html.replace(
          /let\s+selectedOwners\s*=\s*new\s+Set\(DATA\.owners\.map\(\s*i\s*=>\s*DATA\.nodes\[i\]\.id\s*\)\);/,
          `let selectedOwners = new Set(${ownersJson});`,
        );
      }

      if (topN && typeof topN === "number") {
        html = html.replace(/let\s+topN\s*=\s*25\s*;/, `let topN = ${topN};`);
      }
    }

    // Script to disable save and hide save button in shared view
    const injection = `
      <script>
        (function() {
          window.IS_SHARED_VIEW = true;
          
          function setupSharedView() {
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
          
          // And after delays to catch late renders
          setTimeout(setupSharedView, 100);
          setTimeout(setupSharedView, 500);
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
