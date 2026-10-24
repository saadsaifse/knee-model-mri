// Poses for v2: a stationary bike and four gym exercises. Each pose carries its machine as
// `parts`, so the machine depth-sorts with the body. Knee angles come from the geometry.
import { BODY, RAD, add, sub, mul, norm, frame, at, sag, reach, foot, upper, flexionOf, POSES } from "./mannequin.mjs";
import { EXERCISES, ACTIVITIES } from "./model.mjs";

// --- Bike -----------------------------------------------------------------------------------
const CRANK = [6, 0, 30];
const CRANK_R = 17.25;
const SEAT_DIR = [-Math.cos(73 * RAD), 0, Math.sin(73 * RAD)];
const FOOT_OFF = [-4, 0, 7.5];
// Seat-tube length that leaves the knee 35° bent with the pedal at the bottom.
function seatFor(bottomFlexion) {
  const a = BODY.thigh;
  const b = BODY.shin;
  const want = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(bottomFlexion * RAD));
  const ankle = add(add(CRANK, [0, 0, -CRANK_R]), FOOT_OFF);
  let lo = 30;
  let hi = 120;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const d = Math.hypot(...sub(add(CRANK, mul(SEAT_DIR, mid)), ankle));
    if (d < want) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export const SEAT = { fit: seatFor(35) };
SEAT.low = SEAT.fit - 4;

function bike(t, seatLength) {
  const angle = t * Math.PI * 2;
  const H = add(CRANK, mul(SEAT_DIR, seatLength));
  const lean = 50 * RAD;
  const T = frame(H, [Math.cos(lean), 0, -Math.sin(lean)], [Math.sin(lean), 0, Math.cos(lean)]);
  const bar = [H[0] + 66, 0, H[2] + 4];
  const body = upper(T, { L: { to: [bar[0], 21, bar[2]], bend: [0, 0.4, -1] }, R: { to: [bar[0], -21, bar[2]], bend: [0, -0.4, -1] } });
  const pose = { ...body };
  const parts = [];
  for (const [side, sign, phase] of [["L", 1, 0], ["R", -1, Math.PI]]) {
    const pedal = add(CRANK, [CRANK_R * Math.sin(angle + phase), sign * 11, CRANK_R * Math.cos(angle + phase)]);
    const hip = at(T, 0, sign * BODY.hipW, 0);
    const ankle = add(pedal, FOOT_OFF);
    const leg = reach(hip, ankle, [1, 0, 0.2]);
    const f = foot(leg.ankle, [1, 0, -0.12], [0, 0, -1]);
    Object.assign(pose, { ["hip" + side]: hip, ["knee" + side]: leg.knee, ["ankle" + side]: leg.ankle, ["heel" + side]: f.heel, ["toe" + side]: f.toe });
    const arm = [CRANK[0], sign * 6.5, CRANK[2]];
    parts.push({ a: arm, b: [pedal[0], sign * 6.5, pedal[2]], w: 3.4, t: 2, up: [0, 1, 0] });
    parts.push({ a: [pedal[0], sign * 7.5, pedal[2]], b: [pedal[0], sign * 15.5, pedal[2]], w: 10, t: 2, up: [0, 0, 1], tone: "hi", bias: -0.5 });
  }
  const head = [CRANK[0] + 52, 0, CRANK[2] + 62];
  const post = add(CRANK, mul(SEAT_DIR, seatLength - 12));
  parts.push(
    { a: [-62, -24, 2.5], b: [-62, 24, 2.5], r: 2.5 },
    { a: [78, -24, 2.5], b: [78, 24, 2.5], r: 2.5 },
    { a: [-62, 0, 4], b: CRANK, r: 2.4 },
    { a: [78, 0, 4], b: head, r: 2.4 },
    { a: CRANK, b: head, r: 2.6 },
    { a: CRANK, b: post, r: 2.6 },
    { a: post, b: add(post, mul(SEAT_DIR, 3)), r: 1.8, tone: "hi" },
    { a: [H[0] - 13, 0, H[2] - 9.5], b: [H[0] + 15, 0, H[2] - 9.5], w: 12, t: 4, up: [0, 0, 1] },
    { a: head, b: [bar[0], 0, bar[2]], r: 1.8 },
    { a: [bar[0], -24, bar[2]], b: [bar[0], 24, bar[2]], r: 1.5 },
    { a: [CRANK[0] + 40, -2.6, CRANK[2] + 16], b: [CRANK[0] + 40, 2.6, CRANK[2] + 16], r: 21 },
    { a: [CRANK[0], -5.8, CRANK[2]], b: [CRANK[0], -4.6, CRANK[2]], r: 10 },
    { a: [CRANK[0], -6.5, CRANK[2]], b: [CRANK[0], 6.5, CRANK[2]], r: 2.2 },
  );
  pose.parts = parts;
  pose.flexion = flexionOf(pose.hipL, pose.kneeL, pose.ankleL);
  return pose;
}

