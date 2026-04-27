import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find cases stuck in Processing for > 3 hours that haven't been alerted yet
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const { data: staleCases, error: queryError } = await supabase
      .from("cases")
      .select("id, name, creator_id, created_at, updated_at")
      .eq("status", "Processing")
      .eq("stale_alert_sent", false)
      .lt("updated_at", threeHoursAgo);

    if (queryError) {
      console.error("[check-stale] Query error:", queryError);
      throw queryError;
    }

    if (!staleCases || staleCases.length === 0) {
      console.log("[check-stale] No stale processing cases found");
      return new Response(JSON.stringify({ message: "No stale cases" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[check-stale] Found ${staleCases.length} stale case(s)`);

    if (!resendApiKey) {
      console.warn("[check-stale] RESEND_API_KEY not configured, skipping emails");
      return new Response(JSON.stringify({ message: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const caseItem of staleCases) {
      try {
        // Get file count
        const { count: fileCount } = await supabase
          .from("case_files")
          .select("*", { count: "exact", head: true })
          .eq("case_id", caseItem.id);

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(caseItem.creator_id);

        const currentYear = new Date().getFullYear();
        const processingStarted = new Date(caseItem.updated_at).toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
          dateStyle: "full",
          timeStyle: "long",
        }).replace("India Standard Time", "IST").replace("GMT+5:30", "IST");

        const hoursStuck = Math.round((Date.now() - new Date(caseItem.updated_at).getTime()) / (1000 * 60 * 60));

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px; }
                .details-box { background: white; padding: 20px; border-radius: 4px; margin: 16px 0; border: 1px solid #e5e7eb; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
                  <h1 style="margin: 0; font-size: 24px;">⏰ Stale Processing Alert</h1>
                  <p style="margin: 10px 0 0; opacity: 0.9;">Case stuck for ${hoursStuck}+ hours</p>
                </div>
                
                <div class="content">
                  <div class="warning-box">
                    <p style="margin: 0;"><strong>Case:</strong> ${caseItem.name}</p>
                    <p style="margin: 8px 0 0 0;"><strong>Case ID:</strong> ${caseItem.id}</p>
                  </div>
                  
                  <div class="details-box">
                    <p style="margin: 0 0 8px;"><strong>User:</strong> ${userData?.user?.email || caseItem.creator_id}</p>
                    <p style="margin: 0 0 8px;"><strong>User ID:</strong> ${caseItem.creator_id}</p>
                    <p style="margin: 0 0 8px;"><strong>Time Analysis Started:</strong> ${processingStarted}</p>
                    <p style="margin: 0 0 8px;"><strong>Number of Files:</strong> ${fileCount ?? 'Unknown'}</p>
                    <p style="margin: 0;"><strong>Hours in Processing:</strong> ${hoursStuck}</p>
                  </div>
                </div>
                
                <div class="footer">
                  <p style="margin: 0;">This is an automated notification from FinNavigator AI</p>
                  <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">© ${currentYear} FinNavigator AI. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FinNavigator Alerts <help@finnavigatorai.com>",
            to: ["help@finnavigatorai.com"],
            subject: `[STALE ALERT] Case "${caseItem.name}" stuck in Processing for ${hoursStuck}+ hours`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          console.error(`[check-stale] Email failed for case ${caseItem.id}:`, await emailResponse.text());
          continue;
        }

        // Mark as alerted
        await supabase
          .from("cases")
          .update({ stale_alert_sent: true })
          .eq("id", caseItem.id);

        console.log(`[check-stale] Alert sent for case ${caseItem.id} (${caseItem.name})`);
      } catch (caseError: unknown) {
        const msg = caseError instanceof Error ? caseError.message : "Unknown";
        console.error(`[check-stale] Error processing case ${caseItem.id}:`, msg);
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${staleCases.length} stale cases` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[check-stale] Fatal error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
