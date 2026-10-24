// A wooden artist's mannequin: poses for each exercise and an SVG renderer.
// Pure geometry plus kit projection, used at build time and inlined in the page.
import { iso, pathOf, cameraOf, depthOf } from "./vendor/anatomy/kit/iso-kit.mjs";
import { EXERCISES } from "./model.mjs";
import { strap, loft, basisOf } from "./parts.mjs";

// Segment lengths in cm.
export const BODY = { hipW: 9, thigh: 44, shin: 43, ankleH: 7, heel: 6, toe: 18, torso: 50, shW: 17, upperArm: 28, foreArm: 25, hand: 8, neck: 6, headR: 9.5 };
export const RAD = Math.PI / 180;
export const ease = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => mul(a, 1 / (len(a) || 1));
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// A body frame: origin, forward (anterior), left, up (toward the head).
export const frame = (o, fwd, up) => ({ o, f: norm(fwd), u: norm(up), l: norm(cross(up, fwd)) });
export const at = (F, f, l, u) => add(F.o, add(mul(F.f, f), add(mul(F.l, l), mul(F.u, u))));
// A direction in the sagittal plane: angle from "down the body" toward "forward".
export const sag = (F, angle) => add(mul(F.f, Math.sin(angle)), mul(F.u, -Math.cos(angle)));

export function rotateAbout(p, origin, axis, angle) {
  const k = norm(axis);
  const v = sub(p, origin);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(origin, add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))));
}

// Two-link reach: hip to ankle with the knee bending toward `bend`.
export function reach(hip, ankle, bend, a = BODY.thigh, b = BODY.shin) {
  let d = sub(ankle, hip);
  let dist = len(d);
  if (dist > a + b - 0.01) {
    ankle = add(hip, mul(norm(d), a + b - 0.01));
    d = sub(ankle, hip);
    dist = a + b - 0.01;
  }
  const along = (a * a - b * b + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, a * a - along * along));
  const axis = norm(d);
  const side = norm(sub(bend, mul(axis, dot(bend, axis))));
  return { knee: add(add(hip, mul(axis, along)), mul(side, h)), ankle, mid: add(add(hip, mul(axis, along)), mul(side, h)) };
}

export const flexionOf = (hip, knee, ankle) => {
  const u = norm(sub(knee, hip));
  const v = norm(sub(ankle, knee));
  return Math.acos(Math.max(-1, Math.min(1, dot(u, v)))) / RAD;
};

// Foot from the ankle along `dir` (heel behind, toe ahead), dropped toward `down`.
export function foot(ankle, dir, down) {
  const d = norm(dir);
  return { heel: add(add(ankle, mul(d, -BODY.heel)), mul(down, BODY.ankleH - 3.4)), toe: add(add(ankle, mul(d, BODY.toe)), mul(down, BODY.ankleH - 3.6)) };
}

// Trunk, head and arms from the pelvis centre in frame T (u = up the spine).
export function upper(T, arms) {
  const waist = at(T, 0, 0, 20);
  const neck = at(T, 0, 0, BODY.torso);
  const head = at(T, 1.5, 0, BODY.torso + BODY.neck + BODY.headR);
  const out = { waist, neck, head };
  for (const [side, sign] of [["L", 1], ["R", -1]]) {
    const shoulder = at(T, 0, sign * BODY.shW, BODY.torso - 5);
    if (arms[side].to) {
      const arm = reach(shoulder, arms[side].to, arms[side].bend, BODY.upperArm, BODY.foreArm + 4);
      const fore = norm(sub(arm.ankle, arm.mid));
      const wrist = add(arm.mid, mul(fore, BODY.foreArm));
      Object.assign(out, { ["shoulder" + side]: shoulder, ["elbow" + side]: arm.mid, ["wrist" + side]: wrist, ["hand" + side]: add(wrist, mul(fore, BODY.hand)) });
      continue;
    }
    const [upperAngle, bend, splay = 0] = arms[side];
    const dir = norm(add(sag(T, upperAngle * RAD), mul(T.l, sign * Math.sin(splay * RAD))));
    const elbow = add(shoulder, mul(dir, BODY.upperArm));
    const fore = norm(add(sag(T, (upperAngle + bend) * RAD), mul(T.l, sign * Math.sin(splay * RAD))));
    const wrist = add(elbow, mul(fore, BODY.foreArm));
    out["shoulder" + side] = shoulder;
    out["elbow" + side] = elbow;
    out["wrist" + side] = wrist;
    out["hand" + side] = add(wrist, mul(fore, BODY.hand));
  }
  return out;
}

