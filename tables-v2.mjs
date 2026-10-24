// HTML tables for v2, computed from the model.
import { strideTrace, peakOf, exerciseAt, loadAt, ACTIVITIES, STATES } from "./model.mjs";
import "./gym.mjs";

const peakActivity = (key, state = "now") => {
  const trace = strideTrace(key, state, 240);
  return { stress: peakOf(trace, "lateralMpa"), tendon: peakOf(trace, "tendonBw").tendonBw };
};
const peakExercise = (key) => {
  const list = Array.from({ length: 240 }, (_, i) => exerciseAt(key, i / 240));
  return { stress: peakOf(list, "lateralMpa"), tendon: peakOf(list, "tendonBw").tendonBw };
};

const ROWS = [
  ["Everyday and sport", [
    ["Walking", () => peakActivity("walk"), "Fine. Low load, but this is where the kneecap rides furthest outward."],
    ["Stairs up", () => peakActivity("stairs"), "Fine. Use the rail if it catches."],
    ["Cycling, saddle set right", () => peakActivity("cycle"), "Good cross-training. Keep the saddle right and spin 85–95 rpm."],
    ["Cycling, low saddle, big gear", () => peakActivity("cycleLow"), "Likely your cycling pain. Fix the fit before the distance."],
    ["Running, now", () => peakActivity("run"), "Your highest load. Dose it with the marathon plan below."],
    ["Running, +10% cadence, after rehab", () => peakActivity("run", "rehab"), "Where rehab and a quicker step get you."],
  ]],
  ["Home exercises (Figs 3–8)", [
    ["Straight-leg raise", () => peakExercise("slr"), "Every day."],
    ["Clamshell with band", () => peakExercise("clam"), "Every day."],
    ["Glute bridge", () => peakExercise("bridge"), "Every day."],
    ["Slow box squat to ~60°", () => peakExercise("boxsquat"), "2–3× a week, add load slowly."],
    ["Slow step-down", () => peakExercise("stepdown"), "2–3× a week."],
    ["Spanish squat hold", () => peakExercise("spanish"), "2–3× a week, as tendon medicine."],
  ]],
  ["Gym machines and lifts (Figs 9–12)", [
    ["Hip abductor / adductor machine", () => peakExercise("abductor"), "Yes: the abductor is a strong choice for tracking."],
    ["Leg curl", () => peakExercise("legcurl"), "Yes. Hamstrings with no kneecap load."],
    ["Single-leg hip thrust", () => peakExercise("hipthrust"), "Yes. One of the best for running."],
    ["Leg extension, 90°→45° only", () => peakExercise("legextShort"), "Yes, with the range stop set."],
    ["Leg press, 0°→60°", () => peakExercise("legpress"), "Yes. Don't go deeper than 60–70° for now."],
    ["Leg extension, full range", () => peakExercise("legext"), "Not yet. The last 45° is the problem."],
    ["Reverse lunge, front knee ≤ 70°", () => peakExercise("revlungeShort"), "Yes, lighter, as a stepping stone."],
    ["Reverse lunge with barbell, full depth", () => peakExercise("revlunge"), "Later. As hard on the facet as a running stride."],
  ]],
];

const level = (mpa) => (mpa >= 7 ? 3 : mpa >= 4 ? 2 : 1);

export function comparisonTable() {
  const body = ROWS.map(([group, rows]) => {
    const lines = rows.map(([label, peak, verdict]) => {
      const { stress, tendon } = peak();
      const width = Math.min(100, (stress.lateralMpa / 11) * 100).toFixed(0);
      return `<tr><td>${label}</td><td class="kn-num">${stress.lateralMpa.toFixed(1)} MPa<span class="kn-bar" data-level="${level(stress.lateralMpa)}"><i style="width:${width}%"></i></span></td><td class="kn-num kn-hide">${stress.flexion.toFixed(0)}°</td><td class="kn-num kn-hide">${tendon.toFixed(1)}×</td><td class="kn-verdict">${verdict}</td></tr>`;
    });
    return `<tr class="kn-group"><td colspan="5">${group}</td></tr>${lines.join("")}`;
  }).join("");
  return `<table class="kn-cmp"><thead><tr><th>Activity</th><th>Peak outer-facet stress</th><th class="kn-hide">Knee at peak</th><th class="kn-hide">Tendon (×BW)</th><th>For the next 6 weeks</th></tr></thead><tbody>${body}</tbody></table>`;
}

// Marathon numbers: steps per leg and per-step peak, by cadence.
function runPeak(cadenceGain) {
  const scale = 1 - 0.014 * cadenceGain;
  const list = Array.from({ length: 240 }, (_, i) => {
    const phase = i / 240;
    return loadAt(ACTIVITIES.run.flexion(phase), ACTIVITIES.run.moment(phase) * scale, "now", 1);
  });
  return peakOf(list, "lateralMpa").lateralMpa;
}

export function marathonPlan() {
  const minutes = 4.25 * 60;
  const rows = [0, 5, 10].map((gain) => {
    const cadence = 165 * (1 + gain / 100);
    return `<tr><td>${gain ? `+${gain}%` : "Your usual"} (${cadence.toFixed(0)} spm)</td><td class="kn-num">${Math.round((cadence * minutes) / 2).toLocaleString("en-US")}</td><td class="kn-num">${runPeak(gain).toFixed(1)} MPa</td></tr>`;
  }).join("");
  const numbers = `<table class="kn-cmp"><thead><tr><th>Cadence, 4:15 marathon</th><th>Landings per leg</th><th>Peak outer-facet stress each landing</th></tr></thead><tbody>${rows}</tbody></table><p style="color:var(--anatomy-muted);font-size:12.5px">A quicker step means slightly more landings, each one lighter. Joint stress per landing matters more than the count, which is why cadence is the cheapest change you can make. Rehab strength (Fig 1, "After rehab") stacks on top of this.</p>`;

  const weeks = [
    ["Oct 26 – Nov 1", "Consolidate", "3–4 easy runs. Long run = your longest recent pain-free run, no longer. Start the +5% cadence on every run. Strength 2× (Figs 3–12 in the green/amber rows). Bike instead of a 4th run if the knee is grumbling."],
    ["Nov 2 – 8", "Build", "Long run +15–20 min if last week's long run followed the pain rule. Try run-walk on it (e.g. 9 min run / 1 min walk) and see how the knee feels the next morning. Strength 2×."],
    ["Nov 9 – 15", "Peak 1", "Longest run of the block: about 28–32 km or 3 h, whichever comes first, with run-walk. Flat route. Everything else easy. Strength 2×, lighter the day before the long run."],
    ["Nov 16 – 22", "Peak 2", "A second long run of about 26–30 km, or repeat last week's if that one left you sore. Strength 2×."],
    ["Nov 23 – 29", "Taper", "Volume down ~30%. Long run 16–20 km. Strength 1×, lighter: no new exercises."],
    ["Nov 30 – Dec 6", "Race week", "2–3 short easy runs with strides at race cadence. Clamshells and bridges only, early in the week. Race on the weekend."],
  ];
  const plan = `<table class="kn-plan"><thead><tr><th>Week</th><th>Focus</th><th>What to do</th></tr></thead><tbody>${weeks.map(([w, f, d]) => `<tr><td>${w}</td><td>${f}</td><td>${d}</td></tr>`).join("")}</tbody></table>`;
  return numbers + plan;
}
