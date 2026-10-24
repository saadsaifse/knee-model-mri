// Patellofemoral model for one left knee. Pure functions, no DOM.
//
// Inputs come from the MRI report: TT-TG 17 mm, lateral patellar subluxation 8 mm
// (measured supine, knee straight, quadriceps relaxed), lesion on the lateral facet.
// Everything else is a textbook approximation and is labelled as such on the page:
//   - quadriceps force = knee extensor moment / patellar-tendon moment arm (~45 mm)
//   - PF joint reaction force = 2 · F_quad · sin(flexion / 2)  (pulley model)
//   - PF contact area grows with flexion (Huberti & Hayes 1984 cadaver data)
//   - the trochlear groove only grips the patella from ~10° to ~35° of flexion
// Numbers are for one 75 kg runner and are illustrative, not a measurement of this knee.

export const BODY_KG = 75;
export const G = 9.81;
export const BW = BODY_KG * G;
export const TT_TG_MM = 17;
export const MRI_SHIFT_MM = 8;
export const TENDON_MM = 48;
export const MOMENT_ARM_M = 0.045;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const lerpTable = (table, x) => {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    const [x0, y0] = table[i - 1];
    if (x <= x1) {
      const t = (x - x0) / (x1 - x0);
      const s = t * t * (3 - 2 * t);
      return y0 + (y1 - y0) * s;
    }
  }
  return table[table.length - 1][1];
};

// Periodic smooth interpolation through [phase, value] keys, phase in 0..1.
function loopCurve(keys) {
  return (phase) => {
    const p = ((phase % 1) + 1) % 1;
    const list = [...keys, [keys[0][0] + 1, keys[0][1]]];
    for (let i = 1; i < list.length; i++) {
      if (p <= list[i][0] || i === list.length - 1) {
        const [x0, y0] = list[i - 1];
        const [x1, y1] = list[i];
        const t = Math.min(1, Math.max(0, (p - x0) / (x1 - x0)));
        const s = t * t * (3 - 2 * t);
        return y0 + (y1 - y0) * s;
      }
    }
    return keys[0][1];
  };
}

// Knee flexion (degrees) and knee extensor moment (N·m per kg) over one stride.
// Shapes follow published normal gait curves (Winston/Perry walking, Novacheck running).
export const ACTIVITIES = {
  walk: {
    label: "Walking",
    stride: 1.1,
    flexion: loopCurve([[0, 4], [0.14, 18], [0.4, 5], [0.6, 38], [0.72, 62], [0.9, 15]]),
    moment: loopCurve([[0, 0], [0.05, 0.15], [0.13, 0.55], [0.25, 0.05], [0.4, 0], [0.62, 0.05], [0.7, 0.02], [0.9, 0]]),
  },
  run: {
    label: "Running",
    stride: 0.72,
    flexion: loopCurve([[0, 14], [0.14, 42], [0.36, 20], [0.68, 95], [0.92, 22]]),
    moment: loopCurve([[0, 0.3], [0.13, 2.7], [0.3, 0.6], [0.38, 0], [0.9, 0], [0.97, 0.05]]),
  },
  stairs: {
    label: "Stairs up",
    stride: 1.3,
    flexion: loopCurve([[0, 60], [0.35, 15], [0.62, 10], [0.8, 92], [0.95, 68]]),
    moment: loopCurve([[0, 1.0], [0.12, 1.15], [0.35, 0.25], [0.6, 0], [0.92, 0], [0.98, 0.6]]),
  },
  // One crank turn, phase 0 = pedal at the top. Saddle set so the knee is ~35° bent at the
  // bottom; ~180 W at 85 rpm gives a peak knee extensor moment near 0.55 N·m/kg (Ericson 1986).
  cycle: {
    label: "Cycling",
    stride: 0.71,
    flexion: (p) => 73 + 38 * Math.cos(2 * Math.PI * p),
    moment: loopCurve([[0, 0.12], [0.1, 0.42], [0.21, 0.55], [0.34, 0.26], [0.47, 0.02], [0.9, 0], [0.97, 0.04]]),
  },
  // Saddle 4 cm low (+6° at the top, +14° at the bottom) and a big gear at 60 rpm: same power, more torque.
  cycleLow: {
    label: "Cycling, low saddle, big gear",
    stride: 1.0,
    flexion: (p) => 82.5 + 33.5 * Math.cos(2 * Math.PI * p),
    moment: loopCurve([[0, 0.18], [0.1, 0.62], [0.21, 0.82], [0.34, 0.4], [0.47, 0.03], [0.9, 0], [0.97, 0.06]]),
  },
};
const VALGUS_SHARE = { walk: 0.35, run: 1, stairs: 0.7, cycle: 0.4, cycleLow: 0.5 };

