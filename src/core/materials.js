import * as THREE from 'three';
import { T } from './textures.js';

export const M = {};

function std(setName, {
  color = 0xffffff, roughness = 1, metalness = 0, normalScale = 1,
  repeat = 1, env = 0.35, side = THREE.FrontSide, transparent = false, opacity = 1, tileMul = 1,
} = {}) {
  const s = T.sets[setName];
  const m = new THREE.MeshStandardMaterial({
    color, roughness, metalness, side, transparent, opacity,
    envMapIntensity: env,
    map: s ? s.map : null,
    roughnessMap: s ? s.rough : null,
    normalMap: s ? s.normal : null,
  });
  if (m.normalMap) {
    m.normalMap = m.normalMap.clone();
    m.normalMap.needsUpdate = true;
    m.normalMap.repeat.set(repeat / (s.tile), repeat / (s.tile));
    m.normalScale.set(normalScale, normalScale);
  }
  if (m.map && repeat !== 1) {
    m.map = m.map.clone(); m.map.needsUpdate = true;
    m.map.repeat.set(repeat / s.tile, repeat / s.tile);
  }
  if (tileMul !== 1) {
    if (m.map) { m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.multiplyScalar(tileMul); }
    if (m.normalMap) m.normalMap.repeat.multiplyScalar(tileMul);
    if (m.roughnessMap) { m.roughnessMap = m.roughnessMap.clone(); m.roughnessMap.needsUpdate = true; m.roughnessMap.repeat.multiplyScalar(tileMul); }
  }
  return m;
}

const solid = (color, roughness = 0.8, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.3, ...extra });

