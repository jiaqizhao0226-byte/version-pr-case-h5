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
  const samples=caseSummaries.length===1?'674':'--';
  $('stats').innerHTML=`<div class="stat"><b>${caseSummaries.length}</b><span>当前展示案例</span></div><div class="stat"><b>S</b><span>声量等级</span></div><div class="stat"><b>${samples}</b><span>B站评论样本</span></div><div class="stat"><b>5</b><span>分析模块</span></div>`;
}

function renderGrid(){
  renderStats();
  const list=filtered();
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  $('caseGrid').innerHTML=list.map(c=>`<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${c.title}</div><div class="game">${c.game} / ${c.company}</div></div><span class="badge ${sevClass(c.damage)}">${c.damage}</span></div><div class="desc">${c.summary}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip">${t}</span>`).join('')}</div><div class="foot"><span>${c.market}</span><span>${c.time}</span></div></article>`).join('');
}

function openCase(id){location.hash=`case=${id}`;}
function goHome(){location.hash='';}

async function route(){
  const id=(location.hash.match(/case=([^&]+)/)||[])[1];
  if(id){
    const summary=caseSummaries.find(c=>c.id===id)||caseSummaries[0];
    currentCase=await loadJson(summary.caseFile);
    $('dashboard').style.display='none';
    $('detail').style.display='block';
    renderDetail(currentCase);
    scrollTo(0,0);
  }else{
    $('dashboard').style.display='block';
    $('detail').style.display='none';
    renderGrid();
  }
}

function renderDetail(c){
  $('detailHero').innerHTML=`<div class="sub">${c.game} / ${c.company}</div><h2>${c.title}</h2><p class="muted">${c.oneLine}</p><div class="meta"><span>${c.market}</span><span>${c.time}</span><span>${c.lifecycle}</span><span>声量 ${c.volume}</span><span>伤害 ${c.damage}</span><span>${c.status}</span></div>`;
  const tabs=[['timeline','时间线'],['players','玩家爆发'],['feedback','玩家反馈证据'],['official','官方处置'],['data','影响量化'],['insight','案例启发']];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i?'':'active'}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i?'':'active'}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const names={timeline:'时间线',players:'玩家爆发',feedback:'玩家反馈证据',official:'官方处置',data:'影响量化',insight:'案例启发'};
  [...document.querySelectorAll('.tab')].find(x=>x.textContent===names[id]).classList.add('active');
  $(`tab-${id}`).classList.add('active');
}

function renderTab(c,id){
  if(id==='timeline')return `<div class="block"><h3>T-window 时间线</h3><div class="timeline">${c.timeline.map(e=>`<div class="event ${e.side}"><div class="time"><span class="side">${e.side==='official'?'官方动作':'玩家动作'}</span>${e.phase} / ${e.time}</div><div class="name">${e.event}</div><div class="impact">${e.impact}</div>${e.links&&e.links.length?`<div class="eventLinks"><span>来源</span>${e.links.map(l=>`<a target="_blank" href="${l.url}">${l.label}</a>`).join('')}</div>`:''}</div>`).join('')}</div></div><div class="block"><h3>T-window记录规则</h3><p class="muted">所有官方单独动作都要拆开：前瞻、上线/热更新、首次回应、修复/回滚、高层公开信、补偿加码、后续机制承诺均单列。玩家侧反应、扒改动、质疑、翻旧账、是否原谅等也要单列到玩家动作侧，不能写在官方动作卡片里。</p></div>`;
  if(id==='players')return `<div class="playerLayout"><aside class="tagRail"><h3>认知标签</h3>${c.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</aside><div class="analysisBox"><h3>玩家心理历程与诉求</h3><p class="muted">这场爆发不是玩家单纯反对一个动作，而是从“发现异常”一路升级为“质疑官方是否尊重已上线内容、是否优先听了某些圈层声音、是否具备大版本治理能力”。</p><div class="psySteps"><div><b>1 发现异常</b>动作、表情、骑乘、生态与S1不一致。</div><div><b>2 定性暗改</b>变化不是公告得知，而是玩家自己扒出来。</div><div><b>3 翻旧账</b>平衡、回溯、养成、PVE影响一起被激活。</div><div><b>4 信任受损</b>从“改了什么”变成“以后还会不会改”。</div></div><div class="demandGrid"><div class="demand"><b>表层诉求</b><ul>${c.playerNeeds.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="demand"><b>深层诉求</b><ul><li>确认已上线内容不会被无公告修改。</li><li>解释动作调整的需求来源、评估标准和决策链路。</li><li>证明核心玩家长期反馈不会被选择性忽视。</li><li>建立版本分支、需求准入、公告公示和情感资产保护机制。</li><li>用回滚和制度修复信任，而不是只用补偿安抚情绪。</li></ul></div></div><h4>真实损失不是单点功能损失</h4><table class="table"><tr><th>损失类型</th><th>本案体现</th></tr>${c.losses.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table></div></div>`;
  if(id==='feedback')return renderFeedback(c);
  if(id==='official')return `<div class="block"><h3>官方处置复盘</h3><p class="muted">这次官方处置可以分成两个阶段看：5月22日第一次回应负责“止血”，但没有解释清楚为什么暗改、为什么不直接回退，因此被认为避重就轻；5月24日主策公开信才真正开始回答“为什么发生、谁负责、后续机制怎么改”，所以才让部分玩家愿意继续观察。</p><h4>第一次回应为何失败</h4><table class="table"><tr><th>玩家真正关心</th><th>首次回应</th><th>为什么不买账</th></tr>${c.responseFail.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join('')}</table><h4>官方做对了什么</h4><ul>${c.officialRight.map(x=>`<li>${x}</li>`).join('')}</ul><h4>官方做错了什么</h4><ul>${c.officialWrong.map(x=>`<li>${x}</li>`).join('')}</ul><div class="quote">核心判断：官方后续的主策公开信和补偿加码确实改善了一部分玩家情绪，但第一次回应没有接住玩家真正的不满，导致舆情从“动作争议”继续升级为“信任与解释权危机”。</div></div>`;
  if(id==='data')return `<div class="grid2"><div><div class="block"><h3>B站高赞评论</h3><table class="table"><tr><th>评论</th><th>点赞</th><th>反映心态</th></tr>${c.quotes.map(q=>`<tr><td>${q[0]}</td><td>${q[1]}</td><td>${q[2]}</td></tr>`).join('')}</table></div></div><aside><div class="block"><h3>声量-伤害矩阵</h3><div class="matrix"><div><b>声量</b><p>${c.volume}</p></div><div><b>伤害</b><p>${c.damage}</p></div><div><b>状态</b><p>${c.status}</p></div><div><b>样本</b><p>674条热门评论</p></div></div></div><div class="block source"><h3>来源</h3>${(c.sourceNotes||[]).map(s=>`<div class="sourceItem"><a target="_blank" href="${s.url}">${s.name}</a><p>${s.usage}</p></div>`).join('')||c.sources.map(x=>`<a target="_blank" href="${x}">${x}</a>`).join('')}</div></aside></div>`;
  if(id==='insight')return `<div class="block"><h3>案例启发：玩家认知变化与未来治理</h3><p class="muted">这一页把“玩家如何重新理解事件”和“未来应该如何预防/处理”放在一起看，避免把洞察和行动拆散。</p><h4>玩家认知变化</h4>${c.cognition.map(x=>`<div class="quote">${x}</div>`).join('')}<h4>被破坏的默认契约</h4><div class="chips">${c.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</div><h4>未来启发与治理清单</h4><ul>${c.lessons.map(x=>`<li>${x}</li>`).join('')}</ul>${c.templateValue?`<h4>作为样板案例的价值</h4><table class="table"><tr><th>分析点</th><th>价值</th></tr>${c.templateValue.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table>`:''}<div class="quote">核心判断：本案的启发不是“动作不要改”，而是任何会影响已上线内容、情感资产和玩家解释权的调整，都必须前置公告、说明决策链，并优先准备共存方案。</div></div>`;
}

init().catch(err=>{
  document.body.innerHTML=`<div class="app"><div class="block"><h3>页面加载失败</h3><p>请通过本地服务器或线上GitHub Pages访问，直接打开file://时浏览器可能会阻止JSON读取。</p><p class="muted">${err.message}</p></div></div>`;
});


function renderFeedback(c){
  const f=c.feedbackEvidence||{};
  const heat=f.sourceHeat||[];
  const quotes=f.quotes||[];
  const caveats=f.platformCaveats||[];
  const byTheme={};
  quotes.forEach(q=>{(byTheme[q.theme]||(byTheme[q.theme]=[])).push(q)});
  return `${f.researchNote?`<div class="block researchNote"><h3>原话处理说明</h3><p>${f.researchNote}</p></div>`:''}<div class="feedbackGrid"><div class="block"><h3>社区热度与来源</h3><p class="muted">先看玩家反馈来自哪里、热度多大，再看原话。当前以公开平台样本为主，个人身份信息不展示。</p><table class="table"><tr><th>平台</th><th>来源</th><th>热度</th><th>样本</th></tr>${heat.map(s=>`<tr><td>${s.platform}</td><td><a target="_blank" href="${s.url}">${s.title}</a><div class="muted">${s.sourceType}${s.note?`｜${s.note}`:''}</div></td><td>${s.metrics}</td><td>${s.sampleComments||0}</td></tr>`).join('')}</table></div><aside class="block"><h3>采集说明</h3>${caveats.map(x=>`<p class="muted">${x}</p>`).join('')}<div class="quote">${f.analysis||''}</div></aside></div><div class="block"><h3>玩家原话摘录与认知主题</h3>${Object.entries(byTheme).map(([theme,items])=>`<section class="quoteTheme"><h4>${theme}</h4><div class="quoteCards">${items.map(q=>`<article class="quoteCard"><div class="quoteMeta"><span>${q.platform}</span><span>${q.like||0}赞</span>${q.reply?`<span>${q.reply}回复</span>`:''}${q.score?`<span>${q.score}星</span>`:''}</div><p>“${q.text}”</p><div class="quoteAnalysis">${q.analysis||''}</div><a target="_blank" href="${q.sourceUrl}">查看来源</a></article>`).join('')}</div></section>`).join('')}</div>`;
}
