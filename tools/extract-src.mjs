// tools/extract-src.mjs — 一次性工具：把 dist/bundle.orig.js 还原成 src/ 模块树
// bundle 中保留了 `// src/xxx.js` 模块边界注释，据此切分并用 acorn 推断 import / export。
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { ancestor } from 'acorn-walk';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const BUNDLE = process.argv[2] || path.join(ROOT, 'dist/bundle.orig.js');
const raw = fs.readFileSync(BUNDLE, 'utf8').split(/\r?\n/);

const MASK = /^ {2}\/\/ (src\/[A-Za-z0-9_./-]+\.js|node_modules\/[A-Za-z0-9_./@-]+\.js)$/;

// ---------- 1. 按标记切分 ----------
const marks = [];
raw.forEach((line, i) => {
  const m = line.match(MASK);
  if (m) marks.push({ file: m[1], line: i });
});
const chunks = marks.map((m, k) => ({
  file: m.file,
  body: raw.slice(m.line + 1, k + 1 < marks.length ? marks[k + 1].line : raw.length),
}));
for (const c of chunks) {
  const cut = c.body.findIndex((l) => l === '})();' || l.startsWith('/*! Bundled license information'));
  if (cut >= 0) c.body = c.body.slice(0, cut);
}

// ---------- 2. three 导出名 ----------
const threeChunk = chunks.find((c) => c.file === 'node_modules/three/build/three.module.js');
const threeExports = new Set();
{
  const block = threeChunk.body.join('\n').match(/__export\(three_module_exports, \{([\s\S]*?)\n {2}\}\);/);
  if (!block) throw new Error('three export list not found');
  for (const m of block[1].matchAll(/^ {4}([A-Za-z0-9_$]+): \(\) =>/gm)) threeExports.add(m[1]);
}

// ---------- 3. addon 导出名 ----------
const ADDONS = {
  EffectComposer: 'three/examples/jsm/postprocessing/EffectComposer.js',
  Pass: 'three/examples/jsm/postprocessing/Pass.js',
  RenderPass: 'three/examples/jsm/postprocessing/RenderPass.js',
  ShaderPass: 'three/examples/jsm/postprocessing/ShaderPass.js',
  MaskPass: 'three/examples/jsm/postprocessing/MaskPass.js',
  ClearMaskPass: 'three/examples/jsm/postprocessing/MaskPass.js',
  UnrealBloomPass: 'three/examples/jsm/postprocessing/UnrealBloomPass.js',
  SMAAPass: 'three/examples/jsm/postprocessing/SMAAPass.js',
  GTAOPass: 'three/examples/jsm/postprocessing/GTAOPass.js',
  RGBELoader: 'three/examples/jsm/loaders/RGBELoader.js',
  RectAreaLightUniformsLib: 'three/examples/jsm/lights/RectAreaLightUniformsLib.js',
  mergeGeometries: 'three/examples/jsm/utils/BufferGeometryUtils.js',
  mergeVertices: 'three/examples/jsm/utils/BufferGeometryUtils.js',
  CopyShader: 'three/examples/jsm/shaders/CopyShader.js',
  LuminosityHighPassShader: 'three/examples/jsm/shaders/LuminosityHighPassShader.js',
  SMAAShader: 'three/examples/jsm/shaders/SMAAShader.js',
  GTAOShader: 'three/examples/jsm/shaders/GTAOShader.js',
  PoissonDenoiseShader: 'three/examples/jsm/shaders/PoissonDenoiseShader.js',
  SimplexNoise: 'three/examples/jsm/math/SimplexNoise.js',
};

const GLOBALS = new Set(`window document console Math Date Object Array Number String Boolean JSON Promise Map Set WeakMap WeakSet
Float32Array Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float64Array ArrayBuffer DataView
Error TypeError RangeError Symbol Proxy Reflect BigInt parseInt parseFloat isNaN isFinite NaN Infinity undefined
globalThis performance requestAnimationFrame cancelAnimationFrame setTimeout clearTimeout setInterval clearInterval
localStorage sessionStorage location history navigator screen AudioContext webkitAudioContext OfflineAudioContext
AudioBuffer Blob URL URLSearchParams fetch Image HTMLElement HTMLCanvasElement HTMLImageElement Event KeyboardEvent
MouseEvent PointerEvent Worker TextDecoder TextEncoder DOMParser XMLHttpRequest CustomEvent ResizeObserver
IntersectionObserver MutationObserver crypto structuredClone queueMicrotask Audio atob btoa alert matchMedia
devicePixelRatio innerWidth innerHeight getComputedStyle File FileReader FormData MediaRecorder MediaStream
document frames parent top self addEventListener removeEventListener dispatchEvent eval Function RegExp
encodeURIComponent decodeURIComponent Intl`.split(/\s+/).filter(Boolean));

// ---------- 4. 逐模块分析 ----------
const mods = new Map();
for (const c of chunks) {
  if (!c.file.startsWith('src/')) continue;
  const kept = c.body.filter((l) => l.trim() !== 'init_three_module();');
  if (!kept.join('').trim()) continue;
  const prev = mods.get(c.file);
  mods.set(c.file, { lines: prev ? prev.lines.concat(kept) : kept });
}

