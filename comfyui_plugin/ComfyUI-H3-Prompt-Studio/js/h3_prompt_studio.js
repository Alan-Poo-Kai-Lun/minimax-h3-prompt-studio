import { app } from "../../scripts/app.js";

const EXTENSION = "alan.h3.prompt.studio";
const state = {
    references: [],
    selected: -1,
    copied: null,
    targetNode: null,
};

function injectStyle() {
    if (document.getElementById("h3ps-style")) return;
    const style = document.createElement("style");
    style.id = "h3ps-style";
    style.textContent = `
      .h3ps-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:22px}
      .h3ps-panel{width:min(1120px,96vw);height:min(850px,94vh);overflow:auto;background:#101318;color:#eef2f7;border:1px solid #38404c;border-radius:18px;box-shadow:0 30px 90px #000;padding:20px;font:14px/1.45 Arial,sans-serif}
      .h3ps-panel.h3ps-embedded{width:auto;height:auto;min-height:560px;border-radius:0;box-shadow:none}
      .h3ps-head,.h3ps-actions,.h3ps-grid,.h3ps-row{display:flex;gap:10px;align-items:center}.h3ps-head{justify-content:space-between}.h3ps-grid{align-items:stretch}.h3ps-col{flex:1;min-width:0}.h3ps-row{flex-wrap:wrap;margin:10px 0}
      .h3ps-panel h2{margin:0;color:#ffd326}.h3ps-panel label{display:grid;gap:5px;color:#aeb8c7;flex:1;min-width:130px}.h3ps-panel input,.h3ps-panel select,.h3ps-panel textarea,.h3ps-panel button{border:1px solid #394351;border-radius:9px;background:#0b0e13;color:#f6f7f9;padding:9px}
      .h3ps-panel textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:220px}.h3ps-panel button{cursor:pointer}.h3ps-primary{background:#ffd326!important;color:#111!important;border-color:#ffd326!important;font-weight:700}.h3ps-close{font-size:20px}.h3ps-status{padding:8px 10px;background:#090c10;border-radius:8px;color:#69e6ad;min-height:20px}
      .h3ps-drop{border:1px dashed #586475;border-radius:12px;padding:14px;text-align:center;cursor:pointer}.h3ps-refs{display:grid;gap:7px;margin-top:8px}.h3ps-ref{display:grid;grid-template-columns:64px 1fr auto;gap:8px;align-items:center;border:1px solid #303945;border-radius:10px;padding:7px}.h3ps-ref.selected{border-color:#ffd326;background:rgba(255,211,38,.08)}.h3ps-ref.drag-before{box-shadow:inset 0 3px #ffd326}.h3ps-ref.drag-after{box-shadow:inset 0 -3px #ffd326}.h3ps-ref img{width:64px;height:52px;object-fit:cover;border-radius:7px}.h3ps-ref input{width:100%;box-sizing:border-box}.h3ps-mini{padding:6px!important}.h3ps-note{font-size:12px;color:#8f9bad}
      @media(max-width:820px){.h3ps-grid{display:block}.h3ps-col+ .h3ps-col{margin-top:12px}}
    `;
    document.head.appendChild(style);
}

const readFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
});

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
}

function selectedGraphNodes() {
    const selected = app.canvas?.selected_nodes;
    return selected ? Object.values(selected) : [];
}

function promptWidget(node) {
    const names = ["prompt", "positive_prompt", "text", "positive"];
    return node?.widgets?.find(widget => names.includes(String(widget.name).toLowerCase()));
}

function applyPrompt(value, mode, preferredNode = null) {
    const candidates = [preferredNode, ...selectedGraphNodes()].filter(Boolean);
    const target = candidates.find(node => promptWidget(node));
    const widget = promptWidget(target);
    if (!widget) throw new Error("请先选择 H3 Prompt Studio 节点，或选择一个含 prompt/text 输入框的节点。");
    widget.value = value;
    widget.callback?.(value, app.canvas, target, [0, 0], null);
    const modeWidget = target.widgets?.find(item => item.name === "mode");
    if (modeWidget && mode) {
        modeWidget.value = mode;
        modeWidget.callback?.(mode, app.canvas, target, [0, 0], null);
    }
    target.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    return target.title || target.type;
}

