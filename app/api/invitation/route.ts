import { NextResponse } from "next/server";
import { z } from "zod";
import { postInvitationLead } from "@/lib/crm";
import { sendInvitationConfirmation } from "@/lib/email";
import { buildIcs } from "@/lib/ics";
import { DAY_ISOS, GUEST_OPTIONS, INTEREST_OPTIONS, SLOT_IDS } from "@/lib/event";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const MIN_TIME_ON_PAGE_MS = 3000;

const NO_STORE = { "Cache-Control": "no-store" };

const LeadSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => {
      if (/[a-zA-Z]/.test(v)) return false;
      const digits = v.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Please enter a valid phone number"),
  email: z.string().trim().max(200).email("Please enter a valid email address"),
  day: z.enum(DAY_ISOS, { message: "Please pick a visit day" }),
  slot: z.enum(SLOT_IDS, { message: "Please pick a time" }),
  interest: z.enum(INTEREST_OPTIONS, { message: "Please pick what you are interested in" }),
  guests: z.enum(GUEST_OPTIONS, { message: "Please tell us who is coming" }),
  // Agent-referral slug from the CTA URL (`?ref=<agent-slug>`). Optional;
  // the CRM silent-ignores anything it can't resolve.
  ref: z.string().trim().max(120).regex(/^[a-z0-9-]*$/i, "Invalid ref format").optional().default(""),
  // Honeypot — real browsers never fill this.
  website: z.string().max(500).optional().default(""),
  // Milliseconds between page load and submit, reported by the page script.
  elapsed: z.number().int().nonnegative().optional(),
});

/* ---------- abuse controls ---------- */

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Per-instance sliding window. Leaky across serverless instances, which is
// acceptable as a first line; the CRM has its own 60/min limiter behind it.
const hits = new Map<string, number[]>();
const WINDOW_MIN = 60_000;
const WINDOW_HOUR = 3_600_000;
const LIMIT_MIN = 5;
const LIMIT_HOUR = 20;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_HOUR);
  const lastMinute = list.filter((t) => now - t < WINDOW_MIN).length;
  if (lastMinute >= LIMIT_MIN || list.length >= LIMIT_HOUR) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) {
    // Opportunistic cleanup so the map cannot grow without bound.
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_HOUR)) hits.delete(k);
  }
  return false;
}

function allowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS ?? "";
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3002");
    set.add("http://127.0.0.1:3002");
  }
  return set;
}

function originAllowed(req: Request): boolean {
  const allowed = allowedOrigins();
  if (allowed.size === 0) return true; // not configured — fail open rather than block real guests
  const origin = req.headers.get("origin");
  if (origin) return allowed.has(origin.toLowerCase());
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin.toLowerCase());
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * POST /api/invitation
 *
 * Handles the RSVP form on public/invitation.html:
 *   1. Abuse controls: body size, origin allowlist, per-IP rate limit.
 *   2. Validate the payload (strict enums for every non-free-text field).
 *   3. Honeypot / time-on-page: bots get a silent 200.
 *   4. Post the lead to the BlackOak CRM.
 *   5. Only if the CRM created a NEW lead, send the confirmation email
 *      with the calendar invite attached. This keeps the endpoint from being
 *      usable as an email cannon: duplicates are deduped by the CRM.
 */
export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413, headers: NO_STORE });
  }
  if (!originAllowed(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_STORE });
  }
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests, please try again in a minute" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": "60" } }
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400, headers: NO_STORE });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422, headers: NO_STORE }
    );
  }
  const lead = parsed.data;

  // Silent accept for bots: honeypot filled, or submitted faster than a human could.
  if (lead.website !== "" || lead.elapsed === undefined || lead.elapsed < MIN_TIME_ON_PAGE_MS) {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const crm = await postInvitationLead(lead);
  if (!crm.ok) {
    console.error(`[invitation] CRM did not accept lead: status=${crm.status}`);
  } else if (crm.status === 201 && crm.id !== undefined) {
    const ics = buildIcs({ dayIso: lead.day, slotId: lead.slot, email: lead.email, ref: lead.ref });
    const emailResult = await sendInvitationConfirmation(lead, ics);
    if (!emailResult.ok) {
      console.error(`[invitation] Email not sent for lead ${crm.id}: ${emailResult.error ?? "unknown"}`);
    }
  } else {
    // 200 without an id = CRM dedupe (same phone within 24h). No second email.
    console.info(`[invitation] CRM accepted without creating a lead (status=${crm.status})`);
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