// Two states of the same knee. Rehab cannot move bone, so TT-TG stays 17 mm.
// What it changes: quadriceps control (medial restraint), hip control (dynamic valgus),
// and step rate (+10% cadence lowers peak PF force ~14%, Lenhart 2014).
export const STATES = {
  now: { label: "Now", medialStiffness: 55, valgusMm: 6, cadenceScale: 1 },
  rehab: { label: "After 8–12 weeks of rehab", medialStiffness: 95, valgusMm: 1.5, cadenceScale: 0.86 },
};

// Huberti & Hayes contact area, cm², by flexion. 0° value extrapolated.
const CONTACT_CM2 = [[0, 1.6], [20, 2.6], [30, 3.1], [60, 3.9], [90, 4.1], [120, 4.0]];
export const contactArea = (flexion) => lerpTable(CONTACT_CM2, flexion);

// How firmly the groove holds the patella: 0 above the trochlea, 1 fully seated.
export const engagement = (flexion) => smooth(8, 38, flexion);

export function kneeAt(activityKey, stateKey, phase) {
  const activity = ACTIVITIES[activityKey];
  const state = STATES[stateKey];
  const flexion = activity.flexion(phase);
  const momentPerKg = activity.moment(phase) * (activityKey === "run" ? state.cadenceScale : 1);
  return loadAt(flexion, momentPerKg, stateKey, VALGUS_SHARE[activityKey]);
}

// valgusShare: how much of the dynamic valgus shows up in this task (running worst).
export function loadAt(flexion, momentPerKg, stateKey, valgusShare = 1) {
  const state = STATES[stateKey];
  const quadN = (momentPerKg * BODY_KG) / MOMENT_ARM_M;
  // Near a straight knee the quadriceps and patellar tendon are not collinear (≈15° apart),
  // so the kneecap is still pressed into the femur; that offset fades out by 40°.
  const wrap = flexion + 15 * (1 - smooth(0, 40, flexion));
  const pfjrN = 2 * quadN * Math.sin((wrap * Math.PI) / 360);
  const tendonN = quadN * lerpTable([[0, 1.0], [60, 0.85], [90, 0.7], [120, 0.65]], flexion);

  // The tendon pulls the patella toward the tubercle, which sits lateral of the groove.
  const offsetMm = TT_TG_MM + state.valgusMm * valgusShare * Math.min(1, momentPerKg / 1.2);
  const lateralN = tendonN * Math.sin(Math.atan(offsetMm / TENDON_MM)) * 0.25;
  const grip = engagement(flexion);
  const stiffness = state.medialStiffness + 900 * grip;
  const restingMm = MRI_SHIFT_MM * (1 - grip) + 1.2 * grip;
  const restingNow = stateKey === "rehab" ? restingMm * 0.8 : restingMm;
  const shiftMm = restingNow + lateralN / stiffness;

  // More lateral shift → more of the load on the lateral facet and a smaller contact patch.
  const lateralShare = Math.min(0.92, 0.6 + 0.028 * shiftMm);
  const areaMm2 = contactArea(flexion) * 100 * Math.max(0.55, 1 - 0.03 * shiftMm);
  const stressMpa = pfjrN / areaMm2;
  const lateralMpa = (stressMpa * lateralShare) / 0.6;

  return {
    flexion,
    quadN,
    pfjrN,
    pfjrBw: pfjrN / BW,
    tendonN,
    tendonBw: tendonN / BW,
    offsetMm,
    shiftMm,
    grip,
    lateralShare,
    stressMpa,
    lateralMpa,
  };
}

