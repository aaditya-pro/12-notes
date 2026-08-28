const SUPABASE_URL = "https://apfqxlriilkwzynozsvv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_AcwBiZcSMHrkfjV31JJK6A_r45OvAe4";

const SUPABASE_BUCKET = "addy-files";

// ⚠️ Replace with your real Cloudflare Turnstile Site Key
const TURNSTILE_SITE_KEY = "0x4AAAAAAA...YOUR_SITE_KEY_HERE...";

// Edge Function URL
const SUPABASE_FUNCTIONS_URL =
  "https://apfqxlriilkwzynozsvv.supabase.co/functions/v1";

if (!window.supabase) {
  throw new Error(
    "Supabase library has not loaded. Check the Supabase CDN script."
  );
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
