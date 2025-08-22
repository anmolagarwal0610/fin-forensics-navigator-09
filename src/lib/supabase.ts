
import { createClient } from "@supabase/supabase-js";

// Use the project's Supabase URL and anon key directly because import.meta.env is not supported in this environment.
const SUPABASE_URL = "https://rwzpffsaivgjuuthvkfa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enBmZnNhaXZnanV1dGh2a2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTU5NzMsImV4cCI6MjA3MTQzMTk3M30.6N8Iz52V5CtFv7USeuMBmc_Ar4XCMFHTY8tlarHidsk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
