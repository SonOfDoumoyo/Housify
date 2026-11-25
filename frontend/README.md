# Housify — Frontend (Next.js)

The redesigned Housify frontend. Next.js 15 (Pages Router) + React +
TypeScript. All data comes from the Housify API — there are no static or
demo listings anywhere in the app: when the database has no homes, the
landing page and Browse show a "No homes listed yet" message.

Housify is a **StreixCorp** product.

## Features

- Landing, Browse Homes (search, status filters, pagination), Property
  Details (gallery, video tour, walk/drive times)
- **Google sign-in with role**: pick Customer or Agent *before* the Google
  button enables; first-time Google users without a role land on
  `/complete-profile` to choose one
- **Dark / light mode**: sun/moon toggle in the nav and top bar, plus
  Settings → Appearance; saved on the device
- **Listing views & enquiries**: every listing shows its view count
  (one per browser session) and how many people have contacted the agent;
  WhatsApp and Call buttons record one contact each
- **Agent tools**: post a listing (photos + short **30-second video tours**),
  add a new area with **Other** (it appends to the shared address list),
  change a listing's status to Taken / Paid For / Rented Out from the
  dashboard or My Listings
- Customer & Agent dashboards, saved homes, Settings (profile, appearance,
  security, danger zone). There is no separate profile page — Settings is
  the single place. The workspace layout (sidebar + top bar) is fixed-width
  and persistent across pages.
- Browse Homes never logs the user out: the session is fetched on every
  route, and the public nav shows Dashboard + avatar while signed in

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # or just set NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
```

Environment:

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api/v1.0/` | Housify API base URL (trailing slash) |

The backend must be running — see `../housify-backend/` (FastAPI).

## Deploy — Vercel

1. Import this repo into Vercel (framework: Next.js, defaults are fine).
2. Environment variable:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://api.yourdomain.com/api/v1.0/` |

3. Deploy. The backend must allow the Vercel origin in `CORS_ORIGINS` and
   use `SECURE_COOKIES=true` + `COOKIE_SAMESITE=none` — see
   `../housify-backend/DEPLOYMENT.md`.

## Project layout

- `pages/_app.tsx` — app shell, theme provider
- `src/App.tsx` — client-side router (the Next.js page is a catch-all)
- `src/pages/` — landing, browse, details, auth, dashboard, listings, settings
- `src/components/` — nav, cards, role picker, Google button, theme toggle, avatar
- `src/lib/` — API helpers (auth, addresses, listing stats, saved homes)
- `src/contexts/` — user session, signup data, theme
- `src/index.css` — design system + dark mode
