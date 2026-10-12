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
export const VENUE_CITY = "Abu Dhabi";
/** TODO: replace with the street address once confirmed. Shown in the email and the .ics. */
export const SALES_CENTER_ADDRESS = "Ohana Development, Abu Dhabi, United Arab Emirates";
export const MAP_URL = "https://maps.app.goo.gl/PjVbi6wqBuYSyRun8";

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
