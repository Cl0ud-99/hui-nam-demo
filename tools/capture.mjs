// tools/capture.mjs — 零依赖 CDP 截图工具（headless Chrome）
//
// 用法:
//   node tools/capture.mjs --out shots/alley.png --url "http://localhost:8899/?shot=-3.4,1.95,11.6,1.2,2.5,6.2"
//   node tools/capture.mjs --out shots/x.png --url "http://localhost:8899/" --eval "__manual=true" \
//        --eval "__W.camera.position.set(...)" --wait 2500
//   node tools/capture.mjs --batch tools/shots.json        # [{name,url,camera,look,room,wait}]
//
// 关键参数:
//   --seed N     固定 Math.random（同一 seed 下两次渲染逐像素可比）
//   --w/--h      视口尺寸，默认 1600x900
//   --settle ms  等待渲染完成，默认 4000
//   --chrome path 指定浏览器
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const many = (k) => argv.flatMap((a, i) => (a === '--' + k ? [argv[i + 1]] : []));
const flag = (k) => argv.includes('--' + k);

const CHROME = arg('chrome') || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('找不到 Chrome/Edge，请用 --chrome 指定');

const W = Number(arg('w', 1600));
const H = Number(arg('h', 900));
const SEED = arg('seed', null);
const SETTLE = Number(arg('settle', arg('wait', 4000)));

// ---------------------------------------------------------------- CDP client
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        (this.events.get(msg.method) || []).forEach((f) => f(msg.params, msg.sessionId));
      }
    };
  }
  send(method, params = {}, sessionId = undefined, timeout = 180000) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`CDP timeout: ${method}`));
      }, timeout);
      this.pending.set(id, { res, rej, timer });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  post(method, params = {}, sessionId = undefined) {
    this.ws.send(JSON.stringify({ id: ++this.id, method, params, ...(sessionId ? { sessionId } : {}) }));
  }
  on(method, fn) {
    if (!this.events.has(method)) this.events.set(method, []);
    this.events.get(method).push(fn);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huinam-shot-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${dir}`,
    `--window-size=${W},${H}`,
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--force-device-scale-factor=1',
    '--use-angle=d3d11',
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 200; i++) {
    if (fs.existsSync(portFile)) {
      const txt = fs.readFileSync(portFile, 'utf8').split('\n');
      if (txt[0] && txt[1]) return { proc, dir, ws: `ws://127.0.0.1:${txt[0]}${txt[1]}` };
    }
    await sleep(100);
  }
  throw new Error('Chrome 未启动');
}

