# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

DQ7 幸運翻牌攻略工具（對對碰協助工具）——協助勇者鬥惡龍 VII 玩家追蹤「幸運翻牌」小遊戲中的卡牌位置與洗牌過程。

## 技術棧

- 三檔結構：`index.html` + `style.css` + `app.js`，vanilla JavaScript，零外部依賴
- 無建置工具、無框架，直接用瀏覽器開啟即可運行

## 執行方式

直接在瀏覽器中開啟 `index.html`，不需要任何安裝或建置步驟。目前無測試框架與 linting 設定。

## 檔案結構

- `index.html`：HTML 骨架，包含可折疊說明區、模式標籤、棋盤、摘要、按鈕等 DOM 結構
- `style.css`：所有樣式，包含 token 顏色（用 `[data-token]` 屬性選擇器，`.cell` 與 `.summary-token` 共用）、翻牌/交換動畫、響應式斷點（860px / 560px）
- `app.js`：IIFE 封裝的應用邏輯，包含狀態管理、DOM 差異更新、LocalStorage 持久化

## 架構

### 應用程式狀態

所有狀態集中在 `state` 物件中管理，常數 `MAX_CELLS = 24`：
- `mode`：難度模式（"1"-"4" 對應甘口/中辛/辛口/激辛）
- `phase`：流程階段（`input` → `shuffle` → `finish`）
- `cells`：長度 MAX_CELLS 的陣列，儲存各位置的牌面值
- `selectedA` / `selectedB`：洗牌階段中選取的兩張牌（暫態，不持久化）
- `logs`：洗牌歷史記錄（1-based 位置對陣列）
- `inputSnapshot`：輸入完成時的 JSON 快照，供「重做洗牌」功能使用

### 渲染模式

- `initTabs()`：初始化時建立一次 tab DOM，之後 `updateTabs()` 只更新 checked 狀態
- `initBoard()`：模式變更時重建棋盤 DOM，`updateBoard()` 差異更新內容/class
- `updateSummary()`：finish 階段渲染配對位置摘要

### 關鍵函式

- `getCurrentModeConfig()`：取得當前模式設定
- `onInputClick(i)`：輸入階段點擊處理（含路徑回溯式回退）
- `onShuffleClick(i)`：洗牌階段點擊處理（含交換動畫）
- `swapCells(a, b)`：執行兩張牌的位置交換
- `undoLastShuffle()`：撤銷上一步洗牌
- `animateSwap(a, b, cb)`：交換位移動畫（FLIP 技術，320ms）

### LocalStorage

- key：`dq7-lucky-panel-state`
- 儲存：mode、phase、cells、shuffleCount、logs、inputSnapshot
- 不儲存暫態：selectedA、selectedB、swapping

## 修改注意事項

- 牌面值代號：A-K 為配對牌、X 為機會牌、Y 為洗牌牌
- Token 顏色用 `[data-token="X"]` 屬性選擇器（不帶 class 前綴），讓 `.cell` 和 `.summary-token` 共用
- `cells` 陣列固定長度 MAX_CELLS（24），較小模式僅使用前 N 格
- `state.swapping` 為動畫鎖，動畫期間 `onCellClick` 會提前 return
- CSS 響應式：860px 以下縮容器寬度，560px 以下縮小間距/字體/按鈕
