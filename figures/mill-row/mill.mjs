// Shared model and moving geometry for the row of mills. No imports: the build inlines this file
// into the page (with `export` stripped), so the browser redraws the moving parts from exactly the
// code that drew them at rest. K is the kit.
//
// Three small mills stand along one leat (the medium). Each mill is one symbiotic unit of a person
// and an AI agent: their two springs join the water the mill's gate takes from the leat, and the
// joined flow turns the wheel (a: the social-level movement). The wheel's axle turns a ratchet drum
// (b: the movement that forms the conditions of movement); the drum winds a cord that lifts the
// gate (c: the wish, the direction the next movement takes), and the gate sets how much the wheel
// gets. A pump driven by the wheel lifts tail water back into the leat downstream, so what one mill
// does reaches the next only through the medium. Nothing touches another mill's drum or gate.

export const ML_X = [-72, 0, 72]; // mill centrelines
export const ML_LEAT = { y0: -42, y1: -34, bed: 21, top: 24, x0: -104, x1: 104 };
export const ML_FLUME = { y0: -34, y1: -9, w: 5, bed: 20, top: 23 };
export const ML_GATE = { y: -31.5, lift: 6 };
export const ML_WHEEL = { y: -2, z: 10.5, r: 9.5, half: 3, spokes: 8 };
export const ML_DRUM = { s0: 8, s1: 12, r: 3.4 }; // along the axle (+x from the wheel)
export const ML_PULLEY = { x: 10, y: -2, z: 30 };
export const ML_PIT = { y0: 1, y1: 9, w: 12 };
export const ML_PUMP = { x: 7, top: 25 };
export const ML_SPRINGS = [
  { dx: -17, y: -27, kind: "H" },
  { dx: -9, y: -16, kind: "A" },
];
export const ML_HUE = { H: "blue", A: "green" };
export const ML_FLOW = { leat: 1.0, human: 0.5, ai: 0.3, take: 0.6, pump: 0.45, rise: 0.9 };

const DEG = Math.PI / 180;
export const mlEase = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// The state of one mill from its inputs: how much it takes from the leat, how fast its wheel turns,
// and how much its pump puts back downstream.
export function mlFlow(unit, leatIn) {
  const take = unit.gate * ML_FLOW.take * leatIn;
  const omega = take + (unit.human ? ML_FLOW.human : 0) + ML_FLOW.ai;
  const pump = ML_FLOW.pump * omega;
  return { take, omega, pump, out: Math.max(0.15, leatIn - take * 0.5 + pump * 0.5) };
}

// The wheel's live parts: spokes on the near face, and paddles on the part of the rim that faces
// the viewer, at angle phi. `view` is the unit direction toward the viewer (from the camera).
export function mlWheelLive(x0, phi, P, K, view) {
  const W = ML_WHEEL;
  const spokes = [];
  const paddles = [];
  const rimDots = [];
  for (let k = 0; k < W.spokes * 2; k++) {
    const a = phi + (k * Math.PI) / W.spokes;
    const ny = Math.sin(a);
    const nz = Math.cos(a);
    const y = W.y + W.r * ny;
    const z = W.z + W.r * nz;
    if (k % 2 === 0) spokes.push(K.segment([x0 + W.half + 0.15, W.y + 2.4 * ny, W.z + 2.4 * nz], [x0 + W.half + 0.15, W.y + (W.r - 0.6) * ny, W.z + (W.r - 0.6) * nz], P));
    const facing = ny * view[1] + nz * view[2];
    if (facing > 0.08) {
      paddles.push(K.segment([x0 - W.half, y, z], [x0 + W.half, y, z], P));
      rimDots.push(K.iso([x0 + W.half, y, z], P));
    }
  }
  return K.lineSvg(paddles.join(""), { tone: "mid" }) + K.lineSvg(spokes.join(""), { tone: "lo" }) + K.dotsSvg(rimDots, { size: 0.4, tone: "lo" });
}

