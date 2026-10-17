import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./knit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 480;
const PLATE = { x: -74, y: -74, w: 148, d: 148, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;
const LEG_R = 36;
const BED = { r: 42, z: 58, top: 62 };
const LABEL = { x: -64, y: 46, w: 32, d: 13, r: 1.2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, M.KN_MAST.top + 6], [...M.knGuide(0).slice(0, 2), M.KN_MAST.top + 2], [...M.knGuide(3).slice(0, 2), M.KN_MAST.top + 2]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 45, elevation: 30 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const K = k;
const DEG = Math.PI / 180;
const polar = M.knPolar;
// A rectangle in plan along the ray at angle a, from r0 to r1, `half` wide either side.
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
const facingDots = (r, z, count, phase = 0) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (360 * i) / count;
    if (M.knFacing(a, P) > 0.2) out.push(at([...polar(a, r), z]));
  }
  return out;
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
  [20, 13, 17].forEach((length, i) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + 4 + i * 3], [LABEL.x + 5 + length, LABEL.y + 4 + i * 3], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

function leg(a) {
  const [x, y] = polar(a, LEG_R);
  return [
    S(k.cylinder(x, y, 5, 0, 1.6, P, 24), { tone: "lo" }),
    S(k.cylinder(x, y, 2.6, 1.6, BED.z - 1.6, P, 18), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 2.6, 30, P, 12), { tone: "faint" }) }),
    D([at([...polar(a + 90, 3.6).map((v, i) => v + [x, y][i]), 1.6]), at([...polar(a - 90, 3.6).map((v, i) => v + [x, y][i]), 1.6])], { size: 0.4 }),
  ].join("");
}

function tub() {
  const t = M.KN_TUB;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -t.r, y: -t.r, w: 2 * t.r, d: 2 * t.r, r: t.r }, 0, 2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(0, 0, t.r, 0, t.top, P, 64, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, t.r, 3, P, 40), { tone: "faint" }) }));
  out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(k.circleRing(0, 0, t.r - 1.8, 64), t.top, P, true)}"/>`);
  out.push(L(k.ring(0, 0, t.r - 1.8, t.top, P, 64), { tone: "lo" }));
  return out.join("");
}

function bed() {
  const out = [S(k.cylinder(0, 0, BED.r, BED.z, BED.top - BED.z, P, 72, 0.6), { tone: "mid" })];
  out.push(L(k.ring(0, 0, BED.r - 4, BED.top, P, 64), { tone: "faint" }));
  out.push(D(facingDots(BED.r - 2, BED.top, 12, 15), { size: 0.45 }));
  return out.join("");
}

function cylinder() {
  const c = M.KN_CYL;
  const out = [S(k.cylinder(0, 0, c.r, c.z, c.top - c.z, P, 72, 0.4), { tone: "mid", inner: L(k.sideArc(0, 0, c.r, c.z + 3, P, 48), { tone: "faint" }) })];
  out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(k.circleRing(0, 0, c.hole, 56), c.top, P, true)}"/>`);
  out.push(L(k.ring(0, 0, c.hole, c.top, P, 56), { tone: "lo" }));
  const slots = [];
  for (let i = 0; i < M.KN_N; i++) {
    const a = M.knNeedleDeg(i);
    slots.push(k.lineOnTop(polar(a, c.hole + 0.4), polar(a, c.r), c.top, P));
  }
  out.push(L(slots.join(""), { tone: "faint" }));
  return out.join("");
}

