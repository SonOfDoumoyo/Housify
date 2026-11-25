# Housify backend — in-place upgrade notes (2026-11-21, extended 2026-11-23, 2026-11-25)

Nimi's existing backend, upgraded in place. Same stack, same structure,
same routes — new features added alongside the old ones. Nothing was
rebuilt, no file was moved, no existing endpoint was renamed.

## 2026-11-25 additions

- **Publish gate simplified**: agents/landlords now only need a phone
  number in Settings before publishing. The verification selfie is
  optional — `POST /user/verification-photo` still stores it in R2 and
  sets it as the profile picture, but `missing_agent_requirements()`
  no longer lists it and the gate's 422 only ever names
  `phone_number`. No migration: no schema change.
- **Photo captions are editable**: `PATCH /list/images/{image_id}` with
  `{"captions": "..."}` renames one photo's caption. Owner or admin
  only (404 unknown photo, 403 another agent's photo). The existing
  `PATCH /list/update_listing_info` already covered title,
  description, location, address, price, currency and status with the
  same ownership rule, so agents can edit only their own listings.
  (`ImageCaptionUpdateModel` in `listing_schema.py`,
  `update_image_caption` in `listing_service.py`.)
- No other endpoint changed. Agents seeing only their own listings is
  enforced in the frontend (dashboard browse filters by `agent_id`);
  the API still returns every listing to any signed-in caller.

## What stayed exactly as it was

- FastAPI + SQLModel/SQLAlchemy 2.0 (async), Postgres via asyncpg.
- Redis token store/blocklist, Cloudflare R2 image storage (boto3),
  Authlib Google OAuth, APScheduler.
- Alembic migrations in `migrations/`; `SQLModel.metadata.create_all`
  still runs on startup for fresh databases.
- All existing endpoints, field names, cookie behaviour and the
  `/api/v1.0/` prefix are unchanged, except `PATCH /user/update_details`
  now returns the updated user instead of a message (see below).

## 2026-11-23 additions

- **Reviews** (`app/models/review_model.py`, `agent_reviews` table, one
  review per customer per agent): `POST /reviews` (customers only, 409
  on a second review), `PATCH /reviews/{id}` and `DELETE /reviews/{id}`
  (own review or admin), `GET /reviews/agent/{aid}` and
  `GET /reviews/agent/{aid}/summary`. The summary's public `rating` is
  the review average reduced by 0.5 (floored at 1.0) while the agent has
  a listing whose status has not been updated for over 30 days
  (`STALE_AFTER_DAYS` in `listing_service.py`); updating the status
  restores the rating. `listings.status_updated_at` tracks the last
  status change (backfilled from `uploaded_at`).
- **Atomic publish**: `POST /list/publish` (multipart: listing fields +
  photos + captions + videos). Files are validated and uploaded to R2
  first; the listing and media rows are then written in one
  transaction, so a failed publish stores nothing. The old
  `POST /list/post_listing` + `add_listing_images`/`add_listing_videos`
  flow still works, and the media endpoints now also accept adding
  photos/videos to an already existing listing by an admin.
- **Single-listing delete**: `DELETE /list/{lid}` (owner or admin, 204;
  photos/videos cascade). The old `DELETE /list/delete_listings`
  (delete all of mine) is untouched.
- **Agent readiness gate**: agents/landlords need a phone number and a
  verification photo before publishing. `POST /list/post_listing` and
  `POST /list/publish` return 422 naming what is missing. Admins exempt.
- **Verification photo**: `POST /user/verification-photo` (multipart
  image, agents/landlords/admin). Stored in Cloudflare R2 under
  `verification/`, and set as both `verification_photo_url` and
  `profile_image`, so customers see who they are dealing with.
- **Admin** (`app/api/v1/endpoints/admin.py`, prefix `/admin`):
  `GET /admin/users`, `DELETE /admin/users/{uid}` (not self, not
  another admin; removes their listings and reviews too),
  `GET /admin/listings`, `DELETE /admin/listings/{lid}`. Admin role
  still cannot be self-assigned.
- **Currency**: `listings.currency` (ISO code, default NGN) on create,
  read and update, so listings work in any region.
- **Walk/drive times removed**: listing creation and update no longer
  look up coordinates or call the travel-time service, so any location
  string works worldwide and publishing no longer fails without a
  travel-time API key. `walk_time`/`drive_time` columns are now
  nullable; old values are kept, new listings leave them empty. The
  old `house_by_walking_time` / `house_by_driving_time` query
  endpoints still exist for any existing callers. New addresses added
  through "Other" need no travel-time calculation.
- Migration `c9d4e2a71b05` (revises `b7c2e1a94f03`).

## What was added

- **Addresses** (`app/models/address_model.py`, `addresses` table):
  `GET /list/addresses` (public, seeded with the 10 Otuoke areas when
  empty) and `POST /list/addresses` (agent/landlord/admin, trims and
  dedupes case-insensitively, returns the existing row with 200).
  Agents adding an area through "Other" in the listing form append to
  this same table, so later forms see it.
- **View / contact counters** on listings: `views_count` and
  `contact_count` columns (default 0). `POST /list/{lid}/view` and
  `POST /list/{lid}/contact` increment them atomically and return the
  new count. Both are included in every listing response.
- **Video tours** (`listing_videos` table, mirroring `listing_images`):
  `POST /list/add_listing_videos?listing_id=` (agent-owned listings
  only). Accepts mp4/webm/mov, max 50 MB each, max 30 seconds —
  duration is checked server-side with ffprobe when it is installed
  (install `ffmpeg` on the server), otherwise the frontend's 30 s
  check applies. Videos are stored in the same R2 bucket/folder
  pattern as images and returned as `videos[]` on every listing.
- **Statuses**: `taken`, `paid_for`, `rented_out`, `coming_soon` added
  to the listing statuses. `PATCH /list/{lid}/status` (owner only,
  admin override) sets them; the legacy value `"coming soon"` is
  normalised to `coming_soon` on read/write.
- **Google role choice**: `GET /auth/login/google` now accepts
  `role=client|agent` and `flow=signup|signin` and carries them through
  the server session (never a client-readable cookie). A first-time
  Google user is created with the carried role and their Google
  profile photo; a returning user's role is never overwritten; a new
  user with no carried role is redirected to
  `{FRONTEND_URL}/complete-profile?needs_role=1`, otherwise to
  `{FRONTEND_URL}/dashboard` (no longer hardcoded to localhost:3000).
  New: `POST /auth/complete-profile` `{role}` saves the role, and
  `PATCH /user/update_details/{email}` accepts `{role}` (client/agent/
  landlord only; privileged roles are rejected with 403).
- `PATCH /user/update_details/{email}` now returns the updated user
  object (with listings) instead of `{"message": ...}` — the redesigned
  Settings page saves the response as the current user, and the old
  message shape corrupted it.
- `GET /health` → `{"status": "ok"}` for deployment health checks.

## Migration

New Alembic revision `b7c2e1a94f03` (revises `f7444a103445`) in
`migrations/versions/`: creates `addresses` + `listing_videos`, adds
the two counter columns with server default 0 (existing rows backfill
to 0), and seeds the 10 areas. Run on an existing database with:

```
alembic -c alembic.ini upgrade head
```

Fresh databases get the same schema from `create_all` on startup; the
addresses seed themselves on first read.

## Deployment notes (Oracle + Vercel)

- Postgres, Redis and (for video duration checks) `ffmpeg` must be
  installed on the server. R2, OpenRouteService and Google credentials
  come from `app/.env` (see `app/.env.example`).
- For cross-site cookies set `COOKIE_SECURE=true`,
  `COOKIE_SAMESITE=none` and `FRONTEND_URL` to the Vercel URL.
- `requirements.txt`: added `uvicorn` (the documented run command) and
  marked `win32_setctime` Windows-only so Linux installs don't break.

## What still needs nimi

- Google OAuth client ID/secret (redirect URI:
  `{API}/auth/google`), the Vercel URL + API domain for env vars, and
  SMTP details if verification/reset emails should send for real.
