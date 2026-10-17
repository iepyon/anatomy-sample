import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./loop.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 440;

const PLATE = { x: -84, y: -84, w: 168, d: 168, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DRUM_R = 49;
const PED = 7; // half-size of a station pedestal
const POSTS = M.LP_STATIONS.map((deg) => M.lpPolar(deg, M.LP_POST_R));
const NESTS = M.LP_STATIONS.map((_, s) => M.lpNest(s));
const CAB_C = M.lpPolar(M.LP_STATIONS[1], 66);
const CABINET = { x: CAB_C[0] - 9, y: CAB_C[1] - 9, w: 18, d: 18, r: 1.5 };
const CAB_TOP = 22;
const KNOB = [CABINET.x + 12.4, CABINET.y + 5.6];
const LAMP = [CABINET.x + 5, CABINET.y + 5];
const MOTOR = [-70, -42];
const PANEL = { x: 63, y: 5, w: 19, d: 27, r: 2 };
const PANEL_TOP = 6;
const DIALS = [[73.4, 12.2], [73.4, 25]];
const DIAL_TOP = PANEL_TOP + 1.6;
const KEY = [67.4, 18.6];
const LABEL = { x: -74, y: 52, w: 30, d: 14, r: 1.2 };
const STRIP = { x: -38, y: 75, w: 60, d: 6, r: 1 };
const PR = 9.9; // pillars stand on the axes, the plates' corners between them
const PILLARS = [-45, 45, 135, -135].map((a) => M.lpPolar(M.LP_BRIDGE_DEG + a, PR)); // two either side of the bridge, two in front
const PILLAR_TOP = 60;
const CABLE_R = 60;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-42, -42, M.LP_BRIDGE_Z + 4], [2, 2, M.LP_BRIDGE_Z + 7]],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 52, elevation: 34 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const facingFront = (angle) => Math.cos(angle) * k.towardViewer(P)[0] + Math.sin(angle) * k.towardViewer(P)[1] > 0.2;
const arc = (r, from, to, z, n = 8) => Array.from({ length: n + 1 }, (_, i) => [...M.lpPolar(from + ((to - from) * i) / n, r), z]);

