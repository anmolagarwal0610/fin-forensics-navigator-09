
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

export const getNameInitials = (fullName?: string | null, email?: string | null) => {
  // Priority 1: Use full name if available
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      // First letter of first name + first letter of last name
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // Single name - use first 2 characters
    return parts[0].slice(0, 2).toUpperCase();
  }
  
  // Priority 2: Fall back to email
  if (email) {
    const name = email.split('@')[0] || 'u';
    return name.slice(0, 2).toUpperCase();
  }
  
  return 'U';
};
