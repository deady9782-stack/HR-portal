# Civic Operations Personnel Portal

A Discord-authenticated personnel portal for a Roblox roleplay community. Applicants can register with Discord, submit and track applications, and access shift records after staff approval. HR access is separately provisioned and protected by Firebase custom claims and Firestore rules.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Configure the Firebase and Discord environment variables below, then open `http://localhost:3000`. To check a production build, run `npm.cmd run build` and then `npm.cmd start`.

## Configure portal authentication and data

1. Create a Firebase project, add a Web app, initialize Firebase Authentication, and create a Cloud Firestore database.
2. Copy the Firebase Web app values into the `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local` and Railway.
3. Create a Discord OAuth application. Add `http://localhost:3000/api/auth/discord/callback` and `https://hr-portal-production-d9ca.up.railway.app/api/auth/discord/callback` as OAuth2 redirect URLs. Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and the exact `DISCORD_REDIRECT_URI` for each environment.
4. Set `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY` for the server. Store the service-account key only in local environment variables or Railway secrets; never commit it. The private key's newlines may be represented as `\n`.
5. Deploy the database rules before using the portal:

   ```powershell
   npx.cmd firebase-tools deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
   ```

6. Add the Railway domain to Firebase Authentication's authorized domains. On Railway, configure the same environment variables as production values, including the public Firebase Web app settings and production Discord redirect URI.
7. Register your own Discord account once, find its Firebase Auth UID, then grant the first HR administrator claim from a trusted machine with the Firebase Admin credentials configured:

   ```powershell
   npm.cmd run admin:grant -- YOUR_FIREBASE_AUTH_UID
   ```

   Sign out and sign in again after changing claims. Public signup can never grant HR/admin access. Grant administrator access only to trusted reviewers.

Discord sign-in requests the `identify` scope only; the portal does not request email or date of birth and does not impose an 18+ check. Users must meet Discord's minimum age requirements for their region and follow the community's rules. Discord authentication confirms control of a Discord account; it does not independently verify a real-world identity or age.

## Portal workflow

- Discord OAuth sign-in and account creation; no email address or 18+ requirement is collected by the portal
- Applications stored in Firestore with applicant-only access and reviewer-controlled decisions
- HR approval activates an applicant's personnel account; HR permissions are not self-selectable
- HR reviewers have a live applicant queue, active personnel directory, and recent shift report
- Active staff can start/end shifts and submit handoff notes; shift records are protected by Firestore rules
- Discord `/portal` links to the portal, while `/apply` remains an optional Discord application intake to the configured review channel

This is a roleplay personnel workflow, not a real-world identity, employment, or attendance verification service. Discord OAuth verifies access to a Discord account only. Review all applications and personnel actions manually, and configure secrets only in environment variables.

## Discord bot

Copy `.env.example` to `.env.local` and set `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `APPLICATION_REVIEW_CHANNEL_ID`, and `PORTAL_URL` to run the optional bot. `DISCORD_GUILD_ID` registers commands to one development server. The bot loads `.env.local` with Node's built-in env-file support; use `npm.cmd run bot:dev` in a second terminal.
