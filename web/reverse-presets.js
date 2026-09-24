(()=>{
const KEY="h3.reversePrompts.v1",el=id=>document.getElementById(id),select=el("reversePresetSelect"),nameInput=el("reversePresetName"),promptInput=el("reverseCustomPrompt"),status=el("reverseStatus");
const IMAGE_PROMPT=`你是一位专业的图像分析专家，请将提供的图片转换为适合 AI 绘图模型使用的自然语言提示词。描述需要准确、详细，并符合 Stable Diffusion 等模型的提示词特点。

分析重点：
1. 主体描述（按重要性排序）：人物或物体的具体类型和特征；准确的外观描述，包括发型、服装、表情；清晰的姿势和动作；关键细节特征。
2. 场景要素：具体场景类型、环境细节、空间关系、天气和时间状态。
3. 视觉风格：整体艺术风格、画面质感、特殊效果。
4. 技术特征：构图方式、光影效果、色彩特点、渲染风格。

输出要求：使用 AI 绘图模型常用的描述方式；按照“主体 > 场景 > 风格 > 效果”的顺序组织；包含必要的艺术风格和技术标签；避免模型难以理解的抽象描述；保持描述可执行、清晰、流畅；确保每个重要视觉元素都有明确描述；适当添加合理的技术参数和质量标签。

请直接输出一段符合 AI 绘图要求的自然语言描述，不要输出分析过程、标题或额外说明。`;
const VIDEO_PROMPT=`你是一位资深影视视频分析专家和顶级 AI 视频生成模型（如 Veo、Sora、MiniMax H3）的提示词工程师。请根据提供的视频关键帧，对画面、运镜、角色、光影、色彩和动作连续性进行专业拉片，并反推出可用于 AI 视频生成的详细结构化笔记。

重要限制：当前工具只会按时间顺序提供从原视频均匀抽取的关键帧和原视频总时长，不提供原始音轨。不得声称听见或转录了真实音频。音频栏中只能写“无法从抽帧判断”，或明确标注为“建议生成的音频设计”。时间轴应根据帧序和总时长进行保守估算，并标注为估算。

严格按以下结构输出：

## 1. 专家简评
用一至两句话概括视频的核心特点、故事基调和整体风格。

## 2. 视频提示词（拉片笔记）
使用 Markdown 表格并按镜头顺序记录，必须包含：镜号、时间轴、景别/角度、运动、画面内容、音频。
- 镜号：1、2、3……
- 时间轴：写出估算的起止时间。
- 景别/角度：如特写、中景、全景、平视、俯视、仰视。
- 运动：固定、推、拉、摇、移、跟等；没有充分证据时写“无法从抽帧确认”。
- 画面内容：详细描述主体外貌、穿着、动作、微表情、背景、道具布局、光影、色彩及镜头间连续变化。
- 音频：真实音频写“无法从抽帧判断”；如需补充，只能作为建议生成的 BGM、音效或对白方向。

## 3. 总结描述
### 画面风格
总结视觉表现形式、角色或真人质感、光影处理、色彩偏好和画面细节。末尾生成一段可直接用于 AI 视频模型的专业英文 Prompt，包含主体、场景、动作顺序、运镜、光影、材质、视觉风格和连续性要求。

### 音频风格
明确说明原音轨未被分析；只提供与画面相匹配的建议 BGM 节奏、音效层次和人声情绪方向。

直接输出完整分析结果，不要回复“准备就绪”，不要要求再次上传视频。`;
const defaults=[
 {id:"builtin-image-analysis",kind:"image",name:"专业图片反推（Stable Diffusion）",nameEn:"Professional image reverse (Stable Diffusion)",prompt:IMAGE_PROMPT,builtin:true},
 {id:"builtin-video-breakdown",kind:"video",name:"专业视频拉片反推（时间轴）",nameEn:"Professional video breakdown (timeline)",prompt:VIDEO_PROMPT,builtin:true}
];
function valid(rows){return Array.isArray(rows)&&rows.every(x=>x&&typeof x.id==="string"&&["image","video"].includes(x.kind)&&typeof x.name==="string"&&typeof x.prompt==="string")}
function load(){try{const raw=localStorage.getItem(KEY);if(raw===null){localStorage.setItem(KEY,JSON.stringify(defaults));return defaults.map(x=>({...x}))}const rows=JSON.parse(raw);return valid(rows)?rows.slice(0,100):defaults.map(x=>({...x}))}catch{return defaults.map(x=>({...x}))}}
let presets=load(),currentKind="image";const drafts={image:"",video:""};
function isEnglish(){return typeof uiLang!=="undefined"&&uiLang==="en"}
function activeKind(){return document.querySelector("[data-reverse-kind].active")?.dataset.reverseKind||"image"}
function message(cn,en,error=false){status.className=`reverse-status ${error?"error":"good"}`;status.textContent=isEnglish()?en:cn}
function persist(){localStorage.setItem(KEY,JSON.stringify(presets))}
function displayName(item){return isEnglish()&&item.nameEn?item.nameEn:item.name}
function labels(){el("reversePresetLabel").textContent=isEnglish()?"Saved instructions":"已保存提示词";nameInput.placeholder=isEnglish()?"Instruction name":"提示词名称";el("saveReversePreset").textContent=isEnglish()?"Save / overwrite":"保存 / 覆盖";el("deleteReversePreset").textContent=isEnglish()?"Delete":"删除";render(select.value)}
function render(preferred=""){const rows=presets.filter(x=>x.kind===currentKind),placeholder=document.createElement("option");select.innerHTML="";placeholder.value="";placeholder.textContent=isEnglish()?"Choose a saved instruction…":"选择已保存提示词……";select.appendChild(placeholder);rows.forEach(item=>{const option=document.createElement("option");option.value=item.id;option.textContent=displayName(item);select.appendChild(option)});select.value=rows.some(x=>x.id===preferred)?preferred:"";el("deleteReversePreset").disabled=!select.value}
function selectPreset(){const item=presets.find(x=>x.id===select.value&&x.kind===currentKind);el("deleteReversePreset").disabled=!item;if(!item)return;nameInput.value=displayName(item);promptInput.value=item.prompt;drafts[currentKind]=item.prompt}
function savePreset(){const name=nameInput.value.trim(),prompt=promptInput.value.trim();if(!name){message("请填写提示词名称","Enter an instruction name",true);return}if(!prompt){message("请填写自定义反推提示词","Enter a custom reverse instruction",true);return}if(prompt.length>12000){message("提示词不能超过 12000 个字符","Instruction cannot exceed 12000 characters",true);return}let item=presets.find(x=>x.id===select.value&&x.kind===currentKind)||presets.find(x=>x.kind===currentKind&&x.name===name);if(item){item.name=name;delete item.nameEn;item.prompt=prompt}else{item={id:`custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,kind:currentKind,name,prompt};presets.push(item)}persist();drafts[currentKind]=prompt;render(item.id);message("自定义反推提示词已保存","Custom reverse instruction saved")}
function deletePreset(){const item=presets.find(x=>x.id===select.value&&x.kind===currentKind);if(!item)return;const ask=isEnglish()?`Delete “${displayName(item)}”?`:`删除“${displayName(item)}”？`;if(!confirm(ask))return;presets=presets.filter(x=>x.id!==item.id);persist();select.value="";nameInput.value="";promptInput.value="";drafts[currentKind]="";render();message("已删除保存的提示词","Saved instruction deleted")}
select.addEventListener("change",selectPreset);el("saveReversePreset").addEventListener("click",savePreset);el("deleteReversePreset").addEventListener("click",deletePreset);promptInput.addEventListener("input",()=>{drafts[currentKind]=promptInput.value});document.querySelectorAll("[data-reverse-kind]").forEach(button=>button.addEventListener("click",()=>{const next=activeKind();if(next===currentKind)return;drafts[currentKind]=promptInput.value;currentKind=next;promptInput.value=drafts[currentKind];nameInput.value="";render()}));el("langBtn")?.addEventListener("click",()=>setTimeout(labels));currentKind=activeKind();labels();window.H3ReversePresets={key:KEY,get:()=>presets.map(x=>({...x})),set:rows=>{if(!valid(rows))throw Error("Invalid reverse prompt presets");presets=rows.slice(0,100);persist();render()}};
})();