// A flat bar between two plan points, with round ends: arms that reach from a post to its nest.
function armRing([ax, ay], [bx, by], w) {
  const u = Math.atan2(by - ay, bx - ax);
  const out = [];
  for (let i = 0; i <= 10; i++) {
    const a = u - Math.PI / 2 - (Math.PI * i) / 10;
    out.push([ax + (w / 2) * Math.cos(a), ay + (w / 2) * Math.sin(a)]);
  }
  for (let i = 0; i <= 10; i++) {
    const a = u + Math.PI / 2 - (Math.PI * i) / 10;
    out.push([bx + (w / 2) * Math.cos(a), by + (w / 2) * Math.sin(a)]);
  }
  return out;
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // A ruler strip along the front edge.
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(STRIP.x + 3, STRIP.x + STRIP.w - 3, 3.6, 5, STRIP.y + 0.6, 0.6, [1.8, 3.2], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([STRIP.x + 1.6, STRIP.y + 4.4, 0.6]), at([STRIP.x + STRIP.w - 1.6, STRIP.y + 4.4, 0.6])], { size: 0.4 }));
  // Label plate.
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
  [18, 12, 15].forEach((length, i) => {
    const y = LABEL.y + 4.2 + i * 2.9;
    out.push(L(k.lineOnTop([LABEL.x + 5.5, y], [LABEL.x + 5.5 + length, y], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// The shared record: one cable from each station's pedestal to the next, round the table.
function cables() {
  const z = 2;
  const half = (s) => (s === 1 ? 10.5 : PED);
  const centre = (s) => (s === 1 ? CAB_C : POSTS[s]);
  // Where a cable leaves a base square of half-size h toward plan angle a (degrees) along the ring.
  const side = (s, sign) => {
    const a = (M.LP_STATIONS[s] * Math.PI) / 180;
    const dir = Math.sign(M.LP_STEP) * sign; // +1: the way the pucks travel
    const t = [-dir * Math.sin(a), dir * Math.cos(a)];
    const scale = half(s) / Math.max(Math.abs(t[0]), Math.abs(t[1]));
    return [centre(s)[0] + t[0] * scale, centre(s)[1] + t[1] * scale, z];
  };
  const out = [];
  for (let s = 0; s < 5; s++) {
    const n = (s + 1) % 5;
    const from = side(s, 1);
    const to = side(n, -1);
    const a0 = Math.atan2(from[1], from[0]) * (180 / Math.PI);
    let a1 = Math.atan2(to[1], to[0]) * (180 / Math.PI);
    const dir = Math.sign(M.LP_STEP);
    while ((a1 - a0) * dir < 0) a1 += 360 * dir;
    const via = arc(CABLE_R, a0 + 4 * dir, a1 - 4 * dir, 0.4, 10);
    out.push(k.wireSvg(at(from), at(to), { via: via.map(at), tone: "lo", size: 0.8 }));
  }
  const [mx, my] = MOTOR;
  const u = Math.hypot(mx, my);
  const toward = (r, z) => [(mx / u) * r, (my / u) * r, z];
  out.push(k.wireSvg(at(toward(u - 9, 2)), at(toward(DRUM_R + 0.2, 2)), { via: [at(toward(u - 11, 0.4)), at(toward(DRUM_R + 2.5, 0.4))], tone: "lo", size: 0.8 }));
  return out.join("");
}

function pedestal([x, y], h = 4) {
  const plan = { x: x - PED, y: y - PED, w: PED * 2, d: PED * 2, r: 2 };
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, h, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(plan, 0, h, P, 4, 0.6), { tone: "mid" }));
  const screws = k.corners(plan, 2.4);
  out.push(L(screws.map(([sx, sy]) => k.ring(sx, sy, 1.2, h, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([sx, sy]) => at([sx, sy, h])), { size: 0.4 }));
  return out.join("");
}

function post([x, y], top, r = 2.8) {
  return [
    S(k.cylinder(x, y, r + 1.6, 4, 2, P, 28), { tone: "mid" }),
    S(k.cylinder(x, y, r, 6, top - 6, P, 28), { tone: "mid", crease: "none", inner: L([14, top - 8].map((z) => k.sideArc(x, y, r, z, P, 16)).join(""), { tone: "faint" }) }),
  ].join("");
}

function motor() {
  const [x, y] = MOTOR;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 9, y: y - 9, w: 18, d: 18, r: 9 }, 0, 2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 9, 0, 2, P, 40), { tone: "lo" }));
  const bolts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    if (facingFront(a)) bolts.push(at([x + 8 * Math.cos(a), y + 8 * Math.sin(a), 2]));
  }
  out.push(D(bolts, { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 6.8, 2, 11, P, 44), { tone: "mid", inner: L(k.knurl(x, y, 6.8, 4, 11, 30, P, 0.3), { tone: "lo" }) + L(k.sideArc(x, y, 6.8, 4, P, 32) + k.sideArc(x, y, 6.8, 11, P, 32), { tone: "faint" }) }));
  out.push(L(k.ring(x, y, 4.4, 13, P, 28), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 3, 13, 2.4, P, 24, 0.3), { tone: "mid" }));
  return out.join("");
}

