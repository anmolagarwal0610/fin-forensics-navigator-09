import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS attacks
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

interface SupportTicketRequest {
  ticketType: 'manual' | 'auto';
  queryType: string;
  subject: string;
  description: string;
  userEmail: string;
  userId: string;
  organizationName?: string;
  caseId?: string;
  caseName?: string;
  zipUrl?: string;
  errorDetails?: string;
  stage?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ticketData: SupportTicketRequest = await req.json();
    console.log('Support ticket request:', { ...ticketData, description: '...' });

    const {
      ticketType,
      queryType,
      subject,
      description,
      userEmail,
      userId,
      organizationName,
      caseId,
      caseName,
      zipUrl,
      errorDetails,
      stage
    } = ticketData;

    // Generate ticket ID
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Format timestamp in IST
    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "long",
      timeStyle: "long"
    }).replace("India Standard Time", "IST");

    // Build email HTML with escaped user inputs
    const emailSubject = ticketType === 'auto' 
      ? `[AUTO-ALERT] ${escapeHtml(queryType)} - ${escapeHtml(caseName || 'Case Processing Failed')}`
      : `[Support Ticket] ${escapeHtml(queryType)} - ${escapeHtml(subject)}`;

    const emailHtml = ticketType === 'auto' ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: 600; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
            .info-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-weight: 500; color: #6b7280; }
            .value { color: #1f2937; }
            .error-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .logo { width: 100px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">⚠️ AUTOMATIC SUPPORT TICKET</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Backend Failure Detected</p>
            </div>
            
            <div class="content">
              <div class="section">
                <div class="section-title">TICKET INFORMATION</div>
                <div class="info-row"><span class="label">Ticket ID:</span> <strong>${escapeHtml(ticketId)}</strong></div>
                <div class="info-row"><span class="label">Type:</span> <strong>Automatic Alert</strong></div>
                <div class="info-row"><span class="label">Category:</span> <strong>${escapeHtml(queryType)}</strong></div>
                <div class="info-row"><span class="label">Stage:</span> <strong>${escapeHtml(stage || 'Unknown')}</strong></div>
              </div>

              <div class="section">
                <div class="section-title">USER INFORMATION</div>
                <div class="info-row"><span class="label">Email:</span> ${escapeHtml(userEmail)}</div>
                ${organizationName ? `<div class="info-row"><span class="label">Organization:</span> ${escapeHtml(organizationName)}</div>` : ''}
                <div class="info-row"><span class="label">User ID:</span> <code>${escapeHtml(userId)}</code></div>
              </div>

              ${caseId ? `
              <div class="section">
                <div class="section-title">CASE INFORMATION</div>
                <div class="info-row"><span class="label">Case Name:</span> <strong>${escapeHtml(caseName || 'N/A')}</strong></div>
                <div class="info-row"><span class="label">Case ID:</span> <code>${escapeHtml(caseId)}</code></div>
              </div>
              ` : ''}

              ${zipUrl ? `
              <div class="section">
                <div class="section-title">FILES SUBMITTED</div>
                <div class="info-row">
                  <span class="label">ZIP Download:</span><br>
                  <a href="${escapeHtml(zipUrl)}" style="color: #3b82f6; word-break: break-all;">${escapeHtml(zipUrl)}</a><br>
                  <small style="color: #6b7280;">Link valid for 1 hour</small>
                </div>
              </div>
              ` : ''}

              ${errorDetails ? `
              <div class="section">
                <div class="section-title">ERROR DETAILS</div>
                <div class="error-box">
                  <pre style="white-space: pre-wrap; margin: 0; font-size: 13px;">${escapeHtml(errorDetails)}</pre>
                </div>
              </div>
              ` : ''}

              <div class="section">
                <div class="section-title">DESCRIPTION</div>
                <p style="margin: 10px 0; white-space: pre-wrap;">${escapeHtml(description)}</p>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
                <p style="margin: 5px 0;">Detected: ${timestamp}</p>
                <p style="margin: 5px 0; font-size: 12px;">Automated Alert - FinNavigator System</p>
                <img src="https://raw.githubusercontent.com/finnavigatorai/finnavigator/main/public/logo.png" alt="FinNavigator" class="logo">
                <p style="margin: 10px 0 0 0; font-weight: 500;">The FinNavigator Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: 600; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
            .info-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-weight: 500; color: #6b7280; }
            .value { color: #1f2937; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .logo { width: 100px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">📋 SUPPORT TICKET</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Manual Submission</p>
            </div>
            
            <div class="content">
              <div class="section">
                <div class="section-title">TICKET INFORMATION</div>
                <div class="info-row"><span class="label">Ticket ID:</span> <strong>${escapeHtml(ticketId)}</strong></div>
                <div class="info-row"><span class="label">Type:</span> <strong>Manual</strong></div>
                <div class="info-row"><span class="label">Category:</span> <strong>${escapeHtml(queryType)}</strong></div>
                <div class="info-row"><span class="label">Subject:</span> <strong>${escapeHtml(subject)}</strong></div>
              </div>

              <div class="section">
                <div class="section-title">USER INFORMATION</div>
                <div class="info-row"><span class="label">Email:</span> ${escapeHtml(userEmail)}</div>
                ${organizationName ? `<div class="info-row"><span class="label">Organization:</span> ${escapeHtml(organizationName)}</div>` : ''}
                <div class="info-row"><span class="label">User ID:</span> <code>${escapeHtml(userId)}</code></div>
              </div>

              ${caseId ? `
              <div class="section">
                <div class="section-title">CASE REFERENCE</div>
                <div class="info-row"><span class="label">Case Name:</span> <strong>${escapeHtml(caseName || 'N/A')}</strong></div>
                <div class="info-row"><span class="label">Case ID:</span> <code>${escapeHtml(caseId)}</code></div>
              </div>
              ` : ''}

              <div class="section">
                <div class="section-title">DESCRIPTION</div>
                <p style="margin: 10px 0; white-space: pre-wrap;">${escapeHtml(description)}</p>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
                <p style="margin: 5px 0;">Submitted: ${timestamp}</p>
                <img src="https://raw.githubusercontent.com/finnavigatorai/finnavigator/main/public/logo.png" alt="FinNavigator" class="logo">
                <p style="margin: 10px 0 0 0; font-weight: 500;">The FinNavigator Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "FinNavigator Support <hello@finnavigatorai.com>",
      to: [hello@finnavigatorai.com], 
      replyTo: userEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log('Support ticket email sent:', ticketId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticketId,
        message: ticketType === 'auto' 
          ? 'Automatic support ticket sent to team'
          : 'Support ticket submitted successfully. We\'ll respond within 24 hours.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('Error in send-support-ticket:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