// --- Seated machines --------------------------------------------------------------------------
const SEAT_Z = 48;
function seatedTrunk(arms) {
  const back = -10 * RAD;
  const pelvis = [0, 0, SEAT_Z + 9.5];
  const T = frame(pelvis, [Math.cos(back), 0, -Math.sin(back)], [Math.sin(back), 0, Math.cos(back)]);
  return { T, pelvis, body: upper(T, arms) };
}
const seatParts = () => [
  { a: [-44, 0, 2], b: [64, 0, 2], w: 16, t: 4, up: [0, 0, 1] },
  { a: [-4, 0, 4], b: [-4, 0, SEAT_Z - 8], w: 10, t: 10, up: [1, 0, 0] },
  { a: [-22, 0, SEAT_Z - 4], b: [34, 0, SEAT_Z - 4], w: 40, t: 8, up: [0, 0, 1], tone: "hi" },
  { a: [-26, 0, SEAT_Z + 2], b: [-37, 0, SEAT_Z + 62], w: 34, t: 6, up: [Math.cos(10 * RAD), 0, Math.sin(10 * RAD)], tone: "hi" },
  { a: [-38, 0, 4], b: [-38, 0, SEAT_Z + 4], w: 6, t: 6, up: [1, 0, 0] },
];
const handles = { L: { to: [-2, 27, SEAT_Z + 2], bend: [-0.3, 0.5, 0] }, R: { to: [-2, -27, SEAT_Z + 2], bend: [-0.3, -0.5, 0] } };

function legExtension(flexion) {
  const { body } = seatedTrunk(handles);
  const pose = { ...body };
  const alpha = (90 - flexion) * RAD;
  const shinDir = [Math.sin(alpha), 0, -Math.cos(alpha)];
  for (const [side, sign] of [["L", 1], ["R", -1]]) {
    const hip = [0, sign * BODY.hipW, SEAT_Z + 9.5];
    const knee = add(hip, [BODY.thigh, 0, 0]);
    const ankle = add(knee, mul(shinDir, BODY.shin));
    const f = foot(ankle, [Math.cos(alpha), 0, Math.sin(alpha)], shinDir);
    Object.assign(pose, { ["hip" + side]: hip, ["knee" + side]: knee, ["ankle" + side]: ankle, ["heel" + side]: f.heel, ["toe" + side]: f.toe });
  }
  const pivot = [BODY.thigh, -27, SEAT_Z + 9.5];
  const forward = [Math.cos(alpha), 0, Math.sin(alpha)];
  const roller = add(add(pivot, mul(shinDir, 36)), mul(forward, 6.5));
  pose.parts = [
    ...seatParts(),
    { a: [BODY.thigh, -24, SEAT_Z + 9.5], b: [BODY.thigh, -32, SEAT_Z + 9.5], r: 7 },
    { a: [BODY.thigh, -32, SEAT_Z + 9.5], b: [BODY.thigh, -32, 4], w: 8, t: 5, up: [1, 0, 0] },
    { a: [pivot[0], -27, pivot[2]], b: [roller[0], -27, roller[2]], w: 4, t: 3, up: [0, 1, 0] },
    { a: [roller[0], -24, roller[2]], b: [roller[0], 22, roller[2]], r: 4.5, tone: "hi" },
  ];
  pose.flexion = flexion;
  return pose;
}

