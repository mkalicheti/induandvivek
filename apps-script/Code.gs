/**
 * Indu & Vivek — RSVP backend (Google Apps Script, bound to your RSVP Google Sheet).
 *
 * - One row is written per guest.
 * - If someone RSVPs again with the same EMAIL, their earlier rows are marked "Replaced"
 *   and the new rows become "Active". The Summary tab counts only Active rows.
 * - Every RSVP gets a confirmation email. If Gmail's daily sending limit is reached,
 *   the email waits in the "Email Queue" tab and is sent automatically within the hour
 *   once the limit resets.
 *
 * Setup: see README.md. In short: paste this file, run setup() once, then
 * Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */

// ---------- Settings ----------
const NOTIFY_EMAIL = '';   // e.g. 'you@example.com' to get an email for every RSVP. Leave '' for none.
const REPLY_TO = '';       // optional: where guests' replies go, if different from the Sheet owner's address
const SENDER_NAME = 'Indu & Vivek';
const SITE_URL = 'https://induandvivek.com';
const MAX_GUESTS = 15;

const EVENTS = [
  { id: 'welcome_dinner', header: 'Welcome Dinner', when: 'Wednesday, February 24, 2027 · 6:00 PM onwards', where: 'Venue details to follow' },
  { id: 'wedding', header: 'Wedding', when: 'Thursday, February 25, 2027 · Muhurtham 11:03 AM', where: 'Casa Bella Event Center, Sunol, California' }
];

const RESPONSES = 'Responses';
const SUMMARY = 'Summary';
const LATEST = 'Guest List (latest)';
const QUEUE = 'Email Queue';
const HEADERS = ['Submitted At', 'Confirmation #', 'Status', 'Contact Name', 'Email', 'Mobile', 'Guest Name', 'Adult/Child']
  .concat(EVENTS.map(e => e.header))
  .concat(['Message', 'Side']);
const COL = { status: 3, email: 5 };
const QUEUE_HEADERS = ['Queued At', 'Confirmation #', 'To', 'Subject', 'Body (HTML)', 'Status', 'Sent At', 'Last Error'];

// ---------- One-time setup: run this from the editor ----------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const res = ss.getSheetByName(RESPONSES) || ss.insertSheet(RESPONSES, 0);
  res.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#F8EEDF');
  res.setFrozenRows(1);
  res.getRange('F:F').setNumberFormat('@'); // keep phone numbers as text
  res.setColumnWidth(5, 220);
  res.setColumnWidth(7, 200);

  const q = ss.getSheetByName(QUEUE) || ss.insertSheet(QUEUE);
  q.getRange(1, 1, 1, QUEUE_HEADERS.length).setValues([QUEUE_HEADERS]).setFontWeight('bold').setBackground('#F8EEDF');
  q.setFrozenRows(1);

  const lastCol = colLetter(HEADERS.length);
  const r = `'${RESPONSES}'!`;
  const sum = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY);
  sum.clear();
  const rows = [['RSVP Summary (latest answers only)', '', '', '', ''],
                ['Event', 'Adults attending', 'Children attending', 'Total attending', 'Not attending']];
  EVENTS.forEach((ev, i) => {
    const c = colLetter(9 + i); // event columns start at I
    rows.push([
      ev.header,
      `=COUNTIFS(${r}C:C,"Active",${r}${c}:${c},"Yes",${r}H:H,"Adult")`,
      `=COUNTIFS(${r}C:C,"Active",${r}${c}:${c},"Yes",${r}H:H,"Child")`,
      `=COUNTIFS(${r}C:C,"Active",${r}${c}:${c},"Yes")`,
      `=COUNTIFS(${r}C:C,"Active",${r}${c}:${c},"No")`
    ]);
  });
  rows.push(['', '', '', '', '']);
  rows.push(['RSVPs received (families)', `=IFERROR(COUNTUNIQUE(FILTER(${r}B2:B,${r}C2:C="Active")),0)`, '', '', '']);
  rows.push(['Guests listed', `=COUNTIF(${r}C:C,"Active")`, '', '', '']);
  rows.push(['Confirmation emails waiting', `=COUNTIF('${QUEUE}'!F:F,"Pending")`, '', '', '']);
  const sc = colLetter(HEADERS.length); // Side column
  rows.push(['', '', '', '', '']);
  rows.push(['Guests by side', 'Guests listed', '', '', '']);
  ['Indu\u2019s side (bride)', 'Vivek\u2019s side (groom)', 'Both'].forEach(s =>
    rows.push([s, `=COUNTIFS(${r}C:C,"Active",${r}${sc}:${sc},"${s}")`, '', '', '']));
  rows.push(['No answer', `=COUNTIFS(${r}C:C,"Active",${r}${sc}:${sc},"")`, '', '', '']);
  sum.getRange(1, 1, rows.length, 5).setValues(rows);
  sum.getRange('A1').setFontWeight('bold').setFontSize(14);
  sum.getRange('A2:E2').setFontWeight('bold').setBackground('#F8EEDF');
  sum.getRange(rows.length - 4, 1, 1, 2).setFontWeight('bold').setBackground('#F8EEDF');
  sum.setColumnWidth(1, 240);

  const latest = ss.getSheetByName(LATEST) || ss.insertSheet(LATEST);
  latest.clear();
  latest.getRange('A1').setFormula(`=QUERY(${r}A:${lastCol},"select * where C = 'Active'",1)`);
  latest.setFrozenRows(1);

  // Hourly retry for any emails that hit the daily limit
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sendQueuedEmails')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendQueuedEmails').timeBased().everyHours(1).create();

  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

