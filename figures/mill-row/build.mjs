import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./mill.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 680;
const HEIGHT = 420;
const PLATE = { x: -110, y: -50, w: 220, d: 64, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const LABEL = { x: 84, y: 2, w: 22, d: 9, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...M.ML_X.map((x) => [x + M.ML_PULLEY.x, M.ML_PULLEY.y, M.ML_PULLEY.z + 3]), [M.ML_LEAT.x0, M.ML_LEAT.y0, M.ML_LEAT.top], [M.ML_LEAT.x1, M.ML_LEAT.y0, M.ML_LEAT.top]],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 62, elevation: 30 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const K = k;
const FX = (o) => G.frameAlong(o, [1, 0, 0]);
const VIEW = G.viewOf(P);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 18).sort((a, b) => a[0] + a[1] - b[0] - b[1])) {
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H, 1.6, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.8, P, 3), { tone: "faint" }));
  [16, 10, 13].forEach((length, i) => out.push(L(k.lineOnTop([LABEL.x + 4, LABEL.y + 3 + i * 2.4], [LABEL.x + 4 + length, LABEL.y + 3 + i * 2.4], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([LABEL.x + 2.2, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.2, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.4 }));
  // Tail pits under each wheel, cut into the plate.
  for (const x0 of M.ML_X) {
    const pit = { x: x0 - M.ML_PIT.w / 2, y: M.ML_PIT.y0, w: M.ML_PIT.w, d: M.ML_PIT.y1 - M.ML_PIT.y0, r: 1 };
    out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(k.ringOf(pit, 3), 0, P, true)}"/>`);
    out.push(L(k.planOutline(pit, 0, P, 3), { tone: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(pit, 1.2), 0, P, 3), { tone: "faint" }));
  }
  return out.join("");
}

// The leat: a long trough on piers along the back, open at the top.
function leat() {
  const Lt = M.ML_LEAT;
  const out = [];
  for (let x = Lt.x0 + 10; x <= Lt.x1 - 8; x += 38) {
    out.push(S(k.cylinder(x, (Lt.y0 + Lt.y1) / 2, 3, 0, 1.4, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, (Lt.y0 + Lt.y1) / 2, 1.8, 1.4, Lt.bed - 1.4 - 1.2, P, 14), { tone: "mid", crease: "none" }));
  }
  const bed = { x: Lt.x0, y: Lt.y0, w: Lt.x1 - Lt.x0, d: Lt.y1 - Lt.y0, r: 1 };
  out.push(S(k.slabOf(bed, Lt.bed - 1.2, 1.2, P, 3), { tone: "mid", crease: "none" }));
  out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(k.ringOf(k.insetPlan(bed, 1), 2), Lt.bed, P, true)}"/>`);
  out.push(S(k.slabOf({ x: Lt.x0, y: Lt.y0, w: Lt.x1 - Lt.x0, d: 1, r: 0.3 }, Lt.bed, Lt.top - Lt.bed, P, 2, 0.3), { tone: "mid", crease: "none" }));
  return { back: out.join(""), front: S(k.slabOf({ x: Lt.x0, y: Lt.y1 - 1, w: Lt.x1 - Lt.x0, d: 1, r: 0.3 }, Lt.bed, Lt.top - Lt.bed, P, 2, 0.3), { tone: "mid", crease: "none" }) + L([Lt.x0 + 12, Lt.x1 - 12].map((x) => k.lineOnTop([x, Lt.y1 - 1], [x, Lt.y1], Lt.top, P)).join(""), { tone: "faint" }) };
}

