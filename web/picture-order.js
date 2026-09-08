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
$(".eyebrow").textContent="LOCAL GENERATION · V0.6.1";
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.6.1</b><ul><li>参考图卡片支持拖拽排序和明确的前后插入位置</li><li>拖拽后自动同步创意、剧本及结果中的 Picture 编号</li><li>支持 Ctrl+C / Ctrl+V 复制、替换、新增参考图及粘贴系统截图</li></ul>');
$("#dropzone").addEventListener("click",()=>selectPicture(-1));renderImages();