function patternNames(p, set) {
  if (!p) return;
  switch (p.type) {
    case 'Identifier': set.add(p.name); break;
    case 'ObjectPattern': for (const q of p.properties) patternNames(q.value || q.argument, set); break;
    case 'ArrayPattern': for (const q of p.elements) patternNames(q, set); break;
    case 'AssignmentPattern': patternNames(p.left, set); break;
    case 'RestElement': patternNames(p.argument, set); break;
  }
}

const info = new Map();
for (const [file, { lines }] of mods) {
  const body = lines.join('\n');
  const ast = acorn.parse(body, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
  const decls = new Set();
  const uses = new Set();
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) patternNames(d.id, decls);
    else if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) decls.add(node.id.name);
  }
  ancestor(ast, {
    Identifier(node, _st, parents) {
      const parent = parents[parents.length - 2];
      if (!parent) return;
      if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
      if ((parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && parent.key === node && !parent.computed) return;
      if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') return;
      uses.add(node.name);
    },
  });
  info.set(file, { body, lines, decls, uses });
}

const owners = new Map();
for (const [file, { decls }] of info) {
  for (const d of decls) {
    if (!owners.has(d)) owners.set(d, []);
    owners.get(d).push(file);
  }
}

// ---------- 5. 推断 import/export ----------
const report = [];
const plan = [];
const needExport = new Map();
const addExport = (mod, name) => {
  if (!needExport.has(mod)) needExport.set(mod, new Set());
  needExport.get(mod).add(name);
};

for (const [file, { body, lines, decls, uses }] of info) {
  const fromThree = new Set();
  const fromAddon = new Map();
  const fromSrc = new Map();
  const unresolved = new Set();
  for (const u of uses) {
    if (decls.has(u) || GLOBALS.has(u)) continue;
    if (threeExports.has(u)) { fromThree.add(u); continue; }
    if (ADDONS[u]) {
      if (!fromAddon.has(ADDONS[u])) fromAddon.set(ADDONS[u], new Set());
      fromAddon.get(ADDONS[u]).add(u);
      continue;
    }
    const own = (owners.get(u) || []).filter((o) => o !== file);
    if (own.length === 1) {
      if (!fromSrc.has(own[0])) fromSrc.set(own[0], new Set());
      fromSrc.get(own[0]).add(u);
      addExport(own[0], u);
      continue;
    }
    if (own.length > 1) { report.push(`AMBIG ${file}: ${u} -> ${own.join(', ')}`); continue; }
    unresolved.add(u);
  }
  plan.push({ file, body, lines, decls, fromThree, fromAddon, fromSrc, unresolved });
}

const relPath = (from, target) => {
  let r = path.posix.relative(path.posix.dirname(from), target);
  if (!r.startsWith('.')) r = './' + r;
  return r;
};

for (const { file, body, decls, fromThree, fromAddon, fromSrc, unresolved } of plan) {
  const head = [];
  if (fromThree.size) head.push(`import { ${[...fromThree].sort().join(', ')} } from 'three';`);
  for (const [p, names] of [...fromAddon].sort()) head.push(`import { ${[...names].sort().join(', ')} } from '${p}';`);
  for (const [p, names] of [...fromSrc].sort()) head.push(`import { ${[...names].sort().join(', ')} } from '${relPath(file, p)}';`);
  const ex = [...(needExport.get(file) || [])].filter((n) => decls.has(n)).sort();
  if (ex.length) head.push(`export { ${ex.join(', ')} };`);

  let code = body
    .split('\n')
    .map((l) => l.replace(/^ {2}/, '').replace(/\r$/, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .trimEnd();

  if (code.includes('three_module_exports')) {
    code = code.replace(/three_module_exports/g, 'THREE');
    head.unshift("import * as THREE from 'three';");
  }
  if (code.includes('init_RGBELoader')) {
    code = code.replace(/const \{ RGBELoader: RGBELoader2 \} = await Promise\.resolve\(\)\.then\(\(\) => \(init_RGBELoader\(\), RGBELoader_exports\)\);\n\s*/g, '');
    code = code.replace(/RGBELoader2/g, 'RGBELoader');
    head.unshift("import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';");
  }

  const out = head.join('\n') + (head.length ? '\n\n' : '') + code + '\n';
  const dest = path.join(SRC, file.replace(/^src\//, ''));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);

  const leftovers = [...unresolved].filter((u) => !/^[A-Z_][A-Z0-9_]*$/.test(u));
  if (leftovers.length) report.push(`UNRESOLVED ${file}: ${leftovers.join(', ')}`);
}

console.log([...info].map(([f, v]) => `${f.padEnd(28)} ${String(v.lines.length).padStart(5)} lines`).join('\n'));
if (report.length) console.log('\n--- 需人工复核 ---\n' + report.join('\n'));
console.log(`\nmodules=${info.size} threeExports=${threeExports.size} exports=${[...needExport.values()].reduce((a, s) => a + s.size, 0)}`);
