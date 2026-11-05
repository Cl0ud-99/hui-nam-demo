<div align="center">

# 回南 · HUI NAM

**一九八七年，深水埗。雨落咗成晚。三樓，有人等緊你。**

港式唐樓第一人稱恐怖 Demo · three.js / WebGL2 · 五個自由行走空間

[**▶ 線上遊玩**](https://cl0ud-99.github.io/hui-nam-demo/) · [操作](#操作) · [技術重點](#技術重點) · [更新日誌](#更新日誌)

</div>

---

## 截圖

<table>
<tr>
<td width="50%"><img src="screenshots/alley.jpg" alt="後巷"></td>
<td width="50%"><img src="screenshots/shop.jpg" alt="福安堂藥行"></td>
</tr>
<tr>
<td><img src="screenshots/stairs.jpg" alt="後樓梯"></td>
<td><img src="screenshots/living.jpg" alt="三樓客廳"></td>
</tr>
<tr>
<td><img src="screenshots/bed.jpg" alt="睡房"></td>
<td><img src="screenshots/bath.jpg" alt="浴室"></td>
</tr>
</table>

---

## 即刻玩

**線上**：<https://cl0ud-99.github.io/hui-nam-demo/>

**本機（推薦）**：雙擊 `Play.bat`，會自動開本地伺服器同瀏覽器。

或者：

```bash
node server.js --open     # http://localhost:8777/
```

> 建議用 Chrome / Edge，佩戴耳機。含閃爍光源與驚嚇內容。

---

## 操作

| 按鍵 | 動作 |
|---|---|
| `W A S D` | 行走 |
| `Shift` | 快走 |
| 滑鼠 | 環視（點擊畫面鎖定滑鼠） |
| `E` | 互動（開門、上香、開水喉、望鏡） |
| `F` | 電筒 |
| `Esc` | 暫停 / 返回 |
| `F3` | 效能資訊（幀時間、draw call、program 數） |

主目錄可以揀 **開始**、**宣傳片**（64 秒自動運鏡）、**畫質**（高／中／低）。

---

## 場景

一條濕滑後巷 → 福安堂藥行 → 後樓梯 → 三樓陳宅（廳、神檯、睡房）→ 浴室。
全部房間可以自由行入，門可以開關，樓梯可行上三樓。

恐怖節拍：上樓梯時嘅人影、神檯三炷香、鏡裡面嘅「人」、結尾。

---

## 技術重點

- **three.js r169 + WebGL2**，自訂後處理鏈：GTAO → Bloom → ACES 色調映射 → 膠片顆粒／暗角／色差 → SMAA
- **平面反射**：浴室鏡、衣櫃鏡以獨立 RT 做 planar reflection（鏡頭反轉 + 斜裁剪平面），螢幕空間 UV 取樣；室內外地面已改為純材質濕感，低頭唔會再出現燈光殘影
- **PBR 材質**：Poly Haven CC0 掃描貼圖（2K albedo / normal / roughness），按真實尺寸（米）做 UV；材質按用途分組（門／門套／藥櫃／傢俬／神檯／地板／室外雜木），唔再全屋同一塊木紋
- **濕地水窪**：puddle mask + 法線動畫 + 體積霧 + 雨絲 instancing + 漣漪 shader
- **光影**：每間房固定 **14 盞點光 + 1 盞聚光**（唔夠就補 0 強度虛擬燈），全場只有一套 shader 變體；換房唔會重新編譯
- **陰影**：每間房只有主燈投影，shadow map 只喺換房／開門時重繪（`shadowMap.autoUpdate = false`）
- **預熱**：啟動時對每個房間六方向 `compile` + 完整 composer，並強制跑一次鏡面反射，避免行入新房間時爆格
- **靜態合併**：按材質合併靜態幾何，約 1,700 mesh → 230 桶
- **程序化音效／美術**：WebAudio 合成雨聲、光管嗡鳴、木門吱呀、水滴、心跳、耳語、驚嚇音；揮春、海報、招牌、日曆、藥屜標籤、符咒全部用 Python + PIL 生成
- **實測**（RTX 4070 Laptop / 1600×900）：後巷中位 8.5 ms、藥行 4–6 ms、三樓 5.6 ms；五段連續切換 **0 幀 > 28 ms**，shader program 全程 82；連續掉幀自動降一檔

---

## 檔案結構

```
hui-nam-demo/
├── Play.bat                 雙擊即玩
├── index.html               外殼、UI、主目錄
├── server.js                本地靜態伺服器（port 8777）
├── dist/bundle.js           esbuild 打包後嘅遊戲
├── src/
│   ├── main.js              啟動、載入、遊戲狀態機
│   ├── pv.js                宣傳片運鏡時間表
│   ├── core/
│   │   ├── engine.js        renderer + composer + 畫質
│   │   ├── reflector.js     平面反射 + wetify() 注入
│   │   ├── materials.js     所有 PBR 材質（按用途分組）
│   │   ├── textures.js      貼圖載入、真實尺寸 tiling
│   │   ├── props.js         傢俬／道具／燈具 parametric builders
│   │   ├── player.js        第一人稱控制、碰撞、互動 raycast
│   │   ├── audio.js         程序化音效引擎
│   │   └── gradeShader.js   ACES + 調色 shader
│   ├── world/
│   │   ├── world.js         場景總管、燈光、反射、雨、塵、碰撞
│   │   ├── alley.js         後巷
│   │   ├── shop.js          福安堂藥行
│   │   ├── stairs.js        後樓梯
│   │   ├── apartment.js     三樓單位
│   │   ├── bathroom.js      浴室 + 鏡
│   │   ├── story.js         劇情／互動節拍
│   │   └── buildutil.js     牆身開洞、collider 工具
│   └── ui/ui.js             HUD、字幕、fade、letterbox
├── assets/
│   ├── tex/                 19 組 CC0 PBR 貼圖（2K）
│   ├── art/                 程序化生成嘅海報、招牌、decal
│   └── env/night_street.hdr 環境反射
├── screenshots/             README 用截圖
└── tools/
    ├── genart.py            重新生成所有 2D 美術
    ├── capture.mjs          截圖／驗證工具
    └── test_game.mjs        自動化流程測試
```

---

## 重新建置

```bash
npm install            # 只第一次
npm run build          # 打包 src -> dist/bundle.js
npm run serve          # 開伺服器
```

修改 `src/` 之後執行 `npm run build` 即生效（或 `npm run watch`）。

重新生成 2D 美術：

```bash
python tools/genart.py
```

---

## 更新日誌

### 2026-11-06
- **浴室重建**：四面牆改為 12 cm 實體盒體（內側瓷磚、外側與全屋一致嘅灰泥），門洞／門框／門扇三者對齊；補回浴室後方死角，牆身拉直到天花
- **入浴室卡頓**：光源預算漂移令 12 個 shader 重編譯（單幀 7.8 秒）→ 每房固定 14 點光 + 1 聚光、投影燈唯一化，換房零重編譯；鏡面反射預熱
- **窗**：臥室大窗、小窗與外立面開洞逐一對齊（鏡像牆局部座標換算），內外都見到對面街景；刪除黑窗簾與浴室透明浴簾
- **地面反射**：室內外一律關閉平面反射，低頭唔再有燈光殘影；濕感改由材質表現
- **材質分組 A–E**：紅漆入戶門／暖木睡房門／淺漆浴室門、漆面門套與窗框、酸枝藥櫃 + 淺色抽屜 + 墨綠防火板櫃檯 + 粗木樑 + 鐵皮招牌背板、松木凳椅／胡桃木枱／雙色衣櫃／夾板電視櫃、神檯紅漆、地板與室外雜木
- 樓梯踏步板與結構台階共面造成嘅閃爍修復；多處浮空污漬貼花清除

### 2026-11-05
- 後巷封閉化、立面細節、雨漣漪、濕地反射
- 光照重平衡、每房燈光規格化、反射 30 Hz、指針鎖定防抖
- 全屋碰撞體與導航驗證（0.1 m 網格洪水填充）

---

## 已知限制

- 這是 **demo 場景**，唔係完整遊戲：一條主線、約 5–8 分鐘流程、一個結局。
- 高畫質需要獨立顯示卡；如果 fps 低，主目錄揀「畫質 → 中／低」（亦會自動降檔）。
- 字體用系統中文字型（宋體／楷體），唔同 Windows 版本可能略有差異。

---

*Made with three.js. Textures: Poly Haven (CC0). Everything else procedural.*
