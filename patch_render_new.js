const fs = require('fs');
let content = fs.readFileSync('/tmp/version-pr-case-h5/app.js', 'utf8');

// Patch 1: Make route() map c.data to c if present
const patchRoute = `
    currentCase=await loadJson(summary.caseFile);
    if(currentCase.data) {
       currentCase.timeline = currentCase.data.timeline || currentCase.timeline;
       currentCase.analysis = currentCase.data.analysis || currentCase.analysis;
    }
    $('dashboard').style.display='none';
`;
content = content.replace(/currentCase=await loadJson\(summary\.caseFile\);\s*\$\('dashboard'\)\.style\.display='none';/, patchRoute);

// Patch 2: renderOfficialResponse to show Pros/Cons from analysis
const official_patch = `
function renderOfficialResponse(c){
  const d=c.officialResponseDeepDive;
  if(!d){
    if(c.analysis && c.analysis.official_action) {
      const oa = c.analysis.official_action;
      return \`<div class="block"><h3>实际官方是怎么做的与评价</h3>
        <div class="officialValueGrid">
          <section><h5>👍 做得好/起效的部分 (Pros)</h5><p>\${oa.pros}</p></section>
          <section><h5>👎 失误/无效的部分 (Cons)</h5><p>\${oa.cons}</p></section>
        </div>
      </div>\`;
    }
    return \`<div class="block"><h3>官方处置复盘</h3><p class="muted">暂无深度复盘数据。</p></div>\`;
  }
`;
content = content.replace(/function renderOfficialResponse\(c\)\{\s*const d=c\.officialResponseDeepDive;\s*if\(!d\)\{\s*return `<div class="block"><h3>官方处置复盘<\/h3><p class="muted">暂无深度复盘数据。<\/p><\/div>`;\s*\}/, official_patch);

// Patch 3: renderInsight to show PR suggestions and Official eval
const insight_patch = `
function renderInsight(c){
  const insight = c.insight || null;
  if(!insight){
    if(c.analysis && c.analysis.takeaways) {
       const oa = c.analysis.official_action || {pros:'', cons:''};
       return \`<div class="block insightPage">
         <h3>PR应对建议 (事后诸葛亮) 与核心启发</h3>
         <div class="quote"><b>核心矛盾判断：</b>\${c.analysis.core_conflict || ''}</div>
         
         <div style="margin-top: 24px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;">
           <h4 style="margin-top:0; margin-bottom: 12px;">实际官方是怎么做的与评价</h4>
           <div class="officialValueGrid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
             <section style="background: var(--bg-page); padding: 12px; border-radius: 6px;">
               <h5 style="margin-top:0; color:#0052d9;">👍 做得好/起效的部分 (Pros)</h5>
               <p style="margin-bottom:0; font-size:14px; line-height:1.6;">\${oa.pros || '无'}</p>
             </section>
             <section style="background: var(--bg-page); padding: 12px; border-radius: 6px;">
               <h5 style="margin-top:0; color:#d9001b;">👎 失误/无效的部分 (Cons)</h5>
               <p style="margin-bottom:0; font-size:14px; line-height:1.6;">\${oa.cons || '无'}</p>
             </section>
           </div>
         </div>

         <h4 style="margin-top: 32px;">深度洞察 (Takeaways)</h4>
         <div class="conclusionGrid">
           \${c.analysis.takeaways.map((x,i)=>\`<article><b>启发 \${i+1}</b><p>\${x}</p></article>\`).join('')}
         </div>
       </div>\`;
    }
    const cognition=(c.cognitionConclusions||[]).concat((c.cognition||[]).map(x=>({title:'玩家认知变化',text:x})));
`;
content = content.replace(/function renderInsight\(c\)\{\s*const insight = c\.insight \|\| null;\s*if\(!insight\)\{\s*const cognition=\(c\.cognitionConclusions/, insight_patch);

// Patch 4: renderPlayerJourney
const player_patch = `
function renderPlayerJourney(c){
  if(c.analysis && c.analysis.player_mindset) {
     return \`<div class="analysisBox fullWidth"><h3>玩家心路历程与诉求</h3>
       <div class="emotionSourceGrid">
         \${c.analysis.player_mindset.map(x=>\`<article><p>\${x.replace(/\\*\\*(.*?)\\*\\*/, '<b>$1</b>')}</p></article>\`).join('')}
       </div>
     </div>\`;
  }
  return \`<div class="analysisBox fullWidth"><h3>玩家心路历程与诉求</h3><p class="muted">这一页只回答一个问题：玩家情绪为什么一步步升级，又为什么在公开信后只是部分回落。结论性认知放在“案例启发”页，这里聚焦阶段、诉求和证据。</p>\${renderJourneyStages(c)}\${renderGenderConflict(c)}\${renderEmotionSynthesis(c)}</div>\`;
}
`;
content = content.replace(/function renderPlayerJourney\(c\)\{[\s\S]*?return `<div class="analysisBox fullWidth"><h3>玩家心路历程与诉求[\s\S]*?<\/div>`;\s*\}/, player_patch);

// Patch 5: Timeline render
const timeline_patch = `
function renderTab(c,id){
  if(id==='timeline'){
    const timeline = c.timeline || [];
    return \`<div class="block"><h3>T-window 时间线</h3><div class="timeline">\${timeline.map(e=>\`<div class="event \${e.side||'both'}"><div class="time">\${e.phase||''} \${e.time||e.date||''}</div><div class="name">\${e.event}</div><div class="impact">\${e.impact||e.description||''}</div>\${e.links&&e.links.length?\`<div class="eventLinks"><span>来源</span>\${e.links.map(l=>\`<a target="_blank" href="\${l.url}">\${l.label}</a>\`).join('')}</div>\`:\`\`}</div>\`).join('')}</div></div>\`;
  }
`;
content = content.replace(/function renderTab\(c,id\)\{\s*if\(id==='timeline'\)\{\s*const timeline = c\.timeline \|\| \[\];[\s\S]*?\}/, timeline_patch);

fs.writeFileSync('/tmp/version-pr-case-h5/app.js', content);
