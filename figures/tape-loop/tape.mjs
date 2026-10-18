// Shared model and moving geometry for the tape loop. No imports: the build inlines this file into
// the page (with `export` stripped), so the browser redraws the moving parts from exactly the code
// that drew them at rest. K is the kit.
//
// The machine is Luhmann's society with code as its medium. A closed loop of punched paper tape
// runs round a drum. Heads (one a person's, three AI) read the rows that pass under their feelers
// and punch a new row downstream that references the row they answer. A row lights only when a
// later row references it: understanding is observed after the fact, in the next connection. A
// splicer cuts out every row that went round once with nobody answering it. Heads never touch
// each other; the only thing they touch is the tape.

export const TP_R = 50; // tape centreline radius
export const TP_W = 9.2; // tape width
export const TP_Z = 20; // top of the drum, where the tape lies
export const TP_SLOTS = 96; // rows round the loop
export const TP_PITCH = 360 / TP_SLOTS; // degrees per row
export const TP_COLS = [-3.4, -1.7, 0, 1.7, 3.4]; // hole columns across the tape, radial offsets
export const TP_STATIONS = [
  { a: 117, kind: "H" },
  { a: 189, kind: "A" },
  { a: 261, kind: "A" },
  { a: 333, kind: "A" },
];
export const TP_SPLICE = 45;
export const TP_CHUTE = 56; // the chute leaves downstream of the blade, clear of the post // the splicer's angle, at the front
export const TP_PUNCH_OFF = 9; // degrees downstream of a head where its punch sits
export const TP_HEAD = { rIn: TP_R - 7, rOut: TP_R + 7, half: 4.5, z: 26, top: 32 };
export const TP_PUNCH = { rIn: TP_R - 5.5, rOut: TP_R + 5.5, half: 2.6, z: 27, top: 31, ram: 1.2, drop: 6 };
export const TP_ARM = { z: 34, top: 36, post: 68 };
export const TP_HUE = { H: "blue", A: "green" };
export const TP_SPEED = 9; // degrees per second the tape turns
export const TP_REACH = 8; // slots downstream a head may punch into
export const TP_GRACE = 1; // loops an unanswered row survives before the splicer cuts it
export const TP_KEEP = 3; // loops any row stays before it is cut into the archive

const DEG = Math.PI / 180;
export const tpPolar = (deg, r) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
export const tpWrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
export const tpSector = (a, half, rIn, rOut, steps = 6) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(tpPolar(a - half + (2 * half * i) / steps, rOut));
  for (let i = steps; i >= 0; i--) pts.push(tpPolar(a - half + (2 * half * i) / steps, rIn));
  return pts;
};
export const tpSlotAngle = (k, theta) => theta + k * TP_PITCH;

// What a head reads: its comb says which columns it reads. A head answers a row when the row has
// a hole in a column the comb reads. Combs are premises: a head's comb is remade from the rows that
// answered its own rows, so what gets read next is decided by what got connected before.
export function tpComb(kind) {
  return kind === "H" ? [1, 1, 1, 0, 0] : [0, 0, 1, 1, 1];
}
export function tpReads(comb, holes) {
  return holes.some((h, i) => h && comb[i]);
}
export function tpLearn(comb, holes) {
  // Keep three teeth: drop one the answering row did not use, raise one it did.
  const next = comb.slice();
  const used = holes.map((h, i) => (h && !next[i] ? i : -1)).filter((i) => i >= 0);
  const idle = next.map((c, i) => (c && !holes[i] ? i : -1)).filter((i) => i >= 0);
  if (used.length && idle.length) {
    next[idle[0]] = 0;
    next[used[0]] = 1;
  }
  return next;
}
// The holes a head punches: its comb's columns, one of them dropped, plus one neighbour.
export function tpPattern(comb, rand) {
  const holes = comb.map((c) => (c && rand() < 0.75 ? 1 : 0));
  const extra = Math.floor(rand() * 5);
  holes[extra] = 1;
  if (!holes.some(Boolean)) holes[comb.indexOf(1)] = 1;
  return holes;
}