function addReference(data, name = "clipboard.png") {
    if (state.references.length >= 12) throw new Error("最多支持12张参考图。");
    state.references.push({data, name, description: name});
}

function renderReferences(container) {
    container.innerHTML = "";
    state.references.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = `h3ps-ref${state.selected === index ? " selected" : ""}`;
        row.draggable = true;
        row.innerHTML = `<img src="${item.data}" alt="Picture ${index + 1}"><div><b>Picture ${index + 1}</b><input value="${escapeHtml(item.description)}" aria-label="Picture ${index + 1} description"></div><button class="h3ps-mini">删除</button>`;
        row.onclick = event => { if (!event.target.closest("button,input")) { state.selected = index; renderReferences(container); } };
        row.querySelector("input").oninput = event => { item.description = event.target.value; };
        row.querySelector("button").onclick = () => { state.references.splice(index, 1); state.selected = -1; renderReferences(container); };
        row.ondragstart = event => { event.dataTransfer.setData("text/plain", String(index)); event.dataTransfer.effectAllowed = "move"; };
        row.ondragover = event => { event.preventDefault(); const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2; row.classList.toggle("drag-before", before); row.classList.toggle("drag-after", !before); };
        row.ondragleave = () => row.classList.remove("drag-before", "drag-after");
        row.ondrop = event => {
            event.preventDefault();
            const from = Number(event.dataTransfer.getData("text/plain"));
            if (!Number.isInteger(from) || from === index) return;
            const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
            const moved = state.references.splice(from, 1)[0];
            let target = index + (before ? 0 : 1);
            if (from < target) target -= 1;
            state.references.splice(target, 0, moved);
            state.selected = target;
            renderReferences(container);
        };
        container.appendChild(row);
    });
}

