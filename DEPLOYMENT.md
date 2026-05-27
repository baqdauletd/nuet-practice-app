# NUET Practice App Deployment

## Local Checks
Run these before every deployment:

```bash
npm run lint
npm run build
```

If your default Node version is below Next.js 16 requirements, use Node 20 first:

```bash
source ~/.nvm/nvm.sh
nvm use 20.20.2
npm run lint
npm run build
```

## Required Environment Variables

```bash
NEXT_PUBLIC_INSFORGE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
INSFORGE_SERVICE_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_APP_NAME="NUET Practice App"
```

## Expected Storage Buckets
- `test-uploads`
- `solution-photos`

## Expected Database Tables
- `profiles`
- `test_uploads`
- `problems`
- `daily_sessions`
- `daily_session_problems`
- `submissions`

## Production Safety
- `/dev/setup-users` must remain unavailable in production.
- Do not put real secrets in `.env.example`.
- Keep `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `INSFORGE_SERVICE_KEY` server-only.

## Deploy With InsForge
This repo is already prepared for InsForge deployment. Use the project root as the source directory after local checks pass.

Typical flow:

```bash
source ~/.nvm/nvm.sh
nvm use 20.20.2
npm install
npm run lint
npm run build
```

Then deploy from the InsForge deployment flow using this project root:

```text
/home/bakd/my-projects/nuet-practice-app
```

If you use the InsForge deployment tool or dashboard, provide the production env vars above.

## Post-Deployment Checklist
1. Open `/login` on a phone.
2. Sign in as student and start a small daily session.
3. Solve one problem, upload a notebook photo, and save.
4. Confirm results stay locked until all problems are submitted.
5. Complete the session and generate AI feedback.
6. Sign in as instructor and confirm upload, extraction, and review still work.
7. Confirm `/dev/setup-users` shows `Not available in production.`
