function allSkills(){
  const raw=localStorage.getItem("h3.skills.v1");
  if(raw){try{return JSON.parse(raw)}catch{}}
  const initial=builtinSkills.map(x=>({...x,builtin:true}));
  saveSkills(initial);return initial;
}
function saveSkills(all){localStorage.setItem("h3.skills.v1",JSON.stringify(all))}
function persistSelectedSkills(){
  selectedSkillIds=[...new Set(selectedSkillIds)].filter(id=>allSkills().some(x=>x.id===id)).slice(0,3);
  localStorage.setItem("h3.selectedSkills",JSON.stringify(selectedSkillIds));
  renderActiveSkills();renderSkills();
}
function renderActiveSkills(){
  const box=$("#activeSkillChips"),chosen=selectedSkills();
  box.innerHTML=chosen.length?chosen.map(x=>`<span class="skill-chip" title="${escapeHtml(x.description)}"><b>${escapeHtml(x.name)}</b><button data-remove-skill="${escapeHtml(x.id)}" title="取消选择">×</button></span>`).join(""):`<small>${uiLang==="en"?"None selected; only the standard H3 format skill will be used":"未选择；将只使用 H3 标准格式技能"}</small>`;
  box.onclick=e=>{const id=e.target.dataset.removeSkill;if(id){selectedSkillIds=selectedSkillIds.filter(x=>x!==id);persistSelectedSkills()}};
}
let editingSkillId=null;
function resetSkillEditor(){
  $("#skillName").value="";$("#skillDescription").value="";$("#skillInstructions").value="";editingSkillId=null;
  $("#saveSkill").textContent="＋ 保存为新 Skill";$("#cancelSkillEdit").classList.add("hidden");
}
function renderSkills(){
  const all=allSkills(),chosen=new Set(selectedSkillIds);
  $("#skillList").innerHTML=all.map(x=>`<div class="list-row skill-row ${chosen.has(x.id)?"is-selected":""}"><div class="skill-meta"><b>${escapeHtml(x.name)}</b><span class="skill-source">${escapeHtml(x.source||"自定义 Skill")}</span><small>${escapeHtml(x.description||"暂无说明")}</small></div><div><button class="skill-toggle ${chosen.has(x.id)?"active":""}" data-toggle-skill="${escapeHtml(x.id)}">${chosen.has(x.id)?"已选择":"选择"}</button><button data-edit-skill="${escapeHtml(x.id)}">编辑</button><button data-delete-skill="${escapeHtml(x.id)}">删除</button></div></div>`).join("")||"<p>暂无 Skill，可以在上方新增或导入。</p>";
  $("#skillList").onclick=e=>{
    const toggle=e.target.dataset.toggleSkill,edit=e.target.dataset.editSkill,del=e.target.dataset.deleteSkill;
    if(toggle){if(chosen.has(toggle))selectedSkillIds=selectedSkillIds.filter(x=>x!==toggle);else if(selectedSkillIds.length<3)selectedSkillIds.push(toggle);else{toast("最多同时选择3个创意增强 Skill");return}persistSelectedSkills()}
    if(edit){const x=all.find(s=>s.id===edit);if(x){editingSkillId=x.id;$("#skillName").value=x.name;$("#skillDescription").value=x.description||"";$("#skillInstructions").value=x.instructions||"";$("#saveSkill").textContent="保存修改";$("#cancelSkillEdit").classList.remove("hidden");$("#skillName").focus()}}
    if(del){saveSkills(all.filter(x=>x.id!==del));selectedSkillIds=selectedSkillIds.filter(x=>x!==del);if(editingSkillId===del)resetSkillEditor();persistSelectedSkills();toast("Skill 已删除")}
  };
}
function parseSkillMarkdown(text,nameFallback=""){
  let body=text,front="",name=nameFallback.replace(/\.(md|txt)$/i,""),description="";
  const fm=text.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
  if(fm){front=fm[1];body=text.slice(fm[0].length);const nm=front.match(/^name:\s*["']?([^\r\n"']+)/mi);if(nm)name=nm[1].trim();const dm=front.match(/^description:\s*(.*)$/mi);if(dm){if(dm[1].trim()&&dm[1].trim()!=="|")description=dm[1].trim().replace(/^['"]|['"]$/g,"");else{const lines=front.split(/\r?\n/),i=lines.findIndex(x=>/^description:\s*/i.test(x));description=lines.slice(i+1).filter(x=>/^\s+/.test(x)).map(x=>x.trim()).join(" ")}}}
  return{name:name||"Imported Skill",description,instructions:body.trim()};
}
$("#skillBtn").onclick=$("#manageSkills").onclick=()=>{openDrawer("skill");renderSkills()};
$("#cancelSkillEdit").onclick=resetSkillEditor;
$("#saveSkill").onclick=()=>{
  const name=$("#skillName").value.trim(),description=$("#skillDescription").value.trim(),instructions=$("#skillInstructions").value.trim();
  if(!name||!description||!instructions){toast("请填写 Skill 名称、说明和创作规则");return}
  const all=allSkills(),wasEditing=Boolean(editingSkillId);
  if(editingSkillId){const i=all.findIndex(x=>x.id===editingSkillId);if(i>=0)all[i]={...all[i],name,description,instructions}}
  else all.push({id:"skill-"+Date.now(),name,description,instructions,source:"自定义 Skill"});
  saveSkills(all);renderSkills();renderActiveSkills();resetSkillEditor();toast(wasEditing?"Skill 修改已保存":"新 Skill 已保存");
};
$("#skillImport").onchange=e=>{
  const file=e.target.files?.[0];if(!file)return;const r=new FileReader();
  r.onload=()=>{const x=parseSkillMarkdown(String(r.result||""),file.name);$("#skillName").value=x.name;$("#skillDescription").value=x.description;$("#skillInstructions").value=x.instructions;editingSkillId=null;$("#saveSkill").textContent="＋ 保存导入的 Skill";$("#cancelSkillEdit").classList.remove("hidden");toast("SKILL.md 已读取，请检查说明与规则后保存")};
  r.readAsText(file);e.target.value="";
};
const applySnapshotWithoutSkills=applySnapshot;
applySnapshot=function(x){const c=x.config||x;if(Array.isArray(c.selectedSkillIds))selectedSkillIds=[...c.selectedSkillIds];applySnapshotWithoutSkills(x);persistSelectedSkills()};
const newProjectWithoutSkills=$("#newProject").onclick;
$("#newProject").onclick=e=>{selectedSkillIds=[];persistSelectedSkills();return newProjectWithoutSkills.call($("#newProject"),e)};
$(".eyebrow").textContent="LOCAL GENERATION · V0.6.0";
$(".changelog")?.insertAdjacentHTML("afterbegin",'<b>v0.6.0</b><ul><li>新增可自行管理的创意增强 Skill 库，支持多选、说明、新增、编辑与删除</li><li>支持导入本地 SKILL.md，并在保存前检查或修改内容</li><li>内置夸张表情、品牌宣传和纸张拼贴三种创意技能适配</li><li>H3 格式技能保持最高优先级，导入 Skill 不会覆盖标准输出结构</li></ul>');
persistSelectedSkills();
