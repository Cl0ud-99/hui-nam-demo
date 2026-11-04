# 回南 HUI NAM — 进度日志（给新会话预读）

> 更新：2026-11-04。读这份文件即可接手，无需翻旧会话。

## 0. 一句话现状

游戏本体可完整通关（后巷→药行→后楼梯→三楼→点香→浴室镜子→睡房结局），碰撞已补齐并经寻路验证，性能卡帧已修复（转身 0 帧 >33ms），公网地址已上线（GitHub Pages）。宣传片是旧版（后巷封闭前），尚未重渲。

## 1. 路径与环境

| 内容 | 路径 |
|---|---|
| 源码（three@0.169 + esbuild） | `D:\HermesWorkspace\hk-horror` |
| Web/Git 仓库（推 GitHub 用） | `D:\HermesWorkspace\hk-horror-web`（remote: `Cl0ud-99/hui-nam-demo`，分支 `main`） |
| 交付目录 | `D:\HermesWorkspace\HUI-NAM-DELIVERY`（zip 208MB / trailer 64s / walkthrough 视频 / stills） |
| 公网地址 | https://cl0ud-99.github.io/hui-nam-demo/ （Pages: main/root，已开） |
| 本地服务器 | `node server.js` → http://localhost:8777/ |
| 构建 | `npm run build` → `dist/bundle.js`（~2MB） |

注意：`hk-horror` 本身不是 git 仓库；git 在 `hk-horror-web`。资源（assets/tex 202MB）只在 web 仓库里有一份，源码仓库不重复推。**D 盘已用 93%（剩 55G），大文件别乱堆。**

## 2. 已完成（按主题）

### 场景/美术
- 后巷封闭化：26m→16.8m，两端楼房+铁闸封死，头顶 4.5m 天桥（带窗/灯/晾衫）+ 3.15m 铁皮檐棚；通道用垃圾桶/卡板/木箱收窄到 ~3m。
- 药行外立面（x −4~4、y 3.3–11.3）：此前整块缺失（往上看是天空）。现已补：两个窗洞与三楼室内窗**严格对齐**、内凹窗套、窗台+滴水槽、铁枝防盗网（左窗）、布帘（右窗，`hangingCloth` 双面材质）、马赛克墙裙、楼板腰线、雨篷+霓虹管、冷气机×2（带滴水锈痕）、晾衣竹竿、卫星锅、线管/接线盒、电缆、照墙灯×2（`keep` 标记）。
- 药行门头：门框从 2.45m 加高到 **2.85m**（对齐橱窗上沿），补了门头横档+抹灰填充——之前门上方 2.45–3.0 是空的，能看进店里。
- 碰撞/寻路相关修复见 §3。

### 剧情
- 五段流程全通：后巷 → 药行（穿過藥行，行後樓梯）→ 後樓梯（樓梯剪影 jump scare，0.4s）→ 三楼点三炷香（第三炷「保你返唔到去」）→ 浴室镜子（盯 1s 触发镜中人）→ 睡房（门自开，黑影贴脸→黑屏→字卡「回南」）。
- 单结局，无失败判定，5–8 分钟。字幕/任务文案在 `src/world/story.js`、`story.start()`。

### 碰撞（本轮重点，已验证）
- 楼梯间两侧墙全高碰撞体（原来左边只有 6cm 条、右边完全没有 → 能穿墙出场景）。
- 楼梯井栏杆碰撞（x 0.26–0.38，y≥3.6）；后墙碰撞。
- **修掉一个会堵死流程的 bug**：楼梯间南墙碰撞体原本从地通到顶（0–6.6m），把三楼门洞 0.55–1.55 也挡住，只剩 17cm 缝。已限高到 3.6m。
- 道具体积碰撞：神台/沙发/电视柜/衣柜/床（apartment）、洗手台（bathroom）、信箱+神龛（stairs）、垃圾桶/卡板/木箱（alley，早前已有）。
- **寻路验证工具**：0.1m 网格 + `world.blocked()` 洪水填充。结果：地面 14,168 可达格（后巷→店门→药行→后门全通）；楼梯最高达 y=3.6（平台），**越界格 0**；三楼 门/神台/浴室/睡房 四点全可达。工具：`tools/nav3.json`、`nav4.json`、`nav5.json`、`nav6.json`（capture.mjs 跑）。

