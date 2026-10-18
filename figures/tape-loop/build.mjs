import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./tape.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 460;
const PLATE = { x: -70, y: -70, w: 152, d: 152, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const DRUM_R = M.TP_R + 9;
const HUB_R = M.TP_R - 10;
const LABEL = { x: -62, y: 40, w: 28, d: 11, r: 1.2 };
const BASKET = { r: 82, w: 13, d: 9, h: 7 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...M.TP_STATIONS.map((s) => [...M.tpPolar(s.a, M.TP_ARM.post), M.TP_ARM.top + 4]), [...M.tpPolar(M.TP_SPLICE, M.TP_ARM.post), M.TP_ARM.top + 4]],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 45, elevation: 40 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const K = k;
const DEG = Math.PI / 180;
const polar = M.tpPolar;
const depthAt = (a, r) => k.depthOf([...polar(a, r), 0], P);
const rayRect = (a, r0, r1, half) => {
  const [dx, dy] = [Math.cos(a * DEG), Math.sin(a * DEG)];
  const [nx, ny] = [-dy, dx];
  return [
    [dx * r0 - nx * half, dy * r0 - ny * half],
    [dx * r1 - nx * half, dy * r1 - ny * half],
    [dx * r1 + nx * half, dy * r1 + ny * half],
    [dx * r0 + nx * half, dy * r0 + ny * half],
  ];
};

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 20).sort((a, b) => a[0] + a[1] - b[0] - b[1])) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
  [20, 13, 17].forEach((length, i) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + 3.5 + i * 2.8], [LABEL.x + 5 + length, LABEL.y + 3.5 + i * 2.8], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// The drum the tape runs on, with a knurled hub and a motor cap in the middle.
function drum() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -DRUM_R, y: -DRUM_R, w: 2 * DRUM_R, d: 2 * DRUM_R, r: DRUM_R }, 0, 2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(0, 0, DRUM_R, 0, M.TP_Z, P, 96, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, DRUM_R, 4, P, 64) + k.sideArc(0, 0, DRUM_R, M.TP_Z - 4, P, 64), { tone: "faint" }) }));
  const bolts = [];
  for (let i = 0; i < 16; i++) {
    const a = i * 22.5 + 11;
    if (Math.cos(a * DEG) * Math.cos(45 * DEG) + Math.sin(a * DEG) * Math.sin(45 * DEG) > 0.2) bolts.push(at([...polar(a, DRUM_R - 1.2), M.TP_Z]));
  }
  out.push(D(bolts, { size: 0.45, tone: "lo" }));
  out.push(S(k.cylinder(0, 0, HUB_R, M.TP_Z, 3, P, 64, 0.4), { tone: "mid", inner: L(k.knurl(0, 0, HUB_R, M.TP_Z + 0.4, M.TP_Z + 2.6, 96, P, 0.25), { tone: "faint" }) }));
  out.push(S(k.cylinder(0, 0, 9, M.TP_Z + 3, 4, P, 40, 0.4), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 6, M.TP_Z + 7, P, 32), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, 2.2, M.TP_Z + 7, 1.6, P, 16), { tone: "mid" }));
  out.push(D([at([0, 0, M.TP_Z + 8.6])], { size: 0.5 }));
  return out.join("");
}

// Guide pins either side of the tape, every 30 degrees, back to front.
function guidePins() {
  const pins = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + 15;
    for (const r of [M.TP_R - M.TP_W / 2 - 2.4, M.TP_R + M.TP_W / 2 + 2.4]) {
      const [x, y] = polar(a, r);
      pins.push({ depth: depthAt(a, r), svg: S(k.cylinder(x, y, 0.8, M.TP_Z, 2.6, P, 10), { tone: "mid", crease: "none" }) + D([at([x, y, M.TP_Z + 2.6])], { size: 0.35, tone: "lo" }) });
    }
  }
  return pins;
}

