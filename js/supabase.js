import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ifeufriwvgrzmdhpxjki.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXVmcml3dmdyem1kaHB4amtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDg5ODIsImV4cCI6MjA4NjcyNDk4Mn0.aWWgzM2ZnISmn-lhWc5jC0iqF7mszEjmgCYK05LHykg";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
