// Figs 2–7: one card per exercise, a mannequin on a floor plate with the props it needs.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./vendor/anatomy/kit/iso-kit.mjs";
import * as G from "./vendor/anatomy/kit/lathe.mjs";
import { POSES, renderPose, STEP, STRAP_POST, BOX } from "./mannequin.mjs";
import "./gym.mjs";
import { anatPanel } from "./anatomy-knee.mjs";
import { exerciseAt } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 600;
const H = 330;
const FLOOR = { x: -112, y: -54, w: 224, d: 108, r: 6 };
const FLOOR_H = 8;

const STANDING = k.fitProjection([...k.boxCorners(FLOOR, -FLOOR_H - 4, 0), [0, 0, 178], [-20, 0, 178], [20, 0, 178]], W, H, { pad: 22, azimuth: 64, elevation: 22 });
const LYING = k.fitProjection([...k.boxCorners(FLOOR, -FLOOR_H - 4, 0), [0, 0, 64]], W, H, { pad: 18, azimuth: 60, elevation: 34 });
let PX = STANDING;
const at = (p) => k.iso(p, PX);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], PX) - k.depthOf([b[0], b[1], 0], PX));

function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FLOOR, -FLOOR_H - 4, FLOOR_H, PX)}"/>`];
  for (const [x, y] of byDepth(k.corners(FLOOR, 16))) {
    out.push(S(k.cylinder(x, y, 6, -FLOOR_H - 4, 1.4, PX, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -FLOOR_H - 2.6, 2.6, PX, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(FLOOR, -FLOOR_H, FLOOR_H, PX, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(FLOOR, -FLOOR_H + 3, PX, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(FLOOR, 5), 0, PX), { tone: "faint" }));
  const screws = k.corners(FLOOR, 9);
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function mat(plan) {
  const out = [S(k.slabOf(plan, 0, 1.2, PX, 5), { tone: "lo", crease: "faint" })];
  const lines = [];
  for (let x = plan.x + 15; x < plan.x + plan.w - 5; x += 15) lines.push(k.lineOnTop([x, plan.y], [x, plan.y + plan.d], 1.2, PX));
  out.push(L(lines.join(""), { tone: "faint" }));
  return out.join("");
}

function step() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(STEP, 4))) out.push(S(k.cylinder(x, y, 2.6, 0, 1.5, PX, 16), { tone: "lo" }));
  out.push(S(k.slabOf(STEP, 1.5, STEP.h - 1.5, PX, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(STEP, 6, PX, 3), { tone: "faint" }) }));
  const slots = [];
  for (let y = STEP.y + 4; y < STEP.y + STEP.d - 5; y += 3.6) slots.push(k.planOutline({ x: STEP.x + 4, y, w: STEP.w - 8, d: 1.4, r: 0.7 }, STEP.h, PX, 2));
  out.push(L(slots.join(""), { tone: "faint" }));
  return out.join("");
}

function box() {
  const out = [S(k.slabOf(BOX, 0, BOX.h - 5, PX, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(BOX, 22, PX, 3) + k.sideSeam(BOX, 44, PX, 3), { tone: "faint" }) })];
  out.push(S(k.slabOf(k.insetPlan(BOX, -0.6), BOX.h - 5, 5, PX, 4, 0.8), { tone: "hi", crease: "lo" }));
  out.push(D(k.corners(BOX, 3).map(([x, y]) => at([x, y, BOX.h - 5])), { size: 0.4 }));
  return out.join("");
}

function post() {
  const [x, y, z] = STRAP_POST;
  const out = [S(k.cylinder(x, y, 9, 0, 3, PX, 32, 0.6), { tone: "mid" })];
  out.push(D(G.dotsOf(G.frameOf([x, y, 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 6.5, 6, PX, { all: true }), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 2.6, 3, 62, PX, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 2.6, 30, PX, 14), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 3.8, z - 3, 6, PX, 20, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 3.4, 65, 2.4, PX, 20, 0.3), { tone: "mid" }));
  return out.join("");
}

