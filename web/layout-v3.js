(() => {
  const shell = document.querySelector(".shell");
  const panes = {
    prompt: document.querySelector(".prompt-column"),
    generation: document.querySelector(".generation-column"),
    result: document.querySelector(".output-panel"),
  };
  const splitters = [...document.querySelectorAll(".pane-splitter")];
  const focusButtons = [...document.querySelectorAll(".pane-focus")];
  const storageKey = "h3.layout.v1";
  const defaults = { ratios: [0.34, 0.3, 0.36], focus: null };
  const minimums = [300, 280, 330];

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved || !Array.isArray(saved.ratios) || saved.ratios.length !== 3) return { ...defaults };
      const ratios = saved.ratios.map(Number);
      if (ratios.some(value => !Number.isFinite(value) || value <= 0)) return { ...defaults };
      const sum = ratios.reduce((a, b) => a + b, 0);
      return { ratios: ratios.map(value => value / sum), focus: Object.keys(panes).includes(saved.focus) ? saved.focus : null };
    } catch { return { ...defaults }; }
  }

  let state = load();

  function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
  function isWide() { return window.matchMedia("(min-width: 1121px)").matches; }

  function availableWidth() {
    const style = getComputedStyle(shell);
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    return Math.max(1, shell.clientWidth - horizontalPadding - 20);
  }

  function setWidths(widths) {
    shell.style.gridTemplateColumns = `minmax(${minimums[0]}px, ${widths[0]}px) 10px minmax(${minimums[1]}px, ${widths[1]}px) 10px minmax(${minimums[2]}px, ${widths[2]}px)`;
  }

  function rememberCurrentWidths() {
    const widths = Object.values(panes).map(pane => pane.getBoundingClientRect().width);
    const sum = widths.reduce((a, b) => a + b, 0);
    if (sum > 0) state.ratios = widths.map(width => width / sum);
  }

  function updateFocusControls() {
    focusButtons.forEach(button => {
      const active = state.focus === button.dataset.focusPane;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.textContent = active ? "↩ 恢复三栏" : "⛶ 专注";
    });
  }

  function applyLayout() {
    if (state.focus) shell.dataset.layoutFocus = state.focus;
    else delete shell.dataset.layoutFocus;
    updateFocusControls();
    if (state.focus) {
      shell.style.gridTemplateColumns = "";
    } else if (isWide()) {
      const available = availableWidth();
      setWidths(state.ratios.map(ratio => ratio * available));
    } else {
      shell.style.gridTemplateColumns = "";
    }
  }

  focusButtons.forEach(button => button.addEventListener("click", () => {
    state.focus = state.focus === button.dataset.focusPane ? null : button.dataset.focusPane;
    save();
    applyLayout();
  }));

  document.querySelector("#resetLayout")?.addEventListener("click", () => {
    state = { ratios: [...defaults.ratios], focus: null };
    save();
    applyLayout();
  });

  function resizePair(splitterIndex, delta, startWidths) {
    const next = [...startWidths];
    const leftIndex = splitterIndex;
    const rightIndex = splitterIndex + 1;
    const pairWidth = startWidths[leftIndex] + startWidths[rightIndex];
    next[leftIndex] = Math.max(minimums[leftIndex], Math.min(pairWidth - minimums[rightIndex], startWidths[leftIndex] + delta));
    next[rightIndex] = pairWidth - next[leftIndex];
    return next;
  }

  splitters.forEach((splitter, index) => {
    splitter.addEventListener("pointerdown", event => {
      if (!isWide() || state.focus) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidths = Object.values(panes).map(pane => pane.getBoundingClientRect().width);
      splitter.setPointerCapture(event.pointerId);
      document.body.classList.add("is-resizing");
      const move = moveEvent => setWidths(resizePair(index, moveEvent.clientX - startX, startWidths));
      const end = () => {
        splitter.removeEventListener("pointermove", move);
        splitter.removeEventListener("pointerup", end);
        splitter.removeEventListener("pointercancel", end);
        document.body.classList.remove("is-resizing");
        rememberCurrentWidths();
        save();
      };
      splitter.addEventListener("pointermove", move);
      splitter.addEventListener("pointerup", end);
      splitter.addEventListener("pointercancel", end);
    });

    splitter.addEventListener("keydown", event => {
      if (!isWide() || state.focus || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const widths = Object.values(panes).map(pane => pane.getBoundingClientRect().width);
      setWidths(resizePair(index, event.key === "ArrowLeft" ? -24 : 24, widths));
      rememberCurrentWidths();
      save();
    });

    splitter.addEventListener("dblclick", () => {
      state.ratios = [...defaults.ratios];
      save();
      applyLayout();
    });
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyLayout, 100);
  });

  applyLayout();
})();
