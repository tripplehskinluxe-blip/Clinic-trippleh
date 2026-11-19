CLINIC APP STARTER (owner sign-in with two-factor). Copy everything in this zip into the root of the EMPTY Clinic-trippleh repo.

1. In the repo folder (Git Bash):   npm install   then   npm test   (expect 1 test passing)
2. In Vercel > clinic project > Settings > Environment Variables (Production and Preview), add:
     NEXT_PUBLIC_SUPABASE_URL      = https://ecaatqeptsolcenjuvyt.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY = the "anon public" key (Supabase > Settings > API)
   NEVER add the "service_role" key here. It bypasses every rule we built.
3. Supabase > Authentication > Sign In / Providers: check that Multi-Factor (TOTP) is ON.
4. git add . && git commit -m "Clinic: owner sign-in with two-factor and security headers" && git push
   Vercel deploys automatically.
5. Open the deployed address, sign in as tripplehskinluxe@gmail.com, scan the code, then enter the 6-digit code.
   You should land on the Clinic page showing "Signed in as: owner".