const STAND = (o) => frame(o, [1, 0, 0], [0, 0, 1]);

// Every pose returns joints plus `extra` lines (straps, bands) and the knee angle it shows.
export const POSES = {
  slr(t) {
    const lift = EXERCISES.slr.moment(t) / 0.35;
    const T = frame([-8, 0, 11], [0, 0, 1], [-1, 0, 0]);
    const body = upper(T, { L: [8, 0, 12], R: [8, 0, 12] });
    const hipL = at(T, 0, BODY.hipW, 0);
    const hipR = at(T, 0, -BODY.hipW, 0);
    const a = 42 * lift * RAD;
    const kneeL = add(hipL, mul(sag(T, a), BODY.thigh));
    const ankleL = add(kneeL, mul(sag(T, a), BODY.shin));
    const footL = foot(ankleL, sag(T, a + Math.PI / 2 - 0.15), sag(T, a));
    const ankleR = [46, -BODY.hipW, BODY.ankleH];
    const legR = reach(hipR, ankleR, [0, 0, 1]);
    const footR = foot(ankleR, [1, 0, 0], [0, 0, -1]);
    return { ...body, hipL, hipR, kneeL, ankleL, ...pre("L", footL), kneeR: legR.knee, ankleR, ...pre("R", footR), flexion: 0 };
  },
  spanish(t) {
    const theta = EXERCISES.spanish.flexion(t);
    const legs = squatLegs(theta, 0, 0);
    const T = STAND(legs.pelvis);
    const lean = 0.42 * theta * RAD;
    const TT = frame(legs.pelvis, [Math.cos(lean), 0, -Math.sin(lean)], [Math.sin(lean), 0, Math.cos(lean)]);
    const body = upper(TT, { L: [70 + 0.2 * theta, -10], R: [70 + 0.2 * theta, -10] });
    const strapL = [legs.kneeL[0] - 6, legs.kneeL[1] + 4.5, legs.kneeL[2] - 2];
    const strapR = [legs.kneeR[0] - 6, legs.kneeR[1] - 4.5, legs.kneeR[2] - 2];
    return { ...body, ...legs, flexion: theta, T, extraFront: [[STRAP_POST, strapL]], extraBack: [[STRAP_POST, strapR]] };
  },
  clam(t) {
    const open = 38 * ease(0.08, 0.38, t) * (1 - ease(0.62, 0.92, t)) * RAD;
    const T = frame([-6, 0, 16], [0, 1, 0], [1, 0, 0]);
    const body = upper(T, { L: [14, 12, 4], R: [176, -20, 0] });
    const hipL = at(T, 0, BODY.hipW, 0);
    const hipR = at(T, 0, -BODY.hipW, 0);
    const a = 48 * RAD;
    const flex = 95 * RAD;
    const legOf = (hip) => {
      const knee = add(hip, mul(sag(T, a), BODY.thigh));
      const ankle = add(knee, mul(sag(T, a - flex), BODY.shin));
      return { knee, ankle };
    };
    const right = legOf(hipR);
    const left = legOf(hipL);
    const axis = sub(left.ankle, hipL);
    const kneeL = rotateAbout(left.knee, hipL, axis, -open);
    const footL = foot(left.ankle, sag(T, a - flex + Math.PI / 2), sag(T, a - flex));
    const footR = foot(right.ankle, sag(T, a - flex + Math.PI / 2), sag(T, a - flex));
    const bandL = add(hipL, mul(sub(kneeL, hipL), 0.8));
    const bandR = add(hipR, mul(sub(right.knee, hipR), 0.8));
    return { ...body, hipL, hipR, kneeL, ankleL: left.ankle, ...pre("L", footL), kneeR: right.knee, ankleR: right.ankle, ...pre("R", footR), flexion: 90, band: [bandR, bandL] };
  },
  bridge(t) {
    const lift = ease(0.1, 0.35, t) * (1 - ease(0.65, 0.9, t));
    const neck = [-52, 0, 11];
    const phi = 26 * lift * RAD;
    const pelvis = add(neck, [BODY.torso * Math.cos(phi), 0, BODY.torso * Math.sin(phi)]);
    const T = frame(pelvis, [-Math.sin(phi), 0, Math.cos(phi)], [-Math.cos(phi), 0, -Math.sin(phi)]);
    const body = upper(T, { L: [-4 + 4 * lift, 0, 14], R: [-4 + 4 * lift, 0, 14] });
    const hipL = at(T, 0, BODY.hipW, 0);
    const hipR = at(T, 0, -BODY.hipW, 0);
    const ankleL = [46, BODY.hipW, BODY.ankleH];
    const ankleR = [46, -BODY.hipW, BODY.ankleH];
    const legL = reach(hipL, ankleL, [0.2, 0, 1]);
    const legR = reach(hipR, ankleR, [0.2, 0, 1]);
    return { ...body, hipL, hipR, kneeL: legL.knee, ankleL, ...pre("L", foot(ankleL, [1, 0, 0], [0, 0, -1])), kneeR: legR.knee, ankleR, ...pre("R", foot(ankleR, [1, 0, 0], [0, 0, -1])), flexion: flexionOf(hipL, legL.knee, ankleL) };
  },
  stepdown(t) {
    const theta = EXERCISES.stepdown.flexion(t);
    const ankleL = [-6, BODY.hipW, STEP.h + BODY.ankleH];
    const s = 0.45 * theta * RAD;
    const kneeL = add(ankleL, [BODY.shin * Math.sin(s), 0, BODY.shin * Math.cos(s)]);
    const hipL = add(kneeL, [BODY.thigh * Math.sin(s - theta * RAD), 0, BODY.thigh * Math.cos(s - theta * RAD)]);
    const pelvis = add(hipL, [0, -BODY.hipW, 0]);
    const hipR = add(pelvis, [0, -BODY.hipW, 0]);
    const lean = 0.35 * theta * RAD;
    const TT = frame(pelvis, [Math.cos(lean), 0, -Math.sin(lean)], [Math.sin(lean), 0, Math.cos(lean)]);
    const body = upper(TT, { L: [24, -8, 22], R: [24, -8, 22] });
    const target = [hipR[0] + 30, -BODY.hipW - 1, BODY.ankleH + 0.6];
    const legR = reach(hipR, target, [1, 0, 0.3]);
    const footR = foot(legR.ankle, [1, 0, -0.25], [0, 0, -1]);
    return { ...body, hipL, hipR, kneeL, ankleL, ...pre("L", foot(ankleL, [1, 0, 0], [0, 0, -1])), kneeR: legR.knee, ankleR: legR.ankle, ...pre("R", footR), flexion: theta };
  },
  boxsquat(t) {
    const theta = EXERCISES.boxsquat.flexion(t);
    const legs = squatLegs(theta, 0.4, 0);
    const lean = 0.55 * theta * RAD;
    const TT = frame(legs.pelvis, [Math.cos(lean), 0, -Math.sin(lean)], [Math.sin(lean), 0, Math.cos(lean)]);
    const reachArms = 20 + 0.9 * theta;
    const body = upper(TT, { L: [reachArms, -6, 4], R: [reachArms, -6, 4] });
    return { ...body, ...legs, flexion: theta };
  },
};

