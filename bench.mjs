// Fig 1: the patella tracking bench. Static art built here; the live script moves it.
import * as k from "./vendor/anatomy/kit/iso-kit.mjs";
import * as G from "./vendor/anatomy/kit/lathe.mjs";
import * as Q from "./parts.mjs";

export const WIDTH = 640;
export const HEIGHT = 430;
const U = 2; // world units per millimetre

// Groove (trochlea): floor at Z0, lateral wall on +y, medial ramp on -y.
export const Z0 = 14;
const TRACK = [-92, 92];
const TAN_L = Math.tan((32 * Math.PI) / 180);
const TAN_M = Math.tan((22 * Math.PI) / 180);
const WALL_Y = 70;
const along = (x) => (x - TRACK[0]) / (TRACK[1] - TRACK[0]);
const hL = (x) => 8 + 26 * along(x);
const hM = (x) => 5 + 15 * along(x);

// Sled (patella) travel: knee angle → sled centre on x.
export const SLED_HALF = 38;
export const xAt = (flexion) => -55 + (flexion * 110) / 120;
export const LIFT = TAN_L;
export const UNITS_PER_MM = U;

// Quadriceps spool, tibial carriage, medial post, gauge.
export const SPOOL = { x: -172, z: 60, r: 18 };
const CHEEK_Y = 40;
export const CRANK_Y = -47;
export const CRANK_R = 13;
export const TIBIA_GAP = 168;
export const TIBIA_Y = 17 * U; // TT-TG, mm → units
const CARRIAGE_Z = 10;
export const CARRIAGE_TOP = CARRIAGE_Z + 6;
export const ANCHOR = { w: 28, d: 20, h: 26 };
export const POST = [-20, -58];
export const POST_TOP = 46;
export const GAUGE = { x: 6, y: 98, z: 112, r: 27 };
export const CHART = { x: -104, y: -108, w: 208, d: 30, r: 2 };
export const PAPER = { x: CHART.x + 6, y: CHART.y + 4, w: CHART.w - 12, d: 22, r: 0.5 };
export const PADS = Array.from({ length: 12 }, (_, i) => -84 + i * 15);

const PLATE = { x: -222, y: -118, w: 510, d: 236, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

// Sled section relative to its keel: lateral facet at 32°, medial at 22°, domed front.
const SLED_SECTION = [[0, 0], [26, 26 * TAN_L], [27.5, 23], [20, 29.5], [-5, 31], [-14.5, 25], [-16, 16 * TAN_M]];

export const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GAUGE.x, GAUGE.y, GAUGE.z + GAUGE.r + 4], [SPOOL.x, 0, SPOOL.z + 30]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: -62, elevation: 38 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const AY = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const alongY = (x, z, y = 0) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const seg = (a, b) => k.segment(a, b, P);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -PLATE_H + 4, P), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  return out.join("");
}

