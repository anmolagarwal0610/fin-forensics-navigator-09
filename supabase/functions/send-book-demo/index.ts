const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemoRequest {
  name: string;
  organization: string;
  email: string;
  phone: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, organization, email, phone }: DemoRequest = await req.json();

    if (!name || !organization || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing demo request from ${name} (${email})`);

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }).replace("India Standard Time", "IST").replace("GMT+5:30", "IST");

    // Email to user - confirmation
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
    .details-box { background: #f9fafb; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
      <h1 style="margin: 0; font-size: 24px;">Thank You for Your Interest!</h1>
      <p style="margin: 10px 0 0; opacity: 0.9; font-size: 14px;">Intelligent Financial Document Analysis</p>
    </div>
    
    <div class="content">
      <p>Dear ${name},</p>
      
      <p>We've received your request for a personalized demo of FinNavigator AI. Our team is excited to show you how our platform can transform your financial document analysis workflow.</p>
      
      <div class="details-box">
        <p style="margin: 0 0 15px 0;"><strong>Your Demo Request Details:</strong></p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Name:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organization:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${organization}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${phone}</td>
          </tr>
        </table>
      </div>
      
      <p><strong>What Happens Next?</strong></p>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #475569; font-size: 15px; line-height: 1.8;">
        <li>Our team will review your request within 24 hours</li>
        <li>We'll reach out to schedule a convenient time for your demo</li>
        <li>You'll receive a personalized walkthrough tailored to your needs</li>
      </ul>
      
      <p style="margin: 25px 0 0;">In the meantime, if you have any questions, feel free to reply to this email or reach out to us directly.</p>
      
      <div style="margin-top: 30px; text-align: left;">
        <p style="margin: 0;">Best regards,<br><strong>The FinNavigator Team</strong></p>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">Need help? Contact us at <a href="mailto:hello@finnavigatorai.com" style="color: #667eea; text-decoration: none;">hello@finnavigatorai.com</a></p>
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} FinNavigator AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Email to admin - notification
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
    .details-box { background: white; padding: 25px; border-radius: 8px; margin: 0 0 25px; border: 1px solid #e5e7eb; }
    .action-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px 20px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://finnavigatorai.com/logo.png" alt="FinNavigator Logo" style="width: 162px; height: 71px; margin-bottom: 15px;" />
      <h1 style="margin: 0; font-size: 24px;">🎯 New Demo Request</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">FinNavigator AI Platform</p>
    </div>
    
    <div class="content">
      <p style="margin: 0 0 25px; color: #475569; font-size: 16px;">A new demo request has been submitted through the website. Please follow up within 24 hours.</p>
      
      <div class="details-box">
        <h3 style="margin: 0 0 20px; color: #374151; font-size: 18px; font-weight: 600;">Contact Details</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; width: 120px; vertical-align: top;">Full Name:</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Organization:</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${organization}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Email:</td>
            <td style="padding: 10px 0;">
              <a href="mailto:${email}" style="color: #667eea; font-size: 15px; font-weight: 500; text-decoration: none;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Phone:</td>
            <td style="padding: 10px 0;">
              <a href="tel:${phone}" style="color: #667eea; font-size: 15px; font-weight: 500; text-decoration: none;">${phone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Submitted:</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${timestamp}</td>
          </tr>
        </table>
      </div>
      
      <div class="action-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⏰ Action Required:</strong> Please reach out to schedule the demo within 24 hours.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This is an automated notification from FinNavigator AI</p>
      <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} FinNavigator AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email to user
    const userEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FinNavigator AI <hello@finnavigatorai.com>',
        to: [email],
        subject: 'Your Demo Request Has Been Received - FinNavigator AI',
        html: userEmailHtml,
      }),
    });

    if (!userEmailResponse.ok) {
      const errorData = await userEmailResponse.text();
      console.error('Failed to send user email:', errorData);
      throw new Error('Failed to send confirmation email');
    }

    console.log('User confirmation email sent successfully');

    // Send email to admin
    const adminEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FinNavigator AI <hello@finnavigatorai.com>',
        to: ['hello@finnavigatorai.com'],
        subject: `New Demo Request: ${name} from ${organization}`,
        html: adminEmailHtml,
      }),
    });

    if (!adminEmailResponse.ok) {
      const errorData = await adminEmailResponse.text();
      console.error('Failed to send admin email:', errorData);
      // Don't throw - user email was sent successfully
    } else {
      console.log('Admin notification email sent successfully');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Demo request submitted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process demo request';
    console.error('Error in send-book-demo:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
