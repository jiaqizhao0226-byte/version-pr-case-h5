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
  const tabs=[['timeline','时间线'],['players','玩家心路历程'],['official','官方处置'],['data','影响量化'],['insight','案例启发']];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i?'':'active'}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i?'':'active'}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const names={timeline:'时间线',players:'玩家心路历程',official:'官方处置',data:'影响量化',insight:'案例启发'};
  [...document.querySelectorAll('.tab')].find(x=>x.textContent===names[id]).classList.add('active');
  $(`tab-${id}`).classList.add('active');
}

function renderTab(c,id){
  if(id==='timeline'){
    const timeline = c.timeline || [];
    return `<div class="block"><h3>T-window 时间线</h3><div class="timeline">${timeline.map(e=>`<div class="event ${e.side}"><div class="time"><span class="side">${e.side==='official'?'官方动作':'玩家动作'}</span>${e.phase} / ${e.time}</div><div class="name">${e.event}</div><div class="impact">${e.impact}</div>${e.links&&e.links.length?`<div class="eventLinks"><span>来源</span>${e.links.map(l=>`<a target="_blank" href="${l.url}">${l.label}</a>`).join('')}</div>`:''}</div>`).join('')}</div></div><div class="block"><h3>T-window记录规则</h3><p class="muted">所有官方单独动作都要拆开：前瞻、上线/热更新、首次回应、修复/回滚、高层公开信、补偿加码、后续机制承诺均单列。玩家侧反应、扒改动、质疑、翻旧账、是否原谅等也要单列到玩家动作侧，不能写在官方动作卡片里。</p></div>`;
  }
  if(id==='players')return renderPlayerJourney(c);
  if(id==='official')return renderOfficialResponse(c);
  if(id==='data')return renderImpactQuantification(c);
  if(id==='insight')return renderInsight(c);
}

function renderInsight(c){
  const insight = c.insight || null;
  if(!insight){
    const cognition=(c.cognitionConclusions||[]).concat((c.cognition||[]).map(x=>({title:'玩家认知变化',text:x})));
    const lessons=(c.lessons||[]).map(x=>({title:x,text:''}));
    const templateValue=(c.templateValue||[]).map(x=>({scenario:x[0],value:x[1]}));
    return renderInsightContent({
      coreTakeaway:'本案启发仍使用旧字段渲染，建议补充 insight 结构以减少重复。',
      playerCognitionChanges:cognition,
      operationLessons:lessons,
      transferableValue:templateValue
    });
  }
  return renderInsightContent(insight);
}

function renderInsightContent(insight){
  const playerChanges = insight.playerCognitionChanges || [];
  const operationLessons = insight.operationLessons || [];
  const transferableValue = insight.transferableValue || [];
  return `<div class="block insightPage"><h3>案例启发：核心判断、玩家认知与治理启发</h3><p class="muted">这一页只保留可迁移的结论，避免重复描述事件经过、玩家情绪和官方处置。</p><div class="quote"><b>核心启发：</b>${insight.coreTakeaway||'暂无核心启发。'}</div><h4>玩家认知变化</h4><div class="conclusionGrid">${playerChanges.map(x=>`<article><b>${x.title}</b><p>${x.text}</p></article>`).join('')}</div><h4>运营治理启发</h4><div class="conclusionGrid">${operationLessons.map(x=>`<article><b>${x.title}</b><p>${x.text}</p></article>`).join('')}</div><h4>可迁移模板价值</h4><table class="table"><tr><th>适用场景</th><th>复用价值</th></tr>${transferableValue.map(x=>`<tr><td>${x.scenario}</td><td>${x.value}</td></tr>`).join('')}</table></div>`;
}

init().catch(err=>{
  document.body.innerHTML=`<div class="app"><div class="block"><h3>页面加载失败</h3><p>请通过本地服务器或线上GitHub Pages访问，直接打开file://时浏览器可能会阻止JSON读取。</p><p class="muted">${err.message}</p></div></div>`;
});







