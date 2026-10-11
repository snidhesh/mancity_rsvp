import { Resend } from "resend";
import type { InvitationLead } from "./crm";
import {
  DATES_TEXT,
  HOURS_TEXT,
  MAP_URL,
  PROJECT_NAME,
  PUBLIC_BASE,
  SALES_CENTER_ADDRESS,
  SHORT_NAME,
  VENUE,
  VENUE_CITY,
  dayLabel,
  slotLabel,
} from "./event";
import { ICS_FILENAME } from "./ics";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Public URLs for the logos. Base64 data-URIs are stripped by Gmail /
// Outlook.com / Yahoo, so we host through the parent domain (proxied via
// blackoak-website → mancityrsvp.vercel.app).
const PROJECT_LOGO_URL = `${PUBLIC_BASE}/project-logo-vertical-white.png`;
const OHANA_LOGO_URL = `${PUBLIC_BASE}/ohana-logo-white.png`;
const BLACKOAK_LOGO_URL = `${PUBLIC_BASE}/blackoak-logo-2k.png`;

/** Strip CR/LF so user text can never inject mail headers or ICS lines. */
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export async function sendInvitationConfirmation(
  lead: InvitationLead,
  ics: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return { ok: false, error: "no-resend-key" };
  }

  const from = process.env.RESEND_FROM ?? `${SHORT_NAME} <invitation@blackoak-re.com>`;
  const safeName = oneLine(lead.name);
  const firstName = (safeName.split(/\s+/)[0] ?? "").trim() || "Guest";
  const to = oneLine(lead.email);
  const day = dayLabel(lead.day);
  const slot = slotLabel(lead.slot);
  const icsUrl = `${PUBLIC_BASE}/api/ics/?day=${encodeURIComponent(lead.day)}&slot=${encodeURIComponent(lead.slot)}`;

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `You're confirmed, ${firstName} — ${day}, ${SHORT_NAME}`,
      replyTo: "info@blackoak-re.com",
      html: renderHtml({ firstName, day, slot, icsUrl }),
      text: renderText({ firstName, day, slot, icsUrl }),
      attachments: [
        {
          filename: ICS_FILENAME,
          content: Buffer.from(ics, "utf8").toString("base64"),
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
    });
    if (error) {
      console.error("[email] Resend send failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send threw", err instanceof Error ? err.message : String(err));
    return { ok: false, error: "send-failed" };
  }
}

interface RenderArgs {
  firstName: string;
  day: string;
  slot: string;
  icsUrl: string;
}

function renderText({ firstName, day, slot, icsUrl }: RenderArgs): string {
  return [
    `Dear ${firstName},`,
    "",
    `Thank you. Your visit to the ${SHORT_NAME} Phase 2 Open Days is confirmed.`,
    "",
    `The Day      ${day} 2026`,
    `The Time     ${slot}`,
    `The Address  ${VENUE}, ${VENUE_CITY}`,
    `             ${SALES_CENTER_ADDRESS}`,
    `Map:         ${MAP_URL}`,
    `Calendar:    ${icsUrl}`,
    "",
    `Open Days run ${DATES_TEXT}, ${HOURS_TEXT} daily.`,
    "",
    "Hosted by BlackOak Real Estate",
    `${PROJECT_NAME} · © 2026 BlackOak Real Estate`,
  ].join("\n");
}

