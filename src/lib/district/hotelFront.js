// @ts-nocheck
// A hotel's street fronts drawn from what its photograph shows (src/lib/data/hotelFronts.ts): the storeys
// counted, the window bays counted on each front, the kind of window, the cornice, a corner turret. The walls
// that are not street fronts stay blank, as party walls are.
//
// It is a drawing of counts, not a survey: storeys are spaced evenly within the building's measured height
// (the ground floor a third taller), and windows are a standard size within their bay. The detail (sills,
// heads, sashes, string courses, shopfronts, dentils) is the usual detail of such a front, drawn as an
// elevation is drawn, not the building's own mouldings.
//
// it: { xz: ring in scene units (not closed), base: scene y of the ground, h: metres, front }
// Returns { lines, edges, tris } as flat position arrays: window lines, inked edges and white faces; and
// { skins }: for each front that carries the photograph, a fine grid of triangles over the wall with the
// photograph's coordinates at every corner, worked out through the four points that pin it to the wall.

const LIFT = 0.06;       // metres the lines sit off the wall
const GROUND = 1.35;     // the ground storey, as a multiple of an upper one

export function frontGeometry(it, mPerUnit) {
  const u = 1 / mPerUnit, F = it.front, ring = it.xz, H = it.h, n = ring.length;
  const lines = [], edges = [], tris = [], skins = [];
  if (!F || n < 3 || !(H > 0)) return { lines, edges, tris, skins };
  let area = 0;
  for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  const E = ring.map((a, i) => {
    const b = ring[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1e-9;
    const nx = sgn * dz / len, nz = -sgn * dx / len;
    // scene x is east and z is south, so a wall's compass bearing is read off its outward normal
    return { i, a, L: len * mPerUnit, tx: dx / len, tz: dz / len, nx, nz, bearing: (Math.atan2(nx, -nz) * 180 / Math.PI + 360) % 360 };
  });
  // A wall is measured up from the street in front of it: on sloping ground the building's base is the lowest
  // ground under it, and the street along a front can stand higher (`up`, metres), burying the foot of the wall.
  E.forEach((e) => {
    const b = ring[(e.i + 1) % n], g = it.ground;
    e.up = g ? Math.max(0, (Math.max(g(e.a[0], e.a[1]), g(b[0], b[1]), g((e.a[0] + b[0]) / 2, (e.a[1] + b[1]) / 2)) - it.base) * mPerUnit) : 0;
  });
  const P = (e, s, y, out = 0) => [e.a[0] + (e.tx * s + e.nx * out) * u, it.base + (y + e.up) * u, e.a[1] + (e.tz * s + e.nz * out) * u];
  const seg = (to, e, s0, y0, s1, y1, o0 = LIFT, o1 = o0) => to.push(...P(e, s0, y0, o0), ...P(e, s1, y1, o1));
  const rect = (e, s0, s1, y0, y1, out = LIFT) => { seg(lines, e, s0, y0, s1, y0, out); seg(lines, e, s1, y0, s1, y1, out); seg(lines, e, s1, y1, s0, y1, out); seg(lines, e, s0, y1, s0, y0, out); };
  const quad = (p, q, r, t) => tris.push(...p, ...q, ...r, ...p, ...r, ...t);
  // a round-headed opening: sill at y0, the arch springing at ys
  const arch = (e, c, w, y0, ys, out = LIFT) => {
    const r = w / 2;
    seg(lines, e, c - r, y0, c + r, y0, out); seg(lines, e, c - r, y0, c - r, ys, out); seg(lines, e, c + r, y0, c + r, ys, out);
    for (let k = 0; k < 8; k++) {
      const a0 = Math.PI * k / 8, a1 = Math.PI * (k + 1) / 8;
      seg(lines, e, c - r * Math.cos(a0), ys + r * Math.sin(a0), c - r * Math.cos(a1), ys + r * Math.sin(a1), out);
    }
  };

  // A photograph on a wall. The four corners of the wall in the photograph give the mapping from the wall
  // (s across, t up, each 0 to 1) to the photograph; it is not a straight stretch, since the photograph was
  // taken at an angle, so the wall is cut into a grid fine enough for straight pieces to follow it.
  const mapping = (photo) => {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = photo.quad;
    const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dy1 * dx2 || 1e-9, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, k = y3 - y0 + h * y3;
    return (s, t) => { const w = g * s + h * t + 1; return [(a * s + b * t + x0) / w, 1 - (d * s + k * t + y0) / w]; };
  };
  const skin = (e, photo, H) => {
    const at = mapping(photo);
    // seen from the street, does the wall run left to right from its first corner? (scene x east, z south)
    const fromLeft = e.tx * e.nz - e.tz * e.nx > 0;
    const [b0, b1] = photo.band || [0, 1], N = 20, pos = [], uv = [];
    const corner = (i, j) => { const s = i / N, t = j / N; return { p: P(e, (fromLeft ? s : 1 - s) * e.L, (b0 + (b1 - b0) * t) * H, LIFT * 0.6), q: at(s, t) }; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const A = corner(i, j), B = corner(i + 1, j), C = corner(i + 1, j + 1), D = corner(i, j + 1);
      [A, B, C, A, C, D].forEach((c) => { pos.push(...c.p); uv.push(...c.q); });
    }
    // an inked frame round the photograph
    const c00 = corner(0, 0).p, c10 = corner(N, 0).p, c11 = corner(N, N).p, c01 = corner(0, N).p;
    edges.push(...c00, ...c10, ...c10, ...c11, ...c11, ...c01, ...c01, ...c00);
    return { pos, uv };
  };

  // the storeys: even floors under the parapet, the ground floor taller
  const parapet = F.cornice ? 0.9 : 0.5, Hh = Math.max(1, H - parapet), S = Math.max(1, F.storeys);
  const pitch = Hh / (S - 1 + GROUND), floor = (k) => (k <= 0 ? 0 : (GROUND + k - 1) * pitch);

  // which walls are the fronts: those looking the way a front does, less any short return on the same side
  const diff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  const fronts = [];
  F.faces.forEach((f) => {
    const match = E.filter((e) => diff(e.bearing, f.toward) < 25);
    const longest = Math.max(0, ...match.map((e) => e.L));
    const kept = match.filter((e) => e.L >= longest * 0.4), total = kept.reduce((a, e) => a + e.L, 0);
    kept.forEach((e) => fronts.push({ e, f, bays: Math.max(1, Math.round(f.bays * e.L / total)), longest: e.L === longest }));
  });
  const isFront = new Set(fronts.map((x) => x.e.i));

  // ---- the vocabulary of the drawing: each opening with its sill and its head, as an elevation is drawn ----
  // a sill: a thin slab standing a little proud of the opening on both sides
  const sill = (e, s0, s1, y, out = LIFT) => { rect(e, s0 - 0.14, s1 + 0.14, y - 0.12, y, out); };
  // a flat head over an opening: a lintel course, a little wider than the opening
  const head = (e, s0, s1, y, out = LIFT) => { rect(e, s0 - 0.14, s1 + 0.14, y + 0.08, y + 0.26, out); };
  // a sash window: the frame, the meeting rail, and the glazing bar of a two-over-two sash where it is wide enough
  const sash = (e, s0, s1, y0, y1, out = LIFT) => {
    rect(e, s0, s1, y0, y1, out);
    seg(lines, e, s0, (y0 + y1) / 2, s1, (y0 + y1) / 2, out);
    if (s1 - s0 > 0.9) seg(lines, e, (s0 + s1) / 2, y0, (s0 + s1) / 2, y1, out);
  };
  // the ring of an arch alone, from one springing to the other
  const archRing = (e, c, r, ys, out = LIFT) => {
    for (let k = 0; k < 8; k++) {
      const a0 = Math.PI * k / 8, a1 = Math.PI * (k + 1) / 8;
      seg(lines, e, c - r * Math.cos(a0), ys + r * Math.sin(a0), c - r * Math.cos(a1), ys + r * Math.sin(a1), out);
    }
  };

  // A rounded front: the wall bowed out in a half-circle on its whole width, as the point of a flatiron is.
  // Around it, each upper floor has three lights; at the street, columns and a door, with a balcony over
  // them; at the top the cornice carries round. With a photograph, the picture is wrapped round the curve
  // instead: it was taken looking straight at the point, so across the picture is across the half-circle.
  const bow = (e, f, H, Hh, f1) => {
    const r = e.L / 2, N = 12, pk = S > 1 ? (Hh - f1) / (S - 1) : Hh, fl = (k) => (k <= 0 ? 0 : f1 + (k - 1) * pk);
    const at = (a, y, extra = 0) => P(e, r - (r + extra) * Math.cos(a), y, (r + extra) * Math.sin(a) * 0.95);
    const arc = (to, a0, a1, y, extra = LIFT) => { const m = Math.max(1, Math.round((a1 - a0) / (Math.PI / N))); for (let k = 0; k < m; k++) to.push(...at(a0 + (a1 - a0) * k / m, y, extra), ...at(a0 + (a1 - a0) * (k + 1) / m, y, extra)); };
    // the wall itself, and its cap
    for (let k = 0; k < N; k++) {
      const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N;
      quad(at(a0, 0), at(a1, 0), at(a1, H), at(a0, H));
      tris.push(...at(a0, H), ...at(a1, H), ...P(e, r, H, 0));
    }
    arc(edges, 0, Math.PI, 0, 0); arc(edges, 0, Math.PI, H, 0);
    if (f.photo) {
      // the photograph round the curve
      const map = mapping(f.photo), [b0, b1] = f.photo.band || [0, 1], M = 24, pos = [], uv = [];
      const fromLeft = e.tx * e.nz - e.tz * e.nx > 0;
      const corner = (i, j) => { const a = Math.PI * i / M, t = j / M, s = (1 - Math.cos(a)) / 2; return { p: at(fromLeft ? a : Math.PI - a, (b0 + (b1 - b0) * t) * H, LIFT * 0.6), q: map(s, t) }; };
      for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
        const A = corner(i, j), B = corner(i + 1, j), C = corner(i + 1, j + 1), D = corner(i, j + 1);
        [A, B, C, A, C, D].forEach((c) => { pos.push(...c.p); uv.push(...c.q); });
      }
      skins.push({ pos, uv });
      return;
    }
    // the street floor: columns round the curve, the door in the middle, a fascia over them
    if (S > 1) {
      arc(edges, 0, Math.PI, f1); arc(lines, 0, Math.PI, f1 - 0.6); arc(lines, 0, Math.PI, f1 - 0.72);
      [0.2, 0.4, 0.6, 0.8].forEach((q) => [-0.035, 0.035].forEach((w) => lines.push(...at(Math.PI * (q + w), 0, LIFT), ...at(Math.PI * (q + w), f1 - 0.72, LIFT))));
      [0.2, 0.4, 0.6, 0.8].forEach((q) => { arc(lines, Math.PI * (q - 0.045), Math.PI * (q + 0.045), 0.5); arc(lines, Math.PI * (q - 0.045), Math.PI * (q + 0.045), f1 - 1.0); });
      lines.push(...at(Math.PI * 0.455, 0, LIFT), ...at(Math.PI * 0.455, 2.4, LIFT), ...at(Math.PI * 0.545, 0, LIFT), ...at(Math.PI * 0.545, 2.4, LIFT));
      arc(lines, Math.PI * 0.455, Math.PI * 0.545, 2.4);
      // the balcony over the door: a rail on balusters
      arc(edges, Math.PI * 0.18, Math.PI * 0.82, f1, 0.9); arc(lines, Math.PI * 0.18, Math.PI * 0.82, f1 + 0.9, 0.9);
      for (let k = 0; k <= 16; k++) { const a = Math.PI * (0.18 + 0.64 * k / 16); lines.push(...at(a, f1, 0.9), ...at(a, f1 + 0.9, 0.9)); }
      [0.18, 0.82].forEach((q) => edges.push(...at(Math.PI * q, f1, 0), ...at(Math.PI * q, f1, 0.9)));
    }
    // each upper floor: a band at the floor, and three lights with their sills and heads
    for (let k = 1; k < S; k++) {
      const y0 = fl(k) + 0.85, y1 = Math.min(fl(k) + pk - 0.5, y0 + 1.9);
      if (k > 1) { arc(lines, 0, Math.PI, fl(k)); arc(lines, 0, Math.PI, fl(k) - 0.14); }
      [[0.1, 0.3], [0.36, 0.64], [0.7, 0.9]].forEach(([q0, q1]) => {
        const a0 = Math.PI * q0, a1 = Math.PI * q1;
        arc(lines, a0, a1, y0); arc(lines, a0, a1, y1); arc(lines, a0, a1, (y0 + y1) / 2);
        arc(lines, a0 - 0.03, a1 + 0.03, y0 - 0.12); arc(lines, a0 - 0.03, a1 + 0.03, y1 + 0.2);
        [a0, a1, (a0 + a1) / 2].forEach((a) => lines.push(...at(a, y0, LIFT), ...at(a, y1, LIFT)));
      });
    }
    // the cornice carried round
    if (F.cornice) {
      const heavy = F.cornice === "heavy", d = heavy ? 0.85 : 0.35, c0 = H - (heavy ? 0.95 : 0.6), c1 = H - (heavy ? 0.35 : 0.3);
      for (let k = 0; k < N; k++) {
        const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N;
        quad(at(a0, c0, d), at(a1, c0, d), at(a1, c1, d), at(a0, c1, d)); quad(at(a0, c0, 0), at(a1, c0, 0), at(a1, c0, d), at(a0, c0, d)); quad(at(a0, c1, 0), at(a1, c1, 0), at(a1, c1, d), at(a0, c1, d));
      }
      arc(edges, 0, Math.PI, c0, d); arc(edges, 0, Math.PI, c1, d); arc(lines, 0, Math.PI, c0 - 0.85);
      if (heavy) for (let k = 0; k <= 14; k++) { const a = Math.PI * k / 14; lines.push(...at(a, c0 - 0.75, LIFT), ...at(a, c0, d * 0.8)); }
    }
  };

  fronts.forEach(({ e, f, bays, longest }) => {
    const L = e.L, span = L / bays;
    // this wall's own height above its street, and its floors within it
    const H = it.h - e.up, Hh = Math.max(1, H - parapet), floor1 = GROUND * Hh / (S - 1 + GROUND);
    if (f.kind === "bow") { if (longest) bow(e, f, H, Hh, floor1); return; }
    // the photograph in place of drawing, squared up to the wall and laid a little off it; where it stops
    // short (a ground floor out of the picture, a front it does not show) the wall is drawn in line to meet it
    const band = f.photo ? (f.photo.band || [0, 1]).map((v) => v * H) : null;
    if (f.photo) { if (!longest) return; skins.push(skin(e, f.photo, H)); }
    const shown = (ya, yb) => !band || yb <= band[0] + 0.3 || ya >= band[1] - 0.3;
    // a photograph that starts a storey or more above the pavement marks where the ground floor ends
    const f1 = band && band[0] > 3 ? band[0] : floor1;
    const pk = S > 1 ? (Hh - f1) / (S - 1) : Hh, fl = (k) => (k <= 0 ? 0 : f1 + (k - 1) * pk);
    if (S > 1 && shown(f1 - 0.1, f1)) seg(edges, e, 0, f1, L, f1);        // the band over the shopfronts

    // ---- the ground floor: shopfronts between pilasters, each with its door, stallriser and transom lights ----
    if (S > 1 && shown(0, f1)) {
      const per = Math.max(1, Math.round(5.2 / span)), shops = Math.ceil(bays / per), pw = 0.24;
      const fascia = f1 - 0.6, glassTop = f1 > 4 ? f1 - 1.45 : fascia - 0.15, stall = 0.55;
      seg(lines, e, 0, fascia, L, fascia); seg(lines, e, 0, fascia - 0.1, L, fascia - 0.1);
      for (let q = 0; q <= shops; q++) {
        // a pilaster on each line between shops: its shaft, base and cap
        const s = Math.max(pw, Math.min(L - pw, Math.min(L, q * per * span)));
        seg(lines, e, s - pw, 0, s - pw, fascia - 0.1); seg(lines, e, s + pw, 0, s + pw, fascia - 0.1);
        seg(lines, e, s - pw - 0.06, 0.5, s + pw + 0.06, 0.5); seg(lines, e, s - pw - 0.06, fascia - 0.3, s + pw + 0.06, fascia - 0.3);
      }
      for (let q = 0; q < shops; q++) {
        const s0 = Math.max(pw, q * per * span) + pw, s1 = Math.min(L - pw, (q + 1) * per * span) - pw;
        if (s1 - s0 < 1.6) continue;
        const c = (s0 + s1) / 2, dw = Math.min(1.1, (s1 - s0) * 0.3), door = Math.min(2.3, glassTop);
        // the door in the middle, glass on either side over a stallriser
        rect(e, c - dw / 2, c + dw / 2, 0.05, door);
        rect(e, c - dw / 2 + 0.12, c + dw / 2 - 0.12, 1.0, door - 0.15);
        [[s0, c - dw / 2 - 0.12], [c + dw / 2 + 0.12, s1]].forEach(([g0, g1]) => {
          if (g1 - g0 < 0.5) return;
          rect(e, g0, g1, stall, glassTop);
          seg(lines, e, g0, stall - 0.12, g1, stall - 0.12); seg(lines, e, g0, 0.12, g1, 0.12);
          if (g1 - g0 > 2.4) seg(lines, e, (g0 + g1) / 2, stall, (g0 + g1) / 2, glassTop);
        });
        // a row of small lights over it, under the fascia
        if (glassTop < fascia - 0.5) {
          const t0 = glassTop + 0.1, t1 = fascia - 0.2, n = Math.max(2, Math.round((s1 - s0) / 0.7));
          rect(e, s0, s1, t0, t1);
          for (let k = 1; k < n; k++) seg(lines, e, s0 + (s1 - s0) * k / n, t0, s0 + (s1 - s0) * k / n, t1);
        }
      }
    }

    // ---- the upper floors ----
    const upper = S > 1 && shown(f1, Hh);
    for (let k = 2; k < S; k++) if (shown(fl(k) - 0.2, fl(k))) { seg(lines, e, 0, fl(k), L, fl(k)); seg(lines, e, 0, fl(k) - 0.14, L, fl(k) - 0.14); }   // a string course at each floor
    for (let j = 0; j < bays; j++) {
      const c = span * (j + 0.5);
      if (f.kind === "oriel" && upper) {
        // a bay window standing out from the wall up all the upper floors, its sides canted
        const bw = Math.min(span * 0.62, 3.4), d = 0.75, cant = 0.4, y0 = f1 + 0.15, y1 = Hh - 0.15;
        const s = [c - bw / 2, c - bw / 2 + cant, c + bw / 2 - cant, c + bw / 2], o = [0, d, d, 0];
        const lo = s.map((v, k) => P(e, v, y0, o[k])), hi = s.map((v, k) => P(e, v, y1, o[k]));
        for (let k = 0; k < 3; k++) quad(lo[k], lo[k + 1], hi[k + 1], hi[k]);
        quad(lo[0], lo[1], lo[2], lo[3]); quad(hi[0], hi[1], hi[2], hi[3]);
        for (let k = 0; k < 4; k++) edges.push(...lo[k], ...hi[k]);
        for (let k = 0; k < 3; k++) { edges.push(...lo[k], ...lo[k + 1], ...hi[k], ...hi[k + 1]); }
        for (let k = 1; k < S; k++) {
          const a = fl(k) + 0.85, b = Math.min(fl(k) + pk - 0.45, a + 1.8);
          sash(e, s[1] + 0.12, s[2] - 0.12, a, b, d + LIFT);
          // the canted side lights, and the panel under each window
          seg(lines, e, s[0] + 0.1, a, s[1] - 0.08, a, 0.2 + LIFT, d - 0.1); seg(lines, e, s[0] + 0.1, b, s[1] - 0.08, b, 0.2 + LIFT, d - 0.1);
          seg(lines, e, s[3] - 0.1, a, s[2] + 0.08, a, 0.2 + LIFT, d - 0.1); seg(lines, e, s[3] - 0.1, b, s[2] + 0.08, b, 0.2 + LIFT, d - 0.1);
          rect(e, s[1] + 0.2, s[2] - 0.2, fl(k) + 0.15, a - 0.15, d + LIFT);
          for (let q = 0; q < 3; q++) seg(lines, e, s[q], fl(k), s[q + 1], fl(k), o[q] + LIFT, o[q + 1] + LIFT);
        }
        continue;
      }
      for (let k = 1; k < S; k++) {
        if (!shown(fl(k), fl(k) + pk)) continue;
        const y0 = fl(k) + 0.85, y1 = Math.min(fl(k) + pk - 0.5, y0 + 1.9);
        if (y1 - y0 < 0.6) continue;
        if (f.kind === "pair") {
          const w = Math.min(1.0, span * 0.3), g = 0.12;
          sash(e, c - g - w, c - g, y0, y1); sash(e, c + g, c + g + w, y0, y1);
          sill(e, c - g - w, c + g + w, y0); head(e, c - g - w, c + g + w, y1);
        } else if (f.kind === "triple") {
          const w = Math.min(0.95, span * 0.26), g = 0.14;
          [-1, 0, 1].forEach((q) => sash(e, c + q * (w + g) - w / 2, c + q * (w + g) + w / 2, y0, y1));
          sill(e, c - 1.5 * w - g, c + 1.5 * w + g, y0); head(e, c - 1.5 * w - g, c + 1.5 * w + g, y1);
        } else if (f.kind === "wide") {
          const w = span * 0.72;
          rect(e, c - w / 2, c + w / 2, y0, y1);
          seg(lines, e, c - w / 6, y0, c - w / 6, y1); seg(lines, e, c + w / 6, y0, c + w / 6, y1);
          seg(lines, e, c - w / 2, y1 - 0.45, c + w / 2, y1 - 0.45);
          sill(e, c - w / 2, c + w / 2, y0); head(e, c - w / 2, c + w / 2, y1);
        } else if (f.kind === "arched") {
          // a round-headed sash under a brick arch with its keystone
          const w = Math.min(1.15, span * 0.62), ys = y1 - w / 2;
          arch(e, c, w, y0, ys);
          archRing(e, c, w / 2 + 0.17, ys);
          seg(lines, e, c - w / 2 - 0.17, ys, c - w / 2, ys); seg(lines, e, c + w / 2, ys, c + w / 2 + 0.17, ys);
          seg(lines, e, c - 0.07, y1, c - 0.1, y1 + 0.17); seg(lines, e, c + 0.07, y1, c + 0.1, y1 + 0.17);
          seg(lines, e, c - w / 2, ys, c + w / 2, ys); seg(lines, e, c - w / 2, (y0 + ys) / 2, c + w / 2, (y0 + ys) / 2);
          sill(e, c - w / 2, c + w / 2, y0);
        } else {
          const w = Math.min(1.25, span * 0.55);
          sash(e, c - w / 2, c + w / 2, y0, y1);
          sill(e, c - w / 2, c + w / 2, y0); head(e, c - w / 2, c + w / 2, y1);
        }
      }
      // a tall arch round the bay, from the first floor to below the top storey
      if (f.giant && S > 3 && upper) {
        const w = span * 0.84, top = fl(S - 1) - 0.25, ys = Math.max(f1 + 0.6, top - w / 2);
        arch(e, c, w, f1 + 0.2, ys); archRing(e, c, w / 2 + 0.2, ys);
      }
    }
    if (upper) {
      // brick piers between the bays, or a plain strip at each end of the front
      if (f.piers) for (let j = 0; j <= bays; j++) {
        const s = span * j, half = Math.min(0.32, span * 0.08);
        if (j > 0) seg(lines, e, s - half, f1, s - half, Hh);
        if (j < bays) seg(lines, e, s + half, f1, s + half, Hh);
      } else if (f.kind !== "oriel" && L > 6) { seg(lines, e, 0.35, f1, 0.35, Hh); seg(lines, e, L - 0.35, f1, L - 0.35, Hh); }
    }
    // ---- the top of the wall ----
    if (!shown(Hh, H)) return;
    if (!F.cornice) { seg(lines, e, 0, H - 0.25, L, H - 0.25); seg(lines, e, 0, Hh, L, Hh); return; }   // a coping and a band under it
    // the cornice: a shelf standing out from the top of the wall, on brackets where it is a heavy one
    {
      const heavy = F.cornice === "heavy", d = heavy ? 0.85 : 0.35, y0 = H - (heavy ? 0.95 : 0.6), y1 = H - (heavy ? 0.35 : 0.3);
      const prev = E[(e.i + n - 1) % n], next = E[(e.i + 1) % n];
      const s0 = isFront.has(prev.i) ? -d : 0, s1 = L + (isFront.has(next.i) ? d : 0);
      const A = P(e, s0, y0, 0), B = P(e, s1, y0, 0), C = P(e, s1, y0, d), D = P(e, s0, y0, d);
      const A2 = P(e, s0, y1, 0), B2 = P(e, s1, y1, 0), C2 = P(e, s1, y1, d), D2 = P(e, s0, y1, d);
      quad(A, B, C, D); quad(D, C, C2, D2); quad(A2, B2, C2, D2); quad(A, D, D2, A2); quad(B, C, C2, B2);
      edges.push(...D, ...C, ...D2, ...C2, ...A, ...D, ...D, ...D2, ...D2, ...A2, ...B, ...C, ...C, ...C2, ...C2, ...B2, ...A, ...B);
      if (heavy) {
        // brackets under the shelf, and the frieze they stand on
        const m = Math.max(2, Math.round(L / 1.3));
        for (let j = 0; j <= m; j++) { const s = L * j / m; seg(lines, e, s, y0 - 0.75, s, y0, LIFT, d * 0.8); seg(lines, e, s, y0 - 0.75, s, y0 - 0.2, LIFT, LIFT); }
        seg(lines, e, 0, y0 - 0.85, L, y0 - 0.85);
      } else {
        // a course of dentils under the shelf
        const m = Math.max(4, Math.round(L / 0.45));
        seg(lines, e, 0, y0 - 0.22, L, y0 - 0.22); seg(lines, e, 0, y0 - 0.34, L, y0 - 0.34);
        for (let j = 0; j <= m; j++) seg(lines, e, L * j / m, y0 - 0.22, L * j / m, y0);
      }
    }
  });

  // a turret on the corner where two fronts meet: an eight-sided drum up the upper floors, under a pointed roof
  if (F.turret && S > 1) {
    const corner = E.find((e) => isFront.has(e.i) && isFront.has((e.i + n - 1) % n));
    if (corner) {
      const [cx, cz] = corner.a, r = 2.3, re = 2.75, y0 = floor(1), y1 = H + 0.8, ya = y1 + 5.5;
      const at = (rad, k, y) => [cx + Math.cos(Math.PI * k / 4 + Math.PI / 8) * rad * u, it.base + y * u, cz + Math.sin(Math.PI * k / 4 + Math.PI / 8) * rad * u];
      const apex = [cx, it.base + ya * u, cz];
      for (let k = 0; k < 8; k++) {
        const a = at(r, k, y0), b = at(r, k + 1, y0), a1 = at(r, k, y1), b1 = at(r, k + 1, y1), ea = at(re, k, y1), eb = at(re, k + 1, y1);
        quad(a, b, b1, a1); tris.push(...a, ...b, cx, it.base + y0 * u, cz); tris.push(...ea, ...eb, ...apex); tris.push(...ea, ...eb, cx, it.base + y1 * u, cz);
        edges.push(...a, ...a1, ...a, ...b, ...ea, ...eb, ...ea, ...apex);
        for (let s = 1; s < S; s++) {
          const f0 = floor(s);
          if (s > 1) lines.push(...at(r + LIFT, k, f0), ...at(r + LIFT, k + 1, f0));
          // one light in each face of the drum
          const w0 = at(r + LIFT, k + 0.22, f0 + 0.85), w1 = at(r + LIFT, k + 0.78, f0 + 0.85), top = Math.min(pitch - 0.45, 2.7) * u;
          lines.push(...w0, ...w1, w0[0], w0[1] + top - 0.85 * u, w0[2], w1[0], w1[1] + top - 0.85 * u, w1[2], ...w0, w0[0], w0[1] + top - 0.85 * u, w0[2], ...w1, w1[0], w1[1] + top - 0.85 * u, w1[2]);
        }
      }
    }
  }
  return { lines, edges, tris, skins };
}

// The compass bearing a camera should stand off at to see the fronts: toward the one front, or between two.
export function frontBearing(front) {
  const faces = front.faces.slice().sort((a, b) => b.bays - a.bays).slice(0, 2);
  let x = 0, y = 0;
  faces.forEach((f) => { x += Math.sin(f.toward * Math.PI / 180); y += Math.cos(f.toward * Math.PI / 180); });
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}