function makePanel(root, preferredNode = null, close = null) {
    root.innerHTML = `
      <div class="h3ps-head"><div><h2>MiniMax H3 Prompt Studio</h2><div class="h3ps-note">ComfyUI 测试插件 v0.1.0 · 本地 Ollama</div></div>${close ? '<button class="h3ps-close">×</button>' : ''}</div>
      <div class="h3ps-row">
        <label>模式<select data-id="mode"><option>T2VA</option><option>I2VA</option><option>FL2VA</option><option>L2VA</option><option>Ref2VA</option><option>HYBRID</option></select></label>
        <label>输出语言<select data-id="language"><option>中文</option><option>English</option><option>Bahasa Melayu</option></select></label>
        <label>分段数<input data-id="segments" type="number" min="1" max="12" value="1"></label>
        <label>每段秒数<input data-id="seconds" type="number" min="1" max="30" value="5"></label>
      </div>
      <div class="h3ps-row"><label>Ollama 地址<input data-id="base" value="${localStorage.getItem('h3ps-base') || 'http://127.0.0.1:11434'}"></label><label>模型<input data-id="model" list="h3ps-models" value="${localStorage.getItem('h3ps-model') || ''}"><datalist id="h3ps-models"></datalist></label><button data-id="models">读取模型</button></div>
      <div class="h3ps-grid"><section class="h3ps-col"><label>创意内容<textarea data-id="brief" placeholder="描述人物、动作、场景、对白、风格、声音；可使用 Picture 1 等编号。"></textarea></label><div class="h3ps-drop" data-id="drop">点击、拖入或 Ctrl+V 添加参考图（最多12张）<input data-id="files" type="file" accept="image/*" multiple hidden></div><div class="h3ps-refs" data-id="refs"></div></section><section class="h3ps-col"><label>生成结果<textarea data-id="result" placeholder="生成的 H3 提示词会显示在这里，也可以手动修改。"></textarea></label></section></div>
      <div class="h3ps-actions h3ps-row"><button class="h3ps-primary" data-id="generate">生成 H3 提示词</button><button data-id="apply">写入选中节点</button><button data-id="copy">复制结果</button><span class="h3ps-status" data-id="status">准备就绪</span></div>
    `;
    const $ = id => root.querySelector(`[data-id="${id}"]`);
    const refs = $("refs");
    renderReferences(refs);
    if (preferredNode) {
        const mode = preferredNode.widgets?.find(widget => widget.name === "mode")?.value;
        const prompt = promptWidget(preferredNode)?.value;
        if (mode) $("mode").value = mode;
        if (prompt) $("result").value = prompt;
    }
    root.querySelector(".h3ps-close")?.addEventListener("click", close);
    $("drop").onclick = () => $("files").click();
    $("files").onchange = async event => { for (const file of event.target.files) addReference(await readFile(file), file.name); renderReferences(refs); event.target.value = ""; };
    $("drop").ondragover = event => event.preventDefault();
    $("drop").ondrop = async event => { event.preventDefault(); for (const file of [...event.dataTransfer.files].filter(file => file.type.startsWith("image/"))) addReference(await readFile(file), file.name); renderReferences(refs); };
    root.onpaste = async event => {
        const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith("image/"));
        const file = item?.getAsFile();
        if (file) { event.preventDefault(); addReference(await readFile(file), file.name || "clipboard.png"); renderReferences(refs); }
    };
    root.onkeydown = async event => {
        if (!(event.ctrlKey || event.metaKey) || event.target.matches("textarea,input")) return;
        if (event.key.toLowerCase() === "c" && state.selected >= 0) { state.copied = {...state.references[state.selected]}; event.preventDefault(); $("status").textContent = `已复制 Picture ${state.selected + 1}`; }
        if (event.key.toLowerCase() === "v" && state.copied) { event.preventDefault(); const copy = {...state.copied}; if (state.selected >= 0) state.references[state.selected] = copy; else addReference(copy.data, copy.name); renderReferences(refs); }
    };
    $("models").onclick = async () => {
        $("status").textContent = "正在读取 Ollama 模型…";
        try {
            const response = await fetch(`/h3_prompt_studio/models?base_url=${encodeURIComponent($("base").value)}`);
            const data = await response.json();
            if (!data.ok) throw new Error(data.error);
            root.querySelector("#h3ps-models").innerHTML = data.models.map(name => `<option value="${name}"></option>`).join("");
            if (!$("model").value && data.models[0]) $("model").value = data.models[0];
            $("status").textContent = `找到 ${data.models.length} 个模型`;
        } catch (error) { $("status").textContent = `连接失败：${error.message}`; }
    };
    $("generate").onclick = async () => {
        $("status").textContent = "正在生成…"; $("generate").disabled = true;
        localStorage.setItem("h3ps-base", $("base").value); localStorage.setItem("h3ps-model", $("model").value);
        try {
            const response = await fetch("/h3_prompt_studio/generate", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({brief:$("brief").value, mode:$("mode").value, language:$("language").value, segments:Number($("segments").value), seconds:Number($("seconds").value), base_url:$("base").value, model:$("model").value, references:state.references})});
            const data = await response.json(); if (!data.ok) throw new Error(data.error);
            $("result").value = data.prompt; $("status").textContent = "生成完成";
        } catch (error) { $("status").textContent = `生成失败：${error.message}`; }
        finally { $("generate").disabled = false; }
    };
    $("apply").onclick = () => { try { const name = applyPrompt($("result").value, $("mode").value, preferredNode); $("status").textContent = `已写入：${name}`; } catch (error) { $("status").textContent = error.message; } };
    $("copy").onclick = async () => { await navigator.clipboard.writeText($("result").value); $("status").textContent = "结果已复制"; };
}

function openDialog(node = null) {
    injectStyle(); state.targetNode = node;
    const overlay = document.createElement("div"); overlay.className = "h3ps-overlay";
    const panel = document.createElement("div"); panel.className = "h3ps-panel"; overlay.appendChild(panel); document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.onclick = event => { if (event.target === overlay) close(); };
    makePanel(panel, node, close);
}

app.registerExtension({
    name: EXTENSION,
    bottomPanelTabs: [{id:"h3-prompt-studio", title:"H3 Prompt Studio", type:"custom", render: element => { injectStyle(); const panel = document.createElement("div"); panel.className = "h3ps-panel h3ps-embedded"; element.replaceChildren(panel); makePanel(panel); }}],
    async nodeCreated(node) {
        if (node.comfyClass !== "H3PromptStudioText") return;
        node.addWidget("button", "打开 H3 Prompt Studio", null, () => openDialog(node));
        node.setSize([Math.max(node.size[0], 390), Math.max(node.size[1], 360)]);
    },
    async setup() {
        injectStyle();
        window.H3PromptStudio = {open: () => openDialog()};
    },
});
