
export const cleanupAuthState = () => {
  try {
    // Remove standard Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if any
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    // ignore
  }
};

export const getInitials = (email?: string | null) => {
  if (!email) return 'U';
  const name = email.split('@')[0] || 'u';
  return name.slice(0, 2).toUpperCase();
};
