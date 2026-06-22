let caseSummaries=[];
let currentCase=null;

const $=id=>document.getElementById(id);
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const splitType=v=>(v||'').split('/').map(x=>x.trim()).filter(Boolean);
const sevClass=v=>(v||'').includes('S')?'s':((v||'').includes('A')?'a':'s');

async function loadJson(url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function init(){
  caseSummaries=await loadJson('./data/cases.json');
  fillFilters();
  bindFilters();
  route();
  addEventListener('hashchange',route);
}

function fillFilters(){
  const groups=[['market',uniq(caseSummaries.map(c=>c.market))],['type',uniq(caseSummaries.flatMap(c=>splitType(c.type)))],['cognition',uniq(caseSummaries.flatMap(c=>c.tags||[]))]];
  groups.forEach(([id,items])=>{
    const el=$(id);
    items.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;el.appendChild(o)});
  });
}

function bindFilters(){['q','market','type','cognition'].forEach(id=>$(id).addEventListener('input',renderGrid));}

function filtered(){
  const q=$('q').value.trim().toLowerCase(),m=$('market').value,t=$('type').value,cg=$('cognition').value;
  return caseSummaries.filter(c=>{
    const hay=[c.title,c.game,c.company,c.market,c.type,c.summary,...(c.tags||[])].join(' ').toLowerCase();
    return(!q||hay.includes(q))&&(!m||c.market===m)&&(!t||splitType(c.type).includes(t))&&(!cg||(c.tags||[]).includes(cg));
  });
}

function renderStats(){
  const list = filtered();
  const totalSamples = list.reduce((acc, c) => {
    if (c.id === 'luoke-s2') return acc + 674;
    if (c.id === 'sanjiaozhou-jail') return acc + 200; // approximate validated sample comments for Delta
    return acc;
  }, 0);
  $('stats').innerHTML=`<div class="stat"><b>${caseSummaries.length}</b><span>当前展示案例</span></div><div class="stat"><b>S</b><span>最高声量</span></div><div class="stat"><b>${totalSamples || '--'}</b><span>已校回评样本</span></div><div class="stat"><b>5</b><span>分析维度页签</span></div>`;
}


function switchMainTab(tabId) {
  document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tabId);
  if (btn) btn.classList.add('active');
  
  document.getElementById('dashboard').style.display = 'none';
  if(document.getElementById('mapping')) document.getElementById('mapping').style.display = 'none';
  if(document.getElementById('conclusions')) document.getElementById('conclusions').style.display = 'none';
  document.getElementById('detail').style.display = 'none';
  
  if (tabId === 'dashboard') {
    location.hash = '';
    document.getElementById('dashboard').style.display = 'block';
  } else {
    document.getElementById(tabId).style.display = 'block';
  }
}

