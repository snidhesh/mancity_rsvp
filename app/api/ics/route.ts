import { NextResponse } from "next/server";
import { buildIcs, ICS_FILENAME } from "@/lib/ics";
import { DAY_ISOS, SLOT_IDS } from "@/lib/event";

export const runtime = "nodejs";

/**
 * GET /api/ics?day=YYYY-MM-DD&slot=<id>
 *
 * Returns a calendar invite for the chosen visit slot. Both parameters are
 * validated against the server-side constants; no user text is echoed, so
 * the file content is fully controlled by lib/event.ts. Served as a real
 * text/calendar URL (not a data: URI) so iOS Safari hands it to Calendar.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const day = url.searchParams.get("day") ?? "";
  const slot = url.searchParams.get("slot") ?? "";

  if (!(DAY_ISOS as readonly string[]).includes(day) || !(SLOT_IDS as readonly string[]).includes(slot)) {
    return NextResponse.json({ ok: false, error: "Unknown day or slot" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const ics = buildIcs({ dayIso: day, slotId: slot });
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ICS_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
