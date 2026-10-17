// Shared model and moving geometry for the circular knitting machine. No imports: the build
// inlines this file into the page (with `export` stripped), so the browser redraws the moving
// parts from exactly the code that drew them at rest. K is the kit.
//
// The machine is Luhmann's autopoiesis of a social system: a stitch is a communication. It exists
// only as the event at the cam, and it is held ("understood") only when the next round's loop is
// pulled through it. Yarn is offered from outside (a person's spool, AI spools); the pattern card,
// punched from rounds already knitted, decides which yarn each needle takes.

export const KN_N = 24; // needles round the cylinder
export const KN_GROUPS = 8; // pattern groups on a card, three needles each
export const KN_CYL = { r: 22, z: 62, top: 84, hole: 16.5 };
export const KN_NEEDLE_R = 22.4;
export const KN_LIFT = 8; // how far the cam raises a needle above the cylinder top
export const KN_CAR = { rIn: 22.7, rOut: 31, z: 66, top: 78, half: 28 }; // the cam carriage (degrees)
export const KN_EYE = { r: 24.6, z: 95 }; // the feeder eye on the carriage
export const KN_MAST = { a: 225, r: 41, top: 130 };
export const KN_FEEDS = [-13, -4.5, 4, 12.5]; // tangential offsets of the guide eyes and spools: person, AI ×3
export const KN_SPOOL_Z = 98;
export const KN_GATE = { z: 124, top: 130, rIn: 42.4, rOut: 46.6, half: 22, shut: 2.8 }; // the yarn gate: the boundary
export const KN_FAB = { r: 15.5, top: 62, bottom: 12, row: 3 };
export const KN_TUB = { r: 26, top: 12 };
export const KN_CARD = { a: 315, r0: 47, pitch: 7.6, count: 5, w: 6.4, d: 13, z: 60.6 };
export const KN_MISS_DROP = 2;
export const KN_HUE = ["blue", "green"]; // the person's yarn, the AI yarns: the one place colour is the subject
export const knHue = (k) => (k === 0 ? KN_HUE[0] : KN_HUE[1]); // rounds a needle may miss before its loop runs

const DEG = Math.PI / 180;
export const knPolar = (deg, r) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
export const knNeedleDeg = (i) => (i * 360) / KN_N;
export const knWrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
export const knLift = (d) => KN_LIFT * Math.exp(-((d / 11) ** 2));
const along = (a, r, t) => {
  const [x, y] = knPolar(a, r);
  return [x - Math.sin(a * DEG) * t, y + Math.cos(a * DEG) * t];
};
export const knGuide = (k) => [...along(KN_MAST.a, KN_MAST.r + 3.5, KN_FEEDS[k]), KN_MAST.top];
export const knSpool = (k) => along(KN_MAST.a, KN_MAST.r + 3.5, KN_FEEDS[k]);

// The pattern a card carries: one of "H" (a person's yarn) or "A" (an AI's yarn) per group.
// The next card is punched from the round just knitted: a group that has held on a person's yarn
// for two rounds is handed to an AI, and a group an AI has held for three rounds goes back to a
// person for review. Decisions make the premises the next decisions are taken under.
export function knNextCard(card, streak) {
  return card.map((g, i) => {
    if (g === "H" && streak[i] >= 2) return "A";
    if (g === "A" && streak[i] >= 3) return "H";
    return g;
  });
}