export const CARDS = [
  {
    key: "slr",
    lying: true,
    fig: "Fig 2",
    title: "Straight-leg raise",
    props: () => mat({ x: -84, y: -34, w: 168, d: 68, r: 3 }),
    dose: "3 × 12, 3 s up, 3 s down · daily from week 1",
    caption:
      "Lie on your back, right knee bent. Tighten the front of the left thigh until the kneecap draws up, then lift the straight leg to the height of the bent knee. The knee stays straight, so the kneecap sits above the groove and is barely pressed into it: the quadriceps work with almost no load on the sore facet. On the bench: the spool pulls, the sled hardly touches the track.",
  },
  {
    key: "spanish",
    fig: "Fig 3",
    title: "Spanish squat hold",
    props: () => mat({ x: -40, y: -34, w: 80, d: 68, r: 3 }),
    front: () => post(),
    dose: "5 × 30–45 s hold · 2–3× a week · pain ≤ 3/10",
    caption:
      "A strap anchored in front wraps behind both knees. Sit back into it with shins vertical and hold at about 60°. Long holds are the usual starting load for a sore patellar tendon (they often ease tendon pain for a while afterwards) and build quadriceps strength. The shin stays upright, so the tendon carries load without the knee sliding forward over the foot. On the bench: a steady pull through the tendon strap with the sled seated in the deep groove.",
  },
  {
    key: "clam",
    lying: true,
    fig: "Fig 4",
    title: "Clamshell with band",
    props: () => mat({ x: -84, y: -34, w: 168, d: 68, r: 3 }),
    dose: "3 × 15 each side, 2 s pause at the top",
    caption:
      "Lie on your side, hips and knees bent, a light loop band above the knees. Keep the feet together and open the top knee without rolling the pelvis back. It trains the hip muscles that stop the knee drifting inward when you land on one leg. On the bench: weak hips let the tibial anchor slide further out under load (the 6 mm on top of your 17 mm). This is the part of that pull you can train away.",
  },
  {
    key: "bridge",
    lying: true,
    fig: "Fig 5",
    title: "Glute bridge",
    props: () => mat({ x: -84, y: -34, w: 168, d: 68, r: 3 }),
    dose: "3 × 12, 2 s hold at the top · progress to single leg",
    caption:
      "On your back with knees bent and feet flat, push through the heels and lift the hips until shoulders, hips and knees line up. The hip extensors do the work and the knee holds still, so the kneecap stays put. Strong hips take load off the knee when you run, and keep the thigh from rolling inward. On the bench: less dynamic valgus at the anchor slide.",
  },
  {
    key: "stepdown",
    fig: "Fig 6",
    title: "Slow step-down",
    props: () => step(),
    dose: "3 × 8 each leg · 15 cm step · 3 s down · in front of a mirror",
    caption:
      "Stand on the step on your left leg and slowly lower the right heel toward the floor, then rise. Keep the left knee over the second toe, the pelvis level and the trunk tall. This is single-leg landing in slow motion, the movement that loads your knee in running, and it trains the quadriceps and the hip to control it together. On the bench: the sled is driven into the groove under load while the anchor slide is held at 17 mm.",
  },
  {
    key: "boxsquat",
    fig: "Fig 7",
    title: "Slow box squat",
    props: () => box(),
    dose: "3 × 8, 3 s down, 3 s up · to a high box (~60°) · add load over weeks",
    caption:
      "Sit back to a high box until you just touch it, and stand up slowly. Keep to about 60° of knee bend at first and lower the box as symptoms allow. Slow, heavy-over-time loading is the backbone of patellar tendon rehab and builds the quadriceps that steer the kneecap. On the bench: a stronger spool and tendon strap, with the groove gripping the sled firmly at this angle.",
  },
];

const scrubber = (title) => `<div class="kn-scrubrow"><button type="button" class="kn-play" aria-label="Play or pause">❚❚</button><input type="range" class="kn-scrub" min="0" max="1000" step="1" value="400" aria-label="${title}: drag through one rep"></div>`;

