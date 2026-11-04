export { GradeShader };

var GradeShader = {
  name: "GradeShader",
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1 },
    uTime: { value: 0 },
    uVignette: { value: 1 },
    uGrain: { value: 0.045 },
    uAged: { value: 0.6 },
    uGrainTV: { value: 0 },
    uCA: { value: 16e-4 },
    uSat: { value: 0.9 },
    uFade: { value: 0 },
    uShadowTint: { value: [0.035, 0.055, 0.055] },
    uHighTint: { value: [0.035, 0.018, -0.012] },
    uRes: { value: [1920, 1080] },
    uPulse: { value: 0 }
  },
  vertexShader: (
    /* glsl */
    `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`
  ),
  fragmentShader: (
    /* glsl */
    `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform float uExposure, uTime, uVignette, uGrain, uCA, uSat, uFade, uPulse, uAged, uGrainTV;
  uniform vec3 uShadowTint, uHighTint;
  uniform vec2 uRes;
  varying vec2 vUv;

  vec3 RRTAndODTFit(vec3 v){
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }
  vec3 ACESFilmic(vec3 color){
    const mat3 ACESInputMat = mat3(
      vec3(0.59719, 0.07600, 0.02840),
      vec3(0.35458, 0.90834, 0.13383),
      vec3(0.04823, 0.01566, 0.83777));
    const mat3 ACESOutputMat = mat3(
      vec3( 1.60475, -0.10208, -0.00327),
      vec3(-0.53108,  1.10813, -0.07276),
      vec3(-0.07367, -0.00605,  1.07602));
    color = ACESInputMat * color;
    color = RRTAndODTFit(color);
    color = ACESOutputMat * color;
    return clamp(color, 0.0, 1.0);
  }
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  // 無週期哈希（Dave Hoskins）：整數座標 + 幀種子，避免出現固定花紋
  float hash13(vec3 p3){
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  // 平滑值噪聲：做出「團塊」而不是每像素亂點，像底片顆粒
  float grainNoise(vec2 p, float seed){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash13(vec3(i, seed));
    float b = hash13(vec3(i + vec2(1.0, 0.0), seed));
    float c = hash13(vec3(i + vec2(0.0, 1.0), seed));
    float d = hash13(vec3(i + vec2(1.0, 1.0), seed));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main(){
    vec2 uv = vUv;
    vec2 d = uv - 0.5;
    float r2 = dot(d, d);

    // chromatic aberration scaled to the frame edge
    float ca = uCA * (0.35 + r2 * 2.2);
    vec3 col;
    col.r = texture2D(tDiffuse, uv + d * ca).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv - d * ca).b;

    col *= uExposure * (1.0 + uPulse);
    col = max(col, vec3(0.0));

    // ---- 分离色调：暗部偏青、亮部偏暖（湿冷夜戏的关键） ----
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float shadowW = 1.0 - smoothstep(0.0, 0.26, luma);
    float highW = smoothstep(0.42, 1.5, luma);
    col = mix(col, col * vec3(0.86, 1.01, 1.16), shadowW * 0.62);
    col = mix(col, col * vec3(1.10, 1.00, 0.88), highW * 0.50);
    // 暗部稍微降饱和，亮部保持
    float luma2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma2), col, mix(uSat * 0.82, uSat, smoothstep(0.0, 0.35, luma2)));

    col = ACESFilmic(col * 1.02);

    // 胶片曲线：S 曲线 + 轻抬黑位
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.28);
    col = col * 0.965 + 0.0095;

    float vig = smoothstep(0.95, 0.15, length(d) * (1.0 / uVignette));
    col *= mix(0.50, 1.0, vig);

    // ---- 舊片濾鏡：發黃、褪色、投影機微閃、偶發劃痕 ----
    if (uAged > 0.001) {
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 sep = vec3(l) * vec3(1.13, 0.98, 0.73);
      col = mix(col, sep, 0.30 * uAged);
      col = mix(vec3(l), col, 1.0 - 0.10 * uAged);
      col += vec3(0.010, 0.008, 0.0035) * uAged;
      float flick = hash(vec2(floor(uTime * 14.0), 7.3)) - 0.5;
      col *= 1.0 + flick * 0.045 * uAged;
      float scratch = step(0.9975, hash(vec2(floor(uv.x * 720.0), floor(uTime * 2.0))));
      col += scratch * vec3(0.10, 0.09, 0.06) * uAged;
      col *= mix(1.0, vig, 0.25 * uAged);
    }

    // grain：兩層平滑團塊 + 一點水平拖尾，逐幀換種子（不會看到固定花紋）
    float tRate = mix(24.0, 12.0, uGrainTV);
    float t24 = floor(uTime * tRate);
    vec2 gpix = gl_FragCoord.xy;
    float sc = mix(0.72, 0.26, uGrainTV);
    float gFine = grainNoise(gpix * sc, t24) - 0.5;
    float gLump = grainNoise(gpix * (sc * 0.42), t24 + 19.0) - 0.5;
    float rowN = hash13(vec3(mix(gpix.y, floor(gpix.y * 0.5), uGrainTV), t24, 5.5)) - 0.5;
    float grain = gFine * 0.95 + gLump * 0.55;
    grain = mix(grain, rowN, mix(0.10, 0.45, uGrainTV));
    // TV 模式：顆粒更硬、對比更高
    grain = mix(grain, sign(grain) * pow(abs(grain) * 2.0, 0.72) * 0.5, uGrainTV);
    float shadowMask = 1.0 - smoothstep(0.0, 0.78, dot(col, vec3(0.33)));
    col += grain * uGrain * (0.55 + 0.75 * shadowMask);

    // linear -> sRGB
    col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
    col *= (1.0 - uFade);
    gl_FragColor = vec4(col, 1.0);
  }
`
  )
};
