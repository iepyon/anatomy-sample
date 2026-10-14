// Shared model and moving geometry for the sprint indexer. No imports: the build
// inlines this file into the page (with `export` stripped), so the browser rebuilds
// the moving parts from exactly the code that drew them at rest.

export const SP_N = 6; // slots on the Geneva wheel = sprints to the Product Goal
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
export const SP_CORD_Z = 30.5;
export const SP_STEP = (2 * Math.PI * SP_SPOOL_R) / SP_N; // carriage travel per sprint
export const SP_TRAVEL = SP_STEP * SP_N;
export const SP_STOP_X = 22; // face of the Product Goal stop
export const SP_CAR = { w: 40, d: 32, y: 0, z: 4, top: 10 };
export const SP_X0 = SP_STOP_X - SP_CAR.w - SP_TRAVEL; // carriage left edge at the start
export const SP_TURN = Math.PI * 2;
export const SP_ENTRY = (4 * Math.PI) / 3; // into each crank turn, the pin reaches a slot
export const SP_U_GOAL = SP_TURN * SP_N;
export const SP_ANCHOR_X = -110;
export const SP_SPRING = { y: 16, z: 7, r: 3, turns: 14 };
export const SP_BLOCKS = [
  [3, 3], [13, 3], [23, 3],
  [3, 17], [13, 17], [23, 17],
].map(([x, y]) => ({ x, y, w: 8.6, d: 12, r: 0.8 }));
export const SP_BLOCK_H = 6;
export const SP_POST = [36, 16];

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

// The model: crank travel u (radians since the goal was set) → crank angle, wheel angle, sprints done.
export function sprintState(u) {
  const clamped = Math.max(0, Math.min(SP_U_GOAL, u));
  let j = Math.floor(clamped / SP_TURN);
  let f = clamped - j * SP_TURN;
  if (j >= SP_N) {
    j = SP_N - 1;
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
  return { phi, beta, sprint: j, engaged, frac, worked: f / SP_ENTRY, travel: -beta * SP_SPOOL_R, done: j + (engaged ? frac : 0) };
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
  const tail = [gx + 5 * Math.cos(angle), gy + 5 * Math.sin(angle)];
  return K.lineSvg(K.lineOnTop(tail, tip, z, P), { tone: "hi" }) + K.dotsSvg([K.iso([tip[0], tip[1], z], P)], { size: 0.5, tone: "hi" });
}

export function drawSpring(left, P, K) {
  const c = K.coil(SP_ANCHOR_X, left, [SP_SPRING.y, SP_SPRING.z], SP_SPRING.r, SP_SPRING.turns, "x", P);
  const ends = [K.iso([SP_ANCHOR_X, SP_SPRING.y + SP_SPRING.r, SP_SPRING.z], P), K.iso([left, SP_SPRING.y + SP_SPRING.r, SP_SPRING.z], P)];
  return K.lineSvg(c.back, { tone: "lo" }) + K.lineSvg(c.front, { tone: "mid" }) + K.dotsSvg(ends, { size: 0.7, tone: "mid" });
}

export function drawCord(left, P, K) {
  const from = [left + SP_POST[0] + 2.2, SP_POST[1], SP_CORD_Z];
  const to = [SP_G[0], SP_G[1] + SP_SPOOL_R, SP_CORD_Z];
  return K.lineSvg(K.segment(from, to, P), { tone: "hi" }) + K.dotsSvg([K.iso(from, P)], { size: 0.6, tone: "hi" });
}