function renderGrid(){
  renderStats();
  const list=filtered();
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  $('caseGrid').innerHTML=list.map(c=>`<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${c.title}</div><div class="game">${c.game} / ${c.company}</div></div><span class="badge ${sevClass(c.damage)}">${c.damage}</span></div><div class="desc">${c.summary}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip">${t}</span>`).join('')}</div><div class="foot"><span>${c.market}</span><span>${c.time}</span></div></article>`).join('');
  
  if ($('mappingTable')) {
    const tableHtml = `<tr>
      <th>案例名称</th>
      <th>伤害 / 声量</th>
      <th>声音性质</th>
      <th>影响核心体验</th>
      <th>核心矛盾 Tag</th>
      <th>PR 实际应对与评判</th>
    </tr>` + list.map(c => {
      const m = c.mapping || {};
      return `<tr>
        <td style="font-weight:bold; cursor:pointer; color:#0052d9;" onclick="openCase('${c.id}')">${c.title}</td>
        <td><span class="badge ${sevClass(c.damage)}">${c.damage}</span> / <span class="badge ${sevClass(c.volume)}">${c.volume}</span></td>
        <td>${m.voice_nature || '-'}</td>
        <td>${m.core_exp || '-'}</td>
        <td>${m.core_tag || '-'}</td>
        <td>${m.pr_eval || '-'}</td>
      </tr>`;
    }).join('');
    $('mappingTable').innerHTML = tableHtml;
  }
}

async function route(){
  const id=(location.hash.match(/case=([^&]+)/)||[])[1];
  if(id){
    const summary=caseSummaries.find(c=>c.id===id)||caseSummaries[0];
    const rawCase=await loadJson(summary.caseFile);
    
    // Lift data up if present
    currentCase = rawCase.data ? { ...summary, ...rawCase.data } : { ...summary, ...rawCase };
    
    $('dashboard').style.display='none';
    if($('mapping')) $('mapping').style.display='none';
    if($('conclusions')) $('conclusions').style.display='none';
    $('detail').style.display='block';
    
    document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
    
    renderDetail(currentCase);
    scrollTo(0,0);
  }else{
    switchMainTab('dashboard');
    renderGrid();
  }
}

function renderDetail(c){
  $('detailHero').innerHTML=`<div class="sub">${c.game} / ${c.company}</div><h2>${c.title}</h2><div class="meta"><span>${c.market}</span><span>${c.time}</span><span>${c.lifecycle}</span><span>声量 <strong style="color:var(--red);">${c.volume}</strong></span><span>伤害 <strong style="color:var(--red);">${c.damage}</strong></span></div>`;
  const tabs=[
    ['timeline','T-Window 时间线'],
    ['players','核心矛盾与玩家痛点'],
    ['insight','官方动作复盘与事后诸葛亮']
  ];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i===0?'active':''}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const names={timeline:'T-Window 时间线',players:'核心矛盾与玩家痛点',insight:'官方动作复盘与事后诸葛亮'};
  [...document.querySelectorAll('.tab')].find(x=>x.textContent===names[id]).classList.add('active');
  $(`tab-${id}`).classList.add('active');
}

function renderTab(c,id){
  if(id==='timeline'){
    const timeline = c.timeline || [];
    return `<div class="block"><h3>时间线还原</h3><div class="timeline">${timeline.map(e=>`<div class="event both" style="width:100%; margin-left:0; max-width:800px;"><div class="time">${e.date||''}</div><div class="name">${e.event}</div><div class="impact" style="margin-top:8px;">${e.description||''}</div></div>`).join('')}</div></div>`;
  }
  if(id==='players') return renderPlayerJourney(c);
  if(id==='insight') return renderInsight(c);
  return '';
}

function renderPlayerJourney(c){
  if(c.analysis && c.analysis.player_mindset) {
     return `<div class="analysisBox fullWidth">
       <div style="background:var(--redBg); border: 1px solid var(--red); color:var(--red); padding:16px; border-radius:12px; margin-bottom:24px;">
         <h4 style="margin:0 0 8px;">🔥 核心矛盾定性</h4>
         <p style="margin:0; font-weight:600;">${c.analysis.core_conflict || ''}</p>
       </div>
       <h3>玩家痛点剖析</h3>
       <div class="emotionSourceGrid" style="grid-template-columns: 1fr;">
         ${c.analysis.player_mindset.map(x=>`<article style="padding:16px;"><p style="font-size:15px; margin:0;">${x.replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--red);">$1</b>')}</p></article>`).join('')}
       </div>
     </div>`;
  }
  return `<div class="analysisBox fullWidth"><p class="muted">旧版数据，请升级至新模板。</p></div>`;
}

function renderInsight(c){
  if(c.analysis && c.analysis.takeaways) {
     const oa = c.analysis.official_action || {pros:'', cons:''};
     return `<div class="block insightPage">
       <div style="margin-bottom: 32px;">
         <h3 style="margin-bottom: 16px;">实际官方是怎么做的与评价</h3>
         <div class="officialValueGrid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
           <section style="background: var(--bg-page); padding: 18px; border-radius: 12px; border-top: 4px solid var(--green); background: #fff; box-shadow: var(--shadow);">
             <h5 style="margin-top:0; color:var(--green); font-size:16px;">👍 做得好/起效的部分 (Pros)</h5>
             <p style="margin-bottom:0; font-size:14px;">${oa.pros || '无'}</p>
           </section>
           <section style="background: var(--bg-page); padding: 18px; border-radius: 12px; border-top: 4px solid var(--red); background: #fff; box-shadow: var(--shadow);">
             <h5 style="margin-top:0; color:var(--red); font-size:16px;">👎 失误/无效的部分 (Cons)</h5>
             <p style="margin-bottom:0; font-size:14px;">${oa.cons || '无'}</p>
           </section>
         </div>
       </div>

       <h3 style="margin-bottom: 16px;">PR应对建议 (事后诸葛亮) 与核心启发</h3>
       <div class="conclusionGrid" style="display:grid; gap:16px;">
         ${c.analysis.takeaways.map((x,i)=>`<article style="background:var(--soft); padding:16px; border-radius:12px; border:1px solid var(--line);"><b>💡 启发 ${i+1}</b><p style="margin-top:8px; margin-bottom:0; font-size:15px;">${x.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</p></article>`).join('')}
       </div>
     </div>`;
  }
  return `<div class="block"><p class="muted">旧版数据，请升级至新模板。</p></div>`;
}

init().catch(err=>{
  document.body.innerHTML=`<div class="app"><div class="block"><h3>页面加载失败</h3><p class="muted">${err.message}</p></div></div>`;
});
