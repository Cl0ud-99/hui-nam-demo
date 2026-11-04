import * as THREE from 'three';
import { Engine, QUALITY } from './core/engine.js';
import { loadTextures, T } from './core/textures.js';
import { buildMaterials, M } from './core/materials.js';
import { World } from './world/world.js';
import { buildAlley } from './world/alley.js';
import { buildShop } from './world/shop.js';
import { buildStairs } from './world/stairs.js';
import { buildApartment } from './world/apartment.js';
import { buildBathroom } from './world/bathroom.js';
import { Story } from './world/story.js';
import { Player } from './core/player.js';
import { AudioEngine } from './core/audio.js';
import { UI } from './ui/ui.js';
import { PV } from './pv.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');

async function boot() {
  const ui = new UI();
  const audio = new AudioEngine();
  const engine = new Engine(document.getElementById('app'));
  window.__renderer = engine.renderer;
  const scene = engine.scene;
  const camera = engine.camera;
  scene.add(camera);
  RectAreaLightUniformsLib.init();

  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.FogExp2(0x090b0e, 0.028);

  ui.boot(0.03);
  await loadTextures((p) => ui.boot(0.03 + p * 0.72));
  buildMaterials();
  // force every texture onto the GPU now instead of on first visibility
  {
    const initTex = (t) => { if (t && t.isTexture) engine.renderer.initTexture(t); };
    for (const set of Object.values(T.sets)) { initTex(set.map); initTex(set.normal); initTex(set.rough); initTex(set.ao); }
    for (const t of Object.values(T.art)) initTex(t);
    if (T.env) initTex(T.env);
  }
  scene.environment = T.env;
  scene.environmentIntensity = 0.55;

  const world = new World(scene, engine);
  world.qualityRefl = 1;
  world.stairs.active = true;
  world.audio = audio;
  world.hud = ui;

  // lights that apply everywhere
  const hemi = new THREE.HemisphereLight(0x3a4a56, 0x14100c, 0.42);
  scene.add(hemi);
  const fill = new THREE.AmbientLight(0x1c1e20, 0.5);
  scene.add(fill);

  ui.boot(0.8);
  buildAlley(world);
  buildShop(world);
  buildStairs(world);
  const apt = buildApartment(world);
  const bath = buildBathroom(world);
  world.bathRoom = bath;
  world.aptRoom = apt;
  world.makeRain({});
  world.dust.position.set(0, 0, 0);

  if (!params.get('nomerge')) world.optimizeStatic();
  world.normalizeLights();
  engine.renderer.shadowMap.autoUpdate = false;
  engine.renderer.shadowMap.needsUpdate = true;

  // pre-warm shaders + shadow maps for every room so switching rooms never recompiles mid-walk
  {
    const ids = Object.keys(world.rooms);
    const prevRoom = world.currentRoom;
    const prevPos = camera.position.clone();
    const prevQuat = camera.quaternion.clone();
    for (let i = 0; i < ids.length; i++) {
      const b = world.rooms[ids[i]];
      world.currentRoom = ids[i];
      world.updateRoomLights(camera);
      const cx0 = (b.x0 + b.x1) / 2, cz0 = (b.z0 + b.z1) / 2, cy0 = (b.y0 || 0) + 1.62;
      // four-corner sweep: every wall of the room gets seen once, so nothing compiles on first turn
      for (const [tx, tz] of [[b.x0 + 0.4, b.z0 + 0.4], [b.x1 - 0.4, b.z0 + 0.4], [b.x0 + 0.4, b.z1 - 0.4], [b.x1 - 0.4, b.z1 - 0.4], [cx0, b.z0 + 0.4], [cx0, b.z1 - 0.4]]) {
        camera.position.set(cx0, cy0, cz0);
        camera.lookAt(tx, (b.y0 || 0) + 1.4, tz);
        camera.updateMatrixWorld();
        engine.renderer.compile(scene, camera);
        engine.renderer.shadowMap.needsUpdate = true;
        engine.renderer.render(scene, camera);
        // the full composer pass (AO + normal-depth) compiles its own variants; do it from
        // every viewpoint so nothing new appears the moment the player walks in
        engine.composer.render(0.016);
      }
      // planar mirrors render into their own RT, which needs its own program variant per
      // material — without this the first bathroom visit froze for seconds
      camera.position.set(cx0, cy0, cz0);
      camera.lookAt(cx0, cy0, cz0 + 1);
      camera.updateMatrixWorld();
      world.update(0.016, 0, camera);
      world.update(0.016, 0, camera);
      // force the planar mirrors through one pass here: they render into their own target and
      // the first real bathroom frame otherwise costs ~60 ms
      for (const m of world.mirrors) { m.refl.enabled = true; m.refl.update(camera); }
      // the composer pass compiles the AO/normal-depth variants too
      engine.composer.render(0.016);
      engine.renderer.shadowMap.needsUpdate = true;
      engine.composer.render(0.016);
      ui.boot(0.9 + 0.09 * ((i + 1) / ids.length));
    }
    camera.position.copy(prevPos); camera.quaternion.copy(prevQuat);
    world.currentRoom = prevRoom;
    world.updateRoomLights(camera);
    engine.renderer.shadowMap.needsUpdate = true;
  }
  const player = new Player(camera, world, audio);
  const story = new Story({ world, ui, audio, player, camera });
  world.story = story;
  story.onEnd = () => {
    setTimeout(() => {
      ui.endcardOn(false);
      ui.menuShow(true);
      ui.fadeInstant(0);
      player.enabled = false;
      state = 'menu';
      document.exitPointerLock?.();
    }, 6500);
  };

  // hotspots for story props
  world.hotspot({ x: -1.35, y: 1.12, z: 2.62, w: 0.3, h: 0.2, d: 0.2, prompt: '開收音機', use: () => { audio._burst({ freq: 900, q: 0.6, dur: 0.5, gain: 0.05 }); ui.subtitle('沙沙……「……返到嚟，就唔好走。」', 4200); } });
  world.hotspot({ x: -0.95, y: 1.06, z: 2.95, w: 0.35, h: 0.1, d: 0.3, prompt: '睇賬簿', use: () => ui.subtitle('最後一頁：十月廿三，晴。欠陳太 三百六十元。', 4600) });
  world.hotspot({ x: -3.15, y: 4.45, z: -0.15, w: 0.5, h: 0.6, d: 0.6, prompt: '上香', use: () => story.lightIncense() });
  world.hotspot({ x: 2.45, y: 4.6, z: 3.32, w: 0.45, h: 0.4, d: 0.45, prompt: '開水喉', use: () => story.useTap() });
  world.hotspot({ x: 2.45, y: 4.95, z: 3.25, w: 0.6, h: 0.7, d: 0.2, prompt: '望鏡', use: () => story.lookMirror() });
  world.hotspot({ x: 0.4, y: 5.2, z: 5.86, w: 1.4, h: 1.0, d: 0.3, prompt: '望出窗外', use: () => ui.subtitle('樓下嘅巷，有人企喺雨入面，抬頭望住你。', 5200) });

  ui.boot(0.94);
  await new Promise(r => setTimeout(r, 60));
  ui.boot(1);

  // quality
  let qname = params.get('quality') || localStorage.getItem('huinam_quality') || 'high';
  if (!QUALITY[qname]) qname = 'high';
  const applyQuality = (q) => {
    const cfg = engine.setQuality(q);
    world.qualityRefl = cfg.refl > 0 ? 1 : 0;
    const s = cfg.refl;
    const w = window.innerWidth, h = window.innerHeight;
    world.groundMirror.setSize(Math.max(256, Math.round(w * 0.5 * s)), Math.max(160, Math.round(h * 0.5 * s)));
    world.upperMirror.setSize(Math.max(256, Math.round(w * 0.4 * s)), Math.max(160, Math.round(h * 0.4 * s)));
    for (const m of world.mirrors) m.refl.setSize(Math.round(512 * Math.max(0.5, s)), Math.round(512 * Math.max(0.5, s)));
    document.getElementById('qlabel').textContent = cfg.label;
    localStorage.setItem('huinam_quality', q);
  };
  applyQuality(qname);
  window.addEventListener('resize', () => {
    const cfg = QUALITY[qname];
    const w = window.innerWidth, h = window.innerHeight;
    world.groundMirror.setSize(Math.max(256, Math.round(w * 0.5 * cfg.refl)), Math.max(160, Math.round(h * 0.5 * cfg.refl)));
    world.upperMirror.setSize(Math.max(256, Math.round(w * 0.4 * cfg.refl)), Math.max(160, Math.round(h * 0.4 * cfg.refl)));
  });

  const pv = new PV({ engine, world, ui, audio, player });

  let state = 'menu';
  let started = false;
  const menuCam = { a: 0 };
  camera.position.set(-3.4, 1.95, 11.6);
  camera.lookAt(1.2, 2.5, 6.2);

  function startGame() {
    ui.menuShow(false);
    ui.hudOn(true);
    ui.fadeInstant(1);
    ui.fade(0, 1600);
    audio.init();
    audio.setAmbience('alley', 2);
    player.enabled = true;
    state = 'play';
    if (!started) { started = true; story.start(); }
    ui.clickHint(true);
    setTimeout(() => { if (state === 'play') ui.clickHint(document.pointerLockElement == null); }, 1800);
    const canvas = engine.renderer.domElement;
    try {
      // raw input: no OS pointer acceleration -> no overshoot when you flick the mouse
      const pr = canvas.requestPointerLock?.({ unadjustedMovement: true });
      pr?.catch?.(() => { try { canvas.requestPointerLock?.(); } catch (e) { } });
    } catch (e) { try { canvas.requestPointerLock?.(); } catch (e2) { } }
  }

  function pause(v) {
    if (state !== 'play' && state !== 'paused') return;
    state = v ? 'paused' : 'play';
    ui.pausedOn(v);
    player.enabled = !v;
    if (v) document.exitPointerLock?.();
    else {
      try {
        const el = engine.renderer.domElement;
        const pr = el.requestPointerLock?.({ unadjustedMovement: true });
        pr?.catch?.(() => { try { el.requestPointerLock?.(); } catch (e) { } });
      } catch (e) { try { engine.renderer.domElement.requestPointerLock?.(); } catch (e2) { } }
    }
  }

  document.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'play') { audio.init(); startGame(); }
      if (act === 'pv') { audio.init(); state = 'pv'; pv.start(); }
      if (act === 'quality') {
        const order = ['high', 'medium', 'low'];
        qname = order[(order.indexOf(qname) + 1) % order.length];
        applyQuality(qname);
      }
      if (act === 'help') {
        document.querySelector('.foot').style.color = '#d8cdbb';
        setTimeout(() => document.querySelector('.foot').style.color = '', 1800);
      }
      if (act === 'resume') pause(false);
      if (act === 'menu') { pause(false); location.reload(); }
    });
  });

  engine.renderer.domElement.addEventListener('click', () => {
    if (state === 'play' && document.pointerLockElement == null) engine.renderer.domElement.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    if (state === 'play' && document.pointerLockElement == null) {
      // Esc released the lock
      setTimeout(() => { if (state === 'play') pause(true); }, 30);
    }
  });
  addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && state === 'menu') { audio.init(); startGame(); }
    if (e.code === 'Escape') {
      if (state === 'pv') { pv.stop(); state = 'menu'; }
      else if (state === 'paused') pause(false);
      else if (state === 'end') { location.reload(); }
    }
    if (e.code === 'F3') { ui.perfOn(!document.getElementById('perf').classList.contains('on')); }
  });

  let manualT = 0;
  window.__W = { THREE, engine, scene, camera, world, player, story, pv, ui, audio, M, T,
    stepPV: (dt) => {
      manualT += dt;
      pv.update(dt);
      world.update(dt, manualT, camera);
      engine.render(dt);
    },
    setState: (s) => { state = s; },
  };

  if (SHOT) {
    ui.menuShow(false); ui.hudOn(false); ui.boot(1); ui.bootDone();
    const n = SHOT.split(',').map(Number);
    if (n.length >= 6) {
      camera.position.set(n[0], n[1], n[2]);
      camera.lookAt(n[3], n[4], n[5]);
    }
    state = 'shot';
    player.enabled = false;
  } else {
    ui.bootDone();
  }
  audio.setAmbience('alley', 0.1);

  const clock = new THREE.Clock();
  let t = 0, fpsAcc = 0, fpsN = 0, fpsShown = 0, slowT = 0, adaptDone = false;

  function frame() {
    requestAnimationFrame(frame);
    if (window.__manual) return;
    const dt = Math.min(clock.getDelta(), 0.06);
    t += dt;

    if (state === 'menu') {
      menuCam.a += dt * 0.045;
      camera.position.set(-3.4 + Math.sin(menuCam.a) * 0.45, 1.95 + Math.sin(menuCam.a * 0.7) * 0.05, 11.6 - Math.cos(menuCam.a) * 0.35);
      camera.lookAt(1.2 + Math.sin(menuCam.a * 0.5) * 0.3, 2.5, 6.2);
    } else if (state === 'pv') {
      pv.update(dt);
    } else if (state === 'play' || state === 'paused' || state === 'end') {
      player.update(dt);
      story.update(dt);
      const hov = player.hover;
      ui.prompt(hov ? (typeof hov.prompt === 'function' ? hov.prompt() : hov.prompt) : null);
    }

    world.update(dt, t, camera);
    engine.render(dt);

    // never let a weak GPU stutter through the bathroom: sustained long frames drop one preset
    if (state === 'play' && !adaptDone) {
      if (dt > 0.024) slowT += dt; else slowT = Math.max(0, slowT - dt * 0.5);
      if (slowT > 1.6) {
        adaptDone = true;
        engine.setQuality(engine.quality === 'high' ? 'med' : 'low');
        if (engine.quality !== 'high') world.qualityRefl = 0;
      }
    }

    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.6) {
      fpsShown = Math.round(fpsN / fpsAcc);
      fpsAcc = 0; fpsN = 0;
      if (document.getElementById('perf').classList.contains('on')) {
        const info = engine.renderer.info;
        ui.perf(`${fpsShown} fps\n${info.render.calls} calls\n${(info.render.triangles / 1000).toFixed(0)}k tris`);
      }
    }
  }
  frame();

  if (params.get('autoplay') === '1') { audio.init(); startGame(); }
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = `<span style="color:#b8443a;letter-spacing:.2em;font-family:monospace">載入失敗 · ${e.message}</span>`;
});
