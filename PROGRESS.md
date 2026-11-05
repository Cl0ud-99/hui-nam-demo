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

## 2026-11-06 — 材質分組與合併 main

- 合併 `bath-rebuild`：浴室牆體重建、入浴室卡頓修復、窗與門洞對齊、材質分組 A–E
- README 重寫：加入六張實機截圖、技術數據、更新日誌
- 室內外地面關閉平面反射；樓梯踏步板抬升 4mm 解決疊面閃爍
