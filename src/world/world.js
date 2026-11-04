import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, Group, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, PointLight, Points, ShaderMaterial, SpotLight, Sprite, SpriteMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M } from '../core/materials.js';
import { PlanarReflector, wetify } from '../core/reflector.js';
import { T } from '../core/textures.js';
import { clamp2, rand } from '../core/util.js';
export { World };

var World = class {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this.root = new Group();
    scene.add(this.root);
    this.colliders = [];
    this.interactables = [];
    this.animators = [];
    this.lights = {};
    this.rooms = {};
    this.enterHooks = {};
    this.currentRoom = null;
    this.groundHide = [];
    this.upperHide = [];
    this.puddles = [];
    this.volumes = [];
    this.mirrors = [];
    this.roomLights = /* @__PURE__ */ new Map();
    this.steamEmitters = [];
    this.dust = null;
    this.rain = null;
    this.time = 0;
    this.qualityRefl = 1;
    this.audio = null;
    this.hud = null;
    this.story = null;
    this.onRoomChange = null;
    this.stairs = {};
    this._setupReflectors();
    this._setupDust();
  }
  _setupReflectors() {
    const g = new Object3D();
    g.position.set(0, 1e-3, 10);
    g.rotation.x = -Math.PI / 2;
    this.root.add(g);
    this.groundMirror = new PlanarReflector(this.engine.renderer, this.scene, g, {
      width: 1024,
      height: 640,
      hide: this.groundHide,
      clipBias: 4e-3
    });
    const u = new Object3D();
    u.position.set(0, 3.601, 2);
    u.rotation.x = -Math.PI / 2;
    this.root.add(u);
    this.upperMirror = new PlanarReflector(this.engine.renderer, this.scene, u, {
      width: 768,
      height: 480,
      hide: this.upperHide,
      clipBias: 4e-3
    });
    this.groundMirror.enabled = false;
    this.upperMirror.enabled = false;
  }
  _setupDust() {
    const N = 900;
    const geo = new BufferGeometry();
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand(-9, 9);
      pos[i * 3 + 1] = rand(0, 7);
      pos[i * 3 + 2] = rand(-8, 14);
      seed[i] = Math.random();
    }
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seed, 1));
    const mat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: T.art.soft_dot }, uColor: { value: new Color(0.9, 0.82, 0.7) }, uOpacity: { value: 0.22 } },
      vertexShader: `
      attribute float aSeed; varying float vA;
      uniform float uTime;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.17 + aSeed * 30.0) * 0.45;
        p.y += sin(uTime * 0.11 + aSeed * 17.0) * 0.35;
        p.z += cos(uTime * 0.13 + aSeed * 21.0) * 0.45;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dz = max(0.5, -mv.z);
        gl_PointSize = clamp((0.7 + aSeed * 1.6) * (5.0 / dz), 0.8, 5.0);
        vA = (0.12 + 0.45 * aSeed) * smoothstep(20.0, 7.0, dz) * smoothstep(0.8, 2.4, dz);
      }`,
      fragmentShader: `
      uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a < 0.01) discard;
        gl_FragColor = vec4(uColor, t.a * vA * uOpacity);
      }`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending
    });
    this.dust = new Points(geo, mat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }
  // ---------------------------------------------------------------- API used by rooms
  room(id, box2) {
    this.rooms[id] = box2;
  }
  onEnter(id, fn) {
    (this.enterHooks[id] ||= []).push(fn);
  }
  addLight(roomId, light, opts = {}) {
    light.intensity *= 0.55;
    if (opts.global) (this.globalLights ||= []).push(light);
    if (opts.keep) light.userData.keep = true;
    if (light.userData.keepShadow) light.userData.keepShadow = true;
    light.userData.base = light.intensity;
    light.userData.room = roomId;
    this.root.add(light);
    if (light.target && !light.target.parent) this.root.add(light.target);
    if (!this.lights[roomId]) this.lights[roomId] = [];
    this.lights[roomId].push(light);
    return light;
  }
  flicker(light, { min = 0.5, max = 1, speed = 2, pattern = "soft" } = {}) {
    light.userData.flicker = { min, max, speed, pattern, seed: Math.random() * 100 };
  }
  animate(fn) {
    this.animators.push(fn);
  }
  // one shadow-casting spot shared by every room: keeps the shader program count identical everywhere
  initKeyShadow() {
    const l = new SpotLight(16760976, 0, 16, 1.5, 0.95, 2);
    l.castShadow = false;
    l.shadow.mapSize.set(1024, 1024);
    l.shadow.bias = -12e-4;
    l.shadow.normalBias = 0.03;
    l.position.set(0, 3, 0);
    this.scene.add(l);
    this.scene.add(l.target);
    this.keyShadow = l;
    this.keyFor = {};
  }
  // equal light budget per room -> a single compiled program set, so entering a room never recompiles
  normalizeLights(cap = 14) {
    this.initKeyShadow();
    for (const id of Object.keys(this.lights)) {
      let arr = this.lights[id];
      for (let i = 0; i < arr.length; i++) {
        const l = arr[i];
        if (l.isRectAreaLight) {
          const p = new PointLight(l.color.getHex(), l.intensity, 9, 2);
          p.position.copy(l.position);
          p.userData.base = l.intensity;
          p.userData.room = id;
          this.root.add(p);
          this.root.remove(l);
          arr[i] = p;
        } else if (l.isSpotLight) {
          const p = new PointLight(l.color.getHex(), l.intensity, 10, 2);
          p.position.copy(l.position);
          p.userData.base = l.intensity;
          p.userData.room = id;
          this.root.add(p);
          this.root.remove(l);
          arr[i] = p;
        }
        arr[i].castShadow = false;
      }
      const globals = (this.globalLights || []).filter((l) => l.userData.room !== id || true);
      const gset = new Set(this.globalLights || []);
      arr = arr.filter((l) => !gset.has(l));
      const score = (l) => (l.userData.keep ? 1e6 : 0) + l.intensity * (l.distance || 7);
      arr.sort((a, b) => score(b) - score(a));
      const keep = arr.slice(0, Math.max(1, cap - gset.size));
      for (const l of arr.slice(cap)) {
        this.root.remove(l);
        l.dispose?.();
      }
      const key = keep.slice().sort((a, b) => (b.userData.base || b.intensity) - (a.userData.base || a.intensity))[0] || null;
      this.keyFor[id] = key;
      if (key) {
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -15e-4;
        key.shadow.normalBias = 0.02;
      }
      for (const gl of this.globalLights || []) if (!keep.includes(gl)) keep.push(gl);
      while (keep.length < cap) {
        const d = new PointLight(0, 0, 0.2, 2);
        d.position.set(0, -60, 0);
        d.userData.room = id;
        d.userData.dummy = true;
        this.root.add(d);
        keep.push(d);
      }
      this.lights[id] = keep;
    }
  }
  applyKeyShadow(id) {
    if (this.keyShadow) this.keyShadow.intensity = 0;
  }
  interact(mesh2, opts) {
    const it = { mesh: mesh2, prompt: opts.prompt || "\u4E92\u52D5", use: opts.use, range: opts.range || 2, enabled: true };
    mesh2.userData.interact = it;
    mesh2.traverse((o) => {
      o.userData.interact = it;
    });
    this.interactables.push(it);
    return it;
  }
  hotspot({ x, y, z, w = 0.3, h = 0.3, d = 0.3, prompt = "\u4E92\u52D5", use = () => {
  }, range = 2.1 }) {
    const m = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    m.userData.dynamic = true;
    this.root.add(m);
    this.interact(m, { prompt, use, range });
    return m;
  }
  wetFloor(material, opts = {}) {
    const room = opts.room;
    const reflector = room === "alley" || room === "shop" ? this.groundMirror : this.upperMirror;
    wetify(material, {
      reflector,
      amount: opts.amount ?? 0.8,
      distortion: opts.distortion ?? 0.03,
      puddleMap: opts.puddle ? T.art.puddle_mask : null,
      puddleScale: opts.puddleScale ?? 0.1,
      puddleDarken: 0.45,
      tint: opts.tint || 16777215
    });
    material.needsUpdate = true;
    return material;
  }
  makeMirror({ width, height, x, y, z, ry = 0, room = "bath" }) {
    const group = new Group();
    group.userData.dynamic = true;
    group.position.set(x, y, z);
    group.rotation.y = ry;
    const plane = new Object3D();
    plane.position.set(0, 0, 0);
    group.add(plane);
    const refl = new PlanarReflector(this.engine.renderer, this.scene, plane, {
      width: 512,
      height: 512,
      clipBias: 2e-3,
      extraLayers: [2]
    });
    const mat = mirrorMaterial(refl);
    const m = new Mesh(new PlaneGeometry(width, height), mat);
    group.add(m);
    refl.hide.push(m);
    this.mirrors.push({ refl, room, mesh: m });
    const f = new Group();
    group.add(f);
    for (const s of [-1, 1]) f.add(new Mesh(new BoxGeometry(0.035, height + 0.07, 0.04), M.woodBlack).translateX(s * (width / 2 + 0.02)));
    for (const s of [-1, 1]) f.add(new Mesh(new BoxGeometry(width + 0.08, 0.035, 0.04), M.woodBlack).translateY(s * (height / 2 + 0.02)));
    return { group, refl, mesh: m };
  }
  addMirror(mesh2, room) {
    mesh2.material = new MeshStandardMaterial({ color: 10133660, roughness: 0.06, metalness: 1, envMap: T.env, envMapIntensity: 0.9 });
  }
  volumetric(opts) {
    return null;
  }
  steam({ x, y, z, spread = 0.3, rise = 1.4, opacity = 0.1 }) {
    const N = 14;
    const group = new Group();
    const mat = new SpriteMaterial({
      map: T.art.soft_dot,
      color: 11450552,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: AdditiveBlending
    });
    const sprites = [];
    for (let i = 0; i < N; i++) {
      const s = new Sprite(mat.clone());
      s.position.set(x + rand(-spread, spread), y + Math.random() * rise, z + rand(-spread, spread));
      s.scale.setScalar(rand(0.4, 0.9));
      group.add(s);
      sprites.push({ s, life: Math.random() });
    }
    this.root.add(group);
    this.steamEmitters.push({ sprites, x, y, z, spread, rise, opacity });
  }
  makeRain(zone) {
    const N = 3200;
    const geo = new PlaneGeometry(0.0085, 0.34);
    const mat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: T.art.rain_streak }, uOpacity: { value: 0.36 } },
      vertexShader: `
      attribute vec3 aOffset; attribute float aSpeed; attribute float aSeed;
      uniform float uTime;
      varying vec2 vUv; varying float vFade; varying float vSeed;
      void main(){
        vUv = uv;
        vSeed = aSeed;
        vec3 p = aOffset;
        p.y = mod(aOffset.y - uTime * aSpeed, 11.0);
        p.x += sin(uTime * 0.6 + aSeed * 6.0) * 0.5 + (11.0 - p.y) * 0.045;
        p.z += 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
        float len = mix(0.55, 1.35, aSeed);
        mv.xyz += right * position.x + up * position.y * len;
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        vFade = smoothstep(26.0, 5.0, dist) * smoothstep(0.45, 1.6, dist);
      }`,
      fragmentShader: `
      uniform sampler2D uTex; uniform float uOpacity;
      varying vec2 vUv; varying float vFade; varying float vSeed;
      void main(){
        vec4 t = texture2D(uTex, vUv);
        float lum = mix(0.35, 1.15, fract(vSeed * 7.31));
        gl_FragColor = vec4(vec3(0.66, 0.74, 0.80) * lum, t.a * uOpacity * vFade);
      }`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending
    });
    const inst = new InstancedMesh(geo, mat, N);
    const off = new Float32Array(N * 3), spd = new Float32Array(N), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      off[i * 3] = rand(-9, 9);
      off[i * 3 + 1] = rand(0, 11);
      off[i * 3 + 2] = rand(-3, 9);
      spd[i] = rand(11, 16);
      seed[i] = Math.random();
    }
    inst.geometry.setAttribute("aOffset", new InstancedBufferAttribute(off, 3));
    inst.geometry.setAttribute("aSpeed", new InstancedBufferAttribute(spd, 1));
    inst.geometry.setAttribute("aSeed", new InstancedBufferAttribute(seed, 1));
    inst.frustumCulled = false;
    inst.userData.mat = mat;
    this.scene.add(inst);
    this.rain = inst;
    return inst;
  }
  // ---------------------------------------------------------------- per frame
  setRoom(id) {
    if (id === this.currentRoom) return;
    this.currentRoom = id;
    this.shadowDirty = true;
    this.applyKeyShadow(id);
    for (const fn of this.enterHooks[id] || []) fn();
    this.onRoomChange?.(id);
  }
  updateRoomLights(camera) {
    const active = /* @__PURE__ */ new Set([this.currentRoom]);
    for (const [id, arr] of Object.entries(this.lights)) {
      const on = active.has(id);
      for (const l of arr) l.visible = on;
    }
    this.activeLightRooms = active;
    if (this.shadowDirty) {
      this.engine.renderer.shadowMap.needsUpdate = true;
      this.shadowDirty = false;
    }
  }
  markShadowDirty() {
    this.shadowDirty = true;
  }
  update(dt, t, camera) {
    this.time = t;
    for (const fn of this.animators) fn(t, dt);
    this._updateLights(t);
    if (this.dust) this.dust.material.uniforms.uTime.value = t;
    const p = camera.position;
    let found = null, bestArea = Infinity;
    for (const [id, b] of Object.entries(this.rooms)) {
      if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y > (b.y0 || 0) - 0.8 && p.y < (b.y0 || 0) + 3) {
        const area2 = (b.x1 - b.x0) * (b.z1 - b.z0);
        if (area2 < bestArea) {
          bestArea = area2;
          found = id;
        }
      }
    }
    if (found) this.setRoom(found);
    this.updateRoomLights(camera);
    const r = this.engine.renderer;
    this.groundMirror.enabled = this.qualityRefl > 0 && (this.currentRoom === "alley" || this.currentRoom === "shop");
    this.upperMirror.enabled = this.qualityRefl > 0 && (this.currentRoom === "apt" || this.currentRoom === "bath" || this.currentRoom === "stairs");
    this._reflTick = (this._reflTick || 0) + 1;
    const doRefl = (this._reflTick & 1) === 0;
    if (this.groundMirror.enabled && doRefl) this.groundMirror.update(camera);
    if (this.upperMirror.enabled && doRefl) this.upperMirror.update(camera);
    const pr = this.engine.renderer.getPixelRatio();
    for (const m of this.mirrors) {
      m.refl.enabled = this.qualityRefl > 0 && m.room === this.currentRoom;
      const u = m.mesh?.material?.uniforms?.uResolution;
      if (u) u.value.set(window.innerWidth * pr, window.innerHeight * pr);
      if (m.refl.enabled && doRefl) m.refl.update(camera);
    }
    for (const p2 of this.puddles) {
      const nm = p2.mat.normalMap;
      if (nm) {
        nm.offset.x = Math.sin(t * 0.05 + p2.phase) * 0.1;
        nm.offset.y = t * 0.02;
      }
    }
    for (const v of this.volumes) {
      if (v.userData.mat) v.userData.mat.opacity = v.userData.baseOpacity * (0.85 + 0.15 * Math.sin(t * 0.7 + v.position.x));
    }
    for (const e of this.steamEmitters) {
      for (const s of e.sprites) {
        s.life += dt * 0.09;
        if (s.life > 1) s.life -= 1;
        const L = s.life;
        s.s.position.y = e.y + L * e.rise;
        s.s.position.x = e.x + Math.sin(L * 6 + s.s.id) * e.spread;
        s.s.material.opacity = e.opacity * Math.sin(L * Math.PI);
        s.s.scale.setScalar(0.45 + L * 0.9);
      }
    }
    if (this.rain) {
      this.rain.visible = this.currentRoom === "alley";
      this.rain.userData.mat.uniforms.uTime.value = t;
      this.rain.position.set(camera.position.x, 0, camera.position.z);
    }
  }
  _updateLights(t) {
    for (const arr of Object.values(this.lights)) {
      for (const l of arr) {
        const f = l.userData.flicker;
        if (!f) continue;
        let v = 1;
        const s = f.seed;
        if (f.pattern === "tube") {
          const n = Math.sin(t * 7.3 + s) * Math.sin(t * 2.1 + s * 1.7);
          v = n > 0.72 ? 0.18 + 0.2 * Math.random() : 1;
          if (Math.sin(t * 0.37 + s) > 0.985) v = 0.1;
        } else if (f.pattern === "neon") {
          const n = Math.sin(t * 11 + s) * Math.sin(t * 3.3 + s * 2.1);
          v = n > 0.6 ? 0.25 : 1;
        } else if (f.pattern === "flame") {
          v = 0.78 + 0.22 * Math.sin(t * 13 + s) + 0.1 * Math.sin(t * 31 + s * 3);
        } else if (f.pattern === "tv") {
          v = 0.5 + 0.5 * Math.abs(Math.sin(t * 9 + s) * Math.sin(t * 2.7));
        } else if (f.pattern === "bulb") {
          v = 0.85 + 0.15 * Math.sin(t * 20 + s);
          if (Math.sin(t * 1.7 + s) > 0.96) v *= 0.35;
        } else {
          v = 0.9 + 0.1 * Math.sin(t * f.speed * 3 + s);
        }
        l.intensity = l.userData.base * clamp2(v, f.min, f.max);
      }
    }
  }
  // ---------------------------------------------------------------- ground / collision
  /** Merge static meshes by material. Cuts thousands of draw calls to a few hundred. */
  optimizeStatic() {
    this.root.updateMatrixWorld(true);
    const buckets = /* @__PURE__ */ new Map();
    const walk = (o) => {
      if (o.userData.dynamic) return;
      if (o.isMesh && !o.isInstancedMesh && o.geometry && !o.material.transparent && o.visible) {
        const g = o.geometry;
        if (!g.attributes.position || !g.attributes.normal) {
        } else {
          const sig = Object.keys(g.attributes).sort().join(",") + "|" + (g.index ? "i" : "n") + "|" + o.material.uuid + "|" + (o.castShadow ? 1 : 0);
          if (!buckets.has(sig)) buckets.set(sig, { mat: o.material, cast: o.castShadow, geos: [], meshes: [] });
          const b = buckets.get(sig);
          const c = g.clone();
          c.applyMatrix4(o.matrixWorld);
          b.geos.push(c);
          b.meshes.push(o);
        }
      }
      for (const c of o.children) walk(c);
    };
    walk(this.root);
    let removed = 0;
    for (const b of buckets.values()) {
      if (b.meshes.length < 2) continue;
      try {
        const merged = mergeGeometries(b.geos, false);
        if (!merged) continue;
        const mesh2 = new Mesh(merged, b.mat);
        mesh2.castShadow = b.cast;
        mesh2.receiveShadow = true;
        this.root.add(mesh2);
        for (const m of b.meshes) {
          m.parent?.remove(m);
          removed++;
        }
      } catch (e) {
        console.warn("merge fail", e.message);
      }
    }
    console.log("optimizeStatic: merged", removed, "meshes ->", buckets.size, "buckets");
  }
  groundAt(x, z, yHint = 99) {
    const cands = [];
    if (z > 6) cands.push(0);
    if (x > -4.2 && x < 4.2 && z > -1.2 && z < 6.2) {
      cands.push(0);
      cands.push(3.6);
    }
    const S = this.stairs;
    if (S.active) {
      if (x > -1.75 && x < 1.75 && z <= -1.5 && z >= -4.6) cands.push(clamp2((-1.5 - z) / 3, 0, 1) * 1.8);
      if (z <= -4.5 && z > -6.55) cands.push(1.8);
      if (x > 0.34 && x < 1.75 && z <= -3.45 && z >= -6.5) cands.push(1.8 + clamp2((z + 6.5) / 3.05, 0, 1) * 1.8);
      if (x > 0.3 && z > -3.6 && z < -0.95) cands.push(3.6);
    }
    let best = 0;
    for (const c of cands) if (c <= yHint + 0.35 && c > best) best = c;
    return best;
  }
  blocked(x, z, r, y, height = 1.7) {
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (y + height < c.minY || y > c.maxY) continue;
      const cx = clamp2(x, c.minX, c.maxX), cz = clamp2(z, c.minZ, c.maxZ);
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }
};
function mirrorMaterial(refl) {
  return new ShaderMaterial({
    uniforms: {
      tReflect: { value: refl.rt.texture },
      uReflMatrix: { value: refl.textureMatrix },
      uTime: { value: 0 },
      uTint: { value: new Color(13160137) }
    },
    vertexShader: `
    varying vec3 vWPos; varying vec2 vUv;
    void main(){ vUv = uv; vWPos = (modelMatrix * vec4(position,1.0)).xyz;
      gl_Position = projectionMatrix * viewMatrix * vec4(vWPos,1.0); }`,
    fragmentShader: `
    uniform sampler2D tReflect; uniform mat4 uReflMatrix; uniform vec3 uTint; uniform float uTime;
    varying vec3 vWPos; varying vec2 vUv;
    void main(){
      vec4 rp = uReflMatrix * vec4(vWPos, 1.0);
      vec2 uv = rp.xy / max(rp.w, 0.0001);
      vec3 col = texture2D(tReflect, clamp(uv, 0.001, 0.999)).rgb;
      col *= uTint;
      // dust + silvering spots
      float a = fract(sin(dot(vUv*vec2(123.0,311.0), vec2(12.9898,78.233))) * 43758.5453);
      float spots = smoothstep(0.75, 1.0, a) * 0.18;
      col = mix(col, vec3(0.06,0.06,0.055), spots);
      float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
      col *= mix(0.55, 1.0, edge);
      gl_FragColor = vec4(col, 1.0);
    }`
  });
}
