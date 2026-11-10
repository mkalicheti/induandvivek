/* Indu & Vivek wedding site: theme preview + RSVP wizard. */
(function () {
  'use strict';

  /* ================== SETTINGS: edit these ================== */
  var CONFIG = {
    // Paste your Google Apps Script web app URL here (see README). Leave empty for preview mode.
    scriptUrl: 'https://script.google.com/macros/s/AKfycbyzXqwknLhpdG7xvHqPQQNM9YnAZRVucgqjf3S-0NYrE4xRm7ywQvmtkFhT2jgtjvt8OQ/exec',
    // Shown on the page when set, e.g. 'January 10, 2027'
    rsvpDeadline: '',
    // Largest family one RSVP may include
    maxParty: 12,
    // Palette: 'pattu', 'geru', 'aaku' or 'gadwal'
    theme: 'gadwal',
    // Set to false once you have chosen a palette
    showThemePicker: false
  };

  var EVENTS = [
    { id: 'welcome_dinner', name: 'Welcome Dinner', te: 'స్వాగత విందు', when: 'Wednesday, February 24 · 6:00 PM onwards' },
    { id: 'wedding', name: 'Wedding Ceremony', te: 'వివాహోత్సవం', when: 'Thursday, February 25 · Muhurtham 11:03 AM' }
  ];
  // Hotel room blocks. Leave the list empty to show "We are finalizing..." on the site.
  // Copy the example below once per hotel, remove the // at the start of each line, and fill it in.
  // Any line you don't have yet (code, phone, bookBy...) can simply be left out.
  var HOTELS = [
    // {
    //   name: 'Hotel name',
    //   area: 'Pleasanton',
    //   distance: '15 minutes from the venue',
    //   rate: '$159 per night',
    //   code: 'INDUVIVEK',
    //   bookBy: 'January 24, 2027',
    //   link: 'https://www.example.com/your-group-booking-link',
    //   phone: '+1 925 555 0100',
    //   note: 'Mention the Indu & Vivek wedding when calling.'
    // },
  ];
  /* ========================================================== */

  var COUNTRIES = [
    ['+91', 'India +91'], ['+1', 'USA / Canada +1'], ['+44', 'UK +44'], ['+61', 'Australia +61'],
    ['+64', 'New Zealand +64'], ['+65', 'Singapore +65'], ['+971', 'UAE +971'], ['+974', 'Qatar +974'],
    ['+966', 'Saudi Arabia +966'], ['+968', 'Oman +968'], ['+965', 'Kuwait +965'], ['+973', 'Bahrain +973'],
    ['+60', 'Malaysia +60'], ['+49', 'Germany +49'], ['+353', 'Ireland +353'], ['+31', 'Netherlands +31'],
    ['other', 'Other (type full number)']
  ];

  // Common misspellings of email domains -> correct domain
  var DOMAIN_FIXES = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
    'gmail.in': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.om': 'gmail.com',
    'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
    'yahoo.co.i': 'yahoo.co.in', 'yaho.co.in': 'yahoo.co.in',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
    'rediffmai.com': 'rediffmail.com', 'redifmail.com': 'rediffmail.com', 'rediff.com': 'rediffmail.com'
  };

  var THEMES = [
    { id: 'pattu', label: 'Pattu Silk', sw: ['#6B0F1E', '#C29436', '#FFF9F1'] },
    { id: 'geru', label: 'Geru Muggu', sw: ['#A63A24', '#FFFFFF', '#E8891C'] },
    { id: 'aaku', label: 'Aaku Pachcha', sw: ['#22412A', '#D99A13', '#B3261E'] },
    { id: 'gadwal', label: 'Gadwal', sw: ['#E3AA2B', '#7E1F1F', '#3E6B2E'] }
  ];

  /* ---------- Doorstep muggu border: one continuous line around a 2-row dot grid ---------- */
  function kolamPath(m, n, s) {
    var x = 1, y = 0, dx = 1, dy = 1, pts = [], guard = 0, start = '1,0,1,1';
    do {
      pts.push([x, y]); x += dx; y += dy;
      if (x === 0 || x === 2 * m) dx = -dx;
      if (y === 0 || y === 2 * n) dy = -dy;
    } while ([x, y, dx, dy].join() !== start && ++guard < 20000);
    var P = pts.map(function (p) {
      var a = p[0], b = p[1];
      if (a === 0) a -= 0.45; if (a === 2 * m) a += 0.45; if (b === 0) b -= 0.45; if (b === 2 * n) b += 0.45;
      return [a * s, b * s];
    });
    function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    var k = P.length, d = 'M' + mid(P[k - 1], P[0]).map(function (v) { return v.toFixed(1); }).join(' ');
    for (var i = 0; i < k; i++) {
      var c = P[i], e = mid(P[i], P[(i + 1) % k]);
      d += 'Q' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
    }
    return d;
  }
  var bandWidth = 0;
  function drawMugguBands() {
    var bands = document.querySelectorAll('.muggu-band svg');
    if (!bands.length) return;
    var W = Math.round(bands[0].getBoundingClientRect().width || window.innerWidth);
    if (!W || W === bandWidth) return;
    bandWidth = W;
    var s = W < 600 ? 9 : 11;
    var m = Math.floor((W - 4 * s) / (2 * s));
    if (m % 2 === 0) m -= 1; // odd x 2 grid gives one unbroken line
    var w = 2 * m * s, h = 4 * s, pad = s * 1.1, ox = (W - w) / 2;
    var dots = '';
    for (var i = 0; i < m; i++) for (var j = 0; j < 2; j++) dots += '<circle cx="' + ((2 * i + 1) * s) + '" cy="' + ((2 * j + 1) * s) + '" r="' + (s * 0.17).toFixed(2) + '"/>';
    var inner = '<g transform="translate(' + ox.toFixed(1) + ' ' + pad.toFixed(1) + ')"><path d="' + kolamPath(m, 2, s) + '" fill="none" class="mb-line" stroke-width="' + (s * 0.15).toFixed(2) + '" stroke-linejoin="round"/><g class="mb-dot">' + dots + '</g></g>';
    for (var b = 0; b < bands.length; b++) {
      bands[b].setAttribute('viewBox', '0 0 ' + W + ' ' + (h + pad * 2).toFixed(1));
      bands[b].style.height = (h + pad * 2).toFixed(1) + 'px';
      bands[b].innerHTML = inner;
    }
  }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  /* ---------- Theme ---------- */
  function applyTheme(id) {
    document.documentElement.setAttribute('data-palette', id);
    var btns = document.querySelectorAll('.theme-picker [data-theme-id]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-theme-id') === id));
  }
  function initTheme() {
    var theme = CONFIG.theme;
    if (CONFIG.showThemePicker) {
      var saved = store('iv-theme');
      if (saved && THEMES.some(function (t) { return t.id === saved; })) theme = saved;
      var box = document.createElement('div');
      box.className = 'theme-picker';
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', 'Preview a colour theme');
      box.innerHTML = '<p>Preview a theme</p><button class="hide" type="button">Hide</button><div class="opts">' +
        THEMES.map(function (t) {
          return '<button type="button" data-theme-id="' + t.id + '" aria-pressed="false"><span class="sw">' +
            t.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') +
            '</span>' + t.label + '</button>';
        }).join('') + '</div>';
      document.body.appendChild(box);
      document.body.classList.add('has-picker');
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-theme-id]');
        if (b) { var id = b.getAttribute('data-theme-id'); applyTheme(id); store('iv-theme', id); }
        if (e.target.closest('.hide')) { box.hidden = true; document.body.classList.remove('has-picker'); }
      });
    }
    applyTheme(theme);
  }

  /* ---------- Garland (banthi poolu swags, chamanthi and banana leaves at each tie) ---------- */
  var garlandWidth = 0;
  function drawGarland() {
    var svg = document.querySelector('.garland');
    if (!svg) return;
    var W = Math.round(svg.getBoundingClientRect().width || window.innerWidth);
    if (!W || W === garlandWidth) return;
    garlandWidth = W;
    var phone = W < 600;
    var H = phone ? 96 : 124, top = phone ? 20 : 24;
    var n = Math.max(2, Math.round(W / (phone ? 190 : 250)));
    var step = W / n, depth = phone ? 30 : 42, bs = phone ? 15 : 19;
    var out = [];

    // swags of marigolds, placed evenly along each curve, with mango leaves hanging beneath
    var blossoms = [];
    for (var i = 0; i < n; i++) {
      var x0 = i * step, x1 = (i + 1) * step, cx = (x0 + x1) / 2, cy = top + depth * 2;
      var px = x0, py = top, acc = 0, gap = bs * 0.6;
      for (var j = 1; j <= 240; j++) {
        var t = j / 240, u = 1 - t;
        var x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * top + 2 * u * t * cy + t * t * top;
        acc += Math.hypot(x - px, y - py); px = x; py = y;
        if (acc >= gap && j < 236) { acc = 0; blossoms.push([x, y]); }
      }
    }
    // mamidi thoranam: a mango leaf hangs from every second flower, swinging slightly left and right
    var ml = phone ? 30 : 40, mw = ml * 24 / 68;
    blossoms.forEach(function (b, k) {
      if (k % 2) return;
      var tilt = ((k * 37) % 17) - 8;
      out.push('<use href="#mamidi" class="g-leaf' + (k % 4 ? '' : ' dark') + '" x="' + (b[0] - mw / 2).toFixed(1) + '" y="' + (b[1] - 2).toFixed(1) + '" width="' + mw.toFixed(1) + '" height="' + ml +
        '" transform="rotate(' + tilt + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ')"/>');
    });
    blossoms.forEach(function (b, k) {
      out.push('<use href="#banthi"' + (k % 2 ? ' class="y"' : '') + ' x="' + (b[0] - bs / 2).toFixed(1) + '" y="' + (b[1] - bs / 2).toFixed(1) +
        '" width="' + bs + '" height="' + bs + '" transform="rotate(' + ((k * 47) % 360) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ')"/>');
    });

    // a short strand hanging from each tie, then the chamanthi on top
    var hs = phone ? 40 : 54, ps = bs * 0.85;
    for (var p = 0; p <= n; p++) {
      var hx = p * step;
      var strand = '<g class="pendant" style="animation-delay:' + (-p * 0.9).toFixed(1) + 's">';
      for (var q = 0; q < 3; q++) {
        var yy = top + hs * 0.35 + q * ps * 0.82;
        strand += '<use href="#banthi"' + (q % 2 ? '' : ' class="y"') + ' x="' + (hx - ps / 2).toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + ps.toFixed(1) + '" height="' + ps.toFixed(1) + '"/>';
      }
      var bud = ps * 1.15;
      strand += '<use href="#chamanthi" x="' + (hx - bud / 2).toFixed(1) + '" y="' + (top + hs * 0.35 + 3 * ps * 0.82 - 2).toFixed(1) + '" width="' + bud.toFixed(1) + '" height="' + bud.toFixed(1) + '" transform="rotate(180 ' + hx.toFixed(1) + ' ' + (top + hs * 0.35 + 3 * ps * 0.82 - 2 + bud / 2).toFixed(1) + ')"/></g>';
      out.push(strand);
      out.push('<use href="#chamanthi" x="' + (hx - hs / 2).toFixed(1) + '" y="' + (top - hs / 2 + 4).toFixed(1) + '" width="' + hs + '" height="' + hs + '"/>');
    }

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.height = H + 'px';
    svg.innerHTML = out.join('');
  }
  function initGarland() {
    drawGarland();
    drawMugguBands();
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { drawGarland(); drawMugguBands(); }, 120); });
  }

  /* ---------- Hotels ---------- */
  function hEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function initHotels() {
    var box = document.querySelector('[data-hotels]');
    if (!box || !HOTELS.length) return;
    var stay = document.querySelector('[data-stay-text]');
    if (stay) stay.textContent = HOTELS.length > 1
      ? 'We have reserved rooms at ' + (['', 'one', 'two', 'three', 'four', 'five', 'six'][HOTELS.length] || HOTELS.length) + ' hotels nearby. Use the booking code to get our group rate.'
      : 'We have reserved rooms at a hotel nearby. Use the booking code to get our group rate.';
    box.innerHTML = HOTELS.map(function (h, i) {
      var tel = h.phone ? String(h.phone).replace(/[^\d+]/g, '') : '';
      return '<article class="hotel">' +
        '<h3>' + hEsc(h.name) + '</h3>' +
        (h.area || h.distance ? '<p class="hotel-where">' + hEsc([h.area, h.distance].filter(Boolean).join(' · ')) + '</p>' : '') +
        (h.rate ? '<p class="hotel-rate">' + hEsc(h.rate) + '</p>' : '') +
        (h.code ? '<div class="hotel-code"><span class="hotel-label">Booking code</span>' +
          '<span class="code" id="code-' + i + '">' + hEsc(h.code) + '</span>' +
          '<button type="button" class="copy-btn" data-copy="code-' + i + '">Copy code</button></div>' : '') +
        (h.bookBy ? '<p class="hotel-bookby">Please book by <strong>' + hEsc(h.bookBy) + '</strong></p>' : '') +
        (h.note ? '<p class="hotel-note">' + hEsc(h.note) + '</p>' : '') +
        '<div class="hotel-actions">' +
        (h.link ? '<a class="btn" href="' + hEsc(h.link) + '" target="_blank" rel="noopener">Book online</a>' : '') +
        (h.phone ? '<a class="link-btn" href="tel:' + hEsc(tel) + '">Call ' + hEsc(h.phone) + '</a>' : '') +
        '</div></article>';
    }).join('');
    box.hidden = false;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var el = document.getElementById(b.getAttribute('data-copy'));
      var text = el.textContent;
      function done() { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy code'; }, 2000); }
      function selectIt() { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, selectIt);
      else selectIt();
    });
  }

  /* ---------- Deadline ---------- */
  function initDeadline() {
    if (!CONFIG.rsvpDeadline) return;
    var a = document.querySelector('[data-deadline]');
    if (a) { a.textContent = 'Kindly reply by ' + CONFIG.rsvpDeadline; a.hidden = false; }
    var b = document.querySelector('[data-deadline-inline]');
    if (b) { b.textContent = ' Please reply by ' + CONFIG.rsvpDeadline + '.'; b.hidden = false; }
  }

  /* ---------- RSVP state ---------- */
  var DRAFT_KEY = 'iv-rsvp-draft-v1';
  var STEPS = ['Your details', 'Who is coming', 'Events', 'Message', 'Review'];
  var app = document.getElementById('rsvp-app');
  var counter = 0;
  function newId() { counter += 1; return 'p' + Date.now().toString(36) + counter; }

  function freshState() {
    return { step: 1, name: '', phoneCode: '+91', phone: '', email: '', emailChecked: '', website: '', people: [{ id: 'me', name: '', child: false }], confirmed: false, rsvp: {}, message: '' };
  }
  function loadDraft() {
    try {
      var s = JSON.parse(store(DRAFT_KEY) || 'null');
      if (s && Array.isArray(s.people) && s.people.length && s.rsvp) {
        if (!(s.step >= 1 && s.step <= 5)) s.step = 1;
        if (!s.phoneCode) s.phoneCode = '+91';
        return s;
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  var state = loadDraft() || freshState();
  var errors = {};
  var formError = '';

  function saveDraft() { if (state.step <= 5) store(DRAFT_KEY, JSON.stringify(state)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  // Local part of the phone number with stray country code / trunk zero removed
  function localDigits() {
    var d = digits(state.phone);
    if (state.phoneCode === '+91') { if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2); if (d.length === 11 && d[0] === '0') d = d.slice(1); }
    if (state.phoneCode === '+1' && d.length === 11 && d[0] === '1') d = d.slice(1);
    return d;
  }
  function fullPhone() {
    if (!state.phone.trim()) return '';
    if (state.phoneCode === 'other') return '+' + digits(state.phone);
    return state.phoneCode + ' ' + localDigits();
  }
  function emailFix(email) {
    var m = /^([^\s@]+)@([^\s@]+)$/.exec(email.trim().toLowerCase());
    if (!m || !DOMAIN_FIXES[m[2]]) return '';
    return email.trim().split('@')[0] + '@' + DOMAIN_FIXES[m[2]];
  }

  /* ---------- Validation ---------- */
  function nameProblem(n) {
    var v = String(n || '').trim();
    if (!v) return 'Please type a name here.';
    if (v.length < 2) return 'Please type the full name.';
    if (/\d/.test(v) || /[+&,\/;]/.test(v) ||
        /\b(and|family|fam|guest|guests|kids|kid|children|child|others|plus|wife|husband|spouse|parents|mom|dad|son|daughter|members?)\b/i.test(v)) {
      return 'Please type only one person’s name in each box. Use “Add another person” for each extra person.';
    }
    return '';
  }

  function validateStep(step) {
    errors = {};
    if (step === 1) {
      var np = nameProblem(state.name);
      if (np) errors.name = np;
      var em = state.email.trim();
      if (!em) errors.email = 'Please enter your email address. We will send your confirmation there.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) errors.email = 'This email address doesn’t look right. Please check it. It should look like name@gmail.com';
      else if (emailFix(em) && state.emailChecked !== em) errors.email = 'FIX';
      if (state.phone.trim()) {
        var d = localDigits();
        if (state.phoneCode === '+91' && !/^[6-9]\d{9}$/.test(d)) errors.phone = 'Indian mobile numbers have 10 digits, for example 98765 43210. Please check the number, or leave it empty.';
        else if (state.phoneCode === '+1' && d.length !== 10) errors.phone = 'US and Canadian numbers have 10 digits, for example 510 555 1234. Please check the number, or leave it empty.';
        else if (state.phoneCode === 'other' && (digits(state.phone).length < 8 || digits(state.phone).length > 15)) errors.phone = 'Please type the full number starting with the country code, for example +33 6 12 34 56 78.';
        else if (state.phoneCode !== '+91' && state.phoneCode !== '+1' && state.phoneCode !== 'other' && (d.length < 6 || d.length > 13)) errors.phone = 'This number doesn’t look right. Please check it, or leave it empty.';
      }
    }
    if (step === 2) {
      var seen = {};
      seen[state.name.trim().toLowerCase()] = true;
      state.people.forEach(function (p) {
        if (p.id === 'me') return;
        var e = nameProblem(p.name);
        var key = p.name.trim().toLowerCase();
        if (!e && seen[key]) e = 'This name is already on your list.';
        seen[key] = true;
        if (e) errors['person-' + p.id] = e;
      });
      if (!state.confirmed) errors.confirm = 'Please tick this box to confirm everyone coming with you is listed.';
    }
    if (step === 3) {
      EVENTS.forEach(function (ev) {
        state.people.forEach(function (p) {
          if (!state.rsvp[p.id] || !state.rsvp[p.id][ev.id]) errors['ev-' + ev.id] = 'Please choose “Attending” or “Not attending” for every person.';
        });
      });
    }
    return Object.keys(errors).length === 0;
  }

  /* ---------- Rendering ---------- */
  function fieldErr(key) {
    return errors[key] ? '<p class="field-error" id="err-' + key + '">' + esc(errors[key]) + '</p>' : '';
  }
  function describedBy(key, hintId) {
    var ids = [];
    if (hintId) ids.push(hintId);
    if (errors[key]) ids.push('err-' + key);
    return ids.length ? ' aria-describedby="' + ids.join(' ') + '"' : '';
  }
  function invalid(key) { return errors[key] ? ' aria-invalid="true"' : ''; }

  function progress() {
    var pct = Math.round((state.step / STEPS.length) * 100);
    return '<div class="progress"><p class="progress-label">Step ' + state.step + ' of ' + STEPS.length + ': ' + STEPS[state.step - 1] + '</p>' +
      '<div class="progress-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div></div>';
  }

  function nav(nextLabel, hideBack) {
    return '<div class="step-nav">' +
      (hideBack ? '<span></span>' : '<button type="button" class="btn btn-ghost" data-action="back">← Back</button>') +
      '<button type="submit" class="btn" data-action="next">' + nextLabel + '</button></div>';
  }

  function step1() {
    return '<h3 class="step-title">Your details</h3>' +
      '<p class="step-intro">You will add anyone coming with you on the next step.</p>' +
      '<div class="field' + (errors.name ? ' invalid' : '') + '"><label for="rsvp-name">Your full name</label>' +
      '<input type="text" id="rsvp-name" data-field="name" autocomplete="name" autocapitalize="words" value="' + esc(state.name) + '"' + invalid('name') + describedBy('name') + '>' + fieldErr('name') + '</div>' +
      '<div class="field' + (errors.email ? ' invalid' : '') + '"><label for="rsvp-email">Your email address</label>' +
      '<p class="hint" id="hint-email">We will email your RSVP confirmation here. To change your RSVP later, fill this form again with the same email.</p>' +
      '<input type="email" id="rsvp-email" data-field="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" value="' + esc(state.email) + '"' + invalid('email') + describedBy('email', 'hint-email') + '>' + emailError() + '</div>' +
      '<div class="field' + (errors.phone ? ' invalid' : '') + '"><label for="rsvp-phone">Mobile number (optional)</label>' +
      '<p class="hint" id="hint-phone">Only so we can reach you if needed. We will not send text messages.</p>' +
      '<div class="phone-row"><select id="rsvp-phone-code" data-field="phoneCode" aria-label="Country code">' +
      COUNTRIES.map(function (c) { return '<option value="' + c[0] + '"' + (state.phoneCode === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') +
      '</select><input type="tel" id="rsvp-phone" data-field="phone" autocomplete="tel-national" inputmode="tel" value="' + esc(state.phone) + '"' + invalid('phone') + describedBy('phone', 'hint-phone') + '></div>' + fieldErr('phone') + '</div>' +
      '<div class="hp" aria-hidden="true"><label for="rsvp-website">Website</label><input type="text" id="rsvp-website" data-field="website" tabindex="-1" autocomplete="off" value="' + esc(state.website) + '"></div>' +
      nav('Next →', true);
  }

  function emailError() {
    if (errors.email !== 'FIX') return fieldErr('email');
    var fix = emailFix(state.email);
    return '<div class="field-error" id="err-email"><p>Did you mean <strong>' + esc(fix) + '</strong>?</p>' +
      '<div class="fix-row"><button type="button" class="btn" data-action="fix-email">Yes, use ' + esc(fix) + '</button>' +
      '<button type="button" class="btn btn-ghost" data-action="keep-email">No, my email is correct</button></div></div>';
  }

  function step2() {
    var full = state.people.length >= CONFIG.maxParty;
    var list = state.people.map(function (p, i) {
      if (p.id === 'me') {
        return '<li class="person"><span class="person-num">1</span><div class="person-body"><p class="person-me">' + esc(state.name) + ' <small>(you)</small></p></div></li>';
      }
      var k = 'person-' + p.id;
      return '<li class="person"><span class="person-num">' + (i + 1) + '</span><div class="person-body">' +
        '<div class="field' + (errors[k] ? ' invalid' : '') + '" style="margin:0"><label for="name-' + p.id + '">Full name</label>' +
        '<input type="text" id="name-' + p.id + '" data-person="' + p.id + '" autocapitalize="words" autocomplete="off" value="' + esc(p.name) + '"' + invalid(k) + describedBy(k) + '>' + fieldErr(k) + '</div>' +
        '<div class="person-row"><label class="check"><input type="checkbox" id="child-' + p.id + '" data-child="' + p.id + '"' + (p.child ? ' checked' : '') + '> Child (under 12)</label>' +
        '<button type="button" class="remove" data-remove="' + p.id + '">Remove</button></div></div></li>';
    }).join('');
    return '<h3 class="step-title">Who else is coming with you?</h3>' +
      '<p class="step-intro">Add <strong>each person coming with you by name</strong>, such as your spouse, children or parents. Each person needs their own box. They do not need to fill out a separate RSVP.</p>' +
      '<ol class="people">' + list + '</ol>' +
      (full ? '<p class="hint">You have reached the most people one RSVP can hold. Please contact us if more people are coming with you.</p>'
            : '<button type="button" class="btn btn-ghost add-person" data-action="add">+ Add another person</button>') +
      '<div class="confirm-box' + (errors.confirm ? ' invalid' : '') + '"><label class="check"><input type="checkbox" id="rsvp-confirm" data-field-check="confirmed"' + (state.confirmed ? ' checked' : '') + invalid('confirm') + describedBy('confirm') + '> ' +
      (state.people.length > 1 ? 'I have added everyone who is coming with me.' : 'No one else is coming with me.') + '</label></div>' +
      fieldErr('confirm') +
      nav('Next →');
  }

  function step3() {
    var blocks = EVENTS.map(function (ev) {
      var k = 'ev-' + ev.id;
      var rows = state.people.map(function (p) {
        var v = state.rsvp[p.id] && state.rsvp[p.id][ev.id];
        var miss = errors[k] && !v ? ' missing' : '';
        var nm = p.id === 'me' ? state.name : p.name;
        return '<li class="ev-person"><span class="ev-person-name" id="lbl-' + ev.id + '-' + p.id + '">' + esc(nm) + (p.id === 'me' ? ' (you)' : '') + '</span>' +
          '<div class="choices" role="group" aria-labelledby="lbl-' + ev.id + '-' + p.id + '">' +
          '<button type="button" class="choice' + miss + '" data-p="' + p.id + '" data-e="' + ev.id + '" data-v="yes" aria-pressed="' + (v === 'yes') + '">✓ Attending</button>' +
          '<button type="button" class="choice' + miss + '" data-p="' + p.id + '" data-e="' + ev.id + '" data-v="no" aria-pressed="' + (v === 'no') + '">✕ Not attending</button>' +
          '</div></li>';
      }).join('');
      var quick = state.people.length > 1
        ? '<div class="quick"><span>Same answer for everyone:</span><button type="button" data-all="yes" data-e="' + ev.id + '">All attending</button><button type="button" data-all="no" data-e="' + ev.id + '">None attending</button></div>'
        : '';
      return '<section class="ev-block' + (errors[k] ? ' invalid' : '') + '" aria-labelledby="evh-' + ev.id + '">' +
        '<div class="ev-head"><p class="telugu" lang="te" style="font-size:1.25rem;color:var(--muted)">' + esc(ev.te) + '</p><h4 id="evh-' + ev.id + '">' + esc(ev.name) + '</h4><p>' + esc(ev.when) + '</p></div>' +
        quick + '<ul class="ev-people">' + rows + '</ul>' + fieldErr(k) + '</section>';
    }).join('');
    return '<h3 class="step-title">Who is coming to each event?</h3>' +
      '<p class="step-intro">Choose an answer for each person.</p>' + blocks + nav('Next →');
  }

  function step4() {
    return '<h3 class="step-title">A message for us</h3>' +
      '<div class="field"><label for="rsvp-message">A message for Indu &amp; Vivek (optional)</label>' +
      '<textarea id="rsvp-message" data-field="message">' + esc(state.message) + '</textarea></div>' +
      nav('Review my RSVP →');
  }

  function answerTag(v) { return v === 'yes' ? '<span class="yes-tag">✓ Attending</span>' : '<span class="no-tag">✕ Not attending</span>'; }

  function reviewTable() {
    return '<div class="review-wrap"><table class="review"><thead><tr><th scope="col">Name</th>' +
      EVENTS.map(function (ev) { return '<th scope="col">' + esc(ev.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      state.people.map(function (p) {
        var nm = p.id === 'me' ? state.name : p.name;
        return '<tr><td>' + esc(nm) + (p.child ? ' <span class="hint">(child)</span>' : '') + '</td>' +
          EVENTS.map(function (ev) { return '<td>' + answerTag(state.rsvp[p.id][ev.id]) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function step5() {
    return '<h3 class="step-title">Please check your RSVP</h3>' +
      '<p class="step-intro">If everything looks right, press <strong>Send my RSVP</strong>.</p>' +
      (formError ? '<div class="form-error" role="alert">' + esc(formError) + '</div>' : '') +
      reviewTable() +
      '<p style="margin-bottom:16px"><button type="button" class="edit-link" data-goto="2">Change who is coming</button> &nbsp;·&nbsp; <button type="button" class="edit-link" data-goto="3">Change answers</button></p>' +
      '<dl class="summary-list">' +
      '<div><dt>Confirmation email to</dt><dd><strong>' + esc(state.email.trim()) + '</strong> <button type="button" class="edit-link" data-goto="1">Change</button></dd></div>' +
      (fullPhone() ? '<div><dt>Mobile</dt><dd>' + esc(fullPhone()) + '</dd></div>' : '') +
      (state.message ? '<div><dt>Message</dt><dd>' + esc(state.message) + '</dd></div>' : '') +
      '</dl>' + nav('Send my RSVP');
  }

  function doneView(result) {
    var coming = state.people.filter(function (p) { return EVENTS.some(function (ev) { return state.rsvp[p.id][ev.id] === 'yes'; }); }).length;
    return '<div class="done"><svg class="done-muggu" aria-hidden="true"><use href="#muggu-sm"/></svg>' +
      '<h3 tabindex="-1" id="done-h">Thank you, ' + esc(state.name.trim().split(/\s+/)[0]) + '!</h3>' +
      '<p class="done-ok"><strong>Your RSVP is done.</strong> You don’t need to do anything else.</p>' +
      '<p>' + (coming ? 'We can’t wait to celebrate with you.' : 'We’ll miss you, and we’re grateful you let us know.') + '</p>' +
      '<p class="conf-no">Confirmation number <strong>' + esc(lastId) + '</strong></p></div>' +
      reviewTable() +
      '<p class="notice">We are emailing a copy to <strong>' + esc(state.email.trim()) + '</strong>. If you don’t see it in a few minutes, check your Spam or Promotions folder. You can also take a screenshot of this page.</p>' +
      (result === 'preview' ? '<p class="notice" style="margin-top:10px">Preview mode: this RSVP was not saved and no email was sent, because the Google Sheet is not connected yet.</p>' : '') +
      '<p class="hint" style="margin-top:14px">Need to change something? Fill out the RSVP again with the same email address and we’ll use your newest answer.</p>' +
      '<p style="margin-top:16px"><button type="button" class="btn btn-ghost" data-action="restart">Start a new RSVP</button></p>';
  }

  var lastResult = null;
  var lastId = '';
  function render(focusTarget) {
    var body;
    if (state.step === 6) body = doneView(lastResult);
    else body = progress() + [step1, step2, step3, step4, step5][state.step - 1]();
    app.innerHTML = state.step === 6 ? body : '<form novalidate>' + body + '</form>';
    saveDraft();
    if (focusTarget) {
      var el = typeof focusTarget === 'string' ? app.querySelector(focusTarget) : null;
      if (el) el.focus({ preventScroll: false });
    }
  }

  function scrollToCard() {
    var top = app.getBoundingClientRect().top + window.pageYOffset - 16;
    if (Math.abs(app.getBoundingClientRect().top) > 40) window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function focusFirstError() {
    var el = app.querySelector('[aria-invalid="true"], .choice.missing, .field-error');
    if (el) {
      if (el.classList.contains('field-error')) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      else el.focus();
    }
  }

  function goTo(step) {
    errors = {}; formError = '';
    state.step = step;
    render();
    scrollToCard();
    var h = app.querySelector('.step-title, #done-h');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  /* ---------- Events ---------- */
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.field) state[t.dataset.field] = t.value;
    if (t.dataset.person) {
      var p = state.people.find(function (x) { return x.id === t.dataset.person; });
      if (p) p.name = t.value;
    }
    saveDraft();
  });

  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.child) {
      var p = state.people.find(function (x) { return x.id === t.dataset.child; });
      if (p) p.child = t.checked;
    }
    if (t.dataset.fieldCheck) state[t.dataset.fieldCheck] = t.checked;
    saveDraft();
  });

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.step === 5) { submit(); return; }
    if (!validateStep(state.step)) { render(); focusFirstError(); return; }
    if (state.step === 1) state.people[0].name = state.name.trim();
    if (state.step === 2) {
      // keep answers only for people still listed
      var ids = state.people.map(function (p) { return p.id; });
      Object.keys(state.rsvp).forEach(function (k) { if (ids.indexOf(k) === -1) delete state.rsvp[k]; });
    }
    goTo(state.step + 1);
  });

  app.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var action = t.dataset.action;
    if (action === 'back') { goTo(state.step - 1); return; }
    if (action === 'restart') { state = freshState(); store(DRAFT_KEY, null); goTo(1); return; }
    if (action === 'fix-email') { state.email = emailFix(state.email); delete errors.email; render('#rsvp-email'); return; }
    if (action === 'keep-email') { state.emailChecked = state.email.trim(); delete errors.email; render('#rsvp-email'); return; }
    if (action === 'add') {
      var id = newId();
      state.people.push({ id: id, name: '', child: false });
      state.confirmed = false;
      render('#name-' + id);
      return;
    }
    if (t.dataset.remove) {
      state.people = state.people.filter(function (p) { return p.id !== t.dataset.remove; });
      delete state.rsvp[t.dataset.remove];
      delete errors['person-' + t.dataset.remove];
      render('.add-person');
      return;
    }
    if (t.dataset.goto) { goTo(Number(t.dataset.goto)); return; }
    if (t.dataset.all) {
      state.people.forEach(function (p) { state.rsvp[p.id] = state.rsvp[p.id] || {}; state.rsvp[p.id][t.dataset.e] = t.dataset.all; });
      if (errors['ev-' + t.dataset.e]) delete errors['ev-' + t.dataset.e];
      render();
      return;
    }
    if (t.dataset.v && t.dataset.p) {
      state.rsvp[t.dataset.p] = state.rsvp[t.dataset.p] || {};
      state.rsvp[t.dataset.p][t.dataset.e] = t.dataset.v;
      var group = t.parentNode.querySelectorAll('.choice');
      for (var i = 0; i < group.length; i++) {
        group[i].setAttribute('aria-pressed', String(group[i] === t));
        group[i].classList.remove('missing');
      }
      saveDraft();
    }
  });

  /* ---------- Submit ---------- */
  function submit() {
    var btn = app.querySelector('[data-action="next"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    lastId = 'IV-' + code;
    var payload = {
      submissionId: lastId,
      contact: { name: state.name.trim(), phone: fullPhone(), email: state.email.trim() },
      guests: state.people.map(function (p) {
        var rsvp = {};
        EVENTS.forEach(function (ev) { rsvp[ev.id] = state.rsvp[p.id][ev.id] === 'yes' ? 'Yes' : 'No'; });
        return { name: (p.id === 'me' ? state.name : p.name).trim(), type: p.child ? 'Child' : 'Adult', isContact: p.id === 'me', rsvp: rsvp };
      }),
      message: state.message.trim(),
      website: state.website
    };

    function finish(result) {
      lastResult = result;
      store(DRAFT_KEY, null);
      goTo(6);
    }
    function fail() {
      formError = 'Your RSVP was not sent. Please check your internet connection and press “Send my RSVP” again. If it still doesn’t work, please call or message Indu or Vivek.';
      render();
      var fe = app.querySelector('.form-error');
      if (fe) fe.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    if (!CONFIG.scriptUrl) { setTimeout(function () { finish('preview'); }, 600); return; }

    fetch(CONFIG.scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) finish('sent'); else fail(); })
      .catch(fail);
  }

  /* ---------- Start ---------- */
  initTheme();
  initGarland();
  initHotels();
  initDeadline();
  render();
})();
