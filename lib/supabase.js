// The browser client uses ONLY the public URL and the public anon key.
// It never holds the service key. Every database call runs as the signed-in person, and the database rules decide what they see.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('Spa app is not configured: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.');

export const supabase = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });

// Access counts only when the person has the clinic role AND has used two-factor (aal2). Anything else counts as signed out.
export async function clinicRoleNow() {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.currentLevel !== 'aal2') return null;
  const { data, error } = await supabase.rpc('clinic_role');
  if (error) return null;
  return data || null;
}
