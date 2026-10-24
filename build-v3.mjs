import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "./vendor/anatomy/scripts/inline-kit.mjs";
import * as B from "./bench.mjs";
import * as M from "./model.mjs";
import "./gym.mjs";
import { exerciseFigures, EXERCISE_LIVE_V2, BIKE_CARD, HOME_CARDS_V2, GYM_CARDS, RUN_CARD } from "./exercises.mjs";
import { comparisonTable, marathonPlan } from "./tables-v2.mjs";
import { anatPanel, ANAT_CSS } from "./anatomy-knee.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const strip = (file) =>
  readFileSync(join(HERE, file), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "");

const art = B.build();
const P = B.P;
const restX = B.xAt(0);

const svg = k.figureSvg({
  width: B.WIDTH,
  height: B.HEIGHT,
  label:
    "A patella tracking bench. A grooved track stands for the femur's trochlea: shallow at one end, deep at the other. A sled stands for the kneecap and rides in the groove. A spool at the back pulls it like the quadriceps, a strap ties it to an anchor block like the patellar tendon, and the anchor sits 17 mm to the outer side of the groove centre, the TT-TG distance from the MRI. A spring on the inner side holds the sled back. As the knee bends the sled runs into the deep part of the groove. A gauge reads the stress on the outer facet of the kneecap and a chart strip records it over one stride.",
  body: [
    art.back1,
    `<g data-part="needles"><path data-part="max" class="iso-line" data-tone="lo" data-free="" style="stroke-width:.9"/><path data-part="needle" class="iso-line" data-tone="hi" data-free="" style="stroke-width:1.2"/></g>`,
    art.back2,
    `<g data-part="quad"></g>`,
    `<g data-part="crank"></g>`,
    `<g data-part="sled" transform="${k.translateAlong(P, [restX, 0, 0])}">${art.sled}</g>`,
    `<g data-part="spring"></g>`,
    art.rails,
    `<g data-part="carriage">${art.carriage}</g>`,
    `<g data-part="tendon"></g>`,
    `<g data-part="anchor">${art.anchor}<path data-part="dial" class="iso-line" data-tone="hi" data-free="" style="stroke-width:1"/></g>`,
    art.chart,
    `<g data-part="traces"></g>`,
    `<g data-part="pen">${art.pen}</g>`,
    `<g data-part="penarm"></g>`,
  ],
});

const controls = `<div class="kn-controls" role="group" aria-label="Bench controls">
  <div class="kn-seg" data-group="activity">
    <button type="button" data-value="walk">Walk</button><button type="button" data-value="run" aria-pressed="true">Run</button><button type="button" data-value="stairs">Stairs up</button><button type="button" data-value="cycle">Cycle</button><button type="button" data-value="cycleLow">Cycle, low saddle</button>
  </div>
  <div class="kn-seg" data-group="state">
    <button type="button" data-value="now" aria-pressed="true">Now</button><button type="button" data-value="rehab">After rehab</button>
  </div>
</div>
<table class="kn-table" aria-live="polite"><thead><tr><th>Per stride / stroke</th><th>Now</th><th>After rehab</th></tr></thead><tbody data-part="table"></tbody></table>`;

const fig1 = k.plateHtml({
  fig: "Fig 1",
  title: "Patella tracking bench",
  hint: "Hover or drag the slider",
  readout: "run · knee 14°",
  keys: [
    { mark: "lit", label: "Sled = your kneecap (patella)" },
    { mark: "raised", label: "Track = trochlear groove; tall wall = outer (lateral) side" },
    { mark: "raised", label: "Spool = quadriceps · strap to anchor = patellar tendon" },
    { mark: "dim", label: "Spring = inner restraint (VMO + MPFL)" },
    { mark: "flat", label: "Film pads = where the outer facet is loaded hardest" },
  ],
  caption:
    "Cycling is on the bench too (Cycle, and Cycle with a low saddle and big gear). Turn the crank and the knee bends: the sled runs from the shallow end of the groove (straight knee) into the deep end. Near a straight knee the groove barely holds it, so the 17 mm sideways pull of the tendon slides it up the outer wall, about the 8 mm the MRI saw. Bent past ~30° the groove grips it, but now the load is large and lands on the outer facet: the gauge reads that stress, its grey hand keeps the stride's peak, and the strip records a whole stride (solid: now, dashed: after rehab). Model for a 75 kg person; numbers are estimates, not measurements of your knee.",
  body: `<div class="iso-stage kn-stage" tabindex="0" role="slider" aria-label="Stride phase. Left and right arrows step through the stride; 1 to 5 pick walk, run, stairs, cycle, cycle with a low saddle; R toggles rehab." aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}</div><div class="kn-scrubrow"><button type="button" class="kn-play" aria-label="Play or pause">❚❚</button><input type="range" class="kn-scrub" min="0" max="1000" step="1" value="0" aria-label="Stride phase"></div>${anatPanel()}${controls}`,
});

