let selectedPictureIndex=-1;
let copiedPictureItem=null;
let draggingPictureIndex=-1;

function clonePicture(item){return JSON.parse(JSON.stringify(item))}
function editableTarget(target){return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"))}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}

function selectPicture(index){
  selectedPictureIndex=index>=0&&index<images.length?index:-1;
  document.querySelectorAll(".preview.reference-card").forEach((card,i)=>card.classList.toggle("is-selected",i===selectedPictureIndex));
  document.querySelectorAll(".picture-selection-hint").forEach((hint,i)=>hint.classList.toggle("hidden",i!==selectedPictureIndex));
}

function remapPictureNumbers(oldToNew){
  const remap=value=>String(value||"").replace(/Picture\s+(\d+)/gi,(match,n)=>{const mapped=oldToNew[Number(n)-1];return mapped===undefined?match:`Picture ${mapped+1}`});
  for(const selector of ["#idea","#scriptBrief","#scriptResult"]){const element=$(selector);if(element)element.value=remap(element.value)}
  fullOutput=remap(fullOutput);$("#result").value=remap($("#result").value);parseSegments();updateReferenceHighlights();
}

function movePicture(from,target,before){
  if(from<0||target<0||from>=images.length||target>=images.length||from===target)return;
  const previous=[...images],item=images.splice(from,1)[0];let insertAt=target+(before?0:1);if(from<insertAt)insertAt-=1;
  images.splice(Math.max(0,Math.min(insertAt,images.length)),0,item);
  const oldToNew=previous.map(oldItem=>images.indexOf(oldItem));selectedPictureIndex=images.indexOf(item);
  remapPictureNumbers(oldToNew);renderImages();validateConfig();toast(`参考图已重排：当前图片现在是 Picture ${selectedPictureIndex+1}，相关文字编号已同步更新`);
}

async function pastePictureData(data,name="clipboard-image.png"){
  const item={name,data,type:roleForIndex(selectedPictureIndex>=0?selectedPictureIndex:images.length),description:""};
  if(selectedPictureIndex>=0&&selectedPictureIndex<images.length){const current=normalizedImage(images[selectedPictureIndex],selectedPictureIndex);item.type=current.type;item.description=current.description;images[selectedPictureIndex]=item;toast(`已从剪贴板替换 Picture ${selectedPictureIndex+1}`)}
  else{if(images.length>=12){toast("参考图最多12张");return}images.push(item);selectedPictureIndex=images.length-1;toast(`已从剪贴板新增 Picture ${images.length}`)}
  renderImages();validateConfig();
}

const copyImageBase=copyImage;
copyImage=async function(index){copiedPictureItem=images[index]?clonePicture(images[index]):null;await copyImageBase(index)};

renderImages=function(){
  const box=$("#previews");box.innerHTML="";
  images.forEach((raw,i)=>{
    const item=normalizedImage(raw,i),element=document.createElement("article");element.className="preview reference-card"+(i===selectedPictureIndex?" is-selected":"");element.dataset.pictureIndex=i;
    element.innerHTML=`<div class="picture-media"><button class="picture-number" data-copy-label="${i}">Picture ${i+1}</button><img src="${item.data}" alt="Picture ${i+1}"></div><div class="reference-fields"><select class="reference-type" aria-label="Picture ${i+1} 用途">${roleOptions(item.type)}</select><input class="reference-description" value="${escapeHtml(item.description)}" placeholder="具体说明，例如：华人女销售、店外、LOGO"></div><div class="reference-tools"><button class="drag-handle" draggable="true" data-drag="${i}" title="按住拖到任意 Picture 前后">⠿ 拖拽排序</button><button data-view="${i}">查看</button><button data-copy="${i}">复制图片</button><label class="replace-button">替换<input type="file" accept="image/*" data-replace="${i}"></label><button class="danger-button" data-delete="${i}">删除</button></div><span class="picture-selection-hint ${i===selectedPictureIndex?"":"hidden"}">剪贴板目标</span>`;
    element.querySelector(".reference-type").onchange=e=>{item.type=e.target.value;renderScriptReferencePicker();validateConfig()};element.querySelector(".reference-description").oninput=e=>{item.description=e.target.value;renderScriptReferencePicker()};element.querySelector("img").onclick=()=>openImagePreview(i);element.onclick=e=>{if(!e.target.closest("button,label,input,select"))selectPicture(i)};
    const handle=element.querySelector(".drag-handle");handle.ondragstart=e=>{draggingPictureIndex=i;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(i));selectPicture(i)};handle.ondragend=()=>{draggingPictureIndex=-1;document.querySelectorAll(".drag-before,.drag-after").forEach(x=>x.classList.remove("drag-before","drag-after"))};
    element.ondragover=e=>{if(draggingPictureIndex<0)return;e.preventDefault();const before=e.clientY<element.getBoundingClientRect().top+element.offsetHeight/2;element.classList.toggle("drag-before",before);element.classList.toggle("drag-after",!before);e.dataTransfer.dropEffect="move"};element.ondragleave=e=>{if(!element.contains(e.relatedTarget))element.classList.remove("drag-before","drag-after")};element.ondrop=e=>{if(draggingPictureIndex<0)return;e.preventDefault();const before=e.clientY<element.getBoundingClientRect().top+element.offsetHeight/2,from=draggingPictureIndex;element.classList.remove("drag-before","drag-after");draggingPictureIndex=-1;movePicture(from,i,before)};box.appendChild(element);
  });
  box.onclick=async e=>{const view=e.target.dataset.view,copy=e.target.dataset.copy,del=e.target.dataset.delete,label=e.target.dataset.copyLabel;if(view!==undefined){selectPicture(+view);openImagePreview(+view)}if(copy!==undefined){selectPicture(+copy);await copyImage(+copy)}if(label!==undefined){selectPicture(+label);await navigator.clipboard.writeText(`Picture ${+label+1}`);toast(`已复制 Picture ${+label+1} 编号`)}if(del!==undefined){images.splice(+del,1);selectedPictureIndex=-1;renderImages();validateConfig();toast("参考图已删除，Picture 编号已自动更新")}};
  box.onchange=e=>{const index=e.target.dataset.replace;if(index===undefined||!e.target.files?.[0])return;const file=e.target.files[0],reader=new FileReader();reader.onload=()=>{images[+index].data=reader.result;images[+index].name=file.name;selectedPictureIndex=+index;renderImages();toast(`Picture ${+index+1} 已替换`)};reader.readAsDataURL(file)};renderScriptReferencePicker();selectPicture(selectedPictureIndex);
};