// One stride sampled, for the chart strip.
export function strideTrace(activityKey, stateKey, samples = 120) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const phase = i / samples;
    return { phase, ...kneeAt(activityKey, stateKey, phase) };
  });
}

// Exercises: knee angle over one rep and the knee extensor moment it demands (N·m/kg).
// valgus: how much the exercise lets the knee drift inward (0 = none).
export const EXERCISES = {
  slr: { flexion: () => 0, moment: (t) => 0.35 * smooth(0.05, 0.3, t) * (1 - smooth(0.7, 0.95, t)), valgus: 0 },
  spanish: { flexion: (t) => 65 * smooth(0.05, 0.3, t) * (1 - smooth(0.8, 0.98, t)), moment: (t) => 1.05 * smooth(0.05, 0.3, t) * (1 - smooth(0.8, 0.98, t)), valgus: 0 },
  clam: { flexion: () => 90, moment: () => 0, valgus: 0 },
  bridge: { flexion: () => 85, moment: (t) => 0.15 * smooth(0.1, 0.35, t) * (1 - smooth(0.65, 0.9, t)), valgus: 0 },
  stepdown: { flexion: (t) => 4 + 46 * smooth(0.1, 0.45, t) * (1 - smooth(0.55, 0.9, t)), moment: (t) => 0.2 + 0.95 * smooth(0.1, 0.45, t) * (1 - smooth(0.55, 0.9, t)), valgus: 0.4 },
  boxsquat: { flexion: (t) => 5 + 55 * smooth(0.05, 0.45, t) * (1 - smooth(0.55, 0.95, t)), moment: (t) => 0.1 + 0.9 * smooth(0.05, 0.45, t) * (1 - smooth(0.55, 0.95, t)), valgus: 0.3 },
};

// Gym machines. Moments are for a moderate working load (≈10–12 rep max) and are approximate.
const bump = (t) => smooth(0.05, 0.42, t) * (1 - smooth(0.58, 0.95, t));
const extensionMoment = (flexion) => 1.0 * (0.3 + 0.7 * Math.cos((flexion * Math.PI) / 180));
export const GYM = {
  legext: { label: "Leg extension, full range (90°→0°)", flexion: (t) => 90 - 85 * bump(t), moment: (t) => extensionMoment(90 - 85 * bump(t)), valgus: 0 },
  legextShort: { label: "Leg extension, 90°→45° only", flexion: (t) => 90 - 45 * bump(t), moment: (t) => extensionMoment(90 - 45 * bump(t)), valgus: 0 },
  abductor: { label: "Hip abductor / adductor machine", flexion: () => 90, moment: () => 0.03, valgus: 0 },
  hipthrust: { label: "Single-leg hip thrust", flexion: (t) => 100 - 11 * bump(t), moment: (t) => 0.15 + 0.45 * bump(t), valgus: 0.2 },
  revlunge: { label: "Reverse lunge, barbell (≈30% body wt)", flexion: (t) => 8 + 84 * bump(t), moment: (t) => 0.3 + 1.25 * bump(t), valgus: 0.5 },
  revlungeShort: { label: "Reverse lunge, shorter (front knee ≤ 70°)", flexion: (t) => 8 + 62 * bump(t), moment: (t) => 0.3 + 1.0 * bump(t), valgus: 0.4 },
  legpress: { label: "Leg press, 0°→60°", flexion: (t) => 5 + 55 * bump(t), moment: (t) => 0.2 + 1.0 * bump(t), valgus: 0.3 },
  legcurl: { label: "Leg curl (hamstrings)", flexion: (t) => 10 + 80 * bump(t), moment: () => 0, valgus: 0 },
};
Object.assign(EXERCISES, GYM);

export function exerciseAt(key, t) {
  const e = EXERCISES[key];
  return loadAt(e.flexion(t), e.moment(t), "now", e.valgus);
}

export function peakOf(list, field) {
  return list.reduce((best, item) => (item[field] > best[field] ? item : best), list[0]);
}
