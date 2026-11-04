import { BoxGeometry, CylinderGeometry, Mesh, PlaneGeometry } from 'three';
export { box, clamp2, cyl, damp2, planeGeo, rand };

var clamp2 = (v, a, b) => Math.max(a, Math.min(b, v));
var lerp2 = (a, b, t) => a + (b - a) * t;
var damp2 = (a, b, l, dt) => lerp2(a, b, 1 - Math.exp(-l * dt));
var rand = (a, b) => a + Math.random() * (b - a);
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var rng = mulberry32(19871023);
function scaleUV(geom, sx, sy) {
  const uv = geom.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geom;
}
function planeGeo(w, h, segW = 1, segH = 1) {
  const g = new PlaneGeometry(w, h, segW, segH);
  scaleUV(g, w, h);
  return g;
}
function boxGeo(w, h, d) {
  const g = new BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
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
function box(w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, mat, seg = 16, open = false) {
  const g = new CylinderGeometry(rt, rb, h, seg, 1, open);
  scaleUV(g, Math.PI * Math.max(rt, rb) * 2, h);
  const m = new Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