function labelPlate() {
  const plan = { x: 214, y: -104, w: 46, d: 22, r: 1.5 };
  const out = [S(k.slabOf(plan, 0, 0.8, P, 4), { tone: "lo", crease: "none" })];
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([plan.x + 6, plan.y + 15.5], 0.8, P, "x"), "L KNEE · PF", { size: 4.2, tone: "mid" }));
  for (const [y, w] of [[plan.y + 10, 30], [plan.y + 7, 22], [plan.y + 4.4, 26]]) out.push(L(k.lineOnTop([plan.x + 6, y], [plan.x + 6 + w, y], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([plan.x + 3, plan.y + 3, 0.8]), at([plan.x + plan.w - 3, plan.y + plan.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

function spool() {
  const out = [];
  const { x, z, r } = SPOOL;
  // Pedestal plinth with bolts, then two cheek plates.
  const plinth = { x: x - 34, y: -CHEEK_Y - 10, w: 68, d: CHEEK_Y * 2 + 20, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plinth, 0, 6, P)}"/>`);
  out.push(S(k.slabOf(plinth, 0, 6, P, 4, 0.8), { tone: "mid" }));
  out.push(D(k.corners(plinth, 5).map(([px, py]) => at([px, py, 6])), { size: 0.5 }));
  const cheek = (y0) => ({ x: x - 26, y: y0, w: 52, d: 6, r: 2 });
  const cheekSvg = (y0) => {
    const plan = cheek(y0);
    return S(k.slabOf(plan, 6, z + 20 - 6, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 18, P, 3), { tone: "faint" }) });
  };
  out.push(cheekSvg(CHEEK_Y - 6));
  // Drum along y, far flange first: axle, far flange, drum, wound tendon, near flange.
  const F = alongY(x, z);
  out.push(S(G.disc(-CHEEK_Y + 6, CHEEK_Y - 6, 4, F, P), { tone: "mid" }));
  out.push(S(G.disc(25, 29, r + 9, F, P, { bevel: 0.6 }), { tone: "mid" }));
  out.push(S(G.disc(-25, 25, r, F, P), { tone: "mid", inner: L(G.arcOf(F, 18, r, P), { tone: "faint" }) }));
  out.push(S(G.disc(-16, 16, r + 3.2, F, P), { tone: "hi", crease: "lo", inner: [-10, -4, 2, 8].map((s) => L(G.arcOf(F, s, r + 3.2, P), { tone: "faint" })).join("") }));
  out.push(S(G.disc(-29, -25, r + 9, F, P, { bevel: 0.6 }), { tone: "mid" }));
  out.push(D(G.dotsOf(F, -29, r + 6, 10, P, { all: true }), { size: 0.45 }));
  out.push(cheekSvg(-CHEEK_Y));
  // Bearing boss on the near cheek, with its knee-angle scale.
  out.push(S(G.disc(-CHEEK_Y - 4, -CHEEK_Y, 9, F, P, { bevel: 0.5 }), { tone: "mid" }));
  out.push(D(G.dotsOf(F, -CHEEK_Y - 4, 6.5, 6, P, { all: true }), { size: 0.4 }));
  const face = -CHEEK_Y - 0.01;
  const scale = [];
  const major = [];
  for (let deg = 0; deg <= 120; deg += 5) {
    const angle = crankPhi(deg);
    const inner = deg % 30 === 0 ? 13.5 : 16;
    const a = Q.pointIn([x, face, z], [1, 0, 0], [0, 0, 1], inner, angle);
    const b = Q.pointIn([x, face, z], [1, 0, 0], [0, 0, 1], 19, angle);
    (deg % 30 === 0 ? major : scale).push(seg(a, b));
  }
  out.push(L(Q.circleIn([x, face, z], [1, 0, 0], [0, 0, 1], 19, P, 64), { tone: "lo" }));
  out.push(L(scale.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(S(G.disc(-CHEEK_Y - 7, -CHEEK_Y - 4, 4.4, F, P), { tone: "mid" }));
  return out.join("");
}

// Crank angle in the cheek-plate plane (from +x toward +z) for a knee angle.
export const crankPhi = (deg) => Math.PI / 2 - (xAt(deg) - xAt(0)) / SPOOL.r;

function wallRings(x) {
  const yl = hL(x) / TAN_L;
  const ym = hM(x) / TAN_M;
  return {
    lateral: Q.sectionAt(x, [[0, 0], [WALL_Y, 0], [WALL_Y, Z0 + hL(x)], [yl, Z0 + hL(x)], [0, Z0]]),
    medial: Q.sectionAt(x, [[0, 0], [0, Z0], [-ym, Z0 + hM(x)], [-WALL_Y, Z0 + hM(x)], [-WALL_Y, 0]]),
  };
}

function lateralWall() {
  const [a, b] = TRACK;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: a, y: -WALL_Y, w: b - a, d: WALL_Y * 2, r: 2 }, 0, 20, P)}"/>`];
  out.push(S(Q.loft([wallRings(a).lateral, wallRings(b).lateral], P), { tone: "mid", crease: "lo" }));
  // Cartilage seam where the inner face meets the top, and bolts along the top.
  out.push(L(seg([a, hL(a) / TAN_L, Z0 + hL(a)], [b, hL(b) / TAN_L, Z0 + hL(b)]), { tone: "faint" }));
  const bolts = [-70, -20, 30, 80].map((x) => at([x, 60, Z0 + hL(x)]));
  out.push(D(bolts, { size: 0.5 }));
  return out.join("");
}

// Articular cartilage: a thin liner on each face of the groove, 1.6 thick.
const LINER = 1.6;
const faceLength = (x, side) => (side > 0 ? hL(x) / Math.sin(Math.atan(TAN_L)) : hM(x) / Math.sin(Math.atan(TAN_M)));
function linerRing(x, side) {
  const angle = Math.atan(side > 0 ? TAN_L : TAN_M);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const n = [-side * s, c];
  const along = (d, off) => [side * d * c + n[0] * off, Z0 + d * s + n[1] * off];
  const top = faceLength(x, side) - 1.2;
  return Q.sectionAt(x, [along(0.8, 0), along(top, 0), along(top, LINER), along(0.8, LINER)]);
}
function liner(side) {
  const [a, b] = TRACK;
  return S(Q.loft([linerRing(a + 1, side), linerRing(b - 1, side)], P), { tone: "mid", crease: "faint" });
}

// Pressure film pads on the lateral liner, from 3 units up the slope to 3 below the wall top.
export function padQuad(x) {
  const c = Math.cos(Math.atan(TAN_L));
  const s = Math.sin(Math.atan(TAN_L));
  const n = [-s, c];
  const top = Math.min(24, faceLength(x - 6, 1) - 3.5);
  const p = (dx, d) => at([x + dx, d * c + n[0] * (LINER + 0.05), Z0 + d * s + n[1] * (LINER + 0.05)]);
  return k.pathOf([p(-6, 3), p(6, 3), p(6, top), p(-6, top)], true);
}

function pads() {
  return PADS.map((x, i) => `<g data-pad="${i}"><path class="kn-pad-ground" d="${padQuad(x)}"/><path class="kn-pad" d="${padQuad(x)}" fill-opacity="0"/><path class="iso-line" data-tone="lo" d="${padQuad(x)}"/></g>`).join("");
}

function medialRamp() {
  const [a, b] = TRACK;
  const out = [S(Q.loft([wallRings(a).medial, wallRings(b).medial], P), { tone: "mid", crease: "lo" })];
  out.push(L(seg([a, -hM(a) / TAN_M, Z0 + hM(a)], [b, -hM(b) / TAN_M, Z0 + hM(b)]), { tone: "faint" }));
  // Knee-angle scale hanging from the outer top edge of the ramp.
  const minor = [];
  const major = [];
  for (let deg = 0; deg <= 120; deg += 5) {
    const x = xAt(deg);
    const top = Z0 + hM(x);
    (deg % 30 === 0 ? major : minor).push(seg([x, -WALL_Y, top], [x, -WALL_Y, top - (deg % 30 === 0 ? 6 : 3.4)]));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(D([-80, -30, 20, 70].map((x) => at([x, -WALL_Y, 5])), { size: 0.45 }));
  // The medial post (MPFL anchor) stands on the ramp's flat top.
  const [px, py] = POST;
  const base = Z0 + hM(px);
  out.push(S(k.cylinder(px, py, 6.5, base, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 3.4, base + 2.4, POST_TOP - base - 4, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(px, py, 3.4, base + 12, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(px, py, 4.6, POST_TOP - 4, 4, P, 24, 0.4), { tone: "mid" }));
  out.push(L(k.ring(px, py, 1.6, POST_TOP, P, 16), { tone: "lo" }));
  return out.join("");
}

function gauge() {
  const { x, y, z, r } = GAUGE;
  const out = [];
  const stand = { x: x - 18, y: y - 10, w: 36, d: 18, r: 2 };
  out.push(S(k.slabOf(stand, 0, 5, P, 3, 0.6), { tone: "mid" }));
  out.push(D(k.corners(stand, 4).map(([px, py]) => at([px, py, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 3.6, 5, z - r - 5 - 3, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 3.6, 40, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 5.4, z - r - 3.5, 4, P, 24), { tone: "mid" }));
  const F = alongY(x, z, y);
  out.push(S(G.disc(-4, 6, r, F, P), { tone: "mid", inner: L(G.arcOf(F, 2, r, P), { tone: "faint" }) }));
  out.push(S(G.disc(-6.5, -4, r + 1.4, F, P, { bevel: 0.5 }), { tone: "mid" }));
  out.push(S(G.disc(-6, -4, r - 2.2, F, P), { tone: "hi", crease: "lo" }));
  // Face: 0 to 14 MPa over 270°, minor every 0.5, major every 2.
  const face = y - 6.05;
  const c = [x, face, z];
  const minor = [];
  const major = [];
  for (let i = 0; i <= 28; i++) {
    const angle = gaugeAngle(i / 2);
    const isMajor = i % 4 === 0;
    minor.push(isMajor ? "" : seg(Q.pointIn(c, [1, 0, 0], [0, 0, 1], r - 6, angle), Q.pointIn(c, [1, 0, 0], [0, 0, 1], r - 3.6, angle)));
    if (isMajor) major.push(seg(Q.pointIn(c, [1, 0, 0], [0, 0, 1], r - 7.6, angle), Q.pointIn(c, [1, 0, 0], [0, 0, 1], r - 3.6, angle)));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(Q.circleIn(c, [1, 0, 0], [0, 0, 1], r - 3.6, P, 72), { tone: "faint" }));
  out.push(L(Q.circleIn(c, [1, 0, 0], [0, 0, 1], 2.2, P, 20), { tone: "mid" }));
  return out.join("");
}

// Gauge needle angle (in the face plane, measured from +x toward +z) for a stress in MPa.
export function gaugeAngle(mpa) {
  const t = Math.min(1, Math.max(0, mpa / 14));
  return ((225 - 270 * t) * Math.PI) / 180;
}

function tibiaRails() {
  const out = [];
  for (const y of [-18, 66]) {
    const plan = { x: 104, y: y - 3, w: 176, d: 6, r: 1.2 };
    out.push(S(k.slabOf(plan, 0, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D([plan.x + 6, plan.x + plan.w - 6].map((px) => at([px, y, 4])), { size: 0.45 }));
  }
  for (const x of [98, 280]) {
    const plan = { x, y: -24, w: 6, d: 96, r: 1.4 };
    out.push(S(k.slabOf(plan, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 3, -18, 8]), at([x + 3, 66, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// Tibial carriage, built with its −x face at x = 0; moved along x by the live script.
function tibiaCarriage() {
  const out = [];
  const plan = { x: 0, y: -26, w: 52, d: 100, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 4), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`);
  for (const y of [-18, 66]) for (const x of [8, 44]) out.push(S(k.slabOf({ x: x - 5, y: y - 5, w: 10, d: 10, r: 1.5 }, 4, CARRIAGE_Z - 4, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf(plan, CARRIAGE_Z, 6, P, 5, 0.6), { tone: "mid" }));
  // Cross-slide ways along y and a ruler on the near half: mm from the groove centre.
  for (const x of [6, 46]) out.push(S(k.slabOf({ x: x - 2, y: -20, w: 4, d: 88, r: 1 }, CARRIAGE_TOP, 2, P, 3), { tone: "mid", crease: "none" }));
  const strip = { x: 40.5, y: -20, w: 4, d: 88, r: 0.6 };
  const ticks = k.topTicks(-16, 60, 2, 5, strip.x + 3.6, CARRIAGE_TOP + 2, [1.6, 3], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([3, -22, CARRIAGE_TOP]), at([49, -22, CARRIAGE_TOP]), at([3, 70, CARRIAGE_TOP]), at([49, 70, CARRIAGE_TOP])], { size: 0.45 }));
  return out.join("");
}

// Tibial tubercle anchor (on the cross-slide) with a face-up load dial.
export const DIAL = { r: 10, z: CARRIAGE_TOP + 2 + ANCHOR.h };
function anchorBlock() {
  const out = [];
  const plan = { x: 6, y: -ANCHOR.d / 2, w: ANCHOR.w, d: ANCHOR.d, r: 2 };
  const z = CARRIAGE_TOP + 2;
  out.push(S(k.slabOf(plan, z, ANCHOR.h - 3, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, z + 6, P, 4), { tone: "faint" }) }));
  out.push(S(k.cylinder(20, 0, DIAL.r, z + ANCHOR.h - 3, 3, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  const ticks = k.radialTicks(20, 0, DIAL.r - 1.4, 40, 5, DIAL.z, [1, 2.2], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(20, 0, 1.2, DIAL.z, P, 16), { tone: "mid" }));
  // Pointer on the slide that reads the ruler.
  out.push(S(k.slabOf({ x: 34, y: -1.2, w: 8, d: 2.4, r: 0.6 }, z, 2, P, 2), { tone: "hi", crease: "none" }));
  out.push(D([at([plan.x + 3, plan.y + 3, z + ANCHOR.h - 3]), at([plan.x + plan.w - 3, plan.y + 3, z + ANCHOR.h - 3])], { size: 0.4 }));
  return out.join("");
}

function sled() {
  const rings = [[-SLED_HALF, 0.86], [-22, 1], [8, 0.97], [26, 0.78], [SLED_HALF, 0.42]].map(([s, f]) =>
    Q.sectionAt(s, SLED_SECTION.map(([y, z]) => [y * f, Z0 + z * f])),
  );
  const out = [S(Q.loft(rings, P, { creaseAngle: 0.5 }), { tone: "hi", lit: true, crease: "lo" })];
  const topAt = (sx, f, t) => [sx, (20 + (-5 - 20) * t) * f, Z0 + (29.5 + (31 - 29.5) * t) * f];
  out.push(D([topAt(-28, 0.93, 0.2), topAt(-28, 0.93, 0.8), topAt(16, 0.9, 0.2), topAt(16, 0.9, 0.8)].map(at), { size: 0.5, tone: "mid" }));
  // Lug for the medial spring, and the tendon pins.
  out.push(S(k.cylinder(-10, -12.5, 2.6, Z0 + 23, 3, P, 18), { tone: "mid" }));
  out.push(L(k.ring(-10, -12.5, 1, Z0 + 26, P, 12), { tone: "lo" }));
  return out.join("");
}

function chart() {
  const out = [];
  out.push(S(k.slabOf(CHART, 0, 5, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CHART, 2, P, 4), { tone: "faint" }) }));
  out.push(S(k.slabOf(PAPER, 5, 0.4, P, 2), { tone: "hi", crease: "faint" }));
  const top = 5.4;
  const grid = [];
  for (let mpa = 0; mpa <= 12; mpa += 4) grid.push(k.lineOnTop([PAPER.x, chartY(mpa)], [PAPER.x + PAPER.w, chartY(mpa)], top, P));
  for (let q = 1; q < 4; q++) grid.push(k.lineOnTop([PAPER.x + (PAPER.w * q) / 4, PAPER.y], [PAPER.x + (PAPER.w * q) / 4, PAPER.y + PAPER.d], top, P));
  out.push(L(grid.join(""), { tone: "faint" }));
  // Paper rolls at both ends.
  for (const x of [PAPER.x - 3, PAPER.x + PAPER.w + 3]) {
    const F = alongY(x, 7);
    out.push(S(G.disc(PAPER.y - 1, PAPER.y + PAPER.d + 1, 3.2, F, P), { tone: "hi", crease: "lo" }));
  }
  // Pen rail behind the paper.
  const rail = { x: CHART.x + 4, y: CHART.y + CHART.d - 3.2, w: CHART.w - 8, d: 2.4, r: 0.8 };
  out.push(S(k.slabOf(rail, 5, 2.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(D([at([CHART.x + 3, CHART.y + 3, 5]), at([CHART.x + CHART.w - 3, CHART.y + 3, 5])], { size: 0.45 }));
  return out.join("");
}

export const chartY = (mpa) => PAPER.y + 2 + (Math.min(13, mpa) / 13) * (PAPER.d - 4);
export const chartX = (phase) => PAPER.x + phase * PAPER.w;
export const PAPER_TOP = 5.4;

function penCarriage() {
  const y = CHART.y + CHART.d - 2;
  const out = [S(k.slabOf({ x: -5, y: y - 3, w: 10, d: 7, r: 1.4 }, 7.4, 4, P, 3, 0.4), { tone: "mid" })];
  out.push(D([at([0, y + 0.5, 11.4])], { size: 0.45 }));
  return out.join("");
}

export function build() {
  return {
    back1: [plate(), labelPlate(), spool(), gauge()].join(""),
    back2: [lateralWall(), liner(1), pads(), medialRamp(), liner(-1)].join(""),
    sled: sled(),
    rails: tibiaRails(),
    carriage: tibiaCarriage(),
    anchor: anchorBlock(),
    chart: chart(),
    pen: penCarriage(),
  };
}
