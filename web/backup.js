(() => {
  const fields = ['width','height','quality','segmentCount','segmentSeconds','language','promptOutputLanguage','customPromptLanguage','scriptOutputLanguage','customScriptLanguage','style','music','sound','negative','temperature','context','audioMode','audioDirection','scriptGenre','scriptAudience','scriptTone'];
  const keys = ['h3.settings','h3.templates.v2','h3.skills.v1','h3.selectedSkills','h3.layout.v1','h3.defaults.v1','h3.reversePrompts.v1'];
  const box = document.createElement('section');
  box.id = 'backupControls';
  box.innerHTML = '<hr><p id="backupHelp"></p><label class="setting-check"><input type="checkbox" id="backupSecrets"><span id="backupSecretsLabel"></span></label><div class="dialog-actions"><button type="button" class="ghost" id="exportAll"></button><label class="ghost import-label"><span id="importAllLabel"></span><input id="importAll" type="file" accept="application/json,.json"></label></div>';
  document.querySelector('#settingsDialog .dialog-actions').before(box);
  function labels() {
    const en = uiLang === 'en';
    const texts = {backupHelp: en ? 'Back up all saved templates, Skills, settings, generation defaults, and column layout. Projects, history, and media are not included. Import merges libraries and updates settings after confirmation.' : '备份全部已保存模板、技能、设置、生成参数和三栏布局；不含项目、历史和素材。导入经确认后合并资料库并更新设置。', backupSecretsLabel: en ? 'Include API Key (sensitive; do not share this backup)' : '包含 API Key（敏感信息，请勿分享此备份）', exportAll: en ? 'Export full backup' : '一键导出全部设定', importAllLabel: en ? 'Import full backup' : '一键导入全部设定'};
    Object.entries(texts).forEach(([id,text]) => { const el=document.getElementById(id); if(el.textContent!==text)el.textContent=text; });
  }
  labels();
  document.querySelector('.output-panel .eyebrow').textContent='LOCAL GENERATION · V0.8.17';
  document.querySelector('#langBtn').addEventListener('click', labels);
  function defaults() {return {mode,aspectRatio:ratio,fields:Object.fromEntries(fields.map(id=>[id,document.getElementById(id).value]))};}
  function makeBackup(includeSecrets=false) {
    const saved = {...settings,language:uiLang,theme:colorTheme};
    if(!includeSecrets)delete saved.apiKey;
    return {format:'h3-studio-backup',version:1,createdAt:new Date().toISOString(),settings:saved,templates:allTemplates(),skills:allSkills(),selectedSkillIds:[...selectedSkillIds],reversePrompts:JSON.parse(localStorage.getItem('h3.reversePrompts.v1')||'[]'),layout:JSON.parse(localStorage.getItem('h3.layout.v1')||'null'),defaults:defaults()};
  }
  function validateBackup(data) {
    const object=x=>x && typeof x==='object' && !Array.isArray(x);
    if(!object(data)||data.format!=='h3-studio-backup'||data.version!==1||!object(data.settings)||!object(data.defaults)||!object(data.defaults.fields))throw Error('Invalid backup format / 备份格式无效');
    for(const [key,required] of [['templates',['id','name','idea']],['skills',['id','name','description','instructions']]]) {
      if(!Array.isArray(data[key])||data[key].length>2000)throw Error('Invalid library / 资料库无效');
      const seen=new Set();
      for(const row of data[key]) {
        if(!object(row)||required.some(k=>typeof row[k]!=='string')||!row.id||!row.name||seen.has(row.id))throw Error('Invalid library entry / 资料项无效');
        for(const k of ['style','source'])if(row[k]!==undefined&&typeof row[k]!=='string')throw Error('Invalid text field / 文本字段无效');
        seen.add(row.id);
      }
    }
    if(!Array.isArray(data.selectedSkillIds)||data.selectedSkillIds.some(id=>typeof id!=='string'||!data.skills.some(s=>s.id===id))||data.selectedSkillIds.length>3)throw Error('Invalid selected Skills / 已选技能无效');
    if(data.reversePrompts===undefined)data.reversePrompts=JSON.parse(localStorage.getItem('h3.reversePrompts.v1')||'[]');
    if(!Array.isArray(data.reversePrompts)||data.reversePrompts.length>100||data.reversePrompts.some(row=>!object(row)||typeof row.id!=='string'||!row.id||!['image','video'].includes(row.kind)||typeof row.name!=='string'||!row.name||typeof row.prompt!=='string'||!row.prompt||row.prompt.length>12000))throw Error('Invalid reverse prompts / 反推提示词无效');
    if(!['T2VA','I2VA','FL2VA','L2VA','Ref2VA','Hybrid'].includes(data.defaults.mode)||!['1:1','2:3','3:2','3:4','4:3','9:16','16:9','21:9'].includes(data.defaults.aspectRatio))throw Error('Invalid generation defaults / 生成参数无效');
    for(const id of fields) {
      const val=data.defaults.fields[id],el=document.getElementById(id);
      if(['customScriptLanguage','customPromptLanguage'].includes(id)&&val===undefined)continue;
      if(typeof val!=='string')throw Error('Invalid generation field / 生成字段无效');
      if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===val))throw Error('Invalid selection / 选项无效');
      if(el.type==='number'&&(!Number.isFinite(Number(val))||val.trim()===''||(el.min!==''&&Number(val)<Number(el.min))||(el.max!==''&&Number(val)>Number(el.max))))throw Error('Invalid numeric setting / 数值设置无效');
    }
    if(data.layout!==null&&(!object(data.layout)||!Array.isArray(data.layout.ratios)||data.layout.ratios.length!==3||data.layout.ratios.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<=0)||![null,'prompt','generation','result'].includes(data.layout.focus)))throw Error('Invalid layout / 布局无效');
    if(data.settings.backend!==undefined&&!['ollama','lmstudio','llamacpp','openai'].includes(data.settings.backend))throw Error('Invalid backend / 后端无效');
    if(data.settings.language!==undefined&&!['zh','en'].includes(data.settings.language))throw Error('Invalid language / 界面语言无效');
    if(data.settings.theme!==undefined&&!['dark','light'].includes(data.settings.theme))throw Error('Invalid theme / 主题无效');
    for(const id of ['baseUrl','ollamaUrl','apiKey','lastModel','language','theme'])if(data.settings[id]!==undefined&&typeof data.settings[id]!=='string')throw Error('Invalid settings / 设置无效');
    if(data.settings.autoUnload!==undefined&&typeof data.settings.autoUnload!=='boolean')throw Error('Invalid unload setting / 卸载设置无效');
    if(data.settings.backendUrls!==undefined&&(!object(data.settings.backendUrls)||Object.values(data.settings.backendUrls).some(v=>typeof v!=='string')))throw Error('Invalid backend URLs / 后端地址无效');
    return data;
  }
  function mergeLibrary(current,incoming) {
    const merged=current.map(x=>({...x})),map=new Map();
    for(const row of incoming) {
      const old=merged.find(x=>x.id===row.id);
      if(!old){merged.push({...row});map.set(row.id,row.id);continue;}
      if(Object.keys(row).every(k=>JSON.stringify(old[k])===JSON.stringify(row[k]))){map.set(row.id,old.id);continue;}
      const same=merged.find(x=>x.name===row.name&&x.idea===row.idea&&x.instructions===row.instructions&&x.description===row.description&&x.style===row.style);
      if(same){map.set(row.id,same.id);continue;}
      const id='import-'+crypto.randomUUID();merged.push({...row,id});map.set(row.id,id);
    }
    return {merged,map};
  }
  function restoreBackup(raw) {
    const data=validateBackup(raw),templates=mergeLibrary(allTemplates(),data.templates),skills=mergeLibrary(allSkills(),data.skills);
    const old=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
    const allowed=['backend','baseUrl','ollamaUrl','backendUrls','apiKey','lastModel','language','theme','autoUnload'];
    const imported=Object.fromEntries(allowed.filter(k=>data.settings[k]!==undefined).map(k=>[k,data.settings[k]]));
    const values={'h3.settings':{...settings,...imported},'h3.templates.v2':templates.merged,'h3.skills.v1':skills.merged,'h3.selectedSkills':data.selectedSkillIds.map(id=>skills.map.get(id)),'h3.layout.v1':data.layout,'h3.defaults.v1':data.defaults,'h3.reversePrompts.v1':data.reversePrompts};
    try {
      localStorage.setItem('h3.backup.beforeImport.v1',JSON.stringify(old));
      for(const k of keys)localStorage.setItem(k,JSON.stringify(values[k]));
    } catch(error) {
      for(const k of keys)if(old[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,old[k]);
      throw error;
    }
    return {templates:templates.merged.length,skills:skills.merged.length};
  }
  document.querySelector('#exportAll').onclick=()=>{try{download('H3Studio-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(makeBackup(document.querySelector('#backupSecrets').checked),null,2),'application/json');}catch(error){toast(error.message);}};
  document.querySelector('#importAll').onchange=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try {
      if(file.size>10*1024*1024)throw Error('Backup exceeds 10 MB / 备份超过10MB');
      const data=validateBackup(JSON.parse(await file.text()));
      const message=uiLang==='en'?`Merge ${data.templates.length} templates and ${data.skills.length} Skills, update saved settings, and reload? Same-ID conflicts keep both versions. Unsaved input is not backed up; cancel and save the project first if needed.`:`合并 ${data.templates.length} 个模板和 ${data.skills.length} 个技能，更新设置并重新加载？同编号冲突会保留两个版本。未保存的输入不在此备份内；如需保留，请取消并先保存项目。`;
      if(!confirm(message))return;
      restoreBackup(data);location.reload();
    } catch(error){toast(error.message);}
  };
  const originalPayload=payload;
  payload=function(forGeneration=false){const result=originalPayload(),approved=result.scriptOutput.trim();if(forGeneration&&(!approved||!result.idea.includes(approved)))result.scriptOutput='';return result;};
  try {
    const saved=JSON.parse(localStorage.getItem('h3.defaults.v1')||'null');
    if(saved) {
      setMode(saved.mode);const button=[...document.querySelectorAll('.ratio')].find(b=>b.textContent===saved.aspectRatio);button?.click();
      for(const id of fields)if(typeof saved.fields?.[id]==='string')document.getElementById(id).value=saved.fields[id];
      total();validateConfig();
    }
  } catch(error){console.warn('Unable to restore generation defaults',error);}
  window.H3Backup={makeBackup,validateBackup,restoreBackup};
})();
