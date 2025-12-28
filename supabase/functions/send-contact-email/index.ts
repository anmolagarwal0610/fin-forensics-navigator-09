import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, organization, message }: ContactFormData = await req.json();

    // Validate inputs
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Name, email, phone number, and message are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate lengths
    if (name.trim().length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (message.trim().length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 2000 characters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (phone.trim().length > 20) {
      return new Response(
        JSON.stringify({ error: "Phone number must be less than 20 characters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const sanitizedName = escapeHtml(name.trim());
    const sanitizedEmail = escapeHtml(email.trim().toLowerCase());
    const sanitizedPhone = escapeHtml(phone.trim());
    const sanitizedOrganization = escapeHtml(organization?.trim() || "Not specified");
    const sanitizedMessage = escapeHtml(message.trim());
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }).replace("India Standard Time", "IST").replace("GMT+5:30", "IST");

    // Email 1: Send notification to admin
    const adminEmailHtml = `
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
            .field { margin-bottom: 20px; }
            .field-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
            .field-value { background: white; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; }
            .message-box { background: white; padding: 20px; border-radius: 4px; border: 1px solid #e5e7eb; white-space: pre-wrap; word-wrap: break-word; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
              <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="field-label">From:</div>
                <div class="field-value">${sanitizedName}</div>
              </div>
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value">${sanitizedEmail}</div>
              </div>
              <div class="field">
                <div class="field-label">Phone:</div>
                <div class="field-value">${sanitizedPhone}</div>
              </div>
              <div class="field">
                <div class="field-label">Organization:</div>
                <div class="field-value">${sanitizedOrganization}</div>
              </div>
              <div class="field">
                <div class="field-label">Message:</div>
                <div class="message-box">${sanitizedMessage}</div>
              </div>
              <div class="field">
                <div class="field-label">Submitted:</div>
                <div class="field-value">${timestamp}</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0 0 10px 0;">FinNavigator AI - Contact Form System</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} FinNavigator AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Email 2: Send confirmation to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .summary { background: #f9fafb; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
              <h1 style="margin: 0; font-size: 24px;">Thank You for Contacting FinNavigator</h1>
            </div>
            <div class="content">
              <p>Dear ${sanitizedName},</p>
              <p>Thank you for reaching out to FinNavigator AI. We have successfully received your inquiry and our team will review your message carefully.</p>
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our team will review your message within the next 24 hours</li>
                <li>A member of our team will respond directly to your email address</li>
                <li>For urgent matters, you can reach us directly at hello@finnavigatorai.com</li>
              </ul>
              <div class="summary">
                <p style="margin: 0 0 10px 0;"><strong>Summary of your submission:</strong></p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${sanitizedPhone}</p>
                <p style="margin: 5px 0;"><strong>Organization:</strong> ${sanitizedOrganization}</p>
                <p style="margin: 5px 0;"><strong>Submitted:</strong> ${timestamp}</p>
              </div>
              <p>We appreciate your interest in FinNavigator AI and look forward to connecting with you.</p>
              <div style="margin-top: 30px; text-align: left;">
                <p style="margin: 0;">Best regards,<br><strong>The FinNavigator Team</strong></p>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">FinNavigator AI - Advanced Financial Forensics Platform</p>
              <p style="margin: 5px 0;">This is an automated confirmation email. Please do not reply to this message.</p>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} FinNavigator AI. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "help@finnavigatorai.com",
        to: "hello@finnavigatorai.com",
        subject: `New Contact Form Submission from ${sanitizedName}`,
        html: adminEmailHtml,
      })
    });

    if (!adminEmailResponse.ok) {
      const errorText = await adminEmailResponse.text();
      throw new Error(`Failed to send admin email: ${errorText}`);
    }

    const adminEmailResult = await adminEmailResponse.json();
    console.log("Admin email sent:", adminEmailResult);

    const userEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "FinNavigator <enquiry@finnavigatorai.com>",
        to: [sanitizedEmail],
        subject: "Thank you for contacting FinNavigator",
        html: userEmailHtml,
      })
    });

    if (!userEmailResponse.ok) {
      const errorText = await userEmailResponse.text();
      throw new Error(`Failed to send user email: ${errorText}`);
    }

    const userEmailResult = await userEmailResponse.json();
    console.log("User confirmation email sent:", userEmailResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Emails sent successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send emails";
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