// A station: a post outside the drum, an arm over the tape that carries the head block and, nine
// degrees downstream, the punch block. The head's feelers reach the tape; its comb sits on top.
function station(st) {
  const a = st.a;
  const hue = M.TP_HUE[st.kind];
  const out = [];
  const [px, py] = polar(a, M.TP_ARM.post);
  out.push(S(k.cylinder(px, py, 4.2, 0, 1.4, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(px, py, 2.2, 1.4, M.TP_ARM.top - 1.4, P, 16), { tone: "mid", crease: "none", inner: L(k.sideArc(px, py, 2.2, 18, P, 12), { tone: "faint" }) }));
  out.push(D([at([px, py, M.TP_ARM.top])], { size: 0.45 }));
  out.push(S(k.extrude(rayRect(a, M.TP_R - 7, M.TP_ARM.post - 1, 1.8), M.TP_ARM.z, M.TP_ARM.top - M.TP_ARM.z, P), { tone: "mid", crease: "none" }));
  out.push(S(k.extrude(M.tpSector(a + M.TP_PUNCH_OFF / 2, M.TP_PUNCH_OFF / 2 + 3, M.TP_R - 7, M.TP_R + 7, 8), M.TP_ARM.z, M.TP_ARM.top - M.TP_ARM.z, P, { bevel: 0.4 }), { tone: "mid" }));
  out.push(D([at([...polar(a, M.TP_R), M.TP_ARM.top]), at([...polar(a + M.TP_PUNCH_OFF, M.TP_R), M.TP_ARM.top])], { size: 0.4 }));
  // Head block hung from the arm.
  const [hx, hy] = polar(a, M.TP_R);
  out.push(S(k.cylinder(hx, hy, 1.4, M.TP_HEAD.top, M.TP_ARM.z - M.TP_HEAD.top, P, 12), { tone: "mid", crease: "none" }));
  const H = M.TP_HEAD;
  out.push(S(k.extrude(M.tpSector(a, H.half, H.rIn, H.rOut, 6), H.z, H.top - H.z, P, { bevel: 0.4 }), { tone: "mid", inner: L(k.onTop(M.tpSector(a, H.half - 1, H.rIn + 1.2, H.rOut - 1.2, 6), H.z + 1.6, P, true), { tone: hue }) }));
  // Feelers from the block down to the tape.
  M.TP_COLS.forEach((c) => {
    const [fx, fy] = polar(a, M.TP_R + c);
    out.push(S(k.cylinder(fx, fy, 0.45, M.TP_Z + 0.6, H.z - M.TP_Z - 0.6, P, 8), { tone: "mid", crease: "none" }));
  });
  // Punch block downstream.
  const [qx, qy] = polar(a + M.TP_PUNCH_OFF, M.TP_R);
  const Q = M.TP_PUNCH;
  out.push(S(k.cylinder(qx, qy, 1.4, Q.top, M.TP_ARM.z - Q.top, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.extrude(M.tpSector(a + M.TP_PUNCH_OFF, Q.half, Q.rIn, Q.rOut, 4), Q.z, Q.top - Q.z, P, { bevel: 0.3 }), { tone: "mid" }));
  out.push(L(k.onTop(M.tpSector(a + M.TP_PUNCH_OFF, Q.half - 0.8, Q.rIn + 1, Q.rOut - 1, 4), Q.top, P, true), { tone: "faint" }));
  return out.join("");
}

// The splicer at the front: a post and arm like a head, a blade block, and a chute to the basket.
function splicer() {
  const a = M.TP_SPLICE;
  const out = [];
  const [px, py] = polar(a, M.TP_ARM.post);
  out.push(S(k.cylinder(px, py, 4.2, 0, 1.4, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(px, py, 2.2, 1.4, M.TP_ARM.top - 1.4, P, 16), { tone: "mid", crease: "none", inner: L(k.sideArc(px, py, 2.2, 18, P, 12), { tone: "faint" }) }));
  out.push(D([at([px, py, M.TP_ARM.top])], { size: 0.45 }));
  out.push(S(k.extrude(rayRect(a, M.TP_R - 7, M.TP_ARM.post - 1, 1.8), M.TP_ARM.z, M.TP_ARM.top - M.TP_ARM.z, P), { tone: "mid", crease: "none" }));
  out.push(S(k.extrude(M.tpSector(a, 5, M.TP_R - 7, M.TP_R + 7, 6), M.TP_ARM.z, M.TP_ARM.top - M.TP_ARM.z, P, { bevel: 0.4 }), { tone: "mid" }));
  const H = M.TP_HEAD;
  const [hx, hy] = polar(a, M.TP_R);
  out.push(S(k.cylinder(hx, hy, 1.4, H.top, M.TP_ARM.z - H.top, P, 12), { tone: "mid", crease: "none" }));
  // Two jaws either side of the blade slot.
  for (const side of [-1, 1]) {
    out.push(S(k.extrude(M.tpSector(a + side * 2.4, 1.6, H.rIn, H.rOut, 3), H.z, H.top - H.z, P, { bevel: 0.3 }), { tone: "mid" }));
  }
  out.push(L(k.onTop(M.tpSector(a, 4, H.rIn + 1, H.rOut - 1, 4), H.top, P, true), { tone: "faint" }));
  // Chute: an inclined plate from beside the tape down to the basket.
  const c0 = M.TP_R + 9.4;
  const c1 = BASKET.r - BASKET.w / 2 + 1;
  const ca = M.TP_CHUTE;
  // A lip block beside the tape that the chute hangs from.
  out.push(S(k.extrude(M.tpSector(ca, 3.4, M.TP_R + 6.2, M.TP_R + 9.6, 4), M.TP_Z, 3, P, { bevel: 0.3 }), { tone: "mid" }));
  out.push(D([at([...polar(ca, M.TP_R + 7.9), M.TP_Z + 3])], { size: 0.4 }));
  const quad = [[...polar(ca - 3, c0), M.TP_Z + 2.6], [...polar(ca + 3, c0), M.TP_Z + 2.6], [...polar(ca + 3, c1), BASKET.h + 1], [...polar(ca - 3, c1), BASKET.h + 1]].map(at);
  const d = "M" + quad.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
  out.push(`<g class="iso-solid"><path class="iso-fill" d="${d}"/><path class="iso-shade" data-shade="2" d="${d}"/><path class="iso-line iso-edge" data-tone="mid" d="${d}"/></g>`);
  // Basket.
  const [bx, by] = polar(M.TP_CHUTE, BASKET.r);
  const plan = { x: bx - BASKET.w / 2, y: by - BASKET.d / 2, w: BASKET.w, d: BASKET.d, r: 1 };
  out.push(S(k.slabOf(plan, 0, BASKET.h, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, 2, P, 3), { tone: "faint" }) }));
  out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(k.ringOf(k.insetPlan(plan, 1.2), 3), BASKET.h, P, true)}"/>`);
  out.push(L(k.planOutline(k.insetPlan(plan, 1.2), BASKET.h, P, 3), { tone: "lo" }));
  return out.join("");
}

