import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { ClampToEdgeWrapping, EquirectangularReflectionMapping, NoColorSpace, PMREMGenerator, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';
export { T, loadTextures };

var TILE = {
  old_mosaic_floor: 2,
  checkered_pavement_tiles: 2,
  floor_tiles_06: 3,
  dirty_tiles: 2.26,
  blue_floor_tiles_01: 2,
  damaged_plaster: 1.85,
  peeling_painted_wall: 1.8,
  concrete_wall_007: 2.16,
  concrete_floor_damaged_01: 5,
  worn_corrugated_iron: 1.8,
  rusty_metal_02: 1,
  dark_paneled_wood: 1.4,
  dark_wooden_planks: 2,
  asphalt_05: 2,
  painted_metal_shutter: 2,
  ceiling_interior: 2,
  terrazzo_tiles: 2,
  rusty_painted_metal: 2.2,
  dirty_carpet: 0.6
};
var SETS = [
  "old_mosaic_floor",
  "checkered_pavement_tiles",
  "floor_tiles_06",
  "dirty_tiles",
  "blue_floor_tiles_01",
  "damaged_plaster",
  "peeling_painted_wall",
  "concrete_wall_007",
  "concrete_floor_damaged_01",
  "worn_corrugated_iron",
  "rusty_metal_02",
  "dark_paneled_wood",
  "dark_wooden_planks",
  "asphalt_05",
  "painted_metal_shutter",
  "ceiling_interior",
  "terrazzo_tiles",
  "rusty_painted_metal",
  "dirty_carpet"
];
var ART = [
  "banner_red",
  "poster_buddha",
  "meridian",
  "shop_sign",
  "neon_fuan",
  "calendar",
  "notice",
  "newspaper",
  "drawer_labels",
  "photo_1",
  "photo_2",
  "photo_3",
  "photo_4",
  "graffiti",
  "price_board",
  "talisman",
  "stain",
  "mold",
  "rust_streak",
  "puddle_mask",
  "water_normal",
  "soft_dot",
  "rain_streak"
];
var T = { sets: {}, art: {}, env: null };
var loader = new TextureLoader();
var loadOne = (url, srgb) => new Promise((res, rej) => {
  loader.load(url, (t) => {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    t.anisotropy = 8;
    res(t);
  }, void 0, rej);
});
async function loadTextures(onProgress = () => {
}) {
  let done = 0;
  const total = SETS.length + ART.length + 1;
  const tick = () => onProgress(++done / total);
  const jobs = [];
  for (const name of SETS) {
    const tile = TILE[name] || 2;
    jobs.push((async () => {
      const base = `assets/tex/${name}`;
      const set = { tile };
      const [map, nor, rough] = await Promise.all([
        loadOne(`${base}/diff.jpg`, true),
        loadOne(`${base}/nor.jpg`, false).catch(() => null),
        loadOne(`${base}/rough.jpg`, false).catch(() => null)
      ]);
      map.repeat.set(1 / tile, 1 / tile);
      if (nor) nor.repeat.copy(map.repeat);
      if (rough) rough.repeat.copy(map.repeat);
      Object.assign(set, { map, normal: nor, rough });
      T.sets[name] = set;
      tick();
    })());
  }
  for (const name of ART) {
    jobs.push((async () => {
      const t = await loadOne(`assets/art/${name}.png`, true);
      t.wrapS = t.wrapT = ClampToEdgeWrapping;
      T.art[name] = t;
      tick();
    })());
  }
  jobs.push((async () => {
    try {
      const hdr = await new RGBELoader().loadAsync("assets/env/night_street.hdr");
      hdr.mapping = EquirectangularReflectionMapping;
      const pmrem = new PMREMGenerator(window.__renderer);
      T.env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      pmrem.dispose();
    } catch (e) {
      console.warn("env fail", e);
    }
    tick();
  })());
  await Promise.all(jobs);
  return T;
}
