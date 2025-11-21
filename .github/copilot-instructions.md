<!-- .github/copilot-instructions.md -->
# Copilot / AI agent instructions for this repo

Short, actionable guidance so an AI coding agent can be productive immediately.

1. Big picture
- **Web app front-end:** Vite + Tailwind in the repo root (`package.json`, `vite.config.js`, `src/`, `input.css`). The UI entry is `src/main.js` and styles are built from `input.css`.
- **Serverless APIs:** `api/` contains serverless endpoints (e.g. `api/ask-ai.js`, `api/analyze.js`, `api/reset-password.js`). Some files use ESM (`export default`) and some use CommonJS (`module.exports`) — be careful when editing or moving code.
- **Cloud functions:** `functions/` contains Firebase Cloud Functions intended for Firebase deployment (e.g. `functions/index.js` implementing `hotmartWebhook`). These use CommonJS and `firebase-functions`/`firebase-admin`.
- **Landing & static assets:** `public/` and `ricoplus-landing-page/` contain landing content and static files.

2. Where to run and how (developer workflows)
- Local dev (front-end): `npm run dev` (starts Vite). Use `npm run build` to produce production assets.
- Preview build: `npm run preview`.
- Deploy (project uses Firebase hosting + functions): `npm run deploy` runs `vite build` then `firebase deploy`. There is also `npm run build-and-deploy`.
- Serverless endpoints (local testing): prefer Firebase Emulator for `functions/` and the `api/` folder endpoints; run `firebase emulators:start` where available and set required env vars locally (see section 4).

3. Environment & secrets (must-read)
- Required environment variables discovered in the code:
  - `GEMINI_API_KEY` — used by `api/ask-ai.js` and `api/analyze.js` for `@google/generative-ai`.
  - `FIREBASE_*` variables (e.g. `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc.) — used by `api/firebase-config.js` and client code.
  - `FIREBASE_SERVICE_ACCOUNT_KEY` — expected as a JSON string in `api/reset-password.js`.
- NOTE: `functions/index.js` currently contains hard-coded secrets (`HOTMART_TOKEN`, `HOSTINGER_EMAIL`, `HOSTINGER_PASSWORD`). Treat these as sensitive: rotate and move into environment variables or Secret Manager before any production deploy.

4. Integration patterns & gotchas
- Mixed module systems: several `api/*.js` files are ESM-style (use `import`/`export default`) while others and `functions/` use CommonJS (`require`/`module.exports`). When editing, maintain the module style or convert consistently and update build/runtime config.
- CORS: Most serverless endpoints set explicit CORS headers (e.g. `res.setHeader('Access-Control-Allow-Origin', ...)`). Keep these in mind when changing endpoints; front-end expects permissive CORS for some APIs.
- Firebase Admin usage: `functions/index.js` and `api/reset-password.js` use the Admin SDK. `reset-password.js` expects a `FIREBASE_SERVICE_ACCOUNT_KEY` JSON object — ensure the admin SDK is initialized once and with the correct credentials.
- Generative AI integration: `api/ask-ai.js` and `api/analyze.js` use `@google/generative-ai` client. Calls create model instances via `genAI.getGenerativeModel(...)` and call `generateContent`. Preserve prompt templates and ensure `GEMINI_API_KEY` is available in env for server processes.

5. Deployment config notes
- `vercel.json` exists but appears malformed (missing commas and a typo `blackdfriday2025.html`). Fix before relying on Vercel rewrites. The project appears to target Firebase Hosting (see `npm run deploy`) — confirm which platform you intend to use before changing hosting configs.

6. Files to check/review when working on a feature
- `package.json` — scripts and declared dependencies.
- `vite.config.js` and `tailwind.config.js` — front-end build behavior and tailwind plugin usage.
- `src/main.js` and `input.css` — UI entry and styles.
- `api/*.js` — serverless endpoints; watch for mixed ESM/CJS.
- `functions/index.js` — Firebase Cloud Function webhook logic and email sending.

7. Examples & quick edits
- To add a new serverless route that the front end will call: create `api/<name>.js` with the same module style as other `api/` files (prefer ESM if the file uses `export default`). Remember to set CORS headers and validate `req.method`.
- To test AI endpoints locally: run the server/emulator with `GEMINI_API_KEY` set. Example (macOS/zsh):
  ```bash
  export GEMINI_API_KEY="your_key_here"
  npm run dev
  # or run firebase emulators with env configured
  ```

8. Non-discoverable assumptions (ask the maintainer)
- Which hosting is canonical (Firebase Hosting vs Vercel)? The repo has both configs.
- Where are production secrets stored / how are they rotated?

If anything here is unclear or you want me to expand a section (for example, convert `api/` files to a single module system or fix `vercel.json`), tell me which items to prioritize and I will update the file accordingly.
