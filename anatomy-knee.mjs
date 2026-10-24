// An anatomical left knee in two views, redrawn from the knee angle and the model's loads.
// Side view: seen from the outer side, front of the knee to the right.
// Sunrise view: a slice through the groove seen from below, outer side on the right.
// Plain JS (no kit) so it inlines into the page as is.

const KN_C = [100, 122];
const knR = (d) => (d * Math.PI) / 180;
const knRot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const knAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const knSmooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const knF = (n) => (Math.round(n * 10) / 10).toString();

// Closed or open Catmull-Rom curve through points, as cubic Béziers.
function knCurve(points, closed = true) {
  const n = points.length;
  const at = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${knF(points[0][0])} ${knF(points[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${knF(c1[0])} ${knF(c1[1])} ${knF(c2[0])} ${knF(c2[1])} ${knF(p2[0])} ${knF(p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}

// The part of a closed Catmull-Rom curve from point `from` to point `to` (indices, forward).
function knCurveSeg(points, from, to) {
  const n = points.length;
  const at = (i) => points[((i % n) + n) % n];
  let d = `M${knF(at(from)[0])} ${knF(at(from)[1])}`;
  for (let i = from; i < to; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += `C${knF(p1[0] + (p2[0] - p0[0]) / 6)} ${knF(p1[1] + (p2[1] - p0[1]) / 6)} ${knF(p2[0] - (p3[0] - p1[0]) / 6)} ${knF(p2[1] - (p3[1] - p1[1]) / 6)} ${knF(p2[0])} ${knF(p2[1])}`;
  }
  return d;
}

// Points along a closed Catmull-Rom curve from index `from` to `to` (forward, may wrap).
function knSample(points, from, to, per = 8) {
  const n = points.length;
  const at = (i) => points[((i % n) + n) % n];
  const out = [];
  for (let i = from; i < to; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(at(to));
  return out;
}

// A layer of cartilage on a bone surface: the surface polyline and the same line moved
// `thick` into the bone (toward `inside`), tapered to nothing at both ends.
function knLayer(surface, inside, thick) {
  const inner = surface.map((p, i) => {
    const a = surface[Math.max(0, i - 1)];
    const b = surface[Math.min(surface.length - 1, i + 1)];
    let n = [-(b[1] - a[1]), b[0] - a[0]];
    const l = Math.hypot(n[0], n[1]) || 1;
    n = [n[0] / l, n[1] / l];
    if (n[0] * (inside[0] - p[0]) + n[1] * (inside[1] - p[1]) < 0) n = [-n[0], -n[1]];
    const u = i / (surface.length - 1);
    const taper = Math.min(1, Math.min(u, 1 - u) * 6);
    return [p[0] + n[0] * thick * taper, p[1] + n[1] * thick * taper];
  });
  const pts = [...surface, ...inner.reverse()];
  return "M" + pts.map((p) => `${knF(p[0])} ${knF(p[1])}`).join("L") + "Z";
}
const knSurf = (surface) => "M" + surface.map((p) => `${knF(p[0])} ${knF(p[1])}`).join("L");

// A tapered band (tendon, ligament) along a quadratic curve a → b bent by `bow`.
function knBand(a, b, w0, w1, bow = 0, steps = 14) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ctrl = [mid[0] - (dy / len) * bow, mid[1] + (dx / len) * bow];
  const pt = (t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]];
  const left = [];
  const right = [];
  const fibres = [[], [], []];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = pt(t);
    const q = pt(Math.min(1, t + 0.01));
    const r = pt(Math.max(0, t - 0.01));
    const tx = q[0] - r[0];
    const ty = q[1] - r[1];
    const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl;
    const ny = tx / tl;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
    [-0.5, 0, 0.5].forEach((k, j) => fibres[j].push([p[0] + nx * w * k, p[1] + ny * w * k]));
  }
  const outline = knCurve([...left, ...right.reverse()]);
  return { outline, fibres: fibres.map((f) => knCurve(f.slice(1, -1), false)).join(""), mid: pt(0.5) };
}

const KN_FEMUR = [[84, -8], [83, 30], [80, 66], [73, 92], [68, 116], [70, 138], [82, 152], [100, 156], [117, 151], [127, 139], [131, 123], [129, 104], [123, 86], [117, 64], [115, 30], [115, -8]];
const KN_TIBIA = [[-31, 41], [-25, 37.5], [-6, 38.5], [1, 33.5], [7, 38.5], [27, 37.5], [33, 42], [32, 52], [35, 64], [31, 80], [26, 92], [24, 104], [-8, 104], [-11, 92], [-17, 82], [-29, 60], [-33, 48]];

// Distance from the condyle centre to the femur's front surface along angle `a`.
function knSurface(a) {
  const dir = [Math.cos(a), Math.sin(a)];
  let best = 40;
  for (let i = 0; i < KN_FEMUR.length; i++) {
    const p = KN_FEMUR[i];
    const q = KN_FEMUR[(i + 1) % KN_FEMUR.length];
    const e = [q[0] - p[0], q[1] - p[1]];
    const w = [p[0] - KN_C[0], p[1] - KN_C[1]];
    const den = dir[0] * e[1] - dir[1] * e[0];
    if (Math.abs(den) < 1e-9) continue;
    const t = (w[0] * e[1] - w[1] * e[0]) / den;
    const u = (w[0] * dir[1] - w[1] * dir[0]) / den;
    if (t > 0 && u >= 0 && u <= 1) best = t;
  }
  return best;
}

const knHeat = (v) => Math.min(0.85, Math.max(0, v)).toFixed(2);

function knSide(st) {
  const theta = st.flexion;
  const roll = 0.07 * theta;
  const tib = (p) => knAdd(KN_C, knRot([p[0] + roll, p[1]], knR(theta)));
  const phi = knR(-46 + 0.78 * Math.min(theta, 125));
  const radius = knSurface(phi) + 11;
  const pc = knAdd(KN_C, [Math.cos(phi) * radius, Math.sin(phi) * radius]);
  const psi = knR(0.72 * Math.min(theta, 125));
  const pat = (r, t) => knAdd(pc, knRot([r, t], psi));
  const base = pat(1, -22);
  const apex = pat(0, 24.5);
  const tubercle = tib([33, 64]);
  const quad = knBand([112, -14], base, 19, 15, -3);
  const patTendon = knBand(apex, tubercle, 11, 13.5, 2);
  const lcl = knBand([94, 116], tib([-23, 64]), 6, 5, -1);
  const acl = knBand([86, 124], tib([13, 36]), 6, 7);
  const pcl = knBand([106, 128], tib([-24, 42]), 7, 7, -2);
  const tendonHeat = st.tendon / 5.5;
  const facetHeat = st.mpa / 11;
  const patellaShape = knCurve([[-11, -18], [-5, -23.5], [5, -22], [10.5, -12], [11, 2], [7, 16], [1, 25], [-5, 20], [-11, 6]].map(([r, t]) => pat(r, t)));
  const patPts = [[-11, -18], [-5, -23.5], [5, -22], [10.5, -12], [11, 2], [7, 16], [1, 25], [-5, 20], [-11, 6]].map(([r, t]) => pat(r, t));
  const patSurface = knSample(patPts, 7, 9);
  const patCart = knLayer(patSurface, pc, 4.6);
  const crackAt = patSurface[Math.floor(patSurface.length * 0.45)];
  const crackDir = [pc[0] - crackAt[0], pc[1] - crackAt[1]];
  const crackLen = Math.hypot(crackDir[0], crackDir[1]) || 1;
  const sideCrack = `M${knF(crackAt[0])} ${knF(crackAt[1])}L${knF(crackAt[0] + (crackDir[0] / crackLen) * 4.6)} ${knF(crackAt[1] + (crackDir[1] / crackLen) * 4.6)}`;
  const femSurface = knSample(KN_FEMUR, 6, 11);
  const femCart = knLayer(femSurface, KN_C, 3.2);
  const meniscus = (pts) => knCurve(pts.map(tib));
  const muscle = knCurve([[106, -30], [126, -30], [133, 0], [128, 30], [118, 50], [113, 30], [110, 0]]);
  const label = (text, p, anchor = "start") => `<text class="kn-lab" x="${knF(p[0])}" y="${knF(p[1])}" text-anchor="${anchor}">${text}</text>`;
  const tibiaPath = knCurve(KN_TIBIA.map(tib));
  const fibula = knCurve([[-30, 62], [-20, 60], [-17, 72], [-20, 82], [-19, 103], [-25, 103], [-27, 84], [-32, 74]].map(tib));
  return [
    `<path class="kn-muscle" d="${muscle}"/>`,
    theta < 60 ? `<ellipse class="kn-cyst" cx="${knF(KN_C[0] - 44)}" cy="${knF(KN_C[1] + 22)}" rx="6.5" ry="4.5"/>` : "",
    `<path class="kn-bone" d="${tibiaPath}"/>`,
    `<path class="kn-bone" d="${knCurve(KN_FEMUR)}"/>`,
    `<path class="kn-cartfill" d="${femCart}"/><path class="kn-gloss" d="${knSurf(femSurface)}"/>`,
    `<path class="kn-menis" d="${meniscus([[8, 37], [30, 37], [33, 41], [12, 40.5]])}"/>`,
    `<path class="kn-menis" d="${meniscus([[-31, 41], [-27, 37], [-8, 37.5], [-12, 40.5]])}"/>`,
    `<g class="kn-ghost"><path class="kn-lig" d="${pcl.outline}"/><path class="kn-fib" d="${pcl.fibres}"/><path class="kn-lig" d="${acl.outline}"/><path class="kn-fib" d="${acl.fibres}"/></g>`,
    `<path class="kn-bone kn-fibula" d="${fibula}"/>`,
    `<path class="kn-lig" d="${lcl.outline}"/><path class="kn-fib" d="${lcl.fibres}"/>`,
    `<path class="kn-tendon" d="${quad.outline}"/><path class="kn-heat" style="opacity:${knHeat(tendonHeat * 0.8)}" d="${quad.outline}"/><path class="kn-fib" d="${quad.fibres}"/>`,
    `<path class="kn-tendon" d="${patTendon.outline}"/><path class="kn-heat" style="opacity:${knHeat(tendonHeat)}" d="${patTendon.outline}"/><path class="kn-fib" d="${patTendon.fibres}"/>`,
    `<path class="kn-bone kn-patella" d="${patellaShape}"/>`,
    `<path class="kn-cartfill" d="${patCart}"/><path class="kn-heat" style="opacity:${knHeat(facetHeat)}" d="${patCart}"/><path class="kn-gloss" d="${knSurf(patSurface)}"/><path class="kn-crack" d="${sideCrack}"/>`,
    label("Femur", [74, 30], "end"),
    label("Quadriceps", [136, -22]),
    label("Quad tendon", [Math.min(quad.mid[0] + 13, 140), quad.mid[1] + 4]),
    label("Kneecap", [pc[0] + 15, pc[1] + 2]),
    label("Patellar", [patTendon.mid[0] + 11, patTendon.mid[1] - 2]),
    label("tendon", [patTendon.mid[0] + 11, patTendon.mid[1] + 7]),
    label("ACL · PCL (inside)", [KN_C[0] - 2, KN_C[1] - 6], "middle"),
    label("LCL", [lcl.mid[0] - 8, lcl.mid[1] - 3], "end"),
    label("Meniscus", [tib([-36, 52])[0] - 2, tib([-36, 52])[1] + 6], "end"),
    label("Tibia", [tib([7, 90])[0], tib([7, 90])[1]], "middle"),
    label("Fibula", [tib([-34, 96])[0] - 3, tib([-34, 96])[1]], "end"),
    theta < 30 ? label("Baker's cyst", [KN_C[0] - 52, KN_C[1] + 18], "end") : "",
  ].join("");
}

function knAxial(st) {
  const grip = knSmooth(8, 38, st.flexion);
  const latPeak = 66 - 9 * grip;
  const medPeak = 76 - 7 * grip;
  const groove = 100;
  const femurPts = [[30, 112], [42, 86], [64, medPeak], [88, 90], [110, groove], [136, 86], [162, latPeak], [188, 84], [196, 118], [180, 160], [140, 176], [110, 170], [78, 176], [42, 162]];
  const femur = knCurve(femurPts);
  const femSurface = knSample(femurPts, 1, 7);
  const cart = knLayer(femSurface, [110, 140], 3.4);
  const shift = st.shift * 2.4;
  const tilt = knR(st.shift * 1.6);
  const centre = [110 + shift, groove - 13 - st.shift * 0.9 + grip * 2];
  const pat = (p) => knAdd(centre, knRot(p, tilt));
  const patella = knCurve([[0, 10], [34, -4], [33, -11], [20, -22], [-14, -22], [-27, -11], [-26, -3]].map(pat));
  const patPts = [[0, 10], [34, -4], [33, -11], [20, -22], [-14, -22], [-27, -11], [-26, -3]].map(pat);
  const patSurface = knSample(patPts, 6, 8);
  const facet = knLayer(patSurface, centre, 5);
  const crack = [pat([17, 2.6]), pat([16, -3])];
  const mpfl = knBand(pat([-24, -3]), [40, 104], 6, 5, 4);
  const retin = knBand(pat([32, -7]), [192, 100], 5, 5, -4);
  const label = (text, p, anchor = "start") => `<text class="kn-lab" x="${knF(p[0])}" y="${knF(p[1])}" text-anchor="${anchor}">${text}</text>`;
  const heat = knHeat(st.mpa / 11);
  return [
    `<path class="kn-bone" d="${femur}"/>`,
    `<path class="kn-cartfill" d="${cart}"/><path class="kn-gloss" d="${knSurf(femSurface)}"/>`,
    `<path class="kn-lig" d="${mpfl.outline}"/><path class="kn-fib" d="${mpfl.fibres}"/>`,
    `<path class="kn-lig" d="${retin.outline}"/><path class="kn-fib" d="${retin.fibres}"/>`,
    `<path class="kn-bone kn-patella" d="${patella}"/>`,
    `<path class="kn-cartfill" d="${facet}"/><path class="kn-heat" style="opacity:${heat}" d="${facet}"/><path class="kn-gloss" d="${knSurf(patSurface)}"/>`,
    `<path class="kn-crack" d="M${knF(crack[0][0])} ${knF(crack[0][1])}L${knF(crack[1][0])} ${knF(crack[1][1])}"/>`,
    `<line class="kn-centre" x1="110" y1="${groove + 6}" x2="110" y2="${groove + 22}"/>`,
    label("Kneecap", [centre[0] + 3, centre[1] - 9], "middle"),
    label("Femur (groove)", [110, 150], "middle"),
    label("MPFL", [44, 122], "middle"),
    label("Retinaculum", [182, 118], "end"),
    label("Crack", [crack[1][0] + 4, crack[1][1] + 12]),
    label("INNER", [12, 194]),
    label("OUTER", [208, 194], "end"),
    label(`shift ${st.shift.toFixed(1)} mm`, [110, 194], "middle"),
  ].join("");
}


// Front view: looking at the left knee from the front, as in a mirror. Outer side on the right.
// 1.3 units per mm. The kneecap slides down the groove as the knee bends and sideways by the
// model's shift; the patellar tendon runs to the shin bump 17 mm outward of the groove centre.
const KN_FRONT_FEMUR = [[96, -16], [124, -16], [125, 30], [132, 62], [150, 82], [163, 100], [164, 118], [154, 129], [136, 127], [118, 120], [110, 112], [102, 120], [84, 128], [64, 130], [56, 116], [58, 96], [74, 74], [90, 56], [95, 30]];
const KN_FRONT_TIBIA = [[62, 138], [84, 135], [104, 136], [108, 131], [113, 136], [138, 135], [160, 138], [162, 148], [150, 160], [138, 170], [134, 184], [130, 232], [94, 232], [92, 184], [80, 166], [66, 156], [60, 148]];
const KN_TUBERCLE_X = 110 + 17 * 1.3;
function knFront(st) {
  const theta = Math.min(st.flexion, 120);
  const shift = st.shift * 1.3;
  const cx = 110 + shift;
  const cy = 76 + 0.28 * theta;
  const tilt = knR(st.shift * 1.2);
  const pat = (p) => knAdd([cx, cy], knRot(p, tilt));
  const patPts = [[0, -27], [16, -23], [24, -10], [21, 6], [11, 20], [0, 27], [-11, 19], [-21, 5], [-23, -10], [-15, -23]].map(pat);
  const base = pat([2, -25]);
  const apex = pat([0, 25]);
  const tubercle = [KN_TUBERCLE_X, 182];
  const quad = knBand([118, -16], base, 26, 22, 0);
  const patTendon = knBand(apex, tubercle, 14, 16, 0);
  const mcl = knBand([62, 100], [78, 205], 12, 10, -2);
  const lcl = knBand([161, 104], [168, 150], 5, 5, 1);
  const tendonHeat = st.tendon / 5.5;
  const label = (text, p, anchor = "start") => `<text class="kn-lab" x="${knF(p[0])}" y="${knF(p[1])}" text-anchor="${anchor}">${text}</text>`;
  const menisci = [knCurve([[60, 133], [82, 131], [88, 134], [62, 137]]), knCurve([[136, 131], [160, 133], [161, 137], [134, 134]])];
  const groove = `<path class="kn-ridge" d="${knCurve([[94, 58], [92, 86], [100, 108]], false)}"/><path class="kn-ridge" d="${knCurve([[128, 56], [134, 84], [122, 108]], false)}"/>`;
  return [
    `<path class="kn-muscle" d="${knCurve([[88, -32], [134, -32], [140, -4], [130, 22], [118, 34], [104, 26], [92, 0]])}"/>`,
    `<path class="kn-bone" d="${knCurve(KN_FRONT_TIBIA)}"/>`,
    `<path class="kn-bone kn-fibula" d="${knCurve([[158, 148], [170, 144], [176, 154], [172, 166], [172, 232], [164, 232], [163, 168], [157, 158]])}"/>`,
    `<path class="kn-bone" d="${knCurve(KN_FRONT_FEMUR)}"/>`,
    groove,
    ...menisci.map((d) => `<path class="kn-menis" d="${d}"/>`),
    `<path class="kn-lig" d="${mcl.outline}"/><path class="kn-fib" d="${mcl.fibres}"/>`,
    `<path class="kn-lig" d="${lcl.outline}"/><path class="kn-fib" d="${lcl.fibres}"/>`,
    `<line class="kn-centre" x1="110" y1="40" x2="110" y2="226"/>`,
    `<line class="kn-centre" x1="${knF(KN_TUBERCLE_X)}" y1="176" x2="${knF(KN_TUBERCLE_X)}" y2="226"/>`,
    `<path class="kn-bracket" d="M110 220L${knF(KN_TUBERCLE_X)} 220"/>`,
    `<path class="kn-tendon" d="${quad.outline}"/><path class="kn-heat" style="opacity:${knHeat(tendonHeat * 0.8)}" d="${quad.outline}"/><path class="kn-fib" d="${quad.fibres}"/>`,
    `<path class="kn-tendon" d="${patTendon.outline}"/><path class="kn-heat" style="opacity:${knHeat(tendonHeat)}" d="${patTendon.outline}"/><path class="kn-fib" d="${patTendon.fibres}"/>`,
    `<ellipse class="kn-bump" cx="${knF(KN_TUBERCLE_X)}" cy="184" rx="7" ry="5"/>`,
    `<path class="kn-bone kn-patella" d="${knCurve(patPts)}"/>`,
    label("Femur", [70, 40], "end"),
    label("Quadriceps", [146, -20]),
    label("Kneecap", [cx + 27, cy - 4]),
    label("Groove", [97, 98], "end"),
    label("MCL", [58, 168], "end"),
    label("LCL", [176, 124]),
    label("Patellar", [patTendon.mid[0] - 11, patTendon.mid[1] - 2], "end"),
    label("tendon", [patTendon.mid[0] - 11, patTendon.mid[1] + 6], "end"),
    label("Shin bump", [KN_TUBERCLE_X + 10, 196]),
    label("Tibia", [104, 214], "middle"),
    label("Fibula", [178, 220]),
    label("TT-TG 17 mm", [(110 + KN_TUBERCLE_X) / 2, 231], "middle"),
    label("INNER", [8, 236]),
    label("OUTER", [214, 236], "end"),
  ].join("");
}

// A small front-view knee showing where the slice is cut and which way it is seen.
function knLocator(st) {
  const sx = 0.17;
  const map = (pts) => knCurve(pts.map(([x, y]) => [4 + x * sx, 6 + y * sx]));
  const cutY = 6 + (76 + 0.28 * Math.min(st.flexion, 120)) * sx;
  return `<g class="kn-loc"><path class="kn-bone" d="${map(KN_FRONT_FEMUR)}"/><path class="kn-bone" d="${map(KN_FRONT_TIBIA)}"/><circle class="kn-loc-pat" cx="${knF(4 + (110 + st.shift * 1.3) * sx)}" cy="${knF(cutY)}" r="3.6"/><path class="kn-cut" d="M0 ${knF(cutY)}L46 ${knF(cutY)}"/><path class="kn-eye" d="M19 54L23 49L27 54"/><text class="kn-lab" x="50" y="${knF(cutY + 2)}">cut across here</text><text class="kn-lab" x="31" y="55">looking up from the feet</text></g>`;
}

const KN_KEY = `<div class="kn-anat-key"><p><span class="kn-sw" data-k="bone"></span><b>Bone</b></p><p><span class="kn-sw" data-k="cart"></span><b>Cartilage</b>: a smooth, glassy layer capping the bone ends. It's thin: about 2–3 mm on the femur's groove and 4–6 mm on the back of the kneecap, the thickest in your body. It has no nerves or blood supply, so it doesn't hurt itself; pain comes from the bone under it.</p><p><span class="kn-sw" data-k="crack"></span><b>The crack</b>: your MRI's "tiny linear full-thickness denuding" on the kneecap's outer facet. A hairline split through that layer, down to the bone, with irritated bone (edema) beneath it. Size exaggerated so you can see it.</p><p><span class="kn-sw" data-k="tendon"></span><b>Tendon</b> (muscle to bone) · <span class="kn-sw" data-k="lig"></span><b>Ligament</b> (bone to bone)</p><p><span class="kn-sw" data-k="heat"></span><b>Red</b> = load right now: tendon force, and stress on the outer facet</p></div>`;

export function anatPanel() {
  const view = (cls, box, label, caption) => `<figure class="kn-anat-view"><svg viewBox="${box}" role="img" aria-label="${label}"><g data-anat="${cls}"></g></svg><figcaption>${caption}</figcaption></figure>`;
  return `<div class="kn-anat">${view("side", "-62 -36 250 266", "Side view of the left knee, seen from the outer side", "Side view, from the outer side")}${view("front", "0 -36 220 278", "Front view of the left knee", "Front view, as in a mirror")}${view("axial", "0 0 220 202", "The kneecap in its groove, in a slice across the knee seen from the feet", "Slice across the knee, seen from the feet")}${KN_KEY}</div>`;
}

export function anatDraw(root, st) {
  const side = root.querySelector('[data-anat="side"]');
  const front = root.querySelector('[data-anat="front"]');
  const axial = root.querySelector('[data-anat="axial"]');
  if (side) side.innerHTML = knSide(st);
  if (front) front.innerHTML = knFront(st);
  if (axial) axial.innerHTML = knLocator(st) + knAxial(st);
}

export const ANAT_CSS = `
.kn-anat{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 4px;--kn-bone:#cfc4ab;--kn-bone-edge:#efe6d2;--kn-cart:#8fb4c6;--kn-cart-edge:#cfe3ec;--kn-gloss:#eef7fb;--kn-tendon:#d8d0bf;--kn-tendon-edge:#f4eee2;--kn-fib:#aba18c;--kn-lig:#bdae8c;--kn-lig-edge:#e6d9bb;--kn-muscle:#8a4a42;--kn-muscle-edge:#c07a6f;--kn-menis:#c9c1b0;--kn-heat:#ff5a5f;--kn-lab:#d0d0d0;--kn-panel:#191919}
.iso[data-theme="light"] .kn-anat{--kn-bone:#efe6d2;--kn-bone-edge:#8c7d60;--kn-cart:#cfe2ea;--kn-cart-edge:#6f9db1;--kn-gloss:#ffffff;--kn-tendon:#f5f0e6;--kn-tendon-edge:#9a8f78;--kn-fib:#cdc3ad;--kn-lig:#e6d7b5;--kn-lig-edge:#91805b;--kn-muscle:#d79a90;--kn-muscle-edge:#a35a4f;--kn-menis:#e8e1d3;--kn-heat:#e5484d;--kn-lab:#6f6f74;--kn-panel:#f4f3ef}
.kn-anat-view{margin:0;background:var(--kn-panel);border-radius:4px;padding:6px 6px 4px}
.kn-anat-view svg{display:block;width:100%;height:auto}
.kn-anat-view figcaption{font:10.5px/1.3 var(--anatomy-mono);color:var(--anatomy-muted);text-align:center;letter-spacing:.04em;margin-top:2px}
.kn-anat path,.kn-anat ellipse{stroke-width:.7;stroke-linejoin:round}
.kn-bone{fill:var(--kn-bone);stroke:var(--kn-bone-edge)}
.kn-patella{stroke-width:.9!important}
.kn-fibula{opacity:.96}
.kn-cartfill{fill:var(--kn-cart);stroke:var(--kn-cart-edge);stroke-width:.5!important}
.kn-gloss{fill:none;stroke:var(--kn-gloss);stroke-width:.8!important;stroke-linecap:round}
.kn-menis{fill:var(--kn-menis);stroke:var(--kn-bone-edge)}
.kn-tendon{fill:var(--kn-tendon);stroke:var(--kn-tendon-edge)}
.kn-lig{fill:var(--kn-lig);stroke:var(--kn-lig-edge)}
.kn-fib{fill:none;stroke:var(--kn-fib);stroke-width:.45!important}
.kn-muscle{fill:var(--kn-muscle);stroke:var(--kn-muscle-edge);opacity:.75}
.kn-ridge{fill:none;stroke:var(--kn-bone-edge);stroke-width:.6!important;opacity:.55}
.kn-bracket{fill:none;stroke:var(--kn-heat);stroke-width:1!important}
.kn-bump{fill:var(--kn-bone);stroke:var(--kn-bone-edge)}
.kn-loc .kn-bone{stroke-width:.4!important}
.kn-loc-pat{fill:var(--kn-bone);stroke:var(--kn-bone-edge);stroke-width:.5}
.kn-cut{stroke:var(--kn-heat);stroke-width:.9;stroke-dasharray:2 1.5}
.kn-eye{fill:none;stroke:var(--kn-lab);stroke-width:.8}
.kn-anat-key{font-size:11.5px;line-height:1.45;color:var(--anatomy-text);padding:8px 4px}
.kn-anat-key p{margin:0 0 7px}
.kn-anat-key b{color:var(--anatomy-strong);font-weight:600}
.kn-sw{display:inline-block;width:11px;height:8px;border-radius:2px;margin-right:6px;vertical-align:0;border:1px solid var(--kn-bone-edge)}
.kn-sw[data-k="bone"]{background:var(--kn-bone)}
.kn-sw[data-k="cart"]{background:var(--kn-cart);border-color:var(--kn-cart-edge)}
.kn-sw[data-k="crack"]{background:var(--kn-heat);height:3px;border:0;vertical-align:2px}
.kn-sw[data-k="tendon"]{background:var(--kn-tendon)}
.kn-sw[data-k="lig"]{background:var(--kn-lig)}
.kn-sw[data-k="heat"]{background:var(--kn-heat);border:0;opacity:.75}
.kn-cyst{fill:var(--kn-cart);stroke:var(--kn-cart-edge);opacity:.7}
.kn-ghost{opacity:.55}
.kn-heat{fill:var(--kn-heat);stroke:none}
.kn-crack{stroke:var(--kn-heat);stroke-width:1.6!important;stroke-linecap:round}
.kn-centre{stroke:var(--kn-lab);stroke-width:.6;stroke-dasharray:2 2}
.kn-lab{font:6.5px var(--anatomy-mono);fill:var(--kn-lab);letter-spacing:.02em;paint-order:stroke;stroke:var(--kn-panel);stroke-width:2.2px;stroke-linejoin:round}
@media (max-width:560px){.kn-anat{grid-template-columns:1fr}}
`;
