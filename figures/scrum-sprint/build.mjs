import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./scrum.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -130, y: -86, w: 248, d: 134, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const HOPPER = { x: -116, y: -76, w: 32, d: 28, r: 2 };
const TILE = { x: -112, y: -72, w: 24, d: 20, r: 1 };
const TILE_PITCH = 2.2;
const TILE_H = 1.8;
const POST_TOP = 30;
const BOX = { x: 92, y: -80, w: 20, d: 14, r: 1.5 };
const PEDESTAL = { x: M.SP_G[0] - 18, y: M.SP_G[1] - 18, w: 36, d: 36, r: 3 };
const RULER = { x: M.SP_FACE0 - 5, y: 36, w: M.SP_GOAL_MAX - M.SP_FACE0 + 10, d: 7, r: 1 };
const RAILS = [3, 24];
const ANCHOR = { x: M.SP_ANCHOR_X - 6, y: 2, w: 6, d: 28, r: 1.2 };
const STOP = { x: M.SP_STOP_X, y: 2, w: 7, d: 28, r: 1.2 };
const LABEL = { x: -70, y: -80, w: 40, d: 15, r: 1.2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [M.SP_G[0], M.SP_G[1], 40], [M.SP_D[0], M.SP_D[1], 30], [-100, -62, POST_TOP + 2]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 50, elevation: 34 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const facingFront = (angle) => Math.cos(angle) * k.towardViewer(P)[0] + Math.sin(angle) * k.towardViewer(P)[1] > 0.25;
const K = k;

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
  return out.join("");
}

