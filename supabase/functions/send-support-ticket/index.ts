import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  ticketId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
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
      stage,
      ticketId: providedTicketId,
      attachments
    } = ticketData;

    // Use provided ticket ID or generate new one
    const ticketId = providedTicketId || `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const currentYear = new Date().getFullYear();

    // Format timestamp in IST
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }).replace("India Standard Time", "IST").replace("GMT+5:30", "IST");

    // Build email HTML with escaped user inputs
    const emailSubject = ticketType === 'auto' 
      ? `[AUTO-ALERT] ${escapeHtml(queryType)} - ${escapeHtml(caseName || 'Case Processing Failed')}`
      : `[Support Ticket] ${escapeHtml(queryType)} - ${escapeHtml(subject)}`;

    const emailHtml = ticketType === 'auto' ? `
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
            .section { margin-bottom: 25px; }
            .section-title { font-weight: 600; color: #374151; margin-bottom: 8px; border-bottom: 2px solid #667eea; padding-bottom: 4px; }
            .info-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-weight: 500; color: #6b7280; }
            .value { color: #1f2937; }
            .error-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
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
                  <a href="${escapeHtml(zipUrl)}" style="color: #667eea; word-break: break-all;">${escapeHtml(zipUrl)}</a><br>
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
                <p style="margin: 5px 0 0 0; font-weight: 500;">Automated Alert - FinNavigator System</p>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">This is an automated notification from FinNavigator AI</p>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">© ${currentYear} FinNavigator AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    ` : `
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
            .section { margin-bottom: 25px; }
            .section-title { font-weight: 600; color: #374151; margin-bottom: 8px; border-bottom: 2px solid #667eea; padding-bottom: 4px; }
            .info-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-weight: 500; color: #6b7280; }
            .value { color: #1f2937; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
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

              ${attachments && attachments.length > 0 ? `
              <div class="section">
                <div class="section-title">📎 ATTACHMENTS (${attachments.length})</div>
                ${attachments.map(att => `
                  <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e5e7eb;">
                    <div style="font-weight: 500; color: #374151; margin-bottom: 5px;">📄 ${escapeHtml(att.name)}</div>
                    <a href="${att.url}" style="color: #667eea; text-decoration: underline; font-size: 14px;" target="_blank">Download File</a>
                    <span style="color: #6b7280; font-size: 12px; margin-left: 10px;">(${formatFileSize(att.size)})</span>
                  </div>
                `).join('')}
                <p style="color: #6b7280; font-size: 12px; margin-top: 15px; margin-bottom: 0;">
                  ⏰ Download links expire in 7 days
                </p>
              </div>
              ` : ''}

              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
                <p style="margin: 5px 0;">Submitted: ${timestamp}</p>
                <p style="margin: 10px 0 0 0; font-weight: 500;">The FinNavigator Team</p>
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

    // Send email via direct API call
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "FinNavigator Support <hello@finnavigatorai.com>",
        to: ["hello@finnavigatorai.com"], 
        replyTo: userEmail,
        subject: emailSubject,
        html: emailHtml,
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send support email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('Error in send-support-ticket:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