### 性能（用户体感「走两步卡一下」的根因与修法）
- 根因：灯数随距离开关 → 全场景 shader 重编译（实测单帧 **12,655ms**）。
- 修法（保持视觉的前提下）：
  - `World.normalizeLights(14)`：每间房固定 14 盏灯，不足补 0 强度虚拟灯 → **全场只有一套 shader 变体**（program 数 121，进出房间不变）。重要灯用 `{keep:true}` 保护（楼梯灯、照墙灯、药行擦光），门面共用的灯用 `{global:true}`（药行光管+灯泡，让店从街上透光）。
  - 每房只留主灯投影（key light），`renderer.shadowMap.autoUpdate = false`，换房/开门时 `needsUpdate`。
  - 反射 RT 改 8-bit + 30Hz 更新（world.js `_reflTick`）。
  - 启动预热：每间房**朝 6 个方向** `compile+render`（防首次转头编译卡顿）+ 全量 `initTexture`。
  - 水洼软边 alpha（CanvasTexture 径向渐变），修掉黑色矩形水洼。
- 实测：原地转 360°，后巷 med 4.1ms / p95 12.1 / max 21.1，**0 帧 >33ms**；药行 4.9/7.1/11.6；三楼 5.3/7.5/17.3。

### 视觉修补（用户逐条报过的）
- 三楼窗错位：`apartment.js` 窗框中心 0.4 → 1.65（对齐墙洞 0.4–2.9）；外墙不再叠第二层窗框，直接看进室内窗。
- 楼梯间门洞镜像 bug：`wallGroup` 开口是**局部坐标 0..w**，南墙转了 π，世界 x = cx −(u − w/2)。门洞局部 2.35–3.35 实际落在 x −0.55~−1.55（与门相反）。已改为局部 0.25–1.25。
- 门口黑块：是未打灯的店内，加灯解决（不是几何破面）。

## 3. 已知的坑（新会话必读）

1. **改灯数量 = 全场景重编译**。加/删灯必须保持每房间数量一致（用 keep/global 标记 + 14 盏配额），否则回头 12 秒级卡帧。
2. `hangingCloth(w, h, mat)` 第三参是**材质**，传数字会得到 undefined 材质 → `WeakMap` 报错（踩过）。
3. 墙（wallGroup）后面不能垫整块背板，会盖住窗洞 → 用两侧薄边条。
4. 反射 RT 别用 HalfFloat；更新别每帧（30Hz 足够）。
5. `makeDoor` 的 collider.enabled 随开/关切换；nav 测试要先把门全开（遍历 interactables 调 `use()`）。
6. `world.groundAt` 是解析式（巷 0 / 店 0或3.6 / 楼梯坡道公式），改楼梯几何要同步改它。
7. `optimizeStatic` 会按材质合并 mesh，单体调试用 `?nomerge=1`。
8. 截图含 DOM 字幕/字卡要用 **CDP `Page.startScreencast`**（`canvas.captureStream` 只有 WebGL 画面，没有字幕和字卡）。音频用 `audio.master` 接 `MediaStreamDestination`。
9. 服务器 `server.js` 有 `POST /__save`（录制用），公开部署（Pages）不执行它，无风险。
10. 这台机的网络对隧道极不友好（tunnelmole ECONNRESET / localtunnel 502 / serveo 截断 224KB），**别再折腾隧道**，公网就用 GitHub Pages。

## 4. 常用命令

```bash
cd /d/HermesWorkspace/hk-horror
npm run build                       # 打包
node server.js                      # 8777
node tools/capture.mjs tools/xx.json   # 批量截图/注入JS
#   item: {"out":"shots/x.png","shot":"x,y,z,lx,ly,lz","wait":7000,"js":"...","after":900}
#   或 {"url":"?autoplay=1","js":"..."}   （capture.mjs 已支持 item.url）
node tools/test_game.mjs            # 全流程回归（房间/楼梯高度/点香/镜子/结局）
node tools/nav_all.json 之类        # 寻路可达性（见 tools/nav*.json）
node tools/walkthrough3.mjs         # 录通关视频（POST /__save 存到 shots/video/）
ffmpeg -y -i shots/video/walkthrough.webm -c:v libx264 -preset medium -crf 25 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4
```

推 GitHub 的流程（改完代码后）：
```bash
cp hk-horror/dist/bundle.js hk-horror/index.html hk-horror/server.js hk-horror/README.md  # 按需
cd hk-horror-web && git add -A && git commit -m "..." && git push origin main
```

## 5. 未完成 / 下一步（按优先级）

1. **宣传片重渲**：现有 64s trailer 是后巷封闭前的版本，已过时。运镜脚本 `tools/trailer.mjs`（START/END 分段跑，12fps，`genaudio.py` 生成音轨）。录好的 walkthrough（2:26，见 DELIVERY）可先顶着。
2. **后巷两侧瓦楞铁墙细节**：接缝、锈斑、墙筋；目前偏平。
3. **水洼形状**：现在是椭圆软边，应做不规则连片 + 边缘积水线。
4. **招牌质感**：字体排版、灯箱/霓虹描边、玻璃反光。
5. **二楼外立面**：窗台进深/滴水已做，可再加空调滴水长痕、墙面分色、阳台。
6. **无惊吓剧情模式**（用户胆小，想要过）：楼梯剪影改远景背影、结尾改关门，字幕全保留；做成 `?story=1` 或菜单选项。
7. **清理**：`tools/walkthrough.mjs`（旧）与 `walkthrough3.mjs`（现役）重复，合并后删旧；`tools/perf*.json`、`nav*.json` 是一次性脚本可归档。
8. 性能后备手段（如果用户机仍卡）：画质「中/低」已支持（关 GTAO/降反射）；可再加 GTAO 半分辨率。

