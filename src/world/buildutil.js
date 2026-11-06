import * as THREE from 'three';
import { planeGeo, boxGeo, aabb } from '../core/util.js';

/**
 * Split a rectangular wall into quads around rectangular openings.
 * openings: [{x0,x1,y0,y1}] in local wall coords (metres, origin bottom-left)
 */
export function wallQuads(w, h, openings = []) {
  const xs = new Set([0, w]);
  const ys = new Set([0, h]);
  for (const o of openings) {
    xs.add(Math.max(0, o.x0)); xs.add(Math.min(w, o.x1));
    ys.add(Math.max(0, o.y0)); ys.add(Math.min(h, o.y1));
  }
  const xa = [...xs].sort((a, b) => a - b);
  const ya = [...ys].sort((a, b) => a - b);
  const quads = [];
  for (let i = 0; i < xa.length - 1; i++) {
    for (let j = 0; j < ya.length - 1; j++) {
      const x0 = xa[i], x1 = xa[i + 1], y0 = ya[j], y1 = ya[j + 1];
      if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) continue;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const inside = openings.some(o => cx > o.x0 && cx < o.x1 && cy > o.y0 && cy < o.y1);
      if (inside) continue;
      quads.push({ x0, x1, y0, y1 });
    }
  }
  return quads;
}

/** Build a wall (facing +Z local) with openings, as several plane meshes. */
export function wallGroup(w, h, mat, openings = [], { doubleSide = false } = {}) {
  const g = new THREE.Group();
  // per-wall UV shift: every wall used to start its tile/plaster pattern at the same UV origin,
  // so the grid lined up across corners and read as one repeating sheet
  const ou = Math.random(), ov = Math.random();
  for (const q of wallQuads(w, h, openings)) {
    const qw = q.x1 - q.x0, qh = q.y1 - q.y0;
    const geo = planeGeo(qw, qh);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + ou, uv.getY(i) + ov);
    uv.needsUpdate = true;
    const m = new THREE.Mesh(geo, mat);
    m.position.set((q.x0 + q.x1) / 2 - w / 2, (q.y0 + q.y1) / 2, 0);
    m.receiveShadow = true;
    if (doubleSide) { m.material = mat.clone(); m.material.side = THREE.DoubleSide; }
    g.add(m);
  }
  return g;
}

/** A wall that also registers one solid AABB collider (no openings in collision). */
export function solidWall(w, h, mat, { x = 0, y = 0, z = 0, ry = 0, thick = 0.16, openings = [], colliders = [] } = {}) {
  const g = wallGroup(w, h, mat, openings);
  g.position.set(x, y, z); g.rotation.y = ry;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  // transform wall extents into an axis-aligned box (walls are axis aligned in this project)
  const hw = Math.abs(cos) * w / 2 + Math.abs(sin) * thick / 2;
  const hd = Math.abs(sin) * w / 2 + Math.abs(cos) * thick / 2;
  colliders.push(aabb(x - hw, x + hw, z - hd, z + hd, y, y + h));
  return g;
}

/** Debug-visible collider boxes */
export function debugColliders(colliders) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff00aa, wireframe: true, transparent: true, opacity: 0.5 });
  for (const c of colliders) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(c.maxX - c.minX, c.maxY - c.minY, c.maxZ - c.minZ), mat);
    m.position.set((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, (c.minZ + c.maxZ) / 2);
    g.add(m);
  }
  return g;
}

/** Grime decal helper: random stain planes on a wall rect. */
export function grime(parent, texMat, { x, y, z, ry = 0, w = 1, h = 1, n = 3, scale = 0.8 }) {
  for (let i = 0; i < n; i++) {
    const sw = scale * (0.5 + Math.random() * 0.8), sh = sw * (0.7 + Math.random() * 0.7);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), texMat);
    m.position.set(x + (Math.random() - 0.5) * w, y + (Math.random() - 0.5) * h, z);
    m.rotation.y = ry;
    m.position.x += Math.cos(ry) * 0.003; m.position.z += Math.sin(ry) * 0.003;
    m.renderOrder = 1;
    parent.add(m);
  }
}