const SEED_SRC = (seed) => `
(() => {
  let a = ${seed} >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

async function shoot(cdp, cfg, out) {
  const tgt = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const att = await cdp.send('Target.attachToTarget', { targetId: tgt.targetId, flatten: true });
  const sid = att.sessionId;
  await cdp.send('Page.enable', {}, sid);
  await cdp.send('Runtime.enable', {}, sid);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sid);
  if (cfg.seed !== undefined) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED_SRC(cfg.seed) }, sid);
  }
  const logs = [];
  cdp.on('Runtime.consoleAPICalled', (p) => {
    const line = p.args.map((a) => a.value ?? a.description ?? '').join(' ');
    if (logs.length < 40) logs.push(line);
  });
  cdp.on('Runtime.exceptionThrown', (p) => logs.push('EXC ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text)));
  cdp.on('Page.javascriptDialogOpening', () => {});
  await cdp.send('Page.navigate', { url: cfg.url }, sid);

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: 'typeof window.__W', returnByValue: true }, sid, 20000);
      if (r.result?.value === 'object') break;
    } catch { /* page busy */ }
    await sleep(700);
  }

  const evals = cfg.eval || [];
  for (const e of evals) {
    const rr = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: false }, sid, 120000).catch((err) => ({ __err: err.message }));
    if (process.env.SHOT_DEBUG) console.log('  eval ->', JSON.stringify(rr).slice(0, 300));
    await sleep(120);
  }
  // 等渲染稳定
  await sleep(cfg.settle ?? SETTLE);
  // 强制再渲染一帧并等待
  await cdp.send('Runtime.evaluate', {
    expression: `(() => { const W = window.__W; if (!W) return 'no W';
      if (W.world && W.engine) { W.engine.render(0.016); }
      return 'ok'; })()`,
    returnByValue: true,
  }, sid, 120000).catch(() => {});
  await sleep(400);

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  const stats = await cdp.send('Runtime.evaluate', {
    expression: `(() => { const W=window.__W; if(!W) return '{}';
      const r=W.engine.renderer; return JSON.stringify({calls:r.info.render.calls, tris:r.info.render.triangles,
      programs:r.info.programs.length, tex:r.info.memory.textures, geo:r.info.memory.geometries,
      ms: window.__lastMs||null}); })()`,
    returnByValue: true,
  }, sid, 20000).catch(() => ({ result: { value: '{}' } }));
  await cdp.send('Target.closeTarget', { targetId: tgt.targetId }).catch(() => {});
  cdp.post('Runtime.evaluate', { expression: 'window.__manual = true' }, sid);
  await sleep(500);
  let probe = { result: { value: 'null' } };
  for (let i = 0; i < 3; i++) {
    probe = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__probe ?? null)', returnByValue: true }, sid, 60000).catch((err) => ({ result: { value: 'ERR ' + err.message } }));
    if (!String(probe.result?.value || '').startsWith('ERR')) break;
    await sleep(600);
  }
  if (process.env.SHOT_DEBUG) console.log('  probe raw ->', JSON.stringify(probe).slice(0, 400));
  const consoleProbe = logs.filter((l) => l.startsWith('PROBE')).join(' | ');
  const errs = logs.filter((l) => l.includes('EXC') || /error/i.test(l)).slice(0, 5);
  return { out, stats: stats.result?.value, probe: consoleProbe || probe.result?.value, logs: errs };
}

// ---------------------------------------------------------------- main
const browser = await launch();
const cdp = new CDP(browser.ws);
await cdp.ready;

const jobs = [];
if (flag('batch')) {
  const list = JSON.parse(fs.readFileSync(arg('batch'), 'utf8'));
  for (const it of list) {
    const evals = [];
    if (it.manual !== false) evals.push('window.__manual = true');
    if (it.camera) evals.push(`window.__W.camera.position.set(${it.camera.join(',')})`);
    if (it.look) evals.push(`window.__W.camera.lookAt(${it.look.join(',')})`);
    if (it.room) evals.push(`window.__W.world.currentRoom = ${JSON.stringify(it.room)}; window.__W.world.updateRoomLights(window.__W.camera)`);
    if (it.before) evals.push(it.before);
    evals.push('window.__W.camera.updateMatrixWorld(); window.__W.engine.renderer.shadowMap.needsUpdate = true');
    evals.push('window.__W.world.update(0.016, ' + (it.t ?? 11) + ', window.__W.camera)');
    if (it.after) evals.push(it.after);
    jobs.push({
      out: path.join('shots', it.name + '.png'),
      cfg: { url: it.url || `http://localhost:${process.env.PORT || 8899}/?shot=-3.4,1.95,11.6,1.2,2.5,6.2`, eval: evals, seed: it.seed ?? Number(SEED ?? 1234), settle: it.settle },
    });
  }
} else {
  const out = arg('out', 'shots/shot.png');
  const url = arg('url', `http://localhost:${process.env.PORT || 8899}/`);
  const evals = many('eval');
  jobs.push({ out, cfg: { url, eval: evals, seed: SEED !== null ? Number(SEED) : undefined } });
}

const results = [];
for (const job of jobs) {
  try {
    const r = await shoot(cdp, job.cfg, job.out);
    results.push(r);
    console.log(`✔ ${r.out}  ${r.stats}${r.probe && r.probe !== 'null' ? '  PROBE ' + r.probe : ''}${r.logs?.length ? '  ' + r.logs.join(' | ') : ''}`);
  } catch (e) {
    console.log(`✘ ${job.out}  ${e.message}`);
  }
}

try { await cdp.send('Browser.close'); } catch {}
try { browser.proc.kill(); } catch {}
setTimeout(() => process.exit(0), 200);
