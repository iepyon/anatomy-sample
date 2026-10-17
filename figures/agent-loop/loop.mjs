// Shared model and moving geometry for the five-station loop table. No imports: the build
// inlines this file into the page (with `export` stripped), so the browser redraws the
// moving parts from exactly the code that drew them at rest. K is the kit.

export const LP_STATIONS = [333, 45, 117, 189, 261]; // plan angles: Perceive, Think, Act, Verify, Deposit
export const LP_STEP = 72; // the table turns counter-clockwise in plan, one station per step
export const LP_NEST_R = 34; // nest circle on the turntable
export const LP_POST_R = 60; // station posts stand outside the table
export const LP_TABLE = { r: 46, z: 6, top: 10 };
export const LP_PUCK = { r: 6, z: 10, top: 14 };
export const LP_INDEX = 0.24; // share of each step spent indexing the table one station on
export const LP_TOL = 0.55; // the sealed tolerance band on the verify gauge (|reading| ≤ this passes)
export const LP_STREAK = 3; // passes in a row that earn the body one more notch
export const LP_LEVELS = 5; // notches on each body dial
export const LP_LAYERS = 10; // layers the guide pillars hold; the run ends when they are full
export const LP_TRAY_TOP = 18.5;
export const LP_LAYER_H = 2.2;
export const LP_LAYER_S = 11; // side of a learning plate; plates sit corner-on between the pillars
export const LP_HANG = 48; // tile bottom while it rides under the trolley
export const LP_DEPOT = 47; // trolley stop over the deposit magazine, out from the centre along the bridge
export const LP_BRIDGE_DEG = 261; // the bridge runs from the centre toward the deposit post
export const LP_BRIDGE_DIR = [Math.cos((LP_BRIDGE_DEG * Math.PI) / 180), Math.sin((LP_BRIDGE_DEG * Math.PI) / 180)];
export const LP_BRIDGE_Z = 63;
export const LP_GAUGE = { z: 34, top: 39, r: 9, stem: 1.5 }; // verify dial gauge over its nest
export const LP_PRESS = { z: 30, top: 40, r: 5, ram: 1.7, rise: 7 }; // act press over its nest

const DEG = Math.PI / 180;
export const LP_ZERO = -45 * DEG; // dial zero points straight away from the viewer
export const lpPolar = (deg, r) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
export const lpNest = (s) => lpPolar(LP_STATIONS[s], LP_NEST_R);
export const lpEase = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const lpSpan = (f, a, b) => lpEase((f - a) / (b - a));

// One run of the table. Each step indexes every puck one station on, and every station works on
// the puck in front of it at once. The puck at Verify gets a reading from the sealed gauge; the
// puck at Deposit sets down, provisionally, the learning from the reading it got one step before,
// and the layer stays only if that reading passed. LP_STREAK passes in a row earn the body a notch:
// first the observation scope, then the execution authority, in turn, never both at once.
export function planFor(seed) {
  let x = (seed * 2654435761 + 12345) >>> 0;
  const rand = () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
  const readings = [];
  const pass = [];
  const scope = [1];
  const reach = [1];
  let streak = 0;
  let kept = 0;
  let steps = 0;
  for (let k = 0; k < 200; k++) {
    const r = (rand() * 2 - 1) * 0.74;
    readings.push(r);
    pass.push(Math.abs(r) <= LP_TOL);
    // The body after step k's verdict.
    let s = scope[k];
    let a = reach[k];
    if (k >= 2) {
      streak = pass[k] ? streak + 1 : 0;
      if (streak === LP_STREAK) {
        streak = 0;
        if (s <= a && s < LP_LEVELS) s += 1;
        else if (a < LP_LEVELS) a += 1;
      }
    }
    scope.push(s);
    reach.push(a);
    // Step k + 1 deposits step k's verdict. Steps 0 and 1 run before the first full loop.
    if (k >= 2 && pass[k]) kept += 1;
    if (kept === LP_LAYERS) { steps = k + 2; break; }
  }
  return { readings, pass, scope, reach, steps };
}

// Everything the figure shows at time t, measured in steps since the run began.
export function stateAt(t, plan) {
  const k = Math.min(Math.floor(t), plan.steps - 1);
  const f = Math.min(1, t - k);
  const turn = k - 1 + lpSpan(f, 0, LP_INDEX); // table position, in stations
  const verdictAt = (j) => j >= 2 && plan.pass[j];
  const decided = f > 0.62; // the gauge has settled and the verdict is read
  let layers = 0;
  for (let j = 2; j < k - 1; j++) if (plan.pass[j]) layers += 1;
  const depositing = k - 1 >= 2; // the puck at Deposit carries a verdict from a full loop
  const keep = depositing && plan.pass[k - 1];
  const settle = lpSpan(f, 0.7, 0.78);
  if (keep && f >= 0.78) layers += 1;
  const levelStep = decided ? k + 1 : k;
  return {
    k, f, turn, layers, keep, depositing, settle,
    loop: Math.max(0, k - 1), // full loops completed by the puck now at Deposit
    reading: plan.readings[k],
    verdict: verdictAt(k),
    decided,
    scope: plan.scope[levelStep],
    reach: plan.reach[levelStep],
  };
}

