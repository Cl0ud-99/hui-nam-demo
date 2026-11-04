import { Color, DataTexture, LinearFilter, Matrix4, NoColorSpace, PerspectiveCamera, Plane, UnsignedByteType, Vector2, Vector3, Vector4, WebGLRenderTarget } from 'three';
export { PlanarReflector, WET_MATERIALS, wetify };

var WET_MATERIALS = [];
var DUMMY = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
DUMMY.needsUpdate = true;
var PlanarReflector = class {
  constructor(renderer, scene, planeObject, {
    width = 1024,
    height = 640,
    clipBias = 3e-3,
    extraLayers = [],
    hide = []
  } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.plane = planeObject;
    this.clipBias = clipBias;
    this.extraLayers = extraLayers;
    this.hide = hide;
    this.textureMatrix = new Matrix4();
    this.enabled = true;
    this.rt = new WebGLRenderTarget(width, height, {
      type: UnsignedByteType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
      generateMipmaps: false
    });
    this.rt.texture.colorSpace = NoColorSpace;
    this.virtualCamera = new PerspectiveCamera();
    this._normal = new Vector3();
    this._plane = new Plane();
    this._clip = new Vector4();
    this._q = new Vector4();
    this._view = new Vector3();
    this._target = new Vector3();
    this._look = new Vector3();
    this._rot = new Matrix4();
    this._camPos = new Vector3();
    this._pos = new Vector3();
    this._size = new Vector2(width, height);
  }
  setSize(w, h) {
    this.rt.setSize(w, h);
    this._size.set(w, h);
  }
  update(camera) {
    if (!this.enabled) return;
    const scope = this.plane;
    const renderer = this.renderer;
    scope.updateMatrixWorld();
    const normal = this._normal.set(0, 0, 1).applyMatrix4(this._rot.extractRotation(scope.matrixWorld)).normalize();
    const worldPos = this._pos.setFromMatrixPosition(scope.matrixWorld);
    const camPos = this._camPos.setFromMatrixPosition(camera.matrixWorld);
    const view = this._view.subVectors(worldPos, camPos);
    if (view.dot(normal) > 0) return;
    view.reflect(normal).negate().add(worldPos);
    const rot = this._rot.extractRotation(camera.matrixWorld);
    const look = this._look.set(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = this._target.subVectors(worldPos, look);
    target.reflect(normal).negate().add(worldPos);
    const vc = this.virtualCamera;
    vc.position.copy(view);
    vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal).normalize();
    vc.lookAt(target);
    vc.far = camera.far;
    vc.near = camera.near;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    this.textureMatrix.set(
      0.5,
      0,
      0,
      0.5,
      0,
      0.5,
      0,
      0.5,
      0,
      0,
      0.5,
      0.5,
      0,
      0,
      0,
      1
    );
    this.textureMatrix.multiply(vc.projectionMatrix);
    this.textureMatrix.multiply(vc.matrixWorldInverse);
    const plane = this._plane.setFromNormalAndCoplanarPoint(normal, worldPos);
    plane.applyMatrix4(vc.matrixWorldInverse);
    const clip = this._clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = vc.projectionMatrix;
    const q = this._q;
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1;
    q.w = (1 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1 - this.clipBias;
    pm.elements[14] = clip.w;
    vc.layers.mask = camera.layers.mask;
    for (const l of this.extraLayers) vc.layers.enable(l);
    const prevRT = renderer.getRenderTarget();
    const savedAmounts = [];
    for (const m of WET_MATERIALS) {
      const u = m.userData.wet;
      if (u) {
        savedAmounts.push([u.uReflAmount, u.uReflAmount.value, u.tReflect, u.tReflect.value]);
        u.uReflAmount.value = 0;
        u.tReflect.value = DUMMY;
      }
    }
    for (const mat of this.selfMaterials || []) {
      const u = mat.uniforms?.tReflect;
      if (u) {
        savedAmounts.push([null, null, u, u.value]);
        u.value = DUMMY;
      }
    }
    const hidden = [];
    for (const o of this.hide) {
      if (!o) continue;
      if (o.visible) {
        o.visible = false;
        hidden.push(o);
      }
    }
    renderer.setRenderTarget(this.rt);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(this.scene, vc);
    renderer.setRenderTarget(prevRT);
    for (const [u, v, texU, texV] of savedAmounts) {
      if (u) u.value = v;
      if (texU) texU.value = texV;
    }
    for (const o of hidden) o.visible = true;
  }
};
function wetify(material, {
  reflector,
  amount = 1,
  distortion = 0.045,
  puddleMap = null,
  puddleScale = 0.12,
  puddleDarken = 0.5,
  tint = 16777215,
  falloff = 3
} = {}) {
  const uniforms = {
    tReflect: { value: reflector.rt.texture },
    uReflMatrix: { value: reflector.textureMatrix },
    uReflAmount: { value: amount },
    uReflDistort: { value: distortion },
    uPuddleMap: { value: puddleMap },
    uPuddleScale: { value: puddleScale },
    uPuddleDarken: { value: puddleDarken },
    uReflTint: { value: new Color(tint) },
    uReflFalloff: { value: falloff },
    uReflDebug: { value: 0 },
    uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) }
  };
  material.userData.wet = uniforms;
  if (!WET_MATERIALS.includes(material)) WET_MATERIALS.push(material);
  material.userData.reflector = reflector;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;").replace("#include <project_vertex>", "#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vWPos;
      uniform sampler2D tReflect;
      uniform mat4 uReflMatrix;
      uniform float uReflAmount;
      uniform float uReflDistort;
      uniform sampler2D uPuddleMap;
      uniform float uPuddleScale;
      uniform float uPuddleDarken;
      uniform vec3 uReflTint;
      uniform float uReflFalloff;
      uniform float uReflDebug;
      uniform vec2 uResolution;
      float WetPuddle(vec2 p){ ${puddleMap ? "return texture2D(uPuddleMap, p * uPuddleScale).r;" : "return 1.0;"} }`).replace("#include <map_fragment>", `#include <map_fragment>
      float wetRaw = WetPuddle(vWPos.xz);
      float wetMask = wetRaw * uReflAmount;
      ${puddleMap ? "diffuseColor.rgb *= mix(1.0, 1.0 - uPuddleDarken, smoothstep(0.25, 0.80, wetRaw));" : ""}`).replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      // 湿的地方更光滑：让灯光在湿面上拉出高光
      roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.40, clamp(wetMask, 0.0, 1.0));`).replace("#include <opaque_fragment>", `{
        float puddle = WetPuddle(vWPos.xz);
        float pud = smoothstep(0.32, 0.78, puddle);
        vec3 vn = normalize(vNormal);
        vec2 ruv = gl_FragCoord.xy / uResolution;
        ruv += vn.xy * uReflDistort * (0.35 + puddle * 0.9);
        vec3 refl = texture2D(tReflect, clamp(ruv, 0.002, 0.998)).rgb * uReflTint;
        float ndv = clamp(dot(normalize(vViewPosition), vn), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 3.0);
        float amt = uReflAmount * (0.09 + 0.58 * pud) * (0.28 + 0.72 * fres);
        amt = clamp(amt, 0.0, 0.82);
        outgoingLight += refl * amt;
        if (uReflDebug > 0.5) outgoingLight = refl;
      }
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => "wet" + (puddleMap ? "P" : "C");
  return material;
}