const CONST = {
  P,
  Z0: B.Z0,
  U: B.UNITS_PER_MM,
  LIFT: B.LIFT,
  SLED_HALF: B.SLED_HALF,
  SPOOL: B.SPOOL,
  CRANK_Y: B.CRANK_Y,
  CRANK_R: B.CRANK_R,
  TIBIA_Y: B.TIBIA_Y,
  CARRIAGE_TOP: B.CARRIAGE_TOP,
  POST: B.POST,
  POST_TOP: B.POST_TOP,
  GAUGE: B.GAUGE,
  CHART: B.CHART,
  PAPER: B.PAPER,
  PAPER_TOP: B.PAPER_TOP,
  PADS: B.PADS,
  DIAL: B.DIAL,
  ANCHOR: B.ANCHOR,
  TIBIA_GAP: B.TIBIA_GAP,
};

const live = `
${strip("model.mjs")}
${strip("parts.mjs")}
${strip("anatomy-knee.mjs")}
const C = ${JSON.stringify(CONST)};
const P = C.P;
const xAt = ${B.xAt.toString()};
const crankPhi = (deg) => Math.PI / 2 - (xAt(deg) - xAt(0)) / C.SPOOL.r;
const gaugeAngle = ${B.gaugeAngle.toString()};
const chartY = (mpa) => C.PAPER.y + 2 + (Math.min(13, mpa) / 13) * (C.PAPER.d - 4);
const chartX = (phase) => C.PAPER.x + phase * C.PAPER.w;

const stage = document.querySelector(".kn-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const el = { sled: part("sled"), quad: part("quad"), crank: part("crank"), spring: part("spring"), carriage: part("carriage"), tendon: part("tendon"), anchor: part("anchor"), dial: part("dial"), needle: part("needle"), max: part("max"), traces: part("traces"), pen: part("pen"), penarm: part("penarm") };
const pads = [...svg.querySelectorAll("[data-pad]")].map((g) => g.querySelector(".kn-pad"));
const readout = stage.closest(".iso-plate").querySelector("[data-readout]");
const table = document.querySelector('[data-part="table"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
let activity = "run", state = "now";
let phase = 0, target = 0, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0;
let shown = null, peak = 0, film = C.PADS.map(() => 0);
const seg3 = (a, b) => pathOf([iso(a, P), iso(b, P)]);
const inPlane = (c, r, phi) => pointIn(c, [1, 0, 0], [0, 0, 1], r, phi);

function traces() {
  const line = (key) => pathOf(strideTrace(activity, key, 160).map((s) => iso([chartX(s.phase), chartY(s.lateralMpa), C.PAPER_TOP], P)));
  el.traces.innerHTML = lineSvg(line("rehab"), { tone: "mid", dashed: true }) + lineSvg(line("now"), { tone: "hi" });
  const rows = [["Peak outer-facet stress", "lateralMpa", " MPa", 1], ["Peak kneecap joint load", "pfjrBw", "× BW", 1], ["Peak patellar tendon load", "tendonBw", "× BW", 1], ["Most kneecap shift", "shiftMm", " mm", 1]];
  const now = strideTrace(activity, "now"), rehab = strideTrace(activity, "rehab");
  table.innerHTML = rows.map(([label, key, unit, digits]) => "<tr><td>" + label + "</td><td>" + peakOf(now, key)[key].toFixed(digits) + unit + "</td><td>" + peakOf(rehab, key)[key].toFixed(digits) + unit + "</td></tr>").join("");
  peak = 0;
  film = film.map(() => 0);
}

function draw(dt) {
  const s = kneeAt(activity, state, phase);
  const xs = xAt(s.flexion);
  const dy = s.shiftMm * C.U;
  const lift = dy * C.LIFT;
  el.sled.setAttribute("transform", translateAlong(P, [xs, dy, lift]));

  // Quadriceps strap: from the bottom of the wound drum to the sled's proximal end.
  const drumBottom = [C.SPOOL.x + 4, 3, C.SPOOL.z - C.SPOOL.r - 3.2];
  const quadEnd = [xs - C.SLED_HALF * 0.86 - 0.2, dy + 3, C.Z0 + 15 + lift];
  el.quad.innerHTML = solidSvg(strap(drumBottom, quadEnd, 24, 2.6, [0, 0, 1], P), { tone: "hi", crease: "lo" });

  // Crank turns with the drum.
  const phi = crankPhi(s.flexion);
  const hub = [C.SPOOL.x, C.CRANK_Y, C.SPOOL.z];
  const knob = inPlane(hub, C.CRANK_R, phi);
  const knobRing = (y) => Array.from({ length: 18 }, (_, i) => [knob[0] + 3.2 * Math.cos((i / 18) * Math.PI * 2), y, knob[2] + 3.2 * Math.sin((i / 18) * Math.PI * 2)]);
  el.crank.innerHTML = solidSvg(strap(hub, knob, 5, 2.4, [0, -1, 0], P), { tone: "mid" }) + solidSvg(loft([knobRing(C.CRANK_Y - 1.2), knobRing(C.CRANK_Y - 10)], P), { tone: "mid" });

  // Medial spring from the post to the sled's lug.
  const lug = [xs - 10, dy - 12.5, C.Z0 + 24.5 + lift];
  const top = [C.POST[0], C.POST[1], C.POST_TOP - 2];
  const coil = coilP(top, lug, 2.8, 12, P);
  const wire = state === "rehab" ? 1.5 : 0.9;
  el.spring.innerHTML = '<path class="iso-line" data-tone="lo" style="stroke-width:' + wire + '" d="' + coil.back + '"/><path class="iso-line" data-tone="mid" style="stroke-width:' + wire + '" d="' + coil.front + '"/>' + dotsSvg([iso(top, P), iso(lug, P)], { size: 1, tone: "hi" });

  // Tibial carriage follows the sled; the anchor sits TT-TG plus dynamic valgus lateral.
  const xt = xs + C.TIBIA_GAP;
  const ya = s.offsetMm * C.U;
  el.carriage.setAttribute("transform", translateAlong(P, [xt, 0, 0]));
  el.anchor.setAttribute("transform", translateAlong(P, [xt, ya, 0]));
  const apex = [xs + C.SLED_HALF - 1, dy + 1, C.Z0 + 6.5 + lift];
  const anchorFace = [xt + 6.2, ya, C.CARRIAGE_TOP + 2 + 13];
  el.tendon.innerHTML = solidSvg(strap(apex, anchorFace, 18, 3, [0, 0, 1], P), { tone: "hi", crease: "lo" });
  const turn = (s.tendonBw / 8) * Math.PI * 2;
  el.dial.setAttribute("d", lineOnTop([20 - Math.sin(turn) * 2, Math.cos(turn) * 2], [20 + Math.sin(turn) * (C.DIAL.r - 2.4), -Math.cos(turn) * (C.DIAL.r - 2.4)], C.DIAL.z + 0.2, P));

  // Gauge needle and peak hand.
  peak = Math.max(peak, s.lateralMpa);
  const face = [C.GAUGE.x, C.GAUGE.y - 6.3, C.GAUGE.z];
  const needleOf = (mpa, length) => { const a = gaugeAngle(mpa); return seg3(inPlane(face, -4, a), inPlane(face, length, a)); };
  el.needle.setAttribute("d", needleOf(s.lateralMpa, C.GAUGE.r - 6));
  el.max.setAttribute("d", needleOf(peak, C.GAUGE.r - 4));

  // Pressure film darkens where the sled's outer facet presses hardest, and slowly fades.
  C.PADS.forEach((x, i) => {
    const over = Math.max(0, 1 - Math.abs(x - xs) / 24);
    film[i] = Math.max(film[i] * Math.exp(-dt / 2.4), s.lateralMpa * over);
    pads[i].setAttribute("fill-opacity", Math.min(0.9, film[i] / 11).toFixed(2));
  });

  // Chart pen.
  const px = chartX(phase);
  el.pen.setAttribute("transform", translateAlong(P, [px, 0, 0]));
  const tip = [px, chartY(s.lateralMpa), C.PAPER_TOP + 0.1];
  const penRoot = [px, C.CHART.y + C.CHART.d - 4, 9.4];
  el.penarm.innerHTML = solidSvg(strap(penRoot, [tip[0], tip[1] + 1, tip[2] + 1.2], 1.6, 1.2, [0, 0, 1], P), { tone: "mid", crease: "none" }) + dotsSvg([iso(tip, P)], { size: 1.1, tone: "hi" });

  const scrub = stage.closest(".iso-plate").querySelector(".kn-scrub");
  if (document.activeElement !== scrub) scrub.value = String(Math.round(phase * 1000));
  anatDraw(stage.closest(".iso-plate"), { flexion: s.flexion, shift: s.shiftMm, mpa: s.lateralMpa, tendon: s.tendonBw });
  const text = ({ cycleLow: "low saddle" }[activity] || activity) + " · knee " + s.flexion.toFixed(0) + "° · shift " + s.shiftMm.toFixed(1) + " mm · facet " + s.lateralMpa.toFixed(1) + " MPa";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(phase * 100)));
  stage.setAttribute("aria-valuetext", text);
}

const period = () => Math.max(3.4, ACTIVITIES[activity].stride * 5);
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (touring) target = (target + dt / period()) % 1;
  let d = target - phase;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  phase = touring ? target : (phase + d * (1 - Math.exp(-dt / 0.12)) + 1) % 1;
  draw(dt);
  frame = visible && (touring || Math.abs(d) > 1e-4) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; target = phase; run(); }, 3200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  target = Math.min(0.999, Math.max(0, (event.clientX - box.left) / box.width));
  hold();
});
stage.addEventListener("keydown", (event) => {
  const keys = { ArrowRight: 0.02, ArrowLeft: -0.02 };
  if (event.key in keys) { target = (target + keys[event.key] + 1) % 1; hold(); event.preventDefault(); return; }
  if (/^[1-5]$/.test(event.key)) { pick("activity", ["walk", "run", "stairs", "cycle", "cycleLow"][Number(event.key) - 1]); event.preventDefault(); }
  if (event.key === "r" || event.key === "R") { pick("state", state === "now" ? "rehab" : "now"); event.preventDefault(); }
});
function pick(group, value) {
  if (group === "activity") activity = value; else state = value;
  document.querySelectorAll('.kn-seg[data-group="' + group + '"] button').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === value)));
  traces();
  draw(0);
  run();
}
document.querySelectorAll(".kn-seg[data-group] button").forEach((b) => b.addEventListener("click", () => pick(b.parentElement.dataset.group, b.dataset.value)));
{
  const plate = stage.closest(".iso-plate");
  const scrub = plate.querySelector(".kn-scrub");
  const play = plate.querySelector(".kn-play");
  const setPlaying = (on) => { touring = on; clearTimeout(idle); play.textContent = on ? "❚❚" : "▶"; if (on) { target = phase; run(); } };
  scrub.addEventListener("input", () => { setPlaying(false); phase = target = Number(scrub.value) / 1000; draw(0); });
  play.addEventListener("click", () => setPlaying(!touring));
  if (still.matches) { setPlaying(false); phase = target = 0.14; }
}
traces();
draw(0);
${EXERCISE_LIVE_V2}
`;