// The progress scale: one major tick per sprint, from the start mark to the Product Goal.
function ruler() {
  const out = [S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" })];
  const from = M.SP_FACE0;
  const step = M.SP_CAP / 4;
  const minor = [];
  const major = [];
  for (let i = 0; from + i * step <= M.SP_GOAL_MAX + 1e-6; i++) {
    const x = from + i * step;
    const big = i % 4 === 0;
    (big ? major : minor).push(k.lineOnTop([x, RULER.y], [x, RULER.y + (big ? 3.8 : 2)], 0.6, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(D([at([RULER.x + 2, RULER.y + 5.2, 0.6]), at([RULER.x + RULER.w - 2, RULER.y + 5.2, 0.6])], { size: 0.45 }));
  return out.join("");
}

function labelPlate() {
  const out = [S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" })];
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
  [24, 16, 20].forEach((length, index) => {
    const y = LABEL.y + 4.4 + index * 3.2;
    out.push(L(k.lineOnTop([LABEL.x + 6, y], [LABEL.x + 6 + length, y], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([LABEL.x + 2.8, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.8, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

const hopperPosts = byDepth(k.corners(HOPPER, 2.2));
function hopperPost([x, y]) {
  return S(k.cylinder(x, y, 1.6, 3, POST_TOP - 3, P, 16), { tone: "mid", crease: "none" }) + S(k.cylinder(x, y, 2.2, POST_TOP, 1.4, P, 16), { tone: "mid" });
}

// The Product Backlog: a magazine of six item tiles, the top one leaving each sprint.
function hopperBack() {
  const out = [`<path class="iso-halo" d="${k.haloOf(HOPPER, 0, 3, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(HOPPER, 0, 3, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(HOPPER, 4.4), 3, P, 3), { tone: "faint" }));
  hopperPosts.slice(0, 3).forEach((point) => out.push(hopperPost(point)));
  return out.join("");
}

function tiles() {
  const out = [];
  for (let i = 0; i < M.SP_SLOTS; i++) {
    const z = 3 + i * TILE_PITCH;
    const tile = S(k.slabOf(TILE, z, TILE_H, P, 3, 0.4), { tone: "hi", crease: "lo" }) + L(k.planOutline(k.insetPlan(TILE, 2.4), z + TILE_H, P, 3), { tone: "faint" });
    out.push(`<g data-tile="${i}">${tile}</g>`);
  }
  return out.join("");
}

function hopperFront() {
  const out = [hopperPost(hopperPosts[3])];
  return out.join("");
}

// The drive: a gear motor under the crank shaft, wired to a switch box.
function driveUnit() {
  const [x, y] = M.SP_D;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 15, y: y - 15, w: 30, d: 30, r: 15 }, 0, 2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(BOX, 0, 10, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(BOX, 7.6, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 2), 10, P, 3), { tone: "faint" }));
  out.push(D([at([BOX.x + 2.4, BOX.y + 2.4, 10]), at([BOX.x + BOX.w - 2.4, BOX.y + BOX.d - 2.4, 10])], { size: 0.45 }));
  const toggle = [BOX.x + 14, BOX.y + 7];
  out.push(S(k.cylinder(toggle[0], toggle[1], 2.4, 10, 1.2, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(toggle[0] - 1.2, toggle[1], 0.7, 11.2, 4, P, 10), { tone: "hi", crease: "none" }));
  const lamp = [BOX.x + 6, BOX.y + 7];
  out.push(S(k.cylinder(lamp[0], lamp[1], 1.6, 10, 0.8, P, 16), { tone: "hi" }));
  const cableFrom = [BOX.x, BOX.y + 7, 3];
  const angle = Math.atan2(BOX.y + 7 - y, BOX.x - x);
  const cableTo = [x + 15 * Math.cos(angle), y + 15 * Math.sin(angle), 1];
  out.push(k.wireSvg(at(cableFrom), at(cableTo), { via: [at([BOX.x - 5, BOX.y + 7, 0.4]), at([cableTo[0] + 4 * Math.cos(angle), cableTo[1] + 4 * Math.sin(angle), 0.4])], tone: "lo", size: 0.9 }));
  out.push(S(k.cylinder(x, y, 15, 0, 2, P, 48), { tone: "lo" }));
  const bolts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    if (facingFront(a)) bolts.push(at([x + 14 * Math.cos(a), y + 14 * Math.sin(a), 2]));
  }
  out.push(D(bolts, { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 12.4, 2, 11, P, 56), { tone: "mid", inner: L(k.knurl(x, y, 12.4, 4, 11, 44, P, 0.3), { tone: "lo" }) }));
  out.push(L(k.sideArc(x, y, 12.4, 4, P, 32) + k.sideArc(x, y, 12.4, 11, P, 32), { tone: "faint" }));
  out.push(L(k.ring(x, y, 9, 13, P, 40), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 7.6, 13, 5, P, 40, 0.4), { tone: "mid" }));
  return out.join("");
}

// The drop of the feedback line, from the gauge to the floor beside the goal stop (it rides with the stop).
function feedbackDrop() {
  const g = M.SP_GAUGE;
  const route = [[g.x + g.r, g.y, g.z + 2], [g.x + g.r + 2.5, g.y, g.z], [g.x + g.r + 2.5, g.y, 0.5]].map(at);
  return k.wireSvg(route[0], route[2], { via: [route[1]], tone: "mid", size: 0.8, ends: "from" });
}

// The market: a lead screw behind the rails, turned by a knob, moves the goal stop through its nut.
function leadScrew() {
  const { y, z, r, x0, x1 } = M.SP_SCREW;
  const out = [];
  const blockL = { x: x0 - 7, y: y - 5, w: 7, d: 10, r: 1 };
  const blockR = { x: x1, y: y - 5, w: 6, d: 10, r: 1 };
  out.push(S(k.slabOf(blockL, 0, 9, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([blockL.x + 1.8, blockL.y + 1.8, 9]), at([blockL.x + 1.8, blockL.y + blockL.d - 1.8, 9])], { size: 0.4 }));
  const rod = { x: x0, y: y - r, w: x1 - x0, d: 2 * r, r: r * 0.9 };
  const threads = [];
  for (let x = x0 + 1; x < x1 - 0.5; x += 1.4) threads.push(k.lineOnTop([x, y - r * 0.8], [x + 0.9, y + r * 0.8], z + r, P));
  out.push(S(k.slabOf(rod, z - r, 2 * r, P, 4), { tone: "mid", crease: "none", inner: L(threads.join(""), { tone: "faint" }) }));
  out.push(S(k.slabOf(blockR, 0, 9, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([blockR.x + 3, blockR.y + 2, 9]), at([blockR.x + 3, blockR.y + blockR.d - 2, 9])], { size: 0.4 }));
  const [kx, ky] = M.SP_KNOB;
  out.push(S(k.cylinder(kx, ky, 2.4, 9, 1.4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(kx, ky, 5, 10.4, 3.6, P, 36), { tone: "mid", inner: L(k.knurl(kx, ky, 5, 10.6, 13.8, 36, P, 0.3), { tone: "lo" }) }));
  return out.join("");
}

function nut() {
  const nutPlan = { x: STOP.x + 1, y: M.SP_SCREW.y - 4, w: 5, d: STOP.y - M.SP_SCREW.y + 4, r: 0.8 };
  return S(k.slabOf(nutPlan, 0.6, M.SP_STOP_Z[0] + 4 - 0.6, P, 3, 0.4), { tone: "mid" }) + D([at([nutPlan.x + 2.5, nutPlan.y + 1.6, M.SP_STOP_Z[0] + 4])], { size: 0.4 });
}

function hub() {
  const [x, y] = M.SP_D;
  return S(k.cylinder(x, y, 5.6, M.SP_Z.genTop, M.SP_Z.arm - M.SP_Z.genTop, P, 28), { tone: "mid" });
}

function pedestal() {
  const [x, y] = M.SP_G;
  const out = [`<path class="iso-halo" d="${k.haloOf(PEDESTAL, 0, 4, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(PEDESTAL, 0, 4, P, 4, 0.6), { tone: "mid" }));
  const screws = k.corners(PEDESTAL, 4.4);
  out.push(L(screws.map(([sx, sy]) => k.ring(sx, sy, 1.8, 4, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([sx, sy]) => at([sx, sy, 4])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 9, 4, 11, P, 40), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 9, 9.5, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 12, 15, 3, P, 48, 0.4), { tone: "mid" }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of RAILS) {
    const end = M.SP_GOAL_MAX + STOP.w + 2;
    out.push(S(k.slabOf({ x: M.SP_ANCHOR_X, y, w: end - M.SP_ANCHOR_X, d: 5, r: 1 }, 0, M.SP_CAR.z, P, 3, 0.4), { tone: "mid" }));
    out.push(D([M.SP_ANCHOR_X + 6, end - 3].map((x) => at([x, y + 2.5, M.SP_CAR.z])), { size: 0.4 }));
  }
  out.push(S(k.slabOf(ANCHOR, 0, 14, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([ANCHOR.x + 3, ANCHOR.y + 4, 14]), at([ANCHOR.x + 3, ANCHOR.y + ANCHOR.d - 4, 14])], { size: 0.45 }));
  return out.join("");
}

// The Product Goal: a stop on the rails that the market moves. It carries the tape gauge, so
// the tape always measures the gap to where the goal is now.
function goalStop() {
  const [z0, z1] = M.SP_STOP_Z;
  const out = [];
  out.push(S(k.slabOf({ x: STOP.x + 2, y: STOP.y + STOP.d - 1, w: 2.4, d: 7.6, r: 0.5 }, z0 + 0.2, 1.2, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.lineOnTop([STOP.x + 3.2, STOP.y + STOP.d], [STOP.x + 3.2, STOP.y + STOP.d + 6.4], z0 + 1.4, P), { tone: "hi", free: "end" }));
  out.push(S(k.slabOf(STOP, z0, z1 - z0, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(STOP, z0 + 3, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(STOP, 1.4), z1, P, 3), { tone: "faint" }));
  out.push(D([at([STOP.x + 3.5, STOP.y + 3.2, z1]), at([STOP.x + 3.5, STOP.y + STOP.d - 3.2, z1])], { size: 0.45 }));
  out.push(k.faceTextSvg(k.topMatrix([STOP.x + 4.6, STOP.y + 6.4], z1, P, "y"), "ゴール", { size: 3, tone: "mid", anchor: "middle" }));
  const g = M.SP_GAUGE;
  out.push(S(k.cylinder(g.x, g.y, g.r, g.z, g.top - g.z, P, 40, 0.4), { tone: "hi", crease: "lo", inner: L(k.sideArc(g.x, g.y, g.r, g.z + 1.6, P, 24), { tone: "faint" }) }));
  out.push(L(k.ring(g.x, g.y, g.r - 0.9, g.top, P, 40), { tone: "lo" }));
  const t = k.radialTicks(g.x, g.y, g.r - 1.1, 16, 4, g.top, [0.6, 1.1], P, -Math.PI * 0.8, Math.PI * 1.6);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(S(k.slabOf({ x: M.SP_TAPE_OUT - 0.6, y: g.y - 1.6, w: 1.4, d: 3.2, r: 0.4 }, M.SP_TAPE_Z - 1.2, 2.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(feedbackDrop());
  return out.join("");
}

// The carriage carries what the sprints have delivered: one block per Increment.
function carriage() {
  const x0 = M.SP_X0;
  const plan = { x: x0, y: M.SP_CAR.y, w: M.SP_CAR.w, d: M.SP_CAR.d, r: 3 };
  const top = M.SP_CAR.top;
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 3), M.SP_CAR.z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf({ x: x0 + 37.2, y: plan.y + plan.d - 1, w: 2.8, d: 8, r: 0.6 }, M.SP_CAR.z + 0.2, 1.2, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.lineOnTop([x0 + 38.6, plan.y + plan.d], [x0 + 38.6, plan.y + plan.d + 6.6], M.SP_CAR.z + 1.4, P), { tone: "hi", free: "end" }));
  out.push(S(k.slabOf(plan, M.SP_CAR.z, top - M.SP_CAR.z, P, 5, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 6.4, P, 5), { tone: "faint" }) }));
  const items = [];
  M.SP_BLOCKS.forEach((block, index) => {
    const b = { ...block, x: x0 + block.x };
    const svg = S(k.slabOf(b, top, M.SP_BLOCK_H, P, 3, 0.4), { tone: "hi", crease: "lo" }) + L(k.planOutline(k.insetPlan(b, 1.4), top + M.SP_BLOCK_H, P, 3), { tone: "faint" });
    items.push({ depth: b.x + b.w / 2 + b.y + b.d / 2, svg: `<g data-block="${index}" opacity="0">${svg}</g>` });
  });
  const [px, py] = [x0 + M.SP_POST[0], M.SP_POST[1]];
  const post = [
    S(k.cylinder(px, py, 3.4, top, 1.4, P, 20), { tone: "mid" }),
    S(k.cylinder(px, py, 2.2, top + 1.4, 32 - top - 1.4, P, 20), { tone: "mid", crease: "none" }),
    S(k.cylinder(px, py, 3, 32, 1.4, P, 20), { tone: "mid" }),
  ].join("");
  items.push({ depth: px + py, svg: post });
  items.sort((a, b) => a.depth - b.depth).forEach((item) => out.push(item.svg));
  out.push(D([-14, -6, 6, 14].map((dx) => at([x0 + 20 + dx, plan.y + plan.d - 1.4, top])), { size: 0.4, tone: "lo" }));
  return out.join("");
}

function spool() {
  const [x, y] = M.SP_G;
  const z = M.SP_Z.genTop;
  const out = [];
  out.push(S(k.cylinder(x, y, 9.5, z, 1.6, P, 48), { tone: "mid", inner: L(k.knurl(x, y, 9.5, z + 0.2, z + 1.4, 40, P, 0.2), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 14.5, z + 1.6, 1.4, P, 56, 0.4), { tone: "mid" }));
  const wraps = [30.4, 31.5, 32.6].map((h) => k.sideArc(x, y, M.SP_SPOOL_R, h, P, 48)).join("");
  out.push(S(k.cylinder(x, y, M.SP_SPOOL_R, z + 3, 36.5 - z - 3, P, 64), { tone: "hi", crease: "none", inner: L(wraps, { tone: "lo" }) }));
  out.push(S(k.cylinder(x, y, 14.5, 36.5, 1.5, P, 56, 0.4), { tone: "mid" }));
  out.push(L(k.ring(x, y, 6, 38, P, 32), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 5, 38, 2, P, 28), { tone: "mid" }));
  out.push(L(k.ring(x, y, 2.2, 40, P, 16), { tone: "lo" }));
  out.push(D([at([x, y, 40])], { size: 0.45 }));
  return out.join("");
}

const start = M.sprintState(0, M.planFor(5));
const live0 = (name, svg) => `<g data-part="${name}">${svg}</g>`;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "スクラムを、動くゴールを追うフィードバックループとして表した図。ゴールのストッパーは送りねじで前後に動く。ゴールのストッパーに付いた巻尺ゲージが、キャリッジまでの残りの距離を測る。その値はケーブルで制御箱に送られ、制御箱はモーターを回す。クランクの1回転が1スプリントで、終わりにゼネバ車が1コマ送られる。滑りクラッチ付きの糸巻きは、そのスプリントで実際にできた分だけ、残りの距離を超えない範囲で糸を巻き取る。巻尺が0になるまでスプリントを重ねる。",
  body: [
    plate(),
    ruler(),
    labelPlate(),
    hopperBack(),
    tiles(),
    hopperFront(),
    driveUnit(),
    live0("lock", M.drawLock(start.phi, P, K)),
    hub(),
    live0("floor", M.drawFloorCable(M.SP_GOAL0, P, K)),
    pedestal(),
    leadScrew(),
    live0("knob", M.drawKnobMark(M.SP_GOAL0, P, K)),
    `<g data-part="nut">${nut()}</g>`,
    rails(),
    live0("spring", M.drawSpring(M.SP_X0, P, K)),
    `<g data-part="carriage">${carriage()}</g>`,
    `<g data-part="stop">${goalStop()}</g>`,
    live0("tape", M.drawTape(M.SP_X0, M.SP_GOAL0, P, K)),
    live0("needle", M.drawNeedle(M.SP_GAP0, M.SP_GOAL0, P, K)),
    live0("geneva", M.drawGeneva(start.beta, P, K)),
    live0("arm", M.drawArm(start.phi, P, K)),
    spool(),
    live0("mark", M.drawSpoolMark(0, P, K)),
    live0("cord", M.drawCord(M.SP_X0, P, K)),
  ],
});

const shared = readFileSync(join(HERE, "scrum.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${shared}
const P = ${JSON.stringify(P)};
const K = { solidSvg, extrude, cylinder, lineSvg, ring, dotsSvg, iso, lineOnTop, coil, segment, onTop, wireSvg };
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const lock = part("lock"), geneva = part("geneva"), arm = part("arm"), mark = part("mark"), spring = part("spring"), cord = part("cord"), tape = part("tape"), needle = part("needle"), carriage = part("carriage");
const stop = part("stop"), nut = part("nut"), floor = part("floor"), knob = part("knob");
const blocks = [...svg.querySelectorAll("[data-block]")].sort((a, b) => a.dataset.block - b.dataset.block);
const tiles = [...svg.querySelectorAll("[data-tile]")].sort((a, b) => a.dataset.tile - b.dataset.tile);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const CYCLE = 3.6;
const HOLD = 3.2;
const BACK = 1.9;
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const pct = (gap) => Math.max(0, Math.round((gap / SP_GAP0) * 100));
let seed = 5, plan = planFor(seed), betaBase = 0, travelEnd = 0, goalEnd = SP_GOAL0;
let u = 0, phase = "run", hold = 0, back = 0, speed = 1, fast = false, paused = false;
let frame = 0, last = 0, visible = false;
let shown = { phi: null, beta: null, travel: null, goalX: null };
function sayText(st) {
  if (phase === "goal") return "残り 0% · 動くゴールに到達（" + plan.n + "スプリント）";
  if (phase === "back") return "次のプロダクトゴールを設定";
  const n = st.sprint + 1;
  if (st.engaged) return "スプリント " + n + " · レビュー · 残り " + pct(st.gapBefore) + "% → " + pct(st.gapAfter) + "%";
  const moved = st.goalX - (st.sprint === 0 ? SP_GOAL0 : plan.goals[st.sprint - 1]);
  const drift = Math.abs(moved) < 0.5 ? "" : moved > 0 ? " · ゴールが遠のく" : " · ゴールが近づく";
  return "スプリント " + n + " · 開発中 · 残り " + pct(st.gap) + "%" + drift;
}
function draw() {
  const st = sprintState(u, plan);
  const r = phase === "back" ? ease(clamp01(back)) : 0;
  const travel = phase === "back" ? travelEnd * (1 - r) : st.travel;
  const goalX = phase === "back" ? goalEnd + (SP_GOAL0 - goalEnd) * r : st.goalX;
  const done = phase === "back" ? plan.n : st.done;
  const beta = betaBase + st.beta;
  if (st.phi !== shown.phi) { lock.innerHTML = drawLock(st.phi, P, K); arm.innerHTML = drawArm(st.phi, P, K); }
  if (beta !== shown.beta) geneva.innerHTML = drawGeneva(beta, P, K);
  if (travel !== shown.travel) {
    carriage.setAttribute("transform", translateAlong(P, [travel, 0, 0]));
    spring.innerHTML = drawSpring(SP_X0 + travel, P, K);
    cord.innerHTML = drawCord(SP_X0 + travel, P, K);
    mark.innerHTML = drawSpoolMark(-travel / SP_SPOOL_R, P, K);
  }
  if (goalX !== shown.goalX) {
    const by = translateAlong(P, [goalX - SP_GOAL0, 0, 0]);
    stop.setAttribute("transform", by);
    nut.setAttribute("transform", by);
    floor.innerHTML = drawFloorCable(goalX, P, K);
    knob.innerHTML = drawKnobMark(goalX, P, K);
  }
  if (travel !== shown.travel || goalX !== shown.goalX) {
    tape.innerHTML = drawTape(SP_X0 + travel, goalX, P, K);
    needle.innerHTML = drawNeedle(goalX - SP_FACE0 - travel, goalX, P, K);
  }
  shown = { phi: st.phi, beta, travel, goalX };
  blocks.forEach((el, i) => {
    const e = ease(clamp01(done - i)) * (1 - r);
    el.setAttribute("opacity", e.toFixed(3));
    el.setAttribute("transform", phase === "back" ? "" : translateAlong(P, [0, 0, (1 - e) * 10]));
  });
  tiles.forEach((el, i) => {
    const gone = ease(clamp01(done - (SP_SLOTS - 1 - i))) * (1 - r);
    el.setAttribute("opacity", (1 - gone).toFixed(3));
    el.setAttribute("transform", translateAlong(P, [0, 0, gone * 7]));
  });
  const text = sayText(st);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(pct(goalX - SP_FACE0 - travel)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  speed += ((fast ? 3.2 : 1) - speed) * (1 - Math.exp(-dt / 0.35));
  const step = paused ? 0 : dt * speed;
  if (phase === "run") { u += (step * SP_TURN) / CYCLE; if (u >= plan.goal) { u = plan.goal; phase = "goal"; hold = 0; } }
  else if (phase === "goal") { hold += step; if (hold >= HOLD) { phase = "back"; back = 0; const end = sprintState(u, plan); travelEnd = end.travel; goalEnd = end.goalX; } }
  else {
    back += step / BACK;
    if (back >= 1) { betaBase += sprintState(plan.goal, plan).beta; seed += 1; plan = planFor(seed); phase = "run"; u = 0; }
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
const settleStill = () => { if (still.matches) { phase = "run"; u = SP_TURN * 4 + 1.2; draw(); } else run(); };
still.addEventListener("change", settleStill);
settleStill();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "動くゴールを追うフィードバックループ",
  hint: "ホバーで早送り · Spaceで一時停止",
  readout: "スプリント 1 · 開発中 · 残り 100%",
  keys: [
    { mark: "lit", label: "巻尺：いまのゴールまでの残り（スプリントごとに測るフィードバック信号）" },
    { mark: "raised", label: "ブロック：各スプリントで完成したインクリメント" },
    { mark: "flat", label: "ホッパーの板：プロダクトバックログの項目" },
    { mark: "edge", label: "送りねじ：市場の変化でゴールが前後に動く" },
  ],
  caption:
    "ゴールは止まっていない。後ろの送りねじが市場の変化を表し、開発期間のあいだにゴールのストッパーを前後に動かす。動く量は、プロダクトが成熟するにつれて小さくなる。巻尺ゲージはストッパーに付いているので、測るのはいつも「いま」のゴールまでの残りになる。その値はケーブルで制御箱に送られ、モーターへとつながって輪が一周する。クランクの1回転が1スプリントで、終わりにゼネバ車が1コマ送られる（スプリントレビュー）。滑りクラッチ付きの糸巻きは、そのスプリントで実際にできた分だけを巻き取る。巻き取る量は、レビューで測った残りを超えない。だから計画ではなく測定がキャリッジを導き、巻尺が0を指したときが、動く的を捉えたときになる。目盛りの2本の指針（キャリッジとゴール）の間隔が残りで、この図では5〜9スプリントで届く。届くと次のゴールが設定され、同じ輪がまた回る。",
  body: `<div class="iso-stage" tabindex="0" role="meter" aria-label="ゴールへのフィードバックループ：ゴールまでの残り（%）" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">${svg}</div>`,
});

const file = theme === "light" ? "scrum-sprint-light.html" : "scrum-sprint.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "動くゴールを追うフィードバックループ", theme, body, script: kitScript() + live }).replace('<html lang="en">', '<html lang="ja">'));
console.log("wrote", file);
