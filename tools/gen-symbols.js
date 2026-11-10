// Generates the <symbol> SVG for the muggu dividers and the banana leaf, and injects them into index.html
const fs = require('fs');
const kolam = require('./kolam.js');
const f = v => +v.toFixed(1);

function muggu(id, m, n, s, sw, dotR) {
  const k = kolam(m, n, s);
  const pad = s * 0.9;
  return `<symbol id="${id}" viewBox="${f(-pad)} ${f(-pad)} ${f(k.w + pad * 2)} ${f(k.h + pad * 2)}">` +
    `<path d="${k.d}" fill="none" style="stroke:var(--muggu-line)" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<g style="fill:var(--muggu-dot)">${k.dots.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${dotR}"/>`).join('')}</g></symbol>`;
}

// Banana leaf drawn base-left to tip-right: it arches up and the tip droops, with softly rippled
// edges, parallel veins and a few natural tears.
function banana() {
  const L = 400, W = 60, B = 95, N = 120;
  const c = t => [t * L, -B * Math.sin(Math.PI * 0.82 * t) + 18 * t * t];
  const tan = t => {
    const dx = L, dy = -B * Math.PI * 0.82 * Math.cos(Math.PI * 0.82 * t) + 36 * t;
    const m = Math.hypot(dx, dy); return [dx / m, dy / m];
  };
  const nrm = t => { const [x, y] = tan(t); return [y, -x]; };
  const w = t => W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.55) * (1 - 0.35 * t) *
    (t < 0.06 ? t / 0.06 : 1) * (1 + 0.035 * Math.sin(t * 46));
  const edge = (t, side) => { const p = c(t), n = nrm(t), ww = w(t) * (side > 0 ? 1 : 0.92); return [p[0] + n[0] * ww * side, p[1] + n[1] * ww * side]; };
  const up = [], lo = [];
  for (let i = 0; i <= N; i++) { const t = i / N; up.push(edge(t, 1)); lo.push(edge(t, -1)); }
  const pts = up.concat(lo.reverse());
  const blade = 'M' + pts.map(p => p.map(f).join(' ')).join('L') + 'Z';
  // Veins: from midrib angled toward the tip
  let veins = '';
  for (let t = 0.1; t < 0.93; t += 0.035) {
    for (const side of [1, -1]) {
      const a = c(t), b = edge(Math.min(t + 0.07, 0.99), side);
      const k = 0.92; const bb = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      veins += `M${f(a[0])} ${f(a[1])}L${f(bb[0])} ${f(bb[1])}`;
    }
  }
  // Tears: gaps cut in from the edge along the vein direction
  let tears = '';
  [[0.34, -1, 0.85], [0.47, 1, 0.7], [0.58, -1, 0.95], [0.71, 1, 0.8], [0.8, -1, 0.75]].forEach(([t, side, depth]) => {
    const a = c(t), b = edge(Math.min(t + 0.07, 0.99), side);
    const s = [b[0] + (a[0] - b[0]) * depth, b[1] + (a[1] - b[1]) * depth];
    tears += `M${f(b[0])} ${f(b[1])}L${f(s[0])} ${f(s[1])}`;
  });
  const mid = 'M' + Array.from({ length: 41 }, (_, i) => c(i / 40 * 0.97).map(f).join(' ')).join('L');
  const minY = -B - W, h = B + W * 2;
  return `<symbol id="banana" viewBox="-6 ${f(minY - 4)} ${L + 12} ${f(h + 8)}" overflow="visible">` +
    `<path d="${blade}" style="fill:var(--leaf-c, var(--leaf))"/>` +
    `<path d="${veins}" fill="none" style="stroke:var(--paper)" stroke-opacity=".22" stroke-width="1.1"/>` +
    `<path d="${mid}" fill="none" style="stroke:var(--paper)" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M-4 0L8 0" style="stroke:var(--leaf-c, var(--leaf))" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="${tears}" fill="none" style="stroke:var(--hero-bg)" stroke-width="2.4" stroke-linecap="round"/>` +
    `</symbol>`;
}

// Banthi puvvu (marigold): layered ruffled petals. Colours come from --m1 (outer) and --m2 (inner).
function marigold() {
  let s = '<symbol id="banthi" viewBox="-11 -11 22 22">';
  s += '<circle r="7.6" style="fill:var(--m1)"/>';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += `<circle cx="${f(Math.cos(a) * 7.2)}" cy="${f(Math.sin(a) * 7.2)}" r="3.1" style="fill:var(--m1)"/>`; }
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; s += `<circle cx="${f(Math.cos(a) * 4)}" cy="${f(Math.sin(a) * 4)}" r="2.7" style="fill:var(--m2)"/>`; }
  s += '<circle r="2.4" style="fill:var(--m1)"/><circle r="1" style="fill:var(--m2)"/>';
  return s + '</symbol>';
}