const V2_CSS = `
.kn-scrubrow{display:flex;align-items:center;gap:10px;margin:14px auto 0;max-width:520px}
.kn-scrub{flex:1;accent-color:var(--anatomy-hi);height:22px;cursor:pointer}
.kn-play{font:12px/1 var(--anatomy-mono);width:30px;height:26px;border-radius:5px;border:0;box-shadow:0 0 0 1px var(--anatomy-lo);background:var(--anatomy-face);color:var(--anatomy-strong);cursor:pointer}
.kn-cmp{width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.45;margin:14px 0 4px}
.kn-cmp th{font:500 11px/1.3 var(--anatomy-mono);color:var(--anatomy-muted);text-align:left;padding:4px 6px;letter-spacing:.03em}
.kn-cmp td{padding:6px;border-top:1px solid var(--anatomy-faint);vertical-align:top}
.kn-cmp tr.kn-group td{font:600 11px/1.3 var(--anatomy-mono);color:var(--anatomy-strong);text-transform:uppercase;letter-spacing:.08em;padding-top:16px;border-top:0}
.kn-cmp .kn-num{font-family:var(--anatomy-mono);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--anatomy-strong)}
.kn-bar{display:block;height:5px;margin-top:5px;background:var(--anatomy-faint);border-radius:3px;overflow:hidden;width:110px}
.kn-bar i{display:block;height:100%;background:var(--anatomy-hi)}
.kn-bar[data-level="2"] i{background:var(--anatomy-mid)}
.kn-bar[data-level="1"] i{background:var(--anatomy-lo)}
.kn-verdict{color:var(--anatomy-text)}
.kn-plan{width:100%;border-collapse:collapse;font-size:13px;line-height:1.5;margin:12px 0}
.kn-plan th{font:500 11px/1.3 var(--anatomy-mono);color:var(--anatomy-muted);text-align:left;padding:4px 6px}
.kn-plan td{padding:8px 6px;border-top:1px solid var(--anatomy-faint);vertical-align:top}
.kn-plan td:first-child{font-family:var(--anatomy-mono);white-space:nowrap;color:var(--anatomy-strong)}
@media (max-width:560px){.kn-cmp .kn-hide{display:none}.kn-bar{width:70px}}
`;