function renderImpactQuantification(c){
  const q=c.impactQuantification||{};
  if(!q.summary){return `<div class="block"><h3>影响量化</h3><p class="muted">暂无结构化影响量化数据。</p></div>`;}
  return `<div class="impactDeep"><section class="block impactIntro"><h3>影响量化：从声量、情绪、行动到伤害判断</h3><p>${q.summary}</p><div class="dataPrinciples">${(q.dataPrinciple||[]).map(x=>`<span>${x}</span>`).join('')}</div></section><section class="impactMetricGrid">${(q.topMetrics||[]).map(x=>`<article><b>${x.value}</b><span>${x.label}</span><p>${x.note}</p></article>`).join('')}</section><section class="block"><h4>平台声量与样本口径</h4><table class="table"><tr><th>平台</th><th>来源</th><th>指标</th><th>样本</th><th>备注</th></tr>${(q.platformSignals||[]).map(x=>`<tr><td>${x.platform}</td><td><a target="_blank" href="${x.url}">${x.title}</a><div class="muted">${x.sourceType||''}</div></td><td>${x.metrics||''}</td><td>${x.sampleComments||0}</td><td>${x.note||''}</td></tr>`).join('')}</table></section><section class="block"><h4>按T-window看影响信号</h4><div class="impactTimeline">${(q.timelineSignals||[]).map(x=>`<article><div><b>${x.phase}</b><span>${x.signal}</span></div><p>${x.metric}</p><em>${x.meaning}</em></article>`).join('')}</div></section><section class="block"><h4>伤害维度评估</h4><div class="damageGrid">${(q.damageDimensions||[]).map(x=>`<article><div><b>${x.dimension}</b><span>${x.level}</span></div><p>${x.evidence}</p><em>${x.interpretation}</em></article>`).join('')}</div></section><section class="block"><h4>情绪与行动信号</h4><div class="signalGrid">${(q.sentimentActions||[]).map(x=>`<article><b>${x.type}</b><span>${x.signal}</span><ul>${(x.examples||[]).map(e=>`<li>${e}</li>`).join('')}</ul></article>`).join('')}</div></section><section class="block"><h4>数据缺口与下一步采集</h4><table class="table"><tr><th>缺口</th><th>当前状态</th><th>下一步</th></tr>${(q.dataGaps||[]).map(x=>`<tr><td>${x.gap}</td><td>${x.status}</td><td>${x.next}</td></tr>`).join('')}</table></section></div>`;
}