// The drum's mark and the cord from the drum over the pulley to the gate.
export function mlCordLive(x0, drumAngle, gate, P, K) {
  const D = ML_DRUM;
  const cx = x0 + (D.s0 + D.s1) / 2;
  const my = ML_WHEEL.y + (D.r - 0.6) * Math.sin(drumAngle);
  const mz = ML_WHEEL.z + (D.r - 0.6) * Math.cos(drumAngle);
  const out = [K.lineSvg(K.segment([x0 + D.s1 + 0.1, ML_WHEEL.y, ML_WHEEL.z], [x0 + D.s1 + 0.1, my, mz], P), { tone: "hi" })];
  out.push(K.dotsSvg([K.iso([x0 + D.s1 + 0.1, my, mz], P), K.iso([x0 + D.s1 + 0.1, ML_WHEEL.y, ML_WHEEL.z], P)], { size: 0.5, tone: "hi" }));
  const top = [x0 + ML_PULLEY.x, ML_PULLEY.y, ML_PULLEY.z];
  const gateTop = [x0, ML_GATE.y, ML_FLUME.top + 2.4 + gate * ML_GATE.lift];
  out.push(K.lineSvg(K.segment([cx, ML_WHEEL.y, ML_WHEEL.z + D.r], [top[0], top[1], top[2] - 1.2], P) + K.segment([top[0] - 1.2, top[1], top[2]], gateTop, P), { tone: "lit" }));
  out.push(K.dotsSvg([K.iso(gateTop, P)], { size: 0.5, tone: "hi" }));
  return out.join("");
}

// The gate plate across the flume mouth, lifted by `gate` (0 shut, 1 open).
export function mlGateLive(x0, gate, P, K) {
  const F = ML_FLUME;
  const lift = gate * ML_GATE.lift;
  const plan = { x: x0 - F.w / 2 - 0.6, y: ML_GATE.y - 0.6, w: F.w + 1.2, d: 1.2, r: 0.3 };
  return K.solidSvg(K.slabOf(plan, F.bed + 0.2 + lift, F.top - F.bed + 2.2, P, 2, 0.3), { tone: "hi", crease: "lo" });
}

// Moving dashes along a 3D polyline, phase in world units.
export function mlDashes(points, phase, pitch, len, P, K, tone = "lo") {
  let total = 0;
  const legs = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    legs.push({ a, b, L, from: total });
    total += L;
  }
  const out = [];
  const p0 = ((phase % pitch) + pitch) % pitch;
  for (let s = p0; s < total; s += pitch) {
    const e = Math.min(total, s + len);
    const at = (d) => {
      const leg = legs.find((l) => d <= l.from + l.L) || legs[legs.length - 1];
      const t = Math.min(1, Math.max(0, (d - leg.from) / leg.L));
      return [leg.a[0] + (leg.b[0] - leg.a[0]) * t, leg.a[1] + (leg.b[1] - leg.a[1]) * t, leg.a[2] + (leg.b[2] - leg.a[2]) * t];
    };
    out.push(K.segment(at(s), at(e), P));
  }
  return K.lineSvg(out.join(""), { tone, free: true });
}

export const mlSpringRoute = (x0, sp) => [[x0 + sp.dx, sp.y, 14], [x0 + sp.dx, sp.y, ML_FLUME.top + 1], [x0 - ML_FLUME.w / 2, sp.y, ML_FLUME.top + 1]];
export const mlFlumeRoute = (x0) => [[x0, ML_LEAT.y1, ML_FLUME.top - 1.4], [x0, ML_FLUME.y1, ML_FLUME.top - 1.4]];
export const mlPumpRoute = (x0) => [[x0 + ML_PUMP.x, ML_PIT.y1 - 2, 0.5], [x0 + ML_PUMP.x, ML_PIT.y1 - 2, ML_PUMP.top], [x0 + ML_PUMP.x, ML_LEAT.y1 + 1.5, ML_PUMP.top], [x0 + ML_PUMP.x, ML_LEAT.y1 + 1.5, ML_LEAT.top - 0.6]];
export const mlLeatSegment = (xa, xb) => [[xa, (ML_LEAT.y0 + ML_LEAT.y1) / 2, ML_LEAT.bed + 1.2], [xb, (ML_LEAT.y0 + ML_LEAT.y1) / 2, ML_LEAT.bed + 1.2]];