function renderHtml({ firstName, day, slot, icsUrl }: RenderArgs): string {
  const name = escapeHtml(firstName);

  // Palette matches public/invitation.html
  const navy = "#16244c";
  const navy2 = "#1c2d5a";
  const sky = "#6CABDD";
  const ink = "#ffffff";
  const mute = "#b8c4dc";
  const dim = "#8a97b5";
  const hair = "rgba(108,171,221,.42)";
  const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
  const sans = "'Inter', 'Helvetica Neue', Arial, sans-serif";

  const projectImg = `<img src="${PROJECT_LOGO_URL}" alt="${escapeHtml(PROJECT_NAME)}" width="200" style="display:block;width:200px;height:auto;margin:0 auto;border:0" />`;
  const ohanaImg = `<img src="${OHANA_LOGO_URL}" alt="Ohana Development" height="24" style="display:block;height:24px;width:auto;margin:0 auto;border:0" />`;
  const blackoakImg = `<img src="${BLACKOAK_LOGO_URL}" alt="BlackOak Real Estate" height="30" style="display:block;height:30px;width:auto;margin:0 auto;border:0" />`;

  const rowK = `padding:18px 0;border-bottom:1px solid ${hair};font-family:${sans};font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:${sky};vertical-align:top`;
  const rowV = `padding:18px 0;border-bottom:1px solid ${hair};font-family:${serif};font-size:22px;color:${ink}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(SHORT_NAME)} — You are confirmed</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background:${navy};color:${ink};font-family:${serif};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${navy}">
  <tr><td align="center" style="padding:44px 16px">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px">

      <!-- seal -->
      <tr><td align="center" style="padding:8px 0 30px">
        <div style="font-family:${sans};font-size:12px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:${sky}">Open Days &middot; By Invitation</div>
      </td></tr>

      <!-- project logo -->
      <tr><td align="center" style="padding:0 0 10px">${projectImg}</td></tr>

      <tr><td align="center" style="padding:12px 0 40px">
        <div style="font-family:${sans};font-size:12px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:${sky}">&mdash; Phase 2 Launch &mdash;</div>
      </td></tr>

      <!-- Thank you -->
      <tr><td align="center" style="padding:0 20px 34px">
        <h1 style="font-family:${serif};font-size:36px;font-weight:500;font-style:italic;line-height:1.15;color:${ink};margin:0">Thank you ${name}.<br/>Your visit is confirmed.</h1>
      </td></tr>

      <!-- itinerary -->
      <tr><td style="padding:0 24px 36px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${hair}">
          <tr>
            <td width="130" style="${rowK}">The Day</td>
            <td style="${rowV}">${escapeHtml(day)} 2026</td>
          </tr>
          <tr>
            <td style="${rowK}">The Time</td>
            <td style="${rowV}">${escapeHtml(slot)}</td>
          </tr>
          <tr>
            <td style="${rowK}">The Address</td>
            <td style="${rowV}">
              ${escapeHtml(VENUE)}<br/>
              <span style="color:${mute};font-size:.8em">${escapeHtml(SALES_CENTER_ADDRESS)}</span><br/>
              <a href="${MAP_URL}" style="display:inline-block;margin-top:10px;font-family:${sans};font-size:10.5px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${sky};text-decoration:none;border-bottom:1px solid ${sky};padding-bottom:3px">View on map &rarr;</a>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- add to calendar -->
      <tr><td align="center" style="padding:0 20px 40px">
        <a href="${icsUrl}" style="display:inline-block;padding:14px 30px;border:1px solid ${sky};color:${ink};background:${navy2};text-decoration:none;font-family:${sans};font-size:11px;font-weight:600;letter-spacing:.26em;text-transform:uppercase">Add to calendar</a>
        <p style="font-family:${sans};font-size:11px;letter-spacing:.06em;color:${dim};margin:14px 0 0">The invite is also attached to this email.</p>
      </td></tr>

      <!-- divider -->
      <tr><td align="center" style="padding:0 0 30px">
        <div style="display:inline-block;width:44px;height:1px;background:${sky}"></div>
      </td></tr>

      <!-- Hosted by -->
      <tr><td align="center" style="padding:0 20px 24px">
        <div style="font-family:${sans};font-size:11px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:${sky};margin-bottom:18px">Hosted by</div>
        ${blackoakImg}
      </td></tr>

      <tr><td align="center" style="padding:0 20px 16px">
        <div style="font-family:${sans};font-size:10px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:${dim};margin-bottom:14px">In partnership with</div>
        ${ohanaImg}
      </td></tr>

      <!-- fine print -->
      <tr><td align="center" style="padding:30px 20px 10px">
        <p style="font-family:${sans};font-size:10.5px;line-height:1.7;letter-spacing:.08em;color:${dim};margin:0">Open Days ${escapeHtml(DATES_TEXT)} &middot; ${escapeHtml(HOURS_TEXT)} daily<br/>${escapeHtml(PROJECT_NAME)} &middot; &copy; 2026 BlackOak Real Estate</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