const pre = (side, f) => ({ ["heel" + side]: f.heel, ["toe" + side]: f.toe });

// Both feet planted at x = 0; shin leans forward by `shinShare` of the knee angle.
function squatLegs(theta, shinShare) {
  const out = {};
  let pelvis = null;
  for (const [side, sign] of [["L", 1], ["R", -1]]) {
    const ankle = [0, sign * (BODY.hipW + 1), BODY.ankleH];
    const s = shinShare * theta * RAD;
    const knee = add(ankle, [BODY.shin * Math.sin(s), sign * 1.5, BODY.shin * Math.cos(s)]);
    const hip = add(knee, [BODY.thigh * Math.sin(s - theta * RAD), sign * -0.5, BODY.thigh * Math.cos(s - theta * RAD)]);
    const f = foot(ankle, [1, sign * 0.12, 0], [0, 0, -1]);
    Object.assign(out, { ["hip" + side]: hip, ["knee" + side]: knee, ["ankle" + side]: ankle, ["heel" + side]: f.heel, ["toe" + side]: f.toe });
    pelvis = pelvis ? mul(add(pelvis, hip), 0.5) : hip;
  }
  out.pelvis = pelvis;
  return out;
}

// Props the poses refer to.
export const STEP = { x: -26, y: -4, w: 38, d: 30, h: 15, r: 2 };
export const STRAP_POST = [74, 0, 46];
export const BOX = { x: -48, y: -22, w: 36, d: 44, h: 70, r: 2 };

