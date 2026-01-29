
# Plan: Add IP Address Capture to Audit Logs

## Overview
The audit logging system is currently **NOT capturing IP addresses or user agents** for admin actions. This is a critical gap for production-grade security and compliance. This plan adds proper client identification to all admin audit logs.

## Current Gap Analysis

### What's Logged Now
```json
{
  "id": "c8d868e9-...",
  "admin_id": "0b477209-...",
  "target_user_id": "d922b151-...",
  "action": "add_bonus_pages",
  "details": { "pages_added": 25000 },
  "created_at": "2026-01-22T17:59:49Z"
}
```

### What Should Be Logged (Production-Grade)
```json
{
  "id": "c8d868e9-...",
  "admin_id": "0b477209-...",
  "target_user_id": "d922b151-...",
  "action": "add_bonus_pages",
  "details": { "pages_added": 25000 },
  "ip_address": "49.43.163.186",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "created_at": "2026-01-22T17:59:49Z"
}
```

---

## Implementation Steps

### Step 1: Database Migration

Add new columns and update the logging function:

```sql
-- Add IP address and user agent columns to audit_log
ALTER TABLE public.audit_log 
ADD COLUMN ip_address text,
ADD COLUMN user_agent text;

-- Update log_admin_action function to accept new parameters
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id uuid, 
  p_target_user_id uuid, 
  p_action text, 
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (admin_id, target_user_id, action, details, ip_address, user_agent)
  VALUES (p_admin_id, p_target_user_id, p_action, p_details, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  
  RAISE NOTICE 'Admin action logged: % by admin % on user % from IP %', 
    p_action, p_admin_id, p_target_user_id, p_ip_address;
  
  RETURN v_log_id;
END;
$$;
```

### Step 2: Create IP Extraction Helper

Add a utility function at the top of each edge function:

```typescript
function getClientIP(req: Request): string {
  // Try various headers in order of reliability
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first is the client
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  return 'unknown';
}
```

### Step 3: Update Edge Functions

Update all 4 admin edge functions to capture and log IP/user agent:

| File | Change |
|------|--------|
| `grant-subscription/index.ts` | Add IP extraction, update `log_admin_action` call |
| `revoke-subscription/index.ts` | Add IP extraction, update `log_admin_action` call |
| `add-bonus-pages/index.ts` | Add IP extraction, update `log_admin_action` call |
| `admin-delete-files/index.ts` | Add IP extraction, update `log_admin_action` call |

Example change for `grant-subscription`:

```typescript
// At the top of the function
const clientIP = getClientIP(req);
const userAgent = req.headers.get('user-agent') || 'unknown';

// Update the log call (line ~140)
await supabase.rpc("log_admin_action", {
  p_admin_id: user.id,
  p_target_user_id: userId,
  p_action: "grant_subscription",
  p_details: logDetails,
  p_ip_address: clientIP,
  p_user_agent: userAgent,
});
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| Database Migration | Schema + Function | Add columns and update `log_admin_action` |
| `supabase/functions/grant-subscription/index.ts` | Code | Add IP extraction and pass to log function |
| `supabase/functions/revoke-subscription/index.ts` | Code | Add IP extraction and pass to log function |
| `supabase/functions/add-bonus-pages/index.ts` | Code | Add IP extraction and pass to log function |
| `supabase/functions/admin-delete-files/index.ts` | Code | Add IP extraction and pass to log function |

---

## Security Considerations

1. **IP Spoofing Protection**: The `x-forwarded-for` header is set by the infrastructure (Supabase/Cloudflare), not the client, so it cannot be spoofed at the application level

2. **Data Retention**: IP addresses are PII - consider adding a retention policy or anonymization after a certain period

3. **Backward Compatibility**: New parameters have DEFAULT NULL, so existing logs continue to work

4. **No Breaking Changes**: All existing functionality remains intact

---

## Verification After Implementation

Query to verify IP capture is working:
```sql
SELECT action, ip_address, user_agent, created_at 
FROM audit_log 
WHERE ip_address IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Testing Checklist

1. Perform an admin action (e.g., add bonus pages to a user)
2. Query the `audit_log` table
3. Verify `ip_address` column contains a valid IP
4. Verify `user_agent` column contains browser information
5. Test from different devices/browsers to confirm different IPs are logged
