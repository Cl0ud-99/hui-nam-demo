import { AdditiveBlending, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, SpotLight, TubeGeometry, Vector3 } from 'three';
import { M } from '../core/materials.js';
import { abacus, apothecary, brassScale, bulbLamp, cardboardBox, crate, fluorescent, herbJar, medicineBottle, poster, radio, shopCounter, sticker, wallFan, woodenStool } from '../core/props.js';
import { T } from '../core/textures.js';
import { box, cyl, planeGeo, rand } from '../core/util.js';
import { wallGroup } from './buildutil.js';
import { makeDoor } from './fixtures.js';
export { buildShop };

var SHOP = { x0: -4, x1: 4, z0: -1, z1: 6, h: 3.45 };
function buildShop(W) {
  const { x0, x1, z0, z1, h } = SHOP;
  const g = new Group();
  W.root.add(g);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const floorMat = M.floorChecker.clone();
  W.wetFloor(floorMat, { room: "shop", amount: 0.85, distortion: 0.018, tint: 16773858 });
  const floor = new Mesh(planeGeo(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.02, cz);
  floor.receiveShadow = true;
  g.add(floor);
  W.groundHide.push(floor);
  const ceil = new Mesh(planeGeo(x1 - x0, z1 - z0), M.ceilingDirty);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, h, cz);
  g.add(ceil);
  for (let i = 0; i < 3; i++) {
    const b = box(x1 - x0 + 0.02, 0.16, 0.12, M.woodBlack, cx, h - 0.09, z0 + 1.4 + i * 2.2);
    g.add(b);
  }
  const back = wallGroup(x1 - x0, h, M.wallPeelGreen, [{ x0: 3.28, x1: 4.72, y0: 0, y1: 2.3 }]);
  back.position.set(cx, 0, z0);
  g.add(back);
  W.colliders.push({ minX: x0, maxX: -0.72, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: 0.72, maxX: x1, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: -0.72, maxX: 0.72, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: 2.3, maxY: h, enabled: true });
  const west = new Mesh(planeGeo(z1 - z0, h), M.wallPeelGreen);
  west.rotation.y = Math.PI / 2;
  west.position.set(x0, h / 2, cz);
  west.receiveShadow = true;
  g.add(west);
  W.colliders.push({ minX: x0 - 0.15, maxX: x0 + 0.15, minZ: z0, maxZ: z1, minY: 0, maxY: h, enabled: true });
  const east = new Mesh(planeGeo(z1 - z0, h), M.wallPeel);
  east.rotation.y = -Math.PI / 2;
  east.position.set(x1, h / 2, cz);
  east.receiveShadow = true;
  g.add(east);
  W.colliders.push({ minX: x1 - 0.15, maxX: x1 + 0.15, minZ: z0, maxZ: z1, minY: 0, maxY: h, enabled: true });
  for (let i = 0; i < 2; i++) {
    const p = new Mesh(planeGeo(z1 - z0, 0.95), M.wallPeelGreen.clone());
    p.material.color.setHex(5003846);
    p.material.roughness = 0.75;
    p.rotation.y = Math.PI / 2;
    p.position.set(x0 + 0.012, 0.48, cz);
    if (i === 0) g.add(p);
  }
  const sf = new Group();
  sf.position.set(0, 0, z1);
  g.add(sf);
  const plaster = M.wallPeelGreen;
  sf.add(box(0.7, h, 0.22, plaster, -3.65, h / 2, 0));
  sf.add(box(2.4, h, 0.22, plaster, 2.8, h / 2, 0));
  sf.add(box(8, 0.45, 0.22, plaster, 0, h - 0.225, 0));
  sf.add(box(4.1, 0.92, 0.2, M.shutter, -1.45, 0.46, 0));
  const wfMat = M.woodBlack;
  sf.add(box(4.2, 0.08, 0.16, wfMat, -1.45, 2.92, 0));
  sf.add(box(4.2, 0.09, 0.16, wfMat, -1.45, 0.92, 0));
  for (const px2 of [-3.5, -2.4, -1.3, -0.2, 0.6]) sf.add(box(0.07, 2, 0.16, wfMat, px2, 1.92, 0));
  const glassStore = new Mesh(new PlaneGeometry(4.1, 2), M.glass);
  glassStore.position.set(-1.45, 1.92, -0.02);
  sf.add(glassStore);
  sf.add(box(0.1, 2.85, 0.22, wfMat, 0.7, 1.425, 0));
  sf.add(box(0.1, 2.85, 0.22, wfMat, 1.66, 1.425, 0));
  sf.add(box(1.06, 0.2, 0.22, wfMat, 1.18, 2.95, 0));
  sf.add(box(1.02, 0.06, 0.24, wfMat, 1.18, 2.86, 0));
  sf.add(box(1.06, 0.14, 0.2, plaster, 1.18, 3.02, 0));
  sf.add(box(4.3, 0.26, 0.3, M.metalRust, -1.4, 3.12, 0.02));
  const sign2 = new Mesh(new PlaneGeometry(2.9, 0.79), new MeshStandardMaterial({
    map: T.art.shop_sign,
    roughness: 0.6,
    emissive: 16777215,
    emissiveMap: T.art.shop_sign,
    emissiveIntensity: 0.1
  }));
  sign2.position.set(-1.35, 3.62, 0.18);
  sf.add(sign2);
  sf.add(box(3.04, 0.92, 0.12, M.woodBlack, -1.35, 3.62, 0.1));
  const neonMat = new MeshBasicMaterial({
    map: T.art.neon_fuan,
    transparent: true,
    color: new Color(1.25, 1, 1),
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide
  });
  const neon = new Mesh(new PlaneGeometry(0.95, 0.46), neonMat);
  neon.position.set(-6.2, 3.35, 6.28);
  neon.rotation.y = 0.35;
  g.add(neon);
  g.add(box(1, 0.5, 0.06, M.woodBlack, -6.2, 3.35, 6.24));
  const neonArm = box(1.6, 0.05, 0.05, M.metalRust, -6.9, 4.2, 6.05);
  g.add(neonArm);
  W.animators.push((t) => {
    const f = Math.sin(t * 23) * Math.sin(t * 7.3) > 0.82 ? 0.15 : 1;
    neonMat.color.setRGB(1.25 * f, 1 * f, 1 * f);
  });
  W.addLight("alley", (() => {
    const l = new PointLight(16722462, 6, 5.5, 2);
    l.position.set(-6.2, 3.2, 6.5);
    return l;
  })());
  const porchLamp = bulbLamp({ cord: 0.12, shade: false });
  porchLamp.position.set(3.35, 2.62, 6.22);
  g.add(porchLamp);
  g.add(box(0.16, 0.04, 0.22, M.metalRust, 3.35, 2.9, 6.18));
  W.addLight("alley", (() => {
    const l = new PointLight(16756848, 13, 6, 2);
    l.position.set(3.35, 2.5, 6.55);
    return l;
  })());
  W.addLight("alley", (() => {
    const l = new SpotLight(16763018, 14, 8, 0.55, 0.8, 1.4);
    l.position.set(-1.3, 2.2, 7.6);
    l.target.position.set(-1.3, 3.8, 6.1);
    return l;
  })());
  const door = { setOpen: () => {
  } };
  W.colliders.push({ minX: -4, maxX: 0.68, minZ: z1 - 0.12, maxZ: z1 + 0.12, minY: 0, maxY: h, enabled: true });
  W.colliders.push({ minX: 1.66, maxX: 4, minZ: z1 - 0.12, maxZ: z1 + 0.12, minY: 0, maxY: h, enabled: true });
  W.addLight("shop", (() => {
    const l = new PointLight(12571848, 5, 5, 2);
    l.position.set(1.2, 2.55, 5.4);
    return l;
  })());
  const apoL = apothecary(2.5, 2.15, 0.34, 5, 5);
  apoL.position.set(-2.55, 0, z0 + 0.24);
  g.add(apoL);
  const apoR = apothecary(2.4, 2.15, 0.34, 5, 5);
  apoR.position.set(2.55, 0, z0 + 0.24);
  g.add(apoR);
  const counter = shopCounter(2.35, 0.68, 1.04);
  counter.position.set(-0.55, 0, 2.75);
  g.add(counter);
  W.colliders.push({ minX: -1.78, maxX: 0.68, minZ: 2.36, maxZ: 3.14, minY: 0, maxY: 1.1, enabled: true });
  const scale = brassScale();
  scale.position.set(-0.2, 1.04, 2.7);
  g.add(scale);
  const ab = abacus();
  ab.position.set(0.3, 1.04, 2.95);
  ab.rotation.y = -0.15;
  g.add(ab);
  const rd = radio();
  rd.position.set(-1.35, 1.04, 2.6);
  rd.rotation.y = 0.5;
  g.add(rd);
  const led = new Mesh(new PlaneGeometry(0.28, 0.2), new MeshStandardMaterial({
    map: T.art.newspaper,
    color: 14208178,
    roughness: 1
  }));
  led.rotation.x = -Math.PI / 2;
  led.rotation.z = 0.4;
  led.position.set(-0.75, 1.045, 2.95);
  g.add(led);
  for (let i = 0; i < 3; i++) {
    const jar = herbJar(0.06 + i * 0.012, 0.13 + i * 0.02, [6969906, 5126692, 8022594][i]);
    jar.position.set(0.05 + i * 0.16, 1.04, 2.55);
    g.add(jar);
  }
  const cup = cyl(0.035, 0.028, 0.07, M.porcelain, 12);
  cup.position.set(0.58, 1.075, 2.62);
  g.add(cup);
  const st = woodenStool(0.46);
  st.position.set(-0.9, 0, 1.55);
  g.add(st);
  const shelfG = new Group();
  shelfG.position.set(x0 + 0.18, 0, 1.2);
  g.add(shelfG);
  for (let s = 0; s < 4; s++) {
    const y = 0.65 + s * 0.52;
    shelfG.add(box(0.34, 0.045, 3.6, M.woodDark, 0.02, y, 1.3));
    for (let i = 0; i < 9; i++) {
      const x = 0.02;
      const z = 0.2 + i * 0.36 + rand(-0.03, 0.03);
      if (Math.random() < 0.55) {
        const j = herbJar(rand(0.05, 0.085), rand(0.11, 0.2), [5982762, 8020024, 4141602][i % 3]);
        j.position.set(x, y + 0.023, z);
        shelfG.add(j);
      } else {
        const b = medicineBottle([3810328, 2767402, 4860458][i % 3]);
        b.position.set(x, y + 0.023, z);
        shelfG.add(b);
      }
    }
    for (const zz of [0.2, 2.55]) shelfG.add(box(0.34, 2.2, 0.05, M.woodDark, 0.02, 1.1, zz));
  }
  const shelfE = new Group();
  shelfE.position.set(x1 - 0.18, 0, 3.4);
  g.add(shelfE);
  for (let s = 0; s < 3; s++) {
    const y = 0.9 + s * 0.55;
    shelfE.add(box(0.3, 0.04, 2.8, M.woodDark, 0, y, 0));
    for (let i = 0; i < 7; i++) {
      const b = cardboardBox(rand(0.2, 0.3), rand(0.12, 0.2), rand(0.18, 0.26));
      b.position.set(rand(-0.02, 0.02), y + 0.02, -1.1 + i * 0.36);
      b.rotation.y = rand(-0.2, 0.2);
      shelfE.add(b);
    }
  }
  const fan = wallFan();
  fan.position.set(x1 - 0.32, 2.32, 1.55);
  fan.rotation.y = -Math.PI / 2;
  g.add(fan);
  W.animators.push((t, dt) => fan.userData.animate?.(t, dt));
  const chart1 = poster("meridian", 0.52, 0.78);
  chart1.position.set(x1 - 0.02, 1.75, 4.35);
  chart1.rotation.y = -Math.PI / 2;
  g.add(chart1);
  const chart2 = poster("poster_buddha", 0.44, 0.64, { tint: 12168852 });
  chart2.position.set(x1 - 0.02, 1.8, 3.7);
  chart2.rotation.y = -Math.PI / 2;
  g.add(chart2);
  const cal = poster("calendar", 0.34, 0.5);
  cal.position.set(x1 - 0.02, 1.35, 5.35);
  cal.rotation.y = -Math.PI / 2;
  g.add(cal);
  const pb = poster("price_board", 0.38, 0.56);
  pb.position.set(x0 + 0.02, 1.55, 4.3);
  pb.rotation.y = Math.PI / 2;
  g.add(pb);
  const tb = sticker("talisman", 0.19, 0.66, 0.95);
  tb.position.set(-0.45, 1.85, z0 + 0.02);
  g.add(tb);
  for (let i = 0; i < 4; i++) {
    const c = crate(rand(0.35, 0.5), rand(0.25, 0.36), rand(0.3, 0.4));
    c.position.set(-3.1 + i * 0.32, 0, 0.45 + i % 2 * 0.4);
    c.rotation.y = rand(-0.3, 0.3);
    g.add(c);
  }
  const bx = cardboardBox(0.55, 0.45, 0.45);
  bx.position.set(2.9, 0, 0.7);
  g.add(bx);
  const bx2 = cardboardBox(0.45, 0.35, 0.4);
  bx2.position.set(2.85, 0.45, 0.72);
  bx2.rotation.y = 0.2;
  g.add(bx2);
  const disp = new Group();
  disp.position.set(-1.45, 0.92, z1 - 0.35);
  g.add(disp);
  disp.add(box(4, 0.04, 0.3, M.woodDark, 0, 0.02, 0));
  for (let i = 0; i < 12; i++) {
    const j = herbJar(rand(0.05, 0.075), rand(0.1, 0.17), [6969906, 5126692, 9072704][i % 3]);
    j.position.set(-1.85 + i * 0.32, 0.04, rand(-0.05, 0.05));
    disp.add(j);
  }
  for (let i = 0; i < 3; i++) {
    const hb = new Mesh(new CylinderGeometry(0.03, 0.05, 0.4, 6), M.fabricGreen);
    hb.position.set(-3.2 + i * 0.22, 2.55, z1 - 0.55);
    g.add(hb);
    g.add(cyl(2e-3, 2e-3, 0.35, M.rubber, 4).translateY(2.92).translateX(-3.2 + i * 0.22).translateZ(z1 - 0.55));
  }
  const tube2 = fluorescent(1.3, { green: true });
  tube2.position.set(-1.7, 3.35, 1.9);
  g.add(tube2);
  const tube22 = fluorescent(1.1, { green: false });
  tube22.position.set(1.9, 3.35, 4.25);
  g.add(tube22);
  const flick = W.addLight("shop", (() => {
    const l = new PointLight(13624536, 26, 9, 2);
    l.position.set(-1.7, 3.15, 1.9);
    l.castShadow = true;
    l.shadow.mapSize.set(1024, 1024);
    l.shadow.bias = -15e-4;
    l.shadow.normalBias = 0.02;
    return l;
  })(), { global: true });
  const flick2 = W.addLight("shop", (() => {
    const l = new PointLight(14214868, 12, 6, 2);
    l.position.set(1.9, 3.1, 4.25);
    return l;
  })());
  W.flicker(flick, { min: 0.25, max: 1, speed: 1.4, pattern: "tube" });
  W.flicker(flick2, { min: 0.5, max: 1, speed: 3.1, pattern: "soft" });
  const bulb = bulbLamp({ cord: 0.62, shade: true });
  bulb.position.set(-0.7, 3.44, 2.55);
  g.add(bulb);
  const bulbLight = W.addLight("shop", (() => {
    const l = new PointLight(16758903, 44, 9, 2);
    l.position.set(-0.7, 2.72, 2.55);
    return l;
  })(), { global: true });
  W.flicker(bulbLight, { min: 0.9, max: 1, speed: 7, pattern: "soft" });
  const bulb2 = bulbLamp({ cord: 0.8, shade: false });
  bulb2.position.set(1.4, 3.4, 4.9);
  g.add(bulb2);
  W.addLight("shop", (() => {
    const l = new PointLight(16760456, 12, 6, 2);
    l.position.set(1.4, 2.55, 4.9);
    return l;
  })());
  W.addLight("shop", (() => {
    const l = new PointLight(16722450, 2.2, 2.4, 2);
    l.position.set(-3.4, 1.2, 0.8);
    return l;
  })());
  W.addLight("shop", (() => {
    const l = new PointLight(16762762, 15, 4.4, 2);
    l.position.set(-2.4, 1.9, 1.35);
    return l;
  })(), { keep: true });
  W.addLight("shop", (() => {
    const l = new PointLight(16762762, 13, 4.2, 2);
    l.position.set(2.4, 1.9, 1.35);
    return l;
  })(), { keep: true });
  const sh = new Group();
  sh.position.set(x0 + 0.2, 1.55, 1);
  sh.rotation.y = Math.PI / 2;
  g.add(sh);
  sh.add(box(0.3, 0.4, 0.16, M.woodRed, 0, 0.2, 0));
  const shGlow = new Mesh(new PlaneGeometry(0.17, 0.22), new MeshBasicMaterial({ color: new Color(1, 0.12, 0.06) }));
  shGlow.position.set(0, 0.22, 0.081);
  sh.add(shGlow);
  sh.add(cyl(6e-3, 6e-3, 0.14, M.candleWax, 6).translateX(0.1).translateY(0.07));
  sh.add(cyl(6e-3, 6e-3, 0.11, M.candleWax, 6).translateX(-0.1).translateY(0.055));
  const ledger = new Mesh(new PlaneGeometry(0.3, 0.22), new MeshStandardMaterial({
    map: T.art.newspaper,
    color: 13616040,
    roughness: 1
  }));
  ledger.rotation.x = -Math.PI / 2;
  ledger.rotation.z = -0.35;
  ledger.position.set(-0.95, 1.05, 2.95);
  g.add(ledger);
  for (let i = 0; i < 7; i++) {
    const s = sticker("stain", rand(0.5, 1.1), rand(0.6, 1.4), rand(0.25, 0.5));
    s.position.set(rand(-3.8, 3.8), rand(0.4, 3.2), z0 + 0.015);
    s.rotation.z = rand(0, 6);
    g.add(s);
  }
  for (let i = 0; i < 5; i++) {
    const s = sticker("rust_streak", rand(0.2, 0.5), rand(0.6, 1.6), rand(0.3, 0.55));
    s.position.set(rand(-3.9, -1.2), rand(1.2, 3.3), z0 + 0.016);
    g.add(s);
  }
  const wirePts = [[-4, 3.3, 1.2], [-2, 3.05, 2], [0, 3.3, 2.6], [2, 2.95, 3.4], [4, 3.25, 4]];
  const wire = new CatmullRomCurve3(wirePts.map((p) => new Vector3(...p)));
  g.add(new Mesh(new TubeGeometry(wire, 40, 8e-3, 5, false), M.rubber));
  const wire2 = new CatmullRomCurve3([[-4, 3.2, 4.2], [-2, 2.9, 3.6], [0, 3.25, 3], [2, 3, 2.4], [4, 3.2, 1.8]].map((p) => new Vector3(...p)));
  g.add(new Mesh(new TubeGeometry(wire2, 40, 6e-3, 5, false), M.rubber));
  const backDoor = makeDoor(W, {
    x: 0,
    z: z0 + 0.05,
    width: 0.92,
    height: 2.28,
    ry: 0,
    hinge: "right",
    label: "\u63A8\u958B\u5F8C\u9580",
    mat: M.woodDark,
    red: false
  });
  g.add(backDoor.root);
  backDoor.setOpen(true, true);
  const backBulb = bulbLamp({ cord: 0.3, shade: false });
  backBulb.position.set(0, 3.4, -0.55);
  g.add(backBulb);
  W.addLight("shop", (() => {
    const l = new PointLight(16756848, 9, 4, 2);
    l.position.set(0, 2.9, -0.55);
    return l;
  })());
  const backSign = poster("notice", 0.3, 0.4, { tint: 14208438 });
  backSign.position.set(-1.15, 1.75, z0 + 0.02);
  g.add(backSign);
  const winGlow = new Mesh(new PlaneGeometry(4, 2), new MeshBasicMaterial({
    map: T.art.soft_dot,
    color: new Color(1.15, 0.68, 0.34),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: AdditiveBlending
  }));
  winGlow.position.set(-1.45, 1.9, z1 - 0.22);
  g.add(winGlow);
  W.addLight("alley", (() => {
    const l = new PointLight(16756848, 7, 5, 2);
    l.position.set(0.2, 1.7, 5.1);
    return l;
  })());
  W.addLight("alley", (() => {
    const l = new PointLight(16760968, 12, 5.5, 2);
    l.position.set(1.2, 1.9, 5);
    return l;
  })());
  W.addLight("alley", (() => {
    const l = new PointLight(16760968, 26, 7, 2);
    l.position.set(1.1, 1.9, 4.2);
    return l;
  })());
  W.addLight("alley", (() => {
    const l = new PointLight(16758903, 18, 6, 2);
    l.position.set(-2.6, 2, 4.6);
    return l;
  })());
  W.addLight("shop", (() => {
    const l = new PointLight(9075818, 7, 8, 2);
    l.position.set(0, 1.7, 3.2);
    return l;
  })());
  W.room("shop", { x0, x1, z0, z1, y0: 0 });
  W.onEnter("shop", () => W.audio?.setAmbience("shop"));
  W.onEnter("shop", () => W.hud.room("\u798F\u5B89\u5802 \xB7 \u85E5\u884C"));
  return { door, backDoor };
}
