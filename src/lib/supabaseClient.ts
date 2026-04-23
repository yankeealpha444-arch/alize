import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("URL:", SUPABASE_URL);
console.log("KEY PREFIX:", SUPABASE_KEY?.slice(0, 20));

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);