function variants(card) {
  if (!card.variants) return "";
  const buttons = card.variants.map((v, i) => `<button type="button" data-value="${v.key}" aria-pressed="${i === 0}">${v.label} · ${rangeOf(v.key).peak.lateralMpa.toFixed(1)} MPa</button>`).join("");
  return `<div class="kn-controls"><div class="kn-seg kn-variant">${buttons}</div></div>`;
}

function rangeOf(key) {
  const list = Array.from({ length: 80 }, (_, i) => ({ ...exerciseAt(key, i / 80), pose: POSES[key](i / 80) }));
  const flex = list.map((s) => s.pose.flexion);
  const peak = list.reduce((best, s) => (s.lateralMpa > best.lateralMpa ? s : best), list[0]);
  return { lo: Math.min(...flex), hi: Math.max(...flex), peak };
}

export function exerciseFigures(cards = CARDS, { anatomy = false } = {}) {
  return cards.map((card) => {
    PX = card.lying ? LYING : STANDING;
    const pose = POSES[card.key](0.4);
    const r = rangeOf(card.key);
    const svg = k.figureSvg({
      width: W,
      height: H,
      label: `A jointed wooden mannequin on a floor plate doing a ${card.title.toLowerCase()}. The kneecap of its left knee is highlighted.`,
      body: [floor(), card.props(), `<g data-part="back"></g>`, `<g data-part="mq">${renderPose(pose, PX)}</g>`, `<g data-part="front"></g>`, card.front ? card.front() : ""],
    });
    const knee = r.hi - r.lo < 3 ? `knee held at ${r.hi.toFixed(0)}°` : `knee ${r.lo.toFixed(0)}–${r.hi.toFixed(0)}°`;
    return k.plateHtml({
      fig: card.fig,
      title: card.title,
      hint: "Hover or drag the slider",
      readout: "",
      keys: [
        { mark: "lit", label: "Your left kneecap" },
        { mark: "dim", label: `${knee} · peak outer-facet stress ≈ ${r.peak.lateralMpa.toFixed(1)} MPa (running ≈ 10.8)` },
      ],
      caption: card.caption,
      body: `<div class="iso-stage kn-ex" data-ex="${card.key}" data-p='${JSON.stringify(PX)}' tabindex="0" role="slider" aria-label="${card.title}: arrow keys step through one rep" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40">${svg}</div>${scrubber(card.title)}${anatomy ? anatPanel() : ""}${variants(card)}<p class="kn-dose">${card.dose}</p>`,
    });
  }).join("");
}

const strip = (file) =>
  readFileSync(join(HERE, file), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "");

