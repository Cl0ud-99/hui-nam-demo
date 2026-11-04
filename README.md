# 回南 · HUI NAM
### 港式唐樓恐怖遊戲 Demo — 可玩場景 + 宣傳片模式

> 一九八七年，深水埗。雨落咗成晚。
> 你返到阿婆間藥行，後樓梯嘅燈仲著住。
> 三樓，有人等緊你。

---

## 即刻玩

**方法一（推薦）**：雙擊 `Play.bat`，會自動開本地伺服器同瀏覽器。

**方法二**：在此資料夾開終端機，執行：

```bash
node server.js --open
```

然後打開 <http://localhost:8777/>。

> 需要 Node.js（已安裝喺 `C:\Users\83871\AppData\Local\Programs\nodejs`）。
> 建議用 Chrome / Edge，並佩戴耳機。

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
| `F3` | 效能資訊 |

主目錄可以揀 **開始**、**宣傳片**（自動運鏡）、**畫質**（高／中／低）。

---

## 場景

一條濕滑後巷 → 福安堂藥行 → 後樓梯 → 三樓陳宅（廳、神檯、睡房）→ 浴室。
全部房間可以自由行入，門可以開關，樓梯可行上三樓。

恐怖節拍：上樓梯時嘅人影、神檯三炷香、鏡裡面嘅「人」、結尾。

---

## 技術重點

- **three.js r169 + WebGL2**，自訂 HDR 後處理鏈：GTAO → Bloom → ACES 色調映射 → 膠片颗粒／暗角／色差 → SMAA
- **平面反射**：地面、樓梯平台、浴室鏡都係即時 planar reflection（鏡頭反轉渲染 + 斜裁剪平面），用 normalized device UV 取樣，磁磚／濕地會隨 normal map 扭曲
- **PBR 材質**：Poly Haven CC0 掃描貼圖（2K albedo / normal / roughness），按真實尺寸（米）做 UV，所以每塊磚都係真實大細
- **濕地水窪**：puddle mask + 反射 + 雨滴法線動畫 + 體積霧 + 雨絲 instancing
- **光影**：每間房固定 18 盞燈（唔夠就補 0 強度虛擬燈），所以全場只有一套 shader 變體；房間之間切換唔會重新編譯，行路唔會卡
- **陰影**：每間房只有主燈投影，shadow map 只會喺換房／開門時重繪（`shadowMap.autoUpdate = false`），唔會每幀重算
- **靜態合併**：自動按材質合併靜態幾何，draw call 由 ~4,700 降到 ~1,200
- **程序化音效**：WebAudio 合成雨聲、光管嗡鳴、木門吱呀、水滴、心跳、耳語、驚嚇音
- **程序化美術**：揮春、佛像海報、穴位圖、藥行招牌、霓虹、日曆、告示、報紙、藥屜標籤、舊相、符咒全部用 Python + PIL 生成，無第三方圖片

---

## 檔案結構

```
hk-horror/
├── Play.bat                 雙擊即玩
├── index.html               外殼、UI、主目錄
├── server.js                本地靜態伺服器（port 8777）
├── dist/bundle.js           esbuild 打包後嘅遊戲（index.html 直接載入）
├── src/
│   ├── main.js              啟動、載入、遊戲狀態機
│   ├── pv.js                宣傳片運鏡時間表
│   ├── core/
│   │   ├── engine.js        renderer + composer + 畫質
│   │   ├── reflector.js     平面反射 + wetify() 注入
│   │   ├── materials.js     所有 PBR 材質
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

## 已知限制

- 這是 **demo 場景**，唔係完整遊戲：一條主線、約 5–8 分鐘流程、一個結局。
- 平面反射每個房間只會更新一個 probe；遠處房間唔會有鏡面反射。
- 高畫質需要獨立顯示卡；如果 fps 低，主目錄揀「畫質 → 中／低」。
- 字體用系統中文字型（宋體／楷體），唔同 Windows 版本可能略有差異。

---

*Made with three.js. Textures: Poly Haven (CC0). Everything else procedural.*
