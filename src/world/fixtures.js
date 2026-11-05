import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, planeGeo } from '../core/util.js';

/**
 * Hinged door with an animated pivot, collider hand-off and interaction hook.
 * Panel faces +Z in local space; hinge at local x=-width/2.
 */
export function makeDoor(W, {
  x, y = 0, z, width = 0.95, height = 2.15, ry = 0,
  mat = M.doorInner, frameMat = M.framePaint, hinge = 'left', openAngle = 1.85,
  label = '推門', locked = false, lockedLabel = '鎖上', onOpen = null, thick = 0.045,
  knob = true, red = false,
} = {}) {
  const root = new THREE.Group();
  root.userData.dynamic = true;
  root.position.set(x, y, z);
  root.rotation.y = ry;
  const pivot = new THREE.Group();
  const dir = hinge === 'left' ? 1 : -1;
  pivot.position.x = dir * width / 2;
  root.add(pivot);

  const panelMat = red ? M.woodRed : mat;
  const panel = box(width, height, thick, panelMat, -dir * width / 2, height / 2, 0);
  pivot.add(panel);
  // recessed panels
  for (let i = 0; i < 2; i++) {
    const pw = width * 0.66, ph = height * 0.32;
    const inset = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.012), M.doorInset);
    inset.position.set(-dir * width / 2, height * (0.28 + i * 0.36), thick / 2 + 0.004);
    pivot.add(inset);
  }
  if (knob) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.brass);
    k.position.set(-dir * (width - 0.09), height * 0.46, thick / 2 + 0.03);
    pivot.add(k);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 12), M.brass);
    plate.rotation.x = Math.PI / 2;
    plate.position.copy(k.position).setZ(thick / 2 + 0.006);
    pivot.add(plate);
  }

  // frame (static, part of root)
  const fThick = 0.07;
  for (const s of [-1, 1]) {
    root.add(box(fThick, height + fThick, 0.14, frameMat, s * (width / 2 + fThick / 2 - 0.005), (height + fThick) / 2, 0));
  }
  root.add(box(width + fThick * 2, fThick, 0.14, frameMat, 0, height + fThick / 2, 0));

  const collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, minY: y, maxY: y + height, enabled: true };
  const hw = (Math.abs(Math.cos(ry)) * width + Math.abs(Math.sin(ry)) * 0.2) / 2 + 0.05;
  const hd = (Math.abs(Math.sin(ry)) * width + Math.abs(Math.cos(ry)) * 0.2) / 2 + 0.05;
  collider.minX = x - hw; collider.maxX = x + hw;
  collider.minZ = z - hd; collider.maxZ = z + hd;
  W.colliders.push(collider);

  let open = false, anim = 0, target = 0;
  const obj = {
    root, panel, collider, isOpen: () => open,
    setOpen(v, silent = false) {
      open = v; target = open ? openAngle * dir * (hinge === 'left' ? 1 : -1) : 0;
      collider.enabled = !open;
      if (!silent && W.audio) W.audio.doorCreak(open ? 1 : 0.7);
    },
  };
  W.interact(panel, {
    prompt: () => locked && !open ? lockedLabel : (open ? '關門' : label),
    range: 2.2,
    use: () => {
      if (locked && !open) { W.audio?.locked(); return; }
      obj.setOpen(!open);
      if (open && onOpen) onOpen(obj);
    },
  });
  W.animate((dt) => {
    if (Math.abs(anim - target) > 0.001) {
      anim += (target - anim) * (1 - Math.exp(-9 * dt));
      pivot.rotation.y = anim;
      W.markShadowDirty?.();
    }
  });
  return obj;
}

/** Window with frame, bars and glass; glass is a separate mesh for rain shader. */
export function makeWindow(W, {
  x, y, z, w = 1.2, h = 1.0, ry = 0, bars = 2, glassMat = M.glass, frameMat = M.woodDark, sill = true,
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry;
  const t = 0.05;
  g.add(box(w + t * 2, t, 0.1, frameMat, 0, h + t / 2, 0));
  g.add(box(w + t * 2, t, 0.1, frameMat, 0, -t / 2, 0));
  for (const s of [-1, 1]) g.add(box(t, h, 0.1, frameMat, s * (w / 2 + t / 2), h / 2, 0));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
  glass.position.z = -0.01; g.add(glass);
  for (let i = 0; i < bars; i++) {
    const bx = -w / 2 + (i + 0.5) * (w / bars);
    g.add(box(0.018, h, 0.018, M.metalDark, bx, h / 2, 0.03));
  }
  if (sill) g.add(box(w + 0.16, 0.05, 0.2, frameMat, 0, -0.045, 0.06));
  return { group: g, glass };
}
