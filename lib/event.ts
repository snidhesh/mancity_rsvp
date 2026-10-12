/**
 * Single source of truth for the event. Edit copy here; the API routes,
 * CRM payload, email and calendar invite all read from this file.
 * The static page (public/invitation.html + public/app.js) carries the
 * same values by hand — keep them in sync when changing dates or slots.
 */

export const PROJECT_NAME = "Manchester City Yas Residences by Ohana";
export const SHORT_NAME = "Manchester City Yas Residences";
export const EVENT_NAME = `${PROJECT_NAME} – Phase 2 Open Days`;

export const VENUE = "Ohana Sales Center";
export const VENUE_CITY = "Dubai";
/** TODO: replace with the street address once confirmed. Shown in the email and the .ics. */
export const SALES_CENTER_ADDRESS = "Ohana Development, Dubai, United Arab Emirates";
export const MAP_URL = "https://maps.app.goo.gl/qddrPSTFDcBexCmC8";

export interface Venue {
  name: string;
  city: string;
  address: string;
  mapUrl: string;
}

export const DEFAULT_VENUE: Venue = { name: VENUE, city: VENUE_CITY, address: SALES_CENTER_ADDRESS, mapUrl: MAP_URL };

/**
 * Per-agent venue overrides, keyed by the `?ref=<agent-slug>` on the CTA URL.
 * Guests arriving through a listed agent see this venue on the page, in the
 * confirmation email and in the .ics; everyone else gets DEFAULT_VENUE.
 * public/app.js carries the same table by hand — keep them in sync.
 */
export const VENUE_BY_REF: Record<string, Venue> = {
  "mirabela-antonache": {
    name: VENUE,
    city: "Abu Dhabi",
    address: "Ohana Development, Abu Dhabi, United Arab Emirates",
    mapUrl: "https://maps.app.goo.gl/PjVbi6wqBuYSyRun8",
  },
};

export function venueFor(ref?: string): Venue {
  const key = (ref ?? "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(VENUE_BY_REF, key) ? VENUE_BY_REF[key] : DEFAULT_VENUE;
}

export const DATES_TEXT = "11 – 16 October 2026";
export const HOURS_TEXT = "10 AM – 6 PM";

/** Asia/Dubai is a fixed UTC+4 with no daylight saving. */
export const TZ_OFFSET_HOURS = 4;

/** Public URL the page is proxied at; used for hosted email images and links. */
export const PUBLIC_BASE = "https://www.blackoak-re.com/yas_residences_rsvp";

export const EVENT_DAYS = [
  { iso: "2026-10-11", label: "Sunday 11 October" },
  { iso: "2026-10-12", label: "Monday 12 October" },
  { iso: "2026-10-13", label: "Tuesday 13 October" },
  { iso: "2026-10-14", label: "Wednesday 14 October" },
  { iso: "2026-10-15", label: "Thursday 15 October" },
  { iso: "2026-10-16", label: "Friday 16 October" },
] as const;

export const TIME_SLOTS = [
  { id: "10-12", label: "10 AM – 12 PM", start: 10, end: 12 },
  { id: "12-16", label: "12 PM – 4 PM", start: 12, end: 16 },
  { id: "16-18", label: "4 PM – 6 PM", start: 16, end: 18 },
] as const;

export const INTEREST_OPTIONS = [
  "2 BR Townhouse",
  "3 BR Townhouse",
  "3 BR Duplex",
  "4 BR Villa",
  "5 BR Villa",
  "Not sure yet",
] as const;

export const GUEST_OPTIONS = ["Just me", "Me and one more", "Three of us"] as const;

export type DayIso = (typeof EVENT_DAYS)[number]["iso"];
export type SlotId = (typeof TIME_SLOTS)[number]["id"];
export type Interest = (typeof INTEREST_OPTIONS)[number];
export type Guests = (typeof GUEST_OPTIONS)[number];

export const DAY_ISOS = EVENT_DAYS.map((d) => d.iso) as [DayIso, ...DayIso[]];
export const SLOT_IDS = TIME_SLOTS.map((s) => s.id) as [SlotId, ...SlotId[]];

export function dayLabel(iso: string): string {
  return EVENT_DAYS.find((d) => d.iso === iso)?.label ?? iso;
}

export function findSlot(id: string) {
  return TIME_SLOTS.find((s) => s.id === id);
}

export function slotLabel(id: string): string {
  return findSlot(id)?.label ?? id;
}

/** Category the CRM can filter on; omitted for "Not sure yet". */
export function propertyCategory(interest: string): string | undefined {
  if (/townhouse/i.test(interest)) return "Townhouse";
  if (/duplex/i.test(interest)) return "Duplex";
  if (/villa/i.test(interest)) return "Villa";
  return undefined;
}
