import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: "granted" | "revoked" | "expiry_warning";
  data: {
    tier?: string;
    expiresAt?: string;
    daysUntilExpiry?: number;
  };
}

const getTierDisplayName = (tier = "") => {
  const map: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
    monthly: "Monthly",
    yearly_plan: "Yearly",
  };
  return map[tier] || tier || "Free";
};

const getTierPageLimit = (tier = "") => {
  const map: Record<string, string> = {
    free: "50",
    starter: "500",
    professional: "2,000",
    enterprise: "10,000",
    monthly: "22,500",
    quarterly: "60,000",
    yearly_plan: "250,000",
  };
  return map[tier] || "50";
};

const baseStyles = `
body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #1f2937;
  margin: 0;
  padding: 0;
  background-color: #f9fafb;
}
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
.header {
  background: #ffffff;
  padding: 24px 30px;
  border: 1px solid #e5e7eb;
  border-bottom: none;
}
.content {
  background: #ffffff;
  padding: 30px;
  border: 1px solid #e5e7eb;
}
.section {
  background: #f9fafb;
  padding: 20px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
}
.label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}
.value {
  font-size: 14px;
  color: #111827;
  font-weight: 600;
}
.footer {
  background: #f3f4f6;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-top: none;
}
a {
  color: #2563eb;
  text-decoration: none;
}
`;

const renderLogo = () => `
<div style="font-size:22px;font-weight:700;">
  FinNavigator <span style="font-weight:400;">AI</span>
</div>
`;

const getEmailTemplate = (type: EmailRequest["type"], data: EmailRequest["data"]) => {
  const tierName = getTierDisplayName(data.tier);
  const pageLimit = getTierPageLimit(data.tier);
  const expiryDate = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";
  const year = new Date().getFullYear();

  switch (type) {
    case "granted":
      return {
        subject: `Welcome to FinNavigator! - Subscription Activated`,
        html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
<div class="container">

  <div class="header">
    ${renderLogo()}
    <p style="margin:6px 0 0;color:#6b7280;font-size:14px;">
      Subscription Notification
    </p>
  </div>

  <div class="content">
    <p>Your subscription has been successfully activated.</p>

    <div class="section">
      <div class="label">Plan</div>
      <div class="value">${tierName}</div>

      <div style="margin-top:12px;" class="label">Monthly Page Limit</div>
      <div class="value">${pageLimit} pages</div>

      <div style="margin-top:12px;" class="label">Valid Until</div>
      <div class="value">${expiryDate}</div>
    </div>

    <p>
      You may now access all features associated with your subscription.
    </p>

    <p>
      For assistance, contact
      <a href="mailto:hello@finnavigatorai.com">hello@finnavigatorai.com</a>
    </p>

    <p style="margin-top:30px;">
      Regards,<br><strong>FinNavigator AI Team</strong>
    </p>
  </div>

  <div class="footer">
    © ${year} FinNavigator AI. All rights reserved.
  </div>

</div>
</body>
</html>`,
      };

    case "revoked":
      return {
        subject: "Subscription Status Update",
        html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
<div class="container">

  <div class="header">
    ${renderLogo()}
    <p style="margin:6px 0 0;color:#6b7280;font-size:14px;">
      Account Update
    </p>
  </div>

  <div class="content">
    <p>
      Your subscription has been downgraded to the Free plan.
    </p>

    <div class="section">
      <div class="label">Current Plan</div>
      <div class="value">Free</div>
    </div>

    <p>
      If this appears incorrect, please contact
      <a href="mailto:hello@finnavigatorai.com">hello@finnavigatorai.com</a>
    </p>

    <p style="margin-top:30px;">
      Sincerely,<br><strong>FinNavigator AI Team</strong>
    </p>
  </div>

  <div class="footer">
    © ${year} FinNavigator AI. All rights reserved.
  </div>

</div>
</body>
</html>`,
      };

    case "expiry_warning":
      return {
        subject: `Subscription Expiry Notice – ${tierName}`,
        html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
<div class="container">

  <div class="header">
    ${renderLogo()}
    <p style="margin:6px 0 0;color:#6b7280;font-size:14px;">
      Subscription Reminder
    </p>
  </div>

  <div class="content">
    <p>
      Your <strong>${tierName}</strong> subscription is nearing expiry.
    </p>

    <div class="section">
      <div class="label">Expiry Date</div>
      <div class="value">${expiryDate}</div>

      <div style="margin-top:12px;" class="label">Days Remaining</div>
      <div class="value">${data.daysUntilExpiry ?? "—"} days</div>
    </div>

    <p>
      Please contact us for renewal to avoid service disruption.
    </p>

    <p>
      <a href="mailto:hello@finnavigatorai.com">hello@finnavigatorai.com</a>
    </p>

    <p style="margin-top:30px;">
      Regards,<br><strong>FinNavigator AI Team</strong>
    </p>
  </div>

  <div class="footer">
    © ${year} FinNavigator AI. All rights reserved.
  </div>

</div>
</body>
</html>`,
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { to, type, data }: EmailRequest = await req.json();
    const { subject, html } = getEmailTemplate(type, data);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FinNavigator AI <hello@finnavigatorai.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