document.addEventListener("keydown",e=>{if(e.key==="Escape"&&selectedPictureIndex>=0){selectPicture(-1);toast("已取消 Picture 剪贴板目标；现在粘贴会新增图片");return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"&&!editableTarget(e.target)&&selectedPictureIndex>=0){e.preventDefault();copyImage(selectedPictureIndex)}});
document.addEventListener("paste",async e=>{const imageEntry=[...(e.clipboardData?.items||[])].find(item=>item.type.startsWith("image/"));if(imageEntry){e.preventDefault();const file=imageEntry.getAsFile();if(file)await pastePictureData(await fileToDataUrl(file),file.name||"clipboard-image.png");return}if(copiedPictureItem&&!editableTarget(e.target)){e.preventDefault();const copy=clonePicture(copiedPictureItem);if(selectedPictureIndex>=0&&selectedPictureIndex<images.length){images[selectedPictureIndex]={...copy,name:`copy-${copy.name||"picture"}`};toast(`已用复制内容替换 Picture ${selectedPictureIndex+1}`)}else if(images.length<12){images.push({...copy,name:`copy-${copy.name||"picture"}`});selectedPictureIndex=images.length-1;toast(`已粘贴为 Picture ${images.length}`)}else{toast("参考图最多12张");return}renderImages();validateConfig()}});
const pictureHelp=document.createElement("small");pictureHelp.className="picture-clipboard-help";pictureHelp.textContent="拖拽每张卡片上的 ⠿ 可调整 Picture 顺序。点击卡片选为剪贴板目标：Ctrl+C 复制，Ctrl+V 替换；按 Esc 取消目标后 Ctrl+V 会新增图片。也支持直接粘贴截图或系统剪贴板图片。";$("#previews").before(pictureHelp);
$(".output-panel .eyebrow").textContent="LOCAL GENERATION · V0.8.10";
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.6</b><ul><li>修复剧本对白在转换为最终 H3 提示词时可能被模型遗漏的问题</li><li>转换前建立逐段对白清单，强制保留原语言、原句、说话者与所属 Segment</li><li>生成后再次校验；若模型遗漏或改写对白，会自动以 H3 对白标签补回并要求可见口型同步</li></ul><b>v0.8.5</b><ul><li>剧本工作流新增剧情检查：本地规则先检查段数、时长、素材编号、对白密度与重复内容</li><li>AI 独立审查因果、动机、连续性、转场与结尾，并提供评分、问题清单和完整修正版</li><li>原剧本不会自动覆盖；只有点击采用修正版才会替换，手动编辑后会提示检查结果已过期</li><li>项目保存与导入会保留剧情检查结果</li></ul><b>v0.8.4</b><ul><li>Hybrid 不再强制首尾帧，可直接组合参考图片、Video 与 Audio</li><li>切换模式时保留全部素材，不适用的素材只会暂时停止发送</li><li>Video 支持自定义时间截帧为首帧，并显示播放器、时长、分辨率与大小</li><li>Audio 新增播放器、时长与文件大小预览</li></ul><b>v0.8.3</b><ul><li>改进 Hybrid 首帧用途识别与提示；此限制已在 v0.8.4 按实际工作流放宽</li></ul><b>v0.8.2</b><ul><li>@ 素材菜单统一支持 Picture、Video 与 Audio，并保持三类素材独立编号</li><li>直接提示词和剧本输入都可插入、识别并定位 Video/Audio 标签</li><li>视频与声音上传区支持文件拖入、类型过滤和拖入高亮反馈</li></ul><b>v0.8.1</b><ul><li>直接提示词与剧本工作流改为独立显示，剧本确认后自动进入直接提示词区</li><li>Hybrid 新增独立 Video 参考、用途说明、项目保存与 H3 标签支持</li><li>三栏步骤修正为创意内容 01、生成模式 02、画面与时间 03</li></ul><b>v0.8.0</b><ul><li>补全设置、剧本、技能、模板、参考素材和动态状态的中英文切换</li><li>历史、模板与技能管理改为可搜索浮层，不再挤压三栏工作区</li><li>新增静态与动态界面的英文回归检查</li></ul><b>v0.7.1</b><ul><li>三栏宽度可拖动调整，并自动记住布局</li><li>每栏新增专注模式，可一键放大并恢复三栏</li><li>优化 1366 宽度下的项目操作区与模型选择区</li></ul><b>v0.7.0</b><ul><li>桌面工作区升级为提示词、生成设置与参考素材、生成结果三栏布局</li><li>三栏独立滚动，减少长页面上下拖动</li><li>窄窗口自动切换为双栏或单栏，保留完整操作能力</li></ul><b>v0.6.1</b><ul><li>参考图卡片支持拖拽排序和明确的前后插入位置</li><li>拖拽后自动同步创意、剧本及结果中的 Picture 编号</li><li>支持 Ctrl+C / Ctrl+V 复制、替换、新增参考图及粘贴系统截图</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.7</b><ul><li>确认剧本锁定为最终 H3 转换的剧情依据，禁止擅自增加情节、对白、思想气泡或宣传文字</li><li>对白语言统一为 [Malay]、[Chinese]、[English] 等标准标签</li><li>清除模型改写、重复或额外对白，再按原 Segment 与说话者插入准确原句</li><li>自动修正 retention_analysis 的镜头范围、关系标记和说明格式</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.8</b><ul><li>对白按原时间插回对应镜头，同一角色跨镜头与跨段保持稳定编号</li><li>品牌旁白与画外音改为离屏播报，不再要求画面人物口型同步</li><li>按 Picture、Video、Audio 类型校正 retention 关系标记与镜头范围</li><li>背景音乐只保留在 non_diegetic_music，避免与环境声重复</li><li>源剧本总时长或单段时长与生成设置冲突时会停止转换并明确提示</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.9</b><ul><li>支持单引号和无引号对白；无法解析时明确报错</li><li>无对白段清除模型额外台词，人物别名按明确参考身份统一编号</li><li>自定义角色对白处理可重复执行，不残留句子或累积空行</li><li>声景清理保留混合音效，模糊音乐描述提示人工检查</li><li>时长检查支持分钟、时钟格式与原稿时间线终点</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.10</b><ul><li>模板应用到当前工作流，避免旧剧本继续参与新输入转换</li><li>新增全部设置、模板、技能、生成参数与布局备份</li><li>支持安全合并、校验及失败回滚，默认不导出 API Key</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.11</b><ul><li>新增原稿与修正版左右对比、修改高亮、导航及同步滚动</li><li>支持单段手动编辑、仅重写本段及撤销，其他段保持不变</li><li>错误段号、失败或取消不会覆盖原结果</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.12</b><ul><li>剧本输出新增 English + 自定义语言双语模式</li><li>英文母版只读，自定义版本可编辑并用于剧情检查及 H3 转换</li><li>双语翻译锁定段号、字段、时长、时间轴、素材编号与原对白</li><li>项目和完整设定备份保留自定义语言，支持复制及下载双语剧本</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.15</b><ul><li>多段 H3 输出缺少字段、段落或 Shot 1 时自动补全整份结果</li><li>自动修复后再安全插入批准对白，避免直接生成失败</li><li>两次修复仍失败时保留原始输出供检查</li></ul><b>v0.8.14</b><ul><li>自定义 H3 输出语言新增最终结果检查与自动修复</li><li>修复时锁定字段、素材编号、镜头号、时间码、关系标记和对白</li><li>仍混合语言或破坏结构的修复结果会被拒绝</li></ul><b>v0.8.13</b><ul><li>检测自定义剧本中未翻译的英文描述，失败时自动完整重译一次</li><li>第二次仍混合语言时拒绝采用，保留英文母版避免污染项目</li><li>H3 提示词输出新增独立自定义语言选项</li><li>确认自定义剧本时自动把同一语言带入 H3 输出设置</li></ul>');
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.8.16</b><ul><li>修复重复或空 H3 字段可能使规范化提前报错的问题</li><li>原始结果先验收，再执行安全补全</li><li>同步源码打包脚本与双语 README</li></ul>');
$("#dropzone").addEventListener("click",()=>selectPicture(-1));renderImages();
