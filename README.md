# Manchester City Yas Residences — Phase 2 Open Days RSVP

Invitation page for the Phase 2 launch of Manchester City Yas Residences by Ohana.
Open Days at the Ohana Sales Center, Abu Dhabi, **Sunday 11 – Friday 16 October 2026, 10 AM – 6 PM**.

- Production: `https://mancityrsvp.vercel.app/yas_residences_rsvp/`
- Public URL (proxied by the parent site): `https://www.blackoak-re.com/yas_residences_rsvp/`
- Per-agent link: append `?ref=<agent-slug>` (the agent's slug in Studio). The CRM
  resolves the slug and auto-assigns the lead; unknown slugs are ignored.

## How it works

- `public/invitation.html` + `public/app.js` — the whole page (static). Served at `/` by a
  rewrite in `next.config.ts`. No React pages.
- `app/api/invitation/route.ts` — form endpoint. Validates, posts the lead to the BlackOak
  CRM intake, and only when the CRM creates a **new** lead sends the Resend confirmation
  email with the `.ics` attached.
- `app/api/ics/route.ts` — `GET ?day=YYYY-MM-DD&slot=<id>` returns the calendar invite.
- `lib/event.ts` — event copy, days, time slots, unit options. Edit here; mirror any date
  or slot change in `invitation.html` and `app.js`.
- `lib/crm.ts`, `lib/email.ts`, `lib/ics.ts` — integrations.

Form fields: name, WhatsApp number, email, preferred day, preferred time
(10 AM – 12 PM / 12 PM – 4 PM / 4 PM – 6 PM), interested in, coming with.
After submit the guest sees a thank-you panel with an "Add to calendar" button. No brochure
download, no WhatsApp handoff.

## Abuse controls

Origin allowlist (`ALLOWED_ORIGINS`), per-IP rate limit (5/min, 20/h), 8 KB body cap,
honeypot field, minimum time-on-page, strict enums for every non-free-text field, strict
CSP and security headers (set in `next.config.ts`), email only after a CRM 201.

## Environment variables

| Variable | Notes |
|---|---|
| `BLACKOAK_CRM_URL` | `https://studio.blackoak-re.com/api/v1/public/intake/leads` |
| `BLACKOAK_CRM_TOKEN` | **New** lead-intake key for this campaign (Studio → Integrations → Lead intake keys). The CRM stamps the lead `source` from the key's label, so do not reuse another campaign's key. |
| `RESEND_API_KEY` | Resend API key (same account as Bayn; the domain is already verified). |
| `RESEND_FROM` | `Manchester City Yas Residences <invitation@blackoak-re.com>` |
| `ALLOWED_ORIGINS` | `https://www.blackoak-re.com,https://blackoak-re.com,https://mancityrsvp.vercel.app` (localhost is allowed automatically in dev) |
| `NEXT_PUBLIC_BASE_PATH` | `/yas_residences_rsvp` in Vercel Production and Preview. Blank locally. |

Copy `.env.local.example` to `.env.local` for local development.

## Local development

```
npm install
npm run dev          # http://localhost:3002/
npm run typecheck && npm run build
```

Quick checks:

```
curl -I http://localhost:3002/
curl 'http://localhost:3002/api/ics/?day=2026-10-12&slot=12-16'
curl -X POST http://localhost:3002/api/invitation/ -H 'Origin: http://localhost:3002' \
  -H 'content-type: application/json' \
  -d '{"name":"Test Guest","phone":"+971501234567","email":"you@example.com","day":"2026-10-12","slot":"12-16","interest":"3 BR Duplex","guests":"Just me","ref":"test-agent","website":"","elapsed":5000}'
```

The CRM dedupes the same phone number within 24 hours (returns 200 without creating a lead,
and no email is sent), so use a fresh number when testing twice.

## Deploy

1. Push to `main`; Vercel auto-deploys the `mancity_rsvp` project.
2. Set the env vars above in Vercel for Production and Preview.
3. Parent site (`blackoak-website`): the rewrites, CSP exclusion and middleware matcher for
   `yas_residences_rsvp` must be in place, otherwise the path is redirected to `/en/...`.

## Media

`assets/` (gitignored) holds the source teasers and brochures. `public/` holds the compressed
outputs: `teaser-landscape.mp4` / `teaser-portrait.mp4` (first 13.8 s of each teaser, before the
end card, with fades), `poster-*.webp`, and `masterplan.webp` (rendered from the masterplan PDF).
