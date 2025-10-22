import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  name: string;
  email: string;
  organization?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, organization, message }: ContactFormData = await req.json();

    // Validate inputs
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required" }),
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

    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedOrganization = organization?.trim() || "Not specified";
    const sanitizedMessage = message.trim();
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "full",
      timeStyle: "long",
    });

    // Email 1: Send notification to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
              <p style="margin: 0;">FinNavigator AI - Contact Form System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmailResponse = await resend.emails.send({
      from: "FinNavigator <enquiry@finnavigatorai.com>",
      to: ["hello@finnavigatorai.com"],
      subject: `New Contact Form Submission - ${sanitizedName}`,
      html: adminEmailHtml,
      replyTo: sanitizedEmail,
    });

    console.log("Admin notification email sent:", adminEmailResponse);

    // Email 2: Send confirmation to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
                <p style="margin: 5px 0;"><strong>Organization:</strong> ${sanitizedOrganization}</p>
                <p style="margin: 5px 0;"><strong>Submitted:</strong> ${timestamp}</p>
              </div>
              <p>We appreciate your interest in FinNavigator AI and look forward to connecting with you.</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>The FinNavigator Team</strong></p>
            </div>
            <div class="footer">
              <p style="margin: 0;">FinNavigator AI - Advanced Financial Forensics Platform</p>
              <p style="margin: 5px 0;">This is an automated confirmation email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const userEmailResponse = await resend.emails.send({
      from: "FinNavigator <enquiry@finnavigatorai.com>",
      to: [sanitizedEmail],
      subject: "Thank you for contacting FinNavigator",
      html: userEmailHtml,
    });

    console.log("User confirmation email sent:", userEmailResponse);

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
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send emails" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
