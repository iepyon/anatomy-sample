// Shared model and moving geometry for the sprint feedback rig. No imports: the build
// inlines this file into the page (with `export` stripped), so the browser rebuilds
// the moving parts from exactly the code that drew them at rest.

export const SP_N = 6; // slots on the Geneva wheel: it indexes once per sprint, as a clock
export const SP_C = 44; // crank centre to Geneva centre
export const SP_A = SP_C * Math.sin(Math.PI / SP_N); // crank radius (22): the pin enters each slot radially
export const SP_G = [70, 0]; // Geneva wheel centre
export const SP_D = [70, -44]; // crank centre, behind the wheel
export const SP_PIN_R = 2.4;
export const SP_R_OUT = 39; // Geneva wheel rim
export const SP_SLOT_W = 3.2; // half-width of a slot
export const SP_R_IN = SP_C - SP_A; // the pin's closest approach: where each slot ends
export const SP_R_LOCK = 14.5; // concave locking arcs on the wheel
export const SP_LOCK_R = 14; // locking disc on the crank shaft
export const SP_CUT_R = 39.6; // relief cut in the locking disc that lets the wheel's tips pass
export const SP_Z = { gen: 19.5, genTop: 24, arm: 26.5, armTop: 29.5 };
export const SP_SPOOL_R = 12;
export const SP_CORD_Z = 31.5;
export const SP_CAP = (2 * Math.PI * SP_SPOOL_R) / SP_N; // most one sprint can wind: one full index
export const SP_TRAVEL = SP_CAP * SP_N; // the longest the carriage can travel
export const SP_GOAL0 = -6; // face of the Product Goal stop when the goal is set
export const SP_GOAL_MAX = 22; // the furthest the goal can move before it reaches the wheel
export const SP_STOP_X = SP_GOAL0;
export const SP_CAR = { w: 40, d: 32, y: 0, z: 4, top: 10 };
export const SP_X0 = SP_GOAL_MAX - SP_CAR.w - SP_TRAVEL; // carriage left edge at the start
export const SP_FACE0 = SP_X0 + SP_CAR.w; // carriage front face at the start
export const SP_GAP0 = SP_GOAL0 - SP_FACE0; // the gap when the goal is set
export const SP_SCREW = { y: -5, z: 3.6, r: 1.6, x0: -38, x1: 30 }; // the market's lead screw
export const SP_KNOB = [-41, -5]; // the market's knob, on the screw's end block
export const SP_BOX_PORT = [96, -66, 2.5]; // where the feedback line enters the controller
export const SP_TURN = Math.PI * 2;
export const SP_ENTRY = (4 * Math.PI) / 3; // into each crank turn, the pin reaches a slot
export const SP_ANCHOR_X = -110;
export const SP_SPRING = { y: 16, z: 7, r: 3, turns: 14 };
export const SP_SLOTS = 12; // room on the carriage (and tiles in the hopper) for the longest run
export const SP_BLOCKS = Array.from({ length: SP_SLOTS }, (_, i) => ({ x: 3 + (i % 4) * 7.2, y: 3 + Math.floor(i / 4) * 9, w: 6.2, d: 8, r: 0.7 }));
export const SP_BLOCK_H = 5;
export const SP_POST = [36, 16];
export const SP_STOP_Z = [4, 16]; // the goal stop rides on the rails
export const SP_TAPE_Z = 18.5;
export const SP_GAUGE = { x: SP_GOAL0 + 5.2, y: 16, r: 4.6, z: 16, top: 21 }; // tape gauge on the goal stop, at rest
export const SP_TAPE_OUT = SP_GAUGE.x - SP_GAUGE.r; // where the tape leaves its case

// A moving target. While each sprint is worked the goal moves (the market shifts it, by less
// as the product matures), and the team delivers 0.62–1.0 of a full index. At the review the
// tape measures the gap to where the goal now is, and the increment never exceeds it. Sprints
// repeat until the gap is zero, so how many it takes comes out of the loop, not out of a plan.
export function planFor(seed) {
  let x = (seed * 2654435761 + 97) >>> 0;
  const rand = () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
  const deliveries = [];
  const goals = [];
  let face = SP_FACE0;
  let goal = SP_GOAL0;
  while (deliveries.length < SP_SLOTS) {
    const drift = (-5 + 15 * rand()) * Math.pow(0.78, deliveries.length);
    goal = Math.max(face + 2, Math.min(SP_GOAL_MAX, goal + drift));
    const made = SP_CAP * (0.62 + 0.38 * rand());
    const step = Math.min(made, goal - face);
    goals.push(goal);
    deliveries.push(step);
    face += step;
    if (goal - face < 1e-9) break;
  }
  return { deliveries, goals, n: deliveries.length, goal: SP_TURN * deliveries.length };
}

const spWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const spDir = (a) => [Math.cos(a), Math.sin(a)];

// Points on a circle from angle a0 to a1, taking the way round that passes `via`.
function spArc(cx, cy, r, a0, a1, via, count) {
  let sweep = spWrap(a1 - a0);
  const t = spWrap(via - a0);
  const inside = sweep > 0 ? t > 0 && t < sweep : t < 0 && t > sweep;
  if (!inside) sweep -= Math.sign(sweep) * Math.PI * 2;
  const out = [];
  for (let i = 0; i <= count; i++) {
    const a = a0 + (sweep * i) / count;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

// The six-slot wheel in plan, turned by beta. Slots sit at beta + k·60°, locking arcs between them.
export function genevaRing(beta) {
  const [gx, gy] = SP_G;
  const w = SP_SLOT_W;
  const so = Math.sqrt(SP_R_OUT * SP_R_OUT - w * w);
  const mouth = Math.asin(w / SP_R_OUT);
  const gamma = Math.acos((SP_R_OUT ** 2 + SP_C ** 2 - SP_R_LOCK ** 2) / (2 * SP_R_OUT * SP_C));
  const pts = [];
  for (let k = 0; k < SP_N; k++) {
    const al = beta + (k * SP_TURN) / SP_N;
    const [dx, dy] = spDir(al);
    const [nx, ny] = [-dy, dx];
    const at = (s, o) => [gx + dx * s + nx * o, gy + dy * s + ny * o];
    pts.push(at(so, -w), at(SP_R_IN + 2, -w));
    const [ex, ey] = at(SP_R_IN, 0);
    pts.push(...spArc(ex, ey, w, al - Math.PI / 2, al + Math.PI / 2, al + Math.PI, 8).slice(0, -1));
    pts.push(at(SP_R_IN + 2, w), at(so, w));
    const b = al + Math.PI / SP_N;
    pts.push(...spArc(gx, gy, SP_R_OUT, al + mouth, b - gamma, al + mouth + 0.01, 3).slice(1, -1));
    const [lx, ly] = [gx + SP_C * Math.cos(b), gy + SP_C * Math.sin(b)];
    const pa = [gx + SP_R_OUT * Math.cos(b - gamma), gy + SP_R_OUT * Math.sin(b - gamma)];
    const pb = [gx + SP_R_OUT * Math.cos(b + gamma), gy + SP_R_OUT * Math.sin(b + gamma)];
    const a0 = Math.atan2(pa[1] - ly, pa[0] - lx);
    const a1 = Math.atan2(pb[1] - ly, pb[0] - lx);
    pts.push(...spArc(lx, ly, SP_R_LOCK, a0, a1, b + Math.PI, 14));
    const next = al + SP_TURN / SP_N;
    pts.push(...spArc(gx, gy, SP_R_OUT, b + gamma, next - mouth, b + gamma + 0.01, 3).slice(1, -1));
  }
  return pts;
}

export const pinAngle = (phi) => phi + Math.PI / 2;
export const pinAt = (phi) => [SP_D[0] - SP_A * Math.sin(phi), SP_D[1] + SP_A * Math.cos(phi)];

// The locking disc, its relief cut facing the pin.
export function lockRing(phi) {
  const [dx, dy] = SP_D;
  const psi = pinAngle(phi);
  const delta = Math.acos((SP_LOCK_R ** 2 + SP_C ** 2 - SP_CUT_R ** 2) / (2 * SP_LOCK_R * SP_C));
  const pts = spArc(dx, dy, SP_LOCK_R, psi + delta, psi - delta, psi + Math.PI, 40);
  const [qx, qy] = [dx + SP_C * Math.cos(psi), dy + SP_C * Math.sin(psi)];
  const [ax, ay] = pts[pts.length - 1];
  const [bx, by] = pts[0];
  const cut = spArc(qx, qy, SP_CUT_R, Math.atan2(ay - qy, ax - qx), Math.atan2(by - qy, bx - qx), psi + Math.PI, 16);
  return pts.concat(cut.slice(1, -1));
}

// The crank arm: a tapered link from the shaft boss to the pin boss.
export function armRing(phi) {
  const [dx, dy] = SP_D;
  const [px, py] = pinAt(phi);
  const r1 = 5.6;
  const r2 = 4.2;
  const u = Math.atan2(py - dy, px - dx);
  const tau = Math.acos((r1 - r2) / SP_A);
  return [
    ...spArc(px, py, r2, u - tau, u + tau, u, 10),
    ...spArc(dx, dy, r1, u + tau, u - tau + Math.PI * 2, u + Math.PI, 12),
  ];
}

// The model: crank travel u (radians since the goal was set) → crank angle, wheel angle,
// sprints done and the carriage's travel, which the spool's slip clutch limits to each delivery.
export function sprintState(u, plan) {
  const clamped = Math.max(0, Math.min(plan.goal, u));
  let j = Math.floor(clamped / SP_TURN);
  let f = clamped - j * SP_TURN;
  if (j >= plan.n) {
    j = plan.n - 1;
    f = SP_TURN;
  }
  const phi = Math.PI / 3 + clamped;
  let part = 0;
  let frac = 0;
  const engaged = f >= SP_ENTRY;
  if (engaged) {
    const local = f - SP_ENTRY - Math.PI / 3;
    const toward = Math.atan2(-SP_C + SP_A * Math.cos(local), -SP_A * Math.sin(local));
    part = toward + Math.PI / 3;
    frac = Math.min(1, -part / (Math.PI / 3));
  }
  const beta = (-j * Math.PI) / 3 + part;
  let before = 0;
  for (let i = 0; i < j; i++) before += plan.deliveries[i];
  const travel = before + plan.deliveries[j] * frac;
  const from = j === 0 ? SP_GOAL0 : plan.goals[j - 1];
  const to = plan.goals[j];
  const w = Math.min(1, f / SP_ENTRY);
  const goalX = from + (to - from) * w * w * (3 - 2 * w);
  const face = SP_FACE0 + before;
  return { phi, beta, sprint: j, engaged, frac, travel, goalX, gapBefore: to - face, gapAfter: to - face - plan.deliveries[j], gap: goalX - SP_FACE0 - travel, done: j + (engaged ? frac : 0) };
}

// A concave plate (slots, relief cuts): its inner walls that face the viewer can sit behind the
// plate's own top, so the walls and their lower edges go first and an opaque top covers them.
export function concaveSvg(ring, z, h, P, K, { tone = "mid", crease = "faint" } = {}) {
  const e = K.extrude(ring, z, h, P, { convex: false });
  const parts = [`<path class="iso-fill" d="${e.fill}"/>`];
  e.shades.forEach((d, shade) => { if (d) parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`); });
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${e.outline}"/>`);
  parts.push(`<path class="iso-fill" d="${e.top}"/>`, `<path class="iso-top" d="${e.top}"/>`);
  if (e.crease) parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${e.crease}"/>`);
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${K.onTop(ring, z + h, P, true)}"/>`);
  return `<g class="iso-solid">${parts.join("")}</g>`;
}

// Moving parts as SVG strings, drawn with whichever kit object is passed in.
export function drawLock(phi, P, K) {
  return concaveSvg(lockRing(phi), SP_Z.gen, SP_Z.genTop - SP_Z.gen, P, K, { tone: "mid" });
}

export function drawGeneva(beta, P, K) {
  const [gx, gy] = SP_G;
  const out = [concaveSvg(genevaRing(beta), SP_Z.gen, SP_Z.genTop - SP_Z.gen, P, K, { tone: "hi", crease: "lo" })];
  out.push(K.lineSvg(K.ring(gx, gy, 16.5, SP_Z.genTop, P, 48), { tone: "faint" }));
  const marks = [];
  for (let k = 0; k < SP_N; k++) {
    const b = beta + (k + 0.5) * (SP_TURN / SP_N);
    marks.push(K.iso([gx + 27 * Math.cos(b), gy + 27 * Math.sin(b), SP_Z.genTop], P));
  }
  out.push(K.dotsSvg(marks, { size: 0.5, tone: "mid" }));
  return out.join("");
}

export function drawArm(phi, P, K) {
  const [px, py] = pinAt(phi);
  const out = [];
  out.push(K.solidSvg(K.cylinder(px, py, SP_PIN_R, SP_Z.genTop + 0.2, SP_Z.arm - SP_Z.genTop - 0.2, P, 20), { tone: "mid", crease: "none" }));
  out.push(K.solidSvg(K.extrude(armRing(phi), SP_Z.arm, SP_Z.armTop - SP_Z.arm, P, { bevel: 0.4 }), { tone: "mid" }));
  out.push(K.solidSvg(K.cylinder(px, py, 2.6, SP_Z.armTop, 1.4, P, 20), { tone: "mid" }));
  out.push(K.lineSvg(K.ring(SP_D[0], SP_D[1], 2.4, SP_Z.armTop, P, 20), { tone: "lo" }));
  out.push(K.dotsSvg([K.iso([SP_D[0], SP_D[1], SP_Z.armTop], P), K.iso([px, py, SP_Z.armTop + 1.4], P)], { size: 0.5, tone: "mid" }));
  return out.join("");
}

export function drawSpoolMark(angle, P, K) {
  const [gx, gy] = SP_G;
  const z = 38;
  const tip = [gx + 13 * Math.cos(angle), gy + 13 * Math.sin(angle)];
  const tail = [gx + 6 * Math.cos(angle), gy + 6 * Math.sin(angle)];
  return K.lineSvg(K.lineOnTop(tail, tip, z, P), { tone: "hi" }) + K.dotsSvg([K.iso([tip[0], tip[1], z], P)], { size: 0.5, tone: "hi" });
}

export function drawSpring(left, P, K) {
  const c = K.coil(SP_ANCHOR_X, left, [SP_SPRING.y, SP_SPRING.z], SP_SPRING.r, SP_SPRING.turns, "x", P);
  const ends = [K.iso([SP_ANCHOR_X, SP_SPRING.y + SP_SPRING.r, SP_SPRING.z], P), K.iso([left, SP_SPRING.y + SP_SPRING.r, SP_SPRING.z], P)];
  return K.lineSvg(c.back, { tone: "lo" }) + K.lineSvg(c.front, { tone: "mid" }) + K.dotsSvg(ends, { size: 0.7, tone: "mid" });
}

// The feedback signal: the tape from the gauge case to the carriage post, and the gauge's needle.
export function drawTape(left, goalX, P, K) {
  const from = [left + SP_POST[0] + 2.2, SP_POST[1], SP_TAPE_Z];
  const to = [SP_TAPE_OUT + goalX - SP_GOAL0, SP_POST[1], SP_TAPE_Z];
  return K.lineSvg(K.segment(from, to, P), { tone: "lit" }) + K.dotsSvg([K.iso(from, P)], { size: 0.6, tone: "hi" });
}

export function drawNeedle(gap, goalX, P, K) {
  const { y, top } = SP_GAUGE;
  const x = SP_GAUGE.x + goalX - SP_GOAL0;
  const a = Math.min(1, gap / (SP_GAP0 * 1.4)) * Math.PI * 1.6 - Math.PI * 0.8;
  const tip = [x + 3.4 * Math.sin(a), y - 3.4 * Math.cos(a)];
  return K.lineSvg(K.lineOnTop([x, y], tip, top + 0.1, P), { tone: "hi", free: "end" }) + K.dotsSvg([K.iso([x, y, top + 0.1], P)], { size: 0.5, tone: "hi" });
}

// The feedback line's run on the floor: from under the gauge's drop, under the wheel, to the controller.
export function feedbackRoute(goalX) {
  const gx = SP_GAUGE.x + SP_GAUGE.r + 2.5 + goalX - SP_GOAL0;
  return [[gx, SP_GAUGE.y, 0.5], [gx, -24, 0.5], [SP_BOX_PORT[0], -24, 0.5], SP_BOX_PORT];
}

export function drawFloorCable(goalX, P, K) {
  const route = feedbackRoute(goalX).map((p) => K.iso(p, P));
  return K.wireSvg(route[0], route[route.length - 1], { via: route.slice(1, -1), tone: "mid", size: 0.8, ends: "to" });
}

export function drawKnobMark(goalX, P, K) {
  const [x, y] = SP_KNOB;
  const a = (goalX - SP_GOAL0) * 0.35;
  return K.lineSvg(K.lineOnTop([x, y], [x + 3.4 * Math.cos(a), y + 3.4 * Math.sin(a)], 14, P), { tone: "hi", free: "end" }) + K.dotsSvg([K.iso([x, y, 14], P)], { size: 0.5, tone: "hi" });
}

export function drawCord(left, P, K) {
  const from = [left + SP_POST[0] + 2.2, SP_POST[1], SP_CORD_Z];
  const to = [SP_G[0], SP_G[1] + SP_SPOOL_R, SP_CORD_Z];
  return K.lineSvg(K.segment(from, to, P), { tone: "hi" }) + K.dotsSvg([K.iso(from, P)], { size: 0.6, tone: "hi" });
}
