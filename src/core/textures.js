import * as THREE from 'three';

/** Real-world size (metres) of each scanned texture set. */
export const TILE = {
  old_mosaic_floor: 2.0,
  checkered_pavement_tiles: 2.0,
  floor_tiles_06: 3.0,
  dirty_tiles: 2.26,
  blue_floor_tiles_01: 2.0,
  damaged_plaster: 1.85,
  peeling_painted_wall: 1.8,
  concrete_wall_007: 2.16,
  concrete_floor_damaged_01: 5.0,
  worn_corrugated_iron: 1.8,
  rusty_metal_02: 1.0,
  dark_paneled_wood: 1.4,
  dark_wooden_planks: 2.0,
  asphalt_05: 2.0,
  painted_metal_shutter: 2.0,
  ceiling_interior: 2.0,
  terrazzo_tiles: 2.0,
  rusty_painted_metal: 2.2,
  dirty_carpet: 0.6,
};

const SETS = ['old_mosaic_floor', 'checkered_pavement_tiles', 'floor_tiles_06', 'dirty_tiles',
  'blue_floor_tiles_01', 'damaged_plaster', 'peeling_painted_wall', 'concrete_wall_007',
  'concrete_floor_damaged_01', 'worn_corrugated_iron', 'rusty_metal_02', 'dark_paneled_wood',
  'dark_wooden_planks', 'asphalt_05', 'painted_metal_shutter', 'ceiling_interior',
  'terrazzo_tiles', 'rusty_painted_metal', 'dirty_carpet'];

export const ART = ['banner_red', 'poster_buddha', 'meridian', 'shop_sign', 'neon_fuan', 'calendar',
  'notice', 'newspaper', 'drawer_labels', 'photo_1', 'photo_2', 'photo_3', 'photo_4', 'graffiti',
  'price_board', 'talisman', 'stain', 'mold', 'rust_streak', 'puddle_mask', 'water_normal',
  'soft_dot', 'rain_streak'];

export const T = { sets: {}, art: {}, env: null };

const loader = new THREE.TextureLoader();
const loadOne = (url, srgb) => new Promise((res, rej) => {
  loader.load(url, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    res(t);
  }, undefined, rej);
});

export async function loadTextures(onProgress = () => {}) {
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
        loadOne(`${base}/rough.jpg`, false).catch(() => null),
      ]);
      // UVs are authored in metres -> one texture repeat per real-world tile size
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
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      T.art[name] = t; tick();
    })());
  }
  jobs.push((async () => {
    try {
      const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
      const hdr = await new RGBELoader().loadAsync('assets/env/night_street.hdr');
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(window.__renderer);
      T.env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose(); pmrem.dispose();
    } catch (e) { console.warn('env fail', e); }
    tick();
  })());
  await Promise.all(jobs);
  return T;
}

export function artTex(name) {
  const t = T.art[name];
  if (!t) return null;
  return t;
}

export function cloneTex(t, rx = 1, ry = 1) {
  if (!t) return null;
  const c = t.clone();
  c.needsUpdate = true;
  c.repeat.set(t.repeat.x * rx, t.repeat.y * ry);
  return c;
}