// The model: a cabinet behind the table. Its lamp blinks while it thinks; its knob turns to the decision.
function cabinet() {
  const plinth = { x: CABINET.x - 1.5, y: CABINET.y - 1.5, w: CABINET.w + 3, d: CABINET.d + 3, r: 2 };
  const out = [`<path class="iso-halo" d="${k.haloOf(plinth, 0, 4, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(plinth, 0, 4, P, 4, 0.5), { tone: "mid" }));
  const front = CABINET.y + CABINET.d;
  const right = CABINET.x + CABINET.w;
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const z0 = 8.4 + i * 2.6;
    const z1 = z0 + 1.1;
    slots.push(k.pathOf([[CABINET.x + 3.5, front, z0], [CABINET.x + 14.5, front, z0], [CABINET.x + 14.5, front, z1], [CABINET.x + 3.5, front, z1]].map(at), true));
    slots.push(k.pathOf([[right, CABINET.y + 3.5, z0], [right, CABINET.y + 14.5, z0], [right, CABINET.y + 14.5, z1], [right, CABINET.y + 3.5, z1]].map(at), true));
  }
  const seams = k.sideSeam(CABINET, CAB_TOP - 3, P, 4) + k.sideSeam(CABINET, 6.5, P, 4);
  out.push(S(k.slabOf(CABINET, 4, CAB_TOP - 4, P, 4, 0.8), { tone: "mid", inner: L(seams, { tone: "faint" }) + L(slots.join(""), { tone: "lo" }) }));
  out.push(L(k.planOutline(k.insetPlan(CABINET, 2.2), CAB_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(CABINET, 3.6).map(([x, y]) => at([x, y, CAB_TOP])), { size: 0.4 }));
  const [kx, ky] = KNOB;
  out.push(S(k.cylinder(kx, ky, 2, CAB_TOP, 1, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(kx, ky, 4, CAB_TOP + 1, 3, P, 32), { tone: "mid", inner: L(k.knurl(kx, ky, 4, CAB_TOP + 1.2, CAB_TOP + 4, 28, P, 0.3), { tone: "lo" }) }));
  const [lx, ly] = LAMP;
  out.push(S(k.cylinder(lx, ly, 2.6, CAB_TOP, 0.8, P, 20), { tone: "mid" }));
  return out.join("");
}

function lampSvg(on) {
  const [lx, ly] = LAMP;
  return S(k.cylinder(lx, ly, 1.7, CAB_TOP + 0.8, 1.4, P, 18, 0.3), { tone: on ? "hi" : "lo", crease: "none" }) + D([at([lx, ly, CAB_TOP + 2.2])], { size: on ? 0.9 : 0.4, tone: on ? "hi" : "lo" });
}

function drum() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -DRUM_R, y: -DRUM_R, w: DRUM_R * 2, d: DRUM_R * 2, r: DRUM_R }, 0, 6, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(0, 0, DRUM_R, 0, M.LP_TABLE.z, P, 96, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, DRUM_R, 2.6, P, 64), { tone: "faint" }) }));
  const bolts = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.08;
    if (facingFront(a)) bolts.push(at([(DRUM_R - 1.4) * Math.cos(a), (DRUM_R - 1.4) * Math.sin(a), M.LP_TABLE.z]));
  }
  out.push(D(bolts, { size: 0.4 }));
  out.push(S(k.cylinder(0, 0, M.LP_TABLE.r, M.LP_TABLE.z, M.LP_TABLE.top - M.LP_TABLE.z, P, 96, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, M.LP_TABLE.r, M.LP_TABLE.z + 1.2, P, 64), { tone: "faint" }) }));
  out.push(L(k.ring(0, 0, 11, M.LP_TABLE.top, P, 40), { tone: "lo" }));
  return out.join("");
}

// Perceive: a sensor head on an arm, its lens over the nest.
function perceiveHead() {
  const [px, py] = POSTS[0];
  const [x, y] = NESTS[0];
  const out = [S(k.extrude(armRing([px, py], [x, y], 6.4), 34, 3.4, P, { bevel: 0.4 }), { tone: "mid" })];
  out.push(D([at([px + (x - px) * 0.35, py + (y - py) * 0.35, 37.4]), at([px + (x - px) * 0.6, py + (y - py) * 0.6, 37.4])], { size: 0.4 }));
  out.push(S(k.cylinder(px, py, 3.6, 37.4, 1.4, P, 24, 0.3), { tone: "mid" }));
  return out.join("");
}

function perceiveLens() {
  const [x, y] = NESTS[0];
  const out = [];
  out.push(S(k.cylinder(x, y, 3, 22.6, 1.6, P, 28), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(x, y, 4.4, 24.2, 9.8, P, 36, 0.4), { tone: "mid", inner: L(k.knurl(x, y, 4.4, 24.6, 27.4, 30, P, 0.3), { tone: "lo" }) + L(k.sideArc(x, y, 4.4, 30.4, P, 24), { tone: "faint" }) }));
  return out.join("");
}

// Act: a press on an arm; the ram comes down on the puck.
function actHousing() {
  const [px, py] = POSTS[2];
  const [x, y] = NESTS[2];
  const Q = M.LP_PRESS;
  const out = [S(k.extrude(armRing([px, py], [x, y], 7), Q.top - 4, 4, P, { bevel: 0.4 }), { tone: "mid" })];
  out.push(S(k.cylinder(px, py, 3.8, Q.top, 1.4, P, 24, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, Q.r, Q.z, Q.top - Q.z, P, 40, 0.5), { tone: "mid", inner: L(k.sideArc(x, y, Q.r, Q.z + 2.2, P, 24) + k.sideArc(x, y, Q.r, Q.top - 4, P, 24), { tone: "faint" }) }));
  out.push(L(k.ring(x, y, Q.r - 1.6, Q.top, P, 32), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 2, Q.top, 2.4, P, 20, 0.3), { tone: "mid" }));
  return out.join("");
}

function actRam() {
  const [x, y] = NESTS[2];
  const Q = M.LP_PRESS;
  const tip = M.LP_PUCK.top;
  return S(k.cylinder(x, y, 3.2, tip, 1.6, P, 28, 0.3), { tone: "hi", crease: "lo" }) + S(k.cylinder(x, y, Q.ram, tip + 1.6, Q.z - tip - 1.6, P, 20), { tone: "hi", crease: "none" });
}

// Verify: a sealed dial gauge, its plunger on the puck. The tolerance pointers are fixed under a wire seal.
function verifyGauge() {
  const [px, py] = POSTS[3];
  const [x, y] = NESTS[3];
  const G = M.LP_GAUGE;
  const out = [];
  const u = Math.atan2(y - py, x - px);
  const lug = [x - Math.cos(u) * (G.r + 1.2), y - Math.sin(u) * (G.r + 1.2)];
  out.push(S(k.extrude(armRing([px, py], lug, 6), G.z + 0.6, 3.4, P, { bevel: 0.4 }), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 3.6, G.z + 4, 1.4, P, 24, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, G.stem + 0.8, G.z - 3, 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, G.r, G.z, G.top - G.z, P, 64, 0.8), { tone: "hi", crease: "lo", inner: L(k.knurl(x, y, G.r, G.top - 2.2, G.top, 60, P, 0.3), { tone: "lo" }) + L(k.sideArc(x, y, G.r, G.top - 2.2, P, 40), { tone: "faint" }) }));
  out.push(L(k.ring(x, y, G.r - 1.2, G.top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(x, y, G.r - 1.4, 40, 5, G.top, [0.8, 1.6], P, M.LP_ZERO - 2.2, 4.4);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // The sealed band: two fixed pointers and the arc between them.
  const band = [];
  for (let i = 0; i <= 16; i++) {
    const a = M.LP_ZERO - M.LP_TOL * 2.2 + (i / 16) * M.LP_TOL * 4.4;
    band.push([x + Math.sin(a) * (G.r - 3.6), y - Math.cos(a) * (G.r - 3.6)]);
  }
  out.push(L(k.onTop(band, G.top, P), { tone: "mid" }));
  const pointers = [-1, 1].map((s) => {
    const a = M.LP_ZERO + s * M.LP_TOL * 2.2;
    return k.lineOnTop([x + Math.sin(a) * (G.r - 3.6), y - Math.cos(a) * (G.r - 3.6)], [x + Math.sin(a) * (G.r - 1.2), y - Math.cos(a) * (G.r - 1.2)], G.top, P);
  });
  out.push(L(pointers.join(""), { tone: "hi" }));
  out.push(L(k.ring(x, y, 1.4, G.top, P, 16), { tone: "mid" }));
  // The seal: a wire from a bezel screw down to the arm, crimped in a lead seal.
  const sealA = [x + Math.cos(u + 1.2) * (G.r - 0.2), y + Math.sin(u + 1.2) * (G.r - 0.2), G.top - 0.6];
  const sealB = [lug[0] + Math.cos(u + Math.PI / 2) * 2.6, lug[1] + Math.sin(u + Math.PI / 2) * 2.6, G.z + 4];
  const mid = [(sealA[0] + sealB[0]) / 2 + Math.cos(u + 1.4) * 3, (sealA[1] + sealB[1]) / 2 + Math.sin(u + 1.4) * 3, G.z + 0.6];
  out.push(k.wireSvg(at(sealA), at(sealB), { via: [at(mid)], tone: "mid", size: 0.45 }));
  out.push(D([at(mid)], { size: 1.3, tone: "mid" }));
  return out.join("");
}

function verifyPlunger() {
  const [x, y] = NESTS[3];
  const G = M.LP_GAUGE;
  const tip = M.LP_PUCK.top;
  return S(k.cylinder(x, y, 1.6, tip, 1.2, P, 18, 0.3), { tone: "hi", crease: "lo" }) + S(k.cylinder(x, y, 0.9, tip + 1.2, G.z - 3 - tip - 1.2, P, 14), { tone: "hi", crease: "none" });
}

// The environment: a tray on a column through the table's hub, four guide pillars, a crossbar.
function hub() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 9, M.LP_TABLE.top, 6, P, 40), { tone: "mid", crease: "none", inner: L(k.sideArc(0, 0, 9, 13, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(0, 0, 13, 16, M.LP_TRAY_TOP - 16, P, 48, 0.5), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 10.6, M.LP_TRAY_TOP, P, 40), { tone: "faint" }));
  return out.join("");
}

function pillar([x, y]) {
  return S(k.cylinder(x, y, 1.6, M.LP_TRAY_TOP, 1, P, 16), { tone: "mid" }) + S(k.cylinder(x, y, 1.1, M.LP_TRAY_TOP + 1, PILLAR_TOP - M.LP_TRAY_TOP - 1, P, 16), { tone: "mid", crease: "none" }) + S(k.cylinder(x, y, 1.8, PILLAR_TOP, 1.4, P, 16, 0.3), { tone: "mid" });
}

function crossbar() {
  const z = PILLAR_TOP + 1.4;
  return S(k.extrude(armRing(PILLARS[0], PILLARS[1], 4.4), z, M.LP_BRIDGE_Z - z, P, { bevel: 0.4 }), { tone: "mid" }) + D([at([...PILLARS[0], M.LP_BRIDGE_Z]), at([...PILLARS[1], M.LP_BRIDGE_Z])], { size: 0.4 });
}

const DEPOT = M.lpAlong(M.LP_DEPOT);
function depositPost() {
  const [x, y] = POSTS[4];
  const out = [post([x, y], M.LP_BRIDGE_Z, 3.4)];
  // The magazine of blank tiles, on a bracket from the post.
  out.push(S(k.extrude(armRing([x, y], DEPOT, 4.4), 33.6, 2.4, P, { bevel: 0.3 }), { tone: "mid" }));
  out.push(S(k.extrude(M.lpPlateRing(DEPOT[0], DEPOT[1], 14, 1.4), 36, 3, P, { bevel: 0.4 }), { tone: "mid" }));
  for (let i = 0; i < 3; i++) out.push(M.plateSvg(DEPOT[0], DEPOT[1], 39 + i * M.LP_LAYER_H, P, k, "lo"));
  return out.join("");
}

function bridge() {
  const z = M.LP_BRIDGE_Z;
  const end = M.lpAlong(-2.8);
  const ring = armRing(POSTS[4], end, 5.2);
  const out = [S(k.extrude(ring, z, 3, P, { bevel: 0.4 }), { tone: "mid" })];
  out.push(D([at([...POSTS[4], z + 3]), at([...end, z + 3])], { size: 0.45 }));
  return out.join("");
}

// The body: two ratchet dials, observation scope and execution authority, and the key a person turns.
function bodyPanel() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PANEL, 0, PANEL_TOP, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(PANEL, 0, PANEL_TOP, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(PANEL, 2, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PANEL, 1.6), PANEL_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(PANEL, 2.6).map(([x, y]) => at([x, y, PANEL_TOP])), { size: 0.4 }));
  for (const [x, y] of DIALS) {
    out.push(S(k.cylinder(x, y, 5.8, PANEL_TOP, DIAL_TOP - PANEL_TOP, P, 40, 0.4), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(x, y, 5, DIAL_TOP, P, 40), { tone: "lo" }));
    const t = k.radialTicks(x, y, 4.8, M.LP_LEVELS - 1, 1, DIAL_TOP, [1, 1.4], P, M.lpDialAngle(1), (160 * Math.PI) / 180);
    out.push(L(t.major, { tone: "mid" }));
    out.push(L(k.ring(x, y, 0.9, DIAL_TOP, P, 12), { tone: "mid" }));
  }
  const [kx, ky] = KEY;
  out.push(S(k.cylinder(kx, ky, 3, PANEL_TOP, 1.2, P, 28, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: kx - 0.6, y: ky - 2.2, w: 1.2, d: 4.4, r: 0.4 }, PANEL_TOP + 1.2, 2.4, P, 2), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(kx, ky - 2.6, 1.3, PANEL_TOP + 1.2, 2.4, P, 16), { tone: "hi", crease: "lo" }));
  return out.join("");
}

const plan0 = M.planFor(3);
const st0 = M.stateAt(6.5, plan0);
const live0 = (name, svg, extra = "") => `<g data-part="${name}"${extra}>${svg}</g>`;
const h0 = M.hoistAt(st0);
const SPLIT = PR; // the tile is drawn behind the back pillars until it passes between them
const postDepth = (s) => k.depthOf([...POSTS[s], 0], P);
const backStations = [0, 2, 3].filter((s) => postDepth(s) < 0); // posts behind the table: drawn before it
const postTop = { 0: 34, 2: M.LP_PRESS.top - 4, 3: M.LP_GAUGE.z + 4 };
const postR = { 0: 2.8, 2: 3.2, 3: 2.8 };
const heads = {
  0: () => perceiveHead() + perceiveLens(),
  2: () => live0("ram", actRam()) + actHousing(),
  3: () => live0("plunger", verifyPlunger()) + verifyGauge() + live0("needle", M.drawNeedle(0, P, k)),
};
const front = [
  ...[0, 2, 3].map((s) => ({ depth: postDepth(s), svg: (backStations.includes(s) ? "" : pedestal(POSTS[s]) + post(POSTS[s], postTop[s], postR[s])) + heads[s]() })),
  { depth: k.depthOf([...CAB_C, 0], P), svg: cabinet() + live0("lamp", lampSvg(false)) + live0("knob", M.drawKnobMark(KNOB[0], KNOB[1], CAB_TOP + 4, 0, P, k)) },
  { depth: k.depthOf([PANEL.x + PANEL.w / 2, PANEL.y + PANEL.d / 2, 0], P), svg: bodyPanel() + live0("dials", DIALS.map(([x, y], i) => M.drawBodyNeedle(x, y, DIAL_TOP, i ? st0.reach : st0.scope, P, k)).join("")) },
].sort((a, b) => a.depth - b.depth);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "AIエージェント前提のアジャイルを、五つの作業台を持つ回転割り出し台として表した図。台が一コマ回るたびに、知覚・考え・実行・確認・反映の五つの作業台が、それぞれ目の前の駒を同時に扱う。知覚の頭は観測範囲の光の輪を台に落とし、考えの箱はランプを点けてつまみを回し、実行のプレスは駒を押し、確認のダイヤルゲージは封印された許容範囲で駒を測る。反映の台車は学びの板を中央の柱のあいだへ仮置きし、確認に合格していればそのまま残し、不合格なら持ち帰る。合格が三回続くと、手前のパネルの観測範囲と実行権限のダイヤルが交互に一段進む。",
  body: [
    plate(),
    cables(),
    motor(),
    pedestal(POSTS[4]),
    depositPost(),
    ...backStations.map((s) => pedestal(POSTS[s]) + post(POSTS[s], postTop[s], postR[s])),
    drum(),
    live0("tabletop", M.drawTabletop(st0.turn, P, k)),
    live0("scope", M.drawScope(st0.scope, 0, P, k)),
    live0("pucksBack", M.drawPucks(st0.turn, st0, plan0, false, P, k)),
    live0("hoistBack", h0.y > SPLIT ? M.drawHoist(h0, P, k) : ""),
    hub(),
    pillar(PILLARS[0]),
    pillar(PILLARS[1]),
    crossbar(),
    live0("stack", M.drawStack(st0.layers, P, k)),
    live0("hoistIn", h0.y <= SPLIT ? M.drawHoist(h0, P, k) : ""),
    bridge(),
    live0("trolley", M.drawTrolley(h0.y, P, k)),
    pillar(PILLARS[2]),
    pillar(PILLARS[3]),
    live0("pucksFront", M.drawPucks(st0.turn, st0, plan0, true, P, k)),
    ...front.map((item) => item.svg),
  ],
});

const shared = readFileSync(join(HERE, "loop.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${shared}
const P = ${JSON.stringify(P)};
const K = { solidSvg, lineSvg, dotsSvg, cylinder, slabOf, extrude, onTop, insetPlan, planOutline, ring, radialTicks, iso, lineOnTop, segment, sideArc, depthOf };
const SPLIT = ${SPLIT};
const KNOB = ${JSON.stringify(KNOB)}, CAB_TOP = ${CAB_TOP}, DIALS = ${JSON.stringify(DIALS)}, DIAL_TOP = ${DIAL_TOP};
const LAMP_ON = ${JSON.stringify(lampSvg(true))};
const LAMP_OFF = ${JSON.stringify(lampSvg(false))};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const el = {};
for (const name of ["lamp", "knob", "tabletop", "scope", "pucksBack", "pucksFront", "ram", "stack", "hoistIn", "hoistBack", "plunger", "needle", "dials", "trolley"]) el[name] = part(name);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const STEP = 3.4; // seconds per index
const HOLD = 3.2;
let seed = 3, plan = planFor(seed), t = 0, phase = "run", hold = 0, fade = 1;
let speed = 1, fast = false, paused = false, frame = 0, last = 0, visible = false;
let shown = {};
const set = (name, key, value, make) => {
  if (shown[name] === key) return;
  shown[name] = key;
  el[name].innerHTML = make(value);
};
function sayText(st) {
  const tail = " · 学び " + st.layers + "層 · 観測 " + st.scope + " · 実行 " + st.reach;
  const n = "第" + (st.k + 1) + "コマ";
  if (phase === "full") return "学びの柱が満ちた（" + LP_LAYERS + "層）· 次の仕組みへ";
  if (st.f < LP_INDEX) return n + " · 割り出し" + tail;
  if (!st.decided) return n + " · 作業中" + tail;
  const v = st.k >= 2 ? (st.verdict ? " · 確認 合格" : " · 確認 不合格") : " · 慣らし運転";
  const d = st.depositing ? (st.keep ? " · 反映 残す" : " · 反映 戻す") : "";
  return n + v + d + tail;
}
function draw() {
  const st = stateAt(t, plan);
  const f = st.f;
  const turnKey = st.turn.toFixed(4);
  if (shown.turn !== turnKey) {
    shown.turn = turnKey;
    el.tabletop.innerHTML = drawTabletop(st.turn, P, K);
  }
  const marks = [0, 1, 2, 3, 4].map((i) => (puckMarked(i, st, plan) ? 1 : 0)).join("");
  set("pucksBack", turnKey + marks, st, (s) => drawPucks(s.turn, s, plan, false, P, K));
  set("pucksFront", turnKey + marks, st, (s) => drawPucks(s.turn, s, plan, true, P, K));
  const work = f > LP_INDEX && f < 0.8;
  const glow = work && f < 0.6 ? 1 : 0;
  set("scope", st.scope + ":" + glow, st.scope, (lv) => drawScope(lv, glow, P, K));
  const lampOn = work && Math.floor((f - LP_INDEX) * 18) % 2 === 0 && f < 0.5;
  set("lamp", lampOn, lampOn, (on) => (on ? LAMP_ON : LAMP_OFF));
  const knobA = (st.k + lpSpan(f, 0.3, 0.5)) * 1.9;
  set("knob", knobA.toFixed(3), knobA, (a) => drawKnobMark(KNOB[0], KNOB[1], CAB_TOP + 4, a, P, K));
  const press = lpSpan(f, 0.36, 0.5) - lpSpan(f, 0.52, 0.68);
  el.ram.setAttribute("transform", translateAlong(P, [0, 0, (1 - press) * LP_PRESS.rise]));
  const down = lpSpan(f, LP_INDEX, 0.4) - lpSpan(f, 0.9, 1);
  el.plunger.setAttribute("transform", translateAlong(P, [0, 0, (1 - down) * 2.6]));
  const r = st.reading * lpSpan(f, 0.4, 0.58) * (1 - lpSpan(f, 0.9, 1));
  set("needle", r.toFixed(4), r, (v) => drawNeedle(v, P, K));
  set("stack", st.layers, st.layers, (n) => drawStack(n, P, K));
  const h = hoistAt(st);
  const hk = h.y.toFixed(3) + h.tileZ.toFixed(3) + h.hookZ.toFixed(3) + h.alpha.toFixed(3) + h.firm.toFixed(3);
  set("hoistIn", hk, h, (v) => (v.y <= SPLIT ? drawHoist(v, P, K) : ""));
  set("hoistBack", hk, h, (v) => (v.y > SPLIT ? drawHoist(v, P, K) : ""));
  set("trolley", h.y.toFixed(3), h.y, (y) => drawTrolley(y, P, K));
  set("dials", st.scope + ":" + st.reach, st, (s) => DIALS.map(([x, y], i) => drawBodyNeedle(x, y, DIAL_TOP, i ? s.reach : s.scope, P, K)).join(""));
  svg.style.opacity = fade.toFixed(3);
  const text = sayText(st);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(st.layers));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  speed += ((fast ? 3 : 1) - speed) * (1 - Math.exp(-dt / 0.35));
  const step = paused ? 0 : dt * speed;
  if (phase === "run") {
    t += step / STEP;
    if (t >= plan.steps) { t = plan.steps - 1e-6; phase = "full"; hold = 0; }
  } else if (phase === "full") {
    hold += step;
    if (hold > HOLD) fade = Math.max(0, 1 - (hold - HOLD) / 0.8);
    if (hold > HOLD + 0.8) { seed += 1; plan = planFor(seed); t = 0; phase = "in"; shown = {}; }
  } else {
    fade = Math.min(1, fade + step / 0.8);
    t += step / STEP;
    if (fade >= 1) phase = "run";
  }
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerenter", () => { fast = true; });
stage.addEventListener("pointerleave", () => { fast = false; });
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); paused = !paused; }
  if (event.key === "ArrowRight") { event.preventDefault(); fast = true; }
});
stage.addEventListener("keyup", (event) => { if (event.key === "ArrowRight") fast = false; });
const settleStill = () => { if (still.matches) { phase = "run"; fade = 1; t = 12.66; draw(); } else run(); };
still.addEventListener("change", settleStill);
settleStill();
draw();
window.__loop = { setT: (v) => { t = v; phase = "run"; fade = 1; draw(); }, pause: () => { paused = true; } };
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "五段階を回り続ける仕組み",
  hint: "ホバーで早送り · Spaceで一時停止",
  readout: "一周 1 · 割り出し",
  keys: [
    { mark: "lit", label: "確認ゲージの針：改ざんできない置き場から読む結果" },
    { mark: "raised", label: "駒：一周を回る仕事。合格すると印が灯る" },
    { mark: "raised", label: "柱のあいだの板：環境側に沈殿した学び" },
    { mark: "edge", label: "台を囲むケーブル：参加者をつなぐ共有記録" },
  ],
  caption:
    "割り出し台が一コマ回るたびに、五つの作業台が目の前の駒を同時に扱う。左奥の知覚の頭は、観測範囲の光の輪を台に落とす。輪の外はエージェントにとって存在しない。奥の箱はモデルで、考えるあいだだけランプが点き、つまみが次の決定へ回る。右奥のプレスが駒を押して世界に作用し、手前のダイヤルゲージが結果を測る。許容範囲を示す二本の指針は針金と鉛で封印されていて、人にもAIにも動かせない。左手前の反映の台車は、学びの板を中央の柱のあいだへ仮置きする。その駒が確認に合格していれば板は残り、不合格なら持ち帰る。だから柱に積もるのは、フィードバックを通った学びだけになる。合格が三回続くと、右手前のパネルで観測範囲（左）と実行権限（右）のダイヤルが交互に一段だけ進む。権限を広げる鍵は人が回す。柱が10層で満ちると、次の仕組みが最初から回り始める。",
  body: `<div class="iso-stage" tabindex="0" role="meter" aria-label="一周を回る仕組み：残った学びの層の数" aria-valuemin="0" aria-valuemax="${M.LP_LAYERS}" aria-valuenow="0">${svg}</div>`,
});

const file = theme === "light" ? "agent-loop-light.html" : "agent-loop.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "五段階を回り続ける仕組み", theme, body, script: kitScript() + live }).replace('<html lang="en">', '<html lang="ja">'));
console.log("wrote", file);
