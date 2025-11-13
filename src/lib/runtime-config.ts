import { supabase } from "@/integrations/supabase/client";

let cachedApiBase: string | null = null;
let fetchPromise: Promise<string> | null = null;

/**
 * Get the backend API URL from Supabase runtime config.
 * Results are cached to avoid repeated function calls.
 * Automatically retries on failure by clearing cache.
 */
export async function getBackendApiUrl(): Promise<string> {
  // Return cached value if available
  if (cachedApiBase) {
    console.log('📦 Using cached backend URL:', cachedApiBase);
    return cachedApiBase;
  }

  // If a fetch is already in progress, wait for it
  if (fetchPromise) {
    console.log('⏳ Waiting for in-progress config fetch...');
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = (async () => {
    try {
      console.log('🔄 Fetching backend URL from runtime-config...');
      
      const { data, error } = await supabase.functions.invoke('runtime-config', {
        method: 'GET',
      });

      if (error) {
        console.error('❌ Failed to fetch runtime config:', error);
        throw new Error(`Runtime config error: ${error.message}`);
      }

      if (!data || !data.apiBase) {
        console.error('❌ Runtime config missing apiBase:', data);
        throw new Error('Runtime config missing apiBase');
      }

      cachedApiBase = data.apiBase;
      console.log('✅ Backend URL loaded:', cachedApiBase);
      
      return cachedApiBase;
    } catch (error) {
      console.error('❌ Error fetching backend URL:', error);
      throw error;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Clear the cached backend URL.
 * Use this when you want to force a refresh (e.g., after an API failure).
 */
export function clearBackendUrlCache(): void {
  console.log('🔄 Clearing backend URL cache');
  cachedApiBase = null;
}

/**
 * Wrapper for backend API calls with automatic retry on failure.
 * If the call fails, it clears the cache and retries once.
 */
export async function withBackendRetry<T>(
  fn: (backendUrl: string) => Promise<T>
): Promise<T> {
  try {
    const url = await getBackendApiUrl();
    return await fn(url);
  } catch (error) {
    console.warn('⚠️ Backend call failed, clearing cache and retrying...', error);
    clearBackendUrlCache();
    const url = await getBackendApiUrl();
    return await fn(url);
  }
}
