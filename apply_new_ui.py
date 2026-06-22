import re

# 1. Update index.html
with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

new_header = """
  <header class="top">
    <div class="brand">
      <div class="logo"></div>
      <div>
        <h1>游戏版本舆情洞察与案例库</h1>
        <div class="sub">14 个典型游戏舆情案例深挖与公关复盘</div>
      </div>
    </div>
    <div class="pill">Dashboard / case detail / H5</div>
  </header>

  <nav class="mainNav">
    <button onclick="switchMainTab('dashboard')" id="nav-dashboard" class="active">案例库大盘</button>
    <button onclick="switchMainTab('mapping')" id="nav-mapping">全部案例 Mapping</button>
    <button onclick="switchMainTab('conclusions')" id="nav-conclusions">结论与标签梳理</button>
  </nav>

  <main id="mapping" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>全部案例 Mapping (伤害与声量分布)</h2>
      <p class="muted">预留空间：后续将在这里填入案例的声量与伤害分布矩阵、玩家真实声音与噪音的区分、以及核心体验影响度分析。</p>
    </section>
  </main>

  <main id="conclusions" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>结论梳理与核心矛盾标签</h2>
      <p class="muted">预留空间：后续将在这里梳理提炼出的公关标签（如“核心资产剥夺”、“性别争议”等），并针对官方实际PR动作进行“得与失”的横向对比与总结。</p>
    </section>
  </main>
"""

# Replace existing header
html = re.sub(r'<header class="top">[\s\S]*?</header>', new_header, html)
# Add mapping table into dashboard
mapping_table = """
    <div class="sectionTitle"><h2>现有案例 Mapping 与公关应对评判</h2></div>
    <section class="mappingTableWrap" style="overflow-x:auto; margin-bottom: 24px;">
      <table class="table" id="mappingTable" style="background:#fff; border-radius:12px; overflow:hidden;"></table>
    </section>
"""
html = re.sub(r'<div class="sectionTitle"><h2>案例格子</h2><div class="count" id="resultCount"></div></div>', mapping_table + '\n    <div class="sectionTitle"><h2>案例格子</h2><div class="count" id="resultCount"></div></div>', html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)

# 2. Update app.js
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

app_patch = """
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
    ['insight','事后诸葛亮与PR复盘']
  ];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i===0?'active':''}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const names={timeline:'T-Window 时间线',players:'核心矛盾与玩家痛点',insight:'事后诸葛亮与PR复盘'};
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
         ${c.analysis.player_mindset.map(x=>`<article style="padding:16px;"><p style="font-size:15px; margin:0;">${x.replace(/\\*\\*(.*?)\\*\\*/g, '<b style="color:var(--red);">$1</b>')}</p></article>`).join('')}
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
         ${c.analysis.takeaways.map((x,i)=>`<article style="background:var(--soft); padding:16px; border-radius:12px; border:1px solid var(--line);"><b>💡 启发 ${i+1}</b><p style="margin-top:8px; margin-bottom:0; font-size:15px;">${x.replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>')}</p></article>`).join('')}
       </div>
     </div>`;
  }
  return `<div class="block"><p class="muted">旧版数据，请升级至新模板。</p></div>`;
}

init().catch(err=>{
  document.body.innerHTML=`<div class="app"><div class="block"><h3>页面加载失败</h3><p class="muted">${err.message}</p></div></div>`;
});
"""

# Replace from renderGrid downwards
js = re.sub(r'function renderGrid\(\)[\s\S]*', app_patch, js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)

# 3. Update style.css to include nav styles
with open('/tmp/version-pr-case-h5/style.css', 'r') as f:
    css = f.read()

nav_style = """
/* Top Navigation Bar */
.mainNav {
  display: flex;
  gap: 16px;
  background: var(--panel);
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  margin-bottom: 24px;
  overflow-x: auto;
}
.mainNav button {
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: 0.2s all;
}
.mainNav button:hover {
  background: var(--soft);
  color: var(--text);
}
.mainNav button.active {
  background: var(--blueBg);
  color: var(--blue);
}
"""
css += nav_style

with open('/tmp/version-pr-case-h5/style.css', 'w') as f:
    f.write(css)