// Chamanthi (chrysanthemum): rings of slender petals, white outside fading to yellow at the heart.
function chamanthi() {
  let s = '<symbol id="chamanthi" viewBox="-30 -30 60 60" overflow="visible"><g>';
  const rings = [
    { n: 26, len: 26, w: 3.4, fill: 'var(--ch1)', off: 0 },
    { n: 22, len: 20, w: 3.2, fill: 'var(--ch1)', off: 0.5 },
    { n: 18, len: 14.5, w: 3, fill: 'var(--ch2)', off: 0.25 },
    { n: 13, len: 9.5, w: 2.7, fill: 'var(--ch3)', off: 0.6 }
  ];
  rings.forEach(r => {
    for (let i = 0; i < r.n; i++) {
      const a = ((i + r.off) / r.n) * 360;
      const L = r.len, w = r.w;
      // slender petal with a rounded, slightly notched tip
      const d = `M0 -1.5 C${-w} ${f(-L * 0.35)} ${f(-w * 0.9)} ${f(-L * 0.9)} 0 ${-L} C${f(w * 0.9)} ${f(-L * 0.9)} ${w} ${f(-L * 0.35)} 0 -1.5Z`;
      s += `<path d="${d}" transform="rotate(${f(a)})" style="fill:${r.fill};stroke:var(--ch-edge)" stroke-width=".55"/>`;
    }
  });
  s += '<circle r="4.2" style="fill:var(--ch-heart)"/>';
  return s + '</g></symbol>';
}

// Natural banana leaf (see leaf.js). Its box is 455.19 x 144.97 and the base sits at 6.85% / 67.85%;
// assets/styles.css (.leaf) and assets/app.js (garland) use those numbers.
const leafSymbol = require('./leaf.js');
const naturalBanana = leafSymbol('banana', { W: 62, upper: 0.85, stem: 30, seed: 5, ctrl: [[0, 0], [150, -70], [300, -60], [420, 30]], tearsUp: [0.26, 0.4, 0.53, 0.66, 0.79], tearsLo: [0.22, 0.35, 0.48, 0.6, 0.72, 0.84] }).svg;


// Mamidi aaku (mango leaf) for the thoranam: hangs from its stem at (0,0) with the pointed tip downward.
function mango() {
  const L = 60, W = 9.5, N = 40;
  const half = (side) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, w = W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75) * (1 - 0.25 * t) * (t < 0.05 ? t / 0.05 : 1);
      const bend = 2.2 * Math.sin(Math.PI * t); // slight curve to the leaf
      pts.push([f(bend + side * w), f(4 + t * L)]);
    }
    return pts;
  };
  const midline = Array.from({ length: N + 1 }, (_, i) => { const t = i / N; return [f(2.2 * Math.sin(Math.PI * t)), f(4 + t * L)]; });
  const poly = (edge) => 'M' + midline.map(p => p.join(' ')).join('L') + 'L' + edge.slice().reverse().map(p => p.join(' ')).join('L') + 'Z';
  let veins = '';
  for (let i = 4; i < N - 3; i += 3) {
    const m = midline[i];
    for (const side of [1, -1]) { const e = half(side)[Math.min(N, i + 3)]; veins += `M${m[0]} ${m[1]}L${f(m[0] + (e[0] - m[0]) * 0.85)} ${f(m[1] + (e[1] - m[1]) * 0.85)}`; }
  }
  return '<symbol id="mamidi" viewBox="-12 -2 24 68" overflow="visible">' +
    '<path d="M0 0L0.6 5" style="stroke:var(--leaf-rib)" stroke-width="1.6" stroke-linecap="round"/>' +
    `<path d="${poly(half(1))}" style="fill:var(--leaf-hi)"/>` +
    `<path d="${poly(half(-1))}" style="fill:var(--leaf-c)"/>` +
    `<path d="${veins}" fill="none" style="stroke:var(--leaf-rib)" stroke-opacity=".35" stroke-width=".45"/>` +
    `<path d="M${midline.map(p => p.join(' ')).join('L')}" fill="none" style="stroke:var(--leaf-rib)" stroke-width="1" stroke-linecap="round"/>` +
    '</symbol>';
}

const snippet = [muggu('muggu', 5, 2, 10, 1.4, 1.5), muggu('muggu-sm', 3, 2, 10, 1.6, 1.7), naturalBanana, mango(), marigold(), chamanthi()].join('\n    ');
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const out = html.replace(/<!-- GEN:SYMBOLS:START -->[\s\S]*?<!-- GEN:SYMBOLS:END -->/,
  `<!-- GEN:SYMBOLS:START -->\n    ${snippet}\n    <!-- GEN:SYMBOLS:END -->`);
if (out === html) { console.error('markers not found'); process.exit(1); }
fs.writeFileSync(file, out);
console.log('injected', snippet.length, 'chars');
