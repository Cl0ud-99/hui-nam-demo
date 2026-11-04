import { BackSide, BoxGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import { M, decalMat, posterMat } from './materials.js';
import { T } from './textures.js';
import { box, cyl, rand } from './util.js';
export { abacus, acUnit, altarTable, apothecary, bed, bicycle, brassScale, bucket, bulbLamp, cable, candle, cardboardBox, crate, curtain, fluorescent, hangingCloth, herbJar, incenseBurner, medicineBottle, mop, newspapers, pictureFrame, poster, radio, shopCounter, sofa, stackOfBooks, sticker, stuckPoster, trashBag, tube, tvSet, wallFan, wardrobe, woodenChair, woodenStool };

function tube(points, radius = 0.01, material = M.rubber, radial = 6) {
  const curve = new CatmullRomCurve3(points.map((p) => p.clone ? p : new Vector3(...p)));
  const g = new TubeGeometry(curve, Math.max(12, points.length * 8), radius, radial, false);
  const m = new Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cable(a, b, sag = 0.25, radius = 8e-3, mat = M.rubber) {
  const A = new Vector3(...a), B = new Vector3(...b);
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const p = A.clone().lerp(B, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  return tube(pts, radius, mat);
}
function labelPlane(w, h, idx, cols = 6, rows = 12) {
  const g = new PlaneGeometry(w, h);
  const c = idx % cols, r = Math.floor(idx / cols) % rows;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (c + uv.getX(i)) / cols, 1 - (r + 1 - uv.getY(i)) / rows);
  }
  uv.needsUpdate = true;
  return new Mesh(g, M.labelSheet);
}
function bulbLamp({ shade = true, cord = 1, color = 16767400 } = {}) {
  const g = new Group();
  g.userData.dynamic = true;
  const cordM = cyl(6e-3, 6e-3, cord, M.rubber, 6);
  cordM.position.y = -cord / 2;
  g.add(cordM);
  const socket = cyl(0.026, 0.03, 0.07, M.blackMetal, 10);
  socket.position.y = -cord - 0.03;
  g.add(socket);
  const b = new Mesh(new SphereGeometry(0.042, 16, 12), M.bulb);
  b.position.y = -cord - 0.09;
  b.scale.y = 1.25;
  g.add(b);
  if (shade) {
    const sh = new Mesh(new ConeGeometry(0.19, 0.16, 20, 1, true), M.metalDark);
    sh.position.y = -cord - 0.02;
    g.add(sh);
    const inner = new Mesh(
      new ConeGeometry(0.185, 0.155, 20, 1, true),
      new MeshStandardMaterial({ color: 14207920, emissive: 16764821, emissiveIntensity: 1.2, side: BackSide })
    );
    inner.position.y = -cord - 0.023;
    g.add(inner);
  }
  return g;
}
function fluorescent(len = 1.2, { green = false, fixture = true } = {}) {
  const g = new Group();
  const body = new Mesh(new BoxGeometry(len + 0.14, 0.07, 0.13), M.metalDark);
  body.position.y = 0.05;
  body.castShadow = true;
  g.add(body);
  const t = new Mesh(new CylinderGeometry(0.018, 0.018, len, 10), green ? M.tubeGreen : M.tube);
  t.rotation.z = Math.PI / 2;
  g.add(t);
  for (const s of [-1, 1]) {
    const cap = new Mesh(new CylinderGeometry(0.023, 0.023, 0.06, 10), M.metalGalv);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = s * len / 2;
    g.add(cap);
  }
  if (fixture) for (const s of [-1, 1]) {
    const wire = cyl(4e-3, 4e-3, 0.28, M.rubber, 5);
    wire.position.set(s * len * 0.3, 0.22, 0);
    g.add(wire);
  }
  return g;
}
function wallFan() {
  const g = new Group();
  g.userData.dynamic = true;
  const mount = cyl(0.05, 0.06, 0.12, M.metalGalv, 10);
  mount.rotation.x = Math.PI / 2;
  g.add(mount);
  const motor = new Mesh(new CylinderGeometry(0.1, 0.11, 0.14, 16), M.metalDark);
  motor.rotation.x = Math.PI / 2;
  motor.position.z = -0.09;
  g.add(motor);
  const cage = new Group();
  cage.position.z = -0.18;
  for (let i = 0; i < 3; i++) {
    const r = 0.045 + i * 0.055;
    const ring = new Mesh(new TorusGeometry(r, 45e-4, 6, 32), M.metalGalv);
    cage.add(ring);
  }
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const spoke = new Mesh(new CylinderGeometry(3e-3, 3e-3, 0.16, 4), M.metalGalv);
    spoke.rotation.z = a;
    spoke.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0);
    cage.add(spoke);
  }
  const hub = new Mesh(new SphereGeometry(0.045, 12, 10), M.metalGalv);
  cage.add(hub);
  const blades = new Group();
  for (let i = 0; i < 3; i++) {
    const blade = new Mesh(new BoxGeometry(0.13, 2e-3, 0.055), M.plasticGreen);
    blade.rotation.z = i / 3 * Math.PI * 2;
    blade.position.set(0.07, 0, 5e-3);
    const wrap = new Group();
    wrap.rotation.z = i / 3 * Math.PI * 2;
    const b2 = new Mesh(new BoxGeometry(0.13, 2e-3, 0.055), M.plasticGreen);
    b2.position.set(0.07, 0, 0);
    wrap.add(b2);
    blades.add(wrap);
  }
  blades.position.z = -0.17;
  g.add(blades);
  g.add(cage);
  g.userData.animate = (t) => {
    blades.rotation.z = t * 5.2;
  };
  return g;
}
function apothecary(w = 2.4, h = 2.1, d = 0.34, cols = 5, rows = 6) {
  const g = new Group();
  g.add(box(w, h, d, M.woodDark, 0, h / 2, 0));
  const cw = w / cols, ch = h / rows;
  let idx = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const fw = cw - 0.03, fh = ch - 0.03;
    const front = box(fw, fh, 0.02, M.woodBlack, -w / 2 + cw * (c + 0.5), ch * (r + 0.5), d / 2 + 5e-3);
    g.add(front);
    const lab = labelPlane(Math.min(0.16, fw * 0.55), 0.055, idx++);
    lab.position.set(-w / 2 + cw * (c + 0.5), ch * (r + 0.5) + 0.01, d / 2 + 0.018);
    g.add(lab);
    const handle = new Mesh(new CylinderGeometry(8e-3, 8e-3, 0.06, 6), M.brass);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-w / 2 + cw * (c + 0.5), ch * (r + 0.5) - 0.055, d / 2 + 0.035);
    g.add(handle);
  }
  const cornice = box(w + 0.08, 0.07, d + 0.06, M.woodBlack, 0, h + 0.02, 0);
  g.add(cornice);
  return g;
}
function shopCounter(w = 1.9, d = 0.62, h = 1.02) {
  const g = new Group();
  g.add(box(w, h - 0.06, d, M.counterWood, 0, (h - 0.06) / 2, 0));
  const top = box(w + 0.1, 0.06, d + 0.08, M.counterWoodDark, 0, h - 0.03, 0);
  g.add(top);
  for (let i = 0; i < 3; i++) {
    const pw = (w - 0.16) / 3;
    g.add(box(pw - 0.03, h - 0.22, 0.02, M.woodBlack, -w / 2 + 0.08 + pw * (i + 0.5), (h - 0.06) / 2, d / 2 + 5e-3));
    const knob = new Mesh(new SphereGeometry(0.017, 8, 6), M.brass);
    knob.position.set(-w / 2 + 0.08 + pw * (i + 0.5), h * 0.62, d / 2 + 0.03);
    g.add(knob);
  }
  return g;
}
function herbJar(r = 0.075, h = 0.16, fill2 = 6969906) {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(r, r * 0.94, h, 14, 1, true), M.glassJar);
  body.position.y = h / 2;
  g.add(body);
  const content = new Mesh(
    new CylinderGeometry(r * 0.9, r * 0.86, h * 0.66, 12),
    new MeshStandardMaterial({ color: fill2, roughness: 1 })
  );
  content.position.y = h * 0.34;
  g.add(content);
  const lid = new Mesh(new CylinderGeometry(r * 1.03, r * 1.03, 0.018, 14), M.brass);
  lid.position.y = h + 5e-3;
  g.add(lid);
  const base = new Mesh(new CylinderGeometry(r * 0.96, r * 0.96, 8e-3, 14), M.woodBlack);
  base.position.y = 4e-3;
  g.add(base);
  return g;
}
function medicineBottle(color = 3810328) {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(0.028, 0.03, 0.09, 10), M.glassJar);
  body.material = new MeshStandardMaterial({ color, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.75 });
  body.position.y = 0.045;
  g.add(body);
  const neck = new Mesh(new CylinderGeometry(0.014, 0.02, 0.03, 8), body.material);
  neck.position.y = 0.105;
  g.add(neck);
  const cap = new Mesh(new CylinderGeometry(0.017, 0.017, 0.012, 8), M.metalGalv);
  cap.position.y = 0.126;
  g.add(cap);
  return g;
}
function brassScale() {
  const g = new Group();
  g.add(cyl(0.09, 0.11, 0.02, M.woodBlack, 16));
  const col = cyl(0.012, 0.012, 0.3, M.brass, 8);
  col.position.y = 0.15;
  g.add(col);
  const beam = cyl(8e-3, 8e-3, 0.34, M.brass, 6);
  beam.rotation.z = Math.PI / 2;
  beam.position.y = 0.3;
  g.add(beam);
  for (const s of [-1, 1]) {
    const pan = new Mesh(new CylinderGeometry(0.055, 0.045, 8e-3, 14), M.brass);
    pan.position.set(s * 0.16, 0.17, 0);
    g.add(pan);
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2;
      const wire = cyl(15e-4, 15e-4, 0.13, M.brass, 4);
      wire.position.set(s * 0.16 + Math.cos(a) * 0.04, 0.235, Math.sin(a) * 0.04);
      wire.rotation.z = Math.cos(a) * 0.3;
      wire.rotation.x = Math.sin(a) * 0.3;
      g.add(wire);
    }
  }
  return g;
}
function abacus() {
  const g = new Group();
  g.add(box(0.34, 0.02, 0.15, M.woodBlack, 0, 0.01, 0));
  for (let i = 0; i < 8; i++) {
    const rod = cyl(22e-4, 22e-4, 0.14, M.brass, 4);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(-0.14 + i * 0.04, 0.03, 0);
    g.add(rod);
    for (let k = 0; k < 4; k++) {
      const bead = new Mesh(new SphereGeometry(0.011, 8, 6), M.woodRed);
      bead.scale.y = 0.55;
      bead.position.set(-0.14 + i * 0.04, 0.033, -0.04 + k * 0.024 + i % 3 * 4e-3);
      g.add(bead);
    }
  }
  return g;
}
function radio() {
  const g = new Group();
  g.add(box(0.24, 0.15, 0.09, M.woodDark, 0, 0.075, 0));
  const grille = box(0.13, 0.1, 5e-3, M.blackMetal, -0.04, 0.08, 0.048);
  g.add(grille);
  for (let i = 0; i < 7; i++) {
    g.add(box(0.12, 3e-3, 2e-3, M.metalGalv, -0.04, 0.04 + i * 0.012, 0.052));
  }
  const dial = box(0.06, 0.05, 4e-3, M.brass, 0.078, 0.095, 0.047);
  g.add(dial);
  const kn = new Mesh(new CylinderGeometry(0.011, 0.011, 0.01, 10), M.blackMetal);
  kn.rotation.x = Math.PI / 2;
  kn.position.set(0.078, 0.04, 0.05);
  g.add(kn);
  const ant = cyl(15e-4, 15e-4, 0.3, M.metalGalv, 4);
  ant.position.set(-0.09, 0.22, -0.02);
  ant.rotation.z = 0.35;
  g.add(ant);
  return g;
}
function woodenStool(h = 0.44) {
  const g = new Group();
  const top = cyl(0.16, 0.17, 0.035, M.woodDark, 16);
  top.position.y = h;
  g.add(top);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + Math.PI / 4;
    const leg = cyl(0.016, 0.02, h, M.woodDark, 8);
    leg.position.set(Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.12);
    leg.rotation.z = Math.cos(a) * 0.09;
    leg.rotation.x = -Math.sin(a) * 0.09;
    g.add(leg);
  }
  const ring = new Mesh(new TorusGeometry(0.13, 8e-3, 5, 18), M.woodDark);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  g.add(ring);
  return g;
}
function woodenChair() {
  const g = new Group();
  const seat = box(0.4, 0.04, 0.4, M.woodDark, 0, 0.44, 0);
  g.add(seat);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = cyl(0.016, 0.02, 0.44, M.woodDark, 8);
    leg.position.set(sx * 0.17, 0.22, sz * 0.17);
    g.add(leg);
  }
  for (const sx of [-1, 1]) {
    const post = cyl(0.017, 0.017, 0.48, M.woodDark, 8);
    post.position.set(sx * 0.17, 0.68, -0.18);
    g.add(post);
  }
  g.add(box(0.38, 0.12, 0.03, M.woodDark, 0, 0.84, -0.18));
  g.add(box(0.36, 0.035, 0.025, M.woodDark, 0, 0.64, -0.18));
  return g;
}
function sofa(w = 2) {
  const g = new Group();
  g.add(box(w, 0.16, 0.82, M.woodBlack, 0, 0.24, 0));
  g.add(box(w - 0.1, 0.16, 0.78, M.fabricRed, 0, 0.4, 0.02));
  const back = box(w, 0.52, 0.18, M.fabricRed, 0, 0.64, -0.32);
  back.rotation.x = -0.08;
  g.add(back);
  for (const s of [-1, 1]) {
    g.add(box(0.17, 0.36, 0.82, M.fabricRed, s * (w / 2 - 0.085), 0.52, 0));
    for (const sz of [-1, 1]) g.add(cyl(0.02, 0.025, 0.2, M.woodBlack, 6).translateX(s * (w / 2 - 0.12)).translateY(0.1).translateZ(sz * 0.3));
  }
  for (let i = 0; i < 2; i++) {
    const c = box((w - 0.5) / 2 - 0.04, 0.11, 0.62, M.fabricCream, (i - 0.5) * ((w - 0.5) / 2), 0.52, 0.06);
    c.rotation.z = (i - 0.5) * 0.015;
    g.add(c);
  }
  const bl = new Mesh(new PlaneGeometry(0.9, 1.1, 12, 12), M.fabricCream);
  const pos = bl.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), x = pos.getX(i);
    pos.setZ(i, Math.sin(x * 8) * 0.02 + Math.sin(y * 5) * 0.02);
  }
  bl.geometry.computeVertexNormals();
  bl.rotation.x = -Math.PI / 2;
  bl.rotation.z = 0.2;
  bl.position.set(0.45, 0.81, 0.02);
  g.add(bl);
  return g;
}
function bed(w = 1.15, l = 1.95) {
  const g = new Group();
  g.add(box(w, 0.22, l, M.woodBlack, 0, 0.22, 0));
  g.add(box(w - 0.06, 0.18, l - 0.08, M.fabricCream, 0, 0.42, 0));
  const blanket = new Mesh(new PlaneGeometry(w + 0.08, l * 0.72, 18, 22), M.fabricRed);
  const p = blanket.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.sin(x * 5) * 0.018 + Math.sin(y * 7 + 1) * 0.015 + Math.max(0, Math.abs(x) - w * 0.45) * 0.18);
  }
  blanket.geometry.computeVertexNormals();
  blanket.rotation.x = -Math.PI / 2;
  blanket.position.set(0, 0.53, l * 0.1);
  g.add(blanket);
  for (const s of [-1, 1]) {
    const pillow = box(w * 0.42, 0.13, 0.32, M.fabricCream, s * w * 0.23, 0.58, -l / 2 + 0.24);
    pillow.rotation.x = -0.12;
    pillow.rotation.z = s * 0.05;
    g.add(pillow);
  }
  g.add(box(w + 0.06, 0.5, 0.05, M.woodDark, 0, 0.66, -l / 2 - 0.02));
  return g;
}
function wardrobe(w = 1.2, h = 2, d = 0.55) {
  const g = new Group();
  g.add(box(w, h, d, M.woodDark, 0, h / 2, 0));
  for (const s of [-1, 1]) {
    const door = box(w / 2 - 0.02, h - 0.08, 0.03, M.woodBlack, s * w / 4, h / 2, d / 2 + 0.01);
    g.add(door);
    const hd = new Mesh(new SphereGeometry(0.018, 8, 6), M.brass);
    hd.position.set(s * 0.03, h / 2, d / 2 + 0.04);
    g.add(hd);
  }
  const mirror = new Mesh(new PlaneGeometry(w * 0.42, h * 0.62), M.mirror);
  mirror.position.set(w * 0.02, h * 0.56, d / 2 + 0.03);
  g.add(mirror);
  g.userData.mirror = mirror;
  return g;
}
function tvSet() {
  const g = new Group();
  g.userData.dynamic = true;
  g.add(box(0.62, 0.48, 0.44, M.plasticGreen, 0, 0.27, 0));
  const screenMat = new MeshBasicMaterial({ color: 9611422 });
  const screen = new Mesh(new PlaneGeometry(0.44, 0.33), screenMat);
  screen.position.set(0, 0.31, 0.226);
  g.add(screen);
  const cv = document.createElement("canvas");
  cv.width = 96;
  cv.height = 72;
  const ctx = cv.getContext("2d");
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  screenMat.map = tex;
  let acc = 0;
  g.userData.animate = (t, dt) => {
    acc += dt;
    if (acc < 0.06) return;
    acc = 0;
    const img = ctx.createImageData(96, 72);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255 | 0;
      img.data[i] = v * 0.8;
      img.data[i + 1] = v;
      img.data[i + 2] = v * 0.9;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgba(220,240,230,0.25)";
    ctx.fillRect(0, t * 60 % 72, 96, 5);
    tex.needsUpdate = true;
  };
  for (const s of [-1, 1]) g.add(cyl(0.01, 0.01, 0.06, M.blackMetal, 5).translateX(s * 0.2).translateY(0.03));
  return g;
}
function altarTable(w = 1.5, d = 0.5, h = 0.82) {
  const g = new Group();
  g.add(box(w, 0.06, d, M.woodRed, 0, h, 0));
  g.add(box(w - 0.12, 0.22, 0.04, M.woodRed, 0, h - 0.16, d / 2 - 0.05));
  for (const s of [-1, 1]) {
    g.add(box(0.07, h, 0.07, M.woodRed, s * (w / 2 - 0.06), h / 2, d / 2 - 0.06));
    g.add(box(0.07, h, 0.07, M.woodRed, s * (w / 2 - 0.06), h / 2, -d / 2 + 0.06));
  }
  return g;
}
function incenseBurner(r = 0.1) {
  const g = new Group();
  const bowl = new Mesh(new CylinderGeometry(r, r * 0.8, r * 0.55, 18), M.brass);
  bowl.position.y = r * 0.3;
  g.add(bowl);
  const rim = new Mesh(new TorusGeometry(r, 6e-3, 6, 20), M.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = r * 0.55;
  g.add(rim);
  for (const s of [-1, 1]) {
    const ear = new Mesh(new TorusGeometry(r * 0.18, 6e-3, 5, 10), M.brass);
    ear.position.set(s * r * 0.9, r * 0.45, 0);
    g.add(ear);
  }
  const ash = new Mesh(new CylinderGeometry(r * 0.9, r * 0.85, 0.01, 14), M.dirt);
  ash.position.y = r * 0.55;
  g.add(ash);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const stick = cyl(2e-3, 2e-3, 0.22, M.incense, 4);
    stick.position.set(Math.cos(a) * r * 0.4, r * 0.55 + 0.1, Math.sin(a) * r * 0.4);
    stick.rotation.z = Math.cos(a) * 0.06;
    stick.rotation.x = Math.sin(a) * 0.06;
    g.add(stick);
    const tip = new Mesh(new SphereGeometry(45e-4, 6, 5), M.bulbRed);
    tip.position.set(Math.cos(a) * r * 0.4, r * 0.55 + 0.21, Math.sin(a) * r * 0.4);
    g.add(tip);
  }
  return g;
}
function candle(h = 0.16) {
  const g = new Group();
  g.userData.dynamic = true;
  const wax = new Mesh(new CylinderGeometry(0.017, 0.019, h, 10), M.candleWax);
  wax.position.y = h / 2;
  g.add(wax);
  const flame = new Mesh(
    new SphereGeometry(9e-3, 8, 6),
    new MeshBasicMaterial({ color: new Color(2.2, 1.2, 0.45) })
  );
  flame.scale.set(1, 2.2, 1);
  flame.position.y = h + 0.014;
  g.add(flame);
  g.userData.flame = flame;
  g.userData.animate = (t) => {
    const f = 1 + Math.sin(t * 17) * 0.09 + Math.sin(t * 31) * 0.05;
    flame.scale.set(f, 2.2 * f, f);
  };
  return g;
}
function crate(w = 0.5, h = 0.36, d = 0.36, mat = M.woodRaw) {
  const g = new Group();
  g.add(box(w, h, d, mat, 0, h / 2, 0));
  for (const s of [-1, 1]) {
    g.add(box(w + 0.01, 0.03, 0.03, M.woodDark, 0, h * 0.18, s * (d / 2 + 5e-3)));
    g.add(box(w + 0.01, 0.03, 0.03, M.woodDark, 0, h * 0.86, s * (d / 2 + 5e-3)));
  }
  return g;
}
function cardboardBox(w = 0.45, h = 0.35, d = 0.4) {
  const g = new Group();
  g.add(box(w, h, d, M.cardboard, 0, h / 2, 0));
  g.add(box(w + 4e-3, 0.01, d * 0.5, M.cardboardDark, 0, h + 4e-3, 0));
  const tape = box(0.09, 2e-3, d + 2e-3, M.cardboardDark, 0, h + 0.012, 0);
  g.add(tape);
  return g;
}
function bicycle() {
  const g = new Group();
  const wheelG = new TorusGeometry(0.33, 0.018, 6, 24);
  const tireG = new TorusGeometry(0.34, 0.012, 5, 24);
  for (const s of [-1, 1]) {
    const rim = new Mesh(wheelG, M.metalGalv);
    rim.position.set(s * 0.52, 0.34, 0);
    g.add(rim);
    const tire = new Mesh(tireG, M.rubber);
    tire.position.set(s * 0.52, 0.34, 0);
    g.add(tire);
    for (let i = 0; i < 12; i++) {
      const sp = new Mesh(new CylinderGeometry(18e-4, 18e-4, 0.64, 3), M.metalGalv);
      sp.position.set(s * 0.52, 0.34, 0);
      sp.rotation.z = i / 12 * Math.PI;
      g.add(sp);
    }
    const hub = new Mesh(new CylinderGeometry(0.03, 0.03, 0.06, 8), M.metalDark);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(s * 0.52, 0.34, 0);
    g.add(hub);
  }
  const pts = [[-0.52, 0.34], [-0.1, 0.34], [-0.02, 0.72], [-0.4, 0.86], [-0.52, 0.34]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const t = cyl(0.016, 0.016, len, M.metalDark, 6);
    t.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    t.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
    g.add(t);
  }
  const fork = cyl(0.014, 0.014, 0.62, M.metalDark, 6);
  fork.position.set(0.44, 0.6, 0);
  fork.rotation.z = 0.18;
  g.add(fork);
  const bars = cyl(0.013, 0.013, 0.52, M.metalDark, 6);
  bars.rotation.x = Math.PI / 2;
  bars.position.set(0.5, 0.92, 0);
  g.add(bars);
  for (const s of [-1, 1]) g.add(cyl(0.019, 0.019, 0.1, M.rubber, 6).translateX(0.5).translateY(0.92).translateZ(s * 0.25).rotateX(Math.PI / 2));
  const seat = box(0.22, 0.05, 0.12, M.leather, -0.12, 0.92, 0);
  g.add(seat);
  const seatPost = cyl(0.012, 0.012, 0.2, M.metalDark, 5);
  seatPost.position.set(-0.12, 0.82, 0);
  g.add(seatPost);
  const basket = new Group();
  for (let i = 0; i < 6; i++) basket.add(box(0.3, 4e-3, 4e-3, M.metalRust, 0, i * 0.035, 0.12));
  for (let i = 0; i < 6; i++) basket.add(box(0.3, 4e-3, 4e-3, M.metalRust, 0, i * 0.035, -0.12));
  basket.position.set(0.5, 0.74, 0);
  g.add(basket);
  g.add(box(0.34, 0.07, 0.02, M.metalDark, -0.02, 0.36, 0.07));
  return g;
}
function acUnit() {
  const g = new Group();
  g.add(box(0.78, 0.55, 0.32, M.metalGalv, 0, 0, 0));
  const fan = new Mesh(new CircleGeometry(0.19, 20), M.blackMetal);
  fan.position.set(-0.16, 0, 0.165);
  g.add(fan);
  const hub = new Mesh(new CylinderGeometry(0.035, 0.035, 0.02, 10), M.metalDark);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(-0.16, 0, 0.18);
  g.add(hub);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.add(box(0.36, 5e-3, 5e-3, M.metalDark, -0.16, Math.sin(a) * 0.09, 0.175));
  }
  for (let i = 0; i < 6; i++) g.add(box(0.34, 4e-3, 4e-3, M.metalDark, 0.2, -0.18 + i * 0.07, 0.166));
  g.add(box(0.8, 0.03, 0.03, M.metalRust, 0, -0.3, -0.15));
  return g;
}
function bucket(r = 0.17, h = 0.3, mat = M.plasticBlue) {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(r, r * 0.82, h, 18, 1, true), mat);
  body.position.y = h / 2;
  g.add(body);
  const bottom = new Mesh(new CylinderGeometry(r * 0.82, r * 0.82, 0.01, 18), mat);
  bottom.position.y = 5e-3;
  g.add(bottom);
  const rim = new Mesh(new TorusGeometry(r, 0.012, 5, 20), mat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h;
  g.add(rim);
  return g;
}
function mop() {
  const g = new Group();
  const handle = cyl(0.012, 0.012, 1.25, M.woodRaw, 6);
  handle.position.y = 0.72;
  handle.rotation.z = 0.12;
  g.add(handle);
  const head = new Mesh(new CylinderGeometry(0.09, 0.13, 0.12, 10), M.fabricCream);
  head.position.set(0.08, 0.07, 0);
  g.add(head);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const strand = cyl(4e-3, 6e-3, 0.16, M.fabricCream, 4);
    strand.position.set(0.08 + Math.cos(a) * 0.1, 0.02, Math.sin(a) * 0.1);
    strand.rotation.z = Math.cos(a) * 0.4;
    strand.rotation.x = Math.sin(a) * 0.4;
    g.add(strand);
  }
  return g;
}
function trashBag() {
  const geo = new SphereGeometry(0.26, 14, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new Vector3().fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 22) * Math.cos(v.y * 19) * 0.02 + Math.sin(v.z * 31) * 0.012;
    v.addScaledVector(v.clone().normalize(), n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new Mesh(geo, M.plasticGreen);
  m.scale.y = 1.15;
  m.castShadow = true;
  const g = new Group();
  g.add(m);
  m.position.y = 0.28;
  const tie = new Mesh(new TorusGeometry(0.06, 0.012, 5, 10), M.plasticGreen);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.56;
  g.add(tie);
  return g;
}
function pictureFrame(tex, w = 0.36, h = 0.46, frameMat = M.woodDark) {
  const g = new Group();
  g.add(box(w + 0.05, h + 0.05, 0.025, frameMat, 0, 0, 0));
  const pic = new Mesh(new PlaneGeometry(w, h), new MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    emissive: 16777215,
    emissiveMap: tex,
    emissiveIntensity: 0.04
  }));
  pic.position.z = 0.014;
  g.add(pic);
  return g;
}
function poster(name, w = 0.42, h = 0.6, opts = {}) {
  const m = new Mesh(new PlaneGeometry(w, h), posterMat(name, opts));
  m.receiveShadow = true;
  return m;
}
function stuckPoster(name, w, h, opts) {
  const p = poster(name, w, h, opts);
  p.geometry = new PlaneGeometry(w, h, 6, 6);
  const pos = p.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = (x / w + 0.5) * (0.5 - y / h);
    pos.setZ(i, d * 0.02 + Math.sin(x * 9) * 15e-4);
  }
  p.geometry.computeVertexNormals();
  return p;
}
function sticker(name, w, h, opacity = 1) {
  const m = new Mesh(new PlaneGeometry(w, h), decalMat(name, opacity));
  m.renderOrder = 2;
  return m;
}
function stackOfBooks(n = 4) {
  const g = new Group();
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = rand(0.18, 0.26), d = rand(0.13, 0.19), h = rand(0.02, 0.045);
    const b = box(w, h, d, i % 2 ? M.fabricGreen : M.paper, rand(-0.03, 0.03), y + h / 2, rand(-0.02, 0.02), rand(-0.2, 0.2));
    g.add(b);
    y += h;
  }
  return g;
}
function newspapers(n = 8) {
  const g = new Group();
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.3, d = 0.22;
    const p = new Mesh(new PlaneGeometry(w, d), new MeshStandardMaterial({
      map: T.art.newspaper,
      color: 12168597,
      roughness: 1,
      side: DoubleSide
    }));
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = rand(-0.15, 0.15);
    p.position.set(rand(-0.03, 0.03), y + 2e-3, rand(-0.02, 0.02));
    g.add(p);
    y += 4e-3;
  }
  return g;
}
function hangingCloth(w = 0.5, h = 0.7, mat = M.fabricCream) {
  const geo = new PlaneGeometry(w, h, 12, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 9 + y * 3) * 0.012 + Math.sin(y * 5) * 0.01);
  }
  geo.computeVertexNormals();
  const m = new Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function curtain(w = 1, h = 2, mat = M.curtain) {
  const geo = new PlaneGeometry(w, h, 24, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(x / w * Math.PI * 6) * 0.045 + Math.sin(x / w * Math.PI * 2.3) * 0.02);
  }
  geo.computeVertexNormals();
  const m = new Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