// Station s (0 Perceive … 4 Deposit) holds puck (s - turn) mod 5.
export const lpPuckAngle = (i, turn) => LP_STATIONS[0] + LP_STEP * (i + turn);

// A puck shows the verify mark from the moment it passes until it reaches Perceive again.
export function puckMarked(i, st, plan) {
  const at = (((i + st.k) % 5) + 5) % 5; // station index after this step's index
  if (at === 3) return st.decided && st.verdict;
  if (at === 4) return st.k - 1 >= 2 && plan.pass[st.k - 1] && st.f < 0.9;
  return false;
}

const lpDepth = ([x, y], P, K) => K.depthOf([x, y, 0], P);

// The tabletop: rim ticks and the five nests, turned with the table.
export function drawTabletop(turn, P, K) {
  const rot = LP_STEP * turn * DEG;
  const z = LP_TABLE.top;
  const t = K.radialTicks(0, 0, LP_TABLE.r - 1.4, 60, 12, z, [1.4, 3], P, (LP_STATIONS[0] + 90) * DEG + rot, Math.PI * 2);
  const nests = [];
  const pins = [];
  for (let i = 0; i < 5; i++) {
    const [x, y] = lpPolar(lpPuckAngle(i, turn), LP_NEST_R);
    nests.push(K.ring(x, y, LP_PUCK.r + 1.6, z, P, 36));
    const [px, py] = lpPolar(lpPuckAngle(i, turn) + 13, LP_NEST_R + 2);
    pins.push(K.iso([px, py, z], P));
  }
  return K.lineSvg(K.ring(0, 0, LP_TABLE.r - 1.4, z, P, 120), { tone: "faint" }) + K.lineSvg(t.minor, { tone: "lo" }) + K.lineSvg(t.major, { tone: "mid" }) + K.lineSvg(nests.join(""), { tone: "faint" }) + K.dotsSvg(pins, { size: 0.45, tone: "lo" });
}

// The observation scope, a ring of light the perceive head throws round its nest. Outside it the
// agent sees nothing.
export function drawScope(level, glow, P, K) {
  const [x, y] = lpNest(0);
  const r = LP_PUCK.r + 2.6 + level * 2.2;
  const tone = glow > 0.5 ? "hi" : "lo";
  return K.lineSvg(K.ring(x, y, r, LP_TABLE.top, P, 64), { tone, dotted: true });
}

function puckSvg(x, y, marked, P, K) {
  const z = LP_PUCK.z;
  const out = [K.solidSvg(K.cylinder(x, y, LP_PUCK.r, z, LP_PUCK.top - z, P, 36, 0.4), { tone: "hi", crease: "lo", inner: K.lineSvg(K.sideArc(x, y, LP_PUCK.r, z + 1.4, P, 24), { tone: "faint" }) })];
  out.push(K.lineSvg(K.ring(x, y, LP_PUCK.r - 1.8, LP_PUCK.top, P, 32), { tone: "faint" }));
  out.push(K.dotsSvg([K.iso([x, y, LP_PUCK.top], P)], { size: marked ? 1.5 : 0.5, tone: marked ? "hi" : "lo" }));
  return out.join("");
}

// The pucks on one side of the centre column (front: nearer the viewer than its axis).
export function drawPucks(turn, st, plan, front, P, K) {
  const list = [];
  for (let i = 0; i < 5; i++) {
    const [x, y] = lpPolar(lpPuckAngle(i, turn), LP_NEST_R);
    const depth = lpDepth([x, y], P, K);
    if (depth > 0 === front) list.push({ depth, svg: puckSvg(x, y, puckMarked(i, st, plan), P, K) });
  }
  return list.sort((a, b) => a.depth - b.depth).map((item) => item.svg).join("");
}

