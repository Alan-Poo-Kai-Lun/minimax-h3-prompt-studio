(() => {
  const drawer = document.querySelector("#workspaceDrawer");
  const search = document.querySelector("#drawerSearch");
  const count = document.querySelector("#drawerCount");
  if (!drawer || !search || !count) return;

  function language() {
    try { return JSON.parse(localStorage.getItem("h3.settings") || "{}").language === "en" ? "en" : "zh"; }
    catch { return "zh"; }
  }

  function visiblePanel() { return [...drawer.querySelectorAll(".drawer-panel")].find(panel => !panel.classList.contains("hidden")); }

  function filterRows() {
    const panel = visiblePanel();
    if (!panel) return;
    const query = search.value.trim().toLocaleLowerCase();
    const rows = [...panel.querySelectorAll(".list-row")];
    rows.forEach(row => row.classList.toggle("is-filtered-out", Boolean(query) && !row.textContent.toLocaleLowerCase().includes(query)));
    const shown = rows.filter(row => !row.classList.contains("is-filtered-out")).length;
    const selected = rows.filter(row => !row.classList.contains("is-filtered-out") && row.classList.contains("is-selected")).length;
    const en = language() === "en";
    const noun = shown === 1 ? "item" : "items";
    const value = selected ? (en ? `${shown} ${noun} · ${selected} selected` : `${shown} 项 · 已选 ${selected}`) : (en ? `${shown} ${noun}` : `${shown} 项`);
    if (count.textContent !== value) count.textContent = value;
  }

  search.addEventListener("input", filterRows);
  document.addEventListener("click", event => {
    if (event.target.closest("#historyBtn,#templateBtn,#skillBtn,#manageSkills")) {
      search.value = "";
      setTimeout(() => { filterRows(); search.focus(); }, 0);
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !drawer.classList.contains("hidden")) document.querySelector("#closeDrawer")?.click();
  });

  const observer = new MutationObserver(() => requestAnimationFrame(filterRows));
  observer.observe(drawer, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.H3Management = { filterRows };
})();
