(() => {
  const tr=(zh,en)=>uiLang==='en'?en:zh;
  const compareButton=document.createElement('button');compareButton.id='compareRevision';compareButton.className='ghost';
  document.querySelector('.story-review-footer').prepend(compareButton);
  const undoScriptButton=document.createElement('button');undoScriptButton.id='undoScriptRevision';undoScriptButton.className='ghost';undoScriptButton.disabled=true;compareButton.after(undoScriptButton);
  const dialog=document.createElement('dialog');dialog.id='revisionCompare';
  dialog.innerHTML='<div class="dialog-card"><header><h3 id="compareTitle"></h3><button type="button" id="closeCompare">×</button></header><div class="revision-actions"><span id="diffLegend"></span><button class="ghost" id="previousChange"></button><button class="ghost" id="nextChange"></button><span id="diffCount"></span></div><div class="compare-grid"><section><h4 id="originalTitle"></h4><div id="originalDiff" class="diff-pane"></div></section><section><h4 id="revisionTitle"></h4><div id="revisionDiff" class="diff-pane"></div><details><summary id="editRevisionTitle"></summary><textarea id="diffEditor" spellcheck="false"></textarea></details></section></div><div class="dialog-actions"><span id="compareStale"></span><button class="primary" id="adoptCompared"></button></div></div>';
  document.body.append(dialog);
  const toolbar=document.createElement('div');toolbar.id='segmentEditTools';toolbar.className='revision-actions';
  toolbar.innerHTML='<button class="ghost" id="saveSegmentEdit"></button><button class="ghost" id="undoSegmentEdit" disabled></button><input id="segmentEditInstruction"><button class="primary" id="rewriteSegment"></button><button class="ghost hidden" id="stopSegmentRewrite"></button><small id="segmentEditStatus"></small>';
  document.querySelector('.result-wrap').before(toolbar);
  let changes=[],changeIndex=-1,diffTimer=null,controller=null,undo=[],scriptUndo=[],dirty=false;
  function labels(){
    const text={compareRevision:tr('左右对比／修改高亮','Compare / highlight changes'),compareTitle:tr('原稿与建议修正版对比','Original vs suggested revision'),diffLegend:tr('绿色：新增 · 红色：删除 · 黄色：改写','Green: added · Red: removed · Yellow: rewritten'),previousChange:tr('上一处','Previous'),nextChange:tr('下一处','Next'),originalTitle:tr('原剧本（检查时版本）','Original screenplay (reviewed version)'),revisionTitle:tr('建议修正版','Suggested revision'),editRevisionTitle:tr('编辑修正版（更新高亮）','Edit revision (refresh highlights)'),adoptCompared:tr('采用修正版','Use revision'),saveSegmentEdit:tr('保存本段编辑','Save segment edit'),undoSegmentEdit:tr('撤销上次修改','Undo last edit'),rewriteSegment:tr('仅重写本段','Rewrite this segment only'),stopSegmentRewrite:tr('停止','Stop')};
    Object.entries(text).forEach(([id,value])=>{document.getElementById(id).textContent=value;});
    document.querySelector('#segmentEditInstruction').placeholder=tr('例如：只修改运镜，动作和对白保持不变','Example: change camera motion only; keep actions and dialogue');
  }
  labels();document.querySelector('#langBtn').addEventListener('click',()=>{labels();if(dialog.open)renderDiff();});
  function scriptUndoLabel(){undoScriptButton.textContent=tr('撤销采用修正版','Undo adopted revision');undoScriptButton.disabled=!scriptUndo.length;}
  scriptUndoLabel();document.querySelector('#langBtn').addEventListener('click',scriptUndoLabel);
  const oldAdopt=document.querySelector('#applyRevisedScript').onclick;document.querySelector('#applyRevisedScript').onclick=()=>{const before=document.querySelector('#scriptResult').value,source=reviewedScriptSource;oldAdopt();const after=document.querySelector('#scriptResult').value;if(before!==after){scriptUndo.push({before,after,source});if(scriptUndo.length>10)scriptUndo.shift();}scriptUndoLabel();};
  undoScriptButton.onclick=()=>{const item=scriptUndo.at(-1);if(!item)return;if(document.querySelector('#scriptResult').value!==item.after){toast(tr('剧本已有其他修改，未覆盖；请先保存当前稿','Script has other edits; not overwritten'));return;}scriptUndo.pop();document.querySelector('#scriptResult').value=item.before;reviewedScriptSource=item.source;renderStoryReview(storyReviewState,reviewedScriptSource!==item.before);scriptUndoLabel();};
  // Line LCS, bounded to prevent large documents from freezing the interface.
  function diffRows(left,right){
    const a=left.split('\n'),b=right.split('\n');let operations=[];
    if(a.length*b.length>1500000){
      let start=0,end=0;while(start<a.length&&start<b.length&&a[start]===b[start])start++;
      while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
      operations=[...a.slice(0,start).map(s=>['=',s]),...a.slice(start,a.length-end).map(s=>['-',s]),...b.slice(start,b.length-end).map(s=>['+',s]),...a.slice(a.length-end).map(s=>['=',s])];
    }else{
      const dp=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
      for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
      let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){operations.push(['=',a[i++]]);j++;}else if(i<a.length&&(j===b.length||dp[i+1][j]>=dp[i][j+1]))operations.push(['-',a[i++]]);else operations.push(['+',b[j++]]);}
    }
    const rows=[];let i=0;while(i<operations.length){if(operations[i][0]==='='){rows.push({left:operations[i][1],right:operations[i][1],kind:'same'});i++;continue;}const removed=[],added=[];while(i<operations.length&&operations[i][0]!=='='){const [kind,line]=operations[i++];(kind==='-'?removed:added).push(line);}for(let j=0;j<Math.max(removed.length,added.length);j++)rows.push({left:removed[j]??'',right:added[j]??'',kind:j<removed.length&&j<added.length?'changed':j<removed.length?'deleted':'added'});}
    return rows;
  }
  function highlightedLine(text,other,kind,side){
    const node=document.createElement('div');node.className='diff-line '+kind;
    if(kind==='changed'){
      let start=0,end=0;while(start<text.length&&start<other.length&&text[start]===other[start])start++;
      while(end<text.length-start&&end<other.length-start&&text[text.length-1-end]===other[other.length-1-end])end++;
      node.append(document.createTextNode(text.slice(0,start)));const mark=document.createElement('mark');mark.className=side==='left'?'removed-text':'added-text';mark.textContent=text.slice(start,text.length-end);node.append(mark,document.createTextNode(end?text.slice(-end):''));
    }else node.textContent=text||' ';
    return node;
  }
  function renderDiff(){
    const left=document.querySelector('#originalDiff'),right=document.querySelector('#revisionDiff');left.replaceChildren();right.replaceChildren();changes=[];
    diffRows(reviewedScriptSource||document.querySelector('#scriptResult').value,document.querySelector('#revisedScript').value).forEach((row,index)=>{left.append(highlightedLine(row.left,row.right,row.kind,'left'));right.append(highlightedLine(row.right,row.left,row.kind,'right'));if(row.kind!=='same')changes.push(index);});
    changeIndex=-1;document.querySelector('#diffCount').textContent=tr(`${changes.length} 行修改`,`${changes.length} changed lines`);
    const stale=reviewedScriptSource!==document.querySelector('#scriptResult').value;
    document.querySelector('#compareStale').textContent=stale?tr('原稿已变化，请重新检查后采用','Original changed; review again before adopting'):'';
    document.querySelector('#adoptCompared').disabled=stale||!document.querySelector('#revisedScript').value.trim();
    ['previousChange','nextChange'].forEach(id=>document.getElementById(id).disabled=!changes.length);
  }
  compareButton.onclick=()=>{if(!document.querySelector('#revisedScript').value.trim()){toast(tr('暂无建议修正版','No suggested revision'));return;}document.querySelector('#diffEditor').value=document.querySelector('#revisedScript').value;labels();renderDiff();dialog.showModal();};
  document.querySelector('#closeCompare').onclick=()=>dialog.close();
  document.querySelector('#diffEditor').oninput=event=>{document.querySelector('#revisedScript').value=event.target.value;document.querySelector('#revisedScript').dispatchEvent(new Event('input'));clearTimeout(diffTimer);diffTimer=setTimeout(renderDiff,160);};
  document.querySelector('#adoptCompared').onclick=()=>{document.querySelector('#applyRevisedScript').click();dialog.close();};
  function navigate(delta){if(!changes.length)return;if(changeIndex<0&&delta<0)changeIndex=0;changeIndex=(changeIndex+delta+changes.length)%changes.length;for(const id of ['originalDiff','revisionDiff']){const pane=document.getElementById(id);pane.scrollTop=pane.children[changes[changeIndex]].offsetTop;}document.querySelector('#diffCount').textContent=tr(`${changeIndex+1}/${changes.length} 处修改`,`${changeIndex+1}/${changes.length} changes`);}
  document.querySelector('#previousChange').onclick=()=>navigate(-1);document.querySelector('#nextChange').onclick=()=>navigate(1);
  let syncing=false;for(const [from,to] of [['originalDiff','revisionDiff'],['revisionDiff','originalDiff']])document.getElementById(from).onscroll=()=>{if(syncing)return;syncing=true;const a=document.getElementById(from),b=document.getElementById(to);b.scrollTop=a.scrollTop/Math.max(1,a.scrollHeight-a.clientHeight)*Math.max(0,b.scrollHeight-b.clientHeight);requestAnimationFrame(()=>syncing=false);};
  function spans(text){const matches=[...text.matchAll(/^===\s*Segment\s+(\d+)\s*===[ \t]*$/gm)];return matches.map((m,i)=>({number:+m[1],start:m.index,end:matches[i+1]?.index??text.length}));}
  function tools(){const disabled=activeSegment<0||!segments.length||!!controller||!!aborter;document.querySelector('#result').readOnly=activeSegment<0||!!controller||!!aborter;document.querySelector('#saveSegmentEdit').disabled=disabled;document.querySelector('#rewriteSegment').disabled=disabled;document.querySelector('#segmentEditInstruction').disabled=disabled;document.querySelector('#undoSegmentEdit').disabled=!undo.length||!!controller||!!aborter;document.querySelector('#segmentEditStatus').textContent=controller?tr('仅重写当前段，其他段保持原文','Rewriting this segment only'):dirty?tr('编辑尚未保存，请保存本段','Unsaved edit; save this segment'):activeSegment<0?tr('先选择一个分段；其他段不会重新生成','Select a segment; other segments will not regenerate'):'';}
  const originalTabs=renderSegmentTabs;renderSegmentTabs=function(){originalTabs();tools();};
  const originalShow=showSegment;showSegment=function(index){if(controller)return;if(dirty&&!saveEdit())return;originalShow(index);tools();};
  function replaceSegment(index,value){const ranges=spans(fullOutput),target=ranges[index],returned=spans(value);if(!target||returned.length!==1||returned[0].number!==target.number)throw Error(tr('请保留本段唯一的 Segment 编号','Keep the unique original Segment header'));const tail=fullOutput.slice(target.start,target.end).match(/\s*$/)[0];return fullOutput.slice(0,target.start)+value.trimEnd()+tail+fullOutput.slice(target.end);}
  function commit(output,index){if(output!==fullOutput){undo.push({before:fullOutput,after:output,index});if(undo.length>20)undo.shift();}fullOutput=output;dirty=false;activeSegment=index;parseSegments();originalShow(index);tools();}
  function saveEdit(){if(!dirty)return true;try{commit(replaceSegment(activeSegment,document.querySelector('#result').value),activeSegment);return true;}catch(error){toast(error.message);return false;}}
  document.querySelector('#result').addEventListener('input',()=>{if(activeSegment>=0){dirty=true;tools();}});
  document.querySelector('#saveSegmentEdit').onclick=saveEdit;
  document.querySelector('#undoSegmentEdit').onclick=()=>{const old=undo.at(-1);if(!old)return;if(fullOutput!==old.after){toast(tr('结果已更换，无法撤销旧结果的修改','Output changed; cannot undo an older document'));undo=[];tools();return;}undo.pop();fullOutput=old.before;dirty=false;activeSegment=old.index;parseSegments();originalShow(old.index);tools();};
  document.querySelector('#rewriteSegment').onclick=async()=>{
    if(!saveEdit())return;const instruction=document.querySelector('#segmentEditInstruction').value.trim();if(!instruction){toast(tr('请输入本段修改要求','Enter a revision instruction'));return;}const index=activeSegment,original=fullOutput,target=spans(original)[index];if(!target)return;
    controller=new AbortController();document.querySelector('#generate').disabled=true;document.querySelector('#result').readOnly=true;document.querySelector('#stopSegmentRewrite').classList.remove('hidden');tools();
    try{const response=await fetch('/api/rewrite-segment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload(true),currentOutput:original,targetSegment:target.number,editInstruction:instruction}),signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Revision failed');if(fullOutput!==original)throw Error(tr('原结果已更换，未应用修正版','Output changed; revision not applied'));commit(replaceSegment(index,data.output),index);toast(tr('仅本段已更新，可撤销；其他段保持不变','Only this segment updated; undo is available'));document.querySelector('#resultMeta').textContent=tr(`本段已修改 · ${data.warnings?.length||0} 项格式提醒`,`Segment revised · ${data.warnings?.length||0} format warnings`);}catch(error){toast(error.name==='AbortError'?tr('已停止，原段未改变','Stopped; original segment unchanged'):error.message);}finally{controller=null;document.querySelector('#result').readOnly=false;document.querySelector('#generate').disabled=workflow==='script';document.querySelector('#stopSegmentRewrite').classList.add('hidden');tools();}
  };
  document.querySelector('#stopSegmentRewrite').onclick=()=>controller?.abort();
  const oldSnapshot=snapshot;snapshot=function(){if(dirty&&!saveEdit())throw Error('Save the segment edit first');return {...oldSnapshot(),segmentRevisionUndo:undo,scriptRevisionUndo:scriptUndo};};
  const oldApply=applySnapshot;applySnapshot=function(value){controller?.abort();dirty=false;undo=Array.isArray(value.segmentRevisionUndo)?value.segmentRevisionUndo.filter(x=>typeof x.before==='string'&&typeof x.after==='string'&&Number.isInteger(x.index)).slice(-20):[];scriptUndo=Array.isArray(value.scriptRevisionUndo)?value.scriptRevisionUndo.filter(x=>typeof x.before==='string'&&typeof x.after==='string'&&typeof x.source==='string').slice(-10):[];oldApply(value);tools();scriptUndoLabel();};
  const oldNewProject=document.querySelector('#newProject').onclick;document.querySelector('#newProject').onclick=event=>{controller?.abort();dirty=false;undo=[];scriptUndo=[];oldNewProject(event);tools();scriptUndoLabel();};
  const oldGenerate=generate;generate=async function(){if(controller||!saveEdit())return;undo=[];try{return await oldGenerate();}finally{tools();}};document.querySelector('#generate').onclick=generate;
  const oldRevisionInput=document.querySelector('#revisedScript').oninput;document.querySelector('#revisedScript').oninput=event=>{oldRevisionInput(event);document.querySelector('#applyRevisedScript').disabled=reviewedScriptSource!==document.querySelector('#scriptResult').value||!storyReviewState.revisedScript.trim();};
  document.querySelector('#copy').onclick=()=>{if(saveEdit())navigator.clipboard.writeText(fullOutput).then(()=>toast(tr('已复制全部','All segments copied')));};
  const oldDownload=document.querySelector('#download').onclick;document.querySelector('#download').onclick=event=>{if(saveEdit())oldDownload(event);};
  tools();window.H3Revision={diffRows,spans,replaceSegment};
})();
