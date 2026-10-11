---
name: verify
description: How to run and drive the Yas Residences RSVP page (static invitation.html in Next.js) to verify a change at its surface.
---

# Verify the RSVP page

Surface: the browser (public/invitation.html + public/app.js) and two API routes.

## Run

```
npm run dev                      # http://localhost:3002/  (check `lsof -i :3002` first; it is often already up)
curl -I http://localhost:3002/   # 200, CSP header present
```

Production: `https://www.blackoak-re.com/yas_residences_rsvp/` (proxied) and
`https://mancityrsvp.vercel.app/yas_residences_rsvp/`. Deploy state: `vercel ls`.

## Drive

- Splash → RSVP football (`#rsvp`) → kick animation → `#inv.on` sheet slides up.
  State check: `.disc-wrap.kicked`, `#inv.on`, `#sea.gone`, `#rsvp` opacity 0.
- Form `#form` → POST `api/invitation/` → `#confirm.on` thank-you panel with `#ics` link.
- `GET api/ics/?day=2026-10-12&slot=12-16` → VCALENDAR with DTSTART 20261012T080000Z.
- Submit test body (see README). Honeypot `website:"x"` or `elapsed<3000` → `{ok:true}` and nothing sent.

Inspect an animation frame deterministically: click, then
`document.getAnimations().filter(a=>a.animationName==='kick').forEach(a=>{a.pause();a.currentTime=480})`.

## Gotchas

- Chrome drops pointer events on a hidden/occluded tab (`document.visibilityState==='hidden'`):
  physical clicks silently do nothing and the video never loads. Check visibility first; a
  keyboard `Tab`+`Enter` or `el.click()` still works.
- `resize_window` does not change the viewport of the current tab; a NEW tab inherits the
  resized window (got a 500x701 portrait viewport that way).
- Production POSTs: `vercel logs --since 30m --expand --query invitation`. The API logs only
  failures; a silent POST = CRM 201 + email sent. "CRM accepted without creating a lead
  (status=200)" = the CRM's 24h phone dedupe, so use a fresh phone per real test.
- A real submission creates a production CRM lead and emails the address given.