// ---------- Web app ----------
function doGet() {
  return json({ ok: true, message: 'RSVP endpoint is running.' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.website) return json({ ok: true }); // spam bot filled the hidden field

    const contact = data.contact || {};
    const name = clean(contact.name, 120);
    const email = clean(contact.email, 200).toLowerCase();
    const phone = clean(contact.phone, 40, true);
    const guests = Array.isArray(data.guests) ? data.guests.slice(0, MAX_GUESTS) : [];
    if (!name || !isEmail(email) || !guests.length) return json({ ok: false, error: 'Missing name, email or guests.' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(RESPONSES);
    if (!sh) return json({ ok: false, error: 'Run setup() first.' });

    // Mark this person's earlier answers as replaced
    const last = sh.getLastRow();
    let replaced = false;
    if (last > 1) {
      const emails = sh.getRange(2, COL.email, last - 1, 1).getValues();
      const statusRange = sh.getRange(2, COL.status, last - 1, 1);
      const statuses = statusRange.getValues();
      for (let i = 0; i < emails.length; i++) {
        if (statuses[i][0] === 'Active' && String(emails[i][0]).trim().toLowerCase() === email) { statuses[i][0] = 'Replaced'; replaced = true; }
      }
      if (replaced) statusRange.setValues(statuses);
    }

    const now = new Date();
    const id = clean(data.submissionId, 20) || ('IV-' + Utilities.getUuid().slice(0, 6).toUpperCase());
    const message = clean(data.message, 2000);
    const side = clean(data.side, 40);
    const cleanGuests = guests.map(g => ({
      name: clean(g.name, 120),
      type: g.type === 'Child' ? 'Child' : 'Adult',
      rsvp: EVENTS.reduce((o, ev) => { o[ev.id] = (g.rsvp || {})[ev.id] === 'Yes' ? 'Yes' : 'No'; return o; }, {})
    }));
    const rows = cleanGuests.map(g =>
      [now, id, 'Active', name, email, phone, g.name, g.type]
        .concat(EVENTS.map(ev => g.rsvp[ev.id]))
        .concat([message, side]));
    sh.getRange(last + 1, 1, rows.length, HEADERS.length).setValues(rows);

    const attending = cleanGuests.some(g => EVENTS.some(ev => g.rsvp[ev.id] === 'Yes'));
    const hotels = attending ? hotelLinks() : [];
    const r = { id, name, email, phone, guests: cleanGuests, message, side, replaced, hotels };
    sendOrQueue(id, email, 'Your RSVP for Indu & Vivek’s wedding (' + id + ')', guestEmailHtml(r));
    if (NOTIFY_EMAIL) sendOrQueue(id, NOTIFY_EMAIL, `${replaced ? 'Updated' : 'New'} RSVP: ${name} (${cleanGuests.length}) ${id}`, ownerEmailHtml(r));

    if (hotels.length) markHotelLinksSent(email);
    return json({ ok: true, id: id, replaced: replaced, guests: rows.length, hotels: hotels });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e) { /* not held */ }
  }
}

// ---------- Emails ----------
function sendOrQueue(id, to, subject, html) {
  try {
    if (MailApp.getRemainingDailyQuota() > 0) { send(to, subject, html); return true; }
  } catch (e) {
    console.warn('Email failed, queueing: ' + e);
  }
  const q = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(QUEUE);
  if (q) q.appendRow([new Date(), id, to, subject, html, 'Pending', '', '']);
  return false;
}

function send(to, subject, html) {
  const opts = { to: to, subject: subject, htmlBody: html, name: SENDER_NAME };
  if (REPLY_TO) opts.replyTo = REPLY_TO;
  MailApp.sendEmail(opts);
}

/** Runs every hour (set up by setup()). Sends emails that were waiting for the daily limit to reset. */
function sendQueuedEmails() {
  const q = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(QUEUE);
  if (!q || q.getLastRow() < 2) return;
  const range = q.getRange(2, 1, q.getLastRow() - 1, QUEUE_HEADERS.length);
  const vals = range.getValues();
  for (let i = 0; i < vals.length; i++) {
    if (vals[i][5] !== 'Pending') continue;
    if (MailApp.getRemainingDailyQuota() <= 0) break;
    try {
      send(vals[i][2], vals[i][3], vals[i][4]);
      vals[i][5] = 'Sent'; vals[i][6] = new Date(); vals[i][7] = '';
    } catch (e) {
      vals[i][7] = String(e);
    }
  }
  range.setValues(vals);
}

function rsvpTable(guests) {
  return '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:15px">' +
    '<tr style="background:#F8EEDF"><th align="left">Name</th>' + EVENTS.map(ev => `<th align="left">${esc(ev.header)}</th>`).join('') + '</tr>' +
    guests.map(g => `<tr style="border-top:1px solid #E6D2AE"><td>${esc(g.name)}${g.type === 'Child' ? ' (child)' : ''}</td>` +
      EVENTS.map(ev => `<td>${g.rsvp[ev.id] === 'Yes' ? '&#10003; Attending' : 'Not attending'}</td>`).join('') + '</tr>').join('') +
    '</table>';
}

function guestEmailHtml(r) {
  const attendingAny = r.guests.some(g => EVENTS.some(ev => g.rsvp[ev.id] === 'Yes'));
  const events = EVENTS.filter(ev => r.guests.some(g => g.rsvp[ev.id] === 'Yes'));
  return '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#34100F;max-width:600px">' +
    `<p>Dear ${esc(r.name)},</p>` +
    `<p>Thank you for your RSVP. ${attendingAny ? 'We can’t wait to celebrate with you!' : 'We’ll miss you, and we’re grateful you let us know.'}</p>` +
    `<p><b>Confirmation number:</b> ${esc(r.id)}</p>` +
    (r.side ? `<p><b>Side:</b> ${esc(r.side)}</p>` : '') +
    rsvpTable(r.guests) +
    (events.length ? '<p style="margin-top:20px">' + events.map(ev => `<b>${esc(ev.header)}</b><br>${esc(ev.when)}<br>${esc(ev.where)}`).join('<br><br>') + '</p>' : '') +
    hotelSectionHtml(r.hotels) +
    `<p>Need to change something? Fill out the RSVP again at <a href="${SITE_URL}/#rsvp">${SITE_URL.replace('https://', '')}</a> using this same email address. We will use your newest answer.</p>` +
    '<p>With love,<br>Indu &amp; Vivek</p></div>';
}

function ownerEmailHtml(r) {
  return `<p><b>${esc(r.name)}</b> · ${esc(r.email)}${r.phone ? ' · ' + esc(r.phone) : ''} · ${esc(r.id)}${r.replaced ? ' · <b>replaces an earlier RSVP</b>' : ''}</p>` +
    rsvpTable(r.guests) +
    (r.side ? `<p><b>Side:</b> ${esc(r.side)}</p>` : '') +
    (r.message ? `<p><b>Message:</b> ${esc(r.message)}</p>` : '');
}

// ---------- Hotel booking links ----------
// The links are kept in a separate Apps Script file, HotelLinks.gs, that is NOT in the public
// GitHub repository. It defines HOTEL_LINKS = [{ name, url }, ...]. Without it, no links are sent.
function hotelLinks() {
  if (typeof HOTEL_LINKS === 'undefined' || !Array.isArray(HOTEL_LINKS)) return [];
  return HOTEL_LINKS
    .filter(h => h && h.name && /^https:\/\//.test(String(h.url || '')))
    .map(h => ({ name: String(h.name), url: String(h.url), note: String(h.note || '') }));
}

function hotelSectionHtml(hotels) {
  if (!hotels || !hotels.length) return '';
  return '<div style="margin:22px 0;padding:16px;border:2px solid #C88A12;border-radius:12px;background:#FBEBC4">' +
    '<p style="margin:0 0 6px;font-size:18px"><b>Book your hotel room</b></p>' +
    '<p style="margin:0 0 12px">Use these links to get our group rate for February 23 to 26, 2027.</p>' +
    hotels.map(h =>
      `<p style="margin:0 0 12px"><b>${esc(h.name)}</b>${h.note ? '<br>' + esc(h.note) : ''}<br>` +
      `<a href="${esc(h.url)}" style="display:inline-block;margin-top:6px;padding:10px 18px;background:#7E1F1F;color:#fff;border-radius:999px;text-decoration:none">Book at our group rate</a></p>`
    ).join('') + '</div>';
}

function markHotelLinksSent(email) {
  const props = PropertiesService.getScriptProperties();
  const sent = JSON.parse(props.getProperty('HOTEL_LINKS_SENT') || '[]');
  if (sent.indexOf(email) === -1) { sent.push(email); props.setProperty('HOTEL_LINKS_SENT', JSON.stringify(sent)); }
}

/**
 * Run this ONCE from the editor after adding HotelLinks.gs.
 * Emails the hotel booking links to everyone who RSVP'd "attending" before the links existed.
 * Anyone who already received them is skipped, so running it again is safe.
 */
function emailHotelLinksToEarlierGuests() {
  const hotels = hotelLinks();
  if (!hotels.length) throw new Error('No hotel links found. Add the HotelLinks.gs file first.');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESPONSES);
  const last = sh.getLastRow();
  if (last < 2) { console.log('No responses yet.'); return; }
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const evCols = EVENTS.map((_, i) => 8 + i); // event columns, 0-based (I onward)
  const people = {};
  rows.forEach(r => {
    if (r[2] !== 'Active') return;
    const email = String(r[4]).trim().toLowerCase();
    if (!isEmail(email)) return;
    const p = people[email] || (people[email] = { name: r[3], id: r[1], attending: false });
    if (evCols.some(c => r[c] === 'Yes')) p.attending = true;
  });
  const sent = JSON.parse(PropertiesService.getScriptProperties().getProperty('HOTEL_LINKS_SENT') || '[]');
  let count = 0;
  Object.keys(people).forEach(email => {
    const p = people[email];
    if (!p.attending || sent.indexOf(email) !== -1) return;
    const html = '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#34100F;max-width:600px">' +
      `<p>Dear ${esc(p.name)},</p><p>Thank you for your RSVP! We have reserved rooms at a special group rate for our wedding guests.</p>` +
      hotelSectionHtml(hotels) + '<p>With love,<br>Indu &amp; Vivek</p></div>';
    sendOrQueue(p.id, email, 'Hotel booking links for Indu & Vivek’s wedding', html);
    markHotelLinksSent(email);
    count++;
  });
  console.log('Hotel links sent to ' + count + ' guest(s).');
}

// ---------- Helpers ----------
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
function clean(v, max, isPhone) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, max);
  if (isPhone) return s.replace(/[^\d+ ]/g, ''); // phone column is plain text
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return s;
}
function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
