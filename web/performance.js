(()=>{
  const idea=document.querySelector('#idea');let validationTimer=null;
  idea.oninput=()=>{clearTimeout(validationTimer);validationTimer=setTimeout(validateConfig,80);};
  function versionUi(){
    const eyebrow=document.querySelector('.output-panel .eyebrow');if(eyebrow)eyebrow.textContent='LOCAL GENERATION · V0.8.18';
    const footer=document.querySelector('footer');if(footer?.firstChild)footer.firstChild.nodeValue='MiniMax H3 Prompt Studio · v0.8.18 · ';
    const log=document.querySelector('.changelog');if(!log||log.querySelector('b')?.textContent==='v0.8.18')return;
    const html=uiLang==='en'?'<b>v0.8.18</b><ul><li>Removes per-keystroke full reference and highlight re-renders to keep long prompt input responsive</li><li>Adds reusable saved reverse-prompt instructions, including image analysis and video breakdown presets</li><li>Preserves independent image and video reverse results when switching modes</li></ul>':'<b>v0.8.18</b><ul><li>移除每次按键触发的完整参考标签与高亮层重绘，改善长文本输入卡顿</li><li>新增可保存复用的反推提示词，以及图片分析和视频拉片默认预设</li><li>切换图片与视频反推模式时分别保留已有结果</li></ul>';
    log.insertAdjacentHTML('afterbegin',html);
  }
  versionUi();document.querySelector('#langBtn')?.addEventListener('click',()=>setTimeout(versionUi));
})();