// One mill. Static parts, with named live groups inside at their painter's slots.
function mill(x0, index, unit) {
  const F = M.ML_FLUME;
  const W = M.ML_WHEEL;
  const out = [];
  const live = (name, svg) => `<g data-part="${name}${index}">${svg}</g>`;
  // Flume from the leat to over the wheel, on two piers, with a gate frame at its mouth.
  // Springs: two small tanks on stands, piped into the flume's far wall. Further than the flume, so first.
  for (const sp of M.ML_SPRINGS) {
    const sx = x0 + sp.dx;
    out.push(S(k.cylinder(sx, sp.y, 3.6, 0, 1.2, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(sx, sp.y, 3, 1.2, 12, P, 24), { tone: "mid", crease: "none", inner: L([4, 7, 10].map((h) => k.sideArc(sx, sp.y, 3, h, P, 14)).join(""), { tone: M.ML_HUE[sp.kind] }) }));
    out.push(S(k.cylinder(sx, sp.y, 3.4, 13.2, 0.8, P, 20), { tone: "mid" }));
    out.push(L(k.ring(sx, sp.y, 1.6, 14, P, 14), { tone: "lo" }));
    const r = M.mlSpringRoute(x0, sp);
    out.push(k.wireSvg(at(r[0]), at(r[2]), { via: [at(r[1])], tone: "lo", size: 0.7, ends: "from" }));
    out.push(live("spring" + sp.kind, M.mlDashes(r, 0, 3, 1.2, P, K, M.ML_HUE[sp.kind])));
  }
  for (const y of [-20]) {
    out.push(S(k.cylinder(x0, y, 2.4, 0, 1.2, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(x0, y, 1.4, 1.2, F.bed - 1.2 - 1.2, P, 12), { tone: "mid", crease: "none" }));
  }
  const flumePlan = { x: x0 - F.w / 2 - 1, y: F.y0, w: F.w + 2, d: F.y1 - F.y0, r: 0.6 };
  out.push(S(k.slabOf(flumePlan, F.bed - 1.2, 1.2, P, 2), { tone: "mid", crease: "none" }));
  out.push(`<path class="iso-shade" data-shade="1" d="${k.onTop(k.ringOf({ x: x0 - F.w / 2, y: F.y0, w: F.w, d: F.y1 - F.y0, r: 0.3 }, 2), F.bed, P, true)}"/>`);
  out.push(S(k.slabOf({ x: x0 - F.w / 2 - 1, y: F.y0, w: 1, d: F.y1 - F.y0, r: 0.3 }, F.bed, F.top - F.bed, P, 2, 0.3), { tone: "mid", crease: "none" }));
  // Gate posts and the gate itself (live), then the near wall.
  for (const dx of [-F.w / 2 - 1.6, F.w / 2 + 1.6]) {
    out.push(S(k.cylinder(x0 + dx, M.ML_GATE.y, 0.7, F.bed - 1.2, F.top - F.bed + 1.2 + M.ML_GATE.lift + 3.2, P, 10), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.slabOf({ x: x0 - F.w / 2 - 2.2, y: M.ML_GATE.y - 0.6, w: F.w + 4.4, d: 1.2, r: 0.3 }, F.top + M.ML_GATE.lift + 3, 1.2, P, 2), { tone: "mid", crease: "none" }));
  out.push(live("flume", M.mlDashes(M.mlFlumeRoute(x0), 0, 4, 1.6, P, K)));
  out.push(live("gate", M.mlGateLive(x0, unit.gate, P, K)));
  out.push(S(k.slabOf({ x: x0 + F.w / 2, y: F.y0, w: 1, d: F.y1 - F.y0, r: 0.3 }, F.bed, F.top - F.bed, P, 2, 0.3), { tone: "mid", crease: "none" }));
  // Wheel: far post, bearing, rims, hub and axle, live spokes, near post, drum.
  const post = (dx) => S(k.slabOf({ x: x0 + dx - 1.2, y: W.y - 1.2, w: 2.4, d: 2.4, r: 0.4 }, 0, W.z - 1.2, P, 2, 0.3), { tone: "mid" }) + S(G.disc(-0.9, 0.9, 1.9, FX([x0 + dx, W.y, W.z]), P), { tone: "mid" });
  out.push(post(-5.5));
  out.push(S(G.disc(-6, M.ML_DRUM.s1 + 0.5, 0.8, FX([x0, W.y, W.z]), P), { tone: "mid", crease: "none" }));
  out.push(S(G.disc(-W.half, W.half, W.r, FX([x0, W.y, W.z]), P), { tone: "hi", crease: "lo", inner: L(G.arcOf(FX([x0, W.y, W.z]), 0, W.r, P), { tone: "faint" }) }));
  out.push(L(k.sideRing([x0 + W.half + 0.1, W.y, W.z], W.r - 0.6, "x", P, 48) + k.sideRing([x0 + W.half + 0.1, W.y, W.z], 2.4, "x", P, 20), { tone: "lo" }));
  out.push(live("wheel", M.mlWheelLive(x0, 0, P, K, VIEW)));
  out.push(S(G.disc(W.half, W.half + 1.2, 1.6, FX([x0, W.y, W.z]), P), { tone: "mid" }));
  out.push(post(5.5));
  // Drum on the axle, a pawl post, the pulley post and pulley.
  const Dm = M.ML_DRUM;
  out.push(S(G.disc(Dm.s0, Dm.s1, Dm.r, FX([x0, W.y, W.z]), P), { tone: "hi", crease: "lo", inner: L([0.9, 1.8, 2.7].map((s) => G.arcOf(FX([x0, W.y, W.z]), Dm.s0 + s, Dm.r, P)).join(""), { tone: "faint" }) }));
  out.push(S(k.slabOf({ x: x0 + Dm.s0 + 1, y: W.y + Dm.r + 0.4, w: 2, d: 1.2, r: 0.3 }, 0, W.z + Dm.r - 0.6, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x0 + M.ML_PULLEY.x, M.ML_PULLEY.y, 2.4, 0, 1.2, P, 16), { tone: "lo" }));
  out.push(S(k.cylinder(x0 + M.ML_PULLEY.x, M.ML_PULLEY.y, 1.1, 1.2, M.ML_PULLEY.z - 1.2 - 1.2, P, 12), { tone: "mid", crease: "none", inner: L(k.sideArc(x0 + M.ML_PULLEY.x, M.ML_PULLEY.y, 1.1, 16, P, 10), { tone: "faint" }) }));
  out.push(S(G.disc(-0.6, 0.6, 1.6, FX([x0 + M.ML_PULLEY.x, M.ML_PULLEY.y, M.ML_PULLEY.z]), P), { tone: "mid" }));
  out.push(live("cord", M.mlCordLive(x0, 0, unit.gate, P, K)));
  // Pump: a pipe from the tail pit up and back into the leat downstream.
  const pr = M.mlPumpRoute(x0);
  out.push(S(k.cylinder(pr[0][0], pr[0][1], 1.6, 0, 2, P, 14), { tone: "mid" }));
  out.push(k.wireSvg(at(pr[0]), at(pr[3]), { via: [at(pr[1]), at(pr[2])], tone: "hi", size: 0.9 }));
  out.push(S(k.cylinder(pr[2][0], pr[2][1], 1.1, M.ML_LEAT.top - 0.6, 1.2, P, 10), { tone: "mid", crease: "none" }));
  out.push(live("pump", M.mlDashes(pr, 0, 4, 1.4, P, K)));
  return out.join("");
}

const UNITS0 = [
  { gate: 0.8, human: true },
  { gate: 0.9, human: true },
  { gate: 0.7, human: true },
];
const lt = leat();
const leatLive = M.ML_X.map((x, i) => `<g data-part="leat${i}">${M.mlDashes(M.mlLeatSegment(i === 0 ? M.ML_LEAT.x0 + 2 : M.ML_X[i - 1] + 8, x), 0, 5, 2, P, K)}</g>`).join("") + `<g data-part="leat3">${M.mlDashes(M.mlLeatSegment(M.ML_X[2] + 8, M.ML_LEAT.x1 - 2), 0, 5, 2, P, K)}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "人とAIエージェントの共生系を、一本の用水路に沿って並ぶ三つの水車小屋として表した図。各小屋は、用水路から水門で取った水に、青い人の泉と緑のAIの泉の水を合わせて水車を回す。水車の軸はラチェットの胴を回し、胴が巻き取る綱が水門を持ち上げる。水門の開きが次に水車が受ける水を決める。水車が動かすポンプは、尾水を用水路の下流へ戻す。小屋どうしは用水路を介してしかつながらず、互いの胴や水門には触れない。クリックした小屋の人の泉が止まる。",
  body: [plate(), lt.back, leatLive, lt.front, ...M.ML_X.map((x, i) => mill(x, i, UNITS0[i]))],
});

const shared = readFileSync(join(HERE, "mill.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${shared}
const P = ${JSON.stringify(P)};
const K = { solidSvg, slabOf, lineSvg, dotsSvg, iso, segment };
const VIEW = ${JSON.stringify(VIEW)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const units = ${JSON.stringify(UNITS0)}.map((u, i) => ({ ...u, cap: u.gate, phi: i * 0.7, drum: 0, flumePhase: 0, pumpPhase: 0, springPhase: 0, omega: 0, pump: 0, away: 0, G: { wheel: part("wheel" + i), cord: part("cord" + i), gate: part("gate" + i), flume: part("flume" + i), pump: part("pump" + i), sH: part("springH" + i), sA: part("springA" + i) } }));
const leats = [0, 1, 2, 3].map((i) => ({ el: part("leat" + i), phase: 0, v: 1 }));
const segs = [[${M.ML_LEAT.x0 + 2}, ${M.ML_X[0]}], [${M.ML_X[0] + 8}, ${M.ML_X[1]}], [${M.ML_X[1] + 8}, ${M.ML_X[2]}], [${M.ML_X[2] + 8}, ${M.ML_LEAT.x1 - 2}]];
const MX = ${JSON.stringify(M.ML_X)};
let speed = 1, fast = false, frame = 0, last = 0, visible = false;
function say() {
  const w = units.map((u) => u.omega.toFixed(1)).join(" · ");
  const away = units.filter((u) => !u.human).length;
  return "水車 " + w + " · 下流 " + leats[3].v.toFixed(1) + " · 離れている人 " + away;
}
function draw() {
  units.forEach((u, i) => {
    const x0 = MX[i];
    u.G.wheel.innerHTML = mlWheelLive(x0, u.phi, P, K, VIEW);
    u.G.cord.innerHTML = mlCordLive(x0, u.drum, u.gate, P, K);
    u.G.gate.innerHTML = mlGateLive(x0, u.gate, P, K);
    u.G.flume.innerHTML = mlDashes(mlFlumeRoute(x0), u.flumePhase, 4, 1.6, P, K);
    u.G.pump.innerHTML = mlDashes(mlPumpRoute(x0), u.pumpPhase, 4, 1.4, P, K);
    u.G.sH.innerHTML = u.human ? mlDashes(mlSpringRoute(x0, ML_SPRINGS[0]), u.springPhase, 3, 1.2, P, K, "blue") : "";
    u.G.sA.innerHTML = mlDashes(mlSpringRoute(x0, ML_SPRINGS[1]), u.springPhase, 3, 1.2, P, K, "green");
  });
  leats.forEach((l, i) => { l.el.innerHTML = mlDashes(mlLeatSegment(segs[i][0], segs[i][1]), l.phase, 5, 2, P, K); });
  const text = say();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  speed += ((fast ? 3 : 1) - speed) * (1 - Math.exp(-dt / 0.35));
  const step = dt * speed;
  let level = ML_FLOW.leat;
  leats[0].v = level;
  units.forEach((u, i) => {
    const f = mlFlow(u, level);
    u.omega += (f.omega - u.omega) * (1 - Math.exp(-step / 0.8));
    u.pump = f.pump;
    // b: the ratchet only advances while the wheel really turns; left alone it unwinds.
    if (u.omega > ML_FLOW.rise) u.cap = Math.min(1, u.cap + step * 0.05 * (u.omega - ML_FLOW.rise));
    else u.cap = Math.max(0.2, u.cap - step * 0.04);
    // c: the gate follows the drum with a lag.
    u.gate += (u.cap - u.gate) * (1 - Math.exp(-step / 1.2));
    u.phi += step * u.omega * 1.6;
    u.drum += step * u.omega * 0.8;
    u.flumePhase += step * (f.take + 0.1) * 8;
    u.springPhase += step * 6;
    u.pumpPhase += step * f.pump * 10;
    if (!u.human) u.away += step;
    level = f.out;
    leats[i + 1].v = level;
  });
  leats.forEach((l) => { l.phase += step * l.v * 8; });
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const toggle = (i) => {
  const u = units[i];
  if (u.human) { u.human = false; u.away = 0; }
  else { u.human = true; if (u.away > 3) u.cap = Math.min(1, u.cap + 0.15); }
  draw(); run();
};
const centres = MX.map((x) => iso([x, ML_WHEEL.y, ML_WHEEL.z], P)[0]);
stage.addEventListener("pointerenter", () => { fast = true; });
stage.addEventListener("pointerleave", () => { fast = false; });
stage.addEventListener("click", (event) => {
  const box = svg.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * ${WIDTH};
  let best = 0;
  centres.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(centres[best] - x)) best = i; });
  toggle(best);
});
stage.addEventListener("keydown", (event) => { const i = ["1", "2", "3"].indexOf(event.key); if (i >= 0) { event.preventDefault(); toggle(i); } });
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "川沿いの三つの水車小屋",
  hint: "ホバーで早送り · 小屋をクリックで人が離れる",
  readout: "水車 0.0 · 0.0 · 0.0 · 下流 1.0 · 離れている人 0",
  keys: [
    { mark: "blue", label: "青：人の泉。緑：AIの泉。二つの水が一本の樋で合流して水車を回す（a）" },
    { mark: "raised", label: "ラチェットの胴：水車が回るあいだだけ進み、放っておくと戻る（b）" },
    { mark: "lit", label: "綱と水門：胴が巻き取った分だけ水門が開き、次に水車が受ける水が決まる（c）" },
    { mark: "edge", label: "用水路：小屋どうしをつなぐ唯一のもの。ポンプが戻した水が下流の小屋に届く" },
  ],
  caption:
    "一本の用水路に沿って、三つの小さな水車小屋が並ぶ。小屋ひとつが、人とAIエージェントの共生系ひとつにあたる。各小屋は、用水路から水門で取った水に、人の泉（青）とAIの泉（緑）の水を合わせて水車を回す。これが a、社会レベルの運動で、どちらの泉だけでも今の水門の開きでは回りきらない。水車の軸はラチェットの胴を回す。胴は水車が実際に回っているあいだだけ進み、止まれば少しずつ戻る。これが b、運動を産出する運動で、回ることで回る条件が作られる。胴が巻き取った綱は水門を持ち上げ、水門の開きが次に水車が受ける水を決める。これが c、願いの産出で、広がった分だけ次の運動が大きくなる。水車が動かすポンプは尾水を用水路の下流へ戻すので、上流の小屋がよく回れば下流の小屋の水が増える。だが小屋どうしは用水路を介してしかつながらず、どの小屋も他の小屋の胴や水門には触れない。これがデカップリングで、小屋を大きくするのではなく、小屋を増やすことでこの系は広がる。小屋をクリックすると人の泉が止まる。その小屋の水車は惰性で減速し、胴が戻って水門が閉じていくが、用水路は流れ続け、ほかの小屋は回り続ける。人が戻ると、離れていた時間が長いほど胴がひと目多く進む。",
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="川沿いの三つの水車小屋">${svg}</div>`,
});

const file = theme === "light" ? "mill-row-light.html" : "mill-row.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "川沿いの三つの水車小屋", theme, body, script: kitScript() + live, width: 700 }).replace('<html lang="en">', '<html lang="ja">'));
console.log("wrote", file);