// Draw order items: [depth, svg]. Capsules are shaded with three offset layers.
const LIGHT2 = (() => {
  const l = Math.hypot(-0.55, -0.835);
  return [-0.55 / l, -0.835 / l];
})();

function capsulePoints(A, ra, B, rb, steps = 14) {
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return circlePoints(A, Math.max(ra, rb), steps * 2);
  const ux = dx / d;
  const uy = dy / d;
  const base = Math.atan2(uy, ux);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = base + Math.PI / 2 + (i / steps) * Math.PI;
    out.push([A[0] + Math.cos(a) * ra, A[1] + Math.sin(a) * ra]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = base - Math.PI / 2 + (i / steps) * Math.PI;
    out.push([B[0] + Math.cos(a) * rb, B[1] + Math.sin(a) * rb]);
  }
  return out;
}
function circlePoints(c, r, steps = 28) {
  return Array.from({ length: steps }, (_, i) => [c[0] + Math.cos((i / steps) * Math.PI * 2) * r, c[1] + Math.sin((i / steps) * Math.PI * 2) * r]);
}

function shadedCapsule(A, ra, B, rb, { lit = false, edge = "hi" } = {}) {
  const shift = (p, by) => [p[0] + LIGHT2[0] * by, p[1] + LIGHT2[1] * by];
  const body = pathOf(capsulePoints(A, ra, B, rb), true);
  const mid = pathOf(capsulePoints(shift(A, ra * 0.24), ra * 0.74, shift(B, rb * 0.24), rb * 0.74), true);
  const shine = pathOf(capsulePoints(shift(A, ra * 0.44), ra * 0.34, shift(B, rb * 0.44), rb * 0.34), true);
  return `<g class="mq"${lit ? " data-lit" : ""}><path class="mq-0" d="${body}"/><path class="mq-2" d="${mid}"/><path class="mq-3" d="${shine}"/><path class="iso-line mq-edge" data-tone="${lit ? "lit" : edge}" d="${body}"/></g>`;
}

