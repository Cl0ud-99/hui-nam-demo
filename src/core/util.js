import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = mulberry32(19871023);

/** Scale a geometry's UVs so 1 UV unit = `meters` world units (texture repeat handles tile size). */
export function scaleUV(geom, sx, sy) {
  const uv = geom.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geom;
}

export function planeGeo(w, h, segW = 1, segH = 1) {
  const g = new THREE.PlaneGeometry(w, h, segW, segH);
  scaleUV(g, w, h);
  return g;
}

export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // BoxGeometry groups: +x,-x,+y,-y,+z,-z ; 4 verts each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * du, uv.getY(k) * dv);
    }
  }
  uv.needsUpdate = true;
  return g;
}

export function mesh(geom, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** A wall plane facing +Z at origin; caller positions/rotates. */
export function wall(w, h, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(planeGeo(w, h), mat);
  m.position.set(x, y, z); m.rotation.y = ry;
  m.receiveShadow = true;
  return m;
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, mat, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  scaleUV(g, Math.PI * Math.max(rt, rb) * 2, h);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function disposeObject(o) {
  o.traverse(n => { if (n.isMesh) { n.geometry.dispose(); } });
}

/** Cheap AABB world-space collider helper */
export function aabb(minX, maxX, minZ, maxZ, minY = -1, maxY = 8) {
  return { minX, maxX, minZ, maxZ, minY, maxY, enabled: true };
}