function abductor(t) {
  const open = 32 * RAD * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.05) / 0.9))));
  const { body } = seatedTrunk(handles);
  const pose = { ...body };
  const parts = seatParts();
  for (const [side, sign] of [["L", 1], ["R", -1]]) {
    const hip = [0, sign * BODY.hipW, SEAT_Z + 9.5];
    const knee = add(hip, [BODY.thigh * Math.cos(open), sign * BODY.thigh * Math.sin(open), 0]);
    const ankle = add(knee, [0, 0, -BODY.shin]);
    const f = foot(ankle, [1, 0, 0], [0, 0, -1]);
    Object.assign(pose, { ["hip" + side]: hip, ["knee" + side]: knee, ["ankle" + side]: ankle, ["heel" + side]: f.heel, ["toe" + side]: f.toe });
    const out = [-Math.sin(open), sign * Math.cos(open), 0];
    const pad = add(knee, mul(out, 7.5));
    parts.push({ a: add(pad, [-6, 0, -7]), b: add(pad, [-6, 0, 7]), w: 12, t: 3, up: out, tone: "hi" });
    parts.push({ a: add(pad, [-6, 0, -7]), b: [8, sign * 20, SEAT_Z - 8], r: 1.6 });
    parts.push({ a: [ankle[0] - 4, sign * 4, 5.5], b: [ankle[0] - 4, sign * 30, 5.5], r: 1.8 });
  }
  pose.parts = parts;
  pose.flexion = 90;
  return pose;
}

// --- Single-leg hip thrust off a bench ---------------------------------------------------------
const BENCH_TOP = 42;
function hipThrust(t) {
  const lift = Math.min(1, Math.max(0, (100 - EXERCISES.hipthrust.flexion(t)) / 11));
  const neck = [-40, 0, BENCH_TOP + 5];
  const phi = (-36 + 38 * lift) * RAD;
  const pelvis = add(neck, [BODY.torso * Math.cos(phi), 0, BODY.torso * Math.sin(phi)]);
  const T = frame(pelvis, [-Math.sin(phi), 0, Math.cos(phi)], [-Math.cos(phi), 0, -Math.sin(phi)]);
  const body = upper(T, { L: [96, -6, 62], R: [96, -6, 62] });
  const pose = { ...body };
  const hipL = at(T, 0, BODY.hipW, 0);
  const hipR = at(T, 0, -BODY.hipW, 0);
  const ankleL = [56, BODY.hipW + 1, BODY.ankleH];
  const legL = reach(hipL, ankleL, [0.3, 0, 1]);
  const fl = foot(ankleL, [1, 0, 0], [0, 0, -1]);
  const kneeR = add(hipR, mul(sag(T, 105 * RAD), BODY.thigh));
  const ankleR = add(kneeR, mul(sag(T, 15 * RAD), BODY.shin));
  const fr = foot(ankleR, sag(T, 105 * RAD), sag(T, 15 * RAD));
  Object.assign(pose, { hipL, hipR, kneeL: legL.knee, ankleL, heelL: fl.heel, toeL: fl.toe, kneeR, ankleR, heelR: fr.heel, toeR: fr.toe });
  pose.parts = [
    { a: [-62, 0, 0.5], b: [-62, 0, BENCH_TOP - 6], w: 34, t: 34, up: [1, 0, 0] },
    { a: [-80, 0, BENCH_TOP - 6], b: [-44, 0, BENCH_TOP - 6], w: 90, t: 12, up: [0, 0, 1], tone: "hi", bias: -20 },
  ];
  pose.parts[1] = { a: [-80, 0, BENCH_TOP - 3], b: [-44, 0, BENCH_TOP - 3], w: 90, t: 6, up: [0, 0, 1], tone: "hi", bias: -20 };
  pose.flexion = flexionOf(hipL, legL.knee, ankleL);
  return pose;
}

// --- Reverse lunge with a barbell --------------------------------------------------------------
function lunge(key) {
  return (t) => {
    const theta = EXERCISES[key].flexion(t);
    const depth = (theta - 8) / 84;
    const ankleL = [14, BODY.hipW + 1, BODY.ankleH];
    const s = 0.28 * theta * RAD;
    const kneeL = add(ankleL, [BODY.shin * Math.sin(s), 0, BODY.shin * Math.cos(s)]);
    const hipL = add(kneeL, [BODY.thigh * Math.sin(s - theta * RAD), -1, BODY.thigh * Math.cos(s - theta * RAD)]);
    const pelvis = add(hipL, [0, -BODY.hipW, 0]);
    const hipR = add(pelvis, [0, -BODY.hipW, 0]);
    const lean = 8 * RAD;
    const T = frame(pelvis, [Math.cos(lean), 0, -Math.sin(lean)], [Math.sin(lean), 0, Math.cos(lean)]);
    const barC = at(T, -7, 0, BODY.torso + 1);
    const body = upper(T, { L: { to: add(barC, [0, 30, 0]), bend: [-0.5, 0.3, -1] }, R: { to: add(barC, [0, -30, 0]), bend: [-0.5, -0.3, -1] } });
    const target = [hipR[0] - 14 - 50 * Math.sqrt(depth), -BODY.hipW - 1, BODY.ankleH + 5 * depth];
    const legR = reach(hipR, target, [0.7, 0, -1]);
    const fr = foot(legR.ankle, [1, 0, -0.5 * depth - 0.1], [0, 0, -1]);
    const fl = foot(ankleL, [1, 0, 0], [0, 0, -1]);
    const y = [0, 1, 0];
    const parts = [{ a: add(barC, mul(y, -62)), b: add(barC, mul(y, 62)), r: 1.4, tone: "hi" }];
    for (const sign of [1, -1]) {
      parts.push({ a: add(barC, mul(y, sign * 43)), b: add(barC, mul(y, sign * 46)), r: 3 });
      parts.push({ a: add(barC, mul(y, sign * 46)), b: add(barC, mul(y, sign * 50)), r: 13 });
      parts.push({ a: add(barC, mul(y, sign * 50)), b: add(barC, mul(y, sign * 60)), r: 2.6 });
    }
    return { ...body, hipL, hipR, kneeL, ankleL, heelL: fl.heel, toeL: fl.toe, kneeR: legR.knee, ankleR: legR.ankle, heelR: fr.heel, toeR: fr.toe, parts, flexion: theta };
  };
}

