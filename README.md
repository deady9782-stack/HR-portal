# Civic Operations Personnel CAD

A Next.js prototype and Discord bot starter for a roleplay community's staff applications, roster, and shift timekeeping. The portal uses in-memory demo data; the bot supports `/portal` and `/apply`, forwarding application answers to a configured Discord review channel.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` in a browser. To check a production build, run `npm run build` and then `npm start`.

## Start the Discord bot

Copy `.env.example` to `.env.local` and set `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `APPLICATION_REVIEW_CHANNEL_ID`, and `PORTAL_URL`. `DISCORD_GUILD_ID` is optional and registers commands to one development server; without it, commands are registered globally. The bot command loads `.env.local` using Node's built-in env-file support. Start the portal with `npm run dev`, then start the bot in a second terminal with `npm run bot:dev`.

## Current prototype

- CAD-style personnel overview, department roster, applications, and activity review
- Signature-required clock in/out controls with device-local timestamps
- Department application intake with guided interview prompts
- Signup role choice for Employee, FTO staff, or HR staff; FTO/HR access requests require administrator review
- Discord `/portal` and `/apply` commands; `/apply` collects applicant details in a modal and sends them to the configured review channel
- Example rank ladders and 2-hour promotion eligibility indicator
- Review-first activity and end-of-shift note workflow

Role choices and access requests are session-local prototype data. They do not create authenticated accounts or grant HR/FTO permissions.

## Before production

Add a database, secure account registration and password hashing, role-based authorization, signed/audited personnel actions, Discord OAuth, and Roblox identity/avatar integration. The Gemini SDK dependency and `GEMINI_API_KEY` placeholder are present, but the bot does not call Gemini or run AI interviews yet. The bot currently forwards applications only; it does not authenticate portal accounts, send acceptance letters, or sync Roblox identities. Do not treat browser-provided timestamps, signatures, or locally stored profile details as verified identity or attendance evidence. Require an authorized human to approve interview decisions, strikes, demotions, and terminations. Configure secrets only in environment variables; never commit tokens.
