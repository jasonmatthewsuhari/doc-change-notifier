# doc-change-notifier

Get an email the moment a Google Doc changes. Built because I was tired of refreshing.

## How it works

- Enter your email and confirm via a link
- A cron job fetches the doc every minute, hashes the content, and compares
- If it changed, all confirmed subscribers get an email with an unsubscribe link
- A live check log is shown on the page

## Stack

- Next.js (App Router)
- SQLite via `better-sqlite3`
- Resend for email
- Vercel Cron for polling

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in your values
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Your Resend API key |
| `FROM_EMAIL` | Verified sender address e.g. `notify@yourdomain.com` |
| `CRON_SECRET` | Random secret to protect the cron endpoint |
| `DOC_URL` | Full URL of the Google Doc to watch |
| `NEXT_PUBLIC_DOC_URL` | Same as above (exposed to client for the subscribe form) |
| `NEXT_PUBLIC_BASE_URL` | Your deployment URL e.g. `https://yourapp.vercel.app` |

## Deploy

Push to Vercel, set the env vars in the dashboard. The `vercel.json` cron config registers automatically and hits `/api/cron?secret=YOUR_CRON_SECRET` every minute.
