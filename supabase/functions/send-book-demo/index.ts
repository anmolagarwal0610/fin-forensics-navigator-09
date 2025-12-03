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

    // Email to user - confirmation
    const userEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">FinNavigator AI</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Intelligent Financial Document Analysis</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e3a5f; font-size: 22px; font-weight: 600;">Thank You for Your Interest, ${name}!</h2>
              
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                We've received your request for a personalized demo of FinNavigator AI. Our team is excited to show you how our platform can transform your financial document analysis workflow.
              </p>
              
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px; color: #1e3a5f; font-size: 16px; font-weight: 600;">Your Demo Request Details:</h3>
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
              
              <h3 style="margin: 25px 0 15px; color: #1e3a5f; font-size: 16px; font-weight: 600;">What Happens Next?</h3>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                <li>Our team will review your request within 24 hours</li>
                <li>We'll reach out to schedule a convenient time for your demo</li>
                <li>You'll receive a personalized walkthrough tailored to your needs</li>
              </ul>
              
              <p style="margin: 25px 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                In the meantime, if you have any questions, feel free to reply to this email or reach out to us directly.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Best regards,</p>
              <p style="margin: 0 0 20px; color: #1e3a5f; font-size: 16px; font-weight: 600;">The FinNavigator AI Team</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} FinNavigator AI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">🎯 New Demo Request</h1>
              <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">FinNavigator AI Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
                A new demo request has been submitted through the website. Please follow up within 24 hours.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 25px; margin: 0 0 25px;">
                <h3 style="margin: 0 0 20px; color: #166534; font-size: 18px; font-weight: 600;">Contact Details</h3>
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
                      <a href="mailto:${email}" style="color: #2563eb; font-size: 15px; font-weight: 500; text-decoration: none;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Phone:</td>
                    <td style="padding: 10px 0;">
                      <a href="tel:${phone}" style="color: #2563eb; font-size: 15px; font-weight: 500; text-decoration: none;">${phone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Submitted:</td>
                    <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⏰ Action Required:</strong> Please reach out to schedule the demo within 24 hours.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated notification from FinNavigator AI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

  } catch (error) {
    console.error('Error in send-book-demo:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process demo request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