const live0 = (name, svg) => `<g data-part="${name}">${svg}</g>`;

// Rest state: a loop two-thirds full.
let seed0 = 5;
const rand0 = () => { seed0 ^= seed0 << 13; seed0 >>>= 0; seed0 ^= seed0 >>> 17; seed0 ^= seed0 << 5; seed0 >>>= 0; return seed0 / 4294967296; };
const ROWS0 = Array.from({ length: M.TP_SLOTS }, (_, i) => {
  if (rand0() > 0.66) return null;
  const kind = rand0() < 0.4 ? "H" : "A";
  return { kind, holes: M.tpPattern(M.tpComb(kind), rand0), ref: rand0() < 0.7 ? i - 1 : -1, answered: rand0() < 0.6, born: -rand0() * 360 };
});

const stations = M.TP_STATIONS.map((st) => ({ depth: depthAt(st.a, M.TP_R + 4), svg: station(st) + live0(`head${st.a}`, M.tpHeadLive(st, M.tpComb(st.kind), 0, false, P, K)) }));
stations.push({ depth: depthAt(M.TP_SPLICE, M.TP_R + 4), svg: splicer() + live0("blade", M.tpBlade(0, P, K)) });
const pins = guidePins();
const overTape = [...stations, ...pins].sort((a, b) => a.depth - b.depth).map((it) => it.svg).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "AIエージェントを含む社会システムを、紙テープの環状回路として表した図。ドラムの上を穴あき紙テープが一本の閉じた環になって回る。テープがコードで、一行の穴が一回のコミュニケーション。台のまわりに四つのヘッドがあり、青が人、緑がAI。ヘッドは触針で通り過ぎる行を読み、少し下流に応答の行を打つ。応答の行には元の行を指す切り欠きがあり、元の行は誰かに応答されたときに初めて穴が大きく灯る。手前のスプライサーは、一周しても応答されなかった行を切り落として籠へ落とす。ヘッドどうしは触れず、触れるのはテープだけ。",
  body: [plate(), drum(), live0("tape", M.tpTape(ROWS0, 0, P, K)), overTape, live0("snips", ""), live0("basket", M.tpBasketFill(0, P, K))],
});