const PAGE_CSS = `
.mq-0{fill:var(--anatomy-shade-0)}.mq-2{fill:var(--anatomy-shade-2)}.mq-3{fill:var(--anatomy-top)}
.mq[data-lit] .mq-0{fill:var(--anatomy-lit-shade)}.mq[data-lit] .mq-2,.mq[data-lit] .mq-3{fill:var(--anatomy-lit-top)}
.mq-edge{stroke-width:.6px}
.kn-pad-ground{fill:var(--anatomy-paper);stroke:none}
.kn-pad{fill:var(--anatomy-hi);stroke:none}
.kn-controls{display:flex;flex-wrap:wrap;gap:10px 16px;justify-content:center;margin-top:18px}
.kn-seg{display:inline-flex;box-shadow:0 0 0 1px var(--anatomy-lo);border-radius:6px;overflow:hidden}
.kn-seg button{font:500 12px/1 var(--anatomy-mono);letter-spacing:.04em;color:var(--anatomy-muted);background:transparent;border:0;padding:8px 12px;cursor:pointer}
.kn-seg button+button{box-shadow:-1px 0 0 0 var(--anatomy-lo)}
.kn-seg button[aria-pressed="true"]{color:var(--anatomy-strong);background:var(--anatomy-face)}
.kn-seg button:focus-visible{outline:1px solid var(--anatomy-hi);outline-offset:-2px}
.kn-table{width:100%;max-width:440px;margin:14px auto 0;border-collapse:collapse;font:12px/1.5 var(--anatomy-mono);color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.kn-table th{font-weight:500;color:var(--anatomy-muted);text-align:right;padding:3px 6px}
.kn-table td{white-space:nowrap;padding:3px 6px;text-align:right;border-top:1px solid var(--anatomy-faint)}
.kn-table td:first-child,.kn-table th:first-child{text-align:left}
.kn-stage{outline:none}
.kn-stage:focus-visible{box-shadow:0 0 0 1px var(--anatomy-mid)}
.kn-prose{color:var(--anatomy-text);font-size:14.5px;line-height:1.65}
.kn-prose h1{color:var(--anatomy-strong);font-size:22px;font-weight:600;letter-spacing:-.01em;margin:0 0 6px}
.kn-prose h2{color:var(--anatomy-strong);font-size:16px;font-weight:600;margin:48px 0 6px}
.kn-prose strong{color:var(--anatomy-strong);font-weight:600}
.kn-prose ul{padding-left:18px;margin:8px 0}
.kn-prose li{margin:4px 0}
.kn-note{border-left:2px solid var(--anatomy-mid);padding:2px 0 2px 14px;margin:18px 0;color:var(--anatomy-text)}
.kn-dose{font:12px/1.5 var(--anatomy-mono);color:var(--anatomy-strong);margin-top:4px}
.kn-term{display:grid;grid-template-columns:150px 1fr;gap:4px 16px;margin:12px 0}
.kn-term dt{color:var(--anatomy-strong);font-weight:600}
.kn-term dd{margin:0}
@media (max-width:560px){.kn-term{grid-template-columns:1fr}.kn-term dd{margin-bottom:8px}}
`;

