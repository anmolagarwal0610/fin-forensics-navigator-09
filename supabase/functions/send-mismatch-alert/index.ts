import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[send-mismatch-alert] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!resendApiKey) {
      console.error("[send-mismatch-alert] Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { case_name, user_email, file_name, file_base64, pdf_file_base64, pdf_file_name } = await req.json();

    if (!case_name || !user_email || !file_name || !file_base64) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#dc2626;">⚠️ Mismatch Detected</h2>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #e5e7eb;">Case Name</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${case_name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #e5e7eb;">User Email</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${user_email}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #e5e7eb;">File</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${file_name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #e5e7eb;">Detected At</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${timestamp}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;">This is an automated alert from FinNavigator AI.</p>
      </div>
    `;

    const attachments: Array<{ filename: string; content: string }> = [
      { filename: file_name, content: file_base64 },
    ];

    if (pdf_file_base64 && pdf_file_name) {
      attachments.push({ filename: pdf_file_name, content: pdf_file_base64 });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "help@finnavigatorai.com",
        to: "help@finnavigatorai.com",
        subject: `Mismatch Alert: ${case_name}`,
        html: emailHtml,
        attachments,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[send-mismatch-alert] Resend error:", errorText);
      // Don't throw on rate limits — return success to prevent client retries
      if (emailResponse.status === 429) {
        return new Response(JSON.stringify({ success: true, note: "rate_limited" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw new Error(`Resend error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-mismatch-alert] Error:", msg);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