## 6. 关键坐标 / 参数速查

- `ALLEY {x0:-8.4,x1:8.4,z0:6,z1:14}`；`SHOP {-4,4,-1,6,h3.45}`；`STAIR {-1.8,1.8,-6.6,-1,h6.6}`；`APT y0=3.6 h2.95`；`BATH {1.75,4,3.05,5.3}`。
- 出生点 (6.2, 0, 10.6)；药行门洞 x 0.68–1.66；三楼门洞 x 0.55–1.55（y≥3.6）；浴室门 x=1.75、z 3.66–4.48。
- 灯光：`World.normalizeLights(14)`，`keyFor[room]` 是每房投影主灯；`globalLights` 2 盏（药行光管+灯泡）。
- 楼梯 climb 公式在 `world.groundAt`（两段坡道 + 平台 y=1.8/3.6）。
- 主菜单画质档：high/medium/low（engine.js QUALITY 表）。

## 7. 验证清单（改动后必跑）

```bash
npm run build
node tools/test_game.mjs          # 全流程，errs 必须为 []
node tools/capture.mjs tools/nav4.json   # 三层可达性（opened≥4, 上层4点全 true）
node tools/capture.mjs tools/turn_rooms.json  # 转身帧时间，over33 应为 0
```

## 8. 本机会话记录（2026-11-04 晚，非 D 盘那台机）

**本机没有 `D:\HermesWorkspace\hk-horror`**（D 盘只有素材工程）。用 GitHub 上的 `dist/bundle.js` 反推了完整 `src/`（21 模块 / 5841 行），并与 §2/§6 的硬指标逐条对齐：
`normalizeLights(cap=14)`、楼梯南墙门洞局部 `0.25–1.25`、碰撞 `maxY 3.6`、药行门头 `2.85`、`ALLEY 16.8` —— 全部一致，说明 GitHub bundle 就是最新源码的构建产物，这份 `src/` 可直接覆盖回 D 盘源码树。

- 工作目录：`C:\Users\Administrator\Desktop\hui-nam-demo`（git 已接 `Cl0ud-99/hui-nam-demo`，本地提交未 push）
- 新增 `tools/build.mjs`（esbuild）、`tools/capture.mjs`（零依赖 CDP 截图；`--seed` 固定 `Math.random`；`--eval` 里 `console.log('PROBE '+...)` 可做断言，Node 侧会回读输出）
- **§5-6 已完成：无惊吓剧情模式**
  - 入口：`?story=1` / `?gentle=1` / 主菜单 `04 模式`（localStorage `huinam_gentle`）
  - 楼梯：鬼影改到远处平台 `z=-5.55`，停留 2.6s，无 sting / 无 shake
  - 镜：只出字幕「鏡裡面……只有你自己。」，不出鬼、不 screech
  - 结局：不出鬼、不 screech，改「房門慢慢關上」+ 淡出字卡；字幕全保留
  - 验证：`?story=1` → `gentle:true / ghostZ:-5.55 / mirrorGhost:false / 菜单标签 溫和`；无参数 → `ghostZ:-2.4 / mirrorGhost:true`（原惊吓未回归）
- 另有第一轮画面调校（可与剧情改动分开回退）：分离色调、湿地面反射（Fresnel^3 + puddle smoothstep）、雨（3200 滴/更细/近处淡出）、柜台改木纹、出生点 `(4.8,0,11.6) yaw 0.72`、一盏全局冷色 DirectionalLight（不占每房 14 盏配额，program 数仍 129）

未做：宣传片重渲（§5-1）、瓦楞铁墙（§5-2）、水洼形状（§5-3）、招牌（§5-4）、二楼外立面（§5-5）、tools 清理（§5-7）。

### 8.1 已发布（2026-11-04 晚）

- 已 push 到 `Cl0ud-99/hui-nam-demo` main：`b10b47c..870f22c`
- Pages 已重建完成：`index.html` 含「線上版 ONLINE」链接，`dist/bundle.js` 1,983,830 B（Last-Modified 2026-11-04 09:56 GMT）
- 公网实测：`?story=1` → 菜单第 4 项显示「溫和」、`story.gentle=true`、boot 正常隐藏（headless 截图 `shots/live_pages.png`）
- 主菜单现为 5 项：開始 / 宣傳片 / 畫質 / 模式 / 操作，下方为線上版链接

