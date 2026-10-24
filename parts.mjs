// Shared geometry for parts the kit has no builder for: lofted convex bodies, straps
// between two points, coil springs on any axis, and circles in any plane.
// Used at build time and inlined into the page (imports and `export` stripped), so it may
// only call kit functions that the inlined kit also defines: iso, pathOf, cameraOf.
import { iso, pathOf, cameraOf } from "./vendor/anatomy/kit/iso-kit.mjs";

const BANDS_P = [0, 0.2, 0.42, 0.62];
const dotP = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subP = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addP = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mulP = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const crossP = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitP = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const vec = { dot: dotP, sub: subP, add: addP, mul: mulP, cross: crossP, unit: unitP };

export function viewP(P) {
  const { sinA, cosA, sinE, cosE } = cameraOf(P);
  return [cosA * cosE, sinA * cosE, sinE];
}
function lightP(P) {
  const { sinA, cosA } = cameraOf(P);
  return unitP([-sinA, cosA, 1.2]);
}
function bandP(score) {
  let tone = 0;
  while (tone < BANDS_P.length && score >= BANDS_P[tone]) tone++;
  return tone;
}
export const depthP = (p, P) => dotP(p, viewP(P));

function hull2(points) {
  const list = points.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (list.length < 3) return list;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of list) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// A convex body from vertices and faces (index lists wound counter-clockwise seen from outside).
// Returns kit SolidPaths, so solidSvg paints it like any slab.
export function polyhedron(vertices, faces, P, { creaseAngle = 0.3 } = {}) {
  const V = viewP(P);
  const L = lightP(P);
  const flat = vertices.map((p) => iso(p, P));
  const centre = mulP(vertices.reduce((s, p) => addP(s, p), [0, 0, 0]), 1 / vertices.length);
  const normals = faces.map((face) => {
    let n = [0, 0, 0];
    for (let i = 0; i < face.length; i++) {
      const a = vertices[face[i]];
      const b = vertices[face[(i + 1) % face.length]];
      n = addP(n, crossP(a, b));
    }
    n = unitP(n);
    const mid = mulP(face.reduce((s, i) => addP(s, vertices[i]), [0, 0, 0]), 1 / face.length);
    return dotP(n, subP(mid, centre)) < 0 ? mulP(n, -1) : n;
  });
  const seen = normals.map((n) => dotP(n, V) > 1e-6);
  const buckets = [[], [], [], [], []];
  faces.forEach((face, f) => {
    if (seen[f]) buckets[bandP(dotP(normals[f], L))].push(pathOf(face.map((i) => flat[i]), true));
  });
  const edges = new Map();
  faces.forEach((face, f) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push(f);
    }
  });
  const creases = [];
  for (const [key, list] of edges) {
    if (list.length !== 2) continue;
    const [f, g] = list;
    if (!seen[f] || !seen[g]) continue;
    if (dotP(normals[f], normals[g]) > Math.cos(creaseAngle)) continue;
    const [a, b] = key.split(",").map(Number);
    creases.push(pathOf([flat[a], flat[b]]));
  }
  const outline = pathOf(hull2(flat), true);
  return { fill: outline, outline, crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")) };
}

// Rings of equal vertex count placed in 3D (each a list of points), joined band by band and
// capped at both ends. Every ring must be convex and wound the same way.
export function loft(rings, P, options) {
  const n = rings[0].length;
  const vertices = rings.flat();
  const faces = [];
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([r * n + i, r * n + j, (r + 1) * n + j, (r + 1) * n + i]);
    }
  }
  faces.push(Array.from({ length: n }, (_, i) => n - 1 - i));
  faces.push(Array.from({ length: n }, (_, i) => (rings.length - 1) * n + i));
  return polyhedron(vertices, faces, P, options);
}

// Section points in a plane x = s, given as [y, z] pairs.
export const sectionAt = (s, poly) => poly.map(([y, z]) => [s, y, z]);

// A rectangular strap from a to b: `width` across, `thick` along `up` (made perpendicular).
export function strap(a, b, width, thick, up, P) {
  const axis = unitP(subP(b, a));
  const n = unitP(subP(up, mulP(axis, dotP(up, axis))));
  const side = unitP(crossP(axis, n));
  const ring = [
    addP(mulP(side, width / 2), mulP(n, thick / 2)),
    addP(mulP(side, -width / 2), mulP(n, thick / 2)),
    addP(mulP(side, -width / 2), mulP(n, -thick / 2)),
    addP(mulP(side, width / 2), mulP(n, -thick / 2)),
  ];
  return loft([ring.map((o) => addP(a, o)), ring.map((o) => addP(b, o))], P, { creaseAngle: 0.2 });
}

// Two unit vectors perpendicular to `axis`.
export function basisOf(axis) {
  const a = unitP(axis);
  const helper = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = unitP(crossP(a, helper));
  const v = crossP(a, u);
  return { a, u, v };
}

// A coil spring from a to b around the straight axis, split into the half behind the axis
// and the half in front of it, so a rod (or nothing) can be painted between them.
export function coilP(a, b, radius, turns, P, perTurn = 18) {
  const { u, v } = basisOf(subP(b, a));
  const V = viewP(P);
  const steps = Math.max(8, Math.round(turns * perTurn));
  const back = [];
  const front = [];
  let run = [];
  let runFront = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const radial = addP(mulP(u, Math.cos(angle)), mulP(v, Math.sin(angle)));
    const point = addP(addP(a, mulP(subP(b, a), t)), mulP(radial, radius));
    const isFront = dotP(radial, V) >= 0;
    if (runFront !== null && isFront !== runFront) {
      run.push(iso(point, P));
      (runFront ? front : back).push(pathOf(run));
      run = [];
    }
    run.push(iso(point, P));
    runFront = isFront;
  }
  if (run.length > 1) (runFront ? front : back).push(pathOf(run));
  return { back: back.join(""), front: front.join("") };
}

// A circle of radius r centred at c in the plane spanned by u and v.
export function circleIn(c, u, v, r, P, steps = 48) {
  const points = Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    return iso(addP(c, addP(mulP(u, r * Math.cos(angle)), mulP(v, r * Math.sin(angle)))), P);
  });
  return pathOf(points, true);
}

// A point at angle `angle` and radius r in the plane (u, v) around c.
export const pointIn = (c, u, v, r, angle) => addP(c, addP(mulP(u, r * Math.cos(angle)), mulP(v, r * Math.sin(angle))));
