/**
 * Posts to BlackOak's internal CRM intake at
 * studio.blackoak-re.com/api/v1/public/intake/leads.
 *
 * The intake whitelists: name, phone, email, note, requirements, propertyType,
 * propertyCategory, preferredLocations, leadType, budget, ref, website.
 * `source` is NOT accepted — the CRM stamps it from the intake key's label,
 * which is why this campaign needs its own key.
 */

import { EVENT_NAME, VENUE, VENUE_CITY, DATES_TEXT, dayLabel, slotLabel, propertyCategory } from "./event";

interface CrmPayload {
  name: string;
  phone: string;
  email: string;
  requirements: string;
  propertyType: string;
  propertyCategory?: string;
  preferredLocations: string;
  ref?: string;
  website: string; // honeypot — must be empty
}

export interface CrmResult {
  ok: boolean;
  status: number;
  /** Lead id when the CRM created a new lead (201). Absent on dedupe/honeypot 200s. */
  id?: string | number;
}

async function postToCrm(payload: CrmPayload): Promise<CrmResult> {
  const url = process.env.BLACKOAK_CRM_URL;
  const token = process.env.BLACKOAK_CRM_TOKEN;

  if (!url) {
    console.warn("[crm] BLACKOAK_CRM_URL not set — skipping CRM post");
    return { ok: false, status: 0 };
  }
  if (!token) {
    console.warn("[crm] BLACKOAK_CRM_TOKEN not set — skipping CRM post");
    return { ok: false, status: 0 };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      // Status only — never echo the request body (PII) into logs.
      console.error(`[crm] non-2xx ${res.status}: ${text.slice(0, 300)}`);
      return { ok: false, status: res.status };
    }
    let id: string | number | undefined;
    try {
      const json = JSON.parse(text) as { id?: string | number };
      if (json && json.id !== undefined) id = json.id;
    } catch {
      /* non-JSON 2xx — treat as accepted without id */
    }
    return { ok: true, status: res.status, id };
  } catch (err) {
    console.error("[crm] fetch failed", err instanceof Error ? err.message : String(err));
    return { ok: false, status: 0 };
  }
}

/** Validated RSVP from the invitation form. */
export interface InvitationLead {
  name: string;
  phone: string;
  email: string;
  day: string; // YYYY-MM-DD
  slot: string; // TIME_SLOTS id
  interest: string;
  guests: string;
  /**
   * Agent-referral slug from the CTA URL (`?ref=<agent-slug>`). Forwarded to
   * the CRM so an active sales agent's slug auto-assigns the created lead.
   * Silent-ignored server-side if unknown — safe to omit.
   */
  ref?: string;
}

export async function postInvitationLead(lead: InvitationLead): Promise<CrmResult> {
  const requirements = [
    `Preferred visit: ${dayLabel(lead.day)} 2026, ${slotLabel(lead.slot)}`,
    `Interested in: ${lead.interest}`,
    `Guests: ${lead.guests}`,
    `Event: ${EVENT_NAME}, ${VENUE} ${VENUE_CITY}, ${DATES_TEXT} (RSVP)`,
  ].join(" | ");

  const payload: CrmPayload = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    requirements,
    propertyType: lead.interest,
    preferredLocations: "Yas Island, Abu Dhabi",
    website: "",
  };
  const category = propertyCategory(lead.interest);
  if (category) payload.propertyCategory = category;

  const ref = (lead.ref ?? "").trim().toLowerCase();
  if (/^[a-z0-9-]{1,120}$/.test(ref)) payload.ref = ref;

  return postToCrm(payload);
}