// A square plate with its sides along the bridge (its corners point at the pillars), centred at (cx, cy).
export function lpPlateRing(cx, cy, side, r = 1) {
  const [c, n] = LP_BRIDGE_DIR;
  return K_ROUNDED(side, r).map(([x, y]) => [cx + x * c - y * n, cy + x * n + y * c]);
}
function K_ROUNDED(side, r) {
  const h = side / 2;
  const out = [];
  for (const [cx, cy, a0] of [[h - r, -h + r, -90], [h - r, h - r, 0], [-h + r, h - r, 90], [-h + r, -h + r, 180]]) {
    for (let i = 0; i <= 3; i++) {
      const a = (a0 + 30 * i) * DEG;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return out;
}
export function plateSvg(cx, cy, z, P, K, tone = "hi") {
  return K.solidSvg(K.extrude(lpPlateRing(cx, cy, LP_LAYER_S), z, LP_LAYER_H, P, { bevel: 0.3 }), { tone, crease: "lo", inner: K.lineSvg(K.onTop(lpPlateRing(cx, cy, LP_LAYER_S - 3.6, 0.4), z + LP_LAYER_H, P, true), { tone: "faint" }) });
}
const layerSvg = (z, P, K) => plateSvg(0, 0, z, P, K);

// The learning kept so far, plates stacked on the tray between the guide pillars.
export function drawStack(layers, P, K) {
  let out = "";
  for (let i = 0; i < layers; i++) out += layerSvg(LP_TRAY_TOP + i * LP_LAYER_H, P, K);
  return out;
}

// Where the trolley and its tile are: out to the centre, down onto the stack, then either let go
// (kept) or back up and home again (not kept).
export function hoistAt(st) {
  const f = st.f;
  const top = LP_TRAY_TOP + st.layers * LP_LAYER_H - (st.keep && f >= 0.78 ? LP_LAYER_H : 0);
  const out = lpSpan(f, LP_INDEX, 0.44);
  const home = lpSpan(f, st.keep ? 0.8 : 0.84, 0.98);
  const y = LP_DEPOT * (1 - out + home); // distance out along the bridge
  const down = lpSpan(f, 0.44, 0.6) - (st.keep ? 0 : lpSpan(f, 0.72, 0.82));
  const tileZ = LP_HANG + (top - LP_HANG) * down;
  const hookZ = st.keep ? LP_HANG + (top - LP_HANG) * (lpSpan(f, 0.44, 0.6) - lpSpan(f, 0.78, 0.86)) : tileZ;
  let alpha = 0;
  if (st.depositing) {
    alpha = lpSpan(f, 0.02, 0.2);
    if (st.keep) alpha = f >= 0.78 ? 0 : alpha;
    else alpha *= 1 - lpSpan(f, 0.9, 1);
  }
  const firm = st.keep ? 0.55 + 0.45 * st.settle : 0.55;
  return { y, tileZ, hookZ, alpha, firm };
}

// The hoist: the tile on its hanger, and the hanger rod from the trolley.
export function drawHoist(h, P, K) {
  const out = [];
  const rodTop = LP_BRIDGE_Z;
  const hook = h.hookZ + LP_LAYER_H;
  const [cx, cy] = lpAlong(h.y);
  out.push(K.lineSvg(K.segment([cx, cy, rodTop], [cx, cy, hook + 1.2], P), { tone: "mid" }));
  out.push(K.solidSvg(K.cylinder(cx, cy, 1.4, hook, 1.2, P, 16), { tone: "mid" }));
  if (h.alpha > 0.01) {
    const [cx, cy] = lpAlong(h.y);
    const tile = plateSvg(cx, cy, h.tileZ, P, K);
    out.unshift(`<g opacity="${(h.alpha * h.firm).toFixed(3)}">${tile}</g>`);
  }
  return out.join("");
}

export const lpAlong = (d) => [LP_BRIDGE_DIR[0] * d, LP_BRIDGE_DIR[1] * d];

// The trolley on the bridge, d out from the centre; its square body turned to the bridge.
export function drawTrolley(d, P, K) {
  const z = LP_BRIDGE_Z + 3;
  const [cx, cy] = lpAlong(d);
  const ring = lpPlateRing(cx, cy, 8, 1.2);
  const out = [K.solidSvg(K.extrude(ring, z, 3.2, P, { bevel: 0.4 }), { tone: "mid" })];
  out.push(K.lineSvg(K.onTop(lpPlateRing(cx, cy, 5.2, 0.6), z + 3.2, P, true), { tone: "faint" }));
  out.push(K.dotsSvg([[-2.2, 0], [2.2, 0]].map(([ox, oy]) => K.iso([cx - ox * LP_BRIDGE_DIR[1], cy + ox * LP_BRIDGE_DIR[0], z + 3.2], P)), { size: 0.4 }));
  return out.join("");
}

// The verify gauge's needle: lit, it swings to the reading as the plunger meets the puck.
export function drawNeedle(reading, P, K) {
  const [x, y] = lpNest(3);
  const a = LP_ZERO + reading * 2.2; // a full ±1 reading is ±126°
  const r = LP_GAUGE.r - 2.4;
  return K.lineSvg(K.lineOnTop([x - Math.sin(a) * 2.2, y + Math.cos(a) * 2.2], [x + Math.sin(a) * r, y - Math.cos(a) * r], LP_GAUGE.top + 0.2, P), { tone: "lit", free: "start" });
}

// A body dial's pointer at a level, 1 … LP_LEVELS across a 160° arc.
export const lpDialAngle = (level) => LP_ZERO - 80 * DEG + ((level - 1) / (LP_LEVELS - 1)) * 160 * DEG;
export function drawBodyNeedle(cx, cy, z, level, P, K) {
  const a = lpDialAngle(level);
  return K.lineSvg(K.lineOnTop([cx - Math.sin(a) * 1.2, cy + Math.cos(a) * 1.2], [cx + Math.sin(a) * 3.6, cy - Math.cos(a) * 3.6], z, P), { tone: "hi", free: "start" });
}

// The model cabinet's knob: its pointer turns to the next decision.
export function drawKnobMark(cx, cy, z, angle, P, K) {
  return K.lineSvg(K.lineOnTop([cx, cy], [cx + Math.cos(angle) * 3.6, cy + Math.sin(angle) * 3.6], z, P), { tone: "hi", free: "start" });
}
