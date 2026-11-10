// A more natural banana leaf: long even blade, blunt rounded tip, tapered pale midrib,
// two-tone halves (one catching light), and ragged strips torn along the veins.
const f = v => +v.toFixed(1);

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function leafSymbol(id, o) {
  const R = rng(o.seed || 7);
  const [P0, P1, P2, P3] = o.ctrl;
  const bez = t => { const u = 1 - t; return [0, 1].map(k => u * u * u * P0[k] + 3 * u * u * t * P1[k] + 3 * u * t * t * P2[k] + t * t * t * P3[k]); };
  const der = t => { const u = 1 - t; return [0, 1].map(k => 3 * u * u * (P1[k] - P0[k]) + 6 * u * t * (P2[k] - P1[k]) + 3 * t * t * (P3[k] - P2[k])); };
  const nrm = t => { const d = der(t), m = Math.hypot(d[0], d[1]); return [d[1] / m, -d[0] / m]; }; // left of travel = "up"
  const W = o.W;
  const width = t => {
    let w = W * (1 - 0.18 * t);
    if (t < 0.1) w *= Math.sqrt(Math.max(0, 1 - Math.pow((0.1 - t) / 0.1, 2))) * 0.85 + 0.15 * (t / 0.1);
    // soft taper to a slightly pointed, leaf-like tip (not a rounded knob)
    if (t > 0.72) { const k = (t - 0.72) / 0.28; w *= Math.max(0, 1 - Math.pow(k, 1.5)) * (1 - 0.15 * k); }
    return w;
  };
  const slant = 0.022;
  const edge = (t, side, k) => {
    const tt = Math.min(1, t + slant * (t < 0.9 ? 1 : (1 - t) / 0.1));
    const c = bez(t), n = nrm(t), w = width(tt) * (side > 0 ? o.upper : 1) * (k || 1);
    return [c[0] + n[0] * w * side, c[1] + n[1] * w * side];
  };
  const parts = [];
  const veinD = { 1: '', [-1]: '' };
  for (const side of [1, -1]) {
    const tears = (side > 0 ? o.tearsUp : o.tearsLo);
    const bounds = [0].concat(tears, [1]);
    for (let s = 0; s < bounds.length - 1; s++) {
      const a = bounds[s], b = bounds[s + 1];
      const gapA = s === 0 ? 0 : 0.007, gapB = s === bounds.length - 2 ? 0 : 0.007;
      const rag = s === 0 ? 1 : 0.93 + R() * 0.07;
      const pts = [];
      const steps = Math.max(4, Math.round((b - a) * 120));
      for (let i = 0; i <= steps; i++) pts.push(bez(a + (b - a) * i / steps));
      for (let i = steps; i >= 0; i--) {
        const t = a + gapA + (b - gapB - a - gapA) * i / steps;
        const wave = 1 + 0.025 * Math.sin(t * 90 + s);
        pts.push(edge(t, side, rag * wave));
      }
      parts.push(`<path d="M${pts.map(p => p.map(f).join(' ')).join('L')}Z" style="fill:${side > 0 ? 'var(--leaf-hi)' : 'var(--leaf-c)'}"/>`);
      for (let t = a + 0.012; t < b - 0.006; t += 0.011) {
        const c = bez(t), e = edge(t, side, rag * 0.97);
        veinD[side] += `M${f(c[0])} ${f(c[1])}L${f(e[0])} ${f(e[1])}`;
      }
    }
  }
  // tapered midrib
  const rib = [], ribB = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60 * 0.97, c = bez(t), n = nrm(t), w = 3.4 * (1 - t) + 0.5;
    rib.push([c[0] + n[0] * w, c[1] + n[1] * w]); ribB.push([c[0] - n[0] * w, c[1] - n[1] * w]);
  }
  const ribD = 'M' + rib.concat(ribB.reverse()).map(p => p.map(f).join(' ')).join('L') + 'Z';
  // petiole (stem) running back from the base
  const d0 = der(0), m0 = Math.hypot(d0[0], d0[1]), sx = -d0[0] / m0 * o.stem, sy = -d0[1] / m0 * o.stem;
  const stem = `M0 0L${f(sx)} ${f(sy)}`;

  // bounds
  let minX = Math.min(0, sx), maxX = 0, minY = Math.min(0, sy), maxY = Math.max(0, sy);
  for (let i = 0; i <= 100; i++) for (const side of [1, -1]) { const e = edge(i / 100, side); minX = Math.min(minX, e[0]); maxX = Math.max(maxX, e[0]); minY = Math.min(minY, e[1]); maxY = Math.max(maxY, e[1]); }
  const pad = 4; minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const vw = maxX - minX, vh = maxY - minY;
  const svg = `<symbol id="${id}" viewBox="${f(minX)} ${f(minY)} ${f(vw)} ${f(vh)}" overflow="visible">` +
    `<path d="${stem}" style="stroke:var(--leaf-rib)" stroke-width="6" stroke-linecap="round"/>` +
    parts.join('') +
    `<path d="${veinD[1]}" fill="none" style="stroke:var(--leaf-c)" stroke-opacity=".28" stroke-width=".8"/>` +
    `<path d="${veinD[-1]}" fill="none" style="stroke:var(--leaf-hi)" stroke-opacity=".22" stroke-width=".8"/>` +
    `<path d="${ribD}" style="fill:var(--leaf-rib)"/></symbol>`;
  // where the leaf base (0,0) sits, as a fraction of the symbol box: for CSS transform-origin
  return { svg, vw, vh, baseX: -minX / vw, baseY: -minY / vh };
}

