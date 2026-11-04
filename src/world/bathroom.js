import * as THREE from 'three';
import { M, posterMat, decalMat } from '../core/materials.js';
import { T } from '../core/textures.js';
import { box, cyl, mesh, planeGeo, rand } from '../core/util.js';
import { wallGroup } from './buildutil.js';
import { sticker } from '../core/props.js';
import { APT, BATH } from './apartment.js';

export function buildBathroom(W) {
  const { x0, x1, z0, z1 } = BATH;
  const y0 = APT.y0, h = 2.6, cy = y0 + h;
  const g = new THREE.Group(); W.root.add(g);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  // shell
  // the bathroom floor is small and mostly in shadow: skip the planar reflector here, it costs
  // a whole extra scene pass in the tightest room in the game. Env-map + low roughness reads wet.
  const floorMat = M.floorBath.clone();
  floorMat.roughness = 0.26; floorMat.metalness = 0.18;
  floorMat.color = new THREE.Color(0x9fa8a2);
  const floor = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, y0 + 0.008, cz); floor.receiveShadow = true; g.add(floor);
  W.upperHide.push(floor);

  const ceil = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), M.ceilingDirty);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, cy, cz); g.add(ceil);

  // ------------------------------------------------------------------ shell
  // One solid box per wall, built so the INNER face sits exactly on the room boundary and the
  // OUTER face is 12 cm into the neighbouring room. Each box carries a per-face material array:
  // tiles inward, the same peeling plaster as the rest of the flat outward. Zero-thickness
  // planes are what made this room read as "transparent" from the corridor.
  const WALL_T = 0.12;
  const tileMat = (len, hh) => {
    const m = M.tileWallDirty.clone();
    if (m.map) {
      m.map = m.map.clone();
      m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
      m.map.repeat.set(Math.max(1, len / 1.35), Math.max(1, hh / 1.35));
      m.map.needsUpdate = true;
    }
    m.roughness = 0.42; m.metalness = 0.04;
    return m;
  };
  // face order in three.js BoxGeometry: +x, -x, +y, -y, +z, -z
  const wallBox = (w, hh, d, cx, cy2, cz2, innerFace, len, hh2) => {
    const inner = tileMat(len, hh2);
    const mats = [M.wallPeelWarm, M.wallPeelWarm, M.wallPeelWarm, M.wallPeelWarm, M.wallPeelWarm, M.wallPeelWarm];
    mats[innerFace] = inner;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mats);
    m.position.set(cx, cy2, cz2);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.dynamic = true;   // multi-material: must not be merged into a single-material bucket
    g.add(m);
    return m;
  };

  const bw = x1 - x0, bd = z1 - z0;
  const cyc = y0 + h / 2;
  // north (sink) wall: interior face looks toward +z
  wallBox(bw + WALL_T * 2, h, WALL_T, cx, cyc, z0 - WALL_T / 2, 4, bw, h);
  W.colliders.push({ minX: x0 - 0.05, maxX: x1 + 0.05, minZ: z0 - WALL_T, maxZ: z0, minY: y0, maxY: cy, enabled: true });
  // south wall: interior face looks toward -z
  wallBox(bw + WALL_T * 2, h, WALL_T, cx, cyc, z1 + WALL_T / 2, 5, bw, h);
  W.colliders.push({ minX: x0 - 0.05, maxX: x1 + 0.05, minZ: z1, maxZ: z1 + WALL_T, minY: y0, maxY: cy, enabled: true });
  // east wall: interior face looks toward -x
  wallBox(WALL_T, h, bd, x1 + WALL_T / 2, cyc, cz, 1, bd, h);
  W.colliders.push({ minX: x1, maxX: x1 + WALL_T, minZ: z0, maxZ: z1, minY: y0, maxY: cy, enabled: true });
  // west wall: interior face looks toward +x, split around the doorway (z 3.8 .. 4.75)
  const WD0 = 3.8, WD1 = 4.75, WD_H = 2.1;
  wallBox(WALL_T, h, WD0 - z0, x0 - WALL_T / 2, cyc, (z0 + WD0) / 2, 0, WD0 - z0, h);
  wallBox(WALL_T, h, z1 - WD1, x0 - WALL_T / 2, cyc, (WD1 + z1) / 2, 0, z1 - WD1, h);
  wallBox(WALL_T, h - WD_H, WD1 - WD0, x0 - WALL_T / 2, y0 + WD_H + (h - WD_H) / 2, (WD0 + WD1) / 2, 0, WD1 - WD0, h - WD_H);
  W.colliders.push({ minX: x0 - WALL_T, maxX: x0, minZ: z0, maxZ: WD0, minY: y0, maxY: cy, enabled: true });
  W.colliders.push({ minX: x0 - WALL_T, maxX: x0, minZ: WD1, maxZ: z1, minY: y0, maxY: cy, enabled: true });


  // tile wainscot strip (darker green band)
  const band = new THREE.Mesh(planeGeo(x1 - x0, 0.9), M.tileWallBlue);
  band.position.set(cx, y0 + 0.45, z0 + 0.012); g.add(band);
  const band2 = new THREE.Mesh(planeGeo(x1 - x0, 0.9), M.tileWallBlue);
  band2.rotation.y = Math.PI; band2.position.set(cx, y0 + 0.45, z1 - 0.012); g.add(band2);
  // the same band on the side walls, otherwise the room reads as two different finishes
  const band3 = new THREE.Mesh(planeGeo(z1 - z0, 0.9), M.tileWallBlue);
  band3.rotation.y = -Math.PI / 2; band3.position.set(x1 - 0.012, y0 + 0.45, cz); g.add(band3);
  for (const [bz0, bz1] of [[z0, WD0], [WD1, z1]]) {
    const band4 = new THREE.Mesh(planeGeo(bz1 - bz0, 0.9), M.tileWallBlue);
    band4.rotation.y = Math.PI / 2;
    band4.position.set(x0 + 0.012, y0 + 0.45, (bz0 + bz1) / 2);
    g.add(band4);
  }

  // ---------------------------------------------------------------- fixtures
  // sink
  const sink = new THREE.Group(); sink.position.set(2.45, y0, z0 + 0.3); g.add(sink);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.13, 0.1, 24, 1, true), M.porcelain);
  basin.scale.x = 1.2; basin.position.y = 0.8; sink.add(basin);
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 6, 26), M.porcelain);
  rimT.rotation.x = Math.PI / 2; rimT.scale.x = 1.2; rimT.position.y = 0.85; sink.add(rimT);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.09, 22), new THREE.MeshStandardMaterial({ color: 0x8f8d80, roughness: 0.35 }));
  inner.scale.x = 1.2; inner.position.y = 0.795; sink.add(inner);
  sink.add(box(0.58, 0.06, 0.42, M.porcelain, 0, 0.755, 0));
  sink.add(cyl(0.05, 0.05, 0.5, M.porcelain, 10).translateY(0.52).translateZ(0.02));
  sink.add(cyl(0.012, 0.012, 0.16, M.metalGalv, 6).translateY(0.94).translateZ(-0.06));
  // tap
  const tap = new THREE.Group(); tap.position.set(0, 0.96, -0.16); sink.add(tap);
  tap.add(cyl(0.012, 0.012, 0.18, M.metalGalv, 8).rotateX(Math.PI / 2).translateZ(0.09));
  tap.add(cyl(0.012, 0.012, 0.1, M.metalGalv, 8).translateY(-0.05));
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.005, 0.22, 6, 1, true), M.glass);
  water.position.set(0, 0.86, 0.02); tap.add(water);
  tap.add(cyl(0.018, 0.018, 0.02, M.metalGalv, 8).translateY(0.03).translateZ(-0.02));
  // plumbing below
  sink.add(cyl(0.03, 0.03, 0.3, M.metalRust, 8).translateY(0.25).translateZ(-0.12));
  sink.add(cyl(0.03, 0.03, 0.26, M.metalRust, 8).rotateX(Math.PI / 2).translateY(0.12).translateZ(0.0));
  W.colliders.push({ minX: 2.1, maxX: 2.8, minZ: z0, maxZ: z0 + 0.5, minY: y0, maxY: y0 + 1.0, enabled: true });

  W.colliders.push({ minX: 2.12, maxX: 2.78, minZ: z0 + 0.02, maxZ: z0 + 0.68, minY: y0, maxY: y0 + 1.0, enabled: true }); // vanity

  // mirror above sink (real planar reflection)
  const mirror = W.makeMirror({ width: 0.66, height: 0.88, x: 2.45, y: y0 + 1.32, z: z0 + 0.045, ry: 0, room: 'bath' });
  // mirror light (a small warm tube above the glass)
  g.add(box(0.8, 0.05, 0.08, M.metalGalv, 2.45, y0 + 1.82, z0 + 0.1));
  const mTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.7, 8), M.tube);
  mTube.rotation.z = Math.PI / 2; mTube.position.set(2.45, y0 + 1.79, z0 + 0.12); g.add(mTube);
  W.addLight('bath', (() => {
    const l = new THREE.PointLight(0xffd9b0, 6, 3.2, 2);
    l.position.set(2.45, y0 + 1.72, z0 + 0.24); return l;
  })());
  g.add(mirror.group);

  // toilet
  const toilet = new THREE.Group(); toilet.position.set(3.55, y0, 4.85); toilet.rotation.y = -Math.PI / 2; g.add(toilet);
  toilet.add(box(0.36, 0.42, 0.5, M.porcelain, 0, 0.21, 0.05));
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.16, 18), M.porcelain);
  bowl.position.set(0, 0.42, 0.16); bowl.scale.z = 1.25; toilet.add(bowl);
  const seat = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 6, 18), M.porcelain);
  seat.rotation.x = Math.PI / 2; seat.scale.z = 1.25; seat.position.set(0, 0.51, 0.16); toilet.add(seat);
  toilet.add(box(0.44, 0.52, 0.16, M.porcelain, 0, 0.68, -0.24));
  toilet.add(box(0.4, 0.04, 0.14, M.porcelain, 0, 0.94, -0.24));
  toilet.add(cyl(0.02, 0.02, 0.02, M.metalGalv, 8).translateY(0.93).translateZ(-0.18));
  W.colliders.push({ minX: 3.1, maxX: 3.95, minZ: 4.35, maxZ: 5.25, minY: y0, maxY: y0 + 0.9, enabled: true });

  // shower: head, pipe, curtain rail
  const sh = new THREE.Group(); sh.position.set(2.15, y0, z1 - 0.06); sh.rotation.y = Math.PI; g.add(sh);
  sh.add(cyl(0.014, 0.014, 1.0, M.metalGalv, 8).translateY(1.65).translateZ(0.02));
  sh.add(cyl(0.014, 0.014, 0.28, M.metalGalv, 8).rotateX(Math.PI / 2).translateY(2.15).translateZ(0.14));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.05, 16), M.metalGalv);
  head.position.set(0, 2.1, 0.27); sh.add(head);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    sh.add(cyl(0.002, 0.002, 0.2, M.glass, 3).translateX(Math.cos(a) * 0.05).translateY(1.98).translateZ(0.27 + Math.sin(a) * 0.05));
  }
  // plastic curtain
  const curtainM = new THREE.MeshStandardMaterial({ color: 0xa8b4a6, roughness: 0.5, transparent: true, opacity: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const pc = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.55, 16, 8), curtainM);
  const pp = pc.geometry.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 12) * 0.03);
  pc.geometry.computeVertexNormals();
  pc.position.set(2.1, y0 + 1.35, z1 - 0.18); g.add(pc);
  g.add(cyl(0.01, 0.01, 1.1, M.metalGalv, 6).rotateZ(Math.PI / 2).translateX(2.1).translateY(y0 + 2.12).translateZ(z1 - 0.18));
  // drain
  g.add(cyl(0.06, 0.06, 0.006, M.metalRust, 12).translateX(2.1).translateY(y0 + 0.012).translateZ(4.9));
  for (let i = 0; i < 5; i++) g.add(box(0.1, 0.004, 0.006, M.blackMetal, 2.1, y0 + 0.016, 4.86 + i * 0.018));

  // water heater
  const wh = new THREE.Group(); wh.position.set(x1 - 0.12, y0 + 1.55, 3.4); wh.rotation.y = -Math.PI / 2; g.add(wh);
  wh.add(box(0.4, 0.5, 0.18, M.enamelWhite, 0, 0, 0));
  wh.add(cyl(0.008, 0.008, 0.36, M.metalGalv, 5).translateY(-0.4));
  wh.add(cyl(0.008, 0.008, 0.36, M.metalGalv, 5).translateX(0.06).translateY(-0.4));
  wh.add(box(0.12, 0.05, 0.02, M.blackMetal, 0.06, 0.18, 0.1));
  const ledG = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), M.bulbRed);
  ledG.position.set(-0.05, 0.18, 0.1); wh.add(ledG);

  // shelf / toiletries
  g.add(box(0.5, 0.03, 0.16, M.metalRust, 3.3, y0 + 1.75, z1 - 0.12));
  for (let i = 0; i < 3; i++) {
    const b = cyl(0.03, 0.03, 0.12, [M.plasticGreen, M.enamelWhite, M.plasticBlue][i], 10);
    b.position.set(3.15 + i * 0.13, y0 + 1.82, z1 - 0.12); g.add(b);
  }
  // bucket + mop
  const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 16, 1, true), M.plasticRed);
  bk.position.set(2.0, y0 + 0.15, 3.55); g.add(bk);
  // towel
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.6, 6, 10), M.fabricCream);
  const tp = towel.geometry.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getY(i) * 8) * 0.012);
  towel.geometry.computeVertexNormals();
  towel.position.set(2.9, y0 + 1.35, z1 - 0.1); g.add(towel);

  // ---------------------------------------------------------------- grime
  // mould sits on a wall face, near the ceiling — not floating in the middle of the room
  for (let i = 0; i < 8; i++) {
    const s = sticker('mold', rand(0.3, 0.8), rand(0.3, 0.8), rand(0.2, 0.5));
    const yy = rand(y0 + 1.65, y0 + 2.55);
    switch (i % 3) {
      case 0:
        s.position.set(rand(x0 + 0.35, x1 - 0.35), yy, z0 + 0.02);
        break;
      case 1:
        s.position.set(rand(x0 + 0.35, x1 - 0.35), yy, z1 - 0.02);
        s.rotation.y = Math.PI;
        break;
      default:
        s.position.set(x1 - 0.02, yy, rand(z0 + 0.35, z1 - 0.35));
        s.rotation.y = -Math.PI / 2;
    }
    s.rotation.z = rand(0, 6); g.add(s);
  }
  for (let i = 0; i < 6; i++) {
    const s = sticker('stain', rand(0.3, 0.7), rand(0.4, 1.1), rand(0.2, 0.4));
    s.position.set(rand(x0 + 0.2, x1 - 0.2), rand(y0 + 0.8, y0 + 2.4), z1 - 0.015);
    s.rotation.y = Math.PI; g.add(s);
  }
  // hairline cracks on the mirror wall
  g.add(box(0.005, 0.8, 0.002, M.dirt, 2.9, y0 + 1.8, z0 + 0.02));

  // ---------------------------------------------------------------- light
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.9, 10), M.tubeGreen);
  tube.rotation.z = Math.PI / 2; tube.position.set(2.5, cy - 0.12, cz); g.add(tube);
  g.add(box(1.0, 0.06, 0.12, M.metalDark, 2.5, cy - 0.07, cz));
  const l = W.addLight('bath', (() => {
    const p = new THREE.PointLight(0xcfe6d8, 14, 4.2, 2);
    p.position.set(2.5, cy - 0.3, cz); return p;
  })());
  W.flicker(l, { min: 0.25, max: 1, speed: 3.4, pattern: 'tube' });

  // mirror-only ghost silhouette, standing in the doorway behind the player
  const ghost = new THREE.Group();
  const gm = new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0.92, depthWrite: false });
  const bodyG = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.9, 6, 10), gm);
  bodyG.position.y = 1.05; ghost.add(bodyG);
  const headG = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), gm);
  headG.position.y = 1.72; ghost.add(headG);
  const hairG = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), gm);
  hairG.scale.set(1, 1.35, 0.9); hairG.position.set(0, 1.7, -0.02); ghost.add(hairG);
  ghost.position.set(x0 + 0.25, y0, 4.3); ghost.rotation.y = 0.6;
  ghost.visible = false;
  ghost.layers.set(2);
  ghost.traverse(o => o.layers.set(2));
  W.root.add(ghost);

  W.room('bath', { x0, x1, z0, z1, y0 });
  W.onEnter('bath', () => W.audio?.setAmbience('bath'));
  W.onEnter('bath', () => W.hud.room('浴室'));
  return { mirror, ghost, tap, water };
}