function renderOfficialResponse(c){
  const d=c.officialResponseDeepDive;
  if(!d){
    return `<div class="block"><h3>官方处置复盘</h3><p class="muted">暂无深度复盘数据。</p></div>`;
  }
  return `<div class="officialDeep"><section class="block officialIntro"><h3>官方处置复盘：哪些回应有价值，哪些没有接住问题</h3><p>${d.summary}</p><div class="officialJudgement">${d.keyJudgement}</div></section><section class="officialStages">${(d.stages||[]).map((s,i)=>`<article class="officialStage"><div class="officialStageHead"><span>回应${i+1}</span><div><h4>${s.name}</h4><p>${s.time}｜${s.source}</p></div><em>${s.value}</em></div><div class="officialQuoteBlock"><b>官方原文/要点摘录</b>${(s.officialExcerpt||[]).map(x=>`<p>“${x}”</p>`).join('')}</div><div class="officialValueGrid"><section><h5>真正有价值的部分</h5><ul>${(s.valuable||[]).map(x=>`<li>${x}</li>`).join('')}</ul></section><section><h5>低价值或未回答的部分</h5><ul>${(s.lowValue||[]).map(x=>`<li>${x}</li>`).join('')}</ul></section></div><div class="officialEffect"><b>实际效果：</b>${s.effect}</div></article>`).join('')}</section><section class="block"><h4>回应价值分层</h4><table class="table"><tr><th>回应</th><th>判断</th><th>原因</th></tr>${(d.valueMatrix||[]).map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td></tr>`).join('')}</table></section><section class="block"><h4>为什么主策公开信 + 补偿才真正安抚到玩家</h4><ul>${(d.whyWorked||[]).map(x=>`<li>${x}</li>`).join('')}</ul><div class="quote">平衡判断：Kiki 说“开水出来回应 + 道歉信诚恳 + 送东西诚意足”是对的，但这不是全部。真正有效的是这三者背后补上了责任承担、事故解释、修复清单和制度承诺；如果只有补偿，没有这些解释，玩家仍会把它理解为用福利换沉默。</div></section></div>`;
}

function renderEvidenceCard(e){
  const identity=e.playerId||e.playerName||'公开评论用户';
  const meta=[e.platform,e.time,e.sourceType].filter(Boolean).join('｜');
  const source=[e.sourceTitle?`出处：${e.sourceTitle}`:'',e.note?`说明：${e.note}`:''].filter(Boolean).join('｜');
  return `<a class="commentShot" target="_blank" href="${e.url||'#'}"><div class="commentShotTop"><span class="avatar">${(e.platform||'评').slice(0,1)}</span><div><b>${identity}</b><small>${meta}</small></div></div><div class="commentShotText">${e.text||''}</div>${source?`<div class="commentShotMeta">${source}</div>`:''}<div class="commentShotFoot"><span>${e.heat||'热度待补'}</span><span>点击查看来源</span></div></a>`;
}

function renderGenderConflict(c){
  const g=c.genderConflictAnalysis;
  if(!g) return '';
  return `<div class="majorDivider"><span>专题补充</span></div><section class="genderModule"><div class="moduleEyebrow">玩家代表性与社区治理</div><h4>${g.title}</h4><p>${g.summary}</p><div class="genderChain">${(g.chain||[]).map(x=>`<article><b>${x.label}</b><span>${x.text}</span></article>`).join('')}</div><div class="genderTakeaway">${g.keyTakeaway}</div><div class="genderEvidence"><h5>关键证据</h5>${(g.evidence||[]).map(e=>renderEvidenceCard(e)).join('')}</div></section><div class="majorDivider bottom"><span>回到玩家诉求归纳</span></div>`;
}


function renderEmotionSynthesis(c){
  const s=c.emotionSynthesis||{};
  const timeline=s.timeline||[];
  const sources=s.emotionSources||[];
  const losses=s.lossSummary||(c.losses||[]).map(x=>({type:x[0],text:x[1]}));
  return `<div class="majorDivider bottom"><span>阶段情绪与诉求归纳</span></div><section class="synthesisModule"><h4>按时间线看：玩家情绪为什么逐步升级</h4><div class="phaseSummaryList">${timeline.map(x=>`<article><div class="phaseMeta"><b>${x.phase}</b><span>${x.time}</span></div><h5>${x.title}</h5><p>${x.summary}</p><em>${x.emotion}</em></article>`).join('')}</div><h4>玩家情绪来源归纳</h4><div class="emotionSourceGrid">${sources.map(x=>`<article><b>${x.name}</b><p>${x.text}</p></article>`).join('')}</div><h4>玩家认为自己损失了什么</h4><div class="lossGrid">${losses.map(x=>`<article><b>${x.type}</b><p>${x.text}</p></article>`).join('')}</div></section>`;
}

function renderDemandFunnel(c){
  const f=c.playerDemandFunnel||{};
  if(!f.surface&&!f.middle&&!f.deep) return '';
  const groups=[['表层诉求','玩家直接说出口的要求',f.surface||[]],['中层诉求','玩家希望官方真正解决的问题',f.middle||[]],['深层诉求','玩家想重新确认的关系与契约',f.deep||[]]];
  return `<div class="demandFunnel"><h4>玩家诉求三层漏斗</h4><div class="funnelGrid">${groups.map((g,i)=>`<section class="funnelLevel level${i+1}"><div class="funnelHead"><b>${g[0]}</b><span>${g[1]}</span></div><ul>${g[2].map(x=>`<li>${x}</li>`).join('')}</ul></section>`).join('')}</div></div>`;
}

function renderFeedback(c){
  const f=c.feedbackEvidence||{};
  const heat=f.sourceHeat||[];
  const quotes=f.quotes||[];
  const caveats=f.platformCaveats||[];
  const byTheme={};
  quotes.forEach(q=>{(byTheme[q.theme]||(byTheme[q.theme]=[])).push(q)});
  return `${f.researchNote?`<div class="block researchNote"><h3>原话处理说明</h3><p>${f.researchNote}</p></div>`:''}<div class="feedbackGrid"><div class="block"><h3>玩家反馈证据：社区热度与来源</h3><p class="muted">以下数据用于支撑上面的心理路径判断：先看玩家反馈来自哪里、热度多大，再看原话。当前以公开平台样本为主，个人身份信息不展示。</p><table class="table"><tr><th>平台</th><th>来源</th><th>热度</th><th>样本</th></tr>${heat.map(s=>`<tr><td>${s.platform}</td><td><a target="_blank" href="${s.url}">${s.title}</a><div class="muted">${s.sourceType}${s.note?`｜${s.note}`:''}</div></td><td>${s.metrics}</td><td>${s.sampleComments||0}</td></tr>`).join('')}</table></div><aside class="block"><h3>采集说明</h3>${caveats.map(x=>`<p class="muted">${x}</p>`).join('')}<div class="quote">${f.analysis||''}</div></aside></div><div class="block"><h3>玩家原话摘录：这些话说明了什么</h3>${Object.entries(byTheme).map(([theme,items])=>`<section class="quoteTheme"><h4>${theme}</h4><div class="quoteCards">${items.map(q=>`<article class="quoteCard"><div class="quoteMeta"><span>${q.platform}</span><span>${q.like||0}赞</span>${q.reply?`<span>${q.reply}回复</span>`:''}${q.score?`<span>${q.score}星</span>`:''}</div><p>“${q.text}”</p><div class="quoteAnalysis">${q.analysis||''}</div><a target="_blank" href="${q.sourceUrl}">查看来源</a></article>`).join('')}</div></section>`).join('')}</div>`;
}


function renderPlayerJourney(c){
  return `<div class="analysisBox fullWidth"><h3>玩家心路历程与诉求</h3><p class="muted">这一页只回答一个问题：玩家情绪为什么一步步升级，又为什么在公开信后只是部分回落。结论性认知放在“案例启发”页，这里聚焦阶段、诉求和证据。</p>${renderJourneyStages(c)}${renderGenderConflict(c)}${renderEmotionSynthesis(c)}</div>`;
}



function renderJourneyStages(c){
  const stages=c.playerJourneyStages||[];
  if(!stages.length){
    return `<div class="psySteps"><div><b>1 发现异常</b>动作、表情、骑乘、生态与S1不一致。</div><div><b>2 定性暗改</b>变化不是公告得知，而是玩家自己扒出来。</div><div><b>3 翻旧账</b>平衡、回溯、养成、PVE影响一起被激活。</div><div><b>4 信任受损</b>从“改了什么”变成“以后还会不会改”。</div></div>`;
  }
  return `<div class="journeyTrend"><div class="trendHeader"><div><h4>玩家情绪强度趋势图</h4><p class="muted">横轴为事件阶段，纵轴为玩家情绪强度。折线越高，代表该阶段玩家愤怒、质疑和行动化倾向越强。</p></div></div>${renderEmotionLineChart(stages)}<div class="stageStoryList">${stages.map((s,i)=>`<article class="stageStory"><header><span>阶段${i+1}</span><div><h4>${s.stage.replace(/^阶段[一二三四五六七八九十]+：/,'')}</h4><p>${s.time}｜${s.emotion}</p></div></header><section class="storyMain"><div class="storyPoint">${s.stageSummary||s.coreQuestion}</div><p><b>玩家怎么想：</b>${s.psychology}</p><p><b>玩家要什么：</b>${s.playerDemand||''}</p><p><b>触发因素：</b>${s.trigger||''}</p></section><section class="storyEvidence"><h5>玩家反馈截图 / 摘录</h5>${(s.evidence||[]).map(e=>renderEvidenceCard(e)).join('')}</section></article>`).join('')}</div></div>`;
}



function renderEmotionLineChart(stages){
  const W=1040,H=360,padL=58,padR=32,padT=34,padB=106;
  const innerW=W-padL-padR,innerH=H-padT-padB;
  const x=i=>padL+(stages.length===1?innerW/2:(innerW*i/(stages.length-1)));
  const y=v=>padT+innerH-(Math.max(0,Math.min(100,v))/100)*innerH;
  const points=stages.map((s,i)=>`${x(i)},${y(s.emotionScore)}`).join(' ');
  const area=`${padL},${padT+innerH} ${points} ${padL+innerW},${padT+innerH}`;
  const grid=[0,25,50,75,100];
  return `<div class="lineChartWrap"><svg class="emotionLineChart" viewBox="0 0 ${W} ${H}" role="img" aria-label="玩家情绪强度趋势图">
    <defs><linearGradient id="emotionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a32d2d" stop-opacity="0.22"/><stop offset="1" stop-color="#a32d2d" stop-opacity="0.02"/></linearGradient></defs>
    ${grid.map(g=>`<line x1="${padL}" y1="${y(g)}" x2="${padL+innerW}" y2="${y(g)}" class="grid"/><text x="${padL-12}" y="${y(g)+4}" class="axisLabel" text-anchor="end">${g}</text>`).join('')}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+innerH}" class="axis"/><line x1="${padL}" y1="${padT+innerH}" x2="${padL+innerW}" y2="${padT+innerH}" class="axis"/>
    <text x="18" y="${padT+innerH/2}" class="axisTitle" transform="rotate(-90 18 ${padT+innerH/2})">玩家情绪强度</text>
    <polygon points="${area}" fill="url(#emotionArea)"/>
    <polyline points="${points}" class="emotionLine" fill="none"/>
    ${stages.map((s,i)=>`<g class="point"><line x1="${x(i)}" y1="${y(s.emotionScore)}" x2="${x(i)}" y2="${padT+innerH}" class="guide"/><circle cx="${x(i)}" cy="${y(s.emotionScore)}" r="6"/><text x="${x(i)}" y="${y(s.emotionScore)-12}" class="score" text-anchor="middle">${s.emotionScore}</text>${renderChartStageCallout(s,i,x(i),y(s.emotionScore),padT,padT+innerH)}<text x="${x(i)}" y="${padT+innerH+28}" class="stageLabel" text-anchor="middle">阶段${i+1}</text><text x="${x(i)}" y="${padT+innerH+48}" class="stageTime" text-anchor="middle">${s.time.split('/')[0].trim()}</text></g>`).join('')}
  </svg></div>`;
}


function chartStageLabel(stage){
  const raw=stage.replace(/^阶段[一二三四五六七八九十]+：/,'');
  const map={
    '预期升高，但旧账已在积累':['预期升高','旧账积累'],
    '发现异常，快速定性为“暗改”':['发现异常','定性暗改'],
    '首次道歉失败，诉求从补偿转向回滚和解释':['首次道歉失败','转向回滚解释'],
    '问题扩大，变成版本管理与玩家代表性危机':['问题扩大','版本管理/代表性危机'],
    '公开信与补偿后，进入“接受处理但未原谅”':['公开信与补偿后','接受处理但未原谅']
  };
  return map[raw] || raw.split(/[，、]/).filter(Boolean).slice(0,2);
}
function renderChartStageCallout(stage,index,cx,cy,top,bottom){
  const lines=chartStageLabel(stage.stage);
  const below=stage.emotionScore>=75;
  const labelY=below?Math.min(bottom-84,cy+34):Math.max(top+18,cy-44);
  return `<text x="${cx}" y="${labelY}" class="chartCallout" text-anchor="middle">${lines.map((line,j)=>`<tspan x="${cx}" dy="${j?15:0}">${line}</tspan>`).join('')}</text>`;
}
