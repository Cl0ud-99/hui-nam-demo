import * as THREE from 'three';
import { M, decalMat, posterMat } from '../core/materials.js';
import { T } from '../core/textures.js';
import { box, cyl, mesh, planeGeo, rand } from '../core/util.js';
import { wallGroup } from './buildutil.js';
import { makeDoor, makeWindow } from './fixtures.js';
import {
  bulbLamp, fluorescent, bucket, mop, cardboardBox, crate, pictureFrame, poster, sticker, cable, tube,
} from '../core/props.js';

export const STAIR = { x0: -1.8, x1: 1.8, z0: -6.6, z1: -1.0, h: 6.6 };
export const STEPS = { rise: 0.15, run: 0.25, count: 12, w1z0: -1.55, w2z0: -6.45, top: 3.6 };

export function buildStairs(W) {
  const { x0, x1, z0, z1, h } = STAIR;
  const g = new THREE.Group(); W.root.add(g);
  const cx = (x0 + x1) / 2;

  // ---------------------------------------------------------------- shell
  const floorMat = M.floorConcrete.clone();
  W.wetFloor(floorMat, { room: 'stairs', amount: 0.0, distortion: 0.0 });
  const floor = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.01, (z0 + z1) / 2);
  floor.receiveShadow = true; g.add(floor);

  const ceil = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), M.ceilingDirty);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, h, (z0 + z1) / 2); g.add(ceil);

  // west / east walls
  const west = new THREE.Mesh(planeGeo(z1 - z0, h), M.concreteDark);
  west.rotation.y = Math.PI / 2; west.position.set(x0, h / 2, (z0 + z1) / 2); west.receiveShadow = true; g.add(west);
  const east = new THREE.Mesh(planeGeo(z1 - z0, h), M.concrete);
  east.rotation.y = -Math.PI / 2; east.position.set(x1, h / 2, (z0 + z1) / 2); east.receiveShadow = true; g.add(east);

  // north wall with a barred window
  const north = wallGroup(x1 - x0, h, M.concreteDark, [{ x0: 1.2, x1: 2.4, y0: 3.1, y1: 4.9 }]);
  north.position.set(cx, 0, z0); g.add(north);
  W.colliders.push({ minX: x0, maxX: x1, minZ: z0 - 0.2, maxZ: z0 + 0.05, minY: 0, maxY: h, enabled: true });

  // south wall: opening to shop + apartment door above
  const south = wallGroup(x1 - x0, h, M.concrete, [{ x0: 1.26, x1: 2.34, y0: 0, y1: 2.3 }, { x0: 0.25, x1: 1.25, y0: 3.6, y1: 5.85 }]);
  south.position.set(cx, 0, z1);
  south.rotation.y = Math.PI;
  g.add(south);
  W.colliders.push({ minX: x0, maxX: -0.54, minZ: z1 - 0.05, maxZ: z1 + 0.2, minY: 0, maxY: 3.6, enabled: true });
  W.colliders.push({ minX: 0.54, maxX: x1, minZ: z1 - 0.05, maxZ: z1 + 0.2, minY: 0, maxY: 3.6, enabled: true });
  W.colliders.push({ minX: -0.72, maxX: 0.55, minZ: z1 - 0.05, maxZ: z1 + 0.2, minY: 2.3, maxY: h, enabled: true });
  W.colliders.push({ minX: 0.55, maxX: 1.55, minZ: z1 - 0.05, maxZ: z1 + 0.2, minY: 2.3, maxY: 3.6, enabled: true });
  W.colliders.push({ minX: 1.55, maxX: x1, minZ: z1 - 0.05, maxZ: z1 + 0.2, minY: 2.3, maxY: h, enabled: true });

  // window + glass
  const win = makeWindow(W, { x: 0, y: 3.1, z: z0 + 0.02, w: 1.2, h: 1.8, bars: 2, ry: 0, frameMat: M.metalDark, glassMat: M.glass });
  g.add(win.group);

  // ---------------------------------------------------------------- stairs
  // matte metal nosing: the polished M.metalRust strip was catching the bulb as a blown white line
  const stepNoseMat = new THREE.MeshStandardMaterial({ color: 0x6b6b64, metalness: 0.45, roughness: 0.72, envMapIntensity: 0.35 });
  const stepMatTop = M.floorTerrazzo;
  const stepMatSide = M.concrete;
  function buildFlight(startZ, endZ, startY, dir, xa, xb, thin = false) {
    const w = xb - xa, cxA = (xa + xb) / 2;
    for (let i = 0; i < STEPS.count; i++) {
      const topY = startY + (i + 1) * STEPS.rise;
      const zc = startZ + dir * (i + 0.5) * STEPS.run;
      if (thin) {
        // suspended concrete tread on a steel stringer (upper flight)
        const s = box(w, 0.2, STEPS.run + 0.01, stepMatSide, cxA, topY - 0.1, zc);
        g.add(s);
        g.add(box(w, STEPS.rise, 0.035, stepMatSide, cxA, topY - STEPS.rise / 2, zc + dir * (STEPS.run / 2 - 0.02)));
      } else {
        const base = startY;
        const height = topY - base;
        const s = box(w, height, STEPS.run + 0.01, stepMatSide, cxA, base + height / 2, zc);
        g.add(s);
      }
      // the tread plate used to have its top face exactly coplanar with the structural step
      // box below it — that is what flickered under your feet while walking; keep it 4 mm proud
      const tread = box(w + 0.02, 0.03, STEPS.run + 0.02, stepMatTop, cxA, topY - 0.011, zc);
      g.add(tread);
      const nose = box(w + 0.03, 0.012, 0.035, stepNoseMat, cxA, topY + 0.0, zc + dir * (STEPS.run / 2 - 0.01));
      g.add(nose);
    }
    if (!thin) {
      const len = Math.abs(endZ - startZ);
      g.add(box(0.1, 2.2, len, M.concreteDark, xa - 0.05, 1.1, (startZ + endZ) / 2));
    }
  }
  // flight 1: down the left half, going -Z
  buildFlight(STEPS.w1z0, STEPS.w1z0 - STEPS.count * STEPS.run, 0, -1, x0 + 0.12, x1 - 0.12);
  // landing 1
  const l1 = box(x1 - x0, 0.24, 1.9, M.floorTerrazzo, 0, 1.68, -5.5);
  g.add(l1);
  // flight 2: back up the right half, going +Z
  buildFlight(STEPS.w2z0, STEPS.w2z0 + STEPS.count * STEPS.run, 1.8, 1, 0.34, x1 - 0.08, true);
  // top landing
  g.add(box(x1 - 0.3, 0.2, 2.5, M.floorTerrazzo, (0.3 + x1) / 2, 3.5, -2.25));
  // railing around the open well
  for (let i = 0; i < 7; i++) {
    g.add(cyl(0.014, 0.014, 1.0, M.metalDark, 6).translateX(0.32).translateY(4.1).translateZ(-3.45 + i * 0.42));
  }
  g.add(cyl(0.02, 0.02, 2.5, M.metalDark, 8).rotateX(Math.PI / 2).translateX(0.32).translateY(4.6).translateZ(-2.2));

  // stair collision: ramps handled by ground function in world.js
  // both side walls are solid for the full height, or you can walk straight through them
  W.colliders.push({ minX: x0 - 0.1, maxX: x0 + 0.08, minZ: z0 - 0.1, maxZ: z1 + 0.1, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: x1 - 0.08, maxX: x1 + 0.1, minZ: z0 - 0.1, maxZ: z1 + 0.1, minY: 0, maxY: h, enabled: true });
  // the open stair well: railing line on the landing + along flight 2
  W.colliders.push({ minX: 0.26, maxX: 0.38, minZ: -3.52, maxZ: -0.95, minY: 3.6, maxY: h, enabled: true });
  // top landing back edge (the wall behind the landing)
  W.colliders.push({ minX: x0, maxX: x1, minZ: z0 - 0.1, maxZ: z0 + 0.1, minY: 0, maxY: h, enabled: true });

  // handrail on flight 1 + landing
  const railMat = M.metalDark;
  for (const sx of [x0 + 0.09, x1 - 0.09]) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const z = -1.7 - t * 2.8;
      const y = t * 1.8 + 0.95;
      g.add(cyl(0.012, 0.012, 0.9, railMat, 6).translateX(sx).translateY(y - 0.42).translateZ(z));
    }
    const railPts = [new THREE.Vector3(sx, 0.95, -1.6), new THREE.Vector3(sx, 2.75, -4.5), new THREE.Vector3(sx, 2.75, -6.3)];
    g.add(tube(railPts, 0.02, railMat, 8));
  }

  // ---------------------------------------------------------------- grime & details
  // the south wall of the stairwell carries the ground-floor doorway, so decals are placed only
  // on the two solid piers beside it — a stain over the opening hangs in mid air
  for (let i = 0; i < 10; i++) {
    const sw = rand(0.4, 0.95);
    const s = sticker('stain', sw, rand(0.5, 1.4), rand(0.2, 0.45));
    const piers = [[x0 + 0.12, -0.66 - sw / 2], [0.66 + sw / 2, x1 - 0.12]];
    const ok = piers.filter(([a, b]) => b - a > 0.05);
    if (!ok.length) { s.visible = false; g.add(s); continue; }
    const [a, b] = ok[Math.floor(Math.random() * ok.length)];
    s.position.set(rand(a, b), rand(0.3, 3.2), z1 - 0.02);
    s.rotation.y = Math.PI; s.rotation.z = rand(-0.25, 0.25);
    g.add(s);
  }
  const graf = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({
    map: T.art.graffiti, transparent: true, opacity: 0.75, depthWrite: false, color: 0xb8ada0, toneMapped: false,
  }));
  graf.position.set(-0.01, 1.5, z0 + 0.02); g.add(graf);

  // red pipes running along the wall and up the stairwell
  const pipeMat = M.pipeRed;
  for (const yy of [2.55, 2.72]) {
    const p = cyl(0.035, 0.035, z1 - z0 - 0.1, pipeMat, 10);
    p.rotation.x = Math.PI / 2; p.position.set(x0 + 0.14, yy, (z0 + z1) / 2); g.add(p);
  }
  for (const xx of [2.5, 2.72]) {
    const p = cyl(0.03, 0.03, h - 0.2, pipeMat, 8);
    p.position.set(x0 + 0.14 + (xx - 2.5) * 0.12, h / 2, -1.1); g.add(p);
  }
  // vertical pipe clamp detail
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 5, 10), M.metalRust);
    ring.rotation.x = Math.PI / 2; ring.position.set(x0 + 0.14, 0.4 + i * 0.9, -1.1); g.add(ring);
  }
  // conduit on east wall
  g.add(cyl(0.018, 0.018, 4.2, M.metalGalv, 6).rotateX(Math.PI / 2).translateX(x1 - 0.12).translateY(3.0).translateZ(-3.4));

  // mailboxes near the shop door
  const mb = new THREE.Group(); mb.position.set(x1 - 0.12, 1.35, -1.9); mb.rotation.y = -Math.PI / 2; g.add(mb);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const b = box(0.22, 0.26, 0.12, M.metalGalv, -0.33 + c * 0.22, -0.26 + r * 0.26, 0);
    mb.add(b);
    mb.add(box(0.16, 0.012, 0.01, M.blackMetal, -0.33 + c * 0.22, -0.2 + r * 0.26, 0.065));
  }
  mb.add(box(0.95, 0.03, 0.02, M.metalRust, 0, 0.14, 0.04));

  W.colliders.push({ minX: 1.48, maxX: x1, minZ: -2.3, maxZ: -1.5, minY: 0, maxY: 2.4, enabled: true });  // mailbox bank
  W.colliders.push({ minX: -1.62, maxX: -1.08, minZ: -6.6, maxZ: -6.05, minY: 1.8, maxY: 2.9, enabled: true }); // landing shrine

  // shrine on the landing
  const sh = new THREE.Group(); sh.position.set(-1.35, 1.8, -6.35); sh.rotation.y = 0.25; g.add(sh);
  sh.add(box(0.4, 0.55, 0.24, M.shrineRed, 0, 0.28, 0));
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.12, 0.06) });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.3), glowM);
  glow.position.set(0, 0.32, 0.121); sh.add(glow);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.05, 12), M.brass);
  bowl.position.set(0, 0.62, 0.05); sh.add(bowl);
  // oranges
  for (const dx of [-0.13, 0.13]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc46a1e, roughness: 0.55 }));
    o.position.set(dx, 0.66, 0.18); sh.add(o);
  }
  sh.add(box(0.34, 0.02, 0.1, M.shrineDark, 0, 0.62, 0.16));

  // bucket catching a drip
  const bk = bucket(0.16, 0.26, M.plasticRed); bk.position.set(0.9, 1.82, -5.9); g.add(bk);
  const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.5, 4), M.glass);
  drip.position.set(0.9, 2.2, -5.9); g.add(drip);

  // boxes / clutter on landing
  const b1 = cardboardBox(0.5, 0.4, 0.42); b1.position.set(1.1, 1.8, -4.95); b1.rotation.y = 0.3; g.add(b1);
  const b2 = crate(0.44, 0.3, 0.34); b2.position.set(-1.3, 1.8, -5.0); g.add(b2);
  const mopG = mop(); mopG.position.set(1.35, 0, -1.5); mopG.rotation.z = 0.1; g.add(mopG);

  // ---------------------------------------------------------------- lights
  const lampA = bulbLamp({ cord: 3.30, shade: false });
  lampA.position.set(-1.1, 6.6, -2.1); g.add(lampA);
  g.add(box(0.14, 0.06, 0.14, M.metalDark, -1.1, 6.58, -2.1));
  const la = W.addLight('stairs', (() => {
    const l = new THREE.PointLight(0xffc08a, 24, 8.0, 2);
    l.position.set(-1.1, 3.15, -2.1);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0015; l.shadow.normalBias = 0.02;
    return l;
  })());
  W.flicker(la, { min: 0.35, max: 1, speed: 2.2, pattern: 'bulb' });
  W.animators.push((t) => {
    lampA.rotation.z = Math.sin(t * 0.55) * 0.03;
    lampA.position.x = -1.1 + Math.sin(t * 0.55) * 0.03;
  });

  const lampB = bulbLamp({ cord: 3.45, shade: false });
  lampB.position.set(0.85, 6.6, -5.55); g.add(lampB);
  g.add(box(0.14, 0.06, 0.14, M.metalDark, 0.85, 6.58, -5.55));
  const lb = W.addLight('stairs', (() => {
    const l = new THREE.PointLight(0xffb070, 15, 6.5, 2);
    l.position.set(0.85, 3.0, -5.55); return l;
  })());
  W.flicker(lb, { min: 0.75, max: 1, speed: 6, pattern: 'soft' });

  const lampC = bulbLamp({ cord: 1.05, shade: false });
  lampC.position.set(0.2, 6.6, -2.3); g.add(lampC);
  g.add(box(0.14, 0.06, 0.14, M.metalDark, 0.2, 6.58, -2.3));
  W.addLight('stairs', (() => {
    const l = new THREE.PointLight(0xffcf9e, 18, 8, 2);
    l.position.set(0.2, 5.4, -2.3); return l;
  })());

  W.addLight('stairs', (() => {
    const l = new THREE.PointLight(0xff2a10, 2.4, 2.6, 2);
    l.position.set(-1.35, 2.3, -6.3); return l;
  })());
  // cold shaft from the window
  const winLight = W.addLight('stairs', (() => {
    const l = new THREE.SpotLight(0x8fa9c0, 26, 9, 0.7, 0.7, 1.6);
    l.position.set(0.1, 4.4, -6.4);
    l.target.position.set(0.4, 1.2, -3.2);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002;
    return l;
  })());
  W.root.add(winLight.target);

  // light shaft volume
  W.volumetric({ x: 0.1, y: 4.0, z: -6.35, w: 1.1, h: 2.2, len: 3.4, color: 0x9fb6cc, intensity: 0.5, dir: new THREE.Vector3(0.25, -1, 0.45).normalize() });

  W.addLight('stairs', (() => {
    const l = new THREE.PointLight(0x8a7a66, 5, 7, 2);
    l.position.set(0, 2.0, -3.0); return l;
  })());
  const stepLight = bulbLamp({ cord: 2.85, shade: false });
  stepLight.position.set(-1.2, 6.6, -3.4); g.add(stepLight);
  g.add(box(0.14, 0.06, 0.14, M.metalDark, -1.2, 6.58, -3.4));
  W.addLight('stairs', (() => {
    const l = new THREE.PointLight(0xffc088, 10, 5, 2);
    l.position.set(-1.2, 3.1, -3.4); return l;
  })());

  W.room('stairs', { x0, x1, z0, z1, y0: 0 });
  W.onEnter('stairs', () => W.audio?.setAmbience('stairs'));
  W.onEnter('stairs', () => W.hud.room('後樓梯'));

  // apartment door at the top landing
  // the flat's own front door (apartment.js) fills this opening — a second leaf hung on the
  // landing side made the player open the same doorway twice
  return { winLight };
}
