import * as THREE from 'three';
import { M, posterMat, decalMat } from '../core/materials.js';
import { T } from '../core/textures.js';
import { box, cyl, mesh, planeGeo, rand, clamp } from '../core/util.js';
import { wallGroup } from './buildutil.js';
import { makeDoor } from './fixtures.js';
import {
  bulbLamp, fluorescent, sofa, bed, wardrobe, tvSet, altarTable, incenseBurner, candle,
  pictureFrame, poster, stuckPoster, sticker, stackOfBooks, newspapers, woodenChair, woodenStool,
  cardboardBox, bucket, curtain, hangingCloth, cable, tube, diningTable, herbJar, radio,
} from '../core/props.js';

export const APT = { x0: -4, x1: 4, z0: -1.0, z1: 6.0, y0: 3.6, h: 2.95 };
export const BATH = { x0: 1.75, x1: 4.0, z0: 3.05, z1: 5.3 };

export function buildApartment(W) {
  const { x0, x1, z0, z1, y0, h } = APT;
  const g = new THREE.Group(); W.root.add(g);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cy = y0 + h;

  // ---------------------------------------------------------------- shell
  const floorMat = M.floorWood.clone();
  W.wetFloor(floorMat, { room: 'apt', amount: 0.35, distortion: 0.012, tint: 0xffe8d0 });
  const floor = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, y0 + 0.01, cz);
  floor.receiveShadow = true; g.add(floor); W.upperHide.push(floor);

  const ceil = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), M.ceilingDirty);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, cy, cz); g.add(ceil);

  // north wall (entry door)
  const north = wallGroup(x1 - x0, h, M.wallPeelWarm, [{ x0: 4.55, x1: 5.55, y0: 0, y1: 2.2 }]);
  north.position.set(cx, y0, z0); g.add(north);
  W.colliders.push({ minX: x0, maxX: 0.55, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: y0, maxY: cy, enabled: true });
  W.colliders.push({ minX: 1.55, maxX: x1, minZ: z0 - 0.15, maxZ: z0 + 0.15, minY: y0, maxY: cy, enabled: true });

  // south wall (windows)
  const south = wallGroup(x1 - x0, h, M.wallPeelWarm, [
    { x0: 1.1, x1: 3.6, y0: 0.95, y1: 2.3 },
    { x0: 5.0, x1: 6.4, y0: 1.15, y1: 2.05 },
  ]);
  south.rotation.y = Math.PI; south.position.set(cx, y0, z1); g.add(south);
  W.colliders.push({ minX: x0, maxX: x1, minZ: z1 - 0.15, maxZ: z1 + 0.15, minY: y0, maxY: cy, enabled: true });

  // west / east
  const west = new THREE.Mesh(planeGeo(z1 - z0, h), M.wallPeel);
  west.rotation.y = Math.PI / 2; west.position.set(x0, y0 + h / 2, cz); west.receiveShadow = true; g.add(west);
  W.colliders.push({ minX: x0 - 0.15, maxX: x0 + 0.15, minZ: z0, maxZ: z1, minY: y0, maxY: cy, enabled: true });
  // the bathroom hangs its own 12 cm shell on x = x1 between z 3.05 and 5.3; a full-length plane
  // here sat exactly on that shell's inner face and z-fought with it behind the toilet
  for (const [ez0, ez1] of [[z0, BATH.z0], [BATH.z1, z1]]) {
    const east = new THREE.Mesh(planeGeo(ez1 - ez0, h), M.wallPeel);
    east.rotation.y = -Math.PI / 2;
    east.position.set(x1, y0 + h / 2, (ez0 + ez1) / 2);
    east.receiveShadow = true; g.add(east);
  }
  W.colliders.push({ minX: x1 - 0.15, maxX: x1 + 0.15, minZ: z0, maxZ: z1, minY: y0, maxY: cy, enabled: true });

  // ceiling beams
  for (let i = 0; i < 2; i++) {
    g.add(box(x1 - x0, 0.14, 0.1, M.woodBlack, cx, cy - 0.08, z0 + 2.2 + i * 2.4));
  }

  // entry door (from stair landing)
  const entry = makeDoor(W, {
    x: 1.05, y: y0, z: z0 + 0.04, width: 0.95, height: 2.18, ry: 0, hinge: 'left',
    label: '入屋', mat: M.woodDark, red: true, openAngle: -1.75,
    onOpen: () => W.story?.onApartmentEntered?.(),
  });
  g.add(entry.root);

  // solid volumes for the furniture you can walk into
  W.colliders.push({ minX: -3.95, maxX: -3.2, minZ: -0.65, maxZ: 0.9, minY: y0, maxY: y0 + 1.6, enabled: true });   // altar
  W.colliders.push({ minX: 2.28, maxX: 3.25, minZ: 0.45, maxZ: 2.7, minY: y0, maxY: y0 + 0.95, enabled: true });   // sofa
  W.colliders.push({ minX: -4, maxX: -3.32, minZ: 1.85, maxZ: 3.25, minY: y0, maxY: y0 + 1.25, enabled: true });   // tv cabinet
  W.colliders.push({ minX: 3.3, maxX: 4, minZ: 1.5, maxZ: 2.8, minY: y0, maxY: y0 + 2.0, enabled: true });         // wardrobe
  W.colliders.push({ minX: -3.8, maxX: -2.5, minZ: 3.8, maxZ: 5.9, minY: y0, maxY: y0 + 0.75, enabled: true });    // bed

  // ---------------------------------------------------------------- partition + bathroom shell
  // these are solid 12 cm boxes, not zero-thickness planes: a plane with no thickness
  // reads as "transparent" when you stand on the wrong side of it
  const part = box(3.4, h, 0.12, M.wallPeelGreen, -2.3, y0 + h / 2, 3.15);
  part.name = 'partition'; g.add(part);
  W.colliders.push({ minX: x0, maxX: -0.6, minZ: 3.02, maxZ: 3.28, minY: y0, maxY: cy, enabled: true });

  // wall between living room and bedroom, with a cased doorway at world x 0.02..0.97
  {
    const bx0 = -0.6, bx1 = 1.75, wz = 3.12, th = 0.12;
    const dL = 0.62, dR = 1.57;                     // local opening
    const wL = dL, wR = bx1 - bx0 - dR;
    g.add(box(wL, h, th, M.wallPeelWarm, bx0 + wL / 2, y0 + h / 2, wz));                 // left of door
    g.add(box(wR, h, th, M.wallPeelWarm, bx0 + dR + wR / 2, y0 + h / 2, wz));            // right of door
    g.add(box(dR - dL, h - 2.15, th, M.wallPeelWarm, bx0 + (dL + dR) / 2, y0 + 2.15 + (h - 2.15) / 2, wz)); // header
    // casing
    for (const u of [dL, dR]) g.add(box(0.07, 2.2, 0.16, M.woodDark, bx0 + u, y0 + 1.1, wz));
    g.add(box(dR - dL + 0.07, 0.08, 0.16, M.woodDark, bx0 + (dL + dR) / 2, y0 + 2.16, wz));
    W.colliders.push({ minX: bx0, maxX: bx0 + dL, minZ: wz - 0.09, maxZ: wz + 0.09, minY: y0, maxY: cy, enabled: true });
    W.colliders.push({ minX: bx0 + dR, maxX: bx1, minZ: wz - 0.09, maxZ: wz + 0.09, minY: y0, maxY: cy, enabled: true });
    W.colliders.push({ minX: bx0 + dL, maxX: bx0 + dR, minZ: wz - 0.09, maxZ: wz + 0.09, minY: y0 + 2.15, maxY: cy, enabled: true });
  }

  // the bathroom shell (including the west wall and its door opening) is built in bathroom.js;
  // only the dead strip behind it, z 5.3..6, belongs to this room
  {
    const wx = BATH.x0;
    g.add(box(0.12, h, 6.0 - BATH.z1, M.wallPeelWarm, wx - 0.06, y0 + h / 2, (BATH.z1 + 6.0) / 2));
    W.colliders.push({ minX: wx - 0.12, maxX: wx, minZ: BATH.z1, maxZ: 6.0, minY: y0, maxY: cy, enabled: true });
  }

  const bathDoor = makeDoor(W, {
    x: BATH.x0 - 0.055, y: y0, z: 4.275, width: 0.9, height: 2.08, ry: Math.PI / 2, hinge: 'left',
    label: '浴室', mat: M.woodBlack, knob: true, openAngle: 1.9,
  });
  g.add(bathDoor.root);

  // ---------------------------------------------------------------- rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.1), M.carpetRed);
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.5, y0 + 0.012, 1.35); g.add(rug);
  const rugBorder = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.1), decalMat('stain', 0.0));
  rugBorder.visible = false;

  // ---------------------------------------------------------------- altar corner (hero)
  const altar = new THREE.Group(); altar.position.set(x0 + 0.42, y0, 0.12); altar.rotation.y = Math.PI / 2; g.add(altar);
  const at = altarTable(1.95, 0.62, 0.8); altar.add(at);
  // red cloth over the table
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.62, 12, 10), M.woodRed);
  cloth.rotation.x = -Math.PI / 2; cloth.position.set(0, 0.831, 0.02); altar.add(cloth);
  // cloth falling to the floor over the front edge
  const skirt = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8, 14, 10), M.fabricRed);
  const sk = skirt.geometry.attributes.position;
  for (let i = 0; i < sk.count; i++) sk.setZ(i, Math.sin(sk.getX(i) * 7) * 0.02);
  skirt.geometry.computeVertexNormals();
  skirt.position.set(0, 0.42, 0.315); altar.add(skirt);

  // shrine box with red light behind glass
  const shrine = new THREE.Group(); shrine.position.set(0, 0.83, -0.12); altar.add(shrine);
  shrine.add(box(0.62, 0.52, 0.26, M.woodRed, 0, 0.26, 0));
  // dark red interior with a small hot strip light (no flat pink screen)
  const shrineInner = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.42), new THREE.MeshStandardMaterial({ color: 0x3a0f08, roughness: 0.9, emissive: 0x8a1a0a, emissiveIntensity: 0.35 }));
  shrineInner.position.set(0, 0.3, 0.131); shrine.add(shrineInner);
  const shrineGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.05),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.2, 0.08) }));
  shrineGlow.position.set(0, 0.5, 0.135); shrine.add(shrineGlow);
  const shrineGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.44), M.glass);
  shrineGlass.position.set(0, 0.3, 0.145); shrine.add(shrineGlass);
  W.addLight('apt', (() => {
    const l = new THREE.PointLight(0xff3a18, 1.6, 1.6, 2);
    l.position.set(x0 + 0.72, y0 + 1.12, 0.18); return l;
  })());
  shrine.add(box(0.66, 0.05, 0.3, M.woodBlack, 0, 0.02, 0));
  // small statue inside
  const statue = new THREE.Group(); statue.position.set(0, 0.05, 0.16); statue.scale.setScalar(1.15); shrine.add(statue);
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.85, emissive: 0x6a3a10, emissiveIntensity: 0.6 });
  const sbody = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 12), gold); sbody.position.y = 0.1; statue.add(sbody);
  const shead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), gold); shead.position.y = 0.24; statue.add(shead);
  const sbase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 12), gold); sbase.position.y = 0.02; statue.add(sbase);

  // candles, incense, offerings
  for (const [dx, dz, hh] of [[-0.36, 0.08, 0.18], [0.36, 0.08, 0.16], [-0.22, 0.16, 0.1], [0.24, 0.17, 0.12]]) {
    const c = candle(hh); c.position.set(dx, 0.83, dz); altar.add(c);
    W.animators.push((t, dt) => c.userData.animate?.(t, dt));
  }
  const burner = incenseBurner(0.1); burner.position.set(0, 0.83, 0.22); altar.add(burner);
  const oranges = new THREE.Group(); oranges.position.set(0.02, 0.83, 0.33); altar.add(oranges);
  for (let i = 0; i < 3; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9a4a16, roughness: 0.5 }));
    o.position.set(-0.1 + i * 0.1, 0.042, (i % 2) * 0.05); oranges.add(o);
  }
  // paper offerings / books
  const stack = stackOfBooks(3); stack.position.set(-0.42, 0.83, 0.3); altar.add(stack);
  const papers = newspapers(5); papers.position.set(0.44, 0.83, 0.28); papers.scale.set(0.8, 1, 0.8); altar.add(papers);

  // clock, tea set, books, fruit plate
  const clockG = new THREE.Group(); clockG.position.set(0.62, 0.83, 0.02); altar.add(clockG);
  clockG.add(box(0.09, 0.12, 0.06, M.woodBlack, 0, 0.06, 0));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.038, 16), new THREE.MeshStandardMaterial({ color: 0xd8cdb4, roughness: 0.6, emissive: 0x3a2a18, emissiveIntensity: 0.4 }));
  face.position.set(0, 0.065, 0.032); clockG.add(face);
  const hand = box(0.003, 0.03, 0.002, M.blackMetal, 0, 0.075, 0.034); clockG.add(hand);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 16), M.porcelain);
  plate.position.set(-0.62, 0.84, 0.16); altar.add(plate);
  for (let i = 0; i < 4; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb85a1a, roughness: 0.5 }));
    o.position.set(-0.75 + (i % 2) * 0.14, 0.89, 0.1 + Math.floor(i / 2) * 0.12); altar.add(o);
  }
  const tea = cyl(0.035, 0.028, 0.07, M.porcelain, 12); tea.position.set(-0.25, 0.855, 0.24); altar.add(tea);
  const bks2 = stackOfBooks(5); bks2.position.set(0.45, 0.83, 0.3); altar.add(bks2);

  // wall composition above the altar
  const bann = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.9), posterMat('banner_red', { emissive: 0.08 }));
  bann.position.set(-2.95, y0 + 1.95, -0.55); bann.rotation.y = Math.PI / 2 - 0.04; g.add(bann);
  const bud = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.72), posterMat('poster_buddha', { emissive: 0.05 }));
  bud.position.set(-3.96, y0 + 1.72, 0.55); bud.rotation.y = Math.PI / 2; g.add(bud);
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.64), posterMat('meridian', { tint: 0xcac0a8 }));
  mer.position.set(-3.96, y0 + 1.55, 1.0); mer.rotation.y = Math.PI / 2; g.add(mer);
  const cal2 = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.46), posterMat('calendar'));
  cal2.position.set(-3.96, y0 + 1.35, -0.85); cal2.rotation.y = Math.PI / 2; g.add(cal2);

  // red cloth backdrop behind the altar
  const backCloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5, 10, 10), M.fabricRed);
  const bp = backCloth.geometry.attributes.position;
  for (let i = 0; i < bp.count; i++) bp.setZ(i, Math.sin(bp.getX(i) * 5) * 0.012);
  backCloth.geometry.computeVertexNormals();
  backCloth.position.set(-3.986, y0 + 1.05, -0.15); backCloth.rotation.y = Math.PI / 2; g.add(backCloth);
  // extra posters crowding the wall like the reference
  const pA = stuckPoster('poster_buddha', 0.34, 0.46, { tint: 0xb8ad94 });
  pA.position.set(-3.93, y0 + 2.1, 1.15); pA.rotation.y = Math.PI / 2; g.add(pA);
  const pB = stuckPoster('meridian', 0.3, 0.42, { tint: 0xc0b59c });
  pB.position.set(-3.93, y0 + 0.85, 0.95); pB.rotation.y = Math.PI / 2; g.add(pB);
  const pC = poster('notice', 0.26, 0.34, { tint: 0xcabfa8 });
  pC.position.set(-3.93, y0 + 0.72, 1.5); pC.rotation.y = Math.PI / 2; g.add(pC);

  const pD = poster('meridian', 0.42, 0.6, { tint: 0xd0c6ac });
  pD.position.set(-3.952, y0 + 2.0, 1.75); pD.rotation.y = Math.PI / 2; g.add(pD);
  const pE = stuckPoster('poster_buddha', 0.4, 0.54, { tint: 0xc8bea2 });
  pE.position.set(-3.952, y0 + 2.05, 2.35); pE.rotation.y = Math.PI / 2; pE.rotation.z = 0.03; g.add(pE);
  const pF = poster('calendar', 0.3, 0.44, { tint: 0xcabfa6 });
  pF.position.set(-3.952, y0 + 1.15, 2.6); pF.rotation.y = Math.PI / 2; g.add(pF);

  // framed family photos on the altar wall
  for (let i = 0; i < 3; i++) {
    const ph = pictureFrame(T.art[`photo_${i + 1}`], 0.2, 0.26, i === 1 ? M.woodRed : M.woodDark);
    ph.position.set(-3.95, y0 + 1.35 + (i === 1 ? 0.32 : 0), 1.55 + i * 0.3);
    ph.rotation.y = Math.PI / 2; ph.rotation.z = rand(-0.05, 0.05); g.add(ph);
  }
  // baxi / paper talisman on the wall
  const tal = sticker('talisman', 0.17, 0.6, 0.95);
  tal.position.set(-3.94, y0 + 1.55, -0.15); tal.rotation.y = Math.PI / 2; g.add(tal);

  // yellow curtain beside the altar
  const curt = curtain(0.75, 2.15, M.curtain);
  curt.position.set(-3.9, y0 + 1.25, 1.95); curt.rotation.y = Math.PI / 2; g.add(curt);

  // ---------------------------------------------------------------- living
  const sf = sofa(2.05); sf.position.set(2.75, y0, 1.55); sf.rotation.y = -Math.PI / 2; g.add(sf);
  W.colliders.push({ minX: 2.3, maxX: 3.2, minZ: 0.5, maxZ: 2.6, minY: y0, maxY: y0 + 0.9, enabled: true });

  const coffee = box(0.95, 0.05, 0.5, M.woodDark, 1.25, y0 + 0.36, 1.55); g.add(coffee);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.018, 0.022, 0.36, M.woodDark, 6).translateX(1.25 + sx * 0.4).translateY(y0 + 0.18).translateZ(1.55 + sz * 0.2));
  // tea set + ashtray
  g.add(cyl(0.035, 0.028, 0.07, M.porcelain, 12).translateX(1.1).translateY(y0 + 0.42).translateZ(1.45));
  g.add(cyl(0.05, 0.05, 0.018, M.ceramicGreen, 14).translateX(1.35).translateY(y0 + 0.39).translateZ(1.62));

  // tv cabinet + tv against the west wall, facing the sofa
  const cab = box(1.1, 0.55, 0.42, M.woodDark, x0 + 0.28, y0 + 0.275, 2.55); g.add(cab);
  const tv = tvSet(); tv.position.set(x0 + 0.3, y0 + 0.55, 2.55); tv.rotation.y = Math.PI / 2; g.add(tv);
  W.animators.push((t, dt) => tv.userData.animate?.(t, dt));
  W.colliders.push({ minX: x0, maxX: x0 + 0.55, minZ: 2.0, maxZ: 3.1, minY: y0, maxY: y0 + 1.1, enabled: true });

  // kitchen nook on the east wall
  const kt = new THREE.Group(); kt.position.set(x1 - 0.3, y0, -0.35); kt.rotation.y = -Math.PI / 2; g.add(kt);
  kt.add(box(1.3, 0.86, 0.56, M.woodDark, 0, 0.43, 0));
  kt.add(box(1.34, 0.05, 0.6, M.woodBlack, 0, 0.88, 0));
  const stove = box(0.52, 0.06, 0.42, M.blackMetal, -0.25, 0.915, 0.02); kt.add(stove);
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 16), M.metalRust);
    ring.rotation.x = Math.PI / 2; ring.position.set(-0.25 + s * 0.12, 0.95, 0.02); kt.add(ring);
  }
  const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), M.metalGalv);
  kettle.scale.y = 0.85; kettle.position.set(-0.45, 1.0, 0.02); kt.add(kettle);
  kt.add(cyl(0.008, 0.012, 0.16, M.metalDark, 6).translateX(-0.45).translateY(1.05).translateZ(0.12).rotateX(0.8));
  for (let i = 0; i < 3; i++) {
    const jar = herbJar(0.055, 0.13, [0x6a5a32, 0x7a4a2a, 0x4a5a3a][i]);
    jar.position.set(0.2 + i * 0.15, 0.905, 0.1); kt.add(jar);
  }
  // hanging utensils
  for (let i = 0; i < 4; i++) {
    kt.add(cyl(0.004, 0.004, 0.3, M.metalDark, 4).translateX(0.1 + i * 0.13).translateY(1.2).translateZ(-0.24));
    kt.add(box(0.03, 0.12, 0.01, M.metalGalv, 0.1 + i * 0.13, 1.0, -0.24));
  }

  // wardrobe (east wall) with mirror
  const wr = wardrobe(1.15, 1.95, 0.55); wr.position.set(x1 - 0.3, y0, 2.15); wr.rotation.y = -Math.PI / 2; g.add(wr);
  W.colliders.push({ minX: x1 - 0.62, maxX: x1, minZ: 1.55, maxZ: 2.75, minY: y0, maxY: y0 + 2.0, enabled: true });
  W.addMirror(wr.userData.mirror, 'wardrobe');

  // chair facing the altar, a small stool with clothes
  const ch = woodenChair(); ch.position.set(-2.55, y0, 0.85); ch.rotation.y = 1.55; g.add(ch);
  const st2 = woodenStool(0.42); st2.position.set(1.9, y0, 3.0); g.add(st2);
  const cloth2 = hangingCloth(0.4, 0.5, M.fabricBlue);
  cloth2.rotation.x = -Math.PI / 2; cloth2.position.set(1.9, y0 + 0.44, 3.0); g.add(cloth2);

  // ---------------------------------------------------------------- bedroom
  const bd = bed(1.15, 1.95); bd.position.set(-3.15, y0, 4.85); g.add(bd);
  W.colliders.push({ minX: -3.75, maxX: -2.55, minZ: 3.85, maxZ: 5.85, minY: y0, maxY: y0 + 0.6, enabled: true });
  const night = box(0.42, 0.5, 0.4, M.woodDark, -2.25, y0 + 0.25, 4.3); g.add(night);
  const nlamp = new THREE.Group(); nlamp.position.set(-2.25, y0 + 0.5, 4.3); g.add(nlamp);
  nlamp.add(cyl(0.05, 0.07, 0.02, M.brass, 12));
  nlamp.add(cyl(0.012, 0.012, 0.2, M.brass, 6).translateY(0.1));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 16, 1, true), M.fabricCream);
  shade.position.y = 0.24; shade.material = shade.material.clone(); shade.material.side = THREE.DoubleSide;
  shade.material.emissive = new THREE.Color(0xffb070); shade.material.emissiveIntensity = 0.6;
  nlamp.add(shade);
  g.add(pictureFrame(T.art.photo_4, 0.16, 0.2).translateX(-2.25).translateY(y0 + 0.58).translateZ(4.2).rotateY(0.2));
  g.add(stackOfBooks(2).translateX(-2.3).translateY(y0 + 0.5).translateZ(4.42));

  // window + curtain + rain glass
  const winFrame = new THREE.Group(); winFrame.position.set(1.65, y0 + 0.95, z1 - 0.03); g.add(winFrame);
  winFrame.add(box(2.5, 0.08, 0.12, M.woodDark, 0, 1.35, 0));
  winFrame.add(box(2.5, 0.08, 0.12, M.woodDark, 0, 0, 0));
  winFrame.add(box(0.08, 1.35, 0.12, M.woodDark, -1.25, 0.675, 0));
  winFrame.add(box(0.08, 1.35, 0.12, M.woodDark, 1.25, 0.675, 0));
  winFrame.add(box(0.06, 1.35, 0.1, M.woodDark, 0, 0.675, 0));
  winFrame.add(box(0.06, 1.35, 0.1, M.woodDark, -0.62, 0.675, 0));
  winFrame.add(box(0.06, 1.35, 0.1, M.woodDark, 0.62, 0.675, 0));
  const winGlassMat = M.glass.clone(); winGlassMat.opacity = 0.16; winGlassMat.roughness = 0.06;
  winGlassMat.normalMap = T.art.water_normal; winGlassMat.normalScale.set(0.25, 0.25);
  const wg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), winGlassMat);
  wg.position.set(0, 0.675, 0); winFrame.add(wg);
  W.animators.push((t) => { winGlassMat.normalMap.offset.y = -t * 0.05; winGlassMat.normalMap.offset.x = t * 0.01; });

  // curtain partially drawn
  const cu = curtain(1.0, 2.2, M.curtain); cu.position.set(0.75, y0 + 1.15, z1 - 0.13); g.add(cu);
  const cu2 = curtain(0.75, 2.2, M.curtain); cu2.position.set(2.6, y0 + 1.15, z1 - 0.13); g.add(cu2);
  g.add(cyl(0.012, 0.012, 2.6, M.metalDark, 6).rotateZ(Math.PI / 2).translateX(1.65).translateY(y0 + 2.35).translateZ(z1 - 0.13));

  // laundry line across the bedroom
  const ll1 = new THREE.Vector3(x0 + 0.2, y0 + 2.45, 4.0);
  const ll2 = new THREE.Vector3(1.35, y0 + 2.35, 5.6);
  g.add(cable([ll1.x, ll1.y, ll1.z], [ll2.x, ll2.y, ll2.z], 0.25, 0.006));
  const cl1 = hangingCloth(0.42, 0.6, M.fabricCream);
  cl1.position.set(-1.7, y0 + 2.1, 4.25); cl1.rotation.set(0, 0.4, 0.02); g.add(cl1);
  const cl2 = hangingCloth(0.5, 0.7, M.fabricBlue);
  cl2.position.set(-0.8, y0 + 2.05, 4.6); cl2.rotation.set(0, 0.25, -0.03); g.add(cl2);

  // floor clutter
  const bx3 = cardboardBox(0.5, 0.38, 0.4); bx3.position.set(-3.3, y0, 3.6); bx3.rotation.y = 0.3; g.add(bx3);
  const bkt = bucket(0.16, 0.28, M.plasticRed); bkt.position.set(1.1, y0, 3.6); g.add(bkt);
  const nws = newspapers(9); nws.position.set(-1.9, y0 + 0.02, 2.2); g.add(nws);
  const bks = stackOfBooks(6); bks.position.set(-3.6, y0, 2.9); bks.rotation.y = 0.4; g.add(bks);
  const thermos = cyl(0.045, 0.04, 0.24, M.metalGalv, 12); thermos.position.set(-3.55, y0 + 0.12, 4.35); g.add(thermos);

  // slippers by the bed
  for (const s of [-1, 1]) {
    const sl = box(0.09, 0.03, 0.22, M.fabricRed, -2.75 + s * 0.11, y0 + 0.02, 3.75);
    sl.rotation.y = s * 0.12; g.add(sl);
  }

  // ---------------------------------------------------------------- grime / posters
  // stains belong ON a surface: pin each one to a wall face instead of floating it in the room.
  // the west wall is the shrine wall, so it stays clean — a milky panel over a talisman reads
  // as a floating pane, not as grime
  for (let i = 0; i < 9; i++) {
    const s = sticker('stain', rand(0.5, 1.15), rand(0.5, 1.3), rand(0.16, 0.3));
    const yy = rand(y0 + 0.35, y0 + 2.5);
    switch (i % 3) {
      case 0:
        s.position.set(rand(x0 + 0.5, x1 - 0.5), yy, z0 + 0.02);
        break;
      case 1:
        s.position.set(rand(x0 + 0.5, x1 - 0.5), yy, z1 - 0.02);
        s.rotation.y = Math.PI;
        break;
      default:
        s.position.set(x1 - 0.02, yy, rand(z0 + 0.5, z1 - 0.5));
        s.rotation.y = -Math.PI / 2;
    }
    s.rotation.z = rand(0, 6);
    g.add(s);
  }
  const np = stuckPoster('notice', 0.3, 0.42, { tint: 0xd6cbb4 });
  np.position.set(-3.93, y0 + 1.9, 2.8); np.rotation.y = Math.PI / 2; g.add(np);
  const np2 = stuckPoster('price_board', 0.34, 0.5, { tint: 0xc8bda6 });
  np2.position.set(x1 - 0.03, y0 + 1.9, 1.2); np2.rotation.y = -Math.PI / 2; g.add(np2);

  // ceiling wire web
  const wirePts = [
    [[x0 + 0.2, cy - 0.05, 0.2], [-2.2, cy - 0.35, 0.6], [-1.0, cy - 0.15, 1.1], [0.6, cy - 0.4, 1.6]],
    [[-3.8, cy - 0.1, 2.4], [-2.2, cy - 0.3, 2.0], [-0.4, cy - 0.1, 2.6], [2.0, cy - 0.35, 2.2], [3.8, cy - 0.1, 2.9]],
    [[-3.7, cy - 0.06, 4.6], [-1.8, cy - 0.4, 4.2], [0.4, cy - 0.12, 4.8], [2.2, cy - 0.3, 4.4]],
  ];
  for (const pts of wirePts) {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 5, false), M.rubber));
  }

  // ---------------------------------------------------------------- lights
  const bulbA = bulbLamp({ cord: 0.55, shade: true });
  bulbA.position.set(-2.35, cy - 0.02, 0.28); g.add(bulbA);
  const lA = W.addLight('apt', (() => {
    const l = new THREE.PointLight(0xffb877, 8, 6, 2);
    l.position.set(-2.35, cy - 0.75, 0.28);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0012; l.shadow.normalBias = 0.02;
    return l;
  })());
  W.flicker(lA, { min: 0.9, max: 1, speed: 11, pattern: 'soft' });

  const altarLight = W.addLight('apt', (() => {
    const l = new THREE.PointLight(0xff2c12, 3.2, 3.6, 2);
    l.position.set(x0 + 0.72, y0 + 1.05, -0.05); return l;
  })());
  W.flicker(altarLight, { min: 0.62, max: 1.1, speed: 5.5, pattern: 'flame' });

  const tvLight = W.addLight('apt', (() => {
    const l = new THREE.PointLight(0x8fd0c0, 2.6, 3.2, 2);
    l.position.set(x0 + 0.75, y0 + 0.95, 2.55); return l;
  })());
  W.flicker(tvLight, { min: 0.45, max: 1.2, speed: 14, pattern: 'tv' });

  const lampLight = W.addLight('apt', (() => {
    const l = new THREE.PointLight(0xffb070, 5, 3.6, 2);
    l.position.set(-2.25, y0 + 0.85, 4.3); return l;
  })());
  W.flicker(lampLight, { min: 0.85, max: 1, speed: 5, pattern: 'soft' });

  // cold spill from the window
  W.addLight('apt', (() => {
    const l = new THREE.RectAreaLight(0x6f93a8, 3.2, 2.2, 1.2);
    l.position.set(0.4, y0 + 1.9, z1 - 0.12);
    l.lookAt(0.4, y0 + 1.5, z1 - 3); return l;
  })());

  W.addLight('apt', (() => {
    const l = new THREE.PointLight(0x7a7066, 6, 7, 2);
    l.position.set(0, y0 + 1.5, 2.6); return l;
  })());

  W.room('apt', { x0, x1, z0, z1, y0 });
  W.onEnter('apt', () => W.audio?.setAmbience('apt'));
  W.onEnter('apt', () => W.hud.room('三樓 · 陳宅'));
  return { altar, entry, tv, bathDoor };
}