// The tape: its flat band, every punched row's holes, the notch of every row that answers another,
// and the lit holes of every row that was answered.
export function tpTape(rows, theta, P, K) {
  const z = TP_Z + 0.3;
  const outer = [];
  const inner = [];
  for (let i = 0; i < 96; i++) {
    const a = (i * 360) / 96;
    outer.push(K.iso([...tpPolar(a, TP_R + TP_W / 2), z], P));
    inner.push(K.iso([...tpPolar(a, TP_R - TP_W / 2), z], P));
  }
  const ring = (pts) => "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
  const out = [`<path class="iso-top" fill-rule="evenodd" d="${ring(outer)}${ring(inner.slice().reverse())}"/>`];
  out.push(K.lineSvg(K.ring(0, 0, TP_R + TP_W / 2, z, P, 96) + K.ring(0, 0, TP_R - TP_W / 2, z, P, 96), { tone: "lo" }));
  const holes = { H: [], A: [] };
  const litHoles = { H: [], A: [] };
  const notches = { H: [], A: [] };
  const ticks = [];
  rows.forEach((row, k) => {
    const a = tpSlotAngle(k, theta);
    if (k % 4 === 0) ticks.push(K.lineOnTop(tpPolar(a, TP_R + TP_W / 2), tpPolar(a, TP_R + TP_W / 2 + 0.8), z, P));
    if (!row) return;
    const list = row.answered ? litHoles[row.kind] : holes[row.kind];
    row.holes.forEach((h, c) => {
      if (h) list.push(K.iso([...tpPolar(a, TP_R + TP_COLS[c]), z], P));
    });
    if (row.ref >= 0) notches[row.kind].push(K.lineOnTop(tpPolar(a, TP_R - TP_W / 2), tpPolar(a, TP_R - TP_W / 2 - 2.2), z, P));
  });
  out.push(K.lineSvg(ticks.join(""), { tone: "faint" }));
  for (const kind of ["H", "A"]) {
    const hue = TP_HUE[kind];
    out.push(`<g class="tp-dot" data-hue="${hue}" data-dim>${K.dotsSvg(holes[kind], { size: 0.7 })}</g>`);
    out.push(`<g class="tp-dot" data-hue="${hue}">${K.dotsSvg(litHoles[kind], { size: 1.05 })}</g>`);
    out.push(K.lineSvg(notches[kind].join(""), { tone: hue }));
  }
  return out.join("");
}

// A head's live parts: the comb's teeth on top of the block, and the punch ram downstream.
export function tpHeadLive(st, comb, drop, reading, P, K) {
  const out = [];
  const teeth = [];
  TP_COLS.forEach((c, i) => {
    const [x, y] = tpPolar(st.a - 2.2, TP_R + c);
    teeth.push(K.cylinder(x, y, 0.5, TP_HEAD.top, comb[i] ? 2.4 : 0.8, P, 10));
  });
  teeth.forEach((t) => out.push(K.solidSvg(t, { tone: "mid", crease: "none" })));
  const [px, py] = tpPolar(st.a + TP_PUNCH_OFF, TP_R);
  out.push(K.solidSvg(K.cylinder(px, py, TP_PUNCH.ram, TP_PUNCH.z - drop, TP_PUNCH.drop + 1 - 0 + (TP_PUNCH.top - TP_PUNCH.z) - TP_PUNCH.drop + drop, P, 12), { tone: "hi", crease: "none", lit: drop > 0.5 }));
  if (reading) {
    const [fx, fy] = tpPolar(st.a, TP_R);
    out.push(K.lineSvg(K.lineOnTop(tpPolar(st.a, TP_R - TP_W / 2), tpPolar(st.a, TP_R + TP_W / 2), TP_Z + 0.5, P), { tone: "lit" }) + K.dotsSvg([K.iso([fx, fy, TP_Z + 0.5], P)], { size: 0.5, tone: "hi" }));
  }
  return out.join("");
}

// The splicer's blade: down across the tape while it cuts.
export function tpBlade(cutT, P, K) {
  const a = TP_SPLICE;
  const drop = cutT > 0 ? 5.5 * Math.sin(Math.min(1, cutT / 0.35) * Math.PI) : 0;
  const z = TP_HEAD.z + 0.6 - drop;
  const pts = [tpPolar(a - 0.5, TP_R - 5.5), tpPolar(a - 0.5, TP_R + 5.5), tpPolar(a + 0.5, TP_R + 5.5), tpPolar(a + 0.5, TP_R - 5.5)];
  return K.solidSvg(K.extrude(pts, z, TP_HEAD.top - TP_HEAD.z - 0.6 + drop, P), { tone: "hi", crease: "none", lit: drop > 0.5 });
}

// Cut-outs falling down the chute into the archive basket.
export function tpSnippets(list, P, K) {
  return list
    .map((s) => {
      const t = s.t;
      const r = TP_R + 9 + t * 23;
      const z = TP_Z + 4 - t * t * 16;
      const [x, y] = tpPolar(TP_CHUTE + (s.side - 0.5) * 3, r);
      const d = K.lineOnTop([x - 1.2, y - 0.6], [x + 1.2, y + 0.6], z, P);
      return `<g opacity="${(1 - t * 0.6).toFixed(2)}">${K.lineSvg(d, { tone: TP_HUE[s.kind], free: true })}</g>`;
    })
    .join("");
}

export function tpBasketFill(count, P, K) {
  const [bx, by] = tpPolar(TP_CHUTE, 82);
  const n = Math.min(40, count);
  const lines = [];
  let seed = 11;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    const x = bx - 4 + rand() * 8;
    const y = by - 3 + rand() * 6;
    const z = 1 + (i / 40) * 5;
    const a = rand() * Math.PI;
    lines.push({ d: K.lineOnTop([x - Math.cos(a), y - Math.sin(a)], [x + Math.cos(a), y + Math.sin(a)], z, P), kind: rand() < 0.4 ? "H" : "A" });
  }
  return ["H", "A"].map((kind) => K.lineSvg(lines.filter((l) => l.kind === kind).map((l) => l.d).join(""), { tone: TP_HUE[kind], free: true })).join("");
}
