import { DoubleSide, Group, Mesh } from 'three';
import { planeGeo } from '../core/util.js';
export { wallGroup };

function wallQuads(w, h, openings = []) {
  const xs = /* @__PURE__ */ new Set([0, w]);
  const ys = /* @__PURE__ */ new Set([0, h]);
  for (const o of openings) {
    xs.add(Math.max(0, o.x0));
    xs.add(Math.min(w, o.x1));
    ys.add(Math.max(0, o.y0));
    ys.add(Math.min(h, o.y1));
  }
  const xa = [...xs].sort((a, b) => a - b);
  const ya = [...ys].sort((a, b) => a - b);
  const quads = [];
  for (let i = 0; i < xa.length - 1; i++) {
    for (let j = 0; j < ya.length - 1; j++) {
      const x0 = xa[i], x1 = xa[i + 1], y0 = ya[j], y1 = ya[j + 1];
      if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) continue;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const inside = openings.some((o) => cx > o.x0 && cx < o.x1 && cy > o.y0 && cy < o.y1);
      if (inside) continue;
      quads.push({ x0, x1, y0, y1 });
    }
  }
  return quads;
}
function wallGroup(w, h, mat, openings = [], { doubleSide = false } = {}) {
  const g = new Group();
  for (const q of wallQuads(w, h, openings)) {
    const qw = q.x1 - q.x0, qh = q.y1 - q.y0;
    const m = new Mesh(planeGeo(qw, qh), mat);
    m.position.set((q.x0 + q.x1) / 2 - w / 2, (q.y0 + q.y1) / 2, 0);
    m.receiveShadow = true;
    if (doubleSide) {
      m.material = mat.clone();
      m.material.side = DoubleSide;
    }
    g.add(m);
  }
  return g;
}