module.exports = leafSymbol;

if (require.main === module) {
  const { chromium } = require('playwright');
  const variants = {
    A: { W: 46, upper: 0.82, stem: 50, seed: 3, ctrl: [[0, 0], [150, -90], [320, -95], [440, -10]], tearsUp: [0.3, 0.46, 0.6, 0.77], tearsLo: [0.24, 0.4, 0.55, 0.69, 0.84] },
    B: { W: 50, upper: 0.7, stem: 40, seed: 11, ctrl: [[0, 0], [160, -60], [330, -40], [430, 40]], tearsUp: [0.38, 0.62, 0.8], tearsLo: [0.3, 0.5, 0.66, 0.83] },
  };
  let html = '<body style="margin:0;background:#FFF9F1;padding:30px;--leaf-c:#2F6B3A;--leaf-hi:color-mix(in srgb,#2F6B3A 72%,#d8eeb0);--leaf-rib:color-mix(in srgb,#2F6B3A 40%,#f1f6d8)">';
  for (const [k, v] of Object.entries(variants)) {
    const s = leafSymbol('l' + k, v);
    html += `<svg width="0" height="0" style="position:absolute"><defs>${s.svg}</defs></svg>`;
    html += `<div style="display:inline-block;margin:10px;font:12px sans-serif">${k}<br><svg width="520" height="${f(520 * s.vh / s.vw)}"><use href="#l${k}"/></svg></div>`;
    // cluster, like a plant in a corner
    html += `<div style="display:inline-block;position:relative;width:300px;height:330px;border:1px dashed #ddd;margin:10px">`;
    for (const [rot, wd, op] of [[-100, 300, 1], [-70, 320, 1], [-40, 270, 1]]) {
      const h = wd * s.vh / s.vw;
      html += `<svg style="position:absolute;left:0;bottom:0;width:${wd}px;height:${h}px;overflow:visible;transform-origin:${(s.baseX * 100).toFixed(1)}% ${(s.baseY * 100).toFixed(1)}%;transform:translate(${(-s.baseX * 100).toFixed(1)}%, ${((1 - s.baseY) * 100).toFixed(1)}%) rotate(${rot}deg) scaleY(-1);opacity:${op}"><use href="#l${k}"/></svg>`;
    }
    html += '</div>';
  }
  (async () => {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
    await p.setContent(html); await p.screenshot({ path: process.argv[2] + '/leaf2.png' }); await b.close();
  })();
}