// A concave plate: walls first, then an opaque top over them, then the top outline.
export function knConcave(ring, z, h, P, K, { tone = "mid", crease = "faint", lit = false } = {}) {
  const e = K.extrude(ring, z, h, P, { convex: false });
  const parts = [`<path class="iso-fill" d="${e.fill}"/>`];
  e.shades.forEach((d, shade) => { if (d) parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`); });
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${e.outline}"/>`);
  parts.push(`<path class="iso-fill" d="${e.top}"/>`, `<path class="iso-top" d="${e.top}"/>`);
  if (e.crease) parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${e.crease}"/>`);
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${K.onTop(ring, z + h, P, true)}"/>`);
  return `<g class="iso-solid"${lit ? " data-lit" : ""}>${parts.join("")}</g>`;
}

export function knSector(a, half, rIn, rOut, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(knPolar(a - half + (2 * half * i) / steps, rOut));
  for (let i = steps; i >= 0; i--) pts.push(knPolar(a - half + (2 * half * i) / steps, rIn));
  return pts;
}

export const knFacing = (deg, P) => {
  const [vx, vy] = [Math.cos((P.azimuth ?? 45) * DEG), Math.sin((P.azimuth ?? 45) * DEG)];
  return Math.cos(deg * DEG) * vx + Math.sin(deg * DEG) * vy;
};

// The cam carriage at angle a, with its crank knob and feeder post and arm.
export function knCarriage(a, P, K) {
  const c = KN_CAR;
  const out = [knConcave(knSector(a, c.half, c.rIn, c.rOut), c.z, c.top - c.z, P, K, { tone: "mid" })];
  const seam = [];
  for (let i = 0; i <= 16; i++) {
    const [x, y] = knPolar(a - c.half + (2 * c.half * i) / 16, c.rOut);
    seam.push([x, y]);
  }
  out.push(K.lineSvg(K.onTop(knSector(a, c.half - 4, c.rIn + 1.6, c.rOut - 1.6, 12), c.top, P, true), { tone: "faint" }));
  const [hx, hy] = knPolar(a + c.half - 7, 33.8);
  const [nx, ny] = knPolar(a + c.half - 7, c.rOut - 1);
  out.push(K.solidSvg(K.extrude(knSector(a + c.half - 7, 2.6, c.rOut - 1.5, 34.6, 4), c.top - 3, 2.6, P), { tone: "mid", crease: "none" }));
  out.push(K.solidSvg(K.cylinder(hx, hy, 2, c.top - 0.4, 9, P, 16), { tone: "mid", inner: K.lineSvg(K.knurl(hx, hy, 2, c.top - 0.4, c.top + 8.6, 12, P, 0.2), { tone: "faint" }) }));
  out.push(K.dotsSvg([K.iso([nx, ny, c.top - 0.4], P)], { size: 0.4, tone: "lo" }));
  const [px, py] = knPolar(a - 15, c.rOut - 2.4);
  const [ex0, ey0] = knPolar(a, KN_EYE.r);
  out.push(K.solidSvg(K.cylinder(px, py, 1.5, c.top, KN_EYE.z - c.top + 1, P, 14), { tone: "mid", crease: "none" }));
  const ux = ex0 - px, uy = ey0 - py, ul = Math.hypot(ux, uy);
  const [nx2, ny2] = [(-uy / ul) * 1.1, (ux / ul) * 1.1];
  const bar = [[px - nx2, py - ny2], [ex0 - nx2 + (ux / ul) * 1.6, ey0 - ny2 + (uy / ul) * 1.6], [ex0 + nx2 + (ux / ul) * 1.6, ey0 + ny2 + (uy / ul) * 1.6], [px + nx2, py + ny2]];
  out.push(K.solidSvg(K.extrude(bar, KN_EYE.z - 0.6, 1.6, P), { tone: "mid", crease: "none" }));
  out.push(K.dotsSvg([K.iso([px, py, KN_EYE.z + 1], P)], { size: 0.4, tone: "lo" }));
  const [ex, ey] = knPolar(a, KN_EYE.r);
  out.push(K.lineSvg(K.ring(ex, ey, 1.3, KN_EYE.z + 1, P, 14), { tone: "lo" }));
  return out.join("");
}

// Needles. part "front": the visible half, full length. "tips": the part above `from` of every
// needle the cam has raised over it.
export function knNeedles(camDeg, litIndex, P, K, part, from = KN_CYL.top) {
  const lines = [];
  const hooks = [];
  let lit = "";
  for (let i = 0; i < KN_N; i++) {
    const deg = knNeedleDeg(i);
    const lift = knLift(knWrap(deg - camDeg));
    const tip = KN_CYL.top + lift;
    const [x, y] = knPolar(deg, KN_NEEDLE_R);
    let z0;
    if (part === "front") {
      if (knFacing(deg, P) <= 0.05) continue;
      z0 = KN_CYL.z;
    } else {
      if (lift < 0.3 || tip <= from + 0.3) continue;
      z0 = from;
    }
    const d = K.segment([x, y, z0], [x, y, tip], P);
    if (i === litIndex && lift > 1) lit = K.lineSvg(d, { tone: "lit" }).replace("<path ", '<path style="stroke-width:1.3" ') + K.dotsSvg([K.iso([x, y, tip], P)], { size: 0.8, tone: "hi" });
    else {
      lines.push(d);
      if (part !== "front" || lift > 0.3) hooks.push(K.iso([x, y, tip], P));
    }
  }
  return K.lineSvg(lines.join(""), { tone: "mid" }) + K.dotsSvg(hooks, { size: 0.45, tone: "mid" }) + lit;
}

// The yarns: from each spool up into its gate slot. Through an open slot a yarn runs on down to the
// feeder eye on the carriage; at a closed slot it stops outside. The yarn the stitch takes runs on
// from the eye to the needle at the cam (lit).
export function knYarns(camDeg, feeds, open, take, P, K) {
  const [ex, ey] = knPolar(camDeg, KN_EYE.r);
  const eye = [ex, ey, KN_EYE.z + 1];
  const out = [];
  const ends = [];
  feeds.forEach((on, k) => {
    if (!on) return;
    const [gx, gy] = knGuide(k);
    const [sx, sy] = knSpool(k);
    const tone = knHue(k);
    if (open[k] > 0.5) out.push(K.lineSvg(K.segment([gx, gy, KN_GATE.top], eye, P), { tone }) + K.dotsSvg([K.iso([gx, gy, KN_GATE.top], P)], { size: 0.5, tone: "lo" }));
  });
  if (take >= 0) {
    const i = Math.round(camDeg / (360 / KN_N)) % KN_N;
    const [nx, ny] = knPolar(knNeedleDeg(i), KN_NEEDLE_R);
    const tip = KN_CYL.top + knLift(knWrap(knNeedleDeg(i) - camDeg));
    out.push(K.lineSvg(K.segment(eye, [nx, ny, tip], P), { tone: "lit" }));
  }
  out.push(K.dotsSvg([K.iso(eye, P)], { size: 0.6, tone: "hi" }));
  return out.join("");
}

// The yarns below the gate: from each spool up into its slot. Drawn before the gate block, which
// covers where each one enters.
export function knYarnsIn(feeds, P, K) {
  return feeds
    .map((on, k) => {
      if (!on) return "";
      const [gx, gy] = knGuide(k);
      const [sx, sy] = knSpool(k);
      return K.lineSvg(K.segment([sx, sy, KN_SPOOL_Z + 10], [gx, gy, KN_GATE.z + 2], P), { tone: knHue(k) });
    })
    .join("");
}

// The gate: a block on the mast with one slot per yarn, each with a shutter that slides across it.
// open[k] runs from 0 (shut) to 1 (open); the card at the reader sets it, through the cable in the mast.
export function knGate(open, P, K) {
  const g = KN_GATE;
  const a = KN_MAST.a;
  const out = [K.solidSvg(K.extrude(knSector(a, g.half, g.rIn, g.rOut, 8), g.z, g.top - g.z, P, { bevel: 0.4 }), { tone: "mid" })];
  const holes = [];
  KN_FEEDS.forEach((_, k) => {
    const [x, y] = knGuide(k);
    holes.push(K.ring(x, y, 1.1, g.top, P, 12));
  });
  out.push(K.lineSvg(holes.join(""), { tone: "lo" }));
  const shutters = KN_FEEDS.map((t, k) => {
    const off = t + 2.4 + open[k] * g.shut;
    const ring = [along(a, KN_MAST.r + 2.2, off - 1.4), along(a, KN_MAST.r + 4.8, off - 1.4), along(a, KN_MAST.r + 4.8, off + 1.4), along(a, KN_MAST.r + 2.2, off + 1.4)];
    const [cx, cy] = along(a, KN_MAST.r + 3.5, off);
    return { depth: cx + cy, svg: K.solidSvg(K.extrude(ring, g.top, 0.9, P), { tone: "mid", crease: "none" }) + K.lineSvg(K.ring(cx, cy, 0.7, g.top + 0.9, P, 10), { tone: knHue(k) }) };
  });
  shutters.sort((p, q) => p.depth - q.depth).forEach((sh) => out.push(sh.svg));
  return out.join("");
}

// Cut candidates: short ends that drop and fade, from the gate (stopped at the boundary) or from the
// feeder eye (let in, but not the one the stitch took).
export function knSnippets(list, P, K) {
  return list
    .map((s) => {
      const t = s.t;
      const [x0, y0, z0] = s.at;
      const x = x0 + Math.cos(s.tilt) * t * 3;
      const y = y0 + Math.sin(s.tilt) * t * 3;
      const z = z0 - t * t * 12;
      const d = K.segment([x, y, z], [x + Math.cos(s.tilt) * 1.6, y + Math.sin(s.tilt) * 1.6, z - 2.2], P);
      return `<g opacity="${(1 - t).toFixed(2)}">${K.lineSvg(d, { tone: s.tone || "lo", free: true })}</g>`;
    })
    .join("");
}

// The fabric: the record of every stitch that held, moving down into the tub as rounds are added.
// rows[0] is the newest finished round; each row lists "H", "A" or "x" (dropped) per needle.
export function knFabric(rows, phase, P, K) {
  const f = KN_FAB;
  const out = [];
  out.push(K.solidSvg(K.cylinder(0, 0, f.r, f.bottom, f.top - f.bottom, P, 48), { tone: "mid", crease: "none" }));
  const arcs = [];
  const hMarks = [];
  const aMarks = [];
  const ladders = [];
  for (let k = 0; k < rows.length; k++) {
    const z = f.top - (k + phase) * f.row - 1.5;
    if (z < f.bottom + 1 || z > f.top - 0.5) continue;
    arcs.push(K.sideArc(0, 0, f.r, z, P, 40));
    rows[k].forEach((g, i) => {
      if (!g) return;
      const deg = knNeedleDeg(i);
      if (knFacing(deg, P) < 0.18) return;
      const [x0, y0] = knPolar(deg - 2.6, f.r);
      const [x1, y1] = knPolar(deg, f.r);
      const [x2, y2] = knPolar(deg + 2.6, f.r);
      const d = K.segment([x0, y0, z + f.row * 0.8], [x1, y1, z], P) + K.segment([x1, y1, z], [x2, y2, z + f.row * 0.8], P);
      if (g === "H") hMarks.push(d);
      else if (g === "A") aMarks.push(d);
      else ladders.push(K.segment([x1, y1, z], [x1, y1, z + f.row], P));
    });
  }
  out.push(K.lineSvg(arcs.join(""), { tone: "faint" }));
  out.push(K.lineSvg(aMarks.join(""), { tone: KN_HUE[1] }));
  out.push(K.lineSvg(hMarks.join(""), { tone: KN_HUE[0] }));
  if (ladders.length) out.push(K.lineSvg(ladders.join(""), { tone: "hi" }));
  return out.join("");
}

// The pattern cards on their track, read at the inner end, punched at the outer end.
// cards[0] is the card at the reader. Each card shows its groups: a dot for "H", a ring for "A".
export function knCards(cards, shift, P, K) {
  const c = KN_CARD;
  const out = [];
  const items = [];
  cards.forEach((card, j) => {
    const r = c.r0 + (j + 1 - shift) * c.pitch;
    if (r < c.r0 - 0.5) return;
    const ring = knSector(c.a, (c.d / 2 / r) * (180 / Math.PI), r - c.w / 2, r + c.w / 2, 3);
    const svg = [K.solidSvg(K.extrude(ring, c.z, 0.7, P), { tone: "hi", crease: "lo" })];
    const dots = [];
    const rings = [];
    card.forEach((g, i) => {
      const row = i < 4 ? -1.4 : 1.4;
      const t = ((i % 4) - 1.5) * 2.8;
      const [x, y] = along(c.a, r + row, t);
      if (g === "H") dots.push(K.iso([x, y, c.z + 0.7], P));
      else rings.push(K.ring(x, y, 0.75, c.z + 0.7, P, 10));
    });
    svg.push(`<g class="kn-dot" data-hue="${KN_HUE[0]}">${K.dotsSvg(dots, { size: 0.65, tone: "hi" })}</g>`, K.lineSvg(rings.join(""), { tone: KN_HUE[1] }));
    items.push({ r, svg: svg.join("") });
  });
  // Far cards first: the track runs toward the back-right, so a larger r is further away.
  items.sort((a, b) => b.r - a.r).forEach((it) => out.push(it.svg));
  return out.join("");
}

export function knTubFill(level, P, K) {
  const z = 2.4 + level * (KN_TUB.top - 4);
  return K.lineSvg(K.ring(0, 0, KN_TUB.r - 3.2, z, P, 48), { tone: "faint" });
}
