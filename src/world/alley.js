import * as THREE from 'three';
import { M, posterMat, decalMat } from '../core/materials.js';
import { T } from '../core/textures.js';
import { box, cyl, planeGeo, rand, scaleUV } from '../core/util.js';
import { wallGroup } from './buildutil.js';
import { makeDoor, makeWindow } from './fixtures.js';
import {
  acUnit, bicycle, bulbLamp, woodenChair, bucket, cardboardBox, crate, newspapers, poster, sticker, sticker as _s,
  trashBag, mop, cable, tube, hangingCloth,
} from '../core/props.js';

export const ALLEY = { x0: -8.4, x1: 8.4, z0: 6, z1: 14 };

export function buildAlley(W) {
  const { x0, x1, z0, z1 } = ALLEY;
  const g = new THREE.Group(); W.root.add(g);

  // ---------------------------------------------------------------- ground
  const floorMat = M.floorAsphalt.clone();
  W.wetFloor(floorMat, { room: 'alley', amount: 1.0, distortion: 0.05, puddle: true, puddleScale: 0.075, tint: 0xffe9d8 });
  const floor = new THREE.Mesh(planeGeo(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (z0 + z1) / 2);
  floor.receiveShadow = true; g.add(floor); W.groundHide.push(floor);
  W.groundFloor = floor;

  // crown of the alley (slight camber) + gutters
  for (const zz of [6.35, 13.7]) {
    const gutter = box(x1 - x0, 0.02, 0.3, M.concreteDark, 0, 0.01, zz);
    g.add(gutter);
  }

  // soft radial alpha so puddles fade into the asphalt instead of reading as black tiles
  const softAlpha = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.62, 'rgba(255,255,255,0.92)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(64, 64, 63, 0, Math.PI * 2); ctx.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  })();
  for (const [px, pz, sx, sz] of [[-4.5, 9.6, 2.4, 1.5], [1.2, 11.2, 3.0, 1.8], [6.8, 8.4, 2.0, 1.2], [-7.4, 12.4, 1.8, 1.1], [6.6, 12.6, 1.5, 1.0], [-2.2, 8.1, 1.6, 1.0], [3.4, 10.6, 1.8, 1.1], [-6.2, 7.6, 1.2, 0.8]]) {
    const pm = M.water.clone();
    pm.normalMap = T.art.water_normal;
    pm.normalScale.set(0.35, 0.35);
    pm.color = new THREE.Color(0x1a2226);
    pm.alphaMap = softAlpha;
    pm.transparent = true;
    pm.opacity = 0.92;
    pm.depthWrite = false;
    W.wetFloor(pm, { room: 'alley', amount: 1.0, distortion: 0.06, tint: 0xffeedd });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz, 1, 1), pm);
    p.rotation.x = -Math.PI / 2; p.position.set(px, 0.006, pz);
    g.add(p); W.puddles.push({ mesh: p, mat: pm, phase: Math.random() * 10 });
  }

  // rain-impact ripple sheet on the wet ground
  const rippleMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 uv = vUv * vec2(34.0, 16.0);
        vec2 id = floor(uv); vec2 f = fract(uv) - 0.5;
        float t = fract(uTime * 0.9 + hash(id));
        float r = length(f);
        float w = 0.018 + t * 0.028;
        float ring = smoothstep(w, 0.0, abs(r - t * 0.30)) * (1.0 - t) * (1.0 - t);
        if (ring < 0.003) discard;
        gl_FragColor = vec4(vec3(0.62, 0.70, 0.74), ring * 0.13);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const ripple = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), rippleMat);
  ripple.rotation.x = -Math.PI / 2; ripple.position.set(0, 0.013, (z0 + z1) / 2);
  g.add(ripple);
  W.animators.push((t) => { rippleMat.uniforms.uTime.value = t; });

  // drain + steam vent
  const grate = new THREE.Group(); grate.position.set(0.6, 0.01, 7.1); g.add(grate);
  grate.add(box(0.7, 0.02, 0.45, M.metalRust, 0, 0, 0));
  for (let i = 0; i < 7; i++) grate.add(box(0.62, 0.03, 0.03, M.blackMetal, 0, 0.005, -0.18 + i * 0.06));

  // ---------------------------------------------------------------- facades
  const facMat = M.plasterDirty;
  // left block (x -13..-4) - solid facade, windows are surface features
  const lw = -4 - x0, lc = (x0 - 4) / 2;
  const leftWall = new THREE.Mesh(planeGeo(lw, 9.6), M.corrugatedRust);
  leftWall.position.set(lc, 6.2, z0); leftWall.receiveShadow = true; g.add(leftWall);
  const leftBase = new THREE.Mesh(planeGeo(lw, 1.4), M.concreteWet);
  leftBase.position.set(lc, 0.7, z0 + 0.01); leftBase.receiveShadow = true; g.add(leftBase);
  W.colliders.push({ minX: x0, maxX: -4.05, minZ: z0 - 0.2, maxZ: z0 + 0.1, minY: 0, maxY: 11, enabled: true });

  // right block (x 4..13)
  const rw = x1 - 4, rc = (x1 + 4) / 2;
  const rightWall = new THREE.Mesh(planeGeo(rw, 9.6), M.corrugated);
  rightWall.position.set(rc, 6.2, z0); rightWall.receiveShadow = true; g.add(rightWall);
  const rightBase = new THREE.Mesh(planeGeo(rw, 1.4), M.concreteWet);
  rightBase.position.set(rc, 0.7, z0 + 0.01); rightBase.receiveShadow = true; g.add(rightBase);
  W.colliders.push({ minX: 4.05, maxX: x1, minZ: z0 - 0.2, maxZ: z0 + 0.1, minY: 0, maxY: 11, enabled: true });

  // window assemblies sitting on the facade
  const winPos = [
    [-7.3, 1.25, 1.0, 1.45, false], [-5.4, 1.3, 1.1, 1.5, true],
    [-7.3, 4.7, 1.05, 1.55, true], [-5.3, 4.7, 1.1, 1.6, false],
    [5.2, 1.25, 1.1, 1.5, false], [7.2, 1.3, 1.0, 1.45, true],
    [5.2, 4.7, 1.1, 1.6, true], [7.3, 4.7, 1.05, 1.55, false],
  ];
  for (const [wx, wy, ww, wh, boarded] of winPos) {
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshStandardMaterial({ color: 0x080a0c, roughness: 0.35, metalness: 0.2 }));
    dark.position.set(wx, wy, z0 + 0.02); g.add(dark);
    const fr = new THREE.Group(); fr.position.set(wx, wy, z0 + 0.04); g.add(fr);
    for (const s of [-1, 1]) fr.add(box(0.08, wh + 0.1, 0.12, M.metalRust, s * (ww / 2), 0, 0));
    for (const s of [-1, 1]) fr.add(box(ww + 0.1, 0.08, 0.12, M.metalRust, 0, s * (wh / 2), 0));
    fr.add(box(ww + 0.22, 0.06, 0.2, M.concreteDark, 0, -wh / 2 - 0.08, 0.05));
    fr.add(box(0.03, wh, 0.03, M.metalRust, 0, 0, 0));
    fr.add(box(ww, 0.03, 0.03, M.metalRust, 0, 0, 0));
    if (boarded) {
      const board = box(ww * 0.92, wh * 0.34, 0.025, M.woodRaw, wx, wy + wh * 0.22, z0 + 0.07);
      board.rotation.z = rand(-0.06, 0.06); g.add(board);
      const board2 = box(ww * 0.8, wh * 0.22, 0.025, M.woodRaw, wx, wy - wh * 0.28, z0 + 0.09);
      board2.rotation.z = rand(-0.05, 0.05); g.add(board2);
    } else {
      // dim interior glow behind some windows
      if (Math.random() < 0.45) {
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(ww * 0.7, wh * 0.7),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.34, 0.16) }));
        glow.position.set(wx, wy, z0 + 0.03); g.add(glow);
      }
    }
  }
  // a few warm lit windows for depth
  for (const [wx, wy, ww, wh] of [[7.2, 1.3, 1.0, 1.45], [-5.3, 4.7, 1.1, 1.6], [5.2, 1.25, 1.1, 1.5]]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww * 0.86, wh * 0.86), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.38, 0.2) }));
    pane.position.set(wx, wy, z0 + 0.028); g.add(pane);
    const pf = new THREE.Group(); pf.position.set(wx, wy, z0 + 0.05); g.add(pf);
    for (const s of [-1, 1]) pf.add(box(0.07, wh + 0.06, 0.1, M.metalDark, s * ww / 2, 0, 0));
    for (const s of [-1, 1]) pf.add(box(ww + 0.06, 0.07, 0.1, M.metalDark, 0, s * wh / 2, 0));
  }

  // ---------------------------------------------------------------- shop building facade above the shopfront
  // the apartment block sits over the shop; without this skin you look straight into the void
  {
    const bx = 4.05;                 // half width of the shop building
    const baseY = 3.28;
    const topY = 11.3;
    const fh = topY - baseY;
    // openings are in local wall units (wallGroup measures from the left edge)
    const winA = { x0: 4.45, x1: 6.95, y0: 1.22, y1: 2.62 };   // wide window over the shopfront
    const winB = { x0: 1.62, x1: 3.02, y0: 1.44, y1: 2.36 };   // small window to the left
    const openings = [winA, winB];

    const facMat = M.concreteWet.clone();
    facMat.color = new THREE.Color(0xb5a894);
    for (const k of ['map', 'normalMap', 'roughnessMap']) {
      if (facMat[k]) { facMat[k] = facMat[k].clone(); facMat[k].repeat.multiplyScalar(2.6); facMat[k].needsUpdate = true; }
    }
    const facade = wallGroup(bx * 2, fh, facMat, openings);
    facade.position.set(0, baseY, z0 + 0.01);
    g.add(facade);
    // thin slab edges only (a full backing board would block the window openings)
    for (const ex of [-bx - 0.03, bx + 0.03]) g.add(box(0.06, fh, 0.18, M.concreteDark, ex, baseY + fh / 2, z0 - 0.02));

    // ---- recessed windows: reveal jambs, sill, lintel, grille / curtain
    const revealZ = z0 - 0.02;       // back of the reveal
    const winW = (o) => (o.x1 - o.x0), winH = (o) => (o.y1 - o.y0);
    const w2x = (o) => (o.x0 - bx) + winW(o) / 2;   // local centre -> world x
    const w2y = (o) => baseY + o.y0 + winH(o) / 2;

    for (const [o, lit, grille] of [[winA, true, false], [winB, false, true]]) {
      const cxw = w2x(o), cyw = baseY + o.y0 + winH(o) / 2;
      const ww = winW(o), wh = winH(o);
      const grp = new THREE.Group(); g.add(grp);
      // jambs (deep reveal)
      grp.add(box(ww + 0.16, 0.1, 0.22, M.concreteDark, cxw, baseY + o.y1 + 0.05, z0 - 0.0));
      grp.add(box(ww + 0.16, 0.08, 0.22, M.concreteDark, cxw, baseY + o.y0 - 0.04, z0 - 0.0));
      grp.add(box(0.1, wh + 0.16, 0.22, M.concreteDark, cxw - ww / 2 - 0.05, cyw, z0 - 0.02));
      grp.add(box(0.1, wh + 0.16, 0.22, M.concreteDark, cxw + ww / 2 + 0.05, cyw, z0 - 0.02));
      // inward reveal faces (catch light, sell the depth)
      for (const sgn of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.PlaneGeometry(0.2, wh), M.concreteDark);
        jamb.position.set(cxw + sgn * ww / 2, cyw, z0 - 0.09);
        jamb.rotation.y = sgn * Math.PI / 2; grp.add(jamb);
      }
      // the lit opening is the apartment's own sash, seen through the reveal:
      // no second frame or glass here, or the two frames read as a misalignment
      if (!lit) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.04, wh - 0.04),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.036, 0.045) }));
        pane.position.set(cxw, cyw, z0 - 0.15); grp.add(pane);
        // wooden sash + mullion for the dark window
        for (const s2 of [-1, 1]) {
          grp.add(box(0.07, wh, 0.1, M.woodDark, cxw + s2 * ww / 2, cyw, z0 - 0.06));
          grp.add(box(ww, 0.07, 0.1, M.woodDark, cxw, cyw + s2 * wh / 2, z0 - 0.06));
        }
        grp.add(box(0.05, wh, 0.09, M.woodDark, cxw, cyw, z0 - 0.06));
      }
      // projecting sill with drip groove
      grp.add(box(ww + 0.28, 0.075, 0.26, M.concreteDark, cxw, baseY + o.y0 - 0.09, z0 + 0.06));
      grp.add(box(ww + 0.24, 0.03, 0.06, M.concreteDark, cxw, baseY + o.y0 - 0.135, z0 + 0.16));
      // bars / grille on the dark window
      if (grille) {
        for (let i = 0; i < 5; i++) {
          grp.add(cyl(0.012, 0.012, wh - 0.02, M.metalRust, 6).translateX(cxw - ww / 2 + 0.06 + i * (ww - 0.12) / 4).translateY(cyw).translateZ(z0 + 0.035));
        }
        grp.add(box(ww, 0.012, 0.012, M.metalRust, cxw, cyw + 0.18, z0 + 0.035));
        grp.add(box(ww, 0.012, 0.012, M.metalRust, cxw, cyw - 0.18, z0 + 0.035));
      }
    }

    // ---- shopfront fascia + canopy + neon line
    // (the fascia board here duplicated the shop's own window-frame rail and z-fought with it)
    const canopy = box(bx * 2 - 0.2, 0.05, 0.42, M.corrugatedRust, 0, 4.12, z0 + 0.30);
    canopy.rotation.x = -0.2; g.add(canopy);
    for (const bxp of [-3.9, -1.3, 1.3, 3.9]) {
      const br = box(0.05, 0.46, 0.05, M.metalRust, bxp, 3.9, z0 + 0.34);
      br.rotation.x = 0.5; g.add(br);
      g.add(box(0.05, 0.05, 0.3, M.metalRust, bxp, 3.72, z0 + 0.16));
    }
    const neonTube = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.032, 0.032),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.3, 0.14) }));
    neonTube.position.set(0, 4.02, z0 + 0.46); g.add(neonTube);
    for (const s2 of [-1, 1]) {
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.24, 0.12) }));
      t2.position.set(s2 * 3.2, 4.02, z0 - 0.02); g.add(t2);
    }

    // ---- tiled wainscot + notices under the windows
    const wain = new THREE.Mesh(planeGeo(bx * 2 - 0.08, 1.02), M.tileWallDirty);
    wain.position.set(0, 3.86, z0 + 0.028); g.add(wain);
    g.add(box(bx * 2, 0.06, 0.13, M.concreteDark, 0, 4.38, z0 + 0.05));
    for (const [px2, py2, pw, ph, art] of [[-2.62, 3.95, 0.44, 0.6, T.art.notice], [-2.02, 3.9, 0.36, 0.5, T.art.talisman], [2.72, 3.96, 0.42, 0.56, T.art.poster_buddha]]) {
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: art, roughness: 1, transparent: true }));
      pm.position.set(px2, py2, z0 + 0.05); g.add(pm);
    }

    // ---- floor bands (projecting slabs) every storey
    for (const by of [6.58, 9.62]) {
      g.add(box(bx * 2 + 0.16, 0.16, 0.34, M.concreteDark, 0, by, z0 + 0.1));
      g.add(box(bx * 2 + 0.1, 0.05, 0.4, M.concreteDark, 0, by - 0.1, z0 + 0.12));
      // drip stains along the slab edge
      for (let i = 0; i < 5; i++) {
        const st = sticker('rust_streak', rand(0.25, 0.6), rand(0.5, 1.6), rand(0.2, 0.4));
        st.position.set(rand(-3.6, 3.6), by - 0.62, z0 + 0.035); g.add(st);
      }
    }

    // ---- services: conduit, junction boxes, cables, satellite dish
    g.add(cyl(0.024, 0.024, fh - 0.4, M.metalGalv, 6).translateX(-0.35).translateY(baseY + fh / 2 - 0.1).translateZ(z0 + 0.09));
    for (const jy of [5.1, 7.9]) {
      g.add(box(0.16, 0.22, 0.1, M.metalGalv, -0.35, jy, z0 + 0.1));
      g.add(box(0.1, 0.14, 0.02, M.blackMetal, -0.35, jy, z0 + 0.16));
    }
    g.add(cable([-4.0, 5.62, z0 + 0.12], [4.0, 5.72, z0 + 0.12], 0.22, 0.01));
    g.add(cable([-4.0, 7.35, z0 + 0.12], [4.0, 7.28, z0 + 0.12], 0.3, 0.008));
    g.add(cable([-0.3, 6.6, z0 + 0.12], [3.4, 8.2, z0 + 0.12], 0.16, 0.007));
    // satellite dish
    const dish = new THREE.Group(); dish.position.set(-3.25, 8.15, z0 + 0.28); g.add(dish);
    const dm = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.35), M.metalGalv);
    dm.rotation.x = Math.PI / 2; dm.rotation.z = -0.35; dish.add(dm);
    dish.add(cyl(0.02, 0.02, 0.5, M.metalRust, 6).translateY(-0.22));

    // ---- laundry: bamboo pole + mixed cloths
    for (const [lx, ly, lw] of [[-0.5, 7.3, 2.0], [2.3, 8.95, 1.5]]) {
      g.add(cyl(0.018, 0.018, lw + 0.3, M.woodRaw, 6).rotateZ(Math.PI / 2).translateX(lx).translateY(ly).translateZ(z0 + 0.3));
      for (const bxp of [-lw / 2 - 0.12, lw / 2 + 0.12]) g.add(box(0.03, 0.03, 0.3, M.metalRust, lx + bxp, ly, z0 + 0.15));
      const mats = [M.fabricCream, M.fabricBlue, M.fabricCream, M.fabricGreen];
      for (let i = 0; i < 4; i++) {
        const c = hangingCloth(rand(0.3, 0.62), rand(0.45, 0.85), mats[i % mats.length]);
        c.position.set(lx - lw / 2 + 0.18 + i * (lw / 4.2), ly - 0.04, z0 + 0.3);
        c.rotation.y = rand(-0.08, 0.08);
        g.add(c);
      }
    }

    // ---- AC units with drip pipes and stains
    for (const [ax, ay] of [[-2.95, 6.35], [2.5, 7.55]]) {
      const ac2 = acUnit(); ac2.position.set(ax, ay, z0 + 0.34); g.add(ac2);
      g.add(box(0.66, 0.06, 0.5, M.metalRust, ax, ay - 0.34, z0 + 0.3));
      g.add(cyl(0.014, 0.014, 1.5, M.rubber, 6).translateX(ax + 0.3).translateY(ay - 1.1).translateZ(z0 + 0.3));
      const st = sticker('rust_streak', 0.5, 2.4, 0.4);
      st.position.set(ax + 0.3, ay - 1.9, z0 + 0.036); g.add(st);
    }

    // ---- potted plants on the wide sill
    for (const [px3, pw] of [[0.86, 0.1], [1.32, 0.085], [2.42, 0.095]]) {
      g.add(cyl(pw, pw * 0.78, pw * 1.4, M.metalRust, 8).translateX(px3).translateY(4.49).translateZ(z0 + 0.13));
      for (let k = 0; k < 3; k++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(pw * (0.9 + k * 0.15), 9, 7), M.fabricGreen);
        leaf.position.set(px3 + (k - 1) * pw * 0.5, 4.52 + pw * (1.5 + k * 0.35), z0 + 0.13);
        leaf.scale.y = 0.75; g.add(leaf);
      }
    }

    // ---- patch repairs and water stains
    for (let i = 0; i < 7; i++) {
      const st = sticker('rust_streak', rand(0.2, 0.4), rand(0.9, 2.4), rand(0.22, 0.42));
      st.position.set(rand(-3.7, 3.7), rand(4.6, 10.2), z0 + 0.028); g.add(st);
    }
    for (let i = 0; i < 3; i++) {
      const st = sticker('stain', rand(0.9, 1.8), rand(1.0, 2.2), rand(0.18, 0.3));
      st.position.set(rand(-3.4, 3.4), rand(6.0, 10.4), z0 + 0.026); g.add(st);
    }

    // ---- rain grime: heavy band under the canopy, streaks under every sill
    for (let i = 0; i < 9; i++) {
      const st = sticker('stain', rand(0.4, 1.1), rand(0.25, 0.6), rand(0.35, 0.55));
      st.position.set(rand(-3.8, 3.8), rand(3.62, 4.05), z0 + 0.03); g.add(st);
    }
    for (const [sx, sy, sw, sh] of [[1.5, 4.28, 2.6, 0.35], [-1.75, 4.6, 1.6, 0.3], [2.0, 5.55, 1.1, 1.5]]) {
      const st = sticker('stain', sw, sh, 0.4); st.position.set(sx, sy, z0 + 0.031); g.add(st);
    }

    // ---- wall washers: one over the sign, one mid-storey
    W.addLight('alley', (() => {
      const l = new THREE.PointLight(0xffa868, 16, 7.5, 2);
      l.position.set(0.55, 3.95, z0 + 0.5); return l;
    })(), { keep: true });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.09, 12, 1, true), M.metalDark);
    shade.position.set(0.55, 4.02, z0 + 0.44); g.add(shade);
    W.addLight('alley', (() => {
      const l = new THREE.PointLight(0xffb070, 11, 7, 2);
      l.position.set(-2.2, 6.95, z0 + 0.5); return l;
    })(), { keep: true });
    const shade2 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.085, 0.08, 12, 1, true), M.metalDark);
    shade2.position.set(-2.2, 7.1, z0 + 0.4); g.add(shade2);

    // roof lip so the top edge is not a razor line
    g.add(box(bx * 2 + 0.3, 0.28, 0.36, M.concreteDark, 0, topY + 0.04, z0 + 0.02));
  }

  // ---------------------------------------------------------------- facade detail
  // skirting / painted wainscot along both blocks
  for (const [sx, ex] of [[x0 + 0.05, -4.02], [4.02, x1 - 0.05]]) {
    const w = ex - sx, cx0 = (sx + ex) / 2;
    const skirt = box(w, 0.92, 0.09, M.plasterGreen, cx0, 0.46, z0 + 0.055);
    skirt.material = skirt.material.clone(); skirt.material.color.setHex(0x4e5a48);
    g.add(skirt);
    g.add(box(w, 0.05, 0.13, M.concreteDark, cx0, 0.94, z0 + 0.06));
    g.add(box(w, 0.09, 0.14, M.concreteDark, cx0, 0.045, z0 + 0.06));
  }
  // downpipes + brackets
  for (const px of [x0 + 0.35, -4.35, 4.35, x1 - 0.35]) {
    const pipe = cyl(0.055, 0.055, 9.0, M.metalRust, 8);
    pipe.position.set(px, 4.5, z0 + 0.16); g.add(pipe);
    for (let y = 0.9; y < 8.4; y += 2.4) {
      const br = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 8), M.metalDark);
      br.rotation.x = Math.PI / 2; br.position.set(px, y, z0 + 0.16); g.add(br);
    }
    g.add(cyl(0.075, 0.075, 0.12, M.metalRust, 8).translateY(0.06).translateX(px).translateZ(z0 + 0.16));
  }
  // meter boxes, junction boxes and conduit
  for (const [mx, my, mw, mh] of [[-7.9, 1.9, 0.42, 0.55], [-4.55, 2.2, 0.3, 0.4], [4.55, 2.15, 0.34, 0.46], [7.9, 1.95, 0.4, 0.52]]) {
    g.add(box(mw, mh, 0.16, M.metalGalv, mx, my, z0 + 0.12));
    g.add(box(mw * 0.7, mh * 0.5, 0.02, M.blackMetal, mx, my, z0 + 0.205));
    g.add(cyl(0.018, 0.018, 1.6, M.metalGalv, 6).translateX(mx).translateY(my - 1.1).translateZ(z0 + 0.12));
  }
  // recessed doorways with steps and a dim lamp
  for (const [dx, lit] of [[-6.3, true], [6.5, false]]) {
    const rec = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.15), new THREE.MeshBasicMaterial({ color: lit ? 0x241a10 : 0x0a0a0a }));
    rec.position.set(dx, 1.08, z0 + 0.02); g.add(rec);
    g.add(box(1.16, 0.12, 0.16, M.concreteDark, dx, 2.22, z0 + 0.1));
    for (const s2 of [-1, 1]) g.add(box(0.1, 2.2, 0.16, M.concreteDark, dx + s2 * 0.56, 1.1, z0 + 0.1));
    g.add(box(1.16, 0.15, 0.5, M.concreteDark, dx, 0.075, z0 + 0.28));
    g.add(box(1.02, 2.05, 0.06, M.woodDark, dx, 1.05, z0 + 0.18));
    if (lit) {
      const lamp = bulbLamp({ cord: 0.1, shade: false }); lamp.position.set(dx, 2.35, z0 + 0.3); g.add(lamp);
      W.addLight('alley', (() => { const l = new THREE.PointLight(0xffb070, 6, 4, 2); l.position.set(dx, 2.15, z0 + 0.45); return l; })());
    }
  }
  // posters, notices and graffiti at eye level
  for (const [px, py, nm, pw, ph, rot] of [
    [-7.6, 1.55, 'notice', 0.34, 0.46, 0.03], [-4.75, 1.7, 'calendar', 0.3, 0.42, -0.04],
    [4.7, 1.6, 'price_board', 0.34, 0.48, 0.02], [7.5, 1.5, 'notice', 0.3, 0.4, -0.03],
    [-5.6, 1.9, 'meridian', 0.4, 0.56, 0.01], [6.9, 1.85, 'poster_buddha', 0.36, 0.5, 0.04],
  ]) {
    const po = poster(nm, pw, ph, { tint: 0xc8bda6 });
    po.position.set(px, py, z0 + 0.1); po.rotation.z = rot; g.add(po);
  }
  for (let i = 0; i < 6; i++) {
    const st = sticker('stain', rand(0.4, 0.9), rand(0.5, 1.2), rand(0.2, 0.4));
    st.position.set(rand(x0 + 0.4, x1 - 0.4), rand(0.3, 2.4), z0 + 0.07);
    st.rotation.z = rand(0, 6); g.add(st);
  }

  // balconies + laundry on the left block
  for (const [bx, by, bw] of [[-7.0, 3.6, 1.6], [-5.2, 3.6, 1.4]]) {
    g.add(box(bw, 0.08, 0.75, M.concreteDark, bx, by, z0 + 0.38));
    for (let i = 0; i < 6; i++) g.add(box(0.02, 0.85, 0.02, M.metalRust, bx - bw / 2 + i * bw / 5, by + 0.44, z0 + 0.72));
    g.add(box(bw, 0.03, 0.03, M.metalRust, bx, by + 0.87, z0 + 0.72));
    for (let i = 0; i < 2; i++) {
      const cl = hangingCloth(0.34, 0.55, i ? M.fabricCream : M.fabricBlue);
      cl.position.set(bx - 0.5 + i * 0.6, by - 0.32, z0 + 0.4); cl.rotation.y = rand(-0.1, 0.1); g.add(cl);
    }
  }

  // ---------------------------------------------------------------- opposite building
  const opp = new THREE.Mesh(planeGeo(x1 - x0, 10), M.corrugated);
  opp.position.set(0, 7, z1); opp.rotation.y = Math.PI; opp.receiveShadow = true; g.add(opp);
  const oppBase = new THREE.Mesh(planeGeo(x1 - x0, 2.0), M.concreteWet);
  oppBase.position.set(0, 1.0, z1 - 0.01); oppBase.rotation.y = Math.PI; oppBase.receiveShadow = true; g.add(oppBase);
  W.colliders.push({ minX: x0, maxX: x1, minZ: z1 - 0.1, maxZ: z1 + 0.4, minY: 0, maxY: 12, enabled: true });

  // lit windows on the opposite side (warm + TV blue)
  const lit = [
    [-6.6, 2.3, z1 - 0.06, 1.2, 1.6, 0xffb060, 1.5], [-3.4, 5.6, z1 - 0.06, 1.2, 1.6, 0xffc080, 0.8],
    [-0.2, 2.3, z1 - 0.06, 1.2, 1.6, 0x7f8f96, 0.42], [2.8, 5.6, z1 - 0.06, 1.2, 1.6, 0xffa050, 1.1],
    [5.6, 2.3, z1 - 0.06, 1.2, 1.6, 0xffb070, 0.5], [7.0, 5.6, z1 - 0.06, 1.0, 1.5, 0x9a9a90, 0.5],
  ];
  for (const [wx, wy, wz, ww, wh, col, inten] of lit) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ color: col }));
    pane.position.set(wx, wy, wz); pane.rotation.y = Math.PI;
    pane.material.color.multiplyScalar(inten * 0.75); g.add(pane);
    // window frame bars in front
    const fr = new THREE.Group(); fr.position.set(wx, wy, wz + 0.03); fr.rotation.y = Math.PI; g.add(fr);
    for (const s of [-1, 1]) fr.add(box(0.04, wh, 0.03, M.metalDark, s * ww / 2, 0, 0));
    for (const s of [-1, 1]) fr.add(box(ww, 0.04, 0.03, M.metalDark, 0, s * wh / 2, 0));
    fr.add(box(0.03, wh, 0.02, M.metalDark, 0, 0, 0));
    fr.add(box(ww + 0.16, 0.07, 0.16, M.concreteDark, 0, -wh / 2 - 0.06, -0.02));
    // curtain silhouette
    if (Math.random() < 0.6) {
      const cur = new THREE.Mesh(new THREE.PlaneGeometry(ww * 0.32, wh), new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 1 }));
      cur.position.set(wx - ww * 0.28, wy, wz - 0.04); cur.rotation.y = Math.PI; g.add(cur);
    }
  }
  // distant window at the end of the alley (depth cue)
  const farGlow = new THREE.PointLight(0xff9a50, 30, 14, 2);
  farGlow.position.set(-7.4, 3.2, 12.2); g.add(farGlow);
  const farPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.8, 0.4) }));
  farPlane.position.set(-7.4, 3.2, 13.96); farPlane.rotation.y = Math.PI; g.add(farPlane);

  // ---------------------------------------------------------------- clutter narrows the lane
  // dumpster
  const dump = new THREE.Group(); dump.position.set(-6.9, 0, 12.55); g.add(dump);
  dump.add(box(1.7, 0.95, 1.05, M.plasticGreen, 0, 0.55, 0));
  const lid = box(1.76, 0.06, 1.1, M.metalDark, 0, 1.05, -0.02); lid.rotation.x = -0.06; dump.add(lid);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), M.rubber);
    w.rotation.z = Math.PI / 2; w.position.set(sx * 0.7, 0.09, sz * 0.4); dump.add(w);
  }
  dump.add(box(0.06, 0.35, 0.5, M.metalRust, 0.86, 0.8, 0));
  W.colliders.push({ minX: -7.8, maxX: -6.0, minZ: 12.0, maxZ: 13.1, minY: 0, maxY: 1.1, enabled: true });
  // pallets + crates on the other side
  for (let i = 0; i < 4; i++) {
    const c = crate(rand(0.45, 0.6), rand(0.3, 0.4), rand(0.35, 0.5));
    c.position.set(6.4 + (i % 2) * 0.1, Math.floor(i / 2) * 0.38, 11.4 + (i % 2) * 0.55);
    c.rotation.y = rand(-0.2, 0.2); g.add(c);
  }
  const pallet = box(1.1, 0.12, 0.9, M.woodRaw, 6.2, 0.06, 12.6); g.add(pallet);
  W.colliders.push({ minX: 5.6, maxX: 7.1, minZ: 11.0, maxZ: 13.0, minY: 0, maxY: 0.9, enabled: true });
  // cardboard stack and a broken chair by the shop wall
  for (let i = 0; i < 5; i++) {
    const b = cardboardBox(rand(0.4, 0.6), rand(0.3, 0.42), rand(0.35, 0.5));
    b.position.set(-3.65 + (i % 2) * 0.12, Math.floor(i / 2) * 0.38, 6.55 + (i % 3) * 0.12);
    b.rotation.y = rand(-0.3, 0.3); g.add(b);
  }
  const chair = woodenChair(); chair.position.set(4.55, 0, 12.2); chair.rotation.y = 1.2; chair.rotation.z = 0.12; g.add(chair);
  // gas cylinders and buckets
  for (const [gx, gz] of [[-4.4, 13.2], [-4.0, 13.35], [3.9, 13.15]]) {
    const gas = new THREE.Group(); gas.position.set(gx, 0, gz); g.add(gas);
    gas.add(cyl(0.17, 0.17, 0.55, M.metalRust, 14).translateY(0.275));
    gas.add(cyl(0.08, 0.08, 0.08, M.metalDark, 10).translateY(0.58));
  }
  const bkt3 = bucket(0.17, 0.3, M.plasticBlue); bkt3.position.set(-5.2, 0, 6.6); g.add(bkt3);
  const mo2 = mop(); mo2.position.set(5.1, 0, 6.5); mo2.rotation.z = 0.3; g.add(mo2);

  // ---------------------------------------------------------------- overhead structures
  // corrugated canopy over the right side of the lane
  const canopy = new THREE.Group(); g.add(canopy);
  canopy.add(box(3.0, 0.07, 2.2, M.corrugatedRust, 5.9, 3.15, 8.0));
  canopy.add(box(3.06, 0.06, 0.14, M.metalRust, 5.9, 3.18, 6.95));
  for (const xx of [4.6, 7.2]) {
    canopy.add(cyl(0.05, 0.05, 0.5, M.metalRust, 8).translateX(xx).translateY(2.9).translateZ(6.98));
  }
  canopy.add(box(0.1, 0.55, 2.2, M.metalRust, 4.42, 3.4, 8.0));
  // junk on top of the canopy
  for (let i = 0; i < 3; i++) {
    const c = crate(rand(0.35, 0.5), rand(0.22, 0.32), rand(0.3, 0.4));
    c.position.set(4.9 + i * 0.7, 3.19, 7.4 + (i % 2) * 0.9); c.rotation.y = i; canopy.add(c);
  }

  // ---------------------------------------------------------------- closed ends
  // both ends are building walls with locked metal gates; the yard is a dead end
  for (const s of [-1, 1]) {
    const wx = s > 0 ? x1 : x0;
    const ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    const mat = M.concreteWet;
    const cap = new THREE.Mesh(planeGeo(z1 - z0, 12), mat);
    cap.rotation.y = ry; cap.position.set(wx, 6, (z0 + z1) / 2); cap.receiveShadow = true; g.add(cap);
    // dark recess behind a gate
    const recess = new THREE.Mesh(planeGeo(2.6, 2.9), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    recess.rotation.y = ry; recess.position.set(wx - s * 0.02, 1.45, 6.9); g.add(recess);
    // gate: frame + vertical bars + diagonal brace
    const gate = new THREE.Group(); gate.position.set(wx - s * 0.06, 0, 6.9); gate.rotation.y = ry; g.add(gate);
    for (const gx of [-1.25, 1.25]) gate.add(box(0.09, 2.9, 0.09, M.metalRust, gx, 1.45, 0));
    for (const gy of [0.06, 2.85]) gate.add(box(2.6, 0.09, 0.09, M.metalRust, 0, gy, 0));
    for (let i = 0; i < 9; i++) gate.add(box(0.035, 2.8, 0.035, M.metalRust, -1.08 + i * 0.27, 1.45, 0.01));
    const brace = box(3.4, 0.05, 0.04, M.metalRust, 0, 1.45, 0.02); brace.rotation.z = 0.72; gate.add(brace);
    // lock + chain
    gate.add(box(0.12, 0.16, 0.08, M.metalDark, 0.1, 1.25, 0.06));
    // lintel + number plate + lamp
    gate.add(box(2.9, 0.22, 0.2, M.concrete, 0, 3.0, 0));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshBasicMaterial({ color: 0x9aa0a0 }));
    plate.position.set(0, 3.0, 0.11); gate.add(plate);
    const lampM = bulbLamp({ cord: 0.16, shade: false });
    lampM.position.set(wx - s * 0.42, 3.25, 6.9); g.add(lampM);
    W.addLight('alley', (() => {
      const l = new THREE.PointLight(0xffb070, 9, 5, 2);
      l.position.set(wx - s * 0.55, 3.05, 6.9); return l;
    })());
    // brick surround / pilasters
    for (const zz of [5.35, 8.45]) {
      g.add(box(0.35, 3.4, 0.35, M.concrete, wx - s * 0.18, 1.7, zz));
    }
    g.add(box(0.35, 0.3, 7.2, M.concrete, wx - s * 0.18, 3.5, 6.9));
    // barred windows on the end wall
    for (const [wy, wz, ww, wh] of [[3.5, 8.5, 1.1, 1.35], [6.3, 10.6, 1.0, 1.25], [3.4, 11.9, 1.0, 1.3]]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh),
        new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.35, metalness: 0.2 }));
      pane.rotation.y = ry; pane.position.set(wx - s * 0.03, wy, wz); g.add(pane);
      const fr = new THREE.Group(); fr.position.set(wx - s * 0.06, wy, wz); fr.rotation.y = ry; g.add(fr);
      for (const s2 of [-1, 1]) fr.add(box(0.05, wh + 0.08, 0.05, M.metalRust, s2 * ww / 2, 0, 0));
      for (const s2 of [-1, 1]) fr.add(box(ww + 0.08, 0.05, 0.05, M.metalRust, 0, s2 * wh / 2, 0));
      for (let i = 0; i < 3; i++) fr.add(box(0.02, wh, 0.02, M.metalDark, -ww / 3 + i * ww / 3, 0, 0.02));
    }
    // faded painted advert
    const adv = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x6a2a20, roughness: 1 }));
    adv.rotation.y = ry; adv.position.set(wx - s * 0.05, 2.1, 10.4);
    adv.material.transparent = true; adv.material.opacity = 0.55; g.add(adv);
    const advT = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.42), new THREE.MeshBasicMaterial({ map: T.art.shop_sign, transparent: true, opacity: 0.35 }));
    advT.rotation.y = ry; advT.position.set(wx - s * 0.07, 2.2, 10.4); g.add(advT);
    // AC + pipe on the end wall
    const ac = acUnit(); ac.position.set(wx - s * 0.35, 5.4, 12.6); ac.rotation.y = ry; g.add(ac);
    g.add(cyl(0.05, 0.05, 9.0, M.metalRust, 8).translateX(wx - s * 0.18).translateY(4.5).translateZ(12.95));

    // stacked crates and a bin by the gate
    for (let i = 0; i < 3; i++) {
      const c = crate(0.5, 0.34, 0.42); c.position.set(wx - s * 0.45, i * 0.34, 8.2);
      c.rotation.y = 0.12 * i; g.add(c);
    }
    const bin = trashBag(); bin.position.set(wx - s * 0.55, 0, 5.7); g.add(bin);
    W.colliders.push({ minX: Math.min(wx, wx - s * 0.5), maxX: Math.max(wx, wx - s * 0.5), minZ: z0, maxZ: z1, minY: 0, maxY: 12, enabled: true });
  }
  // alley ceiling / sky glow plane high above (rain stops visually)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 8), new THREE.MeshBasicMaterial({ color: 0x0a0d12 }));
  sky.rotation.x = Math.PI / 2; sky.position.set(0, 11.8, 10); g.add(sky);

  // ---------------------------------------------------------------- shop facade extras (awning, meter box)

  // ---------------------------------------------------------------- street props
  const bike = bicycle(); bike.position.set(-6.1, 0, 6.45); bike.rotation.y = 0.08; bike.rotation.z = -0.06; g.add(bike);
  const bike2 = bicycle(); bike2.position.set(7.9, 0, 6.5); bike2.rotation.y = -0.1; bike2.rotation.z = 0.05; g.add(bike2);

  for (let i = 0; i < 4; i++) {
    const t = trashBag(); t.position.set(5.2 + i * 0.45, 0, 6.5 + (i % 2) * 0.2); t.rotation.y = rand(0, 6); g.add(t);
  }
  const cr1 = crate(0.62, 0.42, 0.5); cr1.position.set(-3.2, 0, 6.55); cr1.rotation.y = 0.2; g.add(cr1);
  const cr2 = crate(0.55, 0.36, 0.45); cr2.position.set(-3.15, 0.42, 6.55); cr2.rotation.y = -0.1; g.add(cr2);
  const cb = cardboardBox(0.5, 0.4, 0.42); cb.position.set(4.4, 0, 6.6); cb.rotation.y = -0.2; g.add(cb);
  const cb2 = cardboardBox(0.45, 0.35, 0.4); cb2.position.set(4.45, 0.4, 6.62); cb2.rotation.y = 0.1; g.add(cb2);
  const bkt = bucket(0.18, 0.32, M.plasticBlue); bkt.position.set(-2.2, 0, 7.0); g.add(bkt);
  const bkt2 = bucket(0.17, 0.3, M.plasticRed); bkt2.position.set(2.9, 0, 6.6); g.add(bkt2);
  const mo = mop(); mo.position.set(3.1, 0, 6.45); mo.rotation.z = 0.35; mo.rotation.y = 0.4; g.add(mo);
  const news = newspapers(6); news.position.set(-4.2, 0.01, 8.2); news.rotation.y = 0.3; g.add(news);
  // gas cylinder
  const gas = new THREE.Group(); gas.position.set(1.9, 0, 6.6); g.add(gas);
  gas.add(cyl(0.17, 0.17, 0.55, M.metalRust, 14).translateY(0.275));
  gas.add(cyl(0.08, 0.08, 0.08, M.metalDark, 10).translateY(0.58));
  gas.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 5, 12), M.metalDark).translateY(0.62));
  // ladder
  const lad = new THREE.Group(); lad.position.set(7.55, 0, 6.6); lad.rotation.z = 0.12; g.add(lad);
  for (const s of [-1, 1]) lad.add(box(0.04, 2.2, 0.05, M.woodRaw, s * 0.22, 1.1, 0));
  for (let i = 0; i < 6; i++) lad.add(box(0.48, 0.03, 0.04, M.woodRaw, 0, 0.3 + i * 0.33, 0));
  // potted plant
  const pot = new THREE.Group(); pot.position.set(-7.55, 0, 6.7); g.add(pot);
  pot.add(cyl(0.12, 0.09, 0.22, M.ceramicGreen, 12).translateY(0.11));
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.3), M.fabricGreen);
    leaf.position.y = 0.36 + i * 0.02; leaf.rotation.y = i * 1.3; leaf.rotation.z = 0.4 - i * 0.15; pot.add(leaf);
  }

  // ---------------------------------------------------------------- overhead wires
  for (let i = 0; i < 7; i++) {
    const zz = 6.8 + i * 1.0;
    const xx = rand(-12, 12);
    g.add(cable([xx - rand(4, 8), 6.4 + rand(0, 2.2), zz], [xx + rand(4, 8), 6.2 + rand(0, 2.4), zz + rand(-1, 1)], rand(0.3, 1.0), rand(0.006, 0.012)));
  }
  // drooping cable bundle down the shop wall
  for (let i = 0; i < 3; i++) {
    g.add(cable([-3.9 + i * 0.12, 4.2, 6.08], [-3.6 + i * 0.15, 2.1, 6.12], 0.15, 0.007));
  }

  // hanging sign for a neighbouring shop
  const sign2 = new THREE.Group(); sign2.position.set(-7.5, 3.2, 6.25); g.add(sign2);
  sign2.add(box(0.12, 1.0, 0.04, M.woodBlack, 0, 0, 0));


  // ---------------------------------------------------------------- lighting
  const neon = W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xff3a22, 22, 9, 2);
    l.position.set(3.05, 4.2, 6.9);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002;
    return l;
  })());
  W.flicker(neon, { min: 0.55, max: 1.25, speed: 2.6, pattern: 'neon' });

  const doorLight = W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xcfe0d0, 14, 6, 2);
    l.position.set(1.2, 2.35, 6.5); return l;
  })());
  W.flicker(doorLight, { min: 0.2, max: 1, speed: 1.1, pattern: 'tube' });

  const lampL = W.addLight('alley', (() => {
    const l = new THREE.PointLight(0x88b0b8, 10, 8, 2);
    l.position.set(-10.6, 4.0, 12.6); return l;
  })());
  // wall lamp fixture
  const arm = box(1.0, 0.05, 0.05, M.metalRust, -11.5, 4.0, 13.9); g.add(arm);
  const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 12, 1, true), M.metalRust);
  shadeM.rotation.x = Math.PI; shadeM.position.set(-11.0, 3.92, 13.9); g.add(shadeM);
  const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), M.bulb);
  lampBulb.position.set(-11.0, 3.86, 13.9); g.add(lampBulb);

  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffb070, 9, 6, 2);
    l.position.set(-5.0, 2.2, 6.5); return l;
  })());
  const porch = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.65, 0.4, 0.22) }));
  porch.position.set(-5.0, 2.2, 6.06); g.add(porch);

  // volumetric shafts
  W.volumetric({ x: -6.2, y: 3.3, z: 6.5, w: 0.5, h: 0.4, len: 2.6, color: 0xff4a30, intensity: 0.16, dir: new THREE.Vector3(0, -1, 0.1).normalize() });
  W.volumetric({ x: 1.2, y: 2.4, z: 6.35, w: 1.1, h: 2.0, len: 2.6, color: 0xbcd8c8, intensity: 0.4, dir: new THREE.Vector3(0, -1, 0.25).normalize() });
  W.volumetric({ x: -11.0, y: 3.8, z: 13.7, w: 0.6, h: 0.4, len: 4.0, color: 0x9fc0c8, intensity: 0.35, dir: new THREE.Vector3(0, -1, -0.4).normalize() });

  // left-wall cage lamp
  const wallLamp = new THREE.Group(); wallLamp.position.set(-5.4, 3.35, z0 + 0.12); g.add(wallLamp);
  wallLamp.add(box(0.06, 0.06, 0.5, M.metalRust, 0, 0, 0.22));
  const shade2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 14, 1, true), M.metalRust);
  shade2.rotation.x = Math.PI; shade2.position.set(0, -0.04, 0.42); wallLamp.add(shade2);
  const lb2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.bulb);
  lb2.position.set(0, -0.1, 0.42); wallLamp.add(lb2);
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0xffb070, 16, 7.5, 2);
    l.position.set(-5.4, 3.05, z0 + 0.55); return l;
  })());
  // cold spill from the opposite building, gives the yard a second colour
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0x7f9fb8, 9, 9, 2);
    l.position.set(0.5, 4.6, 13.2); return l;
  })());

  // ambient street fill
  W.addLight('alley', (() => {
    const l = new THREE.PointLight(0x1a2a34, 8, 16, 2);
    l.position.set(0, 8, 10); return l;
  })());

  // rain emitter handled by fx (world.rain)
  W.rainZone = { x0, x1, z0, z1, top: 12 };

  W.room('alley', { x0, x1, z0, z1, y0: 0 });
  W.onEnter('alley', () => W.audio?.setAmbience('alley'));
  W.onEnter('alley', () => W.hud.room('深水埗 · 後巷'));

  return { floor };
}