const shared = readFileSync(join(HERE, "tape.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${shared}
const P = ${JSON.stringify(P)};
const K = { solidSvg, extrude, cylinder, lineSvg, ring, dotsSvg, iso, lineOnTop, segment, onTop };
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const G = { tape: part("tape"), blade: part("blade"), snips: part("snips"), basket: part("basket"), heads: TP_STATIONS.map((st) => part("head" + st.a)) };
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let seed = 17;
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
let rows = ${JSON.stringify(ROWS0)};
let theta = 0, speed = 1, fast = false, frame = 0, last = 0, visible = false;
let humanOn = true, cutT = 0, cut = 0, cutH = 0, cutA = 0, punched = 0, answeredCount = 0;
let snips = [];
const heads = TP_STATIONS.map((st) => ({ st, comb: tpComb(st.kind), drop: 0, lastSlot: -1, reading: 0 }));
let spliceLast = -1;
// Which slot is under angle a right now.
const slotUnder = (a) => { const k = Math.round(tpWrap(a - theta) / TP_PITCH); return ((k % TP_SLOTS) + TP_SLOTS) % TP_SLOTS; };
function say() {
  let h = 0, a = 0, ans = 0, n = 0;
  rows.forEach((r) => { if (!r) return; n++; if (r.kind === "H") h++; else a++; if (r.answered) ans++; });
  const rate = n ? Math.round((ans / n) * 100) : 0;
  const human = humanOn ? "" : "人停止 · ";
  return human + "環 " + n + "（人 " + h + " · AI " + a + "）· 応答 " + rate + "% · 切り落とし " + cut;
}
function read(head) {
  const k = slotUnder(head.st.a);
  if (k === head.lastSlot) return;
  head.lastSlot = k;
  if (head.st.kind === "H" && !humanOn) return;
  const row = rows[k];
  if (!row || !tpReads(head.comb, row.holes) || rand() > 0.62) return;
  // Answer: punch into the nearest blank slot downstream.
  for (let d = 2; d <= TP_REACH; d++) {
    const j = (k + d) % TP_SLOTS;
    if (rows[j]) continue;
    rows[j] = { kind: head.st.kind, holes: tpPattern(head.comb, rand), ref: k, answered: false, born: theta };
    if (!row.answered) answeredCount++;
    row.answered = true;
    // Premises follow decisions: the comb of whoever wrote the answered row learns the answer's columns.
    const owner = heads.find((h) => h.st.kind === row.kind);
    if (owner) owner.comb = tpLearn(owner.comb, rows[j].holes);
    head.drop = 1;
    head.reading = 0.4;
    punched++;
    return;
  }
}
function splice() {
  const k = slotUnder(TP_SPLICE);
  if (k === spliceLast) return;
  spliceLast = k;
  const row = rows[k];
  if (!row) return;
  const loops = (theta - row.born) / 360;
  if ((!row.answered && loops >= TP_GRACE) || loops >= TP_KEEP) {
    rows[k] = null;
    cut++;
    if (row.kind === "H") cutH++; else cutA++;
    cutT = 0.5;
    snips.push({ kind: row.kind, side: rand(), t: 0 });
  }
}
function draw() {
  G.tape.innerHTML = tpTape(rows, theta, P, K);
  heads.forEach((h, i) => { G.heads[i].innerHTML = tpHeadLive(h.st, h.comb, h.drop * TP_PUNCH.drop, h.reading > 0, P, K); });
  G.blade.innerHTML = tpBlade(cutT, P, K);
  G.snips.innerHTML = tpSnippets(snips, P, K);
  G.basket.innerHTML = tpBasketFill(cut, P, K);
  const text = say();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  speed += ((fast ? 3 : 1) - speed) * (1 - Math.exp(-dt / 0.35));
  const step = dt * speed;
  theta += step * TP_SPEED;
  heads.forEach((h) => { read(h); h.drop = Math.max(0, h.drop - step / 0.25); h.reading = Math.max(0, h.reading - step); });
  splice();
  cutT = Math.max(0, cutT - step);
  snips = snips.map((s) => ({ ...s, t: s.t + step / 1.1 })).filter((s) => s.t < 1);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const toggle = () => { humanOn = !humanOn; draw(); run(); };
stage.addEventListener("pointerenter", () => { fast = true; });
stage.addEventListener("pointerleave", () => { fast = false; });
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggle(); } });
draw();
run();
`;

const PAGE_CSS = `<style>
.tp-dot[data-hue="blue"] circle{fill:var(--anatomy-blue);opacity:1}
.tp-dot[data-hue="green"] circle{fill:var(--anatomy-green);opacity:1}
.tp-dot[data-dim] circle{opacity:.38}
</style>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "テープを回る接続",
  hint: "ホバーで早送り · クリックで人を止める",
  readout: "環 0（人 0 · AI 0）· 応答 0% · 切り落とし 0",
  keys: [
    { mark: "blue", label: "青：人のヘッドと、人を宛先とする行" },
    { mark: "green", label: "緑：AIのヘッドと、AIを宛先とする行" },
    { mark: "lit", label: "灯る穴：あとの行に応答された行。理解は次の接続で初めて観察される" },
    { mark: "edge", label: "内側の切り欠き：この行が応答した元の行がある印" },
  ],
  caption:
    "ドラムの上を、穴あき紙テープが一本の閉じた環になって回る。テープがコードで、媒体にすぎない。一行の穴が一回のコミュニケーションで、打たれた瞬間に過去になる。台のまわりのヘッドは、触針で通り過ぎる行を読み、自分の櫛（上の歯）に合う列の穴があれば、少し下流の空いた場所に応答の行を打つ。応答の行には元の行を指す切り欠きが入り、元の行はそのときに初めて穴が大きく灯る。理解されたかどうかは、あとの行がつながったときにしか分からない。ヘッドどうしは一度も触れない。人のヘッドもAIのヘッドも、テープを読みテープを打つことでしか系に関与できず、ヘッドの中身は描かれていない。櫛は決定前提で、自分の行に応答が付くたびに、応答に使われた列へ歯が作り直される。手前のスプライサーは、一周しても応答されなかった行と、三周した行を切り落とし、籠へ落とす。環に残るのは、いま接続されうる行だけ。クリックで人のヘッドを止めると、人を宛先とする行が打たれなくなり、人の列でしか応答されない行は切り落とされて、環はAIの列だけで回り続ける。止まるのではなく、宛先の構造が変わる。",
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="テープを回る接続">${svg}</div>`,
});

const file = theme === "light" ? "tape-loop-light.html" : "tape-loop.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "テープを回る接続", theme, body: PAGE_CSS + body, script: kitScript() + live }).replace('<html lang="en">', '<html lang="ja">'));
console.log("wrote", file);