const read = (file) => readFileSync(join(HERE, "v2", file), "utf8");
const prose = (html) => `<div class="kn-prose">${html}</div>`;
const body = [
  `<style>${PAGE_CSS}${V2_CSS}${ANAT_CSS}</style>`,
  prose(read("intro.html") + read("../v3/intro-add.html")),
  fig1,
  prose(read("../v3/running.html")),
  exerciseFigures([RUN_CARD], { anatomy: true }),
  prose(read("cycling.html")),
  exerciseFigures([{ ...BIKE_CARD, fig: "Fig 3" }], { anatomy: true }),
  prose(read("home.html")),
  exerciseFigures(HOME_CARDS_V2.map((card, i) => ({ ...card, fig: `Fig ${i + 4}` })), { anatomy: true }),
  prose(read("gym.html")),
  exerciseFigures(GYM_CARDS.map((card, i) => ({ ...card, fig: `Fig ${i + 10}` })), { anatomy: true }),
  prose(read("compare.html") + comparisonTable()),
  prose(read("cartilage.html")),
  prose(read("marathon.html") + marathonPlan()),
  prose(read("outro.html")),
].join("");

const name = theme === "light" ? "knee-v3-light.html" : "knee-v3.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Left knee v3: with the anatomy", theme, body, script: kitScript() + live, width: 700 }));
console.log("wrote", name);
