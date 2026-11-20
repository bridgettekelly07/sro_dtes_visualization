// @ts-nocheck
// Copied from sro_floorplate_optimizer (frontend/src/lib/district3d.js) at commit e506b7b, then changed
// here. This app's changes are marked "base map:" and are:
//   - setPlain(): SROs drawn like any other building, with no picking, hover or names
//   - the railways modelled as a low raised bed with two inked rails, in place of a faint ground line
//   - the grid over the water reads --m3-grid-water when it is set
//   - setBare(): the land before the city, with no buildings, streets, parks or rail
//   - flyTo(): an eased camera move to a place, for telling a story stop by stop
//   - setMarks(): named sites and dashed paths drawn on the ground, with labels
//   - contour lines are not drawn across water, for when the shoreline is older than the contours
//   - the land shaded by its slope, as if lit from the north-west, when --m3-relief is set, the tone laid on
//     like charcoal: uneven, in strokes, and broken by the paper's tooth (--m3-relief-grain)
//   - street names are drawn in DIN 2014 Narrow
//   - lines in the water (--m3-water-line): either the sea bed's depth contours from the hydrographic survey
//     (data.depth), or lines that follow the shore at widening distances, a drawing convention
//     (--m3-water-line-kind)
//   - the grid's weight can be reduced (--m3-grid-w)
//   - setGroundText(): lettering laid flat on the ground along a line, such as a shoreline's name
//   - setFine(): fine annotation lines on the ground, solid, dashed or dotted, such as rings and leaders
//   - setBurn() / setBurnReach(): a charcoal smudge over an area of ground, spreading out from a point
//   - setLand(): swap the land-and-water mask for another time's shoreline
//   - setDotted(): lines drawn on the ground as rows of dots, such as today's shoreline over an older one
//   - setModels(): small buildings made of simple parts (gabled sheds, hipped blocks, boxes, decks on legs)
// The district in 3D: the same footprints, streets and Appendix B buildings
// as the map, raised to the height the City's 2009 LiDAR recorded for each
// footprint. Framework-free: the Svelte component owns the element and
// feeds this class its data, colours and selection.
import * as THREE from "three";
import { css, hexOf } from "./colours.js";
import { paintGround, waterWash } from "./groundTexture.js";
import { shoreDistance, shoreOutline, shoreField } from "./terrain.js";
import { landmarkOf, triangleEdges, roundCentre } from "./landmarks.js";
import { BRIDGES, DECK, bridgeChains, arcLengths, deckHeights, ribbon, pillar, along, aboveRuns, densify } from "./bridges.js";
import { MARINAS, SAILS, boatBoxes, longAxis, sailRow } from "./harbour.js";
import { stadiumGeometry } from "./stadium.js";
import { wheelZoom, EASE } from "./zoom.js";
import { FLOOR_M, NOMINAL_H, floorsOf, guessedHeight, GUESS_STOREYS } from "./typicalFloor.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { facadeLines, storeyLines } from "./facade.js";
import { frontGeometry } from "./hotelFront.js";
import { curbRuns } from "./curbs.js";
import { paintCanopyAtlas, CANOPY_SEEDS, FASTIGIATE, drawnHeight } from "./canopy.js";
import { shadePark, toneOf, prng as parkPrng, PARK, hex as hexRgb, mix as mixRgb } from "./parkShade.js";
import { arterialPicks, segInside, ROAD } from "./projection.js";
import { blockGrid, hidden } from "./occlusion.js";

const NAME_PX = 10, NAME_S = 4;   // street-name type size on screen, and the texture oversampling


// Graphite: a coarse break-up along the line's length plus a fine speckle in
// screen pixels, so the stroke reads as deposited on a tooth, not drawn by a pen.
const GRAIN_GLSL = `
uniform float uGrain, uGrainAmt;
varying vec3 vGrainPos;
float gHash( vec3 p ) { p = fract( p * 0.3183099 + vec3( 0.1, 0.2, 0.3 ) ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float gNoise( vec3 p ) {
  vec3 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( gHash( i ), gHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( gHash( i + vec3( 0, 1, 0 ) ), gHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( gHash( i + vec3( 0, 0, 1 ) ), gHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( gHash( i + vec3( 0, 1, 1 ) ), gHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
float graphite( vec3 p, vec2 px ) {
  float along = gNoise( p ) * 0.6 + gNoise( p * 3.1 ) * 0.4;        // pressure varying along the stroke
  float speck = gHash( vec3( floor( px / 1.5 ), 7.0 ) );              // the tooth of the paper
  float g = along * 0.65 + speck * 0.35;
  return smoothstep( 0.22, 0.62, g ) * 1.15;
}
`;

// procedural windows on the DTES buildings (facade.js): off for now
// base map: noise for the charcoal shading of the land: a hash, and smooth value noise built on it
const CHARCOAL_GLSL = `
uniform float uMetres;
uniform float uTooth;
float cHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float cNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cHash(i), cHash(i + vec2(1.0, 0.0)), f.x), mix(cHash(i + vec2(0.0, 1.0)), cHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`;
const WINDOWS = false;
const SHORE_FLAT = 30;   // metres inland held at sea level: the drawn shoreline wanders this far from the mask's edge
const SHORE_RISE = 60;   // metres over which the terrain then rises to its recorded height

