/* Manchester City Yas Residences — Open Days RSVP
   Page script for public/invitation.html. Kept external so the CSP can use
   script-src 'self' with no inline scripts. Event days and slots mirror
   lib/event.ts — keep them in sync. */
(function () {
  "use strict";

  var LOADED_AT = Date.now();
  var TZ_OFFSET_MS = 4 * 3600 * 1000; // Asia/Dubai, fixed UTC+4

  /* ---------- API URLs ----------
     The parent site redirects every path to a trailing slash before it
     proxies, then strips the slash when forwarding. Calling the slashed
     URLs avoids a redirect through the proxy; on the raw Vercel host it is
     one same-host 308 (method and body preserved). */
  /* ---------- base path ----------
     The page is served at /yas_residences_rsvp/ behind the parent-site proxy
     and at / locally. Relative "api/…" only resolves correctly with a trailing
     slash, so compute the base explicitly. */
  var path = location.pathname;
  var BASE = path.endsWith("/") ? path : path.replace(/[^/]*$/, "");

  /* ---------- background video: pick by orientation once ---------- */
  var bg = document.getElementById("bg");
  var sea = document.getElementById("sea");
  var inv = document.getElementById("inv");
  var muteToggle = document.getElementById("muteToggle");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
  var src = portrait ? "teaser-portrait.mp4" : "teaser-landscape.mp4";
  var poster = portrait ? "poster-portrait.webp" : "poster-landscape.webp";
  if (bg) {
    bg.poster = poster;
    if (reduced) {
      bg.removeAttribute("autoplay");
      bg.style.backgroundImage = "url(" + poster + ")";
    } else {
      bg.src = src;
    }
  }

  /* ---------- audio ----------
     Browsers block autoplay-with-sound on first page load. We start muted
     (guaranteed to autoplay), then let the guest tap the toggle. Clicking
     RSVP also unmutes. */
  var audioOn = false;
  function setAudio(on) {
    if (!bg || reduced) return;
    bg.muted = !on;
    if (on) {
      bg.volume = 1;
      var p = bg.play();
      if (p && p.catch) p.catch(function () {});
    }
    audioOn = on;
    if (muteToggle) {
      muteToggle.classList.toggle("on", on);
      muteToggle.setAttribute("aria-label", on ? "Mute sound" : "Enable sound");
    }
  }
  if (muteToggle) {
    muteToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setAudio(!audioOn);
    });
  }
  (function tryAutoUnmute() {
    if (!bg || reduced) return;
    bg.muted = false;
    var p = bg.play();
    if (p && p.then) {
      p.then(function () { setAudio(true); }).catch(function () { bg.muted = true; audioOn = false; bg.play().catch(function () {}); });
    }
  })();

  /* ---------- transition: RSVP → slide up ---------- */
  document.getElementById("rsvp").addEventListener("click", function () {
    setAudio(true);
    inv.classList.add("on");
    sea.classList.add("gone");
  });

  /* ---------- day / slot availability (Dubai time) ---------- */
  var daySel = document.getElementById("day");
  var slotSel = document.getElementById("slot");
  function dubaiNow() { return new Date(Date.now() + TZ_OFFSET_MS); }
  function todayIso() { return dubaiNow().toISOString().slice(0, 10); }
  function nowHour() { var d = dubaiNow(); return d.getUTCHours() + d.getUTCMinutes() / 60; }

  (function disablePastDays() {
    var today = todayIso();
    var remaining = 0;
    Array.prototype.forEach.call(daySel.options, function (o) {
      if (!o.value) return;
      var past = o.value < today || (o.value === today && nowHour() >= 18);
      o.disabled = past;
      if (!past) remaining++;
    });
    // Event over: keep the form usable so late interest still reaches the CRM.
    if (remaining === 0) Array.prototype.forEach.call(daySel.options, function (o) { if (o.value) o.disabled = false; });
  })();

  function refreshSlots() {
    var isToday = daySel.value === todayIso();
    var h = nowHour();
    var any = false;
    Array.prototype.forEach.call(slotSel.options, function (o) {
      if (!o.value) return;
      var end = Number(o.getAttribute("data-end"));
      o.disabled = isToday && h >= end;
      if (!o.disabled) any = true;
    });
    if (slotSel.value && slotSel.selectedOptions[0] && slotSel.selectedOptions[0].disabled) slotSel.value = "";
    if (!any) Array.prototype.forEach.call(slotSel.options, function (o) { if (o.value) o.disabled = false; });
  }
  daySel.addEventListener("change", refreshSlots);
  refreshSlots();

  /* ---------- form → CRM → confirmation ---------- */
  function fieldError(id, msg) {
    var el = document.getElementById(id);
    var f = el.parentElement;
    f.classList.add("err");
    var err = document.createElement("div");
    err.className = "f-error";
    err.textContent = msg;
    f.appendChild(err);
    el.focus();
  }
  function clearErrors() {
    Array.prototype.forEach.call(document.querySelectorAll(".f.err"), function (f) {
      f.classList.remove("err");
      var e = f.querySelector(".f-error");
      if (e) e.remove();
    });
    var fe = document.getElementById("formError");
    fe.textContent = "";
    fe.classList.remove("on");
  }
  function selectedText(id) {
    var el = document.getElementById(id);
    return el.value && el.selectedOptions[0] ? el.selectedOptions[0].text : "";
  }

  document.getElementById("form").addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    var name = document.getElementById("name").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var email = document.getElementById("email").value.trim();
    var day = daySel.value;
    var slot = slotSel.value;
    var interest = document.getElementById("interest").value;
    var guests = document.getElementById("guests").value;
    var website = document.getElementById("website").value;

    var required = [["name", name, "Please enter your name"], ["phone", phone, "Please enter your WhatsApp number"], ["email", email, "Please enter your email"], ["day", day, "Please pick a day"], ["slot", slot, "Please pick a time"], ["interest", interest, "Please pick what you are interested in"], ["guests", guests, "Please tell us who is coming"]];
    for (var i = 0; i < required.length; i++) {
      if (!required[i][1]) { fieldError(required[i][0], required[i][2]); return; }
    }
    var phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15 || /[a-zA-Z]/.test(phone)) {
      fieldError("phone", "Please enter a valid phone number");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldError("email", "Please enter a valid email address");
      return;
    }

    var submit = document.getElementById("submit");
    var originalHtml = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = "Reserving…";

    // Agent-referral slug from the CTA URL (?ref=<agent-slug>). The CRM
    // resolves it to an active agent and silently ignores anything else.
    var refParam = (new URLSearchParams(location.search).get("ref") || "").trim().toLowerCase();
    var ref = /^[a-z0-9-]{0,120}$/.test(refParam) ? refParam : "";

    var ok = false;
    var message = "";
    try {
      var res = await fetch(BASE + "api/invitation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, phone: phone, email: email, day: day, slot: slot, interest: interest, guests: guests, ref: ref, website: website, elapsed: Date.now() - LOADED_AT })
      });
      if (res.ok) {
        ok = true;
      } else {
        var data = null;
        try { data = await res.json(); } catch (_) {}
        message = (data && data.error) || "Something went wrong. Please try again.";
      }
    } catch (err) {
      message = "We could not reach the server. Please check your connection and try again.";
    }

    submit.disabled = false;
    submit.innerHTML = originalHtml;

    if (!ok) {
      var fe = document.getElementById("formError");
      fe.textContent = message;
      fe.classList.add("on");
      return;
    }

    var first = name.split(/\s+/)[0];
    var dayText = selectedText("day");
    var slotText = selectedText("slot");
    document.getElementById("confhead").textContent = "Thank you " + first + ". We'll see you on " + dayText + ".";
    document.getElementById("confp").textContent = "A confirmation with your calendar invite is on its way to " + email + ".";
    document.getElementById("confDay").textContent = dayText + " 2026";
    document.getElementById("confSlot").textContent = slotText;
    document.getElementById("ics").href = BASE + "api/ics/?day=" + encodeURIComponent(day) + "&slot=" + encodeURIComponent(slot);

    document.querySelector(".wrap").classList.add("done");
    document.getElementById("confirm").classList.add("on");
    inv.scrollTop = 0;
  });
})();