### 8.2 README 画面（2026-11-04 晚）
- 新增 `docs/screens/`：menu / shopfront / shop_interior / stairs / altar / bath / trailer 共 7 张（1440×810，JPEG q84，合计约 1.4 MB）
- README 增加「## 畫面」区块：主菜单大图 + 3×2 网格 + 说明（1600×900 高画质实机截图）
- 顺带修掉"满屏白色亮点"：`world.js` 尘埃粒子 `gl_PointSize` 由 `(1.2+aSeed*2.4)*(14/-z)` 改为 `clamp((0.7+aSeed*1.6)*(5/-z),0.8,5.0)`，透明度 0.35→0.22，并加 0.8–2.4m 近处淡出

### 8.3 旧片滤镜 + 噪点（2026-11-04 晚，**未 push**）
- `gradeShader.js` 新增 `uAged`（0–1，默认 0.6）：泛黄分离（sepia mix 0.30）、褪色 0.10、暗部加暖雾 0.010/0.008/0.0035、投影机微闪 4.5%、偶发竖向划痕、旧镜头暗角叠加 0.25
- 噪点从 0.026 提到 0.07，改为两层（主粒 + 细粒），暗部权重 0.45–1.0
- URL 实时调参：`?aged=0.35`、`?grain=0.09`；或运行时 `__W.engine.grade.uniforms.uAged.value = 0.8`
- 四档对照图：`shots/grade_presets.jpg`（0 / 0.35 / 0.6 / 0.85）
- 线上 Pages 仍是旧观感（本次未 push）

### 8.4 噪点"重复感"修复（2026-11-04 晚，**未 push**）
根因两个：
1. `index.html` 的 `#grain` 图层是 **180×180 SVG turbulence 平铺**（opacity .028，steps(3) 三帧跳变）——肉眼看就是"小贴图一直重复"。已整个删除。
2. `gradeShader.js` 原 `hash()` 用 `fract(p*vec2(123.34,456.21))`，在像素坐标下有 **x 50px / y 100px 周期**（0.34×50、0.21×100 恰为整数），所以颗粒花紋会规律重复。
改法：`hash13()`（Dave Hoskins，3D 含帧种子）+ 平滑值噪声两级：
- 主粒 `grainNoise(px*0.72)`、大团 `grainNoise(px*0.30)`、10% 水平拖尾，24fps 换种子
- `uGrain` 默认 0.026 → **0.045**；暗部权重 0.55–1.3
- 新增 `?tv=1`：12fps、尺度 0.26、横向拖尾 45%、颗粒做 0.72 次幂硬化 → 老电视雪花感
- 对照图：`shots/grain_compare3.png`（100% 裁切）/ `shots/grain_full_compare.jpg`（整幅）

### 8.5 颗粒减弱 60% + 参数 bug（2026-11-04 晚，**未 push**）
- 默认 `uGrain` 0.045 → **0.018**（正好 40%，即 −60%）；高频能量实测 2.062 → 0.950（比值 0.46）
- **修掉一个真 bug**：`?aged= / ?grain= / ?tv=` 的解析代码被误插到「畫質」按钮的 handler 里（`applyQuality(qname);` 这个锚点在文件里出现两次，替换命中了 8 空格缩进那处），所以启动时根本没生效——之前所有 `?grain=` 的对比截图都是无效的。已移到 boot 内 `applyQuality(qname)` 之后，实测 `?grain=0.5&aged=0` → 探针读回 `{g:0.5,a:0}`，0 与 0.5 的像素差 mean 38（92% 像素 >6），确认生效
- 对照图：`shots/grain_60_ab.png`（100% 裁切，0.045 vs 0.018）

### 8.6 颗粒回调 +15%（2026-11-04 晚，**未 push**）
- 默认 `uGrain` 0.018 → **0.0207**（×1.15）
- 实测：颗粒高频贡献 0.680 → 0.810（比值 1.19，度量含场景纹理噪声，uniform 本身是精确 ×1.15）
- 对照图：`shots/grain_15more.png`（100% 裁切，0.018 vs 0.0207）

### 8.7 README 截图重拍（2026-11-04 晚，**未 push**）
- 按当前观感（grain 0.0207 / aged 0.6）重拍 7 张：menu / shopfront / shop_interior / stairs / altar / bath / trailer
- 药行机位改为柜台斜侧（2.4,1.62,4.6 → -1.4,1.35,0.9）；浴室改为镜前侧机位（1.95,5.2,4.35 → 2.9,5.0,3.32）
- 1440×810 JPEG q86，合计 1.36 MB；`docs/screens/` 原文件原地替换
- 审阅拼图：`shots/readme2_grid.jpg`