export class District3D {
  // wrap: the element the canvas goes in; labels: the overlay for building names
  constructor(wrap, labels, { onSelect, onHover }) {
    this.wrap = wrap; this.labels = labels;
    this.onSelect = onSelect; this.onHover = onHover;
    this.on = false; this.ready = false; this.dirty = true; this.needFoot = true;
    this.hover = null; this.mPerUnit = 1; this.framed = false;
    this.sel = null; this.colourOf = () => "#888888";
    this.data = null; this.proj = null;
    this.plain = false;   // base map: see setPlain
  }
  // base map: when on, an SRO is drawn exactly as its neighbours are and nothing can be hovered or picked
  setPlain(on) { this.plain = !!on; }
  // base map: when on, only the land, water and contours are drawn: the ground before the city
  setBare(on) { on = !!on; if (on !== !!this.bare) { this.bare = on; this.needFoot = true; } }
  // base map: streets filled in white on the bare land: each centreline ([lon, lat] points) as a flat
  // ribbon `widthM` metres wide lying on the ground, with a round pad at each point so the joins and
  // crossings close up. Rebuilt only when given a different list.
  // The outline is the fill's own edge: a line down each side of every street, drawn at the fill's level so
  // the fill hides it wherever another street crosses, leaving only the outside edge of the whole.
  setStreetFill(lines, widthM = 20, style = null) {
    if (!this.ready || !this.proj) return;
    if (this.streetFillOf === lines) return;
    this.streetFillOf = lines;
    this.clear(this.gStreetFill);
    if (!lines || !lines.length) { this.dirty = true; return; }
    if (!this.matStreetFill) this.matStreetFill = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const u = 1 / this.mPerUnit, hw = (widthM / 2) * u, pos = [], N = 10, rim = [];
    const Y = (x, z) => this.yAt(x, z) + 0.15 * u;
    lines.forEach((line) => {
      const P = line.map(([lon, lat]) => [this.proj.x(lon), this.proj.y(lat)]);
      for (let i = 1; i < P.length; i++) {
        const [ax, az] = P[i - 1], [bx, bz] = P[i], l = Math.hypot(bx - ax, bz - az);
        if (!l) continue;
        // long stretches are cut into pieces, so the ribbon follows the ground's rise and fall
        const n = Math.max(1, Math.ceil(l / (25 * u))), nx = -(bz - az) / l * hw, nz = (bx - ax) / l * hw;
        for (let k = 0; k < n; k++) {
          const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
          const y0 = Y(x0, z0), y1 = Y(x1, z1);
          pos.push(x0 + nx, y0, z0 + nz, x1 + nx, y1, z1 + nz, x1 - nx, y1, z1 - nz, x0 + nx, y0, z0 + nz, x1 - nx, y1, z1 - nz, x0 - nx, y0, z0 - nz);
          // the edge line: just outside the fill and a hair under it, so only a crossing street's fill hides it
          const ex = nx * (1 + 0.3 * u / hw), ez = nz * (1 + 0.3 * u / hw), d = 0.04 * u;
          rim.push(x0 + ex, y0 - d, z0 + ez, x1 + ex, y1 - d, z1 + ez, x0 - ex, y0 - d, z0 - ez, x1 - ex, y1 - d, z1 - ez);
        }
      }
      P.forEach(([x, z]) => {
        const y = Y(x, z);
        for (let i = 0; i < N; i++) {
          const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
          pos.push(x, y, z, x + Math.cos(a0) * hw, y, z + Math.sin(a0) * hw, x + Math.cos(a1) * hw, y, z + Math.sin(a1) * hw);
        }
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.gStreetFill.add(new THREE.Mesh(geo, this.matStreetFill));
    if (style) {
      if (this.matStreetRim) this.matStreetRim.dispose();
      this.matStreetRim = new LineMaterial({ color: style.colour || "#3b3b3b", linewidth: (style.width || 0.5) * 2, transparent: true, opacity: style.opacity == null ? 0.6 : style.opacity });
      this.matStreetRim.resolution.set(this.wrap.clientWidth || 600, this.wrap.clientHeight || 400);
      const l = this.fatLines(new Float32Array(rim), this.matStreetRim);
      if (l) this.gStreetFill.add(l);
    }
    this.dirty = true;
  }
  // base map: people as dots on the ground, each { lon, lat, r } with r in metres, in a see-through grey.
  // Redrawn whole on every call, so a card can move them each frame.
  setDots(list) {
    if (!this.ready || !this.proj) return;
    this.clear(this.gDots);
    if (!list || !list.length) { this.dirty = true; return; }
    if (!this.matDot) this.matDot = new THREE.MeshBasicMaterial({ color: 0x1f1f1f, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
    const u = 1 / this.mPerUnit, pos = [], N = 14;
    list.forEach(({ lon, lat, r }) => {
      const x = this.proj.x(lon), z = this.proj.y(lat), y = this.yAt(x, z) + 1.2 * u, R = r * u;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        pos.push(x, y, z, x + Math.cos(a0) * R, y, z + Math.sin(a0) * R, x + Math.cos(a1) * R, y, z + Math.sin(a1) * R);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const mesh = new THREE.Mesh(geo, this.matDot);
    mesh.renderOrder = 5;
    this.gDots.add(mesh);
    this.dirty = true;
  }
  // base map: when on, the False Creek bridges are modelled on the bare land too
  setBridges(on) {
    on = !!on;
    if (on === !!this.bridgesOn) return;
    this.bridgesOn = on;
    if (!this.bare || !this.ready || !this.data) return;
    if (on) this.buildBridges(); else this.clear(this.gBridges);
    this.dirty = true;
  }
  // base map: sites and paths to mark on the ground.
  //   sites: [{ label, lon, lat }]   paths: dashed lines, [[[lon, lat], ...], ...]   lines: solid lines, same shape
  setMarks(sites, paths, lines, accent) { this.marks = { sites: sites || [], paths: paths || [], lines: lines || [], accent: accent || [] }; if (this.ready) { this.buildMarks(); this.dirty = true; } }
  // base map: buildings drawn from simple parts, each list standing at a place on the ground.
  //   models: [{ lon, lat, bearing (radians, turning the whole group anticlockwise), parts: [...] }]
  //   a part: { kind: "gable" | "hip" | "box", x, y (metres east and north of the place, before bearing),
  //             w, d (footprint; the ridge runs along w), rot (degrees, about the part's own centre),
  //             eave, ridge (heights, for gable and hip), h (for box), z0 (height of its underside),
  //             legs (for a raised box: spacing in metres of posts down to the ground), drop (how far
  //             the posts reach down, if not z0) }
  //   a model may also give minBase: the lowest level, in metres above the sea, that any part stands at
  setModels(models) { this.models = models || []; if (this.ready) { this.buildModels(); this.dirty = true; } }
  // base map: lines in the water that follow the shore, the first close in and each one further out than the
  // last, as water was lined on engraved maps. They show distance from the shore, not depth: the City's data
  // has only a handful of depth contours, and none where the water has since been filled.
  buildWaterLines() {
    if (!this.waterLine || !this.shore || this.waterKind !== "shore") return;
    const t = this.data.terrain, proj = this.proj, bb = t.bbox;
    const x0 = proj.x(bb[0]), x1 = proj.x(bb[2]), z0 = proj.y(bb[3]), z1 = proj.y(bb[1]);
    const STEP = 12 / this.mPerUnit, nx = Math.ceil((x1 - x0) / STEP), nz = Math.ceil((z1 - z0) / STEP);
    // metres from the nearest land, sampled every 12 m
    const d = new Float32Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) d[j * (nx + 1) + i] = this.shore.at(x0 + i * STEP, z0 + j * STEP);
    const LEVELS = [35, 85, 150, 230, 330, 450, 600, 780, 1000, 1260], y = 0.04 / this.mPerUnit, pos = [], dist = [];
    // marching squares: where a level crosses a cell, join the crossings on its edges
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = d[j * (nx + 1) + i], b = d[j * (nx + 1) + i + 1], c = d[(j + 1) * (nx + 1) + i + 1], e = d[(j + 1) * (nx + 1) + i];
      const lo = Math.min(a, b, c, e), hi = Math.max(a, b, c, e);
      if (hi < LEVELS[0] || lo > LEVELS[LEVELS.length - 1]) continue;
      const X = x0 + i * STEP, Z = z0 + j * STEP;
      for (const L of LEVELS) {
        if (L <= lo || L > hi) continue;
        const pts = [], cross = (p, q, px, pz, qx, qz) => { if ((p < L) !== (q < L)) { const k = (L - p) / (q - p); pts.push(px + (qx - px) * k, pz + (qz - pz) * k); } };
        cross(a, b, X, Z, X + STEP, Z); cross(b, c, X + STEP, Z, X + STEP, Z + STEP);
        cross(c, e, X + STEP, Z + STEP, X, Z + STEP); cross(e, a, X, Z + STEP, X, Z);
        for (let k = 0; k + 3 < pts.length; k += 4) {
          pos.push(pts[k], y, pts[k + 1], pts[k + 2], y, pts[k + 3]);
          dist.push(0, Math.hypot(pts[k + 2] - pts[k], pts[k + 3] - pts[k + 1]));   // each piece starts its own dashes
        }
      }
    }
    if (!pos.length) return;
    const g = this.flatGeo(pos), u = 1 / this.mPerUnit;
    g.setAttribute("lineDistance", new THREE.Float32BufferAttribute(dist, 1));
    this.matWaterLine.dashSize = 2.4 * u; this.matWaterLine.gapSize = 1.6 * u;   // the same dash as the land's contours
    this.gGround.add(new THREE.LineSegments(g, this.matWaterLine));
  }
  // base map: lettering laid flat on the ground, following a line. labels: [{ text, lines: [[[lon, lat], ...], ...],
  // near: [lon, lat] (the lettering starts at the point of the lines nearest this), size (the height of the type
  // in metres), offset (metres to the left of the direction of reading, negative to the right), colour, tracking }]
  // The lettering reads eastward along the line, so from a camera in the south it reads left to right,
  // unless the label sets `forward`, when it follows the line in the order its points are given.
  setGroundText(labels) { this.groundText = labels || []; this.textBuilt = false; if (this.ready && this.data && this.proj) { this.buildGroundText(); this.dirty = true; } }
  glyphs(chars) {
    // one square cell per character, white on clear, with how far each character advances (in ems)
    const F = 96, cell = 128, cols = 8, list = [...new Set(chars)], rows = Math.ceil(list.length / cols);
    const cv = document.createElement("canvas"); cv.width = cell * cols; cv.height = cell * rows;
    const ctx = cv.getContext("2d");
    ctx.font = "700 " + F + "px 'din-2014', 'DIN 2014', 'DIN Alternate', sans-serif";
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    const at = {};
    list.forEach((ch, k) => {
      const cx = (k % cols) * cell, cy = Math.floor(k / cols) * cell;
      ctx.fillText(ch, cx + cell / 2, cy + cell * 0.74);
      at[ch] = { u0: cx / cv.width, u1: (cx + cell) / cv.width, v0: 1 - (cy + cell) / cv.height, v1: 1 - cy / cv.height, adv: ctx.measureText(ch).width / F };
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    return { tex, at, em: cell / F };   // a cell is `em` ems across
  }
  buildGroundText() {
    this.gText.children.slice().forEach((o) => { this.gText.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    this.textBuilt = true;
    const labels = this.groundText || [];
    if (!labels.length) return;
    const proj = this.proj, u = 1 / this.mPerUnit;
    labels.forEach((lb) => {
      // the point of the lines nearest the anchor, and the line it is on
      const ax = proj.x(lb.near[0]), az = proj.y(lb.near[1]);
      let best = null;
      lb.lines.forEach((line) => line.forEach((p, i) => { const dd = Math.hypot(proj.x(p[0]) - ax, proj.y(p[1]) - az); if (!best || dd < best.d) best = { d: dd, line, i }; }));
      if (!best) return;
      const n = best.line.length, closed = n > 2 && best.line[0][0] === best.line[n - 1][0] && best.line[0][1] === best.line[n - 1][1];
      const P = (i) => { const p = best.line[closed ? ((i % (n - 1)) + (n - 1)) % (n - 1) : Math.max(0, Math.min(n - 1, i))]; return [proj.x(p[0]), proj.y(p[1])]; };
      // read eastward: walk the line in whichever direction heads east from here
      const dir = lb.forward || P(best.i + 12)[0] - P(best.i - 12)[0] >= 0 ? 1 : -1;   // `forward`: follow the line as it is given
      const g = this.glyphs(lb.text), em = lb.size * u, track = (lb.tracking == null ? 0.14 : lb.tracking) * em, lift = 0.6 * u;
      const pos = [], uv = [];
      let i = best.i, [px, pz] = P(i), walked = 0, target = 0;
      // the place on the line `target` units along from the start, and the direction of the line there
      const along = () => {
        for (let guard = 0; guard < 20000; guard++) {
          const [qx, qz] = P(i + dir), len = Math.hypot(qx - px, qz - pz);
          if (len > 0 && walked + len >= target) { const k = (target - walked) / len; return { x: px + (qx - px) * k, z: pz + (qz - pz) * k, tx: (qx - px) / len, tz: (qz - pz) / len }; }
          walked += len; i += dir; px = qx; pz = qz;
          if (!closed && (i <= 0 || i >= n - 1)) return null;
        }
        return null;
      };
      for (const ch of lb.text) {
        const gl = g.at[ch], adv = gl.adv * em;
        target += adv / 2;
        const c = along();
        if (!c) break;
        if (ch !== " ") {
          // the cell lies flat: its width along the line, its height to the left of the reading direction
          const ux = c.tz, uz = -c.tx, w = g.em * em / 2, h = g.em * em / 2, off = lb.offset * u || 0;
          const cx = c.x + ux * (off + h * 0.48), cz = c.z + uz * (off + h * 0.48);
          const corner = (sx, sy) => { const x = cx + c.tx * w * sx + ux * h * sy, z = cz + c.tz * w * sx + uz * h * sy; return [x, this.yAt(x, z) + lift, z]; };
          const bl = corner(-1, -1), br = corner(1, -1), tr = corner(1, 1), tl = corner(-1, 1);
          pos.push(...bl, ...br, ...tr, ...bl, ...tr, ...tl);
          uv.push(gl.u0, gl.v0, gl.u1, gl.v0, gl.u1, gl.v1, gl.u0, gl.v0, gl.u1, gl.v1, gl.u0, gl.v1);
        }
        target += adv / 2 + track;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const mat = new THREE.MeshBasicMaterial({ map: g.tex, color: lb.colour || "#1f1f1f", transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      this.gText.add(new THREE.Mesh(geo, mat));
    });
  }
  // base map: fine annotation lines laid on the ground. groups: [{ lines: [[[lon, lat], ...], ...],
  // dash: [on, every] in metres (leave out for a solid line), width (pixels), colour, opacity }]
  // base map: charcoal over an area of ground. burn: { poly: [[lon, lat], ...], from: [lon, lat], colour, opacity }
  // or null. The smudge shows only within `reach` metres of `from`, with a ragged, grainy edge; setBurnReach
  // moves that edge without rebuilding anything, so the burn can be made to spread.
  setBurn(burn) { this.burn = burn || null; if (this.ready && this.data && this.proj) { this.buildBurn(); this.dirty = true; } }
  setBurnReach(m) { if (this.burnMat) { this.burnMat.uniforms.uReach.value = m; this.dirty = true; } }
  setBurnOpacity(o) { if (this.burnMat) { this.burnMat.uniforms.uOpacity.value = o; this.dirty = true; } }
  buildBurn() {
    this.clear(this.gBurn); this.burnMat = null; this.burnBuilt = true;
    const b = this.burn;
    if (!b || !b.poly || b.poly.length < 3) return;
    const proj = this.proj, u = 1 / this.mPerUnit, cell = 2.5 * u, lift = 0.9 * u;
    const P = b.poly.map(([lon, lat]) => [proj.x(lon), proj.y(lat)]);
    const inside = (x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const edge = (x, z) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d * this.mPerUnit; };
    const xs = P.map((p) => p[0]), zs = P.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z1 - z0) / cell);
    const pos = [], gm = [], ed = [], idx = [], at = new Map();
    const fx = proj.x(b.from[0]), fz = proj.y(b.from[1]);
    const vert = (i, j) => {
      const k = i * (nz + 1) + j;
      if (at.has(k)) return at.get(k);
      const x = x0 + i * cell, z = z0 + j * cell, inPoly = inside(x, z);
      pos.push(x, this.yAt(x, z) + lift, z);
      gm.push((x - x0) * this.mPerUnit, (z - z0) * this.mPerUnit, Math.hypot(x - fx, z - fz) * this.mPerUnit);
      ed.push(inPoly ? edge(x, z) : -edge(x, z));
      at.set(k, pos.length / 3 - 1);
      return pos.length / 3 - 1;
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      // keep a cell if its middle is within a few metres of the area, so the edge can feather out
      const cx = x0 + (i + 0.5) * cell, cz = z0 + (j + 0.5) * cell;
      if (!inside(cx, cz) && edge(cx, cz) > 6) continue;
      const a = vert(i, j), c = vert(i + 1, j), d = vert(i + 1, j + 1), e = vert(i, j + 1);
      idx.push(a, e, c, c, e, d);
    }
    if (!idx.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("gm", new THREE.Float32BufferAttribute(gm, 3));
    geo.setAttribute("edge", new THREE.Float32BufferAttribute(ed, 1));
    geo.setIndex(idx);
    this.burnMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColour: { value: new THREE.Color(b.colour || "#222222") }, uOpacity: { value: b.opacity == null ? 0.75 : b.opacity }, uReach: { value: b.reach == null ? 1e6 : b.reach } },
      vertexShader: `attribute vec3 gm; attribute float edge; varying vec3 vG; varying float vEdge;
        void main() { vG = gm; vEdge = edge; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColour; uniform float uOpacity; uniform float uReach; varying vec3 vG; varying float vEdge;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * n(p); p *= 2.07; a *= 0.5; } return v; }
        void main() {
          vec2 m = vG.xy;
          // broad smudges, a few metres across, dragged along one direction like a charcoal stick
          float smudge = fbm(vec2(m.x * 0.09 + m.y * 0.04, m.y * 0.16));
          // fine grain of the paper showing through
          float grain = n(m * 2.3) * 0.55 + n(m * 6.1) * 0.45;
          float tone = smoothstep(0.2, 0.8, smudge) * 0.5 + 0.5;
          tone *= smoothstep(0.1, 0.75, grain * 0.8 + tone * 0.3);
          // a ragged edge at the area's boundary
          float rag = (fbm(m * 0.25) - 0.5) * 9.0;
          tone *= smoothstep(-2.0, 7.0, vEdge + rag);
          // and at the reach of the fire, darker just behind its front
          float front = uReach + (fbm(m * 0.08 + 3.1) - 0.5) * 40.0;
          float lit = smoothstep(front, front - 10.0, vG.z);
          float glow = smoothstep(front - 30.0, front - 4.0, vG.z) * lit;
          float a = uOpacity * tone * lit * (1.0 + glow * 0.35);
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColour * (1.0 - glow * 0.4), clamp(a, 0.0, 1.0));
        }`,
    });
    const mesh = new THREE.Mesh(geo, this.burnMat);
    mesh.renderOrder = 2;
    this.gBurn.add(mesh);
  }
  setFine(groups) { this.fineGroups = groups || []; if (this.ready && this.data && this.proj) { this.buildFine(); this.dirty = true; } }
  buildFine() {
    this.gFine.children.slice().forEach((o) => { this.gFine.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.fineBuilt = true;
    const proj = this.proj, u = 1 / this.mPerUnit, lift = 1.4 * u, w = this.wrap.clientWidth || 600, h = this.wrap.clientHeight || 400;
    (this.fineGroups || []).forEach((g) => {
      const pos = [], on = g.dash ? g.dash[0] * u : 0, every = g.dash ? g.dash[1] * u : 12 * u;
      g.lines.forEach((pts) => {
        let until = 0;
        for (let i = 1; i < pts.length; i++) {
          const ax = proj.x(pts[i - 1][0]), az = proj.y(pts[i - 1][1]), bx = proj.x(pts[i][0]), bz = proj.y(pts[i][1]);
          const len = Math.hypot(bx - ax, bz - az);
          if (!len) continue;
          const dx = (bx - ax) / len, dz = (bz - az) / len, at = (d) => { const x = ax + dx * d, z = az + dz * d; return [x, this.yAt(x, z) + lift, z]; };
          if (g.dash) {
            // a mark `on` long, every `every`, carried over from one segment to the next
            let d = until;
            for (; d <= len; d += every) pos.push(...at(d), ...at(Math.min(len, d + on)));
            until = d - len;
          } else {
            // solid, in pieces short enough to follow the ground
            const n = Math.max(1, Math.ceil(len / every));
            for (let k = 0; k < n; k++) pos.push(...at(len * k / n), ...at(len * (k + 1) / n));
          }
        }
      });
      if (!pos.length) return;
      const mat = new LineMaterial({ color: g.colour || "#1f1f1f", linewidth: g.width || 0.9, transparent: true, opacity: g.opacity == null ? 0.85 : g.opacity });
      mat.resolution.set(w, h);
      const l = this.fatLines(new Float32Array(pos), mat);
      if (l) this.gFine.add(l);
    });
  }
  // base map: lines drawn on the ground as rows of dots. lines: [[[lon, lat], ...], ...]. Built once and
  // kept, since a shoreline is tens of thousands of points and the marks are rebuilt often.
  setDotted(lines) { this.dotted = lines || []; this.dottedBuilt = false; if (this.ready && this.data && this.proj) { this.buildDotted(); this.dirty = true; } }
  buildDotted() {
    this.clear(this.gDotted);
    this.dottedBuilt = true;
    const lines = this.dotted || [];
    if (!lines.length) return;
    const proj = this.proj, u = 1 / this.mPerUnit, lift = 1.2 * u, EVERY = 24 * u, DOT = 13 * u, pos = [];   // a dash 13 m long every 24 m
    lines.forEach((pts) => {
      let until = 0;   // distance left to walk before the next dot
      for (let i = 1; i < pts.length; i++) {
        const ax = proj.x(pts[i - 1][0]), az = proj.y(pts[i - 1][1]), bx = proj.x(pts[i][0]), bz = proj.y(pts[i][1]);
        const len = Math.hypot(bx - ax, bz - az);
        if (!len) continue;
        const dx = (bx - ax) / len, dz = (bz - az) / len;
        let at = until;
        for (; at <= len; at += EVERY) {
          const x = ax + dx * at, z = az + dz * at, y = this.yAt(x, z) + lift;
          pos.push(x, y, z, x + dx * DOT, y, z + dz * DOT);
        }
        until = at - len;
      }
    });
    const l = this.fatLines(new Float32Array(pos), this.matMarkDot);
    if (l) this.gDotted.add(l);
  }
  // base map: move the camera to look at a place. view: { lon, lat, dist (metres from the place),
  // theta (compass side the camera sits on: PI/2 is due south, looking north), phi (tilt from straight down),
  // offsetX (optional: how far right of centre the place should sit, as a share of the window's width, so
  // a text panel on the left does not cover it) }. Eased over `ms`; 0 jumps. A newer call replaces one in flight.
  flyTo(view, ms = 1800) {
    if (!this.ready || !this.cam) return;
    const from = { ...this.cam };
    const to = { tx: this.proj.x(view.lon), tz: this.proj.y(view.lat), r: view.dist / this.mPerUnit,
                 theta: view.theta == null ? from.theta : view.theta, phi: view.phi == null ? from.phi : view.phi, ty: 0 };
    // base map: `lift` looks at a point that many metres above the ground at the place, for a view from the street
    if (view.lift) to.ty = this.yAt(to.tx, to.tz) + view.lift / this.mPerUnit;
    if (view.offsetX) {
      // look at a point to the left of the place, along the screen's horizontal, so the place lands right of centre
      const halfWidth = to.r * Math.tan(this.persp.fov * Math.PI / 360) * this.persp.aspect, d = view.offsetX * 2 * halfWidth;
      to.tx -= Math.sin(to.theta) * d; to.tz += Math.cos(to.theta) * d;
    }
    if (view.offsetY) {
      // base map: likewise upward (a share of the window's height), by looking at ground nearer the camera
      const d = view.offsetY * 2 * to.r * Math.tan(this.persp.fov * Math.PI / 360) / Math.max(Math.cos(to.phi), 0.3);
      to.tx += Math.cos(to.theta) * d; to.tz += Math.sin(to.theta) * d;
    }
    this._zoomTarget = null; this.zoomAnchor = null;
    const id = this._fly = (this._fly || 0) + 1, t0 = performance.now();
    const apply = (k) => {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // ease in and out
      for (const key in to) this.cam[key] = (from[key] || 0) + (to[key] - (from[key] || 0)) * e;
      this.clamp(); this.dirty = true;
    };
    if (!ms) { apply(1); return; }
    const step = (now) => {
      if (id !== this._fly || !this.on) return;
      const k = Math.min(1, (now - t0) / ms);
      apply(k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---- data and style ----
  // base map: swap the land-and-water mask (as in data.terrain.land) for another of the same grid, to show
  // the shoreline of another time. The ground, and everything laid on it, is rebuilt.
  // With `ms`, the water's edge moves from the old shore to the new over that long: the shader blends the
  // two shoreline fields, so the edge slides rather than jumps. Everything else is rebuilt at once.
  setLand(land, ms = 0) {
    if (!land || !this.data || !this.data.terrain || this.data.terrain.land === land) return;
    const old = ms > 0 && this.shoreBytes ? this.shoreMap.value : null;
    if (old) this.shoreMap.value = null;   // kept for the blend, so the rebuild does not dispose it
    this.data = { ...this.data, terrain: { ...this.data.terrain, land } };
    this.shore = undefined; this.outline = undefined; this.shoreBytes = undefined;
    this.needFoot = true; this.textBuilt = false; this.fineBuilt = false; this.dottedBuilt = false; this.burnBuilt = false;
    this.build();
    if (this.shoreMap2.value && this.shoreMap2.value !== this.oneLandTex) this.shoreMap2.value.dispose();
    this.landFade = (this.landFade || 0) + 1;
    if (!old) { this.shoreMap2.value = this.oneLand(); this.shoreMix.value = 0; return; }
    const run = this.landFade, t0 = performance.now();
    this.shoreMap2.value = old; this.shoreMix.value = 1;
    const step = (now) => {
      if (run !== this.landFade) return;
      const k = Math.min(1, (now - t0) / ms);
      this.shoreMix.value = 1 - k * k * (3 - 2 * k);
      this.dirty = true;
      if (k < 1) requestAnimationFrame(step);
      else { this.shoreMap2.value = this.oneLand(); old.dispose(); }
    };
    requestAnimationFrame(step);
  }
  // base map: the weight and colour of the buildings' edges, which a card can lighten
  setModelEdge(e) {
    this.matModelEdge.linewidth = (e && e.width) || 1.1;
    this.matModelEdge.color.set((e && e.colour) || css("--m3-edge") || "#1f1f1f");
    this.dirty = true;
  }
  setData(data, proj) { this.data = data; this.proj = proj; this.needFoot = true; this.parkShades = null; this.shore = undefined; this.outline = undefined; this.shoreBytes = undefined; }
  // colourOf(b, i) -> hex: the policy colour, or the tenure colour, for each SRO's whole massing
  // bandsOf(b, i) -> [{ share, hex }] bottom up, or null: the massing split into bands by where its tenants go
  setStyle(colourOf, bandsOf) { this.colourOf = colourOf; this.bandsOf = bandsOf || null; }
  setSelected(i) { this.sel = i; if (this.ready) { this.select(); this.dirty = true; } }

  init() {
    if (this.ready) return true;
    if (!this.proj) return false;
    let r;
    try { r = new THREE.WebGLRenderer({ antialias: true, alpha: false }); } catch { return false; }
    if (!r || !r.domElement) return false;
    this.renderer = r;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.wrap.insertBefore(r.domElement, this.labels);
    this.scene = new THREE.Scene();
    this.persp = new THREE.PerspectiveCamera(40, 1, 1, 30000);
    this.camera = this.persp;
    this.ray = new THREE.Raycaster();
    this.ndc = { x: 0, y: 0 };
    this.v = new THREE.Vector3();
    // a bright sky and a soft sun, so roofs read white and walls a shade off; the
    // theme's --m3-exposure scales all three so dark mode stays dark
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xb5b2a9, 2.4); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1); this.sun.position.set(-700, 600, 500); this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.5); this.fill.position.set(700, 300, -400); this.scene.add(this.fill);
    // the picking plane: the whole ground, drawn by nothing, so drags and clicks have a surface everywhere
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    // the void: the ground beyond the data, a frame around the terrain so nothing lies under it to fight its surface
    this.void = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xf4f1ea, side: THREE.DoubleSide }));
    this.scene.add(this.void);
    // unlit and flat: the drawing is carried by the ink edges, as in an axonometric line drawing
    this.matBldg = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.matLand = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matRoad = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matWalk = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matPark = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.matTerrain = new THREE.MeshBasicMaterial({ color: 0xffffff });   // unlit: the painted ground at its own colour, the contours carry the slope
    // the water and the shoreline are the shader's: the ground texture is clear over water, and the
    // shoreline distance field decides, per pixel, whether to show it or the water wash beneath
    const one = (v, cs) => { const t = new THREE.DataTexture(new Uint8Array(v), 1, 1, THREE.RGBAFormat); if (cs) t.colorSpace = cs; t.needsUpdate = true; return t; };
    this.shoreMap = { value: one([255, 255, 255, 255]) };          // all land until the data arrives
    // base map: the shoreline of the time before, blended in by uShoreMix while a change of shore plays out
    this.shoreMap2 = { value: one([255, 255, 255, 255]) }; this.shoreMix = { value: 0 };
    this.waterMap = { value: one([188, 196, 192, 255], THREE.SRGBColorSpace) };
    // the grid beyond the data continues over the water, drawn in the shader so it cannot fight the surface
    this.gridStep = { value: 1 }; this.gridOrigin = { value: new THREE.Vector2() }; this.gridColor = { value: new THREE.Color(0xdcd8ce) };
    // base map: the slope shading is laid on like charcoal (see the shader below): how many metres one
    // drawing unit is, and how much the paper's tooth breaks the tone up
    this.charcoalMetres = { value: 1 }; this.charcoalTooth = { value: 1 };
    this.gridW = { value: 1 };   // base map: the grid's line weight, in pixels over the water and as opacity beyond the data
    this.matTerrain.customProgramCacheKey = () => "shore-terrain";
    this.matTerrain.onBeforeCompile = (sh) => {
      sh.uniforms.uShore = this.shoreMap; sh.uniforms.uWater = this.waterMap;
      sh.uniforms.uShore2 = this.shoreMap2; sh.uniforms.uShoreMix = this.shoreMix;
      sh.uniforms.uMetres = this.charcoalMetres; sh.uniforms.uTooth = this.charcoalTooth;
      sh.uniforms.uGridW = this.gridW;
      sh.uniforms.uGridStep = this.gridStep; sh.uniforms.uGridOrigin = this.gridOrigin; sh.uniforms.uGridColor = this.gridColor;
      sh.vertexShader = sh.vertexShader
        .replace("void main() {", "varying vec2 vGroundXZ;\nvoid main() {")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvGroundXZ = (modelMatrix * vec4(position, 1.0)).xz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("void main() {", "uniform sampler2D uShore;\nuniform sampler2D uShore2;\nuniform float uShoreMix;\nuniform sampler2D uWater;\nuniform float uGridStep;\nuniform vec2 uGridOrigin;\nuniform vec3 uGridColor;\nuniform float uGridW;\nvarying vec2 vGroundXZ;\n" + CHARCOAL_GLSL + "\nvoid main() {")
        .replace("#include <map_fragment>", `#include <map_fragment>
#ifdef USE_MAP
\tfloat sd = mix(texture2D(uShore, vMapUv).r, texture2D(uShore2, vMapUv).r, uShoreMix) - 0.5;            // positive inland; blended with the shore before while it changes
\tfloat aa = fwidth(sd) * 0.75;
\tfloat land = smoothstep(-aa, aa, sd);
\tvec3 water = texture2D(uWater, vMapUv).rgb;
\t// base map: a faint charcoal smudge over the water, laid on like the slopes': soft clouds and long strokes
\t// fixed to the ground, broken up by the paper's tooth
\tvec2 wm = vGroundXZ * uMetres;
\tfloat wcloud = cNoise(wm / 140.0) * 0.6 + cNoise(wm / 34.0 + 31.0) * 0.4;
\tfloat wstroke = cNoise(vec2(dot(wm, vec2(0.80, 0.60)) / 90.0, dot(wm, vec2(-0.60, 0.80)) / 5.0));
\tfloat wtooth = cHash(floor(gl_FragCoord.xy / 1.5)) * 0.6 + cHash(floor(gl_FragCoord.xy / 3.0) + 9.0) * 0.4;
\tfloat wlaid = (0.4 + 0.9 * wcloud) * (0.8 + 0.4 * wstroke) * mix(1.0, 0.35 + 1.3 * wtooth, uTooth);
\twater *= 1.0 - 0.09 * wlaid;
\tvec2 gp = (vGroundXZ - uGridOrigin) / uGridStep;          // grid cells; a line at every whole number
\tvec2 gd = abs(fract(gp - 0.5) - 0.5) / max(fwidth(gp), vec2(1e-6));
\tfloat line = uGridW > 0.0 ? 1.0 - min(min(gd.x, gd.y) / uGridW, 1.0) : 0.0;     // uGridW pixels wide, anti-aliased; none at zero (base map: was one pixel)
\twater = mix(water, uGridColor, line);
\tdiffuseColor.rgb = mix(water, diffuseColor.rgb, land);
\tdiffuseColor.a = 1.0;
#endif`)
        // base map: the slope shading arrives as the vertex colour (1 on level ground, below 1 on a slope turned
        // from the light, above 1 on one turned to it). It is not multiplied in flat: it is laid on as charcoal.
        // The tone goes on unevenly, in soft clouds and long strokes fixed to the ground, and the paper's
        // tooth, fixed to the page, breaks it up, so the dark of a slope is grainy and the light is left clean.
        .replace("#include <color_fragment>", `#ifdef USE_COLOR
\tfloat onLand = 1.0;
#ifdef USE_MAP
\tonLand = land;
#endif
\tfloat dark = clamp(1.0 - vColor.r, 0.0, 1.0), lift = max(vColor.r - 1.0, 0.0);
\tvec2 wm = vGroundXZ * uMetres;                                                              // metres on the ground
\tfloat cloud = cNoise(wm / 110.0) * 0.6 + cNoise(wm / 26.0 + 17.0) * 0.4;                    // uneven pressure
\tfloat stroke = cNoise(vec2(dot(wm, vec2(0.80, 0.60)) / 70.0, dot(wm, vec2(-0.60, 0.80)) / 5.0));   // long strokes, all one way
\tfloat tooth = cHash(floor(gl_FragCoord.xy / 1.5)) * 0.6 + cHash(floor(gl_FragCoord.xy / 3.0) + 9.0) * 0.4;   // the paper
\tfloat laid = dark * (0.6 + 0.8 * cloud) * (0.8 + 0.4 * stroke);
\tlaid *= mix(1.0, 0.35 + 1.3 * tooth, uTooth);
\tfloat tone = 1.0 - laid + lift * 0.6 - uTooth * 0.03 * (tooth - 0.5);                         // and a trace of tooth everywhere
\tdiffuseColor.rgb *= mix(1.0, clamp(tone, 0.0, 1.1), onLand);
#endif`);
    };
    // contours: dashed, in the contour colour on the land and white over the parks
    const dashed = (opacity) => new THREE.LineDashedMaterial({ color: 0x000000, transparent: true, opacity, dashSize: 1, gapSize: 1 });
    this.matContour = dashed(0.45); this.matContour5 = dashed(0.85);
    this.matContourPark = dashed(0.8); this.matContourPark5 = dashed(1);
    this.matGrass = new THREE.LineBasicMaterial({ vertexColors: true });   // the grass strokes carry their own colour
    // canopies: a painted lobed canopy from the atlas on a quad that always faces
    // the camera; cut out by alpha, so nothing is translucent
    this.matTree = new THREE.MeshBasicMaterial({ color: 0xffffff, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 1 });
    this.matTree.customProgramCacheKey = () => "canopy-billboard";
    this.matTree.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("void main() {", "attribute float aCell;\nattribute float aFlip;\nuniform float uLift;\nvoid main() {")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\n\tvMapUv = vec2(((aFlip > 0.5 ? 1.0 - uv.x : uv.x) + aCell) / " + CANOPY_SEEDS.length.toFixed(1) + ", uv.y);")
        .replace("#include <project_vertex>", `
\tvec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
\tvec2 sc = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
\tmvPosition.xy += position.xy * sc;
\tmvPosition.z += uLift;   // toward the camera, in front of the trunk
\tgl_Position = projectionMatrix * mvPosition;`);
      sh.uniforms.uLift = this.canopyLift;
    };
    this.canopyLift = { value: 0 };
    this.matTrunk = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // building edges: screen-width lines, colour and width from the theme
    // tokens, with a graphite grain worked into the shader so the line breaks
    // up like pencil on paper instead of printing as a solid rule
    const edgePen = () => {
      const m = new LineMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      m.uniforms.uGrain = { value: 1 }; m.uniforms.uGrainAmt = { value: 0.6 };
      m.customProgramCacheKey = () => "graphite";
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader
          .replace("void main() {", "varying vec3 vGrainPos;\nvoid main() {\n\tvGrainPos = ( modelMatrix * vec4( position.y < 0.5 ? instanceStart : instanceEnd, 1.0 ) ).xyz;")
        sh.fragmentShader = sh.fragmentShader
          .replace("void main() {", GRAIN_GLSL + "\nvoid main() {")
          .replace("gl_FragColor = vec4( diffuseColor.rgb, alpha );", "alpha *= mix( 1.0, graphite( vGrainPos * uGrain, gl_FragCoord.xy ), uGrainAmt );\n\tgl_FragColor = vec4( diffuseColor.rgb, alpha );");
      };
      return m;
    };
    this.matEdge = edgePen(); this.matEdgeSro = edgePen();
    this.matWin = edgePen(); this.matWin.opacity = 0.7;   // the windows: a finer line than the edges
    this.matCurb = edgePen(); this.matCurb.opacity = 0.8;  // the curb lines along the streets
    this.matSel = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.matDeck = new THREE.MeshBasicMaterial({ color: 0xfdfcfa, side: THREE.DoubleSide });   // the bridge decks, sails and boats, at the building colour
    this.matRail = new THREE.LineBasicMaterial({ color: 0xb9b4a8, transparent: true, opacity: 0.55 });   // the railways: a light line
    // base map: the rails as a heavier pencil line, and the track bed they sit on, its top lighter than its shoulders
    this.matRailPen = edgePen(); this.matRailPen.opacity = 0.9;
    this.matRailTop = new THREE.MeshBasicMaterial({ color: 0xf4f4f4, side: THREE.DoubleSide });
    // base map: the marks for named sites (a solid ring and stem) and the dashed paths between them
    this.matMark = new LineMaterial({ color: 0x1f1f1f, linewidth: 2 });
    this.matMarkPath = new LineMaterial({ color: 0x1f1f1f, linewidth: 1.5, dashed: true, dashScale: 1 });
    // base map: a path in the accent red, dashed
    this.matMarkAccent = new LineMaterial({ color: 0x8e4233, linewidth: 2.6, dashed: true, dashScale: 1 });
    this.matMarkLine = new LineMaterial({ color: 0x1f1f1f, linewidth: 1.6 });
    this.matMarkDot = new LineMaterial({ color: 0x3a3a3a, linewidth: 1.2 });
    // base map: a dotted stem from a building's roof up to its name
    this.matMarkStem = new LineMaterial({ color: 0x1f1f1f, linewidth: 1.3, dashed: true, dashScale: 1 });
    this.gDotted = new THREE.Group();
    this.gMarks = new THREE.Group();
    // base map: modelled buildings, white with an ink edge that keeps its weight at any distance
    this.matModel = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    this.matModelEdge = new LineMaterial({ color: 0x1f1f1f, linewidth: 1.1 });
    // base map: context buildings drawn faintly (`faint` on a model): a pale grey outline, thinner
    this.matModelEdgeFaint = new LineMaterial({ color: 0xa8a8a8, linewidth: 0.7, transparent: true, opacity: 0.8 });
    this.gModels = new THREE.Group();
    this.matRailSide = new THREE.MeshBasicMaterial({ color: 0xd4d4d4, side: THREE.DoubleSide });
    this.matGrid = new THREE.LineBasicMaterial({ color: 0xdcd8ce });   // the grid over the ground beyond the data
    this.matWaterLine = new THREE.LineDashedMaterial({ color: 0x6a6a6a, transparent: true, opacity: 0.6, dashSize: 1, gapSize: 1 });   // base map: the lines in the water, dashed as the land's contours are
    this.gText = new THREE.Group();   // base map: lettering laid on the ground
    this.gFine = new THREE.Group();   // base map: fine annotation lines
    this.gBurn = new THREE.Group();   // base map: charcoal over burned ground
    this.matStorey = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });
    this.gGround = new THREE.Group(); this.gFoot = new THREE.Group(); this.gStreets = new THREE.Group();
    this.gSro = new THREE.Group(); this.gSel = new THREE.Group(); this.gNames = new THREE.Group(); this.gTrees = new THREE.Group(); this.gBridges = new THREE.Group(); this.gHarbour = new THREE.Group(); this.gDots = new THREE.Group(); this.gStreetFill = new THREE.Group();
    this.scene.add(this.gGround, this.gFoot, this.gStreets, this.gNames, this.gTrees, this.gSro, this.gSel, this.gBridges, this.gHarbour, this.gDotted, this.gBurn, this.gFine, this.gText, this.gModels, this.gMarks, this.gDots, this.gStreetFill);
    this.sroMeshes = [];
    this.bindPointer();
    this.ready = true;
    this.colours();
    this.cam = { r: this.proj.W, theta: Math.PI / 2 + 0.45, phi: 0.95, tx: this.proj.W / 2, tz: this.proj.H / 2 };
    return true;
  }

  colours() {
    if (!this.ready) return;
    this.scene.background = new THREE.Color(css("--m3-sky") || "#e9e5db");
    const exposure = parseFloat(css("--m3-exposure")) || 1;
    this.hemi.intensity = 2.4 * exposure; this.sun.intensity = 1.1 * exposure; this.fill.intensity = 0.5 * exposure;
    this.void.material.color.set(css("--m3-void") || css("--m3-sky") || "#f4f1ea");   // beyond the data: a plain ground with a grid
    this.matGrid.color.set(css("--m3-grid") || "#dcd8ce");
    const gridW = parseFloat(css("--m3-grid-w"));
    this.gridW.value = Number.isFinite(gridW) && gridW >= 0 ? gridW : 1;   // zero turns the grid off
    this.matGrid.visible = this.gridW.value > 0;
    this.matGrid.transparent = this.gridW.value < 1; this.matGrid.opacity = Math.min(1, this.gridW.value);   // a plain line cannot go under a pixel, so it fades instead
    // base map: lines in the water that follow the shore; no colour set means none are drawn
    this.waterLine = css("--m3-water-line");
    // "depth": the surveyed depth contours of the sea bed. "shore": drawn lines that follow the shore at widening distances.
    this.waterKind = css("--m3-water-line-kind") || "shore";
    if (this.waterLine) { this.matWaterLine.color.set(this.waterLine); const a = parseFloat(css("--m3-water-line-a")); this.matWaterLine.opacity = Number.isFinite(a) ? a : 0.6; }
    this.matDeck.color.set(css("--m3-bldg") || "#fdfcfa");
    this.matRail.color.set(css("--m3-curb") || css("--m3-edge") || "#b9b4a8");
    this.matRailPen.color.set(css("--m3-rail") || css("--m3-edge") || "#2b2b2b");
    this.matMark.color.set(css("--m3-mark") || css("--ink") || "#1f1f1f");
    this.matMarkPath.color.set(css("--m3-mark") || css("--ink") || "#1f1f1f");
    this.matMarkLine.color.set(css("--m3-mark-line") || css("--m3-mark") || css("--ink") || "#1f1f1f");
    this.matMarkDot.color.set(css("--m3-mark-dot") || css("--ink") || "#3a3a3a");
    this.matModel.color.set(css("--m3-bldg") || "#ffffff");
    this.matModelEdge.color.set(css("--m3-edge") || "#1f1f1f");
    this.railW = parseFloat(css("--m3-rail-w")) || 1.2;
    // base map: how strongly the land is shaded by its slope (0 is off), and how much the slope is
    // steepened for that shading alone; the ground itself stays at its true height
    this.relief = parseFloat(css("--m3-relief")) || 0;
    this.reliefSteepen = parseFloat(css("--m3-relief-steepen")) || 6;
    const tooth = parseFloat(css("--m3-relief-grain"));
    this.charcoalTooth.value = Number.isFinite(tooth) ? tooth : 1;
    this.matRailTop.color.set(css("--m3-rail-bed") || "#f4f4f4");
    this.matRailSide.color.set(css("--m3-rail-shoulder") || "#d4d4d4");
    this.gridColor.value.set(css("--m3-grid-water") || css("--m3-grid") || "#dcd8ce");   // base map: the grid over the water can take its own tone
    this.matLand.color.set(css("--m3-ground") || "#f4f1ea");
    this.matRoad.color.set(css("--m3-road") || "#e3dfd5");
    this.matWalk.color.set(css("--m3-walk") || "#ece8de");
    this.matPark.color.set(css("--m3-park") || "#dfe7db");
    this.matSel.color.set(css("--ink") || "#1d2320");
    this.matStorey.color.set(css("--ink") || "#1d2320");
    this.matEdge.color.set(css("--m3-edge") || "#b9b4a8");
    this.edgeW = parseFloat(css("--m3-edge-w")) || 1;
    this.matEdgeSro.color.set(css("--m3-edge-sro") || "#6b665c");
    this.edgeWSro = parseFloat(css("--m3-edge-sro-w")) || 1.6;
    const grain = parseFloat(css("--m3-edge-grain"));
    this.matEdge.uniforms.uGrainAmt.value = this.matEdgeSro.uniforms.uGrainAmt.value = this.matWin.uniforms.uGrainAmt.value = this.matCurb.uniforms.uGrainAmt.value = this.matRailPen.uniforms.uGrainAmt.value = Number.isFinite(grain) ? grain : 0.6;
    this.matWin.color.set(css("--m3-edge") || "#2b2b2b");
    this.matCurb.color.set(css("--m3-road-line") || "#2b2b2b");
    this.edgeScale();
    this.matContour.color.set(css("--m3-contour") || "#bfb9aa");
    this.matContour5.color.set(css("--m3-contour") || "#bfb9aa");
    this.matContourPark.color.set(css("--m3-contour-park") || "#ffffff");
    this.matContourPark5.color.set(css("--m3-contour-park") || "#ffffff");
    this.matTree.color.set(0xffffff);   // the atlas carries the greens
    const treeA = parseFloat(css("--m3-tree-alpha"));
    this.matTree.opacity = Number.isFinite(treeA) ? treeA : 1;
    this.matTree.transparent = this.matTree.opacity < 1;
    this.matTrunk.color.set(css("--m3-trunk") || "#8b7d6b");
    this.needFoot = true; this.dirty = true;
  }

  // ---- geometry ----
  clear(g) {
    while (g.children.length) {
      const o = g.children[0];
      o.traverse((c) => { if (c.geometry) c.geometry.dispose(); });   // materials are shared and kept
      g.remove(o);
    }
  }

  // the ground's height in scene units at a point in projection units
  yAt(x, z) {
    const t = this.data && this.data.terrain;
    if (!t) return 0;
    return this.groundM(x, z, t.at(this.proj.lon(x), this.proj.lat(z))) / this.mPerUnit;
  }
  // the drawn ground height in metres for a recorded one: the sea bed is held at sea level, so the
  // painted water sits on the terrain; the land is held there too for SHORE_FLAT metres and then
  // eases up over SHORE_RISE, so the shoreline lies on a flat surface rather than on the 15 m steps
  // between a sea cell and the seawall beside it. Everything draped on the ground reads through this.
  groundM(x, z, h) {
    let y = Math.max(0, h);
    if (y > 0 && this.shore) { const r = Math.max(0, Math.min(1, (this.shore.inland(x, z) - SHORE_FLAT) / SHORE_RISE)); y *= r * r * (3 - 2 * r); }
    return y;
  }
  // the lowest ground under a ring, so a building on a slope sits in it, not over it
  baseOf(ring) {
    let y = Infinity;
    for (const p of ring) y = Math.min(y, this.yAt(this.proj.x(p[0]), this.proj.y(p[1])));
    return y === Infinity ? 0 : y;
  }
  // the highest ground under a ring, in scene units
  crestOf(ring) {
    let y = -Infinity;
    for (const p of ring) y = Math.max(y, this.yAt(this.proj.x(p[0]), this.proj.y(p[1])));
    return y === -Infinity ? 0 : y;
  }
  // a drawn height, metres, that keeps the roof at least a storey above the highest ground under the
  // footprint: a low roof on a sloping block would otherwise sink into the terrain on the uphill side
  clearOf(ring, base, h) {
    return Math.max(h, (this.crestOf(ring) - base) * this.mPerUnit + FLOOR_M);
  }

  // One merged geometry from many rings: a triangulated roof and one quad per
  // edge, coloured per vertex so a single draw covers the whole district. The
  // ink edges come out with it: the roof outline and a vertical at every
  // corner that turns more than a few degrees, cheaper than finding them after.
  extrude(items) {
    const proj = this.proj, pos = [], col = [], edge = [], groundLift = 0.06 / this.mPerUnit;
    this.lastEdges = edge;
    items.forEach((it) => {
      const c = it.pts.slice();
      if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
      if (c.length < 3) return;
      const xz = c.map((p) => [proj.x(p[0]), proj.y(p[1])]);
      const base = it.base || 0, y0 = base - 0.6 / this.mPerUnit;   // sunk a little, so no gap opens on a slope
      const y = base + Math.max(0.5, it.h) / this.mPerUnit;
      if (this.obsCur) {   // the prism, in plan, for the street names to keep clear of
        const bb = [Infinity, Infinity, -Infinity, -Infinity];
        xz.forEach((q) => { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); });
        this.obsCur.push({ xz, top: y, bb });
        this.obsGrid = null;
      }
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(xz.map((p) => new THREE.Vector2(p[0], p[1])), []); } catch { tris = []; }
      const r = it.col.r, g = it.col.g, b = it.col.b;
      const push = (x, yy, z, f) => { pos.push(x, yy, z); col.push(r * f, g * f, b * f); };
      tris.forEach((t) => { for (let k = 0; k < 3; k++) push(xz[t[k]][0], y, xz[t[k]][1], 1); });
      for (let i = 0; i < xz.length; i++) {
        const a = xz[i], q = xz[(i + 1) % xz.length], p = xz[(i + xz.length - 1) % xz.length];
        push(a[0], y0, a[1], 1); push(q[0], y0, q[1], 1); push(q[0], y, q[1], 1);
        push(a[0], y0, a[1], 1); push(q[0], y, q[1], 1); push(a[0], y, a[1], 1);
        edge.push(a[0], y, a[1], q[0], y, q[1]);                        // the roof outline
        // where the wall meets the ground: draped on the terrain, in a few pieces on a long wall
        const wl = Math.hypot(q[0] - a[0], q[1] - a[1]) * this.mPerUnit, pieces = Math.max(1, Math.min(5, Math.ceil(wl / 8)));
        let gx = a[0], gz = a[1], gy = this.yAt(gx, gz) + groundLift;
        for (let k = 1; k <= pieces; k++) {
          const t = k / pieces, hx = a[0] + (q[0] - a[0]) * t, hz = a[1] + (q[1] - a[1]) * t, hy = this.yAt(hx, hz) + groundLift;
          edge.push(gx, gy, gz, hx, hy, hz); gx = hx; gz = hz; gy = hy;
        }
        const ux = a[0] - p[0], uz = a[1] - p[1], vx = q[0] - a[0], vz = q[1] - a[1];
        const cross = ux * vz - uz * vx, dot = ux * vx + uz * vz;
        if (Math.abs(Math.atan2(cross, dot)) > 0.35) edge.push(a[0], y0, a[1], a[0], y, a[1]);   // a corner over 20°
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  // a footprint ring as façade input: scene units, not closed
  facadeItem(pts, h, base, narrow, shop) {
    const c = pts.slice();
    if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
    return { xz: c.map((p) => [this.proj.x(p[0]), this.proj.y(p[1])]), h, base, narrow, shop };
  }
  fatLines(positions, mat) {
    if (!positions.length) return null;
    const g = new LineSegmentsGeometry();
    g.setPositions(positions);
    const l = new LineSegments2(g, mat);
    l.computeLineDistances();
    return l;
  }
  // the ink edges of the last extrude(), as lines with a screen width
  edgeLines(mat) {
    const g = new LineSegmentsGeometry();
    g.setPositions(this.lastEdges);
    const l = new LineSegments2(g, mat);
    l.computeLineDistances();
    return l;
  }
  flatGeo(pos) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }
  polys(rings, y) {
    const proj = this.proj, pos = [];
    rings.forEach((ring) => {
      const c = ring.slice();
      if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
      if (c.length < 3) return;
      const xz = c.map((p) => [proj.x(p[0]), proj.y(p[1])]);
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(xz.map((p) => new THREE.Vector2(p[0], p[1])), []); } catch { tris = []; }
      tris.forEach((t) => { for (let k = 0; k < 3; k++) pos.push(xz[t[k]][0], y, xz[t[k]][1]); });
    });
    return this.flatGeo(pos);
  }
  // A flat strip along a polyline: one rectangle per segment, each extended
  // by its half width so the rectangles meet at corners and intersections.
  strip(pos, c, half, y) {
    const proj = this.proj;
    for (let i = 1; i < c.length; i++) {
      let ax = proj.x(c[i - 1][0]), az = proj.y(c[i - 1][1]), bx = proj.x(c[i][0]), bz = proj.y(c[i][1]);
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (!L) continue;
      const nx = -dz / L * half, nz = dx / L * half, ex = dx / L * half, ez = dz / L * half;
      ax -= ex; az -= ez; bx += ex; bz += ez;
      pos.push(ax + nx, y, az + nz, bx - nx, y, bz - nz, bx + nx, y, bz + nz,
               ax + nx, y, az + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz);
    }
  }

  scale() {
    const proj = this.proj;
    this.mPerUnit = proj.mPerUnit;
    this.ground.scale.set(proj.W * 8, proj.H * 8, 1);
    this.ground.position.set(proj.W / 2, -0.05, proj.H / 2);
  }
  // The terrain: one vertex per heightfield cell, the painted ground as its
  // texture, lit so the slopes read. Without a heightfield the land is flat.
  // the shader's two textures over the ground's extent: the shoreline field and the water wash
  setShoreMaps(ext) {
    const f = this.shoreBytes;
    const sh = f ? new THREE.DataTexture(f.data, f.w, f.h, THREE.RedFormat) : null;
    if (sh) { sh.flipY = true; sh.minFilter = THREE.LinearMipmapLinearFilter; sh.magFilter = THREE.LinearFilter; sh.generateMipmaps = true; sh.needsUpdate = true; }
    const w = new THREE.CanvasTexture(waterWash(css("--m3-water") || "#d9e0df", ext.x0, ext.z0, ext.x1 - ext.x0, ext.z1 - ext.z0, this.mPerUnit, 1024, this.shore));
    w.colorSpace = THREE.SRGBColorSpace;
    if (this.shoreMap.value) this.shoreMap.value.dispose();
    if (this.waterMap.value) this.waterMap.value.dispose();
    this.shoreMap.value = sh || this.oneLand(); this.waterMap.value = w;
  }
  oneLand() { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat); t.needsUpdate = true; return t; }

  buildGround() {
    this.clear(this.gGround);
    const proj = this.proj, t = this.data.terrain;
    // the heightfield covers the streets' extent, which runs wider than the map's frame
    const bb = t ? t.bbox : proj.bbox;
    const ext = { x0: proj.x(bb[0]), x1: proj.x(bb[2]), z0: proj.y(bb[3]), z1: proj.y(bb[1]) };
    if (!this.parkShades) this.parkShades = this.shadeParks();   // no colour in it, so it survives a theme change
    if (this.shore === undefined) this.shore = t ? shoreDistance(t, proj) : null;
    if (this.outline === undefined) this.outline = t ? shoreOutline(t) : null;
    if (this.shoreBytes === undefined) this.shoreBytes = this.outline ? shoreField(this.outline, t.land.nx, t.land.ny, t.land.cell || this.shore.cellM) : null;
    this.setShoreMaps(ext);
    // base map: the bare land is painted with no streets, lanes, sidewalks or parks on it
    const painted = this.bare ? { ...this.data, streets: null, sidewalks: null, ground: this.data.ground ? { ...this.data.ground, parks: [], lanes: [] } : null } : this.data;
    const cv = paintGround(proj, painted, this.renderer.capabilities.maxTextureSize, ext, bb, this.parkShades, this.shore, this.outline);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    if (this.matTerrain.map) this.matTerrain.map.dispose();
    this.matTerrain.map = tex; this.matTerrain.needsUpdate = true;
    const uvOf = (x, z) => [(x - ext.x0) / (ext.x1 - ext.x0), 1 - (z - ext.z0) / (ext.z1 - ext.z0)];
    let geo;
    if (t) {
      const nx = t.nx, ny = t.ny, pos = [], uv = [], idx = [];
      const lat0 = (bb[1] + bb[3]) / 2, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = proj.x(bb[0] + i * t.cell / kx), z = proj.y(bb[1] + j * t.cell / ky);
        pos.push(x, this.groundM(x, z, t.heights[j * nx + i]) / this.mPerUnit, z);
        uv.push(...uvOf(x, z));
      }
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx.push(a, b, c, b, d, c);   // wound so the normals face up: z runs south
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      if (this.relief > 0) {
        // base map: hillshading. Each point of the surface is darkened or lightened by how its slope
        // faces a light in the north-west, 45 degrees up. Level ground keeps its painted tone, slopes
        // turned away from the light go darker, slopes turned toward it a little lighter.
        const H = (i, j) => pos[3 * (Math.max(0, Math.min(ny - 1, j)) * nx + Math.max(0, Math.min(nx - 1, i))) + 1] * this.mPerUnit;
        // the slope is read across two cells either side (60 m), which keeps the shading soft and free of grid noise
        const col = new Float32Array(nx * ny * 3), k = this.reliefSteepen / (4 * t.cell), FLAT = Math.SQRT1_2;
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const gx = (H(i + 2, j) - H(i - 2, j)) * k, gy = (H(i, j + 2) - H(i, j - 2)) * k;   // rise per metre eastward and northward
          const lit = (0.5 * gx - 0.5 * gy + FLAT) / Math.hypot(gx, gy, 1);                    // the surface normal against the light
          const v = Math.max(0.55, Math.min(1.12, 1 + this.relief * (lit - FLAT) / FLAT));
          col[3 * (j * nx + i)] = col[3 * (j * nx + i) + 1] = col[3 * (j * nx + i) + 2] = v;
        }
        geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      }
    } else {
      geo = new THREE.PlaneGeometry(ext.x1 - ext.x0, ext.z1 - ext.z0);
      geo.rotateX(-Math.PI / 2); geo.translate((ext.x0 + ext.x1) / 2, 0.02, (ext.z0 + ext.z1) / 2);
    }
    this.charcoalMetres.value = this.mPerUnit;
    const shaded = !!geo.getAttribute("color");
    if (this.matTerrain.vertexColors !== shaded) { this.matTerrain.vertexColors = shaded; this.matTerrain.needsUpdate = true; }
    this.gGround.add(new THREE.Mesh(geo, this.matTerrain));
    this.buildWaterLines();
    this.buildGrid(ext);
    this.buildContours();
  }
  // The City's 1-metre contours, laid just above the ground they describe:
  // every metre faint, every fifth metre stronger.
  buildContours() {
    const t = this.data.terrain, proj = this.proj;
    if (!t || !t.contours.length) return;
    const lift = 0.25 / this.mPerUnit, u = 1 / this.mPerUnit;
    const inPark = this.parkMask();
    // four runs: land / park, by metre / by five metres; each carries the
    // distance along its contour so the dashes run continuously through it
    const runs = { one: { pos: [], dist: [] }, five: { pos: [], dist: [] }, pone: { pos: [], dist: [] }, pfive: { pos: [], dist: [] } };
    // base map: the sea bed's depth contours, from the hydrographic survey (data.depth), drawn on the water's
    // surface wherever the map shows water
    const depth = { pos: [], dist: [] };
    if (this.waterLine && this.waterKind === "depth" && this.data.depth) {
      const yw = 0.04 / this.mPerUnit;
      this.data.depth.lines.forEach((c) => {
        let dw = 0, wx = proj.x(c.pts[0][0]), wz = proj.y(c.pts[0][1]);
        for (let i = 1; i < c.pts.length; i++) {
          const bx = proj.x(c.pts[i][0]), bz = proj.y(c.pts[i][1]), len = Math.hypot(bx - wx, bz - wz);
          if (!this.shore || this.shore.at((wx + bx) / 2, (wz + bz) / 2) > 0) { depth.pos.push(wx, yw, wz, bx, yw, bz); depth.dist.push(dw, dw + len); }
          dw += len; wx = bx; wz = bz;
        }
      });
    }
    t.contours.forEach((c) => {
      if (c.z < 0) return;   // below sea level: the City's few such lines are pits on land, not the sea bed
      const wet = (x, z) => this.shore && this.shore.at(x, z) > 6 * u * this.mPerUnit;   // base map: over water, when the shore is an older one than the contours
      const isFive = Math.abs(c.z % 5) < 1e-6;
      let d = 0, ax = proj.x(c.pts[0][0]), az = proj.y(c.pts[0][1]), ay = this.yAt(ax, az) + lift;
      for (let i = 1; i < c.pts.length; i++) {
        const b = c.pts[i], bx = proj.x(b[0]), bz = proj.y(b[1]), by = this.yAt(bx, bz) + lift;
        const len = Math.hypot(bx - ax, bz - az), park = inPark((ax + bx) / 2, (az + bz) / 2);
        const run = runs[(park ? "p" : "") + (isFive ? "five" : "one")];
        if (!wet((ax + bx) / 2, (az + bz) / 2)) { run.pos.push(ax, ay, az, bx, by, bz); run.dist.push(d, d + len); }   // base map: no contour drawn across water
        d += len; ax = bx; az = bz; ay = by;
      }
    });
    [["one", this.matContour], ["five", this.matContour5], ["pone", this.matContourPark], ["pfive", this.matContourPark5]].forEach(([k, mat]) => {
      const run = runs[k];
      if (!run.pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(run.pos, 3));
      g.setAttribute("lineDistance", new THREE.Float32BufferAttribute(run.dist, 1));
      mat.dashSize = 2.4 * u; mat.gapSize = 1.6 * u;
      this.gGround.add(new THREE.LineSegments(g, mat));
    });
    if (depth.pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(depth.pos, 3));
      g.setAttribute("lineDistance", new THREE.Float32BufferAttribute(depth.dist, 1));
      this.matWaterLine.dashSize = 2.4 * u; this.matWaterLine.gapSize = 1.6 * u;
      this.gGround.add(new THREE.LineSegments(g, this.matWaterLine));
    }
  }
  // Curb lines for the streets inside the surveyed extent, as crisp geometry
  // draped on the ground; the context outside keeps the softer painted line.
  buildCurbs() {
    const streets = this.data.streets, proj = this.proj;
    if (!streets) return;
    const u = 1 / this.mPerUnit;
    const picked = streets.segments.filter((sg) => segInside(sg.c, proj.bbox) && !/BRIDGE|VIADUCT/.test(sg.h || "")).map((sg) => ({
      pts: sg.c.map((p) => [proj.x(p[0]), proj.y(p[1])]),
      hw: (ROAD.pave[sg.u] || ROAD.pave[0]) / 2 * u,
    }));
    const runs = curbRuns(picked, 1.5 * u, { slack: 0.25 * u });
    const lift = 0.08 * u, pos = [];
    runs.forEach((r) => {
      let [ax, az] = r[0], ay = this.yAt(ax, az) + lift;
      for (let i = 1; i < r.length; i++) {
        const [bx, bz] = r[i], by = this.yAt(bx, bz) + lift;
        pos.push(ax, ay, az, bx, by, bz); ax = bx; az = bz; ay = by;
      }
    });
    const l = this.fatLines(new Float32Array(pos), this.matCurb);
    if (l) this.gGround.add(l);
  }
  // Every park's shading, read from the contour lines that run through it
  shadeParks() {
    const parks = this.data.ground && this.data.ground.parks, t = this.data.terrain, proj = this.proj, out = new Map();
    if (!parks || !t || !t.contours.length) return out;
    const u = 1 / this.mPerUnit;
    const levels = [...new Set(t.contours.map((c) => c.z))].sort((a, b) => a - b);
    const step = levels.length > 1 ? levels[1] - levels[0] : 2;
    const segs = [];
    t.contours.forEach((c) => { for (let i = 1; i < c.pts.length; i++) { const a = c.pts[i - 1], b = c.pts[i]; segs.push({ ax: proj.x(a[0]), az: proj.y(a[1]), bx: proj.x(b[0]), bz: proj.y(b[1]), z: c.z }); } });
    const height = (x, z) => t.at(proj.lon(x), proj.lat(z));
    parks.forEach((p, pi) => {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      p.r.forEach((q) => { const x = proj.x(q[0]), z = proj.y(q[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      const w = x1 - x0, h = z1 - z0;
      if (w <= 0 || h <= 0) return;
      const margin = 60 * u, near = segs.filter((sg) => Math.max(sg.ax, sg.bx) >= x0 - margin && Math.min(sg.ax, sg.bx) <= x1 + margin && Math.max(sg.az, sg.bz) >= z0 - margin && Math.min(sg.az, sg.bz) <= z1 + margin);
      const res = Math.max(1 * u, Math.sqrt((w * h) / 1.2e6));   // a metre, coarser only for a very large park
      out.set(pi, shadePark({ x0, z0, w, h }, res, near, step, p.r.map((q) => [proj.x(q[0]), proj.y(q[1])]), height));
    });
    return out;
  }
  // Grass strokes over the parks: short leaning lines draped on the ground,
  // coloured between the ground tone and the stroke colour, more and darker
  // the lower the ground sits in its park. Geometry, so crisp at any zoom.
  buildGrass() {
    const parks = this.data.ground && this.data.ground.parks, shades = this.parkShades;
    if (!parks || !shades) return;
    const hi = css("--m3-park") || "#dfe7db", lo = css("--m3-park-low") || hi, S = hexRgb(css("--m3-park-stipple") || "#5f6e48");
    const u = 1 / this.mPerUnit, lift = 0.1 * u, pos = [], col = [], tmp = new THREE.Color();
    parks.forEach((p, pi) => {
      const sh = shades.get(pi);
      if (!sh) return;
      const { box } = sh, r = parkPrng(97 + pi), n = Math.min(40000, Math.round((box.w * box.h) * this.mPerUnit * this.mPerUnit / PARK.strokePer * 0.6));
      for (let i = 0; i < n; i++) {
        const x = box.x0 + r() * box.w, z = box.z0 + r() * box.h, smp = sh.sample(x, z);
        if (!smp) continue;
        const low = smp.lowness;
        if (r() > 0.45 + 0.55 * low) continue;   // sparser on the high ground
        const len = (PARK.strokeLen[0] + r() * (PARK.strokeLen[1] - PARK.strokeLen[0])) * u, a = PARK.strokeLean + (r() - 0.5) * PARK.strokeSpread;
        const bx = x + Math.cos(a) * len, bz = z + Math.sin(a) * len;
        const c = mixRgb(toneOf(smp, sh, hi, lo), S, PARK.strokeMix[0] + (PARK.strokeMix[1] - PARK.strokeMix[0]) * low);
        tmp.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
        pos.push(x, this.yAt(x, z) + lift, z, bx, this.yAt(bx, bz) + lift, bz);
        col.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
      }
    });
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.gGround.add(new THREE.LineSegments(g, this.matGrass));
  }
  // a quick raster of the parks over the terrain, to ask whether a point is in one
  parkMask() {
    const parks = this.data.ground && this.data.ground.parks, t = this.data.terrain, proj = this.proj;
    if (!parks || !parks.length || !t || this.bare) return () => false;   // base map: no parks on the bare land
    const x0 = proj.x(t.bbox[0]), x1 = proj.x(t.bbox[2]), z0 = proj.y(t.bbox[3]), z1 = proj.y(t.bbox[1]);
    const W = 2048, H = Math.max(1, Math.round(W * (z1 - z0) / (x1 - x0)));
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    parks.forEach((p) => {
      ctx.beginPath();
      p.r.forEach((q, i) => { const x = (proj.x(q[0]) - x0) / (x1 - x0) * W, y = (proj.y(q[1]) - z0) / (z1 - z0) * H; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fill();
    });
    const px = ctx.getImageData(0, 0, W, H).data;
    return (x, z) => {
      const i = Math.floor((x - x0) / (x1 - x0) * W), j = Math.floor((z - z0) / (z1 - z0) * H);
      if (i < 0 || j < 0 || i >= W || j >= H) return false;
      return px[(j * W + i) * 4] > 127;
    };
  }
  // Footprints that an SRO already stands on are drawn by the SRO itself.
  buildFoot() {
    this.clear(this.gFoot);
    this.obsFoot = []; this.obsCur = this.obsFoot; this.obsGrid = null;
    const foot = this.data.foot;
    if (!foot) return;
    const skip = {};
    this.data.surveyed.forEach((b) => { if (b.foot != null) skip[b.foot] = true; });
    // a second 2015 footprint on an SRO's lot (Creekside's north slab) would stand over its massing: the massing replaces it
    const mass = this.data.mass, cen = (r) => [r.reduce((t, q) => t + q[0], 0) / r.length, r.reduce((t, q) => t + q[1], 0) / r.length];
    const within = (c, r) => { let k = false; for (let a = 0, z = r.length - 1; a < r.length; z = a++) if ((r[a][1] > c[1]) !== (r[z][1] > c[1]) && c[0] < (r[z][0] - r[a][0]) * (c[1] - r[a][1]) / (r[z][1] - r[a][1]) + r[a][0]) k = !k; return k; };
    const parts = [];
    if (mass) mass.forEach((rec) => { if (rec) rec.parts.forEach((p) => parts.push({ r: p.r, c: cen(p.r), b: [Math.min(...p.r.map((q) => q[0])), Math.min(...p.r.map((q) => q[1])), Math.max(...p.r.map((q) => q[0])), Math.max(...p.r.map((q) => q[1]))] })); });
    foot.forEach((f, i) => {
      if (skip[i]) return;
      const c = cen(f.p);
      if (parts.some((p) => f.b[2] >= p.b[0] && f.b[0] <= p.b[2] && f.b[3] >= p.b[1] && f.b[1] <= p.b[3] && (within(c, p.r) || within(p.c, f.p)))) skip[i] = true;
    });
    const colour = new THREE.Color(css("--m3-bldg") || "#d8d2c3"), items = [], faces = [], domes = [], sails = [], stadiums = [];
    for (let i = 0; i < foot.length; i++) {
      if (skip[i]) continue;
      const lm = landmarkOf(foot[i].p);
      const base = this.baseOf(foot[i].p), h = lm ? lm.baseH : this.clearOf(foot[i].p, base, foot[i].h || guessedHeight(i));
      items.push({ pts: foot[i].p, h, col: colour, base });
      if (foot[i].h) faces.push(this.facadeItem(foot[i].p, h, base, false, true));   // only a measured height gets a façade
      if (lm && lm.dome) domes.push({ ring: foot[i].p, base, dome: lm.dome });
      if (lm && lm.sails) sails.push({ ring: foot[i].p, base, h });
      if (lm && lm.stadium) stadiums.push({ ring: foot[i].p, base, h });
    }
    // the city around the surveyed extent: the 2009 footprints at their LiDAR heights
    (this.data.context || []).forEach((f, k) => {
      const base = this.baseOf(f.p), lm = landmarkOf(f.p);
      const h = lm ? lm.baseH : this.clearOf(f.p, base, f.h || guessedHeight(100000 + k));
      items.push({ pts: f.p, h, col: colour, base });
      if (lm && lm.dome) domes.push({ ring: f.p, base, dome: lm.dome });
      if (lm && lm.sails) sails.push({ ring: f.p, base, h });
      if (lm && lm.stadium) stadiums.push({ ring: f.p, base, h });
    });
    const geo = this.extrude(items);
    this.gFoot.add(new THREE.Mesh(geo, this.matBldg));
    this.gFoot.add(this.edgeLines(this.matEdge));
    domes.forEach((d) => this.addDome(d, colour));
    sails.forEach((d) => this.addSails(d));
    stadiums.forEach((d) => this.addStadium(d));
    // the DTES footprints get floor lines and windows; the 2009 context stays plain
    if (WINDOWS) { const win = this.fatLines(facadeLines(faces, this.mPerUnit), this.matWin); if (win) this.gFoot.add(win); }
    const st = storeyLines(faces, this.mPerUnit);
    if (st.length) this.gFoot.add(new THREE.LineSegments(this.flatGeo(st), this.matStorey));
  }
  // Beyond the data there is nothing to show, so the plane there is plain and carries a simple grid,
  // on lines a set number of metres apart, aligned so a line falls on each edge of the data's extent.
  // The terrain covers the grid where there is data.
  // The lines stop at the data's extent: inside it the water shader draws the same grid, so the two
  // never overlap and fight for the surface.
  buildGrid(ext) {
    const stepM = parseFloat(css("--m3-grid-m")) || 200, step = stepM / this.mPerUnit;
    this.gridStep.value = step; this.gridOrigin.value.set(ext.x0, ext.z0);
    const gx0 = this.ground.position.x - this.ground.scale.x / 2, gz0 = this.ground.position.z - this.ground.scale.y / 2;
    const gx1 = gx0 + this.ground.scale.x, gz1 = gz0 + this.ground.scale.y, y = -0.03, pos = [];
    // the void as four quads around the data
    const vy = -0.05, q = [], quad = (x0, z0, x1, z1) => { q.push(x0, vy, z0, x1, vy, z0, x1, vy, z1, x0, vy, z0, x1, vy, z1, x0, vy, z1); };
    quad(gx0, gz0, gx1, ext.z0); quad(gx0, ext.z1, gx1, gz1); quad(gx0, ext.z0, ext.x0, ext.z1); quad(ext.x1, ext.z0, gx1, ext.z1);
    this.void.geometry.dispose(); this.void.geometry = this.flatGeo(q);
    const from = (a, o) => o + Math.ceil((a - o) / step) * step;
    const eps = step * 1e-3;
    for (let x = from(gx0, ext.x0); x <= gx1; x += step) {
      if (x > ext.x0 + eps && x < ext.x1 - eps) { pos.push(x, y, gz0, x, y, ext.z0, x, y, ext.z1, x, y, gz1); }   // broken where the data lies
      else pos.push(x, y, gz0, x, y, gz1);
    }
    for (let z = from(gz0, ext.z0); z <= gz1; z += step) {
      if (z > ext.z0 + eps && z < ext.z1 - eps) { pos.push(gx0, y, z, ext.x0, y, z, ext.x1, y, z, gx1, y, z); }
      else pos.push(gx0, y, z, gx1, y, z);
    }
    this.gGround.add(new THREE.LineSegments(this.flatGeo(pos), this.matGrid));
  }
  // The False Creek bridges: each City-named bridge's centreline segments joined into a deck that
  // climbs from the approach grade to its clearance and stands on piers over the water, in the
  // building colour with ink edges. Burrard gets its pair of towers at the main span.
  buildBridges() {
    this.clear(this.gBridges);
    const streets = this.data.streets, proj = this.proj;
    if (!streets) return;
    const u = 1 / this.mPerUnit, pos = [], edge = [];
    const groundM = (x, z) => this.yAt(x, z) * this.mPerUnit;
    const add = (g) => { pos.push(...g.pos); edge.push(...g.edge); };
    BRIDGES.forEach((B) => {
      const segs = streets.segments.filter((sg) => B.match.test(sg.h || ""));
      if (!segs.length) return;
      const chains = bridgeChains(segs).map((c) => densify(c.map((p) => [proj.x(p[0]), proj.y(p[1])]), DECK.sample * u));
      chains.sort((a, b) => arcLengths(b)[b.length - 1] - arcLengths(a)[a.length - 1]);
      const top = B.clearance + DECK.thickness;
      const decks = [];
      chains.forEach((xz, ci) => {
        const s = arcLengths(xz), ground = xz.map((q) => groundM(q[0], q[1]));
        // an end that meets the main deck takes its height there; a free end sits on the ground
        const endH = (q, g) => { for (const d of decks) { const k = d.xz.findIndex((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) < 0.5 * u); if (k >= 0) return d.y[k]; } return g; };
        const hA = endH(xz[0], ground[0]), hB = endH(xz[xz.length - 1], ground[ground.length - 1]);
        const y = deckHeights(s, ground, hA, hB, top);
        const width = ci === 0 ? B.width : DECK.rampWidth;
        decks.push({ xz, s, y, width, main: ci === 0 });
        // the slab is drawn only where it stands above the ground; at grade the road takes over
        aboveRuns(y, ground).forEach(([a, b]) => {
          add(ribbon(xz.slice(a, b + 1), y.slice(a, b + 1).map((v) => v * u), width * u, DECK.thickness * u));
        });
        // piers wherever the deck stands clear of the ground
        for (let d = DECK.pierEvery / 2; d < s[s.length - 1]; d += DECK.pierEvery) {
          const a = along(xz, s, d), g = groundM(a.x, a.z);
          const yTop = Math.min(y[a.i - 1], y[a.i]);
          if (yTop - g < 4) continue;
          add(pillar(a.x, a.z, a.d, DECK.pierWide / 2 * u, (width / 2 - 2) * u, (g - 0.5) * u, (yTop - DECK.thickness + 0.1) * u));
        }
        if (B.towers && ci === 0) {
          // the towers flank the middle of the crossing, where the deck is highest
          const L = s[s.length - 1];
          [L / 2 - 45, L / 2 + 45].forEach((d) => {
            const a = along(xz, s, d), g = groundM(a.x, a.z), yTop = Math.max(y[a.i - 1], y[a.i]);
            add(pillar(a.x, a.z, a.d, DECK.tower.along / 2 * u, (width / 2 + 2) * u, (g - 0.5) * u, (yTop + DECK.tower.above) * u));
          });
        }
      });
    });
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    this.gBridges.add(new THREE.Mesh(geo, this.matDeck));
    const l = this.fatLines(new Float32Array(edge), this.matEdge);
    if (l) this.gBridges.add(l);
  }
  // BC Place: the roof, oculus and masts on the drum the footprint gives, centred on its round part
  // The roof sits on the centre of the footprint's extent, at the ring's mean radius from there: the
  // drum is a rounded oval, and a circle fitted to its rounder side would stand off to one corner.
  addStadium({ ring, base, h }) {
    const proj = this.proj, u = 1 / this.mPerUnit;
    const lat = ring[0][1], kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110540;
    const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const r = ring.reduce((t, q) => t + Math.hypot((q[0] - cx) * kx, (q[1] - cy) * ky), 0) / ring.length;
    const g = stadiumGeometry(proj.x(cx), proj.y(cy), r * u, base + h * u, u);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(g.pos, 3));
    geo.computeVertexNormals();
    this.gFoot.add(new THREE.Mesh(geo, this.matDeck));
    const l = this.fatLines(new Float32Array(g.edge), this.matEdge);
    if (l) this.gFoot.add(l);
    this.gFoot.add(new THREE.LineSegments(this.flatGeo(g.line), this.matStorey));   // cables and ribs, a finer line
  }
  // Canada Place's sails: five leaning tents along the pier's long axis, white with ink edges
  addSails({ ring, base, h }) {
    const proj = this.proj, u = 1 / this.mPerUnit;
    const axis = longAxis(ring.map((p) => [proj.x(p[0]), proj.y(p[1])]));
    const g = sailRow(axis, SAILS.count, SAILS.height * u, SAILS.width * u, SAILS.from, SAILS.to, base + h * u);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(g.pos, 3));
    geo.computeVertexNormals();
    this.gFoot.add(new THREE.Mesh(geo, this.matDeck));
    const l = this.fatLines(new Float32Array(g.edge), this.matEdge);
    if (l) this.gFoot.add(l);
  }
  // The rail yard and the marinas: rails as faint pairs of lines on the ground, boats as small white
  // boxes on the water. Boats that would land on the shore mask are left out.
  buildHarbour() {
    this.clear(this.gHarbour);
    const proj = this.proj, u = 1 / this.mPerUnit;
    // base map: the City's rail centrelines, each modelled as a low track bed that follows the ground,
    // with a sloped shoulder either side and two rails drawn along its top.
    const BED_HALF = 1.6 * u, SHOULDER = 2.3 * u, BED_H = 0.6 * u, GAUGE = 0.72 * u, lift = 0.05 * u;
    const top = [], side = [], rails = [], shoulders = [];
    (this.data.rail || []).forEach((pts) => {
      // the centreline, with a point at least every 15 m so the bed can follow the terrain
      const line = [];
      pts.forEach((q, i) => {
        const x = proj.x(q[0]), z = proj.y(q[1]);
        if (i) {
          const [px, pz] = line[line.length - 1], n = Math.max(1, Math.ceil(Math.hypot(x - px, z - pz) / (15 * u)));
          for (let k = 1; k < n; k++) line.push([px + (x - px) * k / n, pz + (z - pz) * k / n]);
        }
        line.push([x, z]);
      });
      if (line.length < 2) return;
      // across the track at every point: the bed's top edges, the foot of each shoulder, and the two rails
      const cross = line.map(([x, z], i) => {
        const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
        const y = this.yAt(x, z) + lift, at = (d, h) => [x + nx * d, y + h, z + nz * d];
        return { l: at(-BED_HALF, BED_H), r: at(BED_HALF, BED_H), fl: at(-SHOULDER, 0), fr: at(SHOULDER, 0),
                 rl: at(-GAUGE, BED_H + lift), rr: at(GAUGE, BED_H + lift) };
      });
      const quad = (out, a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 1; i < cross.length; i++) {
        const p = cross[i - 1], q = cross[i];
        quad(top, p.l, p.r, q.r, q.l);
        quad(side, p.fl, p.l, q.l, q.fl);
        quad(side, p.r, p.fr, q.fr, q.r);
        rails.push(...p.rl, ...q.rl, ...p.rr, ...q.rr);
        shoulders.push(...p.l, ...q.l, ...p.r, ...q.r);
      }
    });
    if (top.length) {
      this.gHarbour.add(new THREE.Mesh(this.flatGeo(top), this.matRailTop));
      this.gHarbour.add(new THREE.Mesh(this.flatGeo(side), this.matRailSide));
      const edge = this.fatLines(new Float32Array(shoulders), this.matEdge);
      if (edge) this.gHarbour.add(edge);
      const rail = this.fatLines(new Float32Array(rails), this.matRailPen);
      if (rail) this.gHarbour.add(rail);
    }
    const bpos = [], bedge = [];
    MARINAS.forEach((m, k) => {
      const x = proj.x(m.at[0]), z = proj.y(m.at[1]);
      if (this.yAt(x, z) > 0.2 * u) return;                           // the corner is on land: skip the marina
      const g = boatBoxes(x, z, -m.heading * Math.PI / 180, m.rows, m.cols, m.pitch, u, 0.02 * u, k + 1);
      bpos.push(...g.pos); bedge.push(...g.edge);
    });
    if (bpos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(bpos, 3));
      geo.computeVertexNormals();
      this.gHarbour.add(new THREE.Mesh(geo, this.matDeck));
      const l = this.fatLines(new Float32Array(bedge), this.matEdge);
      if (l) this.gHarbour.add(l);
    }
  }
  // A geodesic sphere on a landmark's footprint: an icosahedron at the building's colour, its
  // triangles' edges in ink, centred on the round part of the footprint and resting on the ground.
  addDome({ ring, base, dome }, colour) {
    const proj = this.proj, u = this.mPerUnit;
    const lat = ring[0][1], kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110540;
    const c = roundCentre(ring, kx, ky), cx = proj.x(c.x), cz = proj.y(c.y);
    const r = dome.r / u, g = new THREE.IcosahedronGeometry(r, dome.detail || 3);
    g.translate(cx, base + r + (dome.lift || 0) / u, cz);   // the centre a radius up, plus the lift
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[3 * i] = colour.r; col[3 * i + 1] = colour.g; col[3 * i + 2] = colour.b; }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.gFoot.add(new THREE.Mesh(g, this.matBldg));
    const edges = this.fatLines(triangleEdges(g.attributes.position.array, g.index ? g.index.array : null), this.matEdge);
    if (edges) this.gFoot.add(edges);
  }
  // The street surfaces are in the ground texture; what remains here is the names.
  buildStreets() {
    this.clear(this.gStreets);
    const proj = this.proj;
    this.streetLabels = [];
    const pick = arterialPicks(this.data.streets, proj);
    Object.keys(pick).forEach((name) => {
      // the label lies along the longest straight stretch of the segment, so it follows the road
      // rather than cutting across a bend; a name too long for its stretch is left off
      const c = pick[name].sg.c.map((p) => [proj.x(p[0]), proj.y(p[1])]);
      let best = null;
      for (let i = 1; i < c.length; i++) {
        const L = Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
        if (!best || L > best.L) best = { L, a: c[i - 1], b: c[i] };
      }
      if (!best) return;
      const x = (best.a[0] + best.b[0]) / 2, z = (best.a[1] + best.b[1]) / 2;
      this.streetLabels.push({ text: name, x, z, y: this.yAt(x, z), ax: best.a[0], az: best.a[1], bx: best.b[0], bz: best.b[1], len: best.L });
    });
    this.streetLabels.sort((p, q) => q.len - p.len);   // the long streets claim their room first
    this.buildNames();
  }
  // The City's public trees: a canopy and a trunk each, instanced, sized by
  // the height the City records, standing on the ground.
  buildTrees() {
    this.clear(this.gTrees);
    const trees = this.data.trees, proj = this.proj;
    if (!trees || !trees.length) return;
    const u = 1 / this.mPerUnit, n = trees.length;
    // the atlas, painted in the theme's greens; which cell and whether to mirror, per tree
    if (this.matTree.map) this.matTree.map.dispose();
    const atlas = new THREE.CanvasTexture(paintCanopyAtlas(256, css("--m3-tree") || "#a3c184", css("--m3-tree-dark") || "#5f7f4b"));
    atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
    this.matTree.map = atlas; this.matTree.needsUpdate = true;
    this.canopyLift.value = 0.6 * u;   // 60 cm toward the camera, past any trunk
    const canopyGeo = new THREE.PlaneGeometry(1, 1), cell = new Float32Array(n), flip = new Float32Array(n);
    let seed = 5;
    const next = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    // no mirroring: the shade stays to the lower right on every tree, one light for the whole drawing
    for (let i = 0; i < n; i++) { cell[i] = Math.floor(next() * CANOPY_SEEDS.length); flip[i] = 0; }
    canopyGeo.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 1));
    canopyGeo.setAttribute("aFlip", new THREE.InstancedBufferAttribute(flip, 1));
    const canopy = new THREE.InstancedMesh(canopyGeo, this.matTree, n);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), this.matTrunk, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    trees.forEach((t, i) => {
      const x = proj.x(t.lon), z = proj.y(t.lat), y = this.yAt(x, z), h = drawnHeight(t.h);   // the class, squeezed to 15..60 ft
      // the City's diameter, capped: a few records carry unit slips (one reads 66 m) that would draw a trunk the size of a lot
      const r = Math.max(1, Math.min(6, h * 0.28)), dia = Math.max(0.15, Math.min(1.2, t.d / 100));
      // the quad is as wide as the canopy's reach (lobes run to about 1.25 radii); its scale is read by the shader
      pos.set(x, y + h * 0.62 * u, z); scl.set(r * 2.3 * u, r * 2.3 * FASTIGIATE * u, 1);   // the quad has the atlas cell's aspect
      canopy.setMatrixAt(i, m.compose(pos, q, scl));
      // the trunk runs up to the canopy's centre; the canopy quad sits a little
      // toward the camera, so its paint covers the trunk's top from any angle
      pos.set(x, y + h * 0.31 * u, z); scl.set(dia * 0.5 * u, h * 0.62 * u, dia * 0.5 * u);
      trunk.setMatrixAt(i, m.compose(pos, q, scl));
    });
    this.gTrees.add(canopy, trunk);
  }

  // ---- street names, painted on the road ----
  nameTexture(text) {
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    const font = "700 " + (NAME_PX * NAME_S) + "px 'din-2014-narrow', 'DIN 2014 Narrow', 'DIN Condensed', sans-serif", sp = NAME_PX * NAME_S * 0.14;
    ctx.font = font;
    let w = 0;
    for (let i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + sp;
    cv.width = Math.ceil(w + NAME_S * 4); cv.height = Math.ceil(NAME_PX * NAME_S * 1.3);
    ctx.font = font; ctx.textBaseline = "middle"; ctx.fillStyle = css("--ink-3") || "#7d847e";
    let x = NAME_S * 2;
    for (let k = 0; k < text.length; k++) { ctx.fillText(text[k], x, cv.height / 2); x += ctx.measureText(text[k]).width + sp; }
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    return tex;
  }
  buildNames() {
    this.clear(this.gNames);
    this.nameMeshes = [];
    (this.streetLabels || []).forEach((l) => {
      const tex = this.nameTexture(l.text);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      m.renderOrder = 5;   // drawn after the massing, so a name is never hidden behind a building
      m.rotation.order = "YXZ"; m.rotation.x = -Math.PI / 2;
      m.position.set(l.x, l.y + 0.16, l.z);
      const dx = l.bx - l.ax, dz = l.bz - l.az, len = Math.hypot(dx, dz) || 1;
      m.userData = { l, dx: dx / len, dz: dz / len, len, pw: tex.image.width / NAME_S, ph: tex.image.height / NAME_S };
      m.visible = false;
      this.gNames.add(m); this.nameMeshes.push(m);
    });
  }
  // The blocks the street names must keep clear of: every extruded prism, on a grid of about 60 m cells.
  blocks() {
    if (!this.obsGrid) this.obsGrid = blockGrid((this.obsFoot || []).concat(this.obsSro || []), 60 / this.mPerUnit);
    return this.obsGrid;
  }
  // Would a name of this size, lying on the road at (x, z) along (dx, dz), show through a building?
  // Its ink is sampled at the corners and the middle of each long edge (the glyphs fill about the middle
  // 60% of the texture's height); the name is drawn over the massing, so any sample a building hides
  // from the camera would put ink across that building.
  nameCovered(x, z, dx, dz, w, h) {
    const grid = this.blocks(), cam = this.camera.position, down = false;
    const nx = -dz, nz = dx;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) {
      const px = x + dx * w * i / 2 + nx * h * j * 0.3, pz = z + dz * w * i / 2 + nz * h * j * 0.3;
      if (hidden(grid, px, this.yAt(px, pz), pz, cam, down)) return true;
    }
    return false;
  }
  placeNames() {
    this.namePlaced = [];
    if (!this.nameMeshes) return;
    const W = this.renderer.domElement.clientWidth, H = this.renderer.domElement.clientHeight;
    const far = Math.max(0.7, Math.min(1, Math.pow(this.proj.W * 0.22 / this.cam.r, 0.25)));
    const SLIDE = [0, 0.15, -0.15, 0.3, -0.3];   // where along its stretch a name may sit: the middle first
    this.nameMeshes.forEach((m) => {
      const u = m.userData, l = u.l;
      m.visible = false;
      let dx = u.dx, dz = u.dz;
      const qa = this.toScreen(l.ax, l.y, l.az), qb = this.toScreen(l.bx, l.y, l.bz);
      if (qb.x < qa.x) { dx = -dx; dz = -dz; }
      for (const f of SLIDE) {
        const x = l.x + u.dx * u.len * f, z = l.z + u.dz * u.len * f, y = this.yAt(x, z);
        const q = this.toScreen(x, y, z);
        if (!q.on || q.x < 30 || q.x > W - 30 || q.y < 20 || q.y > H - 20) continue;
        const cd = this.toScreen(x + dx, y, z + dz), cn = this.toScreen(x - dz, y, z + dx);
        const pxD = Math.hypot(cd.x - q.x, cd.y - q.y), pxN = Math.hypot(cn.x - q.x, cn.y - q.y);
        if (pxD < 1e-6 || pxN < 1e-6 || pxN / pxD < 0.15 || pxD / pxN < 0.15) break;
        const w = u.pw * far / pxD, h = u.ph * far / pxN;
        if (w / 2 + Math.abs(f) * u.len > u.len * 0.45) continue;   // the name would spill past its straight stretch of road
        if (this.nameCovered(x, z, dx, dz, w, h)) continue;         // a building would stand over it from here
        const sw = u.pw * far;
        let clash = false;
        for (let i = 0; i < this.namePlaced.length && !clash; i++) {
          // names as discs on screen: two may not sit within each other's reach, whatever their angle
          const o = this.namePlaced[i];
          if (Math.hypot(o[0] - q.x, o[1] - q.y) < (o[2] + sw) / 2 * 0.55 + 10) clash = true;
        }
        if (clash) continue;
        this.namePlaced.push([q.x, q.y, sw]);
        m.position.set(x, y + 0.16, z);
        m.scale.set(w, h, 1);
        m.rotation.y = Math.atan2(-dz, dx);
        m.visible = true;
        break;
      }
    });
  }

  // ---- the SRO buildings: measured massing, or the footprint extruded ----
  buildSro() {
    this.clear(this.gSro);
    this.sroMeshes = [];
    this.obsSro = []; this.obsCur = this.obsSro; this.obsGrid = null;
    const { surveyed, mass, foot } = this.data, proj = this.proj;
    surveyed.forEach((b, i) => {
      if (b.lon == null) return;
      const colour = new THREE.Color(this.colourOf(b, i));
      const bands = this.bandsOf ? this.bandsOf(b, i) : null;
      // one prism per part in a single colour, or a stack of prisms, one per band, each as tall as its share
      const items = (parts) => parts.flatMap(({ pts, h }) => {
        if (!bands || bands.length < 2) return [{ pts, h, col: bands ? new THREE.Color(bands[0].hex) : colour, base }];
        let acc = 0;
        return bands.map((bd) => { const it = { pts, h: h * bd.share, col: new THREE.Color(bd.hex), base: base + acc / this.mPerUnit }; acc += h * bd.share; return it; });
      });
      const rec = mass && mass[i] && mass[i].parts.length ? mass[i] : null;
      const pts = (b.foot != null && foot && foot[b.foot]) ? foot[b.foot].p : b.poly;
      const h = b.hgtM || floorsOf(b) * FLOOR_M;
      const base = rec ? Math.min(...rec.parts.map((p) => this.baseOf(p.r))) : pts ? this.baseOf(pts) : this.yAt(proj.x(b.lon), proj.y(b.lat));
      let mesh, cx, cz, top = h;
      if (rec) {
        mesh = new THREE.Mesh(this.extrude(items(rec.parts.map((p) => ({ pts: p.r, h: p.h || NOMINAL_H })))), this.matBldg);
        let sx = 0, sz = 0, nn = 0;
        rec.parts.forEach((p) => { top = Math.max(top, p.h || 0); p.r.forEach((q) => { sx += proj.x(q[0]); sz += proj.y(q[1]); nn++; }); });
        cx = sx / nn; cz = sz / nn;
      } else if (pts) {
        mesh = new THREE.Mesh(this.extrude(items([{ pts, h }])), this.matBldg);
        let sx = 0, sz = 0;
        pts.forEach((p) => { sx += proj.x(p[0]); sz += proj.y(p[1]); });
        cx = sx / pts.length; cz = sz / pts.length;
      } else {
        // a hundred-block placement has no outline: a column marks it
        if (this.plain) return;   // base map: no marker for a building with no outline
        cx = proj.x(b.lon); cz = proj.y(b.lat);
        const rr = 7 / this.mPerUnit, y = h / this.mPerUnit;
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshBasicMaterial({ color: colour }));
        mesh.scale.set(rr, y, rr);
        mesh.position.set(cx, base + y / 2, cz);
      }
      mesh.userData = { s: i, cx, cz, base, top: base + top / this.mPerUnit, est: !b.hgtM };
      this.gSro.add(mesh);
      if (rec || pts) {
        this.gSro.add(this.edgeLines(this.plain ? this.matEdge : this.matEdgeSro));
        if (WINDOWS) {
          const faces = rec ? rec.parts.map((p) => this.facadeItem(p.r, p.h || NOMINAL_H, base, true, true)) : [this.facadeItem(pts, h, base, true, true)];
          const win = this.fatLines(facadeLines(faces, this.mPerUnit), this.matWin);
          if (win) this.gSro.add(win);
        }
      }
      this.sroMeshes.push(mesh);
      // storey markers: one faint line around each part at every floor level
      const rings = rec ? rec.parts.map((p) => ({ r: p.r, h: p.h || NOMINAL_H })) : (pts ? [{ r: pts, h }] : []);
      const seg = [];
      rings.forEach((rg) => {
        const c = rg.r.slice();
        if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
        const levels = Math.max(1, Math.round(rg.h / FLOOR_M)), pitch = rg.h / levels;
        for (let lv = 1; lv < levels; lv++) {
          const y = base + lv * pitch / this.mPerUnit;
          for (let q = 0; q < c.length; q++) {
            const a = c[q], d = c[(q + 1) % c.length];
            seg.push(proj.x(a[0]), y, proj.y(a[1]), proj.x(d[0]), y, proj.y(d[1]));
          }
        }
      });
      if (seg.length) {
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
        this.gSro.add(new THREE.LineSegments(sg, this.matStorey));
      }
    });
  }

  select() {
    this.clear(this.gSel);
    this.sroMeshes.forEach((m) => {
      if (m.userData.s !== this.sel) return;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 40), this.matSel);
      edges.position.copy(m.position); edges.scale.copy(m.scale);
      this.gSel.add(edges);
    });
  }

  build() {
    if (!this.ready || !this.data || !this.data.streets || !this.proj) return;
    this.scale();
    if (this.bare) {
      // base map: the land before the city. Everything built is cleared away; the ground, water and contours stay.
      if (this.needFoot) {
        this.buildGround();
        [this.gFoot, this.gStreets, this.gNames, this.gTrees, this.gBridges, this.gHarbour, this.gSro, this.gSel].forEach((g) => this.clear(g));
        if (this.bridgesOn) this.buildBridges();
        this.nameMeshes = null; this.sroMeshes = [];
        this.needFoot = false;
      }
      this.buildMarks(); this.buildModels();
      if (!this.dottedBuilt) this.buildDotted();
      if (!this.textBuilt) this.buildGroundText();
      if (!this.fineBuilt) this.buildFine();
      if (!this.burnBuilt) this.buildBurn();
      this.dirty = true;
      return;
    }
    if (this.needFoot) { this.buildGround(); this.buildGrass(); this.buildCurbs(); this.buildFoot(); this.buildBridges(); this.buildHarbour(); this.buildStreets(); this.buildTrees(); this.needFoot = false; }
    this.buildSro();
    this.select();
    this.buildMarks(); this.buildModels();
    if (!this.dottedBuilt) this.buildDotted();
    if (!this.textBuilt) this.buildGroundText();
    if (!this.fineBuilt) this.buildFine();
    if (!this.burnBuilt) this.buildBurn();
    this.dirty = true;
  }

  // base map: the modelled buildings. Every part is built in its own frame (x along its length, y across,
  // z up, in metres), turned by its `rot`, placed at its x, y within the group, turned by the group's
  // bearing and stood on the ground at the group's place.
  buildModels() {
    this.clear(this.gModels);
    const list = this.models || [];
    if (!list.length) return;
    const proj = this.proj, u = 1 / this.mPerUnit, edgeInk = [], edgeFaint = [];
    // base map: a model marked `detail` is drawn with its floors and windows, as the SROs of the main map are
    const detailItems = [];
    // base map: a model with a `front` has its street fronts drawn from its photograph instead (hotelFront.js)
    const frontLines = [], frontSkins = [];
    // base map: a model may carry its own fill colour (`fill`, a hex string); the rest are white
    const tris = new Map();
    let tri = [];
    list.forEach((m) => {
      const key = m.fill || (m.faint ? "#f3f3f3" : "");
      if (!tris.has(key)) tris.set(key, []);
      tri = tris.get(key);
      const edge = m.faint ? edgeFaint : edgeInk;
      const sx = proj.x(m.lon), sz = proj.y(m.lat);
      const cb = Math.cos(m.bearing || 0), sb = Math.sin(m.bearing || 0);
      const tallest = m.front || m.frame ? Math.max(...m.parts.map((q) => (q.kind === "prism" ? q.h : 0))) : 0;
      m.parts.forEach((p) => {
        if (p.kind === "prism") {
          // base map: a building raised straight up from its real footprint (`ring`, [lon, lat] points) to
          // height `h` metres, standing on the lowest ground under it
          // the footprint's place on the ground and its roof's triangles are worked out once per ring, so
          // thousands of buildings can be raised a little further every frame
          this.prismCache = this.prismCache || new WeakMap();
          let pc = this.prismCache.get(p.ring);
          if (!pc || pc.proj !== proj || pc.terrain !== this.data.terrain) {
            const r = p.ring.map(([lon, lat]) => [proj.x(lon), proj.y(lat)]);
            if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop();
            let b = Infinity;
            const bases = r.map(([x, z]) => this.yAt(x, z) + 0.2 * u);   // base map: the ground at each corner, for a deck that follows it
            r.forEach(([x, z]) => { b = Math.min(b, this.yAt(x, z)); });
            let t = [];
            if (r.length >= 3) { try { t = THREE.ShapeUtils.triangulateShape(r.map(([x, z]) => new THREE.Vector2(x, z)), []); } catch { t = []; } }
            pc = { proj, terrain: this.data.terrain, ring: r, base: b + 0.2 * u, bases, tris: t };
            this.prismCache.set(p.ring, pc);
          }
          const ring = pc.ring;
          if (ring.length < 3) return;
          if (m.frame && p.h === tallest) {
            // base map: a building going up as a bare frame: a slab at each of `frame` floors, and columns at
            // its corners and along its edges, with no walls. The column spacing is by rule.
            const S = m.frame, n = ring.length, Y = (k) => pc.base + (p.h * k / S) * u;
            for (let k = 1; k <= S; k++) {
              const y = Y(k), yb = y - 0.3 * u;
              pc.tris.forEach(([i, j, q]) => tri.push(ring[i][0], y, ring[i][1], ring[j][0], y, ring[j][1], ring[q][0], y, ring[q][1]));
              for (let i = 0; i < n; i++) {
                const j = (i + 1) % n, [ax, az] = ring[i], [bx, bz] = ring[j];
                tri.push(ax, yb, az, bx, yb, bz, bx, y, bz, ax, yb, az, bx, y, bz, ax, y, az);
                edge.push(ax, y, az, bx, y, bz, ax, yb, az, bx, yb, bz);
              }
            }
            for (let i = 0; i < n; i++) {
              const j = (i + 1) % n, [ax, az] = ring[i], [bx, bz] = ring[j], len = Math.hypot(bx - ax, bz - az) * this.mPerUnit;
              const cols = Math.max(1, Math.round(len / 4.5));
              for (let c = 0; c < cols; c++) { const x = ax + (bx - ax) * c / cols, z = az + (bz - az) * c / cols; edge.push(x, pc.base, z, x, Y(S), z); }
              edge.push(ax, pc.base, az, bx, pc.base, bz);
            }
            return;
          }
          if (m.detail && !p.follow && !p.z0) detailItems.push({ xz: ring, h: p.h, base: pc.base, narrow: true, shop: true });
          if (m.front && p.h === tallest) {
            const g = frontGeometry({ xz: ring, h: p.h, base: pc.base, front: m.front, ground: (x, z) => this.yAt(x, z) + 0.2 * u }, this.mPerUnit);
            for (const v of g.tris) tri.push(v);
            for (const v of g.edges) edge.push(v);
            for (const v of g.lines) frontLines.push(v);
            if (m.front.photoUrl) for (const sk of g.skins) frontSkins.push({ ...sk, url: m.front.photoUrl });
          }
          // base map: a footprint marked `piles` that stands over the water is held at the model's floor
          // (minBase), with a post down to the water at each corner
          let mx = 0, mz = 0;
          ring.forEach(([x, z]) => { mx += x / ring.length; mz += z / ring.length; });
          const overWater = !!(m.piles && this.shore && this.shore.inland(mx, mz) <= 0);
          const base = (overWater ? Math.max(pc.base, (m.minBase || 0) * u + 0.3 * u) : pc.base) + (p.z0 || 0) * u;   // base map: a deck can sit z0 metres up
          const top = base + Math.max(0.05, p.h) * u;
          const n = ring.length;
          // base map: a part marked `follow` keeps z0 metres above the ground at each corner (a viaduct deck
          // over sloping ground) instead of one level over the lowest point
          const lo = (i) => (p.follow ? pc.bases[i] + (p.z0 || 0) * u : base);
          const hi = (i) => lo(i) + Math.max(0.05, p.h) * u;
          for (let i = 0; i < n; i++) {
            const j = (i + 1) % n, [ax, az] = ring[i], [bx, bz] = ring[j];
            tri.push(ax, lo(i), az, bx, lo(j), bz, bx, hi(j), bz, ax, lo(i), az, bx, hi(j), bz, ax, hi(i), az);
            edge.push(ax, lo(i), az, bx, lo(j), bz, ax, hi(i), az, bx, hi(j), bz, ax, lo(i), az, ax, hi(i), az);
            if (overWater) edge.push(ax, lo(i), az, ax, this.yAt(ax, az), az);
          }
          pc.tris.forEach(([i, j, k]) => tri.push(ring[i][0], hi(i), ring[i][1], ring[j][0], hi(j), ring[j][1], ring[k][0], hi(k), ring[k][1]));
          void top;
          return;
        }
        if (p.kind === "solid") {
          // base map: a curved form as a mesh, in metres from (x, y) and up from the ground under the model
          const g = this.yAt(sx, sz) + 0.2 * u;
          const V = p.verts.map(([vx, vy, vz]) => { const lx = p.x + vx, ly = p.y + vy; return [sx + (lx * cb - ly * sb) * u, g + vz * u, sz - (lx * sb + ly * cb) * u]; });
          p.tris.forEach(([i, j, k]) => tri.push(...V[i], ...V[j], ...V[k]));
          p.lines.forEach(([i, j]) => edge.push(...V[i], ...V[j]));
          return;
        }
        const a = (p.rot || 0) * Math.PI / 180, cr = Math.cos(a), sr = Math.sin(a), z0 = p.z0 || 0;
        // each part stands on the ground under its own middle, and no lower than the model's floor
        // (minBase, metres above the sea), so a yard built out over the water sits on its piles
        // a part marked afloat lies on the water whatever the floor is
        const under = this.yAt(sx + (p.x * cb - p.y * sb) * u, sz - (p.x * sb + p.y * cb) * u);
        // base map: a model marked `piles` sits on the ground wherever there is ground, and only where it
        // stands over water is it raised to its floor (minBase) and given posts down to the water
        const wet = !!(m.piles && this.shore && this.shore.inland(sx + (p.x * cb - p.y * sb) * u, sz - (p.x * sb + p.y * cb) * u) <= 0);
        const base = p.afloat ? under + 0.1 * u : m.piles ? (wet ? (m.minBase || 0) * u : under) + 0.3 * u : Math.max(under, (m.minBase || 0) * u) + 0.3 * u;
        const P = (x, y, z) => {
          const lx = p.x + x * cr - y * sr, ly = p.y + x * sr + y * cr;
          return [sx + (lx * cb - ly * sb) * u, base + (z0 + z) * u, sz - (lx * sb + ly * cb) * u];
        };
        const face = (...pts) => { for (let i = 1; i < pts.length - 1; i++) tri.push(...pts[0], ...pts[i], ...pts[i + 1]); };
        const line = (q, r) => edge.push(...q, ...r);
        const loop = (...pts) => pts.forEach((q, i) => line(q, pts[(i + 1) % pts.length]));
        const hw = p.w / 2, hd = p.d / 2, corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
        const foot = corners.map(([x, y]) => P(x, y, 0));
        const top = p.kind === "box" ? p.h : p.eave, lid = corners.map(([x, y]) => P(x, y, top));
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; face(foot[i], foot[j], lid[j], lid[i]); line(foot[i], lid[i]); }
        loop(...foot); loop(...lid);
        if (wet) foot.forEach((q) => line(q, [q[0], under, q[2]]));   // base map: piles
        if (p.kind === "box") {
          face(...lid);
          if (z0) face(...foot);
          if (p.legs) {
            // posts from the underside down to the ground, spaced around the edge
            corners.forEach(([x0, y0], i) => {
              const [x1, y1] = corners[(i + 1) % 4], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / p.legs));
              for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; line(P(x, y, 0), P(x, y, -(p.drop == null ? z0 : p.drop))); }
            });
          }
        } else {
          // a gable's ridge runs the full length; a hip's stops short at each end
          const inset = p.kind === "hip" ? Math.min(hd, hw) : 0, r0 = P(-hw + inset, 0, p.ridge), r1 = P(hw - inset, 0, p.ridge);
          face(lid[0], lid[1], r1, r0); face(lid[2], lid[3], r0, r1);
          face(lid[1], lid[2], r1); face(lid[3], lid[0], r0);
          line(r0, r1); line(lid[0], r0); line(lid[3], r0); line(lid[1], r1); line(lid[2], r1);
        }
      });
    });
    this.matModelBy = this.matModelBy || {};
    tris.forEach((arr, key) => {
      if (!arr.length) return;
      const mat = !key ? this.matModel : (this.matModelBy[key] = this.matModelBy[key] || new THREE.MeshBasicMaterial({ color: new THREE.Color(key), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
      this.gModels.add(new THREE.Mesh(this.flatGeo(arr), mat));
    });
    const l = this.fatLines(new Float32Array(edgeInk), this.matModelEdge);
    if (l) this.gModels.add(l);
    const lf = this.fatLines(new Float32Array(edgeFaint), this.matModelEdgeFaint);
    if (lf) this.gModels.add(lf);
    // base map: a hotel's photograph laid on its front, squared up to the wall (hotelFront.js)
    this.skinTex = this.skinTex || new Map();
    frontSkins.forEach((sk) => {
      let mat = this.skinTex.get(sk.url);
      if (!mat) {
        let tex;
        tex = new THREE.TextureLoader().load(sk.url, () => { this.dirty = true; });
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        this.skinTex.set(sk.url, mat);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(sk.pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(sk.uv, 2));
      this.gModels.add(new THREE.Mesh(geo, mat));
    });
    if (frontLines.length) {
      const win = this.fatLines(new Float32Array(frontLines), this.matWin);
      if (win) this.gModels.add(win);
    }
    if (detailItems.length) {
      const win = this.fatLines(facadeLines(detailItems, this.mPerUnit), this.matWin);
      if (win) this.gModels.add(win);
      const st = storeyLines(detailItems, this.mPerUnit);
      if (st.length) this.gModels.add(new THREE.LineSegments(this.flatGeo(st), this.matStorey));
    }
  }
  // base map: where a place `h` metres above the ground at [lon, lat] falls on the screen, in CSS pixels
  screenOf(lon, lat, h = 0) {
    if (!this.ready || !this.proj) return null;
    const x = this.proj.x(lon), z = this.proj.y(lat);
    return this.toScreen(x, this.yAt(x, z) + h / this.mPerUnit, z);
  }

  // base map: each site as a ring on the ground with a stem rising from its centre, where its label sits;
  // each path as a dashed line draped over the ground.
  buildMarks() {
    this.clear(this.gMarks);
    this.markTops = [];
    const m = this.marks;
    if (!m) return;
    const proj = this.proj, u = 1 / this.mPerUnit, lift = 1.5 * u;
    const RING = 22 * u, STEM = 55 * u, solid = [], stems = [];
    m.sites.forEach((site) => {
      const x = proj.x(site.lon), z = proj.y(site.lat), y = this.yAt(x, z) + lift;
      if (site.stem != null) {
        // base map: no ring; a dotted stem from the roof (`stem` metres up) to the name
        // base map: `rise` is how far the stem runs above that, in metres, for a view from close by; 50 m if left out
        const top = y + site.stem * u, up = site.rise != null ? site.rise * u : STEM * 0.9;
        stems.push(x, top, z, x, top + up, z);
        this.markTops.push({ x, y: top + up, z, label: site.label });
        return;
      }
      const R = (site.ring != null ? site.ring : 22) * u;   // base map: a site may ask for a wider ring
      if (R <= 0.01 * u) { this.markTops.push({ x, y: y + STEM, z, label: site.label }); return; }
      for (let k = 0; k < 48; k++) {
        const a = k / 48 * Math.PI * 2, b = (k + 1) / 48 * Math.PI * 2;
        const ax = x + Math.cos(a) * R, az = z + Math.sin(a) * R, bx = x + Math.cos(b) * R, bz = z + Math.sin(b) * R;
        solid.push(ax, this.yAt(ax, az) + lift, az, bx, this.yAt(bx, bz) + lift, bz);
      }
      solid.push(x, y, z, x, y + STEM, z);
      this.markTops.push({ x, y: y + STEM, z, label: site.label });
    });
    const ring = this.fatLines(new Float32Array(solid), this.matMark);
    if (ring) this.gMarks.add(ring);
    this.matMarkStem.dashSize = 2.2 * u; this.matMarkStem.gapSize = 2.6 * u;
    const stem = this.fatLines(new Float32Array(stems), this.matMarkStem);
    if (stem) this.gMarks.add(stem);
    // a polyline laid over the ground, with a point at least every 15 m so it follows the terrain
    const drape = (out, pts) => {
      for (let i = 1; i < pts.length; i++) {
        const ax = proj.x(pts[i - 1][0]), az = proj.y(pts[i - 1][1]), bx = proj.x(pts[i][0]), bz = proj.y(pts[i][1]);
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (15 * u)));
        for (let k = 0; k < n; k++) {
          const px = ax + (bx - ax) * k / n, pz = az + (bz - az) * k / n, qx = ax + (bx - ax) * (k + 1) / n, qz = az + (bz - az) * (k + 1) / n;
          out.push(px, this.yAt(px, pz) + lift, pz, qx, this.yAt(qx, qz) + lift, qz);
        }
      }
    };
    const dash = [], plain = [], red = [];
    m.paths.forEach((pts) => drape(dash, pts));
    (m.lines || []).forEach((pts) => drape(plain, pts));
    (m.accent || []).forEach((pts) => drape(red, pts));
    this.matMarkPath.dashSize = 14 * u; this.matMarkPath.gapSize = 10 * u;
    this.matMarkAccent.dashSize = 12 * u; this.matMarkAccent.gapSize = 8 * u;
    const accent = this.fatLines(new Float32Array(red), this.matMarkAccent);
    if (accent) this.gMarks.add(accent);
    const path = this.fatLines(new Float32Array(dash), this.matMarkPath);
    if (path) this.gMarks.add(path);
    const line = this.fatLines(new Float32Array(plain), this.matMarkLine);
    if (line) this.gMarks.add(line);
  }

  // the hint text under the map: what the heights are
  hint() {
    let n = 0, est = 0, none = 0;
    this.data.surveyed.forEach((b) => { if (b.hgtM) n++; else if (b.lon != null) est++; });
    if (this.data.foot) this.data.foot.forEach((f) => { if (!f.h) none++; });
    return "Heights are the City’s 2009 LiDAR: " + n + " of the Appendix B buildings measured"
      + (est ? ", " + est + " estimated from room count" : "") + "."
      + (none ? " " + none.toLocaleString("en-CA") + " footprints with no reading stand at a guessed " + GUESS_STOREYS[0] + " to " + GUESS_STOREYS[1] + " storeys." : "");
  }

  // ---- camera ----
  // The edges keep their screen width up close, then thin and fade as the
  // camera pulls back, or at the city scale they would merge into a wash.
  edgeScale() {
    if (!this.cam) return;
    const W = this.proj.W, r = this.cam.r;
    const f = Math.max(0, Math.min(1, (Math.log(W * 0.9) - Math.log(r)) / (Math.log(W * 0.9) - Math.log(W * 0.08))));
    this.matEdge.linewidth = this.edgeW * f; this.matEdge.opacity = 0.8 * Math.min(1, f * 1.5);
    this.matEdgeSro.linewidth = this.edgeWSro * f; this.matEdgeSro.opacity = 0.8 * Math.min(1, f * 1.5);
    this.matEdge.visible = this.matEdgeSro.visible = f > 0.02;
    // the windows are finer and go first, gone by the time the edges are half width
    const g = Math.max(0, Math.min(1, (f - 0.45) / 0.55));
    this.matWin.linewidth = this.edgeW * 0.6 * g; this.matWin.opacity = 0.7 * g; this.matWin.visible = g > 0.02;
    this.matCurb.linewidth = this.edgeW * 0.7 * f; this.matCurb.opacity = 0.8 * Math.min(1, f * 1.5); this.matCurb.visible = f > 0.02;
    // base map: the rails thin and fade with distance as the edges do, keeping only a trace at the city scale
    this.matRailPen.linewidth = (this.railW || 1.2) * (0.12 + 0.88 * f); this.matRailPen.opacity = 0.9 * (0.12 + 0.88 * f);
    // grain cells of about 0.35 m along the edge
    this.matEdge.uniforms.uGrain.value = this.matEdgeSro.uniforms.uGrain.value = this.matWin.uniforms.uGrain.value = this.matCurb.uniforms.uGrain.value = this.matRailPen.uniforms.uGrain.value = this.mPerUnit / 0.35;
  }
  place() {
    const c = this.cam;
    this.edgeScale();
    const sp = Math.max(0.12, Math.min(1.5, c.phi));
    const ty = c.ty || 0;
    this.camera.position.set(c.tx + c.r * Math.sin(sp) * Math.cos(c.theta), ty + c.r * Math.cos(sp), c.tz + c.r * Math.sin(sp) * Math.sin(c.theta));
    this.camera.lookAt(c.tx, ty, c.tz);
    this.camera.updateMatrixWorld();
  }
  clamp() {
    const c = this.cam, proj = this.proj;
    c.r = Math.max(proj.W * 0.004, Math.min(proj.W * 2.2, c.r));   // base map: allowed much closer, for a single building
    c.tx = Math.max(-proj.W * 0.3, Math.min(proj.W * 1.3, c.tx));
    c.tz = Math.max(-proj.H * 0.3, Math.min(proj.H * 1.3, c.tz));
    c.phi = Math.max(0.12, Math.min(1.5, c.phi));
  }
  // Frame the district: pull the camera back until the ground rectangle the
  // stock sits on projects inside the canvas, whatever its aspect.
  fit() {
    if (!this.ready) return;
    const proj = this.proj, xs = [], zs = [];
    this.data.surveyed.forEach((b) => { if (b.lon != null) { xs.push(proj.x(b.lon)); zs.push(proj.y(b.lat)); } });
    const x0 = xs.length ? Math.min(...xs) : 0, x1 = xs.length ? Math.max(...xs) : proj.W;
    const z0 = zs.length ? Math.min(...zs) : 0, z1 = zs.length ? Math.max(...zs) : proj.H;
    this._zoomTarget = null; this.zoomAnchor = null;
    this.cam = { r: Math.max(x1 - x0, z1 - z0), theta: Math.PI / 2 + 0.5, phi: 1.12, tx: (x0 + x1) / 2, tz: (z0 + z1) / 2 };
    const corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
    for (let pass = 0; pass < 4; pass++) {
      this.place();
      let m = 0;
      corners.forEach((c) => { this.v.set(c[0], 0, c[1]).project(this.camera); m = Math.max(m, Math.abs(this.v.x), Math.abs(this.v.y)); });
      if (m > 0) this.cam.r *= m / 0.96;
    }
    this.clamp(); this.dirty = true;
  }
  zoom(f) { if (!this.ready) return; this.zoomTo(this.zoomTarget * f, null, null); }
  // Set where the zoom is heading; the loop eases the camera there over a few
  // frames and keeps the ground point under the cursor where it was.
  get zoomTarget() { return this._zoomTarget == null ? this.cam.r : this._zoomTarget; }
  zoomTo(r, ndc, ground) {
    const proj = this.proj;
    this._zoomTarget = Math.max(proj.W * 0.02, Math.min(proj.W * 2.2, r));
    this.zoomAnchor = ndc && ground ? { ndc, g: ground } : null;
    this.dirty = true;
  }
  easeZoom() {
    if (this._zoomTarget == null) return;
    const c = this.cam, d = this._zoomTarget - c.r;
    if (Math.abs(d) < c.r * 0.0005) { c.r = this._zoomTarget; this._zoomTarget = null; }
    else { c.r += d * EASE; this.dirty = true; }
    this.clamp(); this.place();
    const a = this.zoomAnchor;
    if (a) {
      const g1 = this.groundPointAt(a.ndc);
      if (g1) { c.tx += a.g.x - g1.x; c.tz += a.g.z - g1.z; this.clamp(); this.place(); }
    }
    if (this._zoomTarget == null) this.zoomAnchor = null;
  }
  resize() {
    if (!this.ready) return;
    const w = this.wrap.clientWidth || 600, h = this.wrap.clientHeight || Math.max(380, Math.round(w * 0.64));
    this.renderer.setSize(w, h, false);
    this.matEdge.resolution.set(w, h); this.matEdgeSro.resolution.set(w, h); this.matWin.resolution.set(w, h); this.matCurb.resolution.set(w, h); this.matRailPen.resolution.set(w, h);
    this.matMark.resolution.set(w, h); this.matMarkPath.resolution.set(w, h); this.matMarkLine.resolution.set(w, h); this.matModelEdge.resolution.set(w, h); this.matModelEdgeFaint.resolution.set(w, h); this.matMarkStem.resolution.set(w, h); this.matMarkAccent.resolution.set(w, h); this.matMarkDot.resolution.set(w, h);
    if (this.gFine) this.gFine.children.forEach((o) => o.material && o.material.resolution && o.material.resolution.set(w, h));
    if (this.matStreetRim) this.matStreetRim.resolution.set(w, h);
    this.persp.aspect = w / h;
    this.persp.updateProjectionMatrix();
    this.dirty = true;
  }

  // ---- picking ----
  ndcOf(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return this.ndc;
  }
  groundPoint(e) { return this.groundPointAt(this.ndcOf(e)); }
  groundPointAt(ndc) {
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObject(this.ground, false);
    return hits.length ? hits[0].point : null;
  }
  pick(e) {
    if (this.plain) return null;   // base map: nothing to hover or select
    this.ray.setFromCamera(this.ndcOf(e), this.camera);
    const hits = this.ray.intersectObjects(this.sroMeshes, false);
    return hits.length ? hits[0].object : null;
  }
  toScreen(x, y, z) {
    this.v.set(x, y, z).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: (this.v.x + 1) / 2 * r.width, y: (1 - this.v.y) / 2 * r.height,
             on: this.v.z < 1 && Math.abs(this.v.x) < 1.05 && Math.abs(this.v.y) < 1.05 };
  }

  bindPointer() {
    const el = this.renderer.domElement, pointers = new Map(), self = this;
    let down = null, lastPinch = 0;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, e);
      if (pointers.size > 1) { down = null; return; }
      const orbit = e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey;
      self._zoomTarget = null; self.zoomAnchor = null;
      down = { x: e.clientX, y: e.clientY, moved: false, orbit, theta: self.cam.theta, phi: self.cam.phi, g: self.groundPoint(e) };
      self.wrap.classList.toggle("orbiting", orbit);
      e.stopPropagation();
    });
    el.addEventListener("pointermove", (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
      if (pointers.size > 1) { pinch(); return; }
      if (!down) { hover(e); return; }
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (!down.moved) return;
      self.onHover(null);
      if (down.orbit) {
        self.cam.theta = down.theta + dx * 0.006;
        self.cam.phi = down.phi - dy * 0.006;
      } else if (down.g) {
        const g = self.groundPoint(e);
        if (g) { self.cam.tx += down.g.x - g.x; self.cam.tz += down.g.z - g.z; }
      }
      self.clamp(); self.place(); self.dirty = true;
    });
    function end(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinch = 0;
      self.wrap.classList.remove("orbiting");
      if (!down) return;
      const d = down; down = null;
      if (d.moved || e.button === 2) return;
      const hit = self.pick(e);
      if (hit) self.onSelect(hit.userData.s);
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("contextmenu", (e) => { e.preventDefault(); });
    el.addEventListener("pointerleave", () => { self.hover = null; self.onHover(null); self.wrap.classList.remove("picking"); self.dirty = true; });
    el.addEventListener("wheel", (e) => {
      e.preventDefault(); e.stopPropagation();
      // the step follows the scroll distance, so a trackpad's many small
      // events add up to the same zoom as a mouse wheel's few large ones
      const ndc = self.ndcOf(e);
      self.zoomTo(self.zoomTarget * wheelZoom(e), { x: ndc.x, y: ndc.y }, self.groundPointAt(ndc));
    }, { passive: false });
    function pinch() {
      const pts = Array.from(pointers.values());
      if (pts.length < 2) return;
      const d = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      if (lastPinch) { self._zoomTarget = null; self.cam.r *= lastPinch / d; self.clamp(); self.dirty = true; }
      lastPinch = d;
    }
    function hover(e) {
      const hit = self.pick(e), s = hit ? hit.userData.s : null;
      self.wrap.classList.toggle("picking", s !== null);
      if (s === self.hover) return;
      self.hover = s; self.dirty = true;
      if (s === null) { self.onHover(null); return; }
      const u = hit.userData, q = self.toScreen(u.cx, u.top, u.cz);
      self.onHover({ i: s, x: q.x, y: q.y });
    }
  }

  // Building names: only the building under the pointer and the selected one
  // carry a name, so the massing reads clean until a building is asked about.
  drawLabels() {
    const parts = [], placed = (this.namePlaced || []).slice(), esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const free = (x, y, w) => {
      for (let i = 0; i < placed.length; i++) if (Math.abs(placed[i][0] - x) < (placed[i][2] + w) / 2 && Math.abs(placed[i][1] - y) < 14) return false;
      placed.push([x, y, w]); return true;
    };
    this.sroMeshes.forEach((m) => {
      const u = m.userData, sel = u.s === this.sel;
      if (!sel && u.s !== this.hover) return;
      const q = this.toScreen(u.cx, u.top, u.cz);
      if (!q.on) return;
      const name = this.data.surveyed[u.s].name, w = name.length * 6.2 + 8;
      if (!sel && !free(q.x, q.y, w)) return;
      parts.push('<span class="lbl' + (sel ? " sel" : "") + '" style="left:' + q.x.toFixed(0) + 'px;top:' + (q.y - 4).toFixed(0) + 'px">' + esc(name) + '</span>');
    });
    // base map: a label at the top of each marked site's stem
    (this.markTops || []).forEach((t) => {
      const q = this.toScreen(t.x, t.y, t.z);
      if (q.on) parts.push('<span class="lbl mark" style="left:' + q.x.toFixed(0) + 'px;top:' + (q.y - 4).toFixed(0) + 'px">' + esc(t.label) + '</span>');
    });
    this.labels.innerHTML = parts.join("");
  }

  // ---- the loop ----
  start(onFail) {
    if (this.on) return;
    this.on = true;
    const loop = () => {
      if (!this.on) return;
      requestAnimationFrame(loop);
      if (!this.dirty) return;
      this.dirty = false;
      try {
        this.easeZoom();
        this.place(); this.placeNames();
        this.renderer.render(this.scene, this.camera);
        this.drawLabels();
      } catch (e) {
        this.on = false;
        if (onFail) onFail((e && e.message) ? e.message : String(e));
      }
    };
    loop();
  }
  stop() { this.on = false; }
  dispose() {
    this.stop();
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
    this.ready = false;
  }
}