export const EXERCISE_LIVE = liveScript(false);
export const EXERCISE_LIVE_V2 = liveScript(true);
function liveScript(withGym) {
  return `{
${strip("mannequin.mjs")}
${withGym ? strip("gym.mjs") : ""}
const PERIOD = { run: 4.2, runRehab: 4.2, walk: 5, slr: 6, spanish: 9, clam: 5, bridge: 6, stepdown: 7, boxsquat: 7.5, cycle: 2.6, cycleLow: 3.6, legext: 5, legextShort: 4.5, abductor: 4, hipthrust: 5, revlunge: 6, revlungeShort: 6 };
const still = matchMedia("(prefers-reduced-motion: reduce)");
for (const stage of document.querySelectorAll(".kn-ex")) {
  let key = stage.dataset.ex;
  const plate = stage.closest(".iso-plate");
  plate.querySelectorAll(".kn-variant button").forEach((b) => b.addEventListener("click", () => {
    key = b.dataset.value;
    plate.querySelectorAll(".kn-variant button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    draw();
    run();
  }));
  const PX = JSON.parse(stage.dataset.p);
  const svg = stage.querySelector("svg");
  const layer = svg.querySelector('[data-part="mq"]');
  const back = svg.querySelector('[data-part="back"]');
  const front = svg.querySelector('[data-part="front"]');
  const readout = stage.closest(".iso-plate").querySelector("[data-readout]");
  let t = 0.4, target = 0.4, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0;
  const scrub = plate.querySelector(".kn-scrub");
  const play = plate.querySelector(".kn-play");
  const setPlaying = (on) => { touring = on; clearTimeout(idle); play.textContent = on ? "❚❚" : "▶"; play.setAttribute("aria-pressed", String(on)); if (on) { target = t; run(); } };
  const wire = (pair) => wireSvg(iso(pair[0], PX), iso(pair[1], PX), { tone: "mid", size: 1.1 });
  function draw() {
    const pose = POSES[key](t);
    layer.innerHTML = renderPose(pose, PX);
    back.innerHTML = (pose.extraBack || []).map(wire).join("");
    front.innerHTML = (pose.extraFront || []).map(wire).join("") + (pose.band ? wire(pose.band) : "");
    const s = loadAt(pose.flexion, EXERCISES[key].moment(t), EXERCISES[key].state || "now", EXERCISES[key].valgus);
    if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round((((t % 1) + 1) % 1) * 1000));
    const text = (pose.stage ? pose.stage + " · " : "") + "knee " + pose.flexion.toFixed(0) + "° · facet " + s.lateralMpa.toFixed(1) + " MPa · tendon " + s.tendonBw.toFixed(1) + "×BW";
    if (readout.textContent !== text) readout.textContent = text;
    if (typeof anatDraw === "function" && plate.querySelector(".kn-anat")) anatDraw(plate, { flexion: pose.flexion, shift: s.shiftMm, mpa: s.lateralMpa, tendon: s.tendonBw });
    stage.setAttribute("aria-valuenow", String(Math.round(t * 100)));
    stage.setAttribute("aria-valuetext", text);
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    if (touring) target = (target + dt / PERIOD[key]) % 1;
    let d = target - t;
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    t = touring ? target : (t + d * (1 - Math.exp(-dt / 0.15)) + 1) % 1;
    draw();
    frame = visible && (touring || Math.abs(d) > 1e-4) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; target = t; run(); }, 3200); run(); };
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "80px 0px" }).observe(stage);
  stage.addEventListener("pointermove", (event) => { const box = svg.getBoundingClientRect(); target = Math.min(0.999, Math.max(0, (event.clientX - box.left) / box.width)); hold(); });
  stage.addEventListener("keydown", (event) => { const step = { ArrowRight: 0.03, ArrowLeft: -0.03 }[event.key]; if (!step) return; target = (target + step + 1) % 1; hold(); event.preventDefault(); });
  scrub.addEventListener("input", () => { setPlaying(false); target = t = Number(scrub.value) / 1000; draw(); });
  play.addEventListener("click", () => setPlaying(!touring));
  if (still.matches) setPlaying(false);
  draw();
}
}`;
}

// --- v2 cards ------------------------------------------------------------------------------------
const floorMat = () => mat({ x: -84, y: -34, w: 168, d: 68, r: 3 });

export const BIKE_CARD = {
  key: "cycle",
  fig: "Fig 2",
  title: "Cycling: saddle height",
  props: () => "",
  variants: [
    { key: "cycle", label: "Saddle set right" },
    { key: "cycleLow", label: "4 cm low, big gear" },
  ],
  dose: "Knee 25–35° bent at the bottom of the stroke · cadence 85–95 rpm · spin, don't grind",
  caption:
    "The legs are driven by the crank: every knee angle here comes from the bike's own geometry. With the saddle set right, the knee is about 35° bent at the bottom and 110° at the top, and its hardest push is around 90°, where the kneecap is deep in the groove and its contact patch is largest. Drop the saddle 4 cm and push a big gear at 60 rpm, and the same effort comes with deeper bends and more torque per stroke: peak outer-facet stress rises by about 60%, repeated some 4,000–5,000 times an hour.",
};

