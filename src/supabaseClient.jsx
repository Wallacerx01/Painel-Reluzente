import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://obcjoccntxulnbsdhehk.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iY2pvY2NudHh1bG5ic2RoZWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNTAxOTQsImV4cCI6MjA3MTcyNjE5NH0.eZRu8colIYu925tZEp9p__5GgJS14T1qsbqt3mjTjIQ";

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
