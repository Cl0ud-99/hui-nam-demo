import * as THREE from 'three';
import { AmbientLight, Clock, Color, DirectionalLight, FogExp2, HemisphereLight } from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { AudioEngine } from './core/audio.js';
import { Engine, QUALITY } from './core/engine.js';
import { M, buildMaterials } from './core/materials.js';
import { Player } from './core/player.js';
import { T, loadTextures } from './core/textures.js';
import { PV } from './pv.js';
import { UI } from './ui/ui.js';
import { buildAlley } from './world/alley.js';
import { buildApartment } from './world/apartment.js';
import { buildBathroom } from './world/bathroom.js';
import { buildShop } from './world/shop.js';
import { buildStairs } from './world/stairs.js';
import { Story } from './world/story.js';
import { World } from './world/world.js';

var params = new URLSearchParams(location.search);
var SHOT = params.get("shot");
async function boot() {
  const ui = new UI();
  const audio = new AudioEngine();
  const engine = new Engine(document.getElementById("app"));
  window.__renderer = engine.renderer;
  const scene = engine.scene;
  const camera = engine.camera;
  scene.add(camera);
  RectAreaLightUniformsLib.init();
  scene.background = new Color(329482);
  scene.fog = new FogExp2(592654, 0.028);
  ui.boot(0.03);
  await loadTextures((p) => ui.boot(0.03 + p * 0.72));
  buildMaterials();
  {
    const initTex = (t2) => {
      if (t2 && t2.isTexture) engine.renderer.initTexture(t2);
    };
    for (const set of Object.values(T.sets)) {
      initTex(set.map);
      initTex(set.normal);
      initTex(set.rough);
      initTex(set.ao);
    }
    for (const t2 of Object.values(T.art)) initTex(t2);
    if (T.env) initTex(T.env);
  }
  scene.environment = T.env;
  scene.environmentIntensity = 0.40;
  const world = new World(scene, engine);
  world.qualityRefl = 1;
  world.stairs.active = true;
  world.audio = audio;
  world.hud = ui;
  const hemi = new HemisphereLight(0x33455a, 0x1a1208, 0.32);
  scene.add(hemi);
  const fill2 = new AmbientLight(0x1b2434, 0.22);
  scene.add(fill2);
  // 天光/月光：给暗部一点冷色方向光，避免整幅死黑
  const moon = new DirectionalLight(0x8fb6d9, 0.35);
  moon.position.set(-6, 14, 9);
  moon.target.position.set(0, 0, 4);
  scene.add(moon);
  scene.add(moon.target);
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
  if (!params.get("nomerge")) world.optimizeStatic();
  world.normalizeLights();
  engine.renderer.shadowMap.autoUpdate = false;
  engine.renderer.shadowMap.needsUpdate = true;
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
      for (const [tx, tz] of [[b.x0 + 0.4, b.z0 + 0.4], [b.x1 - 0.4, b.z0 + 0.4], [b.x0 + 0.4, b.z1 - 0.4], [b.x1 - 0.4, b.z1 - 0.4], [cx0, b.z0 + 0.4], [cx0, b.z1 - 0.4]]) {
        camera.position.set(cx0, cy0, cz0);
        camera.lookAt(tx, (b.y0 || 0) + 1.4, tz);
        camera.updateMatrixWorld();
        engine.renderer.compile(scene, camera);
        engine.renderer.shadowMap.needsUpdate = true;
        engine.renderer.render(scene, camera);
      }
      engine.composer.render(0.016);
      engine.renderer.shadowMap.needsUpdate = true;
      engine.composer.render(0.016);
      ui.boot(0.9 + 0.09 * ((i + 1) / ids.length));
    }
    camera.position.copy(prevPos);
    camera.quaternion.copy(prevQuat);
    world.currentRoom = prevRoom;
    world.updateRoomLights(camera);
    engine.renderer.shadowMap.needsUpdate = true;
  }
  const player = new Player(camera, world, audio);
  let gentle = params.get("story") === "1" || params.get("gentle") === "1" || localStorage.getItem("huinam_gentle") === "1";
  const story = new Story({ world, ui, audio, player, camera, gentle });
  world.story = story;
  story.onEnd = () => {
    setTimeout(() => {
      ui.endcardOn(false);
      ui.menuShow(true);
      ui.fadeInstant(0);
      player.enabled = false;
      state = "menu";
      document.exitPointerLock?.();
    }, 6500);
  };
  world.hotspot({ x: -1.35, y: 1.12, z: 2.62, w: 0.3, h: 0.2, d: 0.2, prompt: "\u958B\u6536\u97F3\u6A5F", use: () => {
    audio._burst({ freq: 900, q: 0.6, dur: 0.5, gain: 0.05 });
    ui.subtitle("\u6C99\u6C99\u2026\u2026\u300C\u2026\u2026\u8FD4\u5230\u569F\uFF0C\u5C31\u5514\u597D\u8D70\u3002\u300D", 4200);
  } });
  world.hotspot({ x: -0.95, y: 1.06, z: 2.95, w: 0.35, h: 0.1, d: 0.3, prompt: "\u7747\u8CEC\u7C3F", use: () => ui.subtitle("\u6700\u5F8C\u4E00\u9801\uFF1A\u5341\u6708\u5EFF\u4E09\uFF0C\u6674\u3002\u6B20\u9673\u592A \u4E09\u767E\u516D\u5341\u5143\u3002", 4600) });
  world.hotspot({ x: -3.15, y: 4.45, z: -0.15, w: 0.5, h: 0.6, d: 0.6, prompt: "\u4E0A\u9999", use: () => story.lightIncense() });
  world.hotspot({ x: 2.45, y: 4.6, z: 3.32, w: 0.45, h: 0.4, d: 0.45, prompt: "\u958B\u6C34\u5589", use: () => story.useTap() });
  world.hotspot({ x: 2.45, y: 4.95, z: 3.25, w: 0.6, h: 0.7, d: 0.2, prompt: "\u671B\u93E1", use: () => story.lookMirror() });
  world.hotspot({ x: 0.4, y: 5.2, z: 5.86, w: 1.4, h: 1, d: 0.3, prompt: "\u671B\u51FA\u7A97\u5916", use: () => ui.subtitle("\u6A13\u4E0B\u5605\u5DF7\uFF0C\u6709\u4EBA\u4F01\u55BA\u96E8\u5165\u9762\uFF0C\u62AC\u982D\u671B\u4F4F\u4F60\u3002", 5200) });
  ui.boot(0.94);
  await new Promise((r) => setTimeout(r, 60));
  ui.boot(1);
  let qname = params.get("quality") || localStorage.getItem("huinam_quality") || "high";
  if (!QUALITY[qname]) qname = "high";
  const applyQuality = (q) => {
    const cfg = engine.setQuality(q);
    world.qualityRefl = cfg.refl > 0 ? 1 : 0;
    const s = cfg.refl;
    const w = window.innerWidth, h = window.innerHeight;
    world.groundMirror.setSize(Math.max(256, Math.round(w * 0.5 * s)), Math.max(160, Math.round(h * 0.5 * s)));
    world.upperMirror.setSize(Math.max(256, Math.round(w * 0.4 * s)), Math.max(160, Math.round(h * 0.4 * s)));
    for (const m of world.mirrors) m.refl.setSize(Math.round(512 * Math.max(0.5, s)), Math.round(512 * Math.max(0.5, s)));
    document.getElementById("qlabel").textContent = cfg.label;
    localStorage.setItem("huinam_quality", q);
  };
  applyQuality(qname);
  window.addEventListener("resize", () => {
    const cfg = QUALITY[qname];
    const w = window.innerWidth, h = window.innerHeight;
    world.groundMirror.setSize(Math.max(256, Math.round(w * 0.5 * cfg.refl)), Math.max(160, Math.round(h * 0.5 * cfg.refl)));
    world.upperMirror.setSize(Math.max(256, Math.round(w * 0.4 * cfg.refl)), Math.max(160, Math.round(h * 0.4 * cfg.refl)));
  });
  const pv = new PV({ engine, world, ui, audio, player });
  let state = "menu";
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
    audio.setAmbience("alley", 2);
    player.enabled = true;
    state = "play";
    if (!started) {
      started = true;
      story.start();
    }
    ui.clickHint(true);
    setTimeout(() => {
      if (state === "play") ui.clickHint(document.pointerLockElement == null);
    }, 1800);
    const canvas = engine.renderer.domElement;
    try {
      const pr = canvas.requestPointerLock?.();
      pr?.catch?.((e) => {
      });
    } catch (e) {
    }
  }
  function pause(v) {
    if (state !== "play" && state !== "paused") return;
    state = v ? "paused" : "play";
    ui.pausedOn(v);
    player.enabled = !v;
    if (v) document.exitPointerLock?.();
    else {
      try {
        engine.renderer.domElement.requestPointerLock?.()?.catch?.(() => {
        });
      } catch (e) {
      }
    }
  }
  document.getElementById("mlabel").textContent = gentle ? "\u6EAB\u548C" : "\u9A5A\u5687";
  document.querySelector('[data-act="mode"]').classList.toggle("warm", gentle);
  document.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.act;
      if (act === "play") {
        audio.init();
        startGame();
      }
      if (act === "pv") {
        audio.init();
        state = "pv";
        pv.start();
      }
      if (act === "quality") {
        const order = ["high", "medium", "low"];
        qname = order[(order.indexOf(qname) + 1) % order.length];
        applyQuality(qname);
    // 舊片濾鏡強度 / 噪點強度，可由 URL 實時調：?aged=0.3&grain=0.09
    const agedParam = params.get("aged");
    if (agedParam !== null) engine.grade.uniforms.uAged.value = Math.max(0, Math.min(1, Number(agedParam) || 0));
    const grainParam = params.get("grain");
    if (grainParam !== null) engine.grade.uniforms.uGrain.value = Math.max(0, Number(grainParam) || 0);
    if (params.get("tv") === "1") engine.grade.uniforms.uGrainTV.value = 1;
      }
      if (act === "mode") {
        gentle = !gentle;
        story.gentle = gentle;
        document.getElementById("mlabel").textContent = gentle ? "\u6EAB\u548C" : "\u9A5A\u5687";
        localStorage.setItem("huinam_gentle", gentle ? "1" : "0");
        document.querySelector('[data-act="mode"]').classList.toggle("warm", gentle);
      }
      if (act === "help") {
        document.querySelector(".foot").style.color = "#d8cdbb";
        setTimeout(() => document.querySelector(".foot").style.color = "", 1800);
      }
      if (act === "resume") pause(false);
      if (act === "menu") {
        pause(false);
        location.reload();
      }
    });
  });
  engine.renderer.domElement.addEventListener("click", () => {
    if (state === "play" && document.pointerLockElement == null) engine.renderer.domElement.requestPointerLock?.();
  });
  document.addEventListener("pointerlockchange", () => {
    if (state === "play" && document.pointerLockElement == null) {
      setTimeout(() => {
        if (state === "play") pause(true);
      }, 30);
    }
  });
  addEventListener("keydown", (e) => {
    if (e.code === "Enter" && state === "menu") {
      audio.init();
      startGame();
    }
    if (e.code === "Escape") {
      if (state === "pv") {
        pv.stop();
        state = "menu";
      } else if (state === "paused") pause(false);
      else if (state === "end") {
        location.reload();
      }
    }
    if (e.code === "F3") {
      ui.perfOn(!document.getElementById("perf").classList.contains("on"));
    }
  });
  let manualT = 0;
  window.__W = {
    THREE: THREE,
    engine,
    scene,
    camera,
    world,
    player,
    story,
    pv,
    ui,
    audio,
    M,
    T,
    stepPV: (dt) => {
      manualT += dt;
      pv.update(dt);
      world.update(dt, manualT, camera);
      engine.render(dt);
    },
    setState: (s) => {
      state = s;
    }
  };
  if (SHOT) {
    ui.menuShow(false);
    ui.hudOn(false);
    ui.boot(1);
    ui.bootDone();
    const n = SHOT.split(",").map(Number);
    if (n.length >= 6) {
      camera.position.set(n[0], n[1], n[2]);
      camera.lookAt(n[3], n[4], n[5]);
    }
    state = "shot";
    player.enabled = false;
  } else {
    ui.bootDone();
  }
  audio.setAmbience("alley", 0.1);
  const clock = new Clock();
  let t = 0, fpsAcc = 0, fpsN = 0, fpsShown = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (window.__manual) return;
    const dt = Math.min(clock.getDelta(), 0.06);
    t += dt;
    if (state === "menu") {
      menuCam.a += dt * 0.045;
      camera.position.set(-3.4 + Math.sin(menuCam.a) * 0.45, 1.95 + Math.sin(menuCam.a * 0.7) * 0.05, 11.6 - Math.cos(menuCam.a) * 0.35);
      camera.lookAt(1.2 + Math.sin(menuCam.a * 0.5) * 0.3, 2.5, 6.2);
    } else if (state === "pv") {
      pv.update(dt);
    } else if (state === "play" || state === "paused" || state === "end") {
      player.update(dt);
      story.update(dt);
      const hov = player.hover;
      ui.prompt(hov ? typeof hov.prompt === "function" ? hov.prompt() : hov.prompt : null);
    }
    world.update(dt, t, camera);
    engine.render(dt);
    fpsAcc += dt;
    fpsN++;
    if (fpsAcc > 0.6) {
      fpsShown = Math.round(fpsN / fpsAcc);
      fpsAcc = 0;
      fpsN = 0;
      if (document.getElementById("perf").classList.contains("on")) {
        const info = engine.renderer.info;
        ui.perf(`${fpsShown} fps
${info.render.calls} calls
${(info.render.triangles / 1e3).toFixed(0)}k tris`);
      }
    }
  }
  frame();
  if (params.get("autoplay") === "1") {
    audio.init();
    startGame();
  }
}
boot().catch((e) => {
  console.error(e);
  const b = document.getElementById("boot");
  if (b) b.innerHTML = `<span style="color:#b8443a;letter-spacing:.2em;font-family:monospace">\u8F09\u5165\u5931\u6557 \xB7 ${e.message}</span>`;
});
