// Generates sikku-style muggu: one continuous line weaving through an m x n dot grid.
// The line travels diagonally between the dots and loops around the outer edge dots.
function kolam(m, n, s) {
  const pts = [];
  let x = 1, y = 0, dx = 1, dy = 1;
  const start = [x, y, dx, dy].join();
  let guard = 0;
  do {
    pts.push([x, y]);
    x += dx; y += dy;
    if (x === 0 || x === 2 * m) dx = -dx;
    if (y === 0 || y === 2 * n) dy = -dy;
  } while ([x, y, dx, dy].join() !== start && ++guard < 10000);
  const f = v => +(v * s).toFixed(2);
  const P = pts.map(([a, b]) => [a, b]);
  // Push edge points outward a little so the outer loops wrap around the dots
  const out = 0.45;
  P.forEach(p => {
    if (p[0] === 0) p[0] -= out; if (p[0] === 2 * m) p[0] += out;
    if (p[1] === 0) p[1] -= out; if (p[1] === 2 * n) p[1] += out;
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const k = P.length;
  let d = 'M' + mid(P[k - 1], P[0]).map(f).join(' ');
  for (let i = 0; i < k; i++) {
    const c = P[i], e = mid(P[i], P[(i + 1) % k]);
    d += 'Q' + c.map(f).join(' ') + ' ' + e.map(f).join(' ');
  }
  const dots = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) dots.push([(2 * i + 1) * s, (2 * j + 1) * s]);
  return { d, dots, w: 2 * m * s, h: 2 * n * s, loops: guard };
}
module.exports = kolam;
if (require.main === module) {
  const [m, n, s] = process.argv.slice(2).map(Number);
  const r = kolam(m, n, s || 10);
  console.log(JSON.stringify(r));
}
