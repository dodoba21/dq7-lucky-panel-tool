(function () {
  /* ── 常數 ── */
  const MAX_CELLS = 24;

  const MODES = {
    "1": {
      label: "關卡一",
      cols: 4, rows: 3, count: 12, shuffleLimit: 2,
      sequence: ["A","A","B","B","C","C","D","D","E","E","X","Y"]
    },
    "2": {
      label: "關卡二",
      cols: 4, rows: 4, count: 16, shuffleLimit: 3,
      sequence: ["A","A","B","B","C","C","D","D","E","E","F","F","G","G","X","Y"]
    },
    "3": {
      label: "關卡三",
      cols: 5, rows: 4, count: 20, shuffleLimit: 5,
      sequence: ["A","A","B","B","C","C","D","D","E","E","F","F","G","G","H","H","I","I","X","Y"]
    },
    "4": {
      label: "關卡四",
      cols: 6, rows: 4, count: 24, shuffleLimit: 7,
      sequence: ["A","A","B","B","C","C","D","D","E","E","F","F","G","G","H","H","I","I","J","J","K","K","X","Y"]
    }
  };

  const MODE_ORDER = ["1", "2", "3", "4"];
  const CIRCLED = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

  /* ── DOM 參照 ── */
  const modeTabs   = document.getElementById("modeTabs");
  const statusEl   = document.getElementById("status");
  const boardEl    = document.getElementById("board");
  const summaryEl  = document.getElementById("summary");
  const nextModeBtn  = document.getElementById("nextModeBtn");
  const undoBtn      = document.getElementById("undoBtn");
  const reshuffleBtn = document.getElementById("reshuffleBtn");
  const resetBtn     = document.getElementById("resetBtn");

  /* ── 狀態 ── */
  const state = {
    mode: "1",
    phase: "input",
    cells: Array(MAX_CELLS).fill(""),
    selectedA: null,
    selectedB: null,
    swapping: false,
    shuffleCount: 0,
    logs: [],
    inputSnapshot: ""
  };

  /* ── DOM 快取 ── */
  let tabRadios = {};       // { "1": inputEl, "2": inputEl, ... }
  let boardCells = [];      // 當前模式的 cell button 陣列
  let currentBoardMode = null;

  /* ── 工具函式 ── */
  function getCurrentModeConfig() {
    return MODES[state.mode];
  }

  function getActiveCellCount() {
    return getCurrentModeConfig().count;
  }

  function getFilledCellCount() {
    var n = getActiveCellCount();
    var c = 0;
    for (var i = 0; i < n; i++) {
      if (state.cells[i] !== "") c++;
    }
    return c;
  }

  function tokenText(token) {
    if (token === "X") return "機會";
    if (token === "Y") return "洗牌";
    return token;
  }

  function cycleModeText() {
    var idx = MODE_ORDER.indexOf(state.mode);
    var next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
    if (next === "1") return "回到【關卡一】";
    return "前往下一難度【" + MODES[next].label + "】";
  }

  function nextModeValue() {
    var idx = MODE_ORDER.indexOf(state.mode);
    return MODE_ORDER[(idx + 1) % MODE_ORDER.length];
  }

  /* ── 核心邏輯 ── */
  function resetAll() {
    state.phase = "input";
    state.cells = Array(MAX_CELLS).fill("");
    state.selectedA = null;
    state.selectedB = null;
    state.swapping = false;
    state.shuffleCount = 0;
    state.logs = [];
    state.inputSnapshot = "";
  }

  function resetForModeChange() {
    resetAll();
    render();

  }

  function restoreFromInputSnapshot() {
    state.phase = "shuffle";
    state.selectedA = null;
    state.selectedB = null;
    state.swapping = false;
    state.shuffleCount = 0;
    state.logs = [];
    state.cells = Array(MAX_CELLS).fill("");
    if (!state.inputSnapshot) return;
    try {
      var list = JSON.parse(state.inputSnapshot);
      for (var i = 0; i < list.length && i < MAX_CELLS; i++) {
        state.cells[i] = list[i] || "";
      }
    } catch (e) { /* keep current */ }
  }

  function getCellLogs(cellIndex) {
    if (state.phase !== "finish") return "";
    var indexes = [];
    for (var i = 0; i < state.logs.length; i++) {
      var pair = state.logs[i];
      if (pair[0] === cellIndex + 1 || pair[1] === cellIndex + 1) {
        indexes.push(i + 1);
      }
    }
    return indexes.map(function (n) {
      return CIRCLED[n] || String(n);
    }).join("");
  }

  /* ── 輸入階段 ── */
  function onInputClick(i) {
    var cfg = getCurrentModeConfig();
    var count = getFilledCellCount();
    var token = state.cells[i];

    if (token === "") {
      // 填入下一個牌面值
      state.cells[i] = cfg.sequence[count];
      if (count + 1 === cfg.count) {
        state.phase = "shuffle";
        state.inputSnapshot = JSON.stringify(state.cells.slice(0, cfg.count));
      }
      // 標記此格需要翻牌動畫
      requestAnimationFrame(function () {
        if (boardCells[i]) {
          boardCells[i].classList.add("flip-in");
          boardCells[i].addEventListener("animationend", function handler() {
            boardCells[i].classList.remove("flip-in");
            boardCells[i].removeEventListener("animationend", handler);
          });
        }
      });
      return;
    }

    // 改善的回退邏輯：點擊已填入的格子，清除該格及之後所有輸入
    // 找出此格在輸入順序中的位置
    var clickedOrder = -1;
    var filledPositions = [];
    for (var idx = 0; idx < cfg.count; idx++) {
      if (state.cells[idx] !== "") {
        filledPositions.push(idx);
      }
    }
    for (var j = 0; j < filledPositions.length; j++) {
      if (filledPositions[j] === i) {
        clickedOrder = j;
        break;
      }
    }
    if (clickedOrder === -1) return;

    // 清除此格及之後的所有輸入
    for (var k = clickedOrder; k < filledPositions.length; k++) {
      state.cells[filledPositions[k]] = "";
    }
  }

  /* ── 洗牌階段 ── */
  function swapCells(a, b) {
    var t = state.cells[a];
    state.cells[a] = state.cells[b];
    state.cells[b] = t;
  }

  function onShuffleClick(i) {
    if (state.swapping) return;

    if (state.selectedA === null) {
      state.selectedA = i;
      return;
    }

    if (state.selectedA === i) {
      state.selectedA = null;
      return;
    }

    state.selectedB = i;
    state.swapping = true;

    // 先渲染讓兩格都顯示 selected 狀態
    updateBoard();

    // 交換動畫
    animateSwap(state.selectedA, state.selectedB, function () {
      swapCells(state.selectedA, state.selectedB);
      state.logs.push([state.selectedA + 1, state.selectedB + 1]);
      state.selectedA = null;
      state.selectedB = null;
      state.shuffleCount += 1;
      state.swapping = false;

      if (state.shuffleCount >= getCurrentModeConfig().shuffleLimit) {
        state.phase = "finish";
      }
      render();
  
    });
  }

  function animateSwap(indexA, indexB, callback) {
    var cellA = boardCells[indexA];
    var cellB = boardCells[indexB];
    if (!cellA || !cellB) { callback(); return; }

    var rectA = cellA.getBoundingClientRect();
    var rectB = cellB.getBoundingClientRect();

    var dx = rectB.left - rectA.left;
    var dy = rectB.top  - rectA.top;

    cellA.classList.add("swap-animate");
    cellB.classList.add("swap-animate");

    requestAnimationFrame(function () {
      cellA.style.transform = "translate(" + dx + "px, " + dy + "px)";
      cellB.style.transform = "translate(" + (-dx) + "px, " + (-dy) + "px)";
    });

    setTimeout(function () {
      cellA.classList.remove("swap-animate");
      cellB.classList.remove("swap-animate");
      cellA.style.transform = "";
      cellB.style.transform = "";
      callback();
    }, 320);
  }

  /* ── Undo 撤銷洗牌 ── */
  function undoLastShuffle() {
    if (state.logs.length === 0) return;
    var lastPair = state.logs.pop();
    // lastPair 儲存的是 1-based 位置
    swapCells(lastPair[0] - 1, lastPair[1] - 1);
    state.shuffleCount -= 1;
    // 如果從 finish 階段撤銷回來
    if (state.phase === "finish") {
      state.phase = "shuffle";
    }
    render();

  }

  /* ── 點擊分發 ── */
  function onCellClick(index) {
    if (index >= getActiveCellCount()) return;
    if (state.swapping) return;

    if (state.phase === "input") {
      onInputClick(index);
      render();
  
      return;
    }

    if (state.phase === "shuffle") {
      onShuffleClick(index);
      if (!state.swapping) {
        // 僅在非交換動畫時更新（選取/取消選取第一格）
        updateBoard();
        updateStatus();
      }
    }
  }

  /* ── 渲染：標籤（僅初始化一次） ── */
  function initTabs() {
    modeTabs.innerHTML = "";
    tabRadios = {};
    MODE_ORDER.forEach(function (modeKey) {
      var cfg = MODES[modeKey];
      var wrap = document.createElement("div");
      var id = "mode-" + modeKey;

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "mode";
      input.id = id;
      input.checked = state.mode === modeKey;
      input.addEventListener("change", function () {
        state.mode = modeKey;
        resetForModeChange();
      });

      var label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = cfg.label;

      wrap.appendChild(input);
      wrap.appendChild(label);
      modeTabs.appendChild(wrap);

      tabRadios[modeKey] = input;
    });
  }

  function updateTabs() {
    MODE_ORDER.forEach(function (modeKey) {
      if (tabRadios[modeKey]) {
        tabRadios[modeKey].checked = state.mode === modeKey;
      }
    });
  }

  /* ── 渲染：狀態列 ── */
  function updateStatus() {
    var cfg = getCurrentModeConfig();

    if (state.phase === "input") {
      var filled = getFilledCellCount();
      statusEl.innerHTML = "輸入階段：請依照遊戲順序點格子<br>" +
        "<span class='progress'>已輸入 " + filled + " / " + cfg.count + "</span>";
    } else if (state.phase === "shuffle") {
      var left = cfg.shuffleLimit - state.shuffleCount;
      statusEl.innerHTML = "洗牌階段<br><span class='count'>剩餘次數：" + left + "</span>";
    } else {
      statusEl.innerHTML = "輸入完成，請照此盤面回遊戲操作。<br><small>左上紅字是洗牌歷程</small>";
    }

    undoBtn.style.display = (state.phase === "shuffle" || state.phase === "finish") && state.logs.length > 0
      ? "inline-block" : "none";
    reshuffleBtn.style.display = state.phase === "input" ? "none" : "inline-block";
    nextModeBtn.style.display = state.phase === "finish" ? "block" : "none";
    nextModeBtn.textContent = cycleModeText();
  }

  /* ── 渲染：棋盤（模式變更時重建，否則差異更新） ── */
  function initBoard() {
    var cfg = getCurrentModeConfig();
    var cellSize = 90;
    var boardMaxW = cfg.cols * cellSize + (cfg.cols - 1) * 7 + 16;
    boardEl.style.maxWidth = boardMaxW + "px";
    boardEl.style.gridTemplateColumns = "repeat(" + cfg.cols + ", 1fr)";
    boardEl.style.gridTemplateRows = "repeat(" + cfg.rows + ", 1fr)";
    boardEl.innerHTML = "";
    boardCells = [];

    for (var i = 0; i < cfg.count; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";

      var log = document.createElement("span");
      log.className = "log";
      btn.appendChild(log);

      (function (index) {
        btn.addEventListener("click", function () {
          onCellClick(index);
        });
      })(i);

      boardEl.appendChild(btn);
      boardCells.push(btn);
    }
    currentBoardMode = state.mode;
  }

  function updateBoard() {
    var cfg = getCurrentModeConfig();

    for (var i = 0; i < boardCells.length; i++) {
      var btn = boardCells[i];
      var token = state.cells[i];
      var logEl = btn.querySelector(".log");

      // 清除舊的 data-token
      delete btn.dataset.token;
      btn.classList.remove("back", "selected");

      if (token === "") {
        btn.classList.add("back");
        // 設定文字（排除 log span）
        setButtonText(btn, "?");
      } else {
        btn.dataset.token = token;
        setButtonText(btn, tokenText(token));
      }

      if (state.selectedA === i || state.selectedB === i) {
        btn.classList.add("selected");
      }

      if (logEl) {
        logEl.textContent = getCellLogs(i);
      }
    }
  }

  function setButtonText(btn, text) {
    // 只更新文字節點，保留 .log span
    var firstChild = btn.firstChild;
    if (firstChild && firstChild.nodeType === 3) {
      firstChild.textContent = text;
    } else {
      btn.insertBefore(document.createTextNode(text), btn.firstChild);
    }
  }

  /* ── 渲染：結果摘要 ── */
  function updateSummary() {
    if (state.phase !== "finish") {
      summaryEl.classList.remove("show");
      summaryEl.innerHTML = "";
      return;
    }

    var cfg = getCurrentModeConfig();
    var pairs = {};

    for (var i = 0; i < cfg.count; i++) {
      var token = state.cells[i];
      if (!token || token === "X" || token === "Y") continue;
      if (!pairs[token]) pairs[token] = [];
      pairs[token].push(i + 1);
    }

    var html = '<div class="summary-title">配對位置摘要</div><div class="summary-list">';
    var tokens = Object.keys(pairs).sort();
    for (var j = 0; j < tokens.length; j++) {
      var t = tokens[j];
      html += '<span class="summary-item">' +
        '<span class="summary-token" data-token="' + t + '">' + t + '</span> ' +
        '第 ' + pairs[t].join('、') + ' 格' +
        '</span>';
    }
    html += '</div>';

    summaryEl.innerHTML = html;
    summaryEl.classList.add("show");
  }

  /* ── 主渲染 ── */
  function render() {
    updateTabs();
    if (currentBoardMode !== state.mode) {
      initBoard();
    }
    updateStatus();
    updateBoard();
    updateSummary();
  }

  /* ── 事件綁定 ── */
  undoBtn.addEventListener("click", function () {
    undoLastShuffle();
  });

  reshuffleBtn.addEventListener("click", function () {
    restoreFromInputSnapshot();
    render();

  });

  resetBtn.addEventListener("click", function () {
    resetAll();
    render();

  });

  nextModeBtn.addEventListener("click", function () {
    if (state.phase !== "finish") return;
    state.mode = nextModeValue();
    resetForModeChange();
  });

  /* ── 初始化 ── */
  initTabs();
  initBoard();
  render();
})();
