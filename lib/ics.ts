/**
 * Minimal, dependency-free iCalendar builder for the chosen visit slot.
 * Times are emitted in UTC ("Z"); Asia/Dubai is a fixed UTC+4 with no DST,
 * so no VTIMEZONE block is needed and every client renders the right hours.
 */

import { createHash } from "node:crypto";
import {
  EVENT_NAME,
  MAP_URL,
  PUBLIC_BASE,
  SALES_CENTER_ADDRESS,
  SHORT_NAME,
  TZ_OFFSET_HOURS,
  VENUE,
  VENUE_CITY,
  dayLabel,
  findSlot,
} from "./event";

export interface IcsArgs {
  dayIso: string; // YYYY-MM-DD, already validated against EVENT_DAYS
  slotId: string; // already validated against TIME_SLOTS
  /** Optional guest identity used only to make the UID stable per guest. */
  email?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local Dubai hour on a YYYY-MM-DD day → iCalendar UTC stamp. */
function utcStamp(dayIso: string, localHour: number): string {
  const [y, m, d] = dayIso.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d, localHour - TZ_OFFSET_HOURS, 0, 0);
  const t = new Date(ms);
  return (
    `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}` +
    `T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`
  );
}

function nowStamp(): string {
  const t = new Date();
  return (
    `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}` +
    `T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}Z`
  );
}

/** RFC 5545 §3.3.11: escape backslash, semicolon, comma and newlines. */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  let first = true;
  while (i < bytes.length) {
    const limit = first ? 75 : 74;
    let end = Math.min(i + limit, bytes.length);
    // Never split inside a multi-byte UTF-8 sequence.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((first ? "" : " ") + bytes.subarray(i, end).toString("utf8"));
    i = end;
    first = false;
  }
  return out.join("\r\n");
}

export function buildIcs({ dayIso, slotId, email }: IcsArgs): string {
  const slot = findSlot(slotId);
  if (!slot) throw new Error("unknown slot");

  const who = createHash("sha256")
    .update(`${dayIso}|${slotId}|${(email ?? "").toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
  const uid = `mcfc-yas-${dayIso}-${slotId}-${who}@blackoak-re.com`;

  const description = [
    `${EVENT_NAME}.`,
    `Your visit: ${dayLabel(dayIso)}, ${slot.label} (Gulf Standard Time).`,
    `Venue: ${VENUE}, ${SALES_CENTER_ADDRESS}.`,
    `Map: ${MAP_URL}`,
    "Hosted by BlackOak Real Estate.",
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BlackOak Real Estate//Yas Residences Open Days//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStamp()}`,
    `DTSTART:${utcStamp(dayIso, slot.start)}`,
    `DTEND:${utcStamp(dayIso, slot.end)}`,
    `SUMMARY:${escapeText(`${SHORT_NAME} – Open Days visit`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(`${VENUE}, ${VENUE_CITY} – ${SALES_CENTER_ADDRESS}`)}`,
    `URL:${PUBLIC_BASE}/`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`Tomorrow: ${SHORT_NAME} Open Days visit`)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`In 2 hours: ${SHORT_NAME} Open Days visit`)}`,
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export const ICS_FILENAME = "yas-residences-open-days.ics";
