import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
      console.error("[send-stale-processing-alert] Missing env");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const body = await req.json();
    const { caseId, caseName, hoursStuck, fileCount, processingStarted, userEmail } = body ?? {};

    if (!caseId || !caseName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize: caller must own the case OR be an admin
    const { data: caseRow, error: caseErr } = await supabase
      .from("cases")
      .select("creator_id, status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseErr || !caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allowed = caseRow.creator_id === callerId;
    if (!allowed) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: callerId,
        _role: "admin",
      });
      allowed = !!isAdmin;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanity check: only alert if still Processing
    if (caseRow.status !== "Processing") {
      return new Response(JSON.stringify({ success: true, skipped: "not_processing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startedDisplay = processingStarted
      ? new Date(processingStarted).toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
          dateStyle: "full",
          timeStyle: "long",
        })
      : "Unknown";

    const detectedDisplay = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;">
        <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;">⏱️ Stuck Processing Alert</h1>
          <p style="color:#ede9fe;margin:6px 0 0 0;font-size:14px;">A case has been processing for ${hoursStuck ?? "3+"} hours</p>
        </div>
        <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
            <p style="margin:0;color:#92400e;font-size:14px;"><strong>Detected via UI watcher.</strong> A logged-in user observed this case still in Processing after the 3-hour threshold.</p>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;width:40%;">Case Name</td><td style="padding:8px 0;color:#111827;">${caseName}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;">Case ID</td><td style="padding:8px 0;color:#111827;font-family:monospace;font-size:12px;">${caseId}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;">Hours Stuck</td><td style="padding:8px 0;color:#dc2626;"><strong>${hoursStuck ?? "3+"}h</strong></td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;">Files</td><td style="padding:8px 0;color:#111827;">${fileCount ?? 0}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;">User</td><td style="padding:8px 0;color:#111827;">${userEmail ?? caseRow.creator_id}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;">Last Updated</td><td style="padding:8px 0;color:#111827;">${startedDisplay}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#374151;">Detected At</td><td style="padding:8px 0;color:#111827;">${detectedDisplay}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">Automated alert from FinNavigator AI (UI watcher).</p>
        </div>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "help@finnavigatorai.com",
        to: "help@finnavigatorai.com",
        subject: `⏱️ Stuck Processing: ${caseName} (${hoursStuck ?? "3+"}h)`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[send-stale-processing-alert] Resend error:", errorText);
      if (emailResponse.status === 429) {
        return new Response(JSON.stringify({ success: true, note: "rate_limited" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-stale-processing-alert] Error:", msg);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});