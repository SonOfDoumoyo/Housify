# Housify backend fixes

This is a targeted repair of the supplied backend. The existing FastAPI/SQLModel architecture and existing route paths were retained. No database model columns were added or removed.

## Fixes

- Corrected the inverted `RoleChecker` authorization condition (unauthorized roles now receive HTTP 403).
- Added Next.js development origin support to CORS and made the configured frontend origin available through `FRONTEND_URL`.
- Made authentication cookies configurable for local and production deployment (`COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`). Removed the hard-coded `localhost` cookie domain.
- Fixed access/refresh token blocklist checks to use the JWT `jti`, and made missing Redis token records return an expired-token response instead of raising an attribute error.
- Corrected refresh token lifetime from 7 seconds to 7 days.
- Logout now removes both access and refresh token records and clears both cookies.
- Prevented public signup from assigning privileged/internal roles; admin creation is no longer tied to a hard-coded credential check.
- Removed password hashes from the current-user response schema and added a safe public agent response schema.
- Secured profile updates so the authenticated user can only update their own record; email, password hash and account status cannot be changed through this general profile endpoint.
- Made public listing browse/detail/location/time endpoints usable without login.
- Added `GET /api/v1.0/list/my_listings` for the authenticated agent/landlord's own listings.
- Implemented `PATCH /api/v1.0/list/update_listing_info?listing_id=<uuid>` with ownership checks and partial updates.
- Added listing ownership and image/caption count checks before image uploads.
- Added missing-listing 404 responses and corrected delete-empty-result handling.
- Recalculated walking/driving times when a listing location changes and handled invalid locations/routing failures cleanly.
- Implemented the previously empty listing-image retrieval service method.
- Normalized `requirements.txt` to UTF-8 so pip can read it.

## Setup

1. Create and activate a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`.
3. Copy `app/.env.example` to `app/.env` and fill in your own credentials.
4. Start PostgreSQL and Redis.
5. Run from the `backend` directory: `uvicorn app.main:app --reload`.

For production, set `COOKIE_SECURE=true`. If the frontend and API are on different sites, configure `COOKIE_SAMESITE=none` and an appropriate cookie domain. Keep `.env` out of Git and never share real credentials.

## Verification limits

All Python files passed `compileall` syntax compilation. Automated pytest coverage was not present in the supplied archive, and a runtime import/startup test could not run in this environment because the supplied environment did not have APScheduler installed. Database, Redis, SMTP, OAuth, Cloudflare R2 and OpenRouteService integrations still require credentials and live-service testing.
