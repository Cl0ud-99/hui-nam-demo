import { Color, DoubleSide, FrontSide, MeshBasicMaterial, MeshStandardMaterial, NormalBlending } from 'three';
import { T } from './textures.js';
export { M, buildMaterials, decalMat, posterMat };

var M = {};
function std(setName, {
  color = 16777215,
  roughness = 1,
  metalness = 0,
  normalScale = 1,
  repeat = 1,
  env = 0.35,
  side = FrontSide,
  transparent = false,
  opacity = 1,
  tileMul = 1
} = {}) {
  const s = T.sets[setName];
  const m = new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side,
    transparent,
    opacity,
    envMapIntensity: env,
    map: s ? s.map : null,
    roughnessMap: s ? s.rough : null,
    normalMap: s ? s.normal : null
  });
  if (m.normalMap) {
    m.normalMap = m.normalMap.clone();
    m.normalMap.needsUpdate = true;
    m.normalMap.repeat.set(repeat / s.tile, repeat / s.tile);
    m.normalScale.set(normalScale, normalScale);
  }
  if (m.map && repeat !== 1) {
    m.map = m.map.clone();
    m.map.needsUpdate = true;
    m.map.repeat.set(repeat / s.tile, repeat / s.tile);
  }
  if (tileMul !== 1) {
    if (m.map) {
      m.map = m.map.clone();
      m.map.needsUpdate = true;
      m.map.repeat.multiplyScalar(tileMul);
    }
    if (m.normalMap) m.normalMap.repeat.multiplyScalar(tileMul);
    if (m.roughnessMap) {
      m.roughnessMap = m.roughnessMap.clone();
      m.roughnessMap.needsUpdate = true;
      m.roughnessMap.repeat.multiplyScalar(tileMul);
    }
  }
  return m;
}
var solid = (color, roughness = 0.8, metalness = 0, extra = {}) => new MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.3, ...extra });
function buildMaterials() {
  M.concrete = std("concrete_wall_007", { color: 9276032, normalScale: 1, env: 0.3, tileMul: 1.5 });
  M.concreteDark = std("concrete_wall_007", { color: 4999748, normalScale: 1.1, env: 0.25, tileMul: 1.5 });
  M.concreteWet = std("concrete_wall_007", { color: 6052690, normalScale: 1.2, env: 0.5 });
  M.wallPeel = std("peeling_painted_wall", { color: 11446676, roughness: 0.95, normalScale: 1, env: 0.2, tileMul: 1.35 });
  M.wallPeelGreen = std("peeling_painted_wall", { color: 9674884, roughness: 0.95, normalScale: 1, env: 0.2, tileMul: 1.35 });
  M.wallPeelWarm = std("peeling_painted_wall", { color: 11970190, roughness: 0.95, normalScale: 1, env: 0.2, tileMul: 1.35 });
  M.plaster = std("damaged_plaster", { color: 11050120, normalScale: 1, env: 0.25, tileMul: 1.7 });
  M.plasterGreen = std("damaged_plaster", { color: 8161908, normalScale: 1, env: 0.25, tileMul: 1.7 });
  M.plasterPink = std("peeling_painted_wall", { color: 11047558, normalScale: 1.1, env: 0.25, tileMul: 1.6 });
  M.plasterCream = std("damaged_plaster", { color: 12102547, normalScale: 0.9, env: 0.25, tileMul: 1.6 });
  M.plasterDirty = std("damaged_plaster", { color: 8222056, normalScale: 1, env: 0.25, tileMul: 1.7 });
  M.ceiling = std("ceiling_interior", { color: 9077364, normalScale: 1, env: 0.2, tileMul: 1.6 });
  M.ceilingDirty = std("ceiling_interior", { color: 8616556, normalScale: 1.2, env: 0.2, tileMul: 1.6 });
  M.corrugated = std("worn_corrugated_iron", { color: 10131340, normalScale: 1.3, metalness: 0.35, env: 0.55 });
  M.corrugatedRust = std("worn_corrugated_iron", { color: 9071182, normalScale: 1.4, metalness: 0.3, env: 0.4 });
  M.shutter = std("painted_metal_shutter", { color: 8291448, normalScale: 1, metalness: 0.35, env: 0.45 });
  M.shutterRed = std("painted_metal_shutter", { color: 9058864, normalScale: 1, metalness: 0.3, env: 0.45 });
  M.floorChecker = std("checkered_pavement_tiles", { color: 12432290, roughness: 0.45, normalScale: 1, env: 0.55, tileMul: 10 });
  M.floorMosaic = std("old_mosaic_floor", { color: 9406329, roughness: 0.9, normalScale: 1, env: 0.5 });
  M.floorWood = std("dark_wooden_planks", { color: 10520423, roughness: 0.8, normalScale: 1, env: 0.35 });
  M.floorWoodDark = std("dark_wooden_planks", { color: 6244919, roughness: 0.75, normalScale: 1, env: 0.35 });
  M.floorConcrete = std("concrete_floor_damaged_01", { color: 9144188, roughness: 0.8, normalScale: 1.1, env: 0.3, tileMul: 1.6 });
  M.floorTerrazzo = std("terrazzo_tiles", { color: 10129540, roughness: 0.55, normalScale: 1, env: 0.45, tileMul: 2 });
  M.floorBath = std("dirty_tiles", { color: 10133646, roughness: 0.35, normalScale: 1, env: 0.7, tileMul: 3 });
  M.floorAsphalt = std("asphalt_05", { color: 9142921, roughness: 0.46, normalScale: 1.35, env: 0.55, tileMul: 1.8 });
  M.tileWallBlue = std("blue_floor_tiles_01", { color: 10464924, roughness: 0.4, normalScale: 1, env: 0.6, tileMul: 3 });
  M.tileWallDirty = std("dirty_tiles", { color: 12764336, roughness: 0.38, normalScale: 1, env: 0.7, tileMul: 2.2 });
  M.woodDark = std("dark_paneled_wood", { color: 10122824, roughness: 0.72, normalScale: 0.9, env: 0.3 });
  M.counterWood = std("dark_wooden_planks", { color: 9855816, roughness: 0.55, normalScale: 0.7, env: 0.35, tileMul: 0.8 });
  M.counterWoodDark = std("dark_wooden_planks", { color: 6173480, roughness: 0.6, normalScale: 0.7, env: 0.3, tileMul: 0.8 });
  M.woodBlack = std("dark_paneled_wood", { color: 6047536, roughness: 0.68, normalScale: 0.9, env: 0.3 });
  M.woodRed = std("dark_paneled_wood", { color: 8008999, roughness: 0.6, normalScale: 0.9, env: 0.35 });
  M.woodFloorMat = std("dark_wooden_planks", { color: 9136709, roughness: 0.75, normalScale: 1, env: 0.3 });
  M.woodRaw = std("dark_wooden_planks", { color: 10519650, roughness: 0.9, normalScale: 1.1, env: 0.25 });
  M.metalRust = std("rusty_metal_02", { color: 9202254, roughness: 0.85, metalness: 0.55, normalScale: 1.2, env: 0.6 });
  M.metalGalv = std("rusty_painted_metal", { color: 10133664, roughness: 0.6, metalness: 0.65, normalScale: 1, env: 0.8 });
  M.metalDark = std("rusty_metal_02", { color: 3815992, roughness: 0.55, metalness: 0.7, normalScale: 1, env: 0.7 });
  M.pipeRed = solid(7155494, 0.62, 0.35);
  M.pipeGreen = solid(4082240, 0.6, 0.4);
  M.brass = solid(11569738, 0.35, 0.95);
  M.copper = solid(9067066, 0.45, 0.9);
  M.steel = solid(10132118, 0.35, 1);
  M.blackMetal = solid(1841945, 0.5, 0.6);
  M.fabricRed = std("dirty_carpet", { color: 9321264, roughness: 1, normalScale: 1.2, env: 0.15 });
  M.fabricCream = std("dirty_carpet", { color: 12168339, roughness: 1, normalScale: 1.1, env: 0.15 });
  M.fabricGreen = std("dirty_carpet", { color: 6122066, roughness: 1, normalScale: 1.1, env: 0.15 });
  M.fabricBlue = std("dirty_carpet", { color: 4147800, roughness: 1, normalScale: 1.1, env: 0.15 });
  M.carpetRed = std("dirty_carpet", { color: 7219746, roughness: 1, normalScale: 1.4, env: 0.1 });
  M.leather = std("dirty_carpet", { color: 4862756, roughness: 0.55, normalScale: 0.6, env: 0.35 });
  M.curtain = std("dirty_carpet", { color: 9202222, roughness: 1, normalScale: 0.8, env: 0.1, side: DoubleSide });
  M.paper = std("damaged_plaster", { color: 13616038, roughness: 1, normalScale: 0.4, env: 0.1 });
  M.cardboard = std("damaged_plaster", { color: 10124372, roughness: 1, normalScale: 0.5, env: 0.1 });
  M.cardboardDark = std("damaged_plaster", { color: 7231547, roughness: 1, normalScale: 0.5, env: 0.1 });
  M.plasticBlue = solid(2903912, 0.45, 0.05);
  M.plasticRed = solid(8202786, 0.45, 0.05);
  M.plasticGreen = solid(3099186, 0.5, 0.05);
  M.enamelWhite = std("dirty_tiles", { color: 13617851, roughness: 0.35, normalScale: 0.4, env: 0.5 });
  M.porcelain = solid(14209730, 0.18, 0, { envMapIntensity: 0.8 });
  M.ceramicGreen = solid(7241064, 0.3, 0, { envMapIntensity: 0.7 });
  M.rubber = solid(1710360, 0.9, 0);
  M.dirt = solid(4866100, 1, 0);
  M.glass = new MeshStandardMaterial({
    color: 10465448,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.1,
    envMapIntensity: 1.2,
    side: DoubleSide,
    depthWrite: false
  });
  M.glassJar = new MeshStandardMaterial({
    color: 12108980,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.34,
    envMapIntensity: 1,
    side: DoubleSide,
    depthWrite: false
  });
  M.mirror = new MeshStandardMaterial({ color: 9343632, roughness: 0.05, metalness: 1, envMapIntensity: 1.4 });
  M.water = new MeshStandardMaterial({ color: 1712932, roughness: 0.05, metalness: 0.25, envMapIntensity: 1.2 });
  M.bulb = new MeshStandardMaterial({ color: 16770749, emissive: 16767392, emissiveIntensity: 2.4, roughness: 0.3 });
  M.bulbRed = new MeshStandardMaterial({ color: 16738890, emissive: 16726556, emissiveIntensity: 7, roughness: 0.4 });
  M.tube = new MeshStandardMaterial({ color: 14674662, emissive: 13625055, emissiveIntensity: 2.6, roughness: 0.3 });
  M.tubeGreen = new MeshStandardMaterial({ color: 14083279, emissive: 12114096, emissiveIntensity: 4, roughness: 0.3 });
  M.tvGlow = new MeshStandardMaterial({ color: 8163210, emissive: 7311240, emissiveIntensity: 3, roughness: 0.25 });
  M.candleWax = solid(14208436, 0.7);
  M.incense = solid(6965810, 0.9);
  M.labelSheet = new MeshStandardMaterial({
    map: T.art.drawer_labels,
    roughness: 0.95,
    envMapIntensity: 0.1,
    color: 14207400
  });
  M.stain = new MeshBasicMaterial({
    map: T.art.stain,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: NormalBlending,
    toneMapped: false
  });
  M.mold = new MeshBasicMaterial({
    map: T.art.mold,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    toneMapped: false
  });
  M.rustStreak = new MeshBasicMaterial({
    map: T.art.rust_streak,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    toneMapped: false
  });
  return M;
}
function posterMat(name, { tint = 16777215, emissive = 0.06, opacity = 1 } = {}) {
  const t = T.art[name];
  const m = new MeshStandardMaterial({
    map: t,
    color: tint,
    roughness: 0.92,
    metalness: 0,
    transparent: opacity < 1,
    opacity,
    envMapIntensity: 0.08,
    emissive: new Color(16777215),
    emissiveMap: t,
    emissiveIntensity: emissive,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  return m;
}
function decalMat(name, opacity = 1, tint = 16777215) {
  const t = T.art[name];
  return new MeshBasicMaterial({
    map: t,
    transparent: true,
    opacity,
    depthWrite: false,
    color: tint,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}
