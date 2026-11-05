// tools/manifest.mjs — 生成 SRC-MANIFEST.txt（用于两台机器之间校验源码是否一致）
// 用法：node tools/manifest.mjs [--check]
//   --check  与现有 SRC-MANIFEST.txt 比对，不一致时退出码 1（可用于 CI / 交接前自检）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'SRC-MANIFEST.txt');
const check = process.argv.includes('--check');

const roots = ['src'];
const files = [];
const walk = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, f));
  } else {
    files.push(rel);
  }
};
roots.forEach(walk);
for (const f of ['index.html', 'package.json', 'server.js', 'tools/manifest.mjs', 'tools/build.mjs', 'tools/capture.mjs', 'tools/shots.json', 'dist/bundle.js']) {
  if (fs.existsSync(path.join(ROOT, f))) files.push(f);
}

const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const lines = files.sort().map((f) => `${sha(f)}  ${f}`);
const body = `# HUI NAM 源碼清單（sha256）— 由 tools/manifest.mjs 生成\n# 校驗：sha256sum -c SRC-MANIFEST.txt\n${lines.join('\n')}\n`;

if (check) {
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev !== body) {
    console.error('✘ SRC-MANIFEST.txt 與當前檔案不一致，請執行 node tools/manifest.mjs');
    process.exit(1);
  }
  console.log('✔ 源碼與 SRC-MANIFEST.txt 一致（' + lines.length + ' 個檔案）');
} else {
  fs.writeFileSync(OUT, body);
  console.log('✔ 已寫入 SRC-MANIFEST.txt（' + lines.length + ' 個檔案）');
}
