import * as THREE from 'three';
import { M, posterMat, decalMat } from '../core/materials.js';
import { T } from '../core/textures.js';
import { box, cyl, mesh, planeGeo, rand, scaleUV } from '../core/util.js';
import { wallGroup } from './buildutil.js';
import { makeDoor, makeWindow } from './fixtures.js';
import {
  apothecary, shopCounter, herbJar, medicineBottle, brassScale, abacus, radio,
  woodenStool, woodenChair, pictureFrame, poster, stuckPoster, sticker, stackOfBooks,
  newspapers, bulbLamp, fluorescent, wallFan, cardboardBox, crate, bucket, hangingCloth, blobShadow,
} from '../core/props.js';

export const SHOP = { x0: -4, x1: 4, z0: -1, z1: 6, h: 3.45 };

export function buildShop(W) {
  const { x0, x1, z0, z1, h } = SHOP;
  const g = new THREE.Group(); W.root.add(g);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  // ---------------------------------------------------------------- shell
  const floorMat = M.floorShop.clone();
  // no planar reflection indoors: looking down used to smear lamp ghosts across the tiles
  W.wetFloor(floorMat, { room: 'shop', amount: 0.0, distortion: 0.05, blur: 0.0035, tint: 0xfff2e2, grout: 0.9, groutWidth: 0.013, groutDark: 0.45 });
  // patchy polish. A single low roughness value made the whole floor mirror the lamps and
  // read as freshly waxed; a blotchy roughness map keeps only the traffic lanes semi-glossy.
  const floorRough = (() => {
    const S = 512;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgb(216,216,216)'; ctx.fillRect(0, 0, S, S);   // base: matte terrazzo
    let sd = 7;
    const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd & 0x7fffffff) / 2147483647; };
    for (let i = 0; i < 140; i++) {
      const x = rnd() * S, y = rnd() * S, r = 18 + rnd() * 95;
      const v = Math.round(105 + rnd() * 95);                       // darker patch = smoother
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.6, 2.6);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  })();
  floorMat.roughnessMap = floorRough;
  floorMat.roughness = 1.0;
  floorMat.metalness = 0.0;
  floorMat.envMapIntensity = 0.16;
  const floor = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.02, cz);
  floor.receiveShadow = true; g.add(floor); W.groundHide.push(floor);
  // wear: three broad, faint patches where a 40-year-old shop actually gets dirty
  for (const [wx, wz, ww, wd, op] of [[0.9, 5.15, 1.7, 1.1, 0.34], [-0.55, 3.45, 2.6, 0.95, 0.26], [0.0, 0.25, 6.2, 0.7, 0.22]]) {
    const w = sticker('stain', ww, wd, op);
    w.rotation.x = -Math.PI / 2;
    w.position.set(wx, 0.024, wz);
    g.add(w);
  }

  const ceil = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), M.ceilingDirty);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, h, cz); g.add(ceil);

  // beams
  for (let i = 0; i < 3; i++) {
    const b = box(x1 - x0 + 0.02, 0.16, 0.12, M.beamRough, cx, h - 0.09, z0 + 1.4 + i * 2.2);
    g.add(b);
  }

  // north wall (back of shop, door to stairs)
  const back = wallGroup(x1 - x0, h, M.wallPeelGreen, [{ x0: 3.46, x1: 4.54, y0: 0, y1: 2.3 }]);
  back.position.set(cx, 0, z0); g.add(back);
  W.colliders.push({ minX: x0, maxX: -0.54, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: 0.54, maxX: x1, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: -0.72, maxX: 0.72, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: 2.3, maxY: h, enabled: true });

  // west wall
  const west = new THREE.Mesh(planeGeo(z1 - z0, h), M.wallPeelGreen);
  west.rotation.y = Math.PI / 2; west.position.set(x0, h / 2, cz); west.receiveShadow = true; g.add(west);
  W.colliders.push({ minX: x0 - 0.15, maxX: x0 + 0.15, minZ: z0, maxZ: z1, minY: 0, maxY: h, enabled: true });

  // east wall
  const east = new THREE.Mesh(planeGeo(z1 - z0, h), M.wallPeel);
  east.rotation.y = -Math.PI / 2; east.position.set(x1, h / 2, cz); east.receiveShadow = true; g.add(east);
  W.colliders.push({ minX: x1 - 0.15, maxX: x1 + 0.15, minZ: z0, maxZ: z1, minY: 0, maxY: h, enabled: true });

  // green painted wainscot on west + back
  for (let i = 0; i < 2; i++) {
    const p = new THREE.Mesh(planeGeo(z1 - z0, 0.95), M.wallPeelGreen.clone());
    p.material.color.setHex(0x4c5a46); p.material.roughness = 0.75;
    p.rotation.y = Math.PI / 2; p.position.set(x0 + 0.012, 0.48, cz);
    if (i === 0) g.add(p);
  }

  // ---------------------------------------------------------------- storefront
  const sf = new THREE.Group(); sf.position.set(0, 0, z1); g.add(sf);
  const plaster = M.wallPeelGreen;
  // piers
  sf.add(box(0.7, h, 0.22, plaster, -3.65, h / 2, 0));
  sf.add(box(2.4, h, 0.22, plaster, 2.8, h / 2, 0));
  // header
  sf.add(box(8, 0.45, 0.22, plaster, 0, h - 0.225, 0));
  // stall riser
  sf.add(box(4.1, 0.92, 0.2, M.shutter, -1.45, 0.46, 0));
  // window frame
  const wfMat = M.woodBlack;
  sf.add(box(4.2, 0.08, 0.16, wfMat, -1.45, 2.92, 0));
  sf.add(box(4.2, 0.09, 0.16, wfMat, -1.45, 0.92, 0));
  for (const px of [-3.5, -2.4, -1.3, -0.2, 0.6]) sf.add(box(0.07, 2.0, 0.16, wfMat, px, 1.92, 0));
  const glassStore = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.0), M.glass);
  glassStore.position.set(-1.45, 1.92, -0.02); sf.add(glassStore);
  // door opening frame
  // doorway: head matched to the shopfront glazing (2.85).
  // the frame is pushed 12 mm back and stops at the pier face (x=1.60) so no face is coplanar with the wall
  sf.add(box(0.1, 2.85, 0.22, wfMat, 0.70, 1.425, -0.012));
  sf.add(box(0.1, 2.85, 0.22, wfMat, 1.60, 1.425, -0.012));
  sf.add(box(1.0, 0.2, 0.22, wfMat, 1.15, 2.95, -0.012));
  sf.add(box(0.96, 0.06, 0.24, wfMat, 1.15, 2.86, -0.012));
  sf.add(box(1.0, 0.14, 0.2, plaster, 1.15, 3.02, -0.012));
  // (the rusty shutter housing sat inside the head beam and read as a doubled plank)
  // outside sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.79), new THREE.MeshStandardMaterial({
    map: T.art.shop_sign, roughness: 0.6, emissive: 0xffffff, emissiveMap: T.art.shop_sign, emissiveIntensity: 0.10,
  }));
  sign.position.set(-1.35, 3.62, 0.18); sf.add(sign);
  // sign board backing
  sf.add(box(3.04, 0.92, 0.12, M.signBack, -1.35, 3.62, 0.10));

  // neon, perpendicular to the facade so it reads down the alley
  const neonMat = new THREE.MeshBasicMaterial({
    map: T.art.neon_fuan, transparent: true, color: new THREE.Color(1.25, 1.0, 1.0),
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.46), neonMat);
  neon.position.set(-6.2, 3.35, 6.28); neon.rotation.y = 0.35;
  g.add(neon);
  g.add(box(1.0, 0.5, 0.06, M.woodBlack, -6.2, 3.35, 6.24));
  const neonArm = box(1.6, 0.05, 0.05, M.metalRust, -6.9, 4.2, 6.05); g.add(neonArm);
  W.animators.push((t) => {
    const f = Math.sin(t * 23) * Math.sin(t * 7.3) > 0.82 ? 0.15 : 1;
    neonMat.color.setRGB(1.25 * f, 1.0 * f, 1.0 * f);
  });
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xff2a1e, 6, 5.5, 2);
    l.position.set(-6.2, 3.2, 6.5); return l;
  })());
  // porch cage lamp to the right of the door, washing the pier
  const porchLamp = bulbLamp({ cord: 0.12, shade: false });
  porchLamp.position.set(3.35, 2.62, 6.22); g.add(porchLamp);
  g.add(box(0.16, 0.04, 0.22, M.metalRust, 3.35, 2.9, 6.18));
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffb070, 13, 6, 2);
    l.position.set(3.35, 2.5, 6.55); return l;
  })());

  // warm pool over the shop sign
  W.addLight('alley', (() => {
    const l = new THREE.SpotLight(0xffc88a, 14, 8, 0.55, 0.8, 1.4);
    l.position.set(-1.3, 2.2, 7.6);
    l.target.position.set(-1.3, 3.8, 6.1);
    return l;
  })());

  // open shopfront: metal top rail, no door leaf
  const door = { setOpen: () => { } };
  W.colliders.push({ minX: -4, maxX: 0.75, minZ: z1 - 0.12, maxZ: z1 + 0.12, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: 1.50, maxX: 4, minZ: z1 - 0.12, maxZ: z1 + 0.12, minY: 0, maxY: h, enabled: true });
  
  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xbfd4c8, 5, 5, 2);
    l.position.set(1.2, 2.55, 5.4); return l;
  })());

  // ---------------------------------------------------------------- interior fittings
  // apothecary wall on the back wall, flanking the stair door
  const apoL = apothecary(2.5, 2.15, 0.34, 5, 5);
  apoL.position.set(-2.55, 0, z0 + 0.24); g.add(apoL);
  const apoR = apothecary(2.4, 2.15, 0.34, 5, 5);
  apoR.position.set(2.55, 0, z0 + 0.24); g.add(apoR);

  // counter
  const counter = shopCounter(2.35, 0.68, 1.04);
  counter.position.set(-0.55, 0, 2.75); g.add(counter);
  const counterShadow = blobShadow(3.1, 1.35, 0.46);
  counterShadow.position.set(-0.55, 0.028, 2.75); g.add(counterShadow);
  W.colliders.push({ minX: -1.78, maxX: 0.68, minZ: 2.36, maxZ: 3.14, minY: 0, maxY: 1.1, enabled: true });

  const scale = brassScale(); scale.position.set(-0.2, 1.04, 2.7); g.add(scale);
  const ab = abacus(); ab.position.set(0.3, 1.04, 2.95); ab.rotation.y = -0.15; g.add(ab);
  const rd = radio(); rd.position.set(-1.35, 1.04, 2.6); rd.rotation.y = 0.5; g.add(rd);
  // tuner lamp: lit while the set is on, so the state reads without audio
  const radioLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.011, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3a22, toneMapped: false })
  );
  radioLed.position.set(0.045, 0.112, 0.052); radioLed.visible = false; rd.add(radioLed);
  let radioOn = false;
  W.hotspot({
    x: -1.35, y: 1.16, z: 2.6, w: 0.44, h: 0.32, d: 0.4,
    prompt: () => (radioOn ? '關收音機' : '開收音機'),
    range: 2.0,
    use: () => {
      radioOn = !radioOn;
      radioLed.visible = radioOn;
      W.audio?.radioStatic(radioOn);
      W.hud?.subtitle?.(radioOn ? '沙沙……有人喺度講嘢。' : '收音機熄咗。', 2600);
    },
  });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshStandardMaterial({
    map: T.art.newspaper, color: 0xd8ccb2, roughness: 1,
  }));
  led.rotation.x = -Math.PI / 2; led.rotation.z = 0.4; led.position.set(-0.75, 1.045, 2.95); g.add(led);
  for (let i = 0; i < 3; i++) {
    const jar = herbJar(0.06 + i * 0.012, 0.13 + i * 0.02, [0x6a5a32, 0x4e3a24, 0x7a6a42][i]);
    jar.position.set(0.05 + i * 0.16, 1.04, 2.55); g.add(jar);
  }
  const cup = cyl(0.035, 0.028, 0.07, M.porcelain, 12); cup.position.set(0.58, 1.075, 2.62); g.add(cup);

  // stool behind counter
  const st = woodenStool(0.46); st.position.set(-0.9, 0, 1.55); g.add(st);

  // west wall shelving with jars and bottles
  const shelfG = new THREE.Group(); shelfG.position.set(x0 + 0.18, 0, 1.2); g.add(shelfG);
  for (let s = 0; s < 4; s++) {
    const y = 0.65 + s * 0.52;
    shelfG.add(box(0.34, 0.045, 3.6, M.woodDark, 0.02, y, 1.3));
    for (let i = 0; i < 9; i++) {
      const x = 0.02;
      const z = 0.2 + i * 0.36 + rand(-0.03, 0.03);
      if (Math.random() < 0.55) {
        const j = herbJar(rand(0.05, 0.085), rand(0.11, 0.2), [0x5b4a2a, 0x7a6038, 0x3f3222][i % 3]);
        j.position.set(x, y + 0.023, z); shelfG.add(j);
      } else {
        const b = medicineBottle([0x3a2418, 0x2a3a2a, 0x4a2a2a][i % 3]);
        b.position.set(x, y + 0.023, z); shelfG.add(b);
      }
    }
    // uprights
    for (const zz of [0.2, 2.55]) shelfG.add(box(0.34, 2.2, 0.05, M.woodDark, 0.02, 1.1, zz));
  }

  // east wall shelves + wall fan + charts
  const shelfE = new THREE.Group(); shelfE.position.set(x1 - 0.18, 0, 3.4); g.add(shelfE);
  for (let s = 0; s < 3; s++) {
    const y = 0.9 + s * 0.55;
    shelfE.add(box(0.3, 0.04, 2.8, M.woodDark, 0, y, 0));
    for (let i = 0; i < 7; i++) {
      const b = cardboardBox(rand(0.2, 0.3), rand(0.12, 0.2), rand(0.18, 0.26));
      b.position.set(rand(-0.02, 0.02), y + 0.02, -1.1 + i * 0.36);
      b.rotation.y = rand(-0.2, 0.2); shelfE.add(b);
    }
  }
  const fan = wallFan(); fan.position.set(x1 - 0.32, 2.32, 1.55); fan.rotation.y = -Math.PI / 2;
  g.add(fan); W.animators.push((t, dt) => fan.userData.animate?.(t, dt));

  // anatomy charts by the counter
  const chart1 = poster('meridian', 0.52, 0.78); chart1.position.set(x1 - 0.02, 1.75, 4.35); chart1.rotation.y = -Math.PI / 2; g.add(chart1);
  const chart2 = poster('poster_buddha', 0.44, 0.64, { tint: 0xb9ae94 }); chart2.position.set(x1 - 0.02, 1.8, 3.7); chart2.rotation.y = -Math.PI / 2; g.add(chart2);
  const cal = poster('calendar', 0.34, 0.5); cal.position.set(x1 - 0.02, 1.35, 5.35); cal.rotation.y = -Math.PI / 2; g.add(cal);
  const pb = poster('price_board', 0.38, 0.56); pb.position.set(x0 + 0.02, 1.55, 4.3); pb.rotation.y = Math.PI / 2; g.add(pb);
  // beside the back door, not across it: the doorway is x -0.54..0.54 and this used to hang in the gap
  const tb = sticker('talisman', 0.19, 0.66, 0.95); tb.position.set(-0.78, 1.85, z0 + 0.02); g.add(tb);

  // back area: crates, boxes, kettle
  for (let i = 0; i < 4; i++) {
    const c = crate(rand(0.35, 0.5), rand(0.25, 0.36), rand(0.3, 0.4));
    c.position.set(-3.1 + i * 0.32, 0, 0.45 + (i % 2) * 0.4); c.rotation.y = rand(-0.3, 0.3); g.add(c);
  }
  const bx = cardboardBox(0.55, 0.45, 0.45); bx.position.set(2.9, 0, 0.7); g.add(bx);
  const bx2 = cardboardBox(0.45, 0.35, 0.4); bx2.position.set(2.85, 0.45, 0.72); bx2.rotation.y = 0.2; g.add(bx2);

  // front window display shelf + jars
  const disp = new THREE.Group(); disp.position.set(-1.45, 0.92, z1 - 0.35); g.add(disp);
  disp.add(box(4.0, 0.04, 0.3, M.woodDark, 0, 0.02, 0));
  for (let i = 0; i < 12; i++) {
    const j = herbJar(rand(0.05, 0.075), rand(0.1, 0.17), [0x6a5a32, 0x4e3a24, 0x8a7040][i % 3]);
    j.position.set(-1.85 + i * 0.32, 0.04, rand(-0.05, 0.05)); disp.add(j);
  }
  // hanging strips of dried herbs
  for (let i = 0; i < 3; i++) {
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6), M.fabricGreen);
    hb.position.set(-3.2 + i * 0.22, 2.55, z1 - 0.55); g.add(hb);
    g.add(cyl(0.002, 0.002, 0.35, M.rubber, 4).translateY(2.92).translateX(-3.2 + i * 0.22).translateZ(z1 - 0.55));
  }

  // ---------------------------------------------------------------- lighting
  const tube = fluorescent(1.3, { green: true });
  tube.position.set(-1.7, 3.35, 1.9); g.add(tube);
  const tube2 = fluorescent(1.1, { green: false });
  tube2.position.set(1.9, 3.35, 4.25); g.add(tube2);

  const flick = W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xcfe4d8, 26, 9, 2);
    l.position.set(-1.7, 3.15, 1.9);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024);
    l.shadow.bias = -0.0015; l.shadow.normalBias = 0.02;
    return l;
  })(), { global: true });
  const flick2 = W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xd8e6d4, 12, 6, 2);
    l.position.set(1.9, 3.1, 4.25); return l;
  })());
  W.flicker(flick, { min: 0.25, max: 1, speed: 1.4, pattern: 'tube' });
  W.flicker(flick2, { min: 0.5, max: 1, speed: 3.1, pattern: 'soft' });

  const bulb = bulbLamp({ cord: 0.62, shade: true });
  bulb.position.set(-0.7, 3.44, 2.55); g.add(bulb);
  const bulbLight = W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xffb877, 26, 8.5, 2);
    l.position.set(-0.7, 2.56, 2.55); return l;
  })(), { global: true });
  W.flicker(bulbLight, { min: 0.9, max: 1, speed: 7, pattern: 'soft' });
  const bulb2 = bulbLamp({ cord: 0.8, shade: false });
  bulb2.position.set(1.4, 3.4, 4.9); g.add(bulb2);
  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xffbe88, 12, 6, 2);
    l.position.set(1.4, 2.55, 4.9); return l;
  })());

  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xff2a12, 2.2, 2.4, 2);
    l.position.set(-3.4, 1.2, 0.8); return l;
  })());
  // grazing light so the apothecary drawers and labels read
  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xffc78a, 15, 4.4, 2);
    l.position.set(-2.4, 1.9, 1.35); return l;
  })(), { keep: true });
  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xffc78a, 13, 4.2, 2);
    l.position.set(2.4, 1.9, 1.35); return l;
  })(), { keep: true });

  // shrine on the west shelf
  const sh = new THREE.Group(); sh.position.set(x0 + 0.2, 1.55, 1.0); sh.rotation.y = Math.PI / 2; g.add(sh);
  sh.add(box(0.3, 0.4, 0.16, M.shrineRed, 0, 0.2, 0));
  const shGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.12, 0.06) }));
  shGlow.position.set(0, 0.22, 0.081); sh.add(shGlow);
  sh.add(cyl(0.006, 0.006, 0.14, M.candleWax, 6).translateX(0.1).translateY(0.07));
  sh.add(cyl(0.006, 0.006, 0.11, M.candleWax, 6).translateX(-0.1).translateY(0.055));

  // ---------------------------------------------------------------- storytelling props
  const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({
    map: T.art.newspaper, color: 0xcfc3a8, roughness: 1,
  }));
  ledger.rotation.x = -Math.PI / 2; ledger.rotation.z = -0.35; ledger.position.set(-0.95, 1.05, 2.95); g.add(ledger);

  // spider web corners (cheap planes with alpha)
  // dust/stains on walls
  for (let i = 0; i < 7; i++) {
    const sw = rand(0.5, 1.1), sh = rand(0.6, 1.4);
    const s = sticker('stain', sw, sh, rand(0.25, 0.5));
    let sx = rand(-3.8, 3.8);
    // the back wall has the stair doorway cut out of it: a decal there hangs in thin air
    if (sx + sw / 2 > -0.62 && sx - sw / 2 < 0.62) sx = (sx < 0 ? -1 : 1) * rand(0.75, 3.6);
    s.position.set(sx, rand(0.4, 3.2), z0 + 0.015);
    s.rotation.z = rand(0, 6); g.add(s);
  }
  for (let i = 0; i < 5; i++) {
    const s = sticker('rust_streak', rand(0.2, 0.5), rand(0.6, 1.6), rand(0.3, 0.55));
    s.position.set(rand(-3.9, -1.2), rand(1.2, 3.3), z0 + 0.016);
    g.add(s);
  }

  // wires across the ceiling
  const wirePts = [[-4, 3.3, 1.2], [-2, 3.05, 2.0], [0, 3.3, 2.6], [2, 2.95, 3.4], [4, 3.25, 4.0]];
  const wire = new THREE.CatmullRomCurve3(wirePts.map(p => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(wire, 40, 0.008, 5, false), M.rubber));
  const wire2 = new THREE.CatmullRomCurve3([[-4, 3.2, 4.2], [-2, 2.9, 3.6], [0, 3.25, 3.0], [2, 3.0, 2.4], [4, 3.2, 1.8]].map(p => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(wire2, 40, 0.006, 5, false), M.rubber));

  // back door to stairs
  const backDoor = makeDoor(W, {
    x: 0, z: z0 + 0.05, width: 0.92, height: 2.28, ry: 0, hinge: 'right',
    label: '推開後門', mat: M.woodDark, red: false,
  });
  g.add(backDoor.root);
  backDoor.setOpen(true, true);
  // dim bulb over the back door so the doorway reads instead of going black
  const backBulb = bulbLamp({ cord: 0.3, shade: false });
  backBulb.position.set(0, 3.4, -0.55); g.add(backBulb);
  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0xffb070, 9, 4, 2);
    l.position.set(0, 2.9, -0.55); return l;
  })());
  const backSign = poster('notice', 0.3, 0.4, { tint: 0xd8cdb6 });
  backSign.position.set(-1.15, 1.75, z0 + 0.02); g.add(backSign);

  const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.0), new THREE.MeshBasicMaterial({
    map: T.art.soft_dot, color: new THREE.Color(1.15, 0.68, 0.34), transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  winGlow.position.set(-1.45, 1.9, z1 - 0.22); g.add(winGlow);
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffb070, 7, 5, 2);
    l.position.set(0.2, 1.7, 5.1); return l;
  })());
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffc088, 12, 5.5, 2);
    l.position.set(1.2, 1.9, 5.0); return l;
  })());
  // seen from the street: light just inside the entrance so the doorway reads
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffc088, 26, 7, 2);
    l.position.set(1.1, 1.9, 4.2); return l;
  })());
  // and a warm pool on the west shelving visible through the shop window
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffb877, 18, 6, 2);
    l.position.set(-2.6, 2.0, 4.6); return l;
  })());

  W.addLight('shop', (() => {
    const l = new THREE.PointLight(0x8a7c6a, 7, 8, 2);
    l.position.set(0, 1.7, 3.2); return l;
  })());

  W.room('shop', { x0, x1, z0, z1, y0: 0 });
  W.onEnter('shop', () => W.audio?.setAmbience('shop'));
  W.onEnter('shop', () => W.hud.room('福安堂 · 藥行'));
  return { door, backDoor };
}