export function buildMaterials() {
  // ---------------- architecture
  M.concrete = std('concrete_wall_007', { color: 0x8d8a80, normalScale: 1.0, env: 0.3, tileMul: 1.5 });
  M.concreteDark = std('concrete_wall_007', { color: 0x4c4a44, normalScale: 1.1, env: 0.25, tileMul: 1.5 });
  M.concreteWet = std('concrete_wall_007', { color: 0x5c5b52, normalScale: 1.2, env: 0.5 });
  M.wallPeel = std('peeling_painted_wall', { color: 0xaea994, roughness: 0.95, normalScale: 1.0, env: 0.2, tileMul: 1.35 });
  M.wallPeelGreen = std('peeling_painted_wall', { color: 0x93a084, roughness: 0.95, normalScale: 1.0, env: 0.2, tileMul: 1.35 });
  M.wallPeelWarm = std('peeling_painted_wall', { color: 0xb6a68e, roughness: 0.95, normalScale: 1.0, env: 0.2, tileMul: 1.35 });
  M.plaster = std('damaged_plaster', { color: 0xa89c88, normalScale: 1.0, env: 0.25, tileMul: 1.7 });
  M.plasterGreen = std('damaged_plaster', { color: 0x7c8a74, normalScale: 1.0, env: 0.25, tileMul: 1.7 });
  M.plasterPink = std('peeling_painted_wall', { color: 0xa89286, normalScale: 1.1, env: 0.25, tileMul: 1.6 });
  M.plasterCream = std('damaged_plaster', { color: 0xb8ab93, normalScale: 0.9, env: 0.25, tileMul: 1.6 });
  M.plasterDirty = std('damaged_plaster', { color: 0x7d7568, normalScale: 1.0, env: 0.25, tileMul: 1.7 });
  M.ceiling = std('ceiling_interior', { color: 0x8a8274, normalScale: 1.0, env: 0.2, tileMul: 1.6 });
  M.ceilingDirty = std('ceiling_interior', { color: 0x837a6c, normalScale: 1.2, env: 0.2, tileMul: 1.6 });
  M.corrugated = std('worn_corrugated_iron', { color: 0x9a978c, normalScale: 1.3, metalness: 0.35, env: 0.55 });
  M.corrugatedRust = std('worn_corrugated_iron', { color: 0x8a6a4e, normalScale: 1.4, metalness: 0.3, env: 0.4 });
  M.shutter = std('painted_metal_shutter', { color: 0x7e8478, normalScale: 1.0, metalness: 0.35, env: 0.45 });
  M.shutterRed = std('painted_metal_shutter', { color: 0x8a3a30, normalScale: 1.0, metalness: 0.3, env: 0.45 });

  // ---------------- floors
  M.floorChecker = std('checkered_pavement_tiles', { color: 0xbdb3a2, roughness: 0.45, normalScale: 1.0, env: 0.55, tileMul: 10 });
  M.floorMosaic = std('old_mosaic_floor', { color: 0x8f8779, roughness: 0.9, normalScale: 1.0, env: 0.5 });
  M.floorWood = std('dark_wooden_planks', { color: 0xa08767, roughness: 0.8, normalScale: 1.0, env: 0.35 });
  M.floorWoodDark = std('dark_wooden_planks', { color: 0x5f4a37, roughness: 0.75, normalScale: 1.0, env: 0.35 });
  M.floorConcrete = std('concrete_floor_damaged_01', { color: 0x8b877c, roughness: 0.8, normalScale: 1.1, env: 0.3, tileMul: 1.6 });
  M.floorTerrazzo = std('terrazzo_tiles', { color: 0x9a9084, roughness: 0.55, normalScale: 1.0, env: 0.45, tileMul: 2 });
  M.floorBath = std('dirty_tiles', { color: 0x9aa08e, roughness: 0.35, normalScale: 1.0, env: 0.7, tileMul: 3 });
  M.floorAsphalt = std('asphalt_05', { color: 0x8e8f8a, roughness: 0.4, normalScale: 1.2, env: 0.5, tileMul: 1.8 });
  M.tileWallBlue = std('blue_floor_tiles_01', { color: 0x9fae9c, roughness: 0.4, normalScale: 1.0, env: 0.6, tileMul: 3 });
  M.tileWallDirty = std('dirty_tiles', { color: 0xc2c4b0, roughness: 0.38, normalScale: 1.0, env: 0.7, tileMul: 2.2 });

  // ---------------- wood / joinery
  M.woodDark = std('dark_paneled_wood', { color: 0x9a7648, roughness: 0.72, normalScale: 0.9, env: 0.3 });
  M.woodBlack = std('dark_paneled_wood', { color: 0x5c4730, roughness: 0.68, normalScale: 0.9, env: 0.3 });
  M.woodRed = std('dark_paneled_wood', { color: 0x7a3527, roughness: 0.6, normalScale: 0.9, env: 0.35 });
  M.woodFloorMat = std('dark_wooden_planks', { color: 0x8b6a45, roughness: 0.75, normalScale: 1.0, env: 0.3 });
  M.woodRaw = std('dark_wooden_planks', { color: 0xa08462, roughness: 0.9, normalScale: 1.1, env: 0.25 });

  // ---------------- doors & window joinery (kept separate from furniture timber)
  // the panel texture is re-used everywhere, so the variation comes from UV density, gloss and
  // how flat the relief is: lacquered front doors, waxed inner doors, painted bathroom door,
  // and painted casings instead of raw timber
  // door leaves use the plank set, not the panelled set: the latter is a picture of many
  // small panels and tiled it turned every door into a dark grid. Relief comes from the
  // stepped inset geometry instead.
  M.doorEntrance = std('dark_wooden_planks', { color: 0xb04a35, roughness: 0.36, normalScale: 0.45, env: 0.7 });
  M.doorInner = std('dark_wooden_planks', { color: 0x96683c, roughness: 0.62, normalScale: 0.65, env: 0.35 });
  M.doorBath = std('dark_wooden_planks', { color: 0xc6cec1, roughness: 0.76, normalScale: 0.15, env: 0.2 });
  M.doorInset = std('dark_wooden_planks', { color: 0x6b4c2f, roughness: 0.64, normalScale: 0.4, env: 0.3 });
  M.framePaint = std('dark_paneled_wood', { color: 0xcec6b4, roughness: 0.86, normalScale: 0.18, env: 0.14, tileMul: 2.7 });
  M.framePaintGreen = std('dark_paneled_wood', { color: 0x8c988a, roughness: 0.86, normalScale: 0.18, env: 0.14, tileMul: 2.7 });

  // ---------------- B: shop joinery (herb cabinets / counter / structure)
  M.cabRosewood = std('dark_wooden_planks', { color: 0x5a2418, roughness: 0.55, normalScale: 0.45, env: 0.45, tileMul: 1.5 });
  M.cabDrawer = std('dark_wooden_planks', { color: 0xa46944, roughness: 0.48, normalScale: 0.35, env: 0.5, tileMul: 2.3 });
  M.counterTop = std('dark_paneled_wood', { color: 0x33403a, roughness: 0.32, normalScale: 0.15, env: 0.6, tileMul: 3.0 });
  M.counterBody = std('dark_paneled_wood', { color: 0x40503f, roughness: 0.68, normalScale: 0.35, env: 0.25, tileMul: 2.0 });
  M.beamRough = std('dark_wooden_planks', { color: 0x7d5a38, roughness: 0.93, normalScale: 1.25, env: 0.12, tileMul: 1.15 });
  M.signBack = std('painted_metal_shutter', { color: 0x3f4a44, roughness: 0.62, metalness: 0.3, env: 0.35, normalScale: 0.6 });

  // ---------------- C: furniture by family
  M.woodSeat = std('dark_wooden_planks', { color: 0xb08a5a, roughness: 0.74, normalScale: 1.0, env: 0.3, tileMul: 1.9 });
  M.woodTable = std('dark_wooden_planks', { color: 0x7d4b2c, roughness: 0.58, normalScale: 0.75, env: 0.38, tileMul: 1.1 });
  M.wardrobeBody = std('dark_paneled_wood', { color: 0x714c2f, roughness: 0.72, normalScale: 0.55, env: 0.28, tileMul: 1.1 });
  M.wardrobeDoor = std('dark_wooden_planks', { color: 0x8d6c49, roughness: 0.58, normalScale: 0.5, env: 0.42, tileMul: 1.2 });
  M.bedTimber = std('dark_wooden_planks', { color: 0x593c26, roughness: 0.72, normalScale: 0.7, env: 0.22, tileMul: 1.3 });
  M.plyLight = std('dark_wooden_planks', { color: 0xb59367, roughness: 0.82, normalScale: 0.55, env: 0.18, tileMul: 2.5 });
  M.laminateDark = std('dark_paneled_wood', { color: 0x3b423b, roughness: 0.42, normalScale: 0.18, env: 0.42, tileMul: 2.6 });

  // ---------------- D: shrine lacquer
  M.shrineRed = std('dark_wooden_planks', { color: 0xa23324, roughness: 0.30, normalScale: 0.28, env: 0.7, tileMul: 1.35 });
  M.shrineDark = std('dark_wooden_planks', { color: 0x61211a, roughness: 0.38, normalScale: 0.32, env: 0.55, tileMul: 1.9 });

  // ---------------- E: floors & rough timber
  M.floorApt = std('dark_wooden_planks', { color: 0xab8a5f, roughness: 0.8, normalScale: 0.9, env: 0.28, tileMul: 1.7 });
  M.cratePine = std('dark_wooden_planks', { color: 0xa88a62, roughness: 0.9, normalScale: 1.1, env: 0.15, tileMul: 1.6 });

  // ---------------- metals
  M.metalRust = std('rusty_metal_02', { color: 0x8c6a4e, roughness: 0.85, metalness: 0.55, normalScale: 1.2, env: 0.6 });
  M.metalGalv = std('rusty_painted_metal', { color: 0x9aa0a0, roughness: 0.6, metalness: 0.65, normalScale: 1.0, env: 0.8 });
  M.metalDark = std('rusty_metal_02', { color: 0x3a3a38, roughness: 0.55, metalness: 0.7, normalScale: 1.0, env: 0.7 });
  M.pipeRed = solid(0x6d2f26, 0.62, 0.35);
  M.pipeGreen = solid(0x3e4a40, 0.6, 0.4);
  M.brass = solid(0xb08a4a, 0.35, 0.95);
  M.copper = solid(0x8a5a3a, 0.45, 0.9);
  M.steel = solid(0x9a9a96, 0.35, 1.0);
  M.blackMetal = solid(0x1c1b19, 0.5, 0.6);

  // ---------------- soft goods
  M.fabricRed = std('dirty_carpet', { color: 0x8e3b30, roughness: 1, normalScale: 1.2, env: 0.15 });
  M.fabricCream = std('dirty_carpet', { color: 0xb9ac93, roughness: 1, normalScale: 1.1, env: 0.15 });
  M.fabricGreen = std('dirty_carpet', { color: 0x5d6a52, roughness: 1, normalScale: 1.1, env: 0.15 });
  M.fabricBlue = std('dirty_carpet', { color: 0x3f4a58, roughness: 1, normalScale: 1.1, env: 0.15 });
  M.carpetRed = std('dirty_carpet', { color: 0x6e2a22, roughness: 1, normalScale: 1.4, env: 0.1 });
  M.leather = std('dirty_carpet', { color: 0x4a3324, roughness: 0.55, normalScale: 0.6, env: 0.35 });
  M.curtain = std('dirty_carpet', { color: 0x8c6a2e, roughness: 1, normalScale: 0.8, env: 0.1, side: THREE.DoubleSide });

  // ---------------- misc surfaces
  M.paper = std('damaged_plaster', { color: 0xcfc3a6, roughness: 1, normalScale: 0.4, env: 0.1 });
  M.cardboard = std('damaged_plaster', { color: 0x9a7c54, roughness: 1, normalScale: 0.5, env: 0.1 });
  M.cardboardDark = std('damaged_plaster', { color: 0x6e583b, roughness: 1, normalScale: 0.5, env: 0.1 });
  M.plasticBlue = solid(0x2c4f68, 0.45, 0.05);
  M.plasticRed = solid(0x7d2a22, 0.45, 0.05);
  M.plasticGreen = solid(0x2f4a32, 0.5, 0.05);
  M.enamelWhite = std('dirty_tiles', { color: 0xcfcabb, roughness: 0.35, normalScale: 0.4, env: 0.5 });
  M.porcelain = solid(0xd8d2c2, 0.18, 0.0, { envMapIntensity: 0.8 });
  M.ceramicGreen = solid(0x6e7d68, 0.3, 0.0, { envMapIntensity: 0.7 });
  M.rubber = solid(0x1a1918, 0.9, 0.0);
  M.dirt = solid(0x4a4034, 1.0, 0.0);
  M.glass = new THREE.MeshStandardMaterial({
    color: 0x9fb0a8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.10,
    envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false,
  });
  M.glassJar = new THREE.MeshStandardMaterial({
    color: 0xb8c4b4, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.34,
    envMapIntensity: 1.0, side: THREE.DoubleSide, depthWrite: false,
  });
  M.mirror = new THREE.MeshStandardMaterial({ color: 0x8e9290, roughness: 0.05, metalness: 1.0, envMapIntensity: 1.4 });
  M.water = new THREE.MeshStandardMaterial({ color: 0x1a2324, roughness: 0.05, metalness: 0.25, envMapIntensity: 1.2 });

  // ---------------- light emitting
  M.bulb = new THREE.MeshStandardMaterial({ color: 0xffe6bd, emissive: 0xffd9a0, emissiveIntensity: 2.4, roughness: 0.3 });
  M.bulbRed = new THREE.MeshStandardMaterial({ color: 0xff6a4a, emissive: 0xff3a1c, emissiveIntensity: 7, roughness: 0.4 });
  M.tube = new THREE.MeshStandardMaterial({ color: 0xdfeae6, emissive: 0xcfe6df, emissiveIntensity: 2.6, roughness: 0.3 });
  M.tubeGreen = new THREE.MeshStandardMaterial({ color: 0xd6e4cf, emissive: 0xb8d8b0, emissiveIntensity: 4, roughness: 0.3 });
  M.tvGlow = new THREE.MeshStandardMaterial({ color: 0x7c8f8a, emissive: 0x6f8f88, emissiveIntensity: 3, roughness: 0.25 });
  M.candleWax = solid(0xd8cdb4, 0.7);
  M.incense = solid(0x6a4a32, 0.9);
  M.labelSheet = new THREE.MeshStandardMaterial({
    map: T.art.drawer_labels, roughness: 0.95, envMapIntensity: 0.1,
    color: 0xd8c9a8,
  });

  // ---------------- post / decals
  M.stain = new THREE.MeshBasicMaterial({
    map: T.art.stain, transparent: true, opacity: 0.75, depthWrite: false,
    blending: THREE.NormalBlending, toneMapped: false,
  });
  M.mold = new THREE.MeshBasicMaterial({
    map: T.art.mold, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false,
  });
  M.rustStreak = new THREE.MeshBasicMaterial({
    map: T.art.rust_streak, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false,
  });
  return M;
}

/** Lit poster/decal with a slight self-lift so it reads in dark corners. */
export function posterMat(name, { tint = 0xffffff, emissive = 0.06, opacity = 1 } = {}) {
  const t = T.art[name];
  const m = new THREE.MeshStandardMaterial({
    map: t, color: tint, roughness: 0.92, metalness: 0.0,
    transparent: opacity < 1, opacity,
    envMapIntensity: 0.08,
    emissive: new THREE.Color(0xffffff), emissiveMap: t, emissiveIntensity: emissive,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  return m;
}

export function decalMat(name, opacity = 1, tint = 0xffffff) {
  const t = T.art[name];
  return new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity, depthWrite: false, color: tint, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
