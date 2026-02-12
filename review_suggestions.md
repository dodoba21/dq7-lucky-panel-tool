# DQ7 幸運翻牌攻略工具 — 確認實施項目

依使用者需求確認，以下為本次實施的改進項目清單。

---

## 一、美觀 (Aesthetics)

### 1. Token 對比度修正
修正部分 token 顏色（D `#4db6ac`、K `#81c784` 等）在白色文字下對比度偏低的問題。為淺色底 token 改用深色文字或加上 text-shadow。

### 2. 翻牌/交換動畫
- 輸入階段：加入 CSS `perspective` + `rotateY` 的 3D 翻牌動畫
- 洗牌階段：加入兩張牌互相飛過去的位移動畫（`translateX` / `translateY`）

### 3. 模式標籤加辣椒圖示
甘口/中辛/辛口/激辛旁加上 🌶️ 數量（1~4 個），讓難度差異更直覺。

---

## 二、功能 (Functionality)

### 1. Undo 撤銷洗牌
洗牌階段加入 Undo 按鈕，可撤銷最後一次交換操作，搭配 `state.logs` 反向操作實現。

### 2. LocalStorage 持久化
將 `state` 存入 `localStorage`，頁面載入時自動恢復。包含模式、階段、牌面、洗牌歷史等完整狀態。

### 3. 改善輸入回退邏輯
點擊任何已填入的格子時，清除該格及之後的所有輸入（路徑回溯），取代現行僅能撤回最後一格的限制。

---

## 三、排版與 UX

### 1. 輸入進度指示
輸入階段顯示「已輸入 5/12」的進度提示。

### 2. 說明區可折疊
使用說明改為 `<details>/<summary>` 可折疊元素，減少畫面佔用。

### 3. 格子正方形 + 手機優化
- 格子加上 `aspect-ratio: 1` 固定正方形
- 針對小螢幕縮小 gap、padding、字體
- 優化激辛模式（6×4）在手機上的顯示

### 4. 完成畫面結果摘要
finish 階段新增結果摘要區塊，列出所有配對的位置（如「A 在第 1、第 5 格」）。

---

## 四、程式碼與架構

### 1. 消除魔術數字 + 函式重命名
- 提取常數 `MAX_CELLS = 24`
- 函式更名：`modeCfg()` → `getCurrentModeConfig()`、`visibleCount()` → `getActiveCellCount()`、`filledCount()` → `getFilledCellCount()`、`doSwap()` → `swapCells()`

### 2. DOM 渲染優化
`renderTabs()` 和 `renderBoard()` 改為差異更新，不每次完全重建 DOM，避免打斷 CSS transition。

### 3. CSS/JS 拆分為獨立檔案
從單一 `index.html` 拆分為 `index.html` + `style.css` + `app.js` 三個檔案。

---

## 不實施項目

以下項目經確認暫不實施：
- ~~深色模式 (Dark Mode)~~
- ~~鍵盤快捷鍵~~
- ~~PWA 化~~
- ~~Reducer pattern 狀態管理~~
- ~~HTML 語義化 / aria-label~~
- ~~隱藏按鈕佔位修正~~（將在 DOM 渲染優化中一併處理）
- ~~格子編號~~
- ~~交換確認閃爍效果~~
