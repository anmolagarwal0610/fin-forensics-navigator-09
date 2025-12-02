import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_TOKEN_KEY = 'admin_session_token';
const SESSION_EXPIRY_KEY = 'admin_session_expiry';

interface VerificationResponse {
  success?: boolean;
  sessionToken?: string;
  expiresAt?: string;
  error?: string;
  attemptsRemaining?: number;
  locked?: boolean;
  lockedUntil?: string;
}

export function useAdminPasswordVerification() {
  const [isVerifying, setIsVerifying] = useState(false);

  const isSessionValid = (): boolean => {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    
    if (!token || !expiry) {
      return false;
    }

    return new Date(expiry) > new Date();
  };

  const setPassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-set-password', {
        body: { password },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      // After setting password, create a session automatically
      const verifyResponse = await verifyPassword(password);
      return verifyResponse;

    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPassword = async (password: string): Promise<{ success: boolean; error?: string; attemptsRemaining?: number; locked?: boolean; lockedUntil?: string }> => {
    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-verify-password', {
        body: { password },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = response.data as VerificationResponse;

      if (response.error || data.error) {
        return { 
          success: false, 
          error: data.error || response.error.message,
          attemptsRemaining: data.attemptsRemaining,
          locked: data.locked,
          lockedUntil: data.lockedUntil,
        };
      }

      if (data.sessionToken && data.expiresAt) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        sessionStorage.setItem(SESSION_EXPIRY_KEY, data.expiresAt);
      }

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setIsVerifying(false);
    }
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
  };

  return {
    isVerifying,
    isSessionValid,
    setPassword,
    verifyPassword,
    clearSession,
  };
}