// The mast at the back: a post on the bed, a shelf of spools, a crossbar of guide eyes.
function mast() {
  const m = M.KN_MAST;
  const [x, y] = polar(m.a, m.r);
  const out = [];
  out.push(S(k.cylinder(x, y, 3.4, BED.top, 2, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 1.8, BED.top + 2, M.KN_GATE.z - 2 - BED.top - 2, P, 16), { tone: "mid", crease: "none" }));
  const shelf = M.knSector(m.a, 22, m.r - 3, m.r + 9, 6);
  out.push(S(k.extrude(shelf, M.KN_SPOOL_Z - 2, 2, P, { bevel: 0.4 }), { tone: "mid" }));
  M.KN_FEEDS.forEach((_, i) => {
    const [sx, sy] = M.knSpool(i);
    const r = i === 0 ? 5 : 3.4;
    const z = M.KN_SPOOL_Z;
    out.push(S(k.cylinder(sx, sy, r + 1.2, z, 1, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(sx, sy, r, z + 1, 8, P, 28), { tone: i === 0 ? "hi" : "mid", crease: "none", inner: L([2.6, 4.2, 5.8, 7.4].map((h) => k.sideArc(sx, sy, r, z + h, P, 16)).join(""), { tone: "faint" }) }));
    out.push(S(k.cylinder(sx, sy, r + 1.2, z + 9, 1, P, 24), { tone: "mid" }));
    out.push(D([at([sx, sy, z + 10])], { size: 0.45, tone: "lo" }));
  });
  out.push(S(k.cylinder(x, y, 2.6, M.KN_GATE.z - 2, 2, P, 16), { tone: "mid" }));
  // The card reader's cable: along the bed rim to the foot of the mast, then up inside it to the gate.
  const route = [[...polar(M.KN_CARD.a, 45), M.KN_CARD.z + 3.6]];
  for (let a = M.KN_CARD.a - 2; a >= m.a + 8; a -= 6) route.push([...polar(a, 39.6), BED.top + 0.5]);
  route.push([...polar(m.a + 4, 39.6), BED.top + 0.5]);
  const pts = route.map(at);
  out.push(k.wireSvg(pts[0], pts[pts.length - 1], { via: pts.slice(1, -1), tone: "mid", size: 0.8 }));
  return out.join("");
}

// The pattern-card unit on the right: a post and table, a reader at the inner end, a punch at the outer end.
function cardTable() {
  const c = M.KN_CARD;
  const out = [];
  const [px, py] = polar(c.a, 66);
  out.push(S(k.cylinder(px, py, 5, 0, 1.6, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(px, py, 2.4, 1.6, c.z - 2.1 - 1.6, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.extrude(rayRect(c.a, 43.4, 88, 8.4), c.z - 2.1, 2.1, P, { bevel: 0.4 }), { tone: "mid" }));
  out.push(L(k.onTop(rayRect(c.a, 45, 86.4, 7.4), c.z, P, true), { tone: "faint" }));
  out.push(S(k.extrude(rayRect(c.a, 43.6, 46.4, 6.6), c.z, 3.6, P), { tone: "mid" }));
  out.push(D([at([...polar(c.a, 45), c.z + 3.6])], { size: 0.45 }));
  return out.join("");
}

function punch() {
  const c = M.KN_CARD;
  const out = [];
  out.push(S(k.extrude(rayRect(c.a, 80, 87.4, 7.6), c.z, 9, P, { bevel: 0.5 }), { tone: "mid" }));
  out.push(L(k.onTop(rayRect(c.a, 81.4, 86, 6.2), c.z + 9, P, true), { tone: "faint" }));
  const [hx, hy] = polar(c.a, 83.7);
  out.push(S(k.cylinder(hx, hy, 1.4, c.z + 9, 5, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(hx, hy, 2.6, c.z + 14, 1.6, P, 20), { tone: "mid" }));
  return out.join("");
}

const live0 = (name, svg) => `<g data-part="${name}">${svg}</g>`;
const CARDS0 = [
  ["H", "A", "H", "H", "A", "H", "A", "H"],
  ["H", "A", "H", "A", "A", "H", "A", "H"],
  ["A", "H", "H", "A", "A", "H", "H", "H"],
  ["A", "H", "A", "A", "H", "H", "H", "A"],
  ["H", "H", "A", "A", "H", "A", "H", "A"],
];
const ROWS0 = Array.from({ length: 18 }, (_, r) => Array.from({ length: M.KN_N }, (_, i) => CARDS0[r % 5][Math.floor(i / 3)]));
const FEEDS0 = [true, true, true, true];
const CAM0 = 100;
const camBack = M.knFacing(CAM0, P) < 0;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "AIエージェントを含む社会システムの自己産出を、円筒形の靴下編み機として表した図。編み目（決定）が型紙カード（決定前提）を作り、カードがマスト上の糸のゲート（境界）を開け閉めし、ゲートを通った糸だけが新しい編み目になる。カムが一周するあいだに、針が一本ずつ持ち上がって糸を取り、前の段の輪に新しい輪を引き抜く。編み目は前の段の目を次の段が引き抜いたときにだけ留まる。糸は外の糸巻きから差し出される。人の糸巻きが一つ、AIの糸巻きが三つある。どの糸を取るかは型紙カードが決め、取られなかったAIの糸は切れて消える。型紙カードは編み上がった段から打ち抜かれる。編み地は下の桶にたまり続ける。",
  body: [
    plate(),
    leg(225),
    tub(),
    live0("fabric", M.knFabric(ROWS0, 0, P, K)),
    leg(135),
    leg(315),
    leg(45),
    bed(),
    mast(),
    live0("yarnsIn", M.knYarnsIn(FEEDS0, P, K)),
    live0("gate", M.knGate([1, 0, 0, 0], P, K)),
    cardTable(),
    live0("cards", M.knCards(CARDS0, 0, P, K)),
    punch(),
    live0("carBack", camBack ? M.knCarriage(CAM0, P, K) : ""),
    cylinder(),
    live0("needles", M.knNeedles(CAM0, -1, P, K, "front")),
    live0("carFront", camBack ? "" : M.knCarriage(CAM0, P, K)),
    live0("tips", M.knNeedles(CAM0, -1, P, K, "tips", camBack ? M.KN_CYL.top : M.KN_CAR.top)),
    live0("yarns", M.knYarns(CAM0, FEEDS0, [1, 0, 0, 0], -1, P, K)),
    live0("snips", ""),
  ],
});

const shared = readFileSync(join(HERE, "knit.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${shared}
const P = ${JSON.stringify(P)};
const K = { solidSvg, extrude, cylinder, lineSvg, ring, dotsSvg, iso, lineOnTop, segment, onTop, knurl, sideArc };
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const G = { yarnsIn: part("yarnsIn"), gate: part("gate"), fabric: part("fabric"), cards: part("cards"), carBack: part("carBack"), needles: part("needles"), carFront: part("carFront"), tips: part("tips"), yarns: part("yarns"), snips: part("snips") };
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const ROUND = 6.4; // seconds per turn of the cam
const STEP = 360 / KN_N;
let cards = ${JSON.stringify(CARDS0)};
let rows = ${JSON.stringify(ROWS0)};
let current = new Array(KN_N).fill(null);
let streak = new Array(KN_GROUPS).fill(0);
let misses = new Array(KN_N).fill(0);
let feeds = [true, true, true, true];
let cam = ${CAM0}, next = Math.ceil(${CAM0} / STEP), shift = 0, take = -1, takeT = 0, stopped = false, droppedAt = -1;
let conn = 0, offered = 0, aiConn = 0, gateCut = 0, eyeCut = 0;
let gate = [1, 0, 0, 0];
let snips = [];
let speed = 1, fast = false, frame = 0, last = 0, visible = false, seed = 7;
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
for (let i = 0; i < next; i++) current[i] = rows[0][i];
const fmt = (n) => n.toLocaleString("ja-JP");
function say() {
  if (stopped) return "目が落ちた · 接続が途切れて系が止まった（クリックで再開）";
  const pct = offered ? Math.round((aiConn / offered) * 100) : 0;
  if (!feeds[0]) {
    const risk = misses.filter((m) => m > 0).length;
    return "人の糸なし · 人を要する目が編めない（落ちかけ " + risk + " 目）";
  }
  const out = offered ? Math.round((gateCut / offered) * 100) : 0;
  return "接続 " + fmt(conn) + " · AIの候補 " + fmt(offered) + " 件：境界の外 " + out + "% · 接続 " + pct + "%";
}
function stitch(i) {
  const need = cards[0][Math.floor(i / 3)];
  const deg = knNeedleDeg(i);
  const [ex, ey] = knPolar(cam, KN_EYE.r);
  const cutAt = (at) => snips.push({ at, tilt: rand() * Math.PI * 2, t: 0 });
  offered += 3;
  if (need === "H") {
    // The boundary is shut to the AI yarns: all three stop outside the gate.
    for (let k = 1; k < 4; k++) { const [gx, gy] = knGuide(k); cutAt([gx, gy, KN_GATE.z - 1]); }
    gateCut += 3;
    if (feeds[0]) { current[i] = "H"; misses[i] = 0; conn++; take = 0; }
    else { current[i] = "x"; misses[i]++; take = -1; if (misses[i] >= KN_MISS_DROP && !stopped) { stopped = true; droppedAt = i; } }
  } else {
    // The boundary is open to the AI yarns: all three come in, the stitch takes one.
    for (let c = 0; c < 2; c++) cutAt([ex, ey, KN_EYE.z]);
    eyeCut += 2;
    current[i] = "A"; misses[i] = 0; conn++; aiConn++; take = 1;
  }
  takeT = 0.5;
}
function endRound() {
  const done = current.map((g) => g || "x");
  for (let g = 0; g < KN_GROUPS; g++) {
    const held = done.slice(g * 3, g * 3 + 3).every((s) => s === cards[0][g]);
    streak[g] = held ? streak[g] + 1 : 0;
  }
  const punched = knNextCard(cards[cards.length - 1], streak);
  for (let g = 0; g < KN_GROUPS; g++) if (punched[g] !== cards[cards.length - 1][g]) streak[g] = 0;
  rows = [done, ...rows].slice(0, 22);
  cards = [...cards.slice(1), punched];
  current = new Array(KN_N).fill(null);
  shift = 1;
}
function draw() {
  const back = knFacing(cam, P) < 0;
  const car = knCarriage(cam, P, K);
  G.carBack.innerHTML = back ? car : "";
  G.carFront.innerHTML = back ? "" : car;
  const lit = Math.round(cam / STEP) % KN_N;
  G.needles.innerHTML = knNeedles(cam, lit, P, K, "front");
  G.tips.innerHTML = knNeedles(cam, lit, P, K, "tips", back ? KN_CYL.top : KN_CAR.top);
  G.yarnsIn.innerHTML = knYarnsIn(feeds, P, K);
  G.gate.innerHTML = knGate(gate, P, K);
  G.yarns.innerHTML = knYarns(cam, feeds, gate, takeT > 0 ? take : -1, P, K);
  G.snips.innerHTML = knSnippets(snips, P, K);
  const shown = [current.map((g, i) => g || (i < next ? "x" : null)).map((g) => g || "-"), ...rows];
  G.fabric.innerHTML = knFabric(shown.map((r) => r.map((g) => (g === "-" ? null : g))), (cam % 360) / 360, P, K);
  G.cards.innerHTML = knCards(cards, shift * shift * (3 - 2 * shift), P, K);
  const text = say();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  speed += ((fast ? 3 : 1) - speed) * (1 - Math.exp(-dt / 0.35));
  const step = dt * speed;
  if (!stopped) {
    cam += (step * 360) / ROUND;
    while (next * STEP <= cam) {
      const i = next % KN_N;
      if (i === 0 && next > 0) endRound();
      stitch(i);
      next++;
    }
  }
  takeT = Math.max(0, takeT - step);
  // The card at the reader sets the gate for the group of the needle coming up.
  const want = cards[0][Math.floor((next % KN_N) / 3)] === "H" ? [1, 0, 0, 0] : [0, 1, 1, 1];
  gate = gate.map((v, k) => v + (want[k] - v) * (1 - Math.exp(-dt / 0.12)));
  shift = Math.max(0, shift - step / 0.7);
  snips = snips.map((s) => ({ ...s, t: s.t + step / 0.9 })).filter((s) => s.t < 1);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const toggle = () => {
  if (stopped) { stopped = false; feeds[0] = true; misses.fill(0); }
  else feeds[0] = !feeds[0];
  draw();
  run();
};
stage.addEventListener("pointerenter", () => { fast = true; });
stage.addEventListener("pointerleave", () => { fast = false; });
stage.addEventListener("click", toggle);
stage.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggle(); } });
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "接続で自分を産出する社会システム",
  hint: "ホバーで早送り · クリックで人の糸を止める",
  readout: "接続 0 · AIの候補 0 件のうち 0% が接続",
  keys: [
    { mark: "lit", label: "① 決定：いま生まれている一目。次の段に引き抜かれて初めて留まる" },
    { mark: "raised", label: "② 決定前提：型紙カード。編み上がった段から打ち抜かれる" },
    { mark: "edge", label: "③ 境界：マスト上の糸のゲート。カードが口の開け閉めを決める" },
    { mark: "flat", label: "糸：外から差し出される伝達の候補。太いのは人、細いのはAIを宛先とする糸で、意識の有無の区別ではない" },
  ],
  caption:
    "この機械は三つの項の輪だけで回る。① 決定（編み目）が ② 決定前提（型紙カード）を作り、② が ③ 境界（糸のゲート）を開け閉めし、③ を通った糸だけが ① の新しい目になる。決定を産出する機構（ゲート）は、カードを介して決定自身が作っている。外から機構を据え付ける者はいない。カムが針を一本持ち上げた瞬間に一目が生まれ、すぐに過去になる。その目が理解されたかどうかは、次の段の輪がそこを引き抜いたときにだけ分かる。理解は合意ではなく、接続の結果で、芯にあるのは「どの糸が来るか分からない」という二重の偶発性のほうだ。人とAIは輪の外にいて、糸巻きから糸を差し出すだけ。機械が区別するのは意識の有無ではなく、どの宛先の糸かという点だけ。カードが人の糸を求める組では、ゲートはAIの口を閉じ、AIの三本は境界の外で切れる。AIの糸を許す組では三本とも中に入り、針が一本を取って残りは中で切れる。カードは編み上がった段から打ち抜かれ、四段あとにゲートを動かす。人の糸で二段続けて留まった組はAIへ任され、AIが三段続けた組は人へ戻る。クリックで人の糸を止めると、人を要する目が編めずに目が落ち、輪が途切れて機械は止まる。編み地は輪が回った跡として桶にたまる。コードがそうであるように、産出物ではなく、次の目をつなぐための媒体と記憶だ。",
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="接続で自分を産出する社会システム">${svg}</div>`,
});

const file = theme === "light" ? "social-autopoiesis-light.html" : "social-autopoiesis.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "接続で自分を産出する社会システム", theme, body, script: kitScript() + live }).replace('<html lang="en">', '<html lang="ja">'));
console.log("wrote", file);