export const HOME_CARDS_V2 = CARDS.map((card, i) => ({
  ...card,
  fig: `Fig ${i + 3}`,
  caption:
    card.key === "slr"
      ? "Lie on your back, right knee bent. Tighten the front of the left thigh until the kneecap draws up, then lift the straight leg to the height of the bent knee. The knee stays straight, so the kneecap sits high in the shallow groove under a light load: the quadriceps work while the sore facet stays well below its running load. On the bench: the spool pulls, the sled barely presses."
      : card.caption,
}));

export const GYM_CARDS = [
  {
    key: "legext",
    fig: "Fig 9",
    title: "Leg extension machine",
    props: () => "",
    variants: [
      { key: "legext", label: "Full range 90°→0°" },
      { key: "legextShort", label: "90°→45° only" },
    ],
    dose: "Use the range stop: 90°→45° · 3 × 12 · slow · add the last 45° later, light",
    caption:
      "The one machine that behaves opposite to everything else. The pad on the shin has its longest lever when the leg is nearly straight, so the quadriceps pull hardest exactly where the groove holds the kneecap least and its contact patch is smallest. The full range puts about 6.9 MPa on the outer facet near the top; stopping at 45° keeps it near 3. On the bench: maximum spool force with the sled in the shallow end.",
  },
  {
    key: "abductor",
    fig: "Fig 10",
    title: "Hip abductor / adductor machine",
    props: () => "",
    dose: "Abductor 3 × 15 · 2 s squeeze · adductor optional, same dose",
    caption:
      "Seated leg opening (abductor) and closing (adductor). The knees stay bent at 90° and the quadriceps are idle, so the kneecap carries essentially nothing. The abductor trains the same hip muscles as the clamshell, at heavier loads. The adductor is fine to do but doesn't help tracking. On the bench: the tibial anchor slide held at 17 mm instead of drifting to 23 mm when you land.",
  },
  {
    key: "hipthrust",
    fig: "Fig 11",
    title: "Single-leg hip thrust",
    props: () => "",
    dose: "3 × 10 each leg · pause 2 s at the top · shin vertical at the top",
    caption:
      "Upper back on a bench, one foot on the floor, the other knee held up. Drive the hips up until the trunk and thigh line up. The knee stays bent near 90° and the work is mostly the glutes', so kneecap stress stays moderate, about a third of running. Done on one leg, it also trains the pelvis to stay level, which is what keeps the knee from caving in on a long run.",
  },
  {
    key: "revlunge",
    fig: "Fig 12",
    title: "Reverse lunge with a barbell",
    props: () => floorMat(),
    variants: [
      { key: "revlunge", label: "Full depth" },
      { key: "revlungeShort", label: "Front knee ≤ 70°" },
    ],
    dose: "For now: shorter step, front knee ≤ 70° · 3 × 8 each leg · add depth as it stays quiet",
    caption:
      "Step back, drop the back knee toward the floor, drive up through the front heel. Stepping backward keeps the front shin more upright than a forward lunge, so it's the kinder lunge for the kneecap. But a full-depth rep with a bar on your back loads the front knee at about 92° with roughly as much outer-facet stress as a running stride. Keep the front knee to about 70° until it's quiet, and the stress drops by about a third.",
  },
];

export const RUN_CARD = {
  key: "run",
  fig: "Fig 2",
  title: "One stride, and your knee inside it",
  props: () => "",
  variants: [
    { key: "run", label: "Run, now" },
    { key: "runRehab", label: "Run after rehab" },
    { key: "walk", label: "Walk" },
  ],
  dose: "The lit kneecap is your left knee. Drag the slider to stop at any moment of the stride.",
  caption:
    "The legs follow the model's running curve. At foot strike the knee is about 14° bent. In the next tenth of a second it bends to about 42° while the body's weight lands on it: this is the loading moment, when the patellar tendon pulls hardest (about 5× body weight) and the kneecap is pressed into the groove with its outer facet, where the crack is, taking the most stress (red). Then the knee straightens to push off, and in the swing it folds to about 95° with almost no load. In walking the loads are a quarter as large, but the knee stays nearly straight, so the kneecap sits high in the shallow groove and slides furthest outward (watch the slice and front views).",
};