export function renderPose(pose, P) {
  const k = cameraOf(P).k;
  const items = [];
  const cap = (a, b, ra, rb, opts = {}) => items.push([depthOf(a, P) * 0.5 + depthOf(b, P) * 0.5 + (opts.bias || 0), shadedCapsule(iso(a, P), ra * k, iso(b, P), rb * k, opts)]);
  const ball = (c, r, opts = {}) => items.push([depthOf(c, P) + (opts.bias ?? 0.5), shadedCapsule(iso(c, P), r * k, iso(c, P), r * k, opts)]);
  const toward = (a, b, d) => add(a, mul(norm(sub(b, a)), d));
  const pelvisC = mul(add(pose.hipL, pose.hipR), 0.5);
  // Pelvis block and chest block, spine between.
  cap(pose.hipL, pose.hipR, 9.5, 9.5);
  cap(toward(pelvisC, pose.waist, 8), pose.waist, 7, 8.5);
  cap(toward(pose.waist, pose.neck, 4), toward(pose.neck, pose.waist, 9), 11.5, 12.5);
  cap(pose.shoulderL, pose.shoulderR, 5.6, 5.6, { bias: -0.5 });
  ball(pose.waist, 6.2, { bias: -2 });
  cap(pose.neck, toward(pose.neck, pose.head, 6), 3.4, 3.4);
  cap(toward(pose.head, pose.neck, 5), toward(pose.neck, pose.head, BODY.neck + BODY.headR * 2 - 2), BODY.headR * 0.92, BODY.headR * 0.82, { bias: 1 });
  for (const side of ["L", "R"]) {
    const lit = side === "L";
    cap(toward(pose["hip" + side], pose["knee" + side], 6), toward(pose["knee" + side], pose["hip" + side], 4.5), 7.4, 5.4);
    cap(toward(pose["knee" + side], pose["ankle" + side], 4.5), toward(pose["ankle" + side], pose["knee" + side], 3), 5, 3.6);
    cap(pose["heel" + side], pose["toe" + side], 3.4, 2.6);
    ball(pose["hip" + side], 5.2, { bias: -1 });
    ball(pose["knee" + side], 4.6, { lit, bias: lit ? 1.5 : 0.5 });
    ball(pose["ankle" + side], 3.2);
    cap(toward(pose["shoulder" + side], pose["elbow" + side], 3.5), toward(pose["elbow" + side], pose["shoulder" + side], 2.8), 4, 3.4);
    cap(toward(pose["elbow" + side], pose["wrist" + side], 2.8), pose["wrist" + side], 3.2, 2.5);
    cap(pose["wrist" + side], pose["hand" + side], 2.7, 2.3);
    ball(pose["shoulder" + side], 4.4);
    ball(pose["elbow" + side], 3);
  }
  // The patella: a small lit lens on the front of the left knee.
  const shin = norm(sub(pose.ankleL, pose.kneeL));
  const thigh = norm(sub(pose.hipL, pose.kneeL));
  const front = norm(mul(add(shin, thigh), -1));
  const cap0 = add(pose.kneeL, mul(len(add(shin, thigh)) > 0.05 ? front : (pose.T ? pose.T.f : [1, 0, 0]), 4.2));
  ball(cap0, 2.4, { lit: true, bias: 2.2 });
  for (const part of pose.parts || []) items.push([partDepth(part, P), partSvg(part, P)]);
  items.sort((a, b) => a[0] - b[0]);
  return items.map((item) => item[1]).join("");
}

// Machine parts that move with a pose and sort in depth with the body:
// { a, b, w, t, up } is a rectangular bar, { a, b, r } a round bar or disc between a and b.
function roundBar(a, b, r, P, steps = 22) {
  const { u, v } = basisOf(sub(b, a));
  const ring = (c) => Array.from({ length: steps }, (_, i) => add(c, add(mul(u, r * Math.cos((i / steps) * Math.PI * 2)), mul(v, r * Math.sin((i / steps) * Math.PI * 2)))));
  return loft([ring(a), ring(b)], P, { creaseAngle: 1.2 });
}
export function partSvg(part, P) {
  const style = { tone: part.tone || "mid", crease: part.crease || "lo", lit: false };
  if (part.r) return solidSvgP(roundBar(part.a, part.b, part.r, P), style);
  return solidSvgP(strap(part.a, part.b, part.w, part.t, part.up || [0, 0, 1], P), style);
}
const partDepth = (part, P) => depthOf(mul(add(part.a, part.b), 0.5), P) + (part.bias || 0);
function solidSvgP(paths, { tone, crease }) {
  const shades = paths.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("");
  return `<g class="iso-solid"><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top}"/>${paths.crease ? `<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>` : ""}<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}
