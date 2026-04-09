import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://epqbupbzgtfpioinadgv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWJ1cGJ6Z3RmcGlvaW5hZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDY1OTksImV4cCI6MjA4NTkyMjU5OX0.Irz_OheIX6FJFSyuz8Gjb60teENux1KNkoZZvUgURME";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