Object.assign(POSES, {
  cycle: (t) => bike(t, SEAT.fit),
  cycleLow: (t) => bike(t, SEAT.low),
  legext: (t) => legExtension(EXERCISES.legext.flexion(t)),
  legextShort: (t) => legExtension(EXERCISES.legextShort.flexion(t)),
  abductor,
  hipthrust: hipThrust,
  revlunge: lunge("revlunge"),
  revlungeShort: lunge("revlungeShort"),
});

// Bike loads: knee angle from the pose, extensor moment from the crank angle.
EXERCISES.cycle = { flexion: (t) => ACTIVITIES.cycle.flexion(t), moment: ACTIVITIES.cycle.moment, valgus: 0.4 };
EXERCISES.cycleLow = { flexion: (t) => ACTIVITIES.cycleLow.flexion(t), moment: ACTIVITIES.cycleLow.moment, valgus: 0.5 };

// --- Running and walking on a treadmill -----------------------------------------------------
// Knee angle from the model's gait curve; hip angle and ankle from standard gait shapes.
const loop = (keys) => (phase) => {
  const p = ((phase % 1) + 1) % 1;
  const list = [...keys, [keys[0][0] + 1, keys[0][1]]];
  for (let i = 1; i < list.length; i++) {
    if (p <= list[i][0]) {
      const [x0, y0] = list[i - 1];
      const [x1, y1] = list[i];
      const t = (p - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t * t * (3 - 2 * t);
    }
  }
  return keys[0][1];
};
const GAIT = {
  run: { hip: loop([[0, 26], [0.2, 6], [0.36, -14], [0.55, 4], [0.85, 42]]), ankle: loop([[0, 0], [0.18, -14], [0.36, 26], [0.6, 8], [0.9, -4]]), lean: 9, elbow: 92, arm: 0.9, flight: [0.36, 0.5], speed: 105 },
  walk: { hip: loop([[0, 25], [0.5, -12], [0.62, -6], [0.88, 28]]), ankle: loop([[0, 0], [0.1, 6], [0.45, -10], [0.62, 16], [0.75, 0]]), lean: 2, elbow: 18, arm: 0.6, flight: null, speed: 48 },
};
const TREAD = { x: -78, w: 170, y: -30, d: 60, top: 10 };

export const STAGES = {
  run: [[0.04, "foot strike"], [0.22, "loading: peak knee load"], [0.36, "push-off"], [0.5, "flight"], [0.8, "swing: knee folds"], [1, "reaching forward"]],
  walk: [[0.1, "heel strike"], [0.2, "loading"], [0.48, "mid-stance"], [0.62, "push-off"], [0.88, "swing"], [1, "reaching forward"]],
};
export const stageOf = (kind, t) => STAGES[kind].find(([end]) => ((t % 1) + 1) % 1 <= end)[1];

function gait(kind, activity) {
  const G = GAIT[kind];
  return (t) => {
    const legs = {};
    let lowest = Infinity;
    for (const [side, sign, offset] of [["L", 1, 0], ["R", -1, 0.5]]) {
      const p = t + offset;
      const hip = G.hip(p) * RAD;
      const knee = ACTIVITIES[activity].flexion(p) * RAD;
      const shin = hip - knee;
      const hipAt = [0, sign * BODY.hipW, 0];
      const kneeAt = add(hipAt, [BODY.thigh * Math.sin(hip), 0, -BODY.thigh * Math.cos(hip)]);
      const ankleAt = add(kneeAt, [BODY.shin * Math.sin(shin), 0, -BODY.shin * Math.cos(shin)]);
      const a = shin - G.ankle(p) * RAD;
      legs[side] = { hipAt, kneeAt, ankleAt, footDir: [Math.cos(a), 0, Math.sin(a)], down: [Math.sin(shin), 0, -Math.cos(shin)], swing: G.hip(p) };
      lowest = Math.min(lowest, ankleAt[2]);
    }
    const p = ((t % 1) + 1) % 1;
    const flight = G.flight && p > G.flight[0] && p < G.flight[1] ? Math.sin((Math.PI * (p - G.flight[0])) / (G.flight[1] - G.flight[0])) * 4 : 0;
    const lift = TREAD.top + BODY.ankleH - lowest + flight;
    const pelvis = [0, 0, lift];
    const lean = G.lean * RAD;
    const T = frame(pelvis, [Math.cos(lean), 0, -Math.sin(lean)], [Math.sin(lean), 0, Math.cos(lean)]);
    const armL = -G.arm * legs.L.swing;
    const armR = -G.arm * legs.R.swing;
    const body = upper(T, { L: [armL, G.elbow, 6], R: [armR, G.elbow, 6] });
    const pose = { ...body };
    for (const side of ["L", "R"]) {
      const leg = legs[side];
      const ankle = add(pelvis, leg.ankleAt);
      const f = foot(ankle, leg.footDir, leg.down);
      Object.assign(pose, { ["hip" + side]: add(pelvis, leg.hipAt), ["knee" + side]: add(pelvis, leg.kneeAt), ["ankle" + side]: ankle, ["heel" + side]: f.heel, ["toe" + side]: f.toe });
    }
    pose.flexion = flexionOf(pose.hipL, pose.kneeL, pose.ankleL);
    pose.stage = stageOf(kind, t);
    // Treadmill: deck, side rails, console post and handrail, and belt slats moving back.
    const parts = [
      { a: [TREAD.x, 0, TREAD.top / 2], b: [TREAD.x + TREAD.w, 0, TREAD.top / 2], w: TREAD.d + 10, t: TREAD.top, up: [0, 0, 1], bias: -60 },
      { a: [TREAD.x + TREAD.w - 6, -36, TREAD.top], b: [TREAD.x + TREAD.w + 6, -36, 118], r: 2.2 },
      { a: [TREAD.x + TREAD.w - 6, 36, TREAD.top], b: [TREAD.x + TREAD.w + 6, 36, 118], r: 2.2 },
      { a: [TREAD.x + TREAD.w + 6, -40, 118], b: [TREAD.x + TREAD.w + 6, 40, 118], w: 16, t: 9, up: [1, 0, 1] },
      { a: [TREAD.x + TREAD.w - 26, -36, 100], b: [TREAD.x + TREAD.w + 6, -36, 104], r: 1.6 },
      { a: [TREAD.x + TREAD.w - 26, 36, 100], b: [TREAD.x + TREAD.w + 6, 36, 104], r: 1.6 },
    ];
    const travel = (t * G.speed) % 20;
    for (let x = TREAD.x + 6 + travel; x < TREAD.x + TREAD.w - 4; x += 20) {
      parts.push({ a: [x, -TREAD.d / 2 + 2, TREAD.top + 0.1], b: [x, TREAD.d / 2 - 2, TREAD.top + 0.1], w: 1.2, t: 0.2, up: [0, 0, 1], tone: "faint", bias: -40 });
    }
    pose.parts = parts.map((part) => (part.r === 2.2 ? { ...part, bias: 0 } : part));
    pose.parts[0].tone = "mid";
    return pose;
  };
}

Object.assign(POSES, { run: gait("run", "run"), runRehab: gait("run", "run"), walk: gait("walk", "walk") });
EXERCISES.run = { flexion: (t) => ACTIVITIES.run.flexion(t), moment: ACTIVITIES.run.moment, valgus: 1, kind: "run" };
EXERCISES.runRehab = { flexion: (t) => ACTIVITIES.run.flexion(t), moment: (t) => ACTIVITIES.run.moment(t) * 0.86, valgus: 1, state: "rehab", kind: "run" };
EXERCISES.walk = { flexion: (t) => ACTIVITIES.walk.flexion(t), moment: ACTIVITIES.walk.moment, valgus: 0.35, kind: "walk" };
