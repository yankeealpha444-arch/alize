

## Add Supabase Client Configuration

### What
Create a new file `src/lib/supabaseClient.ts` that initializes the Supabase client using public keys stored as constants.

### Steps

1. **Install dependency**: Add `@supabase/supabase-js` package.

2. **Create `src/lib/supabaseClient.ts`**:
   - Define two constants: `SUPABASE_URL` and `SUPABASE_ANON_KEY` with placeholder string values (`"PASTE_URL_HERE"` and `"PASTE_ANON_KEY_HERE"`).
   - Import `createClient` from `@supabase/supabase-js`.
   - Export a `supabase` client instance created with those constants.

### Notes
- No existing files will be modified.
- Since the Supabase URL and anon key are **public/publishable** keys, storing them directly in code is safe.
- You will need to replace the placeholder values with your actual Supabase project URL and anon key before using the client.

