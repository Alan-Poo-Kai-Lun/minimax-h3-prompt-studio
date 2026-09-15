(() => {
  const settings = () => {
    try { return JSON.parse(localStorage.getItem("h3.settings") || "{}"); }
    catch { return {}; }
  };
  const language = () => settings().language === "en" ? "en" : "zh";
  const choose = (zh, en) => language() === "en" ? en : zh;
  const setText = (selector, zh, en) => document.querySelectorAll(selector).forEach(el => {
    const value = choose(zh, en);
    if (el.textContent !== value) el.textContent = value;
  });
  const setPlaceholder = (selector, zh, en) => document.querySelectorAll(selector).forEach(el => {
    const value = choose(zh, en);
    if (el.placeholder !== value) el.placeholder = value;
  });
  const setTitle = (selector, zh, en) => document.querySelectorAll(selector).forEach(el => {
    const value = choose(zh, en);
    if (el.title !== value) el.title = value;
  });
  const setLabelText = (selector, zh, en) => document.querySelectorAll(selector).forEach(el => {
    const value = choose(zh, en);
    let node = [...el.childNodes].find(child => child.nodeType === Node.TEXT_NODE);
    if (!node) { node = document.createTextNode(""); el.insertBefore(node, el.firstChild); }
    if (node.nodeValue !== value) node.nodeValue = value;
  });

  const textRules = [
    ["#skillBtn", "技能", "Skills"],
    ["#closeDrawer", "关闭", "Close"],
    ["#templatePanel #useCurrentPrompt", "读取当前内容", "Use current prompt"],
    ["#templatePanel #cancelTemplateEdit", "取消编辑", "Cancel editing"],
    ["#templatePanel #saveTemplate", "＋ 保存为新模板", "+ Save new template"],
    ["#skillPanel .skill-base-note b", "H3 格式技能始终启用", "H3 format skill is always enabled"],
    ["#skillPanel .skill-base-note span", "创意增强技能只影响构思、表演、视觉与声音，不会替换 MiniMax H3 标准输出结构。", "Creative skills affect concept, performance, visuals, and sound without replacing the standard MiniMax H3 structure."],
    ["#skillPanel #cancelSkillEdit", "取消编辑", "Cancel editing"],
    ["#skillPanel #saveSkill", "＋ 保存为新 Skill", "+ Save new Skill"],
    ["#skillPanel .skill-security-note", "导入文件中的工具调用、联网、审批与输出格式指令会被忽略；仅把创作相关规则交给本地 AI。SKILL.md 引用的外部文件不会自动读取。", "Tool calls, networking, approval requests, and output-format overrides in imported files are ignored. Only creative guidance is sent to the local AI; linked files are not read automatically."],
    [".prompt-column .pane-toolbar > strong", "提示词与剧本", "Prompt & script"],
    ["#resetLayout", "重置布局", "Reset layout"],
    ["#scriptWorkflow .workflow-steps span:nth-child(1)", "1 创意", "1 Brief"],
    ["#scriptWorkflow .workflow-steps span:nth-child(2)", "2 分段剧本", "2 Script"],
    ["#scriptWorkflow .workflow-steps span:nth-child(3)", "3 人工确认", "3 Review"],
    ["#scriptWorkflow .workflow-steps span:nth-child(4)", "4 H3 提示词", "4 H3 prompt"],
    ["#scriptWorkflow .section-title h2", "剧本策划", "Script planning"],
    ["#scriptWorkflow .section-title p", "本地 Ollama 先生成可编辑剧本，不会直接覆盖提示词", "The local AI drafts an editable script without overwriting the prompt."],
    ["#scriptOutputLanguage option[value='zh']", "中文", "Chinese"],
    ["#scriptWorkflow .script-reference-bar > span", "快速引用：", "Quick references:"],
    [".mode[data-mode='Hybrid'] small", "图片＋视频＋声音", "Images + video + audio"],
    ["#scriptWorkflow label:nth-of-type(2) > span", "类型", "Genre"],
    ["#scriptWorkflow label:nth-of-type(3) > span", "目标观众", "Target audience"],
    ["#scriptWorkflow label:nth-of-type(4) > span", "语气与节奏", "Tone & pacing"],
    [".skill-quick > div > b", "创意增强技能（可多选）", "Creative enhancement skills (multi-select)"],
    ["#activeSkillChips small", "未选择；将只使用 H3 标准格式技能", "None selected; only the standard H3 format skill will be used"],
    ["#manageSkills", "管理技能", "Manage skills"],
    [".prompt-column .reference-bar-label", "素材引用：", "Media references:"],
    [".generation-column .pane-toolbar > strong", "生成设置与参考素材", "Generation setup & references"],
    [".generation-column .column-heading h2", "模式、素材与画面参数", "Mode, references & canvas"],
    [".generation-column .column-heading small", "生成所需设置集中在这里", "All generation controls in one place"],
    ["#roleManager .role-manager-head b", "参考图用途选项", "Reference type options"],
    ["#roleManager .role-manager-head small", "人物、产品、场景、风格等选项可新增、改名或删除", "Add, rename, or remove character, product, scene, and style types."],
    ["#addRole", "＋ 添加选项", "+ Add option"],
    ["#audioReferenceSection .upload-head b", "声音参考", "Audio references"],
    ["#audioReferenceSection .upload-head small", "对应 ComfyUI 的 drive_audio / ref_audio / final_audio", "Maps to ComfyUI drive_audio / ref_audio / final_audio"],
    ["#clearAudios", "清空声音", "Clear audio"],
    ["#audioReferenceSection .audio-drop span", "＋ 选择或拖入声音文件", "+ Choose or drop audio files"],
    ["#audioReferenceSection .audio-drop small", "最多3个独立 Audio；文件只保存在项目中，不上传互联网", "Up to 3 Audio references; files stay in the local project."],
    ["#audioReferenceSection .audio-options label:nth-child(1) > span", "音频模式", "Audio mode"],
    ["#audioReferenceSection .audio-options label:nth-child(2) > span", "主音频说明", "Main audio direction"],
    ["#videoReferenceSection .upload-head b", "视频参考", "Video references"],
    ["#videoReferenceSection .upload-head small", "用于视频编辑、续写、动作、运镜或时间结构参考", "Use for video editing, continuation, motion, camera, or temporal structure."],
    ["#clearVideos", "清空视频", "Clear videos"],
    ["#videoReferenceSection .video-drop span", "＋ 选择或拖入视频文件", "+ Choose or drop video files"],
    ["#videoReferenceSection .video-drop small", "最多3个 Video；生成请求使用文件名、用途和说明，不上传视频文件", "Up to 3 Videos; generation uses their filenames, roles, and descriptions without uploading the video files."],
    [".picture-clipboard-help", "拖拽每张卡片上的 ⠿ 可调整 Picture 顺序。点击卡片选为剪贴板目标：Ctrl+C 复制，Ctrl+V 替换；按 Esc 取消目标后 Ctrl+V 会新增图片。也支持直接粘贴截图或系统剪贴板图片。", "Drag ⠿ on a card to reorder Pictures. Select a card as the clipboard target: Ctrl+C copies it and Ctrl+V replaces it. Press Esc to clear the target; Ctrl+V then adds a new image. Screenshots and clipboard images can also be pasted directly."],
    ["#previews .picture-selection-hint", "剪贴板目标", "Clipboard target"],
    [".output-panel .pane-toolbar > strong", "生成结果", "Result"],
    [".generate em", "CTRL ENTER", "CTRL ENTER"],
    ["#settingsDialog label:nth-of-type(1) > span", "AI 后端", "AI backend"],
    ["#settingsDialog label:nth-of-type(2) > span", "服务地址", "Service address"],
    ["#settingsDialog #apiKeyRow > span", "API Key（本地服务可留空）", "API key (optional for local services)"],
    ["#settingsDialog .setting-check > span", "生成完成后自动卸载当前后端模型并释放显存", "Unload the current backend model after generation to release VRAM"],
    ["#imagePreviewDialog #copyPreviewImage", "复制图片", "Copy image"],
    ["#imagePreviewDialog .template-save", "关闭", "Close"],
  ];

  const placeholderRules = [
    ["#drawerSearch", "搜索当前列表", "Search this list"],
    ["#templateName", "模板名称", "Template name"],
    ["#templateIdea", "模板内容", "Template content"],
    ["#templateStyle", "视觉风格（可选）", "Visual style (optional)"],
    ["#skillName", "Skill 名称", "Skill name"],
    ["#skillDescription", "Skill 说明：适合什么内容、会带来什么效果", "Skill description: best use and intended effect"],
    ["#skillInstructions", "Skill 创作规则。可导入 SKILL.md 后检查与修改。", "Creative rules. Import a SKILL.md, then review and edit it."],
    ["#scriptAudience", "例如：马来西亚华人消费者", "Example: Malaysian Chinese consumers"],
    ["#scriptTone", "例如：夸张、快速、喜剧感", "Example: exaggerated, fast, comedic"],
    ["#scriptResult", "生成后的剧本会显示在这里；你可以直接编辑、删改对白和动作。", "The generated script appears here for editing, dialogue changes, and action revisions."],
    ["#newRoleName", "输入新用途，例如：服装参考", "Add a type, for example: wardrobe reference"],
    ["#audioDirection", "例如：Audio 1 是女店员声音音色参考", "Example: Audio 1 is the female staff voice reference"],
    ["#previews .reference-description", "具体说明，例如：华人女销售、店外、LOGO", "Details, for example: saleswoman, storefront, logo"],
  ];

  const titleRules = [
    ["#resetLayout", "恢复默认三栏宽度", "Restore default three-column widths"],
    ["#themeBtn", "切换日间/夜间主题", "Switch light/dark theme"],
    ["[data-splitter='prompt']", "调整提示词栏宽度", "Resize the prompt column"],
    ["[data-splitter='generation']", "调整生成设置栏宽度", "Resize the generation setup column"],
    ["#refreshModels", "刷新模型", "Refresh models"],
    ["#releaseVram", "自动识别后端并卸载模型释放显存", "Unload the backend model and release VRAM"],
    ["#previews .drag-handle", "按住拖到任意 Picture 前后", "Drag before or after any Picture"],
  ];

  const builtInTemplates = {
    cinematic: ["电影叙事", "Cinematic story", "主体在明确场景中完成一段连续、有起承转合的动作。镜头从环境建立，推进到动作特写，最后以清晰结果收束。", "A subject completes a continuous dramatic action in a clearly established setting, moving from an establishing shot to action details and a clear resolution."],
    ad: ["产品广告", "Product ad", "展示产品外观、使用过程、核心卖点和最终行动号召。画面简洁高级，产品始终清晰。", "Show the product, how it is used, its core selling point, and a final call to action in a clean premium presentation."],
    action: ["动作战斗", "Action battle", "两名角色进行连贯高速对决，攻防关系清楚，最后出现决定性必杀技与结果镜头。", "Two characters perform a coherent high-speed fight with readable offense, defense, a decisive finishing move, and a result shot."],
    meme: ["夸张表情短片", "Exaggerated meme short", "角色以适合情境的夸张表情和肢体动作完成表演，配合弹性形变、快速推拉和喜剧音效。", "A character performs with context-appropriate exaggerated expressions, elastic movement, punchy camera moves, and comic sound effects."],
  };

  const builtInSkills = {
    "skill-abstract-expression": ["为短视频选择与情境相关的漫剧/表情包演技、弹性形变、喜剧节奏和同步音效。", "Adds context-appropriate meme acting, elastic deformation, comic timing, and synchronized sound effects."],
    "skill-brand-promo": ["根据真实品牌、产品和店面素材设计清晰卖点、镜头节奏与行动号召，避免虚构宣传。", "Builds clear selling points, shot rhythm, and calls to action from verified brand, product, and store assets without invented claims."],
    "skill-paper-collage": ["把概念转成高级纸张拼贴、半色调剪纸和逐件组装的定格动画说明风格。", "Turns concepts into premium paper collage, halftone cutouts, and piece-by-piece stop-motion explanations."],
  };

  const exactStates = new Map([
    ["正在检查 Ollama", "Checking AI backend"], ["Checking Ollama", "Checking AI backend"],
    ["等待生成 · 将使用下方的分段数量、每段秒数、语言和参考素材设置", "Waiting · the segment count, duration, language, and references below will be used"],
    ["服务异常", "Backend unavailable"], ["请输入创意内容", "Enter a creative brief"],
    ["请先生成并确认左侧剧本，确认后会自动进入直接提示词", "Generate and approve the script on the left; Direct prompt will open automatically"],
    ["T2VA不能上传参考媒体", "T2VA does not accept reference media"], ["FL2VA必须正好上传2张图", "FL2VA requires exactly two images"],
    ["请选择Ollama模型", "Select an AI model"], ["正在读取……", "Loading…"], ["没有发现模型", "No models found"], ["无法连接Ollama", "Cannot connect to the AI backend"],
    ["无法读取模型能力", "Cannot read model capabilities"], ["等待输入", "Waiting"],
    ["项目已保存", "Project saved"], ["配置已导入", "Configuration imported"], ["配置文件无效", "Invalid configuration file"],
    ["已复制", "Copied"], ["当前分段已复制", "Current segment copied"], ["剧本已复制", "Script copied"],
    ["已停止", "Stopped"], ["生成失败", "Generation failed"], ["剧本生成已停止", "Script generation stopped"],
    ["还没有可转换的剧本", "There is no script to convert"], ["请先输入剧本创意", "Enter a script brief first"], ["请选择 Ollama 模型", "Select an AI model"],
    ["模板已保存", "Template saved"], ["模板修改已保存", "Template changes saved"], ["模板已删除", "Template deleted"],
    ["模板已更换并应用", "Template applied"], ["请填写模板名称和内容", "Enter a template name and content"], ["已读取当前提示词内容", "Current prompt loaded"],
    ["Skill 已删除", "Skill deleted"], ["Skill 修改已保存", "Skill changes saved"], ["新 Skill 已保存", "New Skill saved"],
    ["SKILL.md 已读取，请检查说明与规则后保存", "SKILL.md loaded; review the description and rules before saving"],
    ["请填写 Skill 名称、说明和创作规则", "Enter the Skill name, description, and creative rules"],
    ["最多同时选择3个创意增强 Skill", "Select up to 3 creative enhancement Skills"],
    ["AI 后端连接成功", "AI backend connected"], ["无法连接 AI 后端，请检查地址、服务和 API Key", "Cannot connect to the AI backend; check the address, service, and API key"],
    ["用途选项已添加", "Reference type added"], ["请先选择要卸载的模型", "Select a model to unload first"],
    ["生成完成；仍有少量格式提醒，请检查结果", "Generation complete; review the remaining format warnings"],
    ["生成完成并已通过 H3 格式整理", "Generation complete and normalized to the H3 format"],
    ["分段剧本已生成，请检查和修改", "Segmented script generated; review and edit it"],
    ["剧本已送入 H3 转换区，可继续编辑或点击生成", "The script is ready in the H3 conversion area; edit it or generate the prompt"],
    ["剧本已送入直接提示词区，可继续编辑或点击生成", "The script is ready in Direct prompt; edit it or generate the prompt"],
    ["HYBRID最多支持3个Video参考", "HYBRID supports up to 3 Video references"],
    ["HYBRID至少需要1个参考图片、视频或声音", "HYBRID requires at least one reference image, video, or audio"],
    ["你安装的T8 Hybrid节点最多支持9张Picture", "The installed T8 Hybrid node supports up to 9 Pictures"],
    ["记录已载入", "Record loaded"], ["用途选项已删除", "Reference type deleted"],
    ["参考图已删除，Picture 编号已自动更新", "Reference deleted; Picture numbers were updated automatically"],
    ["已取消 Picture 剪贴板目标；现在粘贴会新增图片", "Clipboard target cleared; pasting now adds a new Picture"],
    ["参考图最多12张", "Up to 12 reference images are allowed"],
  ]);
  const reverseStates = new Map([...exactStates].map(([zh, en]) => [en, zh]));

  function applyDrawerHeader() {
    const active = [...document.querySelectorAll(".drawer-panel")].find(panel => !panel.classList.contains("hidden"));
    if (!active) return;
    const data = active.id === "historyPanel"
      ? ["项目与生成历史", "Projects & generation history", "点击记录即可载入；可随时删除不需要的记录。", "Load any record or delete entries you no longer need."]
      : active.id === "templatePanel"
        ? ["模板管理", "Template manager", "可以新增、选择、编辑、替换和删除所有模板。", "Create, choose, edit, replace, and delete templates."]
        : ["创意增强技能库", "Creative enhancement Skills", "可多选 Skill；支持新增、编辑、删除，以及导入本地 SKILL.md。", "Select multiple Skills, create or edit entries, and import local SKILL.md files."];
    setText("#drawerTitle", data[0], data[1]);
    setText("#drawerHelp", data[2], data[3]);
  }

  function applyThemeButton() {
    const dark = document.documentElement.dataset.theme !== "light";
    setText("#themeBtn", dark ? "☀ 日间" : "☾ 夜间", dark ? "☀ Light" : "☾ Dark");
    setTitle("#themeBtn", dark ? "切换到日间主题" : "切换到夜间主题", dark ? "Switch to light theme" : "Switch to dark theme");
  }

  function applyFocusButtons() {
    document.querySelectorAll(".pane-focus").forEach(button => {
      const active = button.classList.contains("is-active");
      const value = choose(active ? "↩ 恢复三栏" : "⛶ 专注", active ? "↩ Restore columns" : "⛶ Focus");
      if (button.textContent !== value) button.textContent = value;
    });
  }

  function applyOptions() {
    const options = [
      ["#scriptGenre option:nth-child(1)", "广告短片", "Advertisement"], ["#scriptGenre option:nth-child(2)", "剧情短剧", "Narrative short"],
      ["#scriptGenre option:nth-child(3)", "动作短片", "Action short"], ["#scriptGenre option:nth-child(4)", "搞笑短片", "Comedy short"],
      ["#scriptGenre option:nth-child(5)", "修仙奇幻", "Fantasy cultivation"], ["#scriptGenre option:nth-child(6)", "产品介绍", "Product introduction"], ["#scriptGenre option:nth-child(7)", "其他", "Other"],
      ["#audioMode option[value='native']", "native — 原生生成声音", "native — generate native audio"],
      ["#audioMode option[value='reference_only']", "reference_only — 仅参考语义/节奏", "reference_only — use semantics/rhythm only"],
      ["#audioMode option[value='lock_source']", "lock_source — 锁定源音频", "lock_source — preserve source audio"],
      ["#audioMode option[value='remix_source']", "remix_source — 保留结构并重绘", "remix_source — preserve structure and redraw"],
      ["#backend option[value='openai']", "OpenAI 兼容接口", "OpenAI-compatible API"],
    ];
    options.forEach(rule => setText(...rule));
  }

  function applyBuiltIns() {
    document.querySelectorAll("#templateList [data-use]").forEach(button => {
      const id = button.dataset.use, row = button.closest(".list-row"), copy = builtInTemplates[id];
      if (!row || !copy) return;
      const data = typeof allTemplates === "function" ? allTemplates().find(item => item.id === id) : null;
      if (!data || (data.name !== copy[0] && data.name !== copy[1])) return;
      const name = row.querySelector("b"), description = row.querySelector("small");
      if (name) { const value = choose(copy[0], copy[1]); if (name.textContent !== value) name.textContent = value; }
      if (description && (data.idea === copy[2] || data.idea === copy[3])) { const value = choose(copy[2], copy[3]).slice(0, 120); if (description.textContent !== value) description.textContent = value; }
    });
    document.querySelectorAll("#templateSelect option").forEach(option => {
      const copy = builtInTemplates[option.value];
      if (copy) { const value = choose(copy[0], copy[1]); if (option.textContent !== value) option.textContent = value; }
    });
    document.querySelectorAll("#skillList [data-toggle-skill]").forEach(button => {
      const id = button.dataset.toggleSkill, row = button.closest(".skill-row"), copy = builtInSkills[id];
      if (!row || !copy) return;
      const data = typeof allSkills === "function" ? allSkills().find(item => item.id === id) : null;
      if (!data?.builtin || (data.description !== copy[0] && data.description !== copy[1])) return;
      const description = row.querySelector(".skill-meta small"), source = row.querySelector(".skill-source");
      if (description) { const value = choose(copy[0], copy[1]); if (description.textContent !== value) description.textContent = value; }
      if (source) { const value = choose("内置适配 · MiniMax Skill", "Built-in adaptation · MiniMax Skill"); if (source.textContent !== value) source.textContent = value; }
    });
  }

  function applyActionButtons() {
    const actions = [
      ["#historyList button[data-store]:not([data-action])", "载入", "Load"], ["#historyList button[data-action='delete']", "删除", "Delete"],
      ["#templateList button[data-use]", "使用", "Use"], ["#templateList button[data-edit]", "编辑", "Edit"], ["#templateList button[data-delete]", "删除", "Delete"],
      ["#skillList button[data-edit-skill]", "编辑", "Edit"], ["#skillList button[data-delete-skill]", "删除", "Delete"],
      ["#previews button[data-view]", "查看", "View"], ["#previews button[data-copy]", "复制图片", "Copy image"],
      ["#previews button[data-delete]", "删除", "Delete"],
      ["#previews .drag-handle", "⠿ 拖拽排序", "⠿ Reorder"],
      ["#roleList button[data-role-edit]", "编辑", "Edit"], ["#roleList button[data-role-delete]", "删除", "Delete"],
    ];
    actions.forEach(rule => setText(...rule));
    setLabelText("#skillPanel .skill-editor-actions .import-label", "导入 SKILL.md", "Import SKILL.md");
    setLabelText("#previews .replace-button", "替换", "Replace");
    document.querySelectorAll("#skillList button[data-toggle-skill]").forEach(button => {
      const selected = button.classList.contains("active");
      button.textContent = choose(selected ? "已选择" : "选择", selected ? "Selected" : "Select");
    });
    [["#saveTemplate", "保存修改", "Save changes"], ["#saveSkill", "保存修改", "Save changes"],
      ["#saveSkill", "＋ 保存导入的 Skill", "+ Save imported Skill"]].forEach(([selector, zh, en]) => {
      document.querySelectorAll(selector).forEach(button => {
        if (language() === "en" && button.textContent === zh) button.textContent = en;
        if (language() === "zh" && button.textContent === en) button.textContent = zh;
      });
    });
    document.querySelectorAll("#skillList .skill-source").forEach(el => {
      if (language() === "en" && el.textContent === "自定义 Skill") el.textContent = "Custom Skill";
      if (language() === "zh" && el.textContent === "Custom Skill") el.textContent = "自定义 Skill";
    });
  }

  function applyReferenceTypes() {
    const roles = new Map([
      ["人物参考", "Character reference"], ["产品参考", "Product reference"], ["场景参考", "Scene reference"],
      ["风格参考", "Style reference"], ["LOGO参考", "Logo reference"], ["服装参考", "Wardrobe reference"],
      ["道具参考", "Prop reference"], ["视觉参考", "Visual reference"],
    ]);
    const reverse = new Map([...roles].map(([zh, en]) => [en, zh]));
    document.querySelectorAll("#roleList .role-chip span,#previews .reference-type option").forEach(el => {
      const current = el.textContent.trim();
      const value = language() === "en" ? (roles.get(current) || current) : (reverse.get(current) || current);
      if (el.textContent.trim() !== value) el.textContent = value;
    });
    document.querySelectorAll("#previews .reference-type").forEach((el, index) => {
      const value = choose(`Picture ${index + 1} 用途`, `Picture ${index + 1} type`);
      if (el.getAttribute("aria-label") !== value) el.setAttribute("aria-label", value);
    });
  }

  function applyListStates() {
    const emptyStates = [
      ["#historyList > p", "暂无记录", "No records yet"],
      ["#templateList > p", "暂无模板，可以在上方建立。", "No templates yet. Create one above."],
      ["#skillList > p", "暂无 Skill，可以在上方新增或导入。", "No Skills yet. Create or import one above."],
      ["#roleList > small", "暂无用途选项，请添加一个。", "No reference types yet. Add one above."],
      ["#videoList > small", "尚未添加视频。Hybrid 最多支持3个独立编号的 Video 参考。", "No video added. Hybrid supports up to 3 independently numbered Video references."],
    ];
    emptyStates.forEach(rule => setText(...rule));
    document.querySelectorAll("#historyList .list-row small").forEach(el => {
      const current = el.textContent;
      const value = language() === "en"
        ? current.replace(/^项目 · /, "Project · ").replace(/^历史 · /, "History · ")
        : current.replace(/^Project · /, "项目 · ").replace(/^History · /, "历史 · ");
      if (current !== value) el.textContent = value;
    });
  }

  function translateStateElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    let value = el.textContent.trim();
    if (language() === "en") {
      value = exactStates.get(value) || value
        .replace(/^(I2VA|L2VA|Ref2VA)至少需要1张参考图$/, "$1 requires at least one reference image")
        .replace(/^配置有效 · (.+) · (\d+)段 × ([\d.]+)秒 · (.+)$/, "Valid · $1 · $2 segment(s) × $3s · $4")
        .replace(/^配置有效/, "Valid")
        .replace(/个模型$/, " models")
        .replace(/^正在流式生成并校验 H3 格式……$/, "Streaming and validating the H3 format…")
        .replace(/^完成 · (\d+) 个提示词段落/, "Complete · $1 prompt segment(s)")
        .replace(/^剧本完成 · (\d+) 段 · 可直接编辑，确认后再转换$/, "Script complete · $1 segment(s) · edit and approve before conversion")
        .replace(/^正在由本地模型策划分段剧本……$/, "The local model is planning a segmented script…")
        .replace(/^✓ 多模态视觉/, "✓ Multimodal vision")
        .replace(/^⚠ 未检测到视觉能力；T2VA可用$/, "⚠ No vision capability detected; T2VA is available")
        .replace(/^⚠ 未检测到视觉能力；参考图模式可能无效$/, "⚠ No vision capability detected; reference modes may not work");
      value = value
        .replace(/^已复制 Picture (\d+) 编号$/, "Copied the Picture $1 label")
        .replace(/^Picture (\d+) 图片已复制$/, "Picture $1 image copied")
        .replace(/^Picture (\d+) 已复制为图片数据$/, "Picture $1 copied as image data")
        .replace(/^Picture (\d+) 已替换$/, "Picture $1 replaced")
        .replace(/^已从剪贴板替换 Picture (\d+)$/, "Replaced Picture $1 from the clipboard")
        .replace(/^已从剪贴板新增 Picture (\d+)$/, "Added Picture $1 from the clipboard")
        .replace(/^已用复制内容替换 Picture (\d+)$/, "Replaced Picture $1 with the copied image")
        .replace(/^已粘贴为 Picture (\d+)$/, "Pasted as Picture $1")
        .replace(/^参考图已重排：当前图片现在是 Picture (\d+)，相关文字编号已同步更新$/, "References reordered; this image is now Picture $1 and text references were updated")
        .replace(/^(.+) 模型已卸载，显存正在释放$/, "$1 model unloaded; VRAM is being released")
        .replace(/^释放显存失败：/, "Failed to release VRAM: ");
    } else value = reverseStates.get(value) || value;
    if (el.textContent.trim() !== value) el.textContent = value;
  }

  function applyLanguageValue() {
    const input = document.querySelector("#language");
    if (!input) return;
    if (language() === "en" && input.value === "自动识别") input.value = "Auto detect";
    if (language() === "zh" && input.value === "Auto detect") input.value = "自动识别";
    const project = document.querySelector("#projectName");
    if (project && language() === "en" && project.value === "未命名项目") project.value = "Untitled project";
    if (project && language() === "zh" && project.value === "Untitled project") project.value = "未命名项目";
    document.querySelectorAll("#audioList [data-audio-role]").forEach(input => {
      if (language() === "en" && input.value === "声音/节奏参考") input.value = "Sound/rhythm reference";
      if (language() === "zh" && input.value === "Sound/rhythm reference") input.value = "声音/节奏参考";
    });
  }

  function applyBackendGuide() {
    const guide = document.querySelector("#ollamaGuide");
    if (!guide || !guide.textContent.trim()) return;
    const en = '<b>AI backend troubleshooting</b><ol><li>Start Ollama or run <code>ollama serve</code></li><li>Confirm the address, usually <code>http://127.0.0.1:11434</code></li><li>Reference modes require a vision model, for example <code>ollama pull qwen3.5:9b</code></li></ol>';
    const zh = '<b>Ollama 离线排查</b><ol><li>启动 Ollama 应用或运行 <code>ollama serve</code></li><li>确认地址通常为 <code>http://127.0.0.1:11434</code></li><li>参考图模式请安装多模态模型，例如 <code>ollama pull qwen3.5:9b</code></li></ol>';
    const value = language() === "en" ? en : zh;
    if (guide.innerHTML !== value) guide.innerHTML = value;
  }

  const englishChangelog = `<b>v0.8.4</b><ul><li>Hybrid no longer requires first or last frames and can directly combine images, Video, and Audio references</li><li>Switching modes retains all media; inactive media is temporarily excluded from requests</li><li>Video cards support custom-time first-frame capture plus player, duration, resolution, and size metadata</li><li>Audio cards include playback, duration, and file size</li></ul><b>v0.8.3</b><ul><li>Improved Hybrid keyframe-role detection; v0.8.4 relaxes that restriction for the actual workflow</li></ul><b>v0.8.2</b><ul><li>The @ media menu supports Picture, Video, and Audio with independent numbering</li><li>Direct prompt and Script workflow can insert and navigate Video/Audio tags</li><li>Video and audio upload zones support drag and drop, type filtering, and visual feedback</li></ul><b>v0.8.1</b><ul><li>Direct prompt and Script workflow now show independently</li><li>Hybrid supports independently numbered Video references and H3 metadata</li><li>Workflow order corrected to 01 Creative, 02 Mode, and 03 Canvas</li></ul><b>v0.8.0</b><ul><li>Complete Chinese and English interface coverage</li><li>Floating searchable managers for history, templates, and Skills</li><li>Language regression checks for static and dynamic UI</li></ul><b>v0.7.1</b><ul><li>Resizable columns with remembered widths</li><li>Focus mode for each workspace column</li><li>Improved layout at 1366px width</li></ul><b>v0.7.0</b><ul><li>Three-column desktop workspace</li><li>Independent column scrolling and responsive fallback</li></ul><b>Earlier versions</b><ul><li>Picture ordering, Skills, templates, script workflow, multiple AI backends, and standard H3 formatting</li></ul>`;
  const changelog = document.querySelector(".changelog");
  const chineseChangelog = changelog?.innerHTML || "";

  function applyDynamic() {
    applyDrawerHeader(); applyThemeButton(); applyFocusButtons(); applyOptions(); applyBuiltIns(); applyActionButtons(); applyReferenceTypes(); applyListStates(); applyLanguageValue(); applyBackendGuide();
    ["#validation", "#status > span:last-child", "#resultMeta", "#scriptStatus", "#capability"].forEach(translateStateElement);
    if (changelog) {
      const value = language() === "en" ? englishChangelog : chineseChangelog;
      if (changelog.innerHTML !== value) changelog.innerHTML = value;
    }
    window.H3Management?.filterRows();
  }

  function apply() {
    textRules.forEach(rule => setText(...rule));
    placeholderRules.forEach(rule => setPlaceholder(...rule));
    titleRules.forEach(rule => setTitle(...rule));
    const offline = document.querySelector(".tips p");
    if (offline) offline.textContent = choose("工具只请求你设置的 AI 后端地址，不会主动把参考素材发送到其他服务。", "References are sent only to your configured AI backend and never to other services automatically.");
    applyDynamic();
  }

  const langButton = document.querySelector("#langBtn");
  if (langButton?.onclick) {
    const original = langButton.onclick;
    langButton.onclick = function(event) {
      const result = original.call(this, event);
      if (typeof renderVideos === "function") setTimeout(renderVideos, 0);
      setTimeout(apply, 0);
      return result;
    };
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#historyBtn,#templateBtn,#skillBtn,#manageSkills,#themeBtn,#newProject,.pane-focus,#resetLayout")) setTimeout(applyDynamic, 0);
  });

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; applyDynamic(); });
  });
  ["#workspaceDrawer", "#validation", "#status", "#resultMeta", "#scriptStatus", "#capability", "#previews", "#videoList", "#audioList", "#model", ".pane-toolbar", "#themeBtn", "#ollamaGuide"].forEach(selector => {
    const node = document.querySelector(selector);
    if (node) observer.observe(node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  });

  window.H3CompleteI18n = { apply, language };
  apply();
})();
