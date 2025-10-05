# AI Growth Strategy — How to use this project

This repository contains a React + TypeScript frontend (Vite) and several Node scripts used for scraping ad creatives and downloading videos. This README explains how to run the project locally, how the UI triggers the scripts, how to run scripts manually, and general deployment and security guidance.

---

## Quick file overview

- `src/` — React source and UI
- `ads-scraper.js` — Node scraper script
- `download-videos.js` — Node script that downloads videos
- `public/ads-results.json` — scraper output (read by the frontend)
- `creatives/` — folder with downloaded videos
- `functions/` or `server/` — place for serverless functions or backend endpoints (optional)

---

## Requirements

- Node.js (recommended 18+)
- npm or yarn

---

## Local development

1. Install dependencies

```bash
npm install
```

2. Set local environment variables (optional)

Create a file called `.env.local` in the project root (make sure this file is in `.gitignore`). Example:

```env
# for local testing only
VITE_GEMINI_API_KEY=your_dev_key_if_needed
APIFY_TOKEN=your_apify_token
```

Note: Environment variables with the `VITE_` prefix are embedded in the client bundle. Do not use `VITE_` variables for production secrets.

3. Start the dev server

```bash
npm run dev
```

4. Open the app

Navigate to http://localhost:5173. Use the Competitors or Generate Content page to trigger scraping or generation.

---

## How UI triggers scraper/generation

- In development the UI posts to `/api/scrape`. A dev middleware or plugin can run the local scripts `ads-scraper.js` and `download-videos.js`. The scripts write results to `public/ads-results.json` and place downloaded videos in `creatives/`.
- In production you should implement a server-side endpoint (serverless function or full backend) that performs scraping/generation using server-side secrets and returns a result or task status to the client.

---

## Manual script usage

To run the scraping and downloading locally without the UI, run these commands:

1. Run the scraper (pass a URL if the script requires it):

```bash
node ads-scraper.js "https://www.example.com/ad-url"
```

The script should write results to `public/ads-results.json`.

2. Download videos from the results:

```bash
node download-videos.js
```

Downloaded files will be saved to `creatives/`.

---

## Deployment (general guidance)

- Build and host the frontend as a static site using your preferred host.
- Implement server-side endpoints (serverless functions or a separate backend) to handle any operation that needs secrets (e.g. calling APIs with API keys, invoking long-running jobs). Do not embed production secrets into the client bundle.
- For long-running tasks, use a background worker, a task queue, or an external job runner (for example: run a worker service, or use a platform that supports background jobs). Short-lived serverless functions may time out on long tasks.

---

## Security and Git

- Make sure `.env.local` and any files containing secrets are not committed. If you accidentally committed secrets, rotate the keys immediately.

Commands to remove a local env file from the repo and ignore it:

```bash
git rm --cached .env.local
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "Remove local env from repo and ignore it"
git push
```

If secrets were committed in previous commits and you need them removed from history, I can help with BFG or `git-filter-repo` instructions.

---

## Troubleshooting

- "Missing API key" errors (for example `GEMINI_API_KEY`):
  - In production add the required API key to your server environment variables (do not expose it to the client). In development you can temporarily use `VITE_GEMINI_API_KEY` in `.env.local` for quick tests.

- `public/ads-results.json` not updating:
  - Ensure `ads-scraper.js` is executing and writing the file. Check terminal logs where the script runs.

- Videos not appearing in `creatives/`:
  - Check write permissions for the folder and check logs from `download-videos.js`.

---

If you want, I can:
- add example `curl` requests for a server endpoint,
- provide scripts to test the pipeline locally, or
- prepare a short deployment checklist for a specific hosting provider — tell me which provider and I will prepare the steps.

---