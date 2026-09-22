(() => {
  const tr = (zh, en) => uiLang === 'en' ? en : zh;
  const languageSelect = document.querySelector('#scriptOutputLanguage');
  const bilingualOption = document.createElement('option');
  bilingualOption.value = 'bilingual';
  languageSelect.append(bilingualOption);
  const promptLanguageSelect = document.querySelector('#promptOutputLanguage');
  const customPromptOption = document.createElement('option');
  customPromptOption.value = 'custom';
  promptLanguageSelect.append(customPromptOption);

  const customField = document.createElement('label');
  customField.className = 'bilingual-language-field hidden';
  customField.innerHTML = '<span id="customScriptLanguageLabel"></span><input id="customScriptLanguage" maxlength="50" autocomplete="off" value="Bahasa Melayu">';
  languageSelect.closest('.field-grid').append(customField);
  const customPromptField = document.createElement('label');
  customPromptField.className = 'bilingual-language-field hidden';
  customPromptField.innerHTML = '<span id="customPromptLanguageLabel"></span><input id="customPromptLanguage" maxlength="50" autocomplete="off" value="Bahasa Melayu">';
  promptLanguageSelect.closest('.field-grid').append(customPromptField);

  const tabs = document.createElement('div');
  tabs.id = 'scriptLanguageTabs';
  tabs.className = 'script-language-tabs hidden';
  tabs.innerHTML = '<button type="button" class="ghost" data-script-version="english">English</button><button type="button" class="ghost" data-script-version="custom" id="customScriptTab">Custom</button><small id="scriptVersionNote"></small><button type="button" class="ghost" id="copyBilingualScript"></button><button type="button" class="ghost" id="downloadBilingualScript"></button>';
  document.querySelector('#scriptResult').before(tabs);

  let versions = {english: '', custom: '', language: ''};
  let active = 'custom';
  let translating = false;
  const customInput = document.querySelector('#customScriptLanguage');
  const customPromptInput = document.querySelector('#customPromptLanguage');
  const scriptResult = document.querySelector('#scriptResult');

  function validLanguage(value) {
    const text = String(value || '').trim();
    return text.length > 0 && text.length <= 50 && /^[\p{L}\p{M} ()（）-]+$/u.test(text);
  }
  function hasVersions() { return Boolean(versions.english || versions.custom); }
  function commitActive() {
    if (!hasVersions()) return;
    versions[active] = scriptResult.value;
  }
  function labels() {
    bilingualOption.textContent = tr('双语：English + 自定义', 'Bilingual: English + custom');
    customPromptOption.textContent = tr('自定义语言', 'Custom language');
    document.querySelector('#customScriptLanguageLabel').textContent = tr('自定义输出语言', 'Custom output language');
    document.querySelector('#customPromptLanguageLabel').textContent = tr('H3 自定义输出语言', 'Custom H3 output language');
    customInput.placeholder = tr('例如：Bahasa Melayu、日本語、ไทย', 'For example: Bahasa Melayu, 日本語, ไทย');
    customPromptInput.placeholder = tr('例如：中文、Bahasa Melayu、日本語', 'For example: Chinese, Bahasa Melayu, 日本語');
    document.querySelector('#copyBilingualScript').textContent = tr('复制双语', 'Copy both');
    document.querySelector('#downloadBilingualScript').textContent = tr('下载双语', 'Download both');
    document.querySelector('#customScriptTab').textContent = versions.language || customInput.value.trim() || tr('自定义语言', 'Custom');
    updateMode();
    updatePromptMode();
  }
  function updateMode() {
    const selected = languageSelect.value === 'bilingual';
    customField.classList.toggle('hidden', !selected);
    tabs.classList.toggle('hidden', !hasVersions());
    if (hasVersions()) switchVersion(active, false);
  }
  function updatePromptMode() {
    customPromptField.classList.toggle('hidden', promptLanguageSelect.value !== 'custom');
  }
  function setActionState() {
    const source = hasVersions() && active === 'english';
    scriptResult.readOnly = source || translating;
    scriptResult.classList.toggle('bilingual-source', source);
    document.querySelector('#reviewScript').disabled = source || translating;
    document.querySelector('#confirmScript').disabled = source || translating;
    document.querySelector('#applyRevisedScript').disabled = source || !storyReviewState.revisedScript.trim() || reviewedScriptSource !== scriptResult.value;
    document.querySelector('#scriptVersionNote').textContent = source
      ? tr('英文母版只读；切换至自定义语言后可编辑、检查剧情或转换 H3。', 'English source is read-only. Edit, review, or convert the custom version.')
      : tr('自定义语言版本可编辑，并作为剧情检查与 H3 转换依据。', 'The custom version is editable and is used for story review and H3 conversion.');
  }
  function switchVersion(next, save = true) {
    if (!hasVersions()) return;
    if (save) commitActive();
    active = next === 'english' ? 'english' : 'custom';
    scriptResult.value = versions[active] || '';
    tabs.querySelectorAll('[data-script-version]').forEach(button => button.classList.toggle('active', button.dataset.scriptVersion === active));
    setActionState();
  }
  function clearVersions() {
    versions = {english: '', custom: '', language: ''};
    active = 'custom';
    tabs.classList.add('hidden');
    scriptResult.readOnly = false;
    scriptResult.classList.remove('bilingual-source');
    setActionState();
  }
  function combinedText() {
    commitActive();
    const language = versions.language || customInput.value.trim() || 'CUSTOM';
    return `=== ENGLISH VERSION ===\n${versions.english.trim()}\n\n=== ${language.toUpperCase()} VERSION ===\n${versions.custom.trim()}\n`;
  }

  tabs.querySelectorAll('[data-script-version]').forEach(button => button.onclick = () => switchVersion(button.dataset.scriptVersion));
  customInput.addEventListener('input', () => { if (!versions.language) document.querySelector('#customScriptTab').textContent = customInput.value.trim() || tr('自定义语言', 'Custom'); });
  languageSelect.addEventListener('change', updateMode);
  promptLanguageSelect.addEventListener('change', updatePromptMode);
  document.querySelector('#langBtn').addEventListener('click', labels);
  document.querySelector('#copyBilingualScript').onclick = () => navigator.clipboard.writeText(combinedText()).then(() => toast(tr('双语剧本已复制', 'Both screenplay versions copied')));
  document.querySelector('#downloadBilingualScript').onclick = () => download(`${safeName(document.querySelector('#projectName').value || 'video-script')}-bilingual-script.txt`, combinedText(), 'text/plain');
  scriptResult.addEventListener('input', () => { if (hasVersions() && active === 'custom') versions.custom = scriptResult.value; });

  const originalPayload = payload;
  payload = function(forGeneration = false) {
    commitActive();
    const result = originalPayload(forGeneration);
    const promptLanguage = customPromptInput.value.trim();
    if (promptLanguageSelect.value === 'custom') result.promptOutputLanguage = `custom:${promptLanguage}`;
    return {...result, customScriptLanguage: customInput.value.trim(), customPromptLanguage: promptLanguage, bilingualScripts: {...versions}, activeScriptVersion: active};
  };

  const originalGenerate = generate;
  generate = async function() {
    if (promptLanguageSelect.value === 'custom' && !validLanguage(customPromptInput.value)) {
      toast(tr('请输入有效的 H3 自定义输出语言', 'Enter a valid custom H3 output language'));
      customPromptInput.focus();
      return;
    }
    return originalGenerate();
  };
  document.querySelector('#generate').onclick = generate;

  const originalGenerateScript = generateScript;
  generateScript = async function() {
    if (languageSelect.value !== 'bilingual') {
      clearVersions();
      return originalGenerateScript();
    }
    const language = customInput.value.trim();
    if (!validLanguage(language)) {
      toast(tr('请输入有效的自定义语言名称（只允许文字、空格、括号和连字符）', 'Enter a valid language name using letters, spaces, parentheses, or hyphens'));
      customInput.focus();
      return;
    }
    clearVersions();
    languageSelect.value = 'en';
    try {
      await originalGenerateScript();
    } finally {
      languageSelect.value = 'bilingual';
      updateMode();
    }
    const english = scriptResult.value.trim();
    if (!english || (english.match(/===\s*Segment\s+\d+/gi) || []).length !== Number(document.querySelector('#segmentCount').value)) {
      document.querySelector('#scriptStatus').textContent = tr('英文母版未完整生成，未开始翻译', 'English source was incomplete; translation was not started');
      return;
    }
    versions = {english, custom: '', language};
    active = 'english';
    labels();
    switchVersion('english', false);
    translating = true;
    scriptAborter = new AbortController();
    document.querySelector('#generateScript').disabled = true;
    document.querySelector('#stopScript').classList.remove('hidden');
    document.querySelector('#scriptStatus').textContent = tr(`英文母版完成 · 正在严格翻译为 ${language}……`, `English source complete · translating faithfully into ${language}…`);
    setActionState();
    try {
      const body = {...payload(), englishScript: english, customScriptLanguage: language, scriptOutputLanguage: `custom:${language}`};
      const response = await fetch('/api/script-translate', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: scriptAborter.signal});
      const data = await response.json().catch(() => ({error: response.statusText}));
      if (!response.ok) throw Error(data.error || response.statusText);
      versions = {english: data.english, custom: data.custom, language: data.language};
      active = 'custom';
      clearStoryReview();
      labels();
      switchVersion('custom', false);
      const retryNote = data.retried ? tr(' · 检测到混合语言后已自动重译', ' · automatically retried after mixed-language detection') : '';
      document.querySelector('#scriptStatus').textContent = tr(`双语剧本完成 · English + ${data.language}`, `Bilingual screenplay complete · English + ${data.language}`) + retryNote;
      toast(tr('双语剧本已生成，请检查自定义语言版本', 'Bilingual screenplay generated; review the custom version'));
    } catch (error) {
      active = 'english';
      switchVersion('english', false);
      document.querySelector('#scriptStatus').textContent = error.name === 'AbortError'
        ? tr('自定义语言翻译已停止；英文母版已保留', 'Custom translation stopped; English source retained')
        : `${tr('翻译失败；英文母版已保留', 'Translation failed; English source retained')}：${error.message}`;
    } finally {
      translating = false;
      scriptAborter = null;
      document.querySelector('#generateScript').disabled = false;
      document.querySelector('#stopScript').classList.add('hidden');
      setActionState();
    }
  };
  document.querySelector('#generateScript').onclick = generateScript;

  const originalConfirmScript = document.querySelector('#confirmScript').onclick;
  document.querySelector('#confirmScript').onclick = event => {
    if (hasVersions() && active === 'custom' && validLanguage(versions.language)) {
      customPromptInput.value = versions.language;
      promptLanguageSelect.value = 'custom';
      updatePromptMode();
    }
    originalConfirmScript(event);
  };

  const originalSnapshot = snapshot;
  snapshot = function() {
    commitActive();
    return {...originalSnapshot(), bilingualScripts: {...versions}, activeScriptVersion: active};
  };
  const originalApplySnapshot = applySnapshot;
  applySnapshot = function(value) {
    translating = false;
    originalApplySnapshot(value);
    const saved = value && value.bilingualScripts;
    if (saved && typeof saved.english === 'string' && typeof saved.custom === 'string' && typeof saved.language === 'string' && saved.english.length <= 200000 && saved.custom.length <= 200000 && validLanguage(saved.language)) {
      versions = {english: saved.english, custom: saved.custom, language: saved.language};
      active = value.activeScriptVersion === 'english' ? 'english' : 'custom';
      if (validLanguage(saved.language)) customInput.value = saved.language;
      labels();
      switchVersion(active, false);
    } else clearVersions();
    const config = value?.config || value || {};
    if (typeof config.promptOutputLanguage === 'string' && config.promptOutputLanguage.startsWith('custom:')) {
      const restoredLanguage = config.promptOutputLanguage.slice(7).trim();
      if (validLanguage(restoredLanguage)) customPromptInput.value = restoredLanguage;
      promptLanguageSelect.value = 'custom';
    } else if (validLanguage(config.customPromptLanguage || '')) {
      customPromptInput.value = config.customPromptLanguage;
    }
    updatePromptMode();
    updateMode();
  };

  const originalApplyRevision = document.querySelector('#applyRevisedScript').onclick;
  document.querySelector('#applyRevisedScript').onclick = event => {
    if (active === 'english' && hasVersions()) return;
    originalApplyRevision(event);
    if (hasVersions()) versions.custom = scriptResult.value;
    setActionState();
  };

  labels();
  updateMode();
  window.H3Bilingual = {validLanguage, switchVersion, getVersions: () => ({...versions}), combinedText, updatePromptMode};
})();
