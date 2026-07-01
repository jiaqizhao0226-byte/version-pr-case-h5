let caseSummaries=[];
let currentCase=null;

const $=id=>document.getElementById(id);
const esc=s=>(s==null?'':String(s));
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const splitType=v=>(v||'').split('/').map(x=>x.trim()).filter(Boolean);
const sevClass=v=>typeof v==='string'?(v.includes('S')?'s':(v.includes('A')?'a':'s')):'s';
// 声量/伤害等级 → 高/中/低（含 S=高，A=中，B=低；A/S、B/A 取更高/含A→中）
const gradeLevel=g=>/S/.test(g||'')?'高':(/A/.test(g||'')?'中':'低');
// 等级 → 徽章配色（高=红 / 中=琥珀 / 低=绿）
const levelClass=g=>{const l=gradeLevel(g);return l==='高'?'lv-hi':(l==='中'?'lv-mid':'lv-lo');};

function switchMainTab(tabId) {
  document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tabId);
  if (btn) btn.classList.add('active');
  
  if(document.getElementById('overview')) document.getElementById('overview').style.display = 'none';
  if(document.getElementById('dashboard')) document.getElementById('dashboard').style.display = 'none';
  if(document.getElementById('mapping')) document.getElementById('mapping').style.display = 'none';
  if(document.getElementById('conclusions')) document.getElementById('conclusions').style.display = 'none';
  if(document.getElementById('detail')) document.getElementById('detail').style.display = 'none';
  
  if (tabId === 'mapping') {
    location.hash = '';
    if(document.getElementById('mapping')) document.getElementById('mapping').style.display = 'block';
  } else if (tabId === 'overview') {
    location.hash = '';
    if(document.getElementById('overview')) document.getElementById('overview').style.display = 'block';
  } else {
    if(document.getElementById(tabId)) document.getElementById(tabId).style.display = 'block';
  }
}


async function loadJson(url){
  try {
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error(`${url} returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load: " + url, err);
    throw err;
  }
}

async function init(){
  try {
    caseSummaries=await loadJson('./data/cases.json');
    fillFilters();
    bindFilters();
    route();
    addEventListener('hashchange',route);
    
    // Fallback manual render if route fails to call it
    if ($('caseGrid') && $('caseGrid').innerHTML.trim() === '') {
       renderGrid();
    }
  } catch (err) {
    console.error("Init Error:", err);
    throw err;
  }
}


function fillFilters(){
  // Matrix
  const matrixEl = $('matrix');
  ['高伤害 + 高声量 (核心危机)', '低伤害 + 高声量 (舆论风暴)', '高伤害 + 低声量 (隐性流失)', '低伤害 + 低声量 (常规客诉)'].forEach(x => {
    const o=document.createElement('option');o.value=x;o.textContent=x;matrixEl.appendChild(o);
  });
  
  // 声音构成（多选切换芯片）：真实玩家声音 / 外部噪声
  const vnEl = $('voiceNature');
  if (vnEl) {
    const found = uniq(caseSummaries.flatMap(c => (c.mapping && c.mapping.voice_nature) || []));
    const order = ['真实玩家声音','外部噪声'];
    const vals = order.filter(v => found.includes(v)).concat(found.filter(v => !order.includes(v)));
    vnEl.innerHTML = '<span class="vnLabel">声音构成</span>' +
      vals.map(v => `<button type="button" class="vnChip" data-vn="${esc(v)}" onclick="toggleVn(this)">${esc(v)}</button>`).join('');
  }

  // Core Tags grouped（四族 21 标准标签，与 cases.json 核心矛盾完全对齐）
  const tagCategories = {
    '💰 商业化 / 付费': [
       '商业化争议/变现动机质疑',
       '核心付费内容贬值',
       '付费数值不实',
       '付费权益争议',
       '商业契约变更'
    ],
    '⚖️ 数值 / 体验 / 治理': [
       '数值/平衡调整争议',
       '体验质量与预期落差',
       '养成负担争议',
       '版本治理失序',
       '自创玩法管控争议'
    ],
    '🎭 内容与价值观争议': [
       '情感背叛/情怀受损',
       '合规问题',
       '内容尺度争议',
       '性别议题争议',
       '价值观/圈层冲突',
       '产品定位/品类落差'
    ],
    '⚔️ 官方处置 / 运营失当': [
       '选择性回应',
       '暗改',
       '福利回馈落差',
       '补偿错配',
       '内容方向/资源分配争议'
    ]
  };

  const tagEl = $('core_tag');
  tagEl.innerHTML = '<option value="">全部核心矛盾</option>';
  
  const allTags = uniq(caseSummaries.flatMap(c => c.tags || []));
  let placedTags = new Set();

  for (const [groupName, groupTags] of Object.entries(tagCategories)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;
    let added = false;
    groupTags.forEach(t => {
      if (allTags.includes(t)) {
        const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
        placedTags.add(t);
        added = true;
      }
    });
    if (added) tagEl.appendChild(optgroup);
  }

  const orphanTags = allTags.filter(t => !placedTags.has(t));
  if (orphanTags.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '📌 其他标签';
    orphanTags.forEach(t => {
      const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
    });
    tagEl.appendChild(optgroup);
  }

  // 公关应对：六类固定枚举，按诚意/有效性高→低排序
  const prEl = $('pr');
  if (prEl) {
    const prOrder = [
      '光速滑跪+回退',
      '认错+整改方案',
      '被迫补偿+被动合规',
      '敷衍回应+部分调整',
      '仅公示+处置事故',
      '冷处理+沉默装死',
    ];
    const present = new Set(caseSummaries.map(c => c.pr));
    prOrder.forEach(p => {
      if (!present.has(p)) return;
      const o=document.createElement('option');o.value=p;o.textContent=p;prEl.appendChild(o);
    });
    // 兜底：任何不在枚举内的历史值仍可显示，避免漏案
    [...present].filter(p => p && !prOrder.includes(p)).forEach(p => {
      const o=document.createElement('option');o.value=p;o.textContent=p;prEl.appendChild(o);
    });
  }
}

function bindFilters(){
  ['q','matrix','core_tag','pr'].forEach(id=>$(id)&&$(id).addEventListener('input',renderGrid));
}

// 声音构成芯片：点击切换选中（多选），重新筛选
function toggleVn(btn){btn.classList.toggle('active');renderGrid();}

function filtered(){
  const q=$('q')?$('q').value.trim().toLowerCase():'';
  const mx=$('matrix')?$('matrix').value:'';
  const vnEl=$('voiceNature');
  const vnSel=vnEl?[...vnEl.querySelectorAll('.vnChip.active')].map(b=>b.dataset.vn):[];
  const ct=$('core_tag')?$('core_tag').value:'';
  const pr=$('pr')?$('pr').value:'';

  return caseSummaries.filter(c=>{
    const hay=[c.title||'',c.game||'',c.company||'',c.market||'',c.type||'',c.summary||'',c.pr||'',...(c.tags||[])].join(' ').toLowerCase();
    
    if (q && !hay.includes(q)) return false;

    if (mx) {
      const vol = c.volume || '';
      const dmg = c.damage || '';
      const highVol = vol.includes('S') || vol.includes('A');
      const highDmg = dmg.includes('S') || dmg === 'A' || dmg === 'A/S';

      if (mx === '高伤害 + 高声量 (核心危机)' && !(highVol && highDmg)) return false;
      if (mx === '低伤害 + 高声量 (舆论风暴)' && !(highVol && !highDmg)) return false;
      if (mx === '高伤害 + 低声量 (隐性流失)' && !(!highVol && highDmg)) return false;
      if (mx === '低伤害 + 低声量 (常规客诉)' && !(!highVol && !highDmg)) return false;
    }

    if (vnSel.length) {
      const arr = (c.mapping && c.mapping.voice_nature) || [];
      if (!vnSel.some(v => arr.includes(v))) return false;
    }

    if (ct && !(c.tags || []).includes(ct)) return false;

    if (pr && c.pr !== pr) return false;

    return true;
  });
}


function renderStats(){
  const list = filtered();
  const all = caseSummaries || [];
  const yrs = all.map(c => parseInt((c.time||'').slice(0,4))).filter(y => y>0);
  const yMin = yrs.length ? Math.min(...yrs) : '', yMax = yrs.length ? Math.max(...yrs) : '';
  const tenc = all.filter(c => /腾讯/.test(c.company||'')).length;
  const nonTenc = all.length - tenc;
  // 真危机：声量达 S 且伤害达 A 及以上（声量伤害双高）
  const crisis = all.filter(c => /S/.test(c.volume||'') && /[SA]/.test(c.damage||'')).length;
  $('stats').innerHTML =
    `<div class="stat"><b>${yMin}–${yMax}</b><span>覆盖年份</span></div>`+
    `<div class="stat"><b>${list.length}</b><span>当前筛选案例（共 ${all.length}）</span></div>`+
    `<div class="stat"><b>${tenc} / ${nonTenc}</b><span>腾讯系 / 非腾讯</span></div>`+
    `<div class="stat"><b>${crisis}</b><span>真危机 · 声量伤害双高</span></div>`;
}

// 每个案例在散点图中的相对坐标（x: 声量低→高 0-100；y: 伤害低→高 0-100）
// 校准原则：
//   y 轴（伤害）——仅「伤害高(S)」进上区(y>50)，中/低一律下区；档内按严重度微调。
//   x 轴（声量）——按「声量强度实感」（含破圈广度）铺排，而非简单 S/A 档位；
//                 破圈/全网级讨论的案例右推，真正未出圈的小众事件留左侧。
// 结果：黄区（高声量·低/中伤害「舆论风暴」）为最大区块，印证「声量普遍高于实际伤害」。
const MATRIX_POS = {
  // —— 高声量 × 高伤害（核心危机 红）7 例 ——
  'shijiezhiwai-money': { x: 84, y: 86 },
  'diablo4-p11':        { x: 88, y: 81 },
  'apex-bp':            { x: 92, y: 73 },
  'benghuai-rabbit':    { x: 65, y: 88 },
  'fengzhigu-refund':   { x: 71, y: 82 },
  'luoke-s2':           { x: 78, y: 69 }, // A/S，伤害略低于纯 S
  'lianyu-aoyin':       { x: 72, y: 63 }, // 官方永久终止新男主=基本盘受损铁证
  // —— 低声量 × 高伤害（隐性流失 蓝）1 例 ——
  'shediao-bjd':        { x: 40, y: 90 }, // 射雕停运，伤害最高但声量小众、未破圈
  // —— 高声量 × 低/中伤害（舆论风暴 橙）18 例 —— 最大区块 ——
  'yuanshen-longwang':  { x: 80, y: 32 },
  'yuanshen-1year':     { x: 73, y: 22 },
  'genshin-zhongli':    { x: 66, y: 38 },
  'sanjiaozhou-jail':   { x: 84, y: 16 },
  'helldivers2-psn':    { x: 88, y: 37 },
  'mingchao-1.0':       { x: 76, y: 44 }, // 伤害中
  'lianyu-mechanic':    { x: 70, y: 47 }, // 伤害中
  'lianyu-scale':       { x: 62, y: 18 },
  'yanyun-female':      { x: 56, y: 29 },
  'helldivers2-nerf':   { x: 53, y: 47 }, // 伤害中
  'gf2-daiyan':         { x: 59, y: 41 }, // 伤害中
  'reverse1999-3rd':    { x: 62, y: 35 },
  'dnf-pc-harmony':     { x: 72, y: 15 }, // 端游和谐，破圈
  'dnf-mobile-dragon':  { x: 79, y: 8 },  // 起源，声量高、伤害小
  'arknights-collab':   { x: 64, y: 13 },
  'hpmagic-pay':        { x: 55, y: 11 },
  'moer-manor':         { x: 67, y: 9 },
  'wzry-world-demo':    { x: 52, y: 25 },
  // —— 低/中声量 × 低伤害（常规客诉 灰）5 例 —— 未出圈的小众事件 ——
  'codm-cn-launch':     { x: 30, y: 16 },
  'bluearchive-cn':     { x: 34, y: 27 },
  'wzry-s40':           { x: 42, y: 13 },
  'yanyun-jiujian':     { x: 45, y: 33 },
  'oncehuman-season':   { x: 47, y: 43 },
};

function matrixColor(x, y) {
  if (x >= 50 && y >= 50) return 'b-red';   // 核心危机
  if (x < 50 && y >= 50)  return 'b-blue';  // 隐性流失
  if (x >= 50 && y < 50)  return 'b-amber'; // 舆论风暴
  return 'b-gray';                          // 常规客诉
}

function renderMatrixChart() {
  const container = document.getElementById('matrixChartContainer');
  if (!container) return;

  // 始终用全量案例，不受筛选影响
  const all = caseSummaries || [];

  const dots = all.map(c => {
    const pos = MATRIX_POS[c.id] || { x: 50, y: 50 };
    const color = matrixColor(pos.x, pos.y);
    // 默认只显示游戏名；hover 展开完整 title（去掉「游戏名-」前缀的事件描述）
    const parts = (c.title || '').split('-');
    const sub = parts.length > 1 ? parts.slice(1).join('-') : '';
    return `<button type="button" class="sc-dot ${color}" style="left:${pos.x}%; bottom:${pos.y}%;"
        onclick="openCase('${c.id}')"
        title="${esc(c.title)}&#10;声量 ${gradeLevel(c.volume)} / 伤害 ${gradeLevel(c.damage)}">
        <span class="sc-mark"></span>
        <span class="sc-label">
          <span class="sc-name">${esc(c.game || '')}</span>
          ${sub ? `<span class="sc-sub">${esc(sub)}</span>` : ''}
        </span>
      </button>`;
  }).join('');

  container.innerHTML = `
    <div class="matrix-chart-wrap">
      <div class="matrix-y-axis"><span>高<br>伤<br>害</span><span>低<br>伤<br>害</span></div>
      <div class="matrix-content">
        <div class="scatter-plot">
          <div class="sc-quad sc-tl"><span class="sc-qlabel">隐性流失</span></div>
          <div class="sc-quad sc-tr"><span class="sc-qlabel">核心危机</span></div>
          <div class="sc-quad sc-bl"><span class="sc-qlabel">常规客诉</span></div>
          <div class="sc-quad sc-br"><span class="sc-qlabel">舆论风暴</span></div>
          <div class="sc-axis-x"></div>
          <div class="sc-axis-y"></div>
          ${dots}
        </div>
        <div class="matrix-x-axis"><span style="padding-left:20px;">低声量</span><span style="padding-right:20px;">高声量</span></div>
      </div>
    </div>
  `;
}

// === 量化分析仪表盘：5 个图表 ===

// 公关应对环形图
function renderPrDonut() {
  const wrap = document.getElementById('prDonut');
  const legend = document.getElementById('prLegend');
  if (!wrap || !legend) return;
  const all = caseSummaries || [];
  const prColors = {
    '光速滑跪+回退': '#0f6e56',
    '认错+整改方案': '#185fa5',
    '冷处理+沉默装死': '#6e6a62',
    '敷衍回应+部分调整': '#854f0b',
    '被迫补偿+被动合规': '#a32d2d',
    '仅公示+处置事故': '#9c5bbf',
  };
  const counts = {};
  all.forEach(c => { const k = c.pr || '其他'; counts[k] = (counts[k]||0)+1; });
  const total = all.length;
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  let acc = 0;
  const segs = entries.map(([k,n]) => {
    const color = prColors[k] || '#bbb';
    const start = acc/total*100;
    acc += n;
    const end = acc/total*100;
    return {k, n, color, start, end};
  });
  const grad = segs.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');
  wrap.innerHTML = `<div class="donutWrap"><div class="donutChart" style="background:conic-gradient(${grad})"><div class="donutCenter"><b>${total}</b>案例</div></div></div>`;
  legend.innerHTML = entries.map(([k,n]) => {
    const color = prColors[k] || '#bbb';
    return `<div class="donutLegendItem"><span class="dot" style="background:${color}"></span><span>${esc(k)}</span><span class="val">${n} · ${Math.round(n/total*100)}%</span></div>`;
  }).join('');
}

// 时间线分布
function renderTimelineChart() {
  const wrap = document.getElementById('timelineChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  // 按时间排序，解析 YYYY-MM
  const sorted = all.filter(c => c.time).map(c => ({...c, ts: new Date(c.time+'-01')})).sort((a,b)=>a.ts-b.ts);
  if (!sorted.length) { wrap.innerHTML = '<p class="muted">无时间数据</p>'; return; }
  const minT = sorted[0].ts.getTime();
  const maxT = sorted[sorted.length-1].ts.getTime();
  const span = Math.max(1, maxT - minT);
  // 年份刻度
  const years = [...new Set(sorted.map(c => c.time.slice(0,4)))].sort();
  const yearMarks = years.map(y => {
    const t = new Date(y+'-01-01').getTime();
    const pct = (t - minT) / span * 100;
    return `<span style="left:${pct}%">${y}</span>`;
  }).join('');
  // 品类颜色映射
  const genreColors = {'二次元抽卡':'#854f0b','乙女向':'#a32d2d','情怀IP':'#854f0b','竞技射击':'#185fa5','武侠开放世界':'#0f6e56','刷子ARPG':'#6e6a62','买断制':'#9c5bbf','PVE射击':'#185fa5','FPS':'#185fa5','MOBA':'#185fa5','开放世界':'#0f6e56','开放世界生存':'#0f6e56','宠物养成':'#854f0b','放置':'#6e6a62','横版格斗MMO':'#185fa5','大IP衍生':'#854f0b','社交养成':'#854f0b','卡牌RPG':'#854f0b','策略RPG':'#0f6e56','塔防卡牌':'#854f0b','MMORPG':'#0f6e56','二次元RPG':'#854f0b','复古抽卡RPG':'#854f0b','恋爱养成':'#a32d2d'};
  const dots = sorted.map((c, i) => {
    const pct = (c.ts.getTime() - minT) / span * 100;
    const g = (c.genre||[])[0] || '';
    const color = genreColors[g] || '#6e6a62';
    const sub = (c.title||'').split('-').slice(1).join('-') || c.title;
    return `<div class="tlDot" style="left:${pct}%;background:${color}" onclick="openCase('${c.id}')"><div class="tlTooltip">${esc(c.game)} · ${esc(sub.slice(0,20))}</div></div>`;
  }).join('');
  wrap.innerHTML = `<div class="timelineWrap"><div class="timelineAxis">${yearMarks}</div><div class="timelineDots">${dots}</div></div>`;
}

// 象限堆叠条
function renderQuadrantChart() {
  const wrap = document.getElementById('quadrantChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  // 组合：声量(S/A) × 伤害(S/A/B)
  const combos = {};
  all.forEach(c => {
    const v = c.volume || '';
    const d = c.damage || '';
    const vl = /S/.test(v) ? 'S' : 'A';
    let dl = /S/.test(d) ? 'S' : (/A/.test(d) ? 'A' : 'B');
    const key = `声量${vl}+伤害${dl}`;
    combos[key] = (combos[key]||0)+1;
  });
  // 按声量分组，每组堆叠伤害分布
  const groups = [
    {label:'声量 S', filter:k=>k.startsWith('声量S'), color:'#a32d2d'},
    {label:'声量 A', filter:k=>k.startsWith('声量A'), color:'#854f0b'},
  ];
  const damageColors = {'S':'#a32d2d','A':'#854f0b','B':'#0f6e56'};
  const total = all.length;
  wrap.innerHTML = `<div class="quadStack">${groups.map(g => {
    const keys = Object.keys(combos).filter(g.filter);
    const groupTotal = keys.reduce((s,k)=>s+combos[k],0);
    const segs = keys.map(k => {
      const dl = k.split('伤害')[1];
      const n = combos[k];
      const w = groupTotal ? n/groupTotal*100 : 0;
      return `<div class="quadStackSeg" style="width:${w}%;background:${damageColors[dl]}" title="${k}: ${n}"></div>`;
    }).join('');
    return `<div class="quadStackRow"><div class="quadStackLabel">${g.label}</div><div class="quadStackBar">${segs}</div><div class="quadStackVal">${groupTotal}</div></div>`;
  }).join('')}</div>`;
  // 图例
  const legend = `<div style="display:flex;gap:14px;margin-top:14px;font-size:12px;color:var(--muted)"><span><span style="display:inline-block;width:10px;height:10px;background:#a32d2d;border-radius:2px;margin-right:4px"></span>伤害 S</span><span><span style="display:inline-block;width:10px;height:10px;background:#854f0b;border-radius:2px;margin-right:4px"></span>伤害 A</span><span><span style="display:inline-block;width:10px;height:10px;background:#0f6e56;border-radius:2px;margin-right:4px"></span>伤害 B</span></div>`;
  wrap.innerHTML += legend;
}

// 通用水平条形图
function renderBarChart(containerId, counter, maxColors) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const entries = Object.entries(counter).sort((a,b)=>b[1]-a[1]).slice(0, 10);
  const max = Math.max(...entries.map(e=>e[1]));
  wrap.innerHTML = entries.map(([k,n], i) => {
    const w = max ? n/max*100 : 0;
    const color = maxColors[i % maxColors.length];
    return `<div><span class="mapBarLabel">${esc(k)}</span><div class="mapBar"><div class="mapBarTrack"><div class="mapBarFill" style="width:${w}%;background:${color}"></div></div><span class="mapBarVal">${n}</span></div></div>`;
  }).join('');
}

// 品类分布条形图
function renderGenreChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => (c.genre||[]).forEach(g => counter[g] = (counter[g]||0)+1));
  renderBarChart('genreChart', counter, ['#854f0b','#185fa5','#a32d2d','#0f6e56','#6e6a62','#9c5bbf','#b5651d','#4a7c8c']);
}

// 核心矛盾聚类条形图
function renderTagsChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => (c.tags||[]).forEach(t => counter[t] = (counter[t]||0)+1));
  renderBarChart('tagsChart', counter, ['#a32d2d','#854f0b','#185fa5','#0f6e56','#6e6a62','#9c5bbf']);
}

function renderGrid(){
  renderStats();
  renderMatrixChart();
  renderPrDonut();
  renderTimelineChart();
  renderTagsChart();
  const list=filtered();
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  $('caseGrid').innerHTML=list.map(c=>`<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${c.title}</div><div class="game">${c.game} / ${c.company}${(c.genre||[]).length?' / '+(c.genre||[]).join(' · '):''}</div></div><div class="caseBadges"><span class="badge ${levelClass(c.volume)}" title="声量等级">声量 ${gradeLevel(c.volume)}</span><span class="badge ${levelClass(c.damage)}" title="伤害等级">伤害 ${gradeLevel(c.damage)}</span></div></div><div class="desc">${c.summary}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip chip-conflict">${t}</span>`).join('')}${c.pr?`<span class="chip chip-pr">${c.pr}</span>`:''}</div><div class="foot"><span>${c.market}</span><span>${c.time}</span></div></article>`).join('');
}

function openCase(id){location.hash=`case=${id}`;}
function goHome(){
  location.hash='';
  switchMainTab('overview');
}

async function route(){
  const id=(location.hash.match(/case=([^&]+)/)||[])[1];
  if(id){
    const summary=caseSummaries.find(c=>c.id===id)||caseSummaries[0];
    const rawCase=await loadJson(summary.caseFile);
    
    // Lift data up if present
    currentCase = rawCase.data ? { ...summary, ...rawCase.data } : { ...summary, ...rawCase };
    
    $('dashboard').style.display='none';
    if($('overview')) $('overview').style.display='none';
    if($('mapping')) $('mapping').style.display='none';
    if($('conclusions')) $('conclusions').style.display='none';
    $('detail').style.display='block';
    
    document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
    
    renderDetail(currentCase);
    scrollTo(0,0);
  }else{
    switchMainTab('overview');
    renderGrid();
  }
}

function renderDetail(c){
  const conflictTags=(c.tags||[]).map(t=>`<span class="metaTag mt-conflict">${esc(t)}</span>`).join('');
  const prTag=c.pr?`<span class="metaTag mt-pr">${esc(c.pr)}</span>`:'';
  const volStr=gradeLevel(c.volume)+(c.volumeScope?' · '+c.volumeScope:'');
  $('detailHero').innerHTML=`<div class="sub">${c.game} / ${c.company}</div><h2>${c.title}</h2><div class="meta"><span>${c.time}</span><span>${c.market}</span>${conflictTags}${prTag}<span>声量 <strong style="color:var(--red);">${esc(volStr)}</strong></span><span>伤害 <strong style="color:var(--red);">${gradeLevel(c.damage)}</strong></span></div>`;
  // V1 深挖案例（有 recap / cause / official 数据）→ 五标签结构；其余 V2 案例 → 原三标签
  const isV1 = !!(c.recap || c.cause || c.official);
  const tabs = isV1 ? [
    ['timeline','T-Window 时间线'],
    ['players','核心矛盾与玩家痛点'],
    ['official','官方动作复盘'],
    ['impact','影响量化'],
    ['lesson','案例启发']
  ] : [
    ['timeline','T-Window 时间线'],
    ['players','核心矛盾与玩家痛点'],
    ['insight','官方动作复盘与应对启发']
  ];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" id="tabbtn-${x[0]}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i===0?'active':''}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const btn=$(`tabbtn-${id}`); if(btn) btn.classList.add('active');
  const p=$(`tab-${id}`); if(p) p.classList.add('active');
}

function renderTab(c,id){
  if(id==='timeline'){
    if(c.recap) return renderRecapV1(c.recap);
    const timeline = c.timeline || [];
    return `<div class="block"><h3>时间线还原 (官方 vs 玩家动作)</h3><div class="timeline">${timeline.map(e=>`<div class="event ${e.side||'player'}"><div class="time"><span class="side" style="margin-right:8px; font-weight:bold; color:${e.side==='official'?'var(--red)':'var(--blue)'}">${e.side==='official'?'官方动作':'玩家动作'}</span>${e.date||''}</div><div class="name">${e.event}</div><div class="impact" style="margin-top:8px;">${e.description||''}</div></div>`).join('')}</div></div>`;
  }
  if(id==='players') return renderPlayerJourney(c);
  if(id==='official') return `<div class="v1deep">${renderOfficialV1(c)}</div>`;
  if(id==='impact') return `<div class="v1deep">${renderImpactV1(c)}</div>`;
  if(id==='lesson') return `<div class="v1deep">${renderInsightV1(c)}</div>`;
  if(id==='insight') return renderInsight(c);
  return '';
}

/* V1 事件复盘（背景 + 官方/玩家双线分段时间线 + 标签 + 来源链接），原样移植，作用域 .v1recap */
function renderRecapV1(r){
  r=r||{};const tl=r.timeline||[];
  let lastSeg=null;
  const rows=tl.map(e=>{
    let band='';
    if(e.segment&&e.segment!==lastSeg){band=`<div class="tlBand"><span>${esc(e.segment)}</span></div>`;lastSeg=e.segment;}
    return `${band}<div class="event ${e.side}"><div class="time"><span class="side">${e.side==='official'?'官方':'玩家'}</span>${esc(e.phase)} / ${esc(e.time)}</div>${e.name?`<div class="name">${esc(e.name)}</div>`:''}<div class="eventText">${esc(e.event)}</div>${e.impact?`<div class="impact">影响：${esc(e.impact)}</div>`:''}${(e.tags&&e.tags.length)?`<div class="evTags">${e.tags.map(t=>`<span class="evTag">${esc(t)}</span>`).join('')}</div>`:''}${e.links&&e.links.length?`<div class="eventLinks"><span>来源</span>${e.links.map(l=>`<a target="_blank" rel="noopener" href="${esc(l.url)}">${esc(l.label)}</a>`).join('')}</div>`:''}</div>`;
  }).join('');
  const seg=tl.some(e=>e.segment);
  return `<div class="v1recap">${r.background?`<div class="block goldBox"><h3>事件背景</h3><p>${esc(r.background)}</p></div>`:''}<div class="block"><h3>时间线（官方 / 玩家双线，T-window 记法）</h3><div class="timeline${seg?' timelineSeg':''}">${rows}</div></div></div>`;
}

/* V1 原因追溯（迁移并按要求重构）：核心矛盾卡片 + 玩家心路历程 + 玩家认知特征，作用域 .v1cause */
function renderCauseV1(c){
  const ca=c.cause||{};
  const stages=ca.journey||[];
  const trend=stages.length?renderEmotionTrend(stages):'';
  const cn=['一','二','三','四','五','六','七','八'];
  const stageNo=(s,i)=>esc(s.stageNo||cn[i]||(i+1));

  // a) 核心矛盾（替代催化剂）：卡片，上标题 + 下解释；标题为统一名词短语，供后续筛选标签复用
  const conflicts=(ca.coreConflicts||[]).map(x=>`<article class="ccCard"><b class="ccTitle">${esc(x.title)}</b><p class="ccDesc">${esc(x.desc)}</p></article>`).join('');
  const conflictBlock=conflicts?`<div class="block ccBlock"><h3>核心矛盾</h3><p class="muted">本案触发玩家强烈反应的几条核心矛盾（不含外部时机与后续处置失误）。标题采用统一命名，后续将作为跨案例筛选标签。</p><div class="ccGrid">${conflicts}</div></div>`:'';

  // b) 玩家心路历程（保留 V1 内容不变）
  const stageBody=s=>{
    const head=s.summary?`<div class="storyPoint">${esc(s.summary)}</div>`:'';
    if((s.econ||[]).length){
      return `${head}<div class="econGrid">${s.econ.map(x=>`<article><b>${esc(x.title)}</b><p>${esc(x.text)}</p></article>`).join('')}</div>${s.nature?`<p><b>舆情性质：</b>${esc(s.nature)}</p>`:''}${s.platform?`<p><b>平台放大：</b>${esc(s.platform)}</p>`:''}`;
    }
    return `${head}${s.psychology?`<p><b>玩家怎么想：</b>${esc(s.psychology)}</p>`:''}${s.playerDemand?`<p><b>玩家要什么：</b>${esc(s.playerDemand)}</p>`:''}${s.trigger?`<p><b>触发因素：</b>${esc(s.trigger)}</p>`:''}${(s.evidence||[]).length?`<div class="storyEvidence"><h5>玩家原话摘录</h5>${s.evidence.map(renderEvidenceCard).join('')}</div>`:''}`;
  };
  const cards=stages.map((s,i)=>`<details class="jStage${s.stageNo==='0'?' jStage0':''}" id="jstage-${i}" name="jacc"${i===0?' open':''}><summary><span class="jBadge">阶段${stageNo(s,i)}</span><span class="jHead"><span class="jStageName">${esc(s.title||s.label)}</span><span class="jMeta">${esc(s.time)}｜${esc(s.emotion)}</span></span></summary><div class="jBody">${stageBody(s)}</div></details>`).join('');
  const journeyBlock=`<div class="block"><h3>玩家心路历程</h3><p class="muted">阶段0 是事件前的经济存量底色（决定爆发烈度），阶段一起为本次事件的情绪演变。情绪强度趋势为骨架；点击趋势图上的节点，可展开对应阶段的详情卡片。</p>${trend}<div class="jSpine">${cards}</div></div>`;

  // d) 玩家认知特征：该类型玩家的共性 / 特定矛盾（供跨案例归纳）
  const tBadge=t=>t?`<span class="ctType ct-${t==='稳态'?'stable':(t==='新出现'?'new':'up')}">${esc(t)}</span>`:'';
  const traits=(ca.cognitionTraits||[]).map(x=>`<article class="ctCard"><div class="ctHead"><b>${esc(x.trait)}</b>${tBadge(x.type)}</div><p>${esc(x.text)}</p></article>`).join('');
  const genreLine=(c.genre||[]).length?`<div class="ctGenre"><span class="ctGenreLabel">游戏类型</span>${(c.genre||[]).map((g,i)=>`<span class="genreTag ${i===0?'gPrim':'gSub'}">${esc(g)}</span>`).join('')}</div>`:'';
  // 玩家认知特征已移至「案例启发」页的「这类游戏的玩家特征」
  void traits;void genreLine;

  return conflictBlock+journeyBlock;
}

function renderTopic(t){
  const chain=(t.chain||[]).map((x,i)=>`<article><b>${i+1}. ${esc(x.name)}</b><p>${esc(x.text)}</p></article>`).join('');
  const ev=(t.evidence||[]).length?`<div class="topicEvidenceHead">关键证据</div><div class="topicEvidence">${t.evidence.map(renderEvidenceCard).join('')}</div>`:'';
  return `<div class="block topicModule">${t.eyebrow?`<span class="moduleEyebrow">${esc(t.eyebrow)}</span>`:''}${t.title?`<h4 class="topicTitle">${esc(t.title)}</h4>`:''}${t.lead?`<p class="topicLead">${esc(t.lead)}</p>`:''}${chain?`<div class="topicChain">${chain}</div>`:''}${t.takeaway?`<div class="topicTakeaway">${esc(t.takeaway)}</div>`:''}${ev}</div>`;
}

function renderEmotionTrend(stages){
  const W=900,H=340,padL=66,padR=28,padT=30,padB=86;
  const iw=W-padL-padR,ih=H-padT-padB,n=stages.length;
  const cn=['一','二','三','四','五','六','七','八'];
  const sno=(s,i)=>esc(s.stageNo||cn[i]||(i+1));
  const sd=t=>(t||'').replace('2025-','').split(/[ /至]/)[0];
  const x=i=>padL+(n===1?iw/2:iw*i/(n-1));
  const y=v=>padT+ih-(Math.max(0,Math.min(100,v))/100)*ih;
  const pts=stages.map((s,i)=>`${x(i)},${y(s.emotionScore||0)}`).join(' ');
  const area=`${padL},${padT+ih} ${pts} ${padL+iw},${padT+ih}`;
  const grid=[0,25,50,75,100];
  return `<div class="trendWrap"><svg class="emoTrend" viewBox="0 0 ${W} ${H}" role="img" aria-label="玩家情感强度趋势"><defs><linearGradient id="emoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a32d2d" stop-opacity="0.18"/><stop offset="1" stop-color="#a32d2d" stop-opacity="0.02"/></linearGradient></defs>${grid.map(g=>`<line x1="${padL}" y1="${y(g)}" x2="${padL+iw}" y2="${y(g)}" class="tGrid"/><text x="${padL-12}" y="${y(g)+4}" class="tAxis" text-anchor="end">${g}</text>`).join('')}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+ih}" class="tAxisLine"/><line x1="${padL}" y1="${padT+ih}" x2="${padL+iw}" y2="${padT+ih}" class="tAxisLine"/><text x="22" y="${padT+ih/2}" class="tAxisTitle" transform="rotate(-90 22 ${padT+ih/2})">玩家情感强度</text><polygon points="${area}" fill="url(#emoArea)"/><polyline points="${pts}" class="tLine" fill="none"/>${stages.map((s,i)=>{const sc=s.emotionScore||0;const cy=y(sc);const ly=sc>=75?cy+28:cy-26;return `<g class="tPoint" onclick="openStage(${i})"><line x1="${x(i)}" y1="${cy}" x2="${x(i)}" y2="${padT+ih}" class="tGuide"/><circle cx="${x(i)}" cy="${cy}" r="7"/><text x="${x(i)}" y="${cy-13}" class="tScore" text-anchor="middle">${esc(sc)}</text><text x="${x(i)}" y="${ly}" class="tCallout" text-anchor="middle">${esc(s.label)}</text><text x="${x(i)}" y="${padT+ih+26}" class="tStageNo" text-anchor="middle">阶段${sno(s,i)}</text><text x="${x(i)}" y="${padT+ih+45}" class="tDate" text-anchor="middle">${esc(s.chartDate||sd(s.time))}</text></g>`;}).join('')}</svg><div class="tHint">点击趋势图节点展开对应阶段（每次只展开一个）↓</div></div>`;
}

function openStage(i){
  document.querySelectorAll('.jStage').forEach(d=>{d.open=(d.id==='jstage-'+i);});
  const wrap=document.querySelector('.v1cause .trendWrap');
  if(wrap) wrap.scrollIntoView({behavior:'smooth',block:'start'});
  const el=document.getElementById('jstage-'+i);
  if(el){el.classList.add('jFlash');setTimeout(()=>el.classList.remove('jFlash'),1400);}
}

function renderEvidenceCard(e){
  const identity=e.playerId||'公开评论用户';
  const meta=[e.platform,e.time,e.sourceType].filter(Boolean).join('｜');
  const inner=`<div class="commentShotTop"><span class="avatar">${esc((e.platform||'评').slice(0,1))}</span><div><b>${esc(identity)}</b><small>${esc(meta)}</small></div></div><div class="commentShotText">${esc(e.text)}</div>${e.note?`<div class="commentShotMeta">${esc(e.note)}</div>`:''}<div class="commentShotFoot"><span>${esc(e.heat||'热度待补')}</span>${e.url?`<span class="srcLink">点击查看来源 ↗</span>`:''}</div>`;
  return e.url?`<a class="commentShot" target="_blank" rel="noopener" href="${esc(e.url)}">${inner}</a>`:`<div class="commentShot noLink">${inner}</div>`;
}

/* 官方动作复盘（迁移 V1）：仅 V1 官方处置时间线 + 官方动作借鉴点 / 雷点（绿红两框，卡片式） */
function renderOfficialV1(c){
  const d=c.official||{};
  const qClass={good:'q-good',bad:'q-bad',neutral:'q-neutral'};
  const cards=(d.stages||[]).map((s,i)=>{
    const q=qClass[s.quality]||qClass.neutral;
    const elems=(s.elements||[]).length?`<span class="oElems">${s.elements.map(e=>`<span class="oElem">${esc(e)}</span>`).join('')}</span>`:'';
    return `<details class="oCard ${q}" id="ocard-${i}" name="oacc"${i===0?' open':''}><summary><span class="oDot"></span><span class="oHead"><span class="oName"><span class="oKind">${esc(s.kind)}</span>${esc(s.name)}</span><span class="oMeta">${esc(s.time)}｜${esc(s.source)}${s.qualityLabel?`　<b class="oQuality">${esc(s.qualityLabel)}</b>`:''}</span></span>${elems}</summary><div class="oBody">${((s.officialExcerpt||[]).length||s.sourceUrl)?`<div class="officialQuoteBlock"><b>官方原文 / 要点摘录</b>${(s.officialExcerpt||[]).map(x=>`<p>${esc(x)}</p>`).join('')}${s.sourceUrl?`<a class="srcLink quoteSrc" target="_blank" rel="noopener" href="${esc(s.sourceUrl)}">查看来源 ↗</a>`:''}</div>`:''}<div class="officialValueGrid"><section><h5>有价值的部分</h5><ul>${(s.valuable||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section><h5>低价值 / 未回答的部分</h5><ul>${(s.lowValue||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section></div><div class="officialEffect"><b>实际效果：</b>${esc(s.effect)}</div></div></details>`;
  }).join('');
  const timeline=`<div class="block"><h3>官方处置时间线</h3><p class="muted">每张卡片为一次官方动作，点击展开详情。色条表示该动作对舆情的实际作用——<span class="qLegend q-bad">红＝激化 / 失分</span><span class="qLegend q-good">绿＝有效缓解</span><span class="qLegend q-neutral">灰＝作用有限</span>。</p><div class="oSpine">${cards}</div></div>`;

  const pcCard=x=>`<article class="pcCard"><span class="pcTag">${esc(x.tag)}</span><p>${esc(x.text)}</p></article>`;
  // 兼容旧的扁平数组与新的分组结构 [{group,sub,items:[]}]
  const pcGroups=arr=>{
    arr=arr||[];
    if(arr.length&&arr[0]&&arr[0].items) return arr.map(g=>`<div class="pcGroup"><div class="pcGroupHead"><span class="pcGroupName">${esc(g.group)}</span>${g.sub?`<span class="pcGroupSub">${esc(g.sub)}</span>`:''}</div><div class="pcCards">${(g.items||[]).map(pcCard).join('')}</div></div>`).join('');
    return `<div class="pcCards">${arr.map(pcCard).join('')}</div>`;
  };
  const pros=d.pros||[],cons=d.cons||[];
  const prosCons=(pros.length||cons.length)?`<div class="block"><h3>官方动作借鉴点与雷点</h3><p class="muted">把本案官方动作拆成“可借鉴 / 要避免”两侧并分类，供跨案例沉淀 PR 经验。</p><div class="pcRow"><section class="pcBox pros"><h4 class="pcHead">👍 借鉴点 · 可复用的动作</h4>${pcGroups(pros)}</section><section class="pcBox cons"><h4 class="pcHead">👎 雷点 · 要避免的动作</h4>${pcGroups(cons)}</section></div></div>`:'';

  return timeline+prosCons;
}

/* 影响量化：① 结论(作标题) → ② 影响量化评估(三卡 声量/数据/补偿 + 可切换面板) → ③ 其他影响。四象限已移到「案例启发」 */
function renderImpactV1(c){
  const q=c.impact||{};const quad=q.quadrant||{};
  const verdict=(label,t)=>t?`<div class="verdict"><span class="verdictLabel">${esc(label)}</span><span class="verdictText">${esc(t)}</span></div>`:'';
  const strip=t=>esc((t||'').replace(/^[^：]*：/,''));
  const ct=q.cardTags||{};
  const ds=q.dataSection||{};const dmg=ds.damage||{};
  const comp=q.compensation||{};
  const ratePill=(label,grade,tone)=>grade?`<span class="ratePill"><span class="rateLabel">${esc(label)}</span><b class="rateGrade g-${esc(tone||'hot')}">${esc(grade)}</b></span>`:'';

  // ① 结论
  const volTone=(ct.vol&&ct.vol.tone)||'hot';
  const conclBlock=q.headline?`<div class="block conclBlock"><h2 class="conclTitle">${esc(q.headline)}</h2>${q.valueConclusion?`<p class="conclBody">${esc(q.valueConclusion)}</p>`:''}</div>`:'';

  // ② 三面板：声量(指标+抗议行动) / 数据(结论+图) / 补偿(明细)
  const metrics=(q.volumeMetrics||[]).map(m=>`<article><b>${esc(m.value)}</b><span>${esc(m.label)}</span><p>${esc(m.note)}</p></article>`).join('');
  const ea=q.emotionAction||{};
  const phases=(ea.phases||[]).map(p=>`<article class="eaCard tone-${esc(p.tone||'')}"><div class="eaHead"><span class="eaPhase">${esc(p.phase)}</span><b>${esc(p.name)}</b></div><ul>${(p.actions||p.quotes||[]).map(qt=>`<li>${esc(qt)}</li>`).join('')}</ul></article>`).join('');
  const eaInner=(ea.phases||[]).length?`${ea.summary?`<p class="muted eaSummary">${esc(ea.summary)}</p>`:''}<div class="eaGrid">${phases}</div>${ea.note?`<p class="muted eaNote">${esc(ea.note)}</p>`:''}${ea.caution?`<div class="notice">${esc(ea.caution)}</div>`:''}`:'';
  const volPane=`${verdict('声量',q.volumeVerdict)}<div class="volHead"><span class="volLevel">声量 ${esc(gradeLevel(q.volumeLevel))}</span><span class="volConf">置信度：${esc(q.volumeConfidence)}</span></div><div class="impactMetricGrid">${metrics}</div>`;

  const charts=(ds.charts||[]).map(ch=>renderBarTrend(ch,ds)).join('');
  const dmgRow=dmg.grade?`<div class="dmgRow">${ratePill('伤害评级',gradeLevel(dmg.grade),dmg.tone)}${dmg.note?`<span class="dmgNote">${esc(dmg.note)}</span>`:''}</div>`:'';
  const whyHtml=(ds.whyParts&&ds.whyParts.length)
    ? `<div class="dataWhyBox">${ds.whyParts.map(p=>`<p class="dataWhy"><b>${esc(p.label)}：</b>${esc(p.text)}</p>`).join('')}</div>`
    : (ds.why?`<p class="dataWhy">${esc(ds.why)}</p>`:'');
  const dataPane=charts?`${verdict('数据结论',ds.verdict)}${dmgRow}${whyHtml}<div class="dataCharts">${charts}</div>${ds.caption?`<p class="muted dataCaption">${esc(ds.caption)}</p>`:''}`:'<p class="muted">暂无脱敏数据。</p>';

  const compNote=comp.valueNote?`<p class="muted dataCaption">估算依据：${esc(comp.valueNote)}（按游戏内正常购买价粗估，仅供横向对比）</p>`:'';
  const compHead=`<div class="verdict compVerdict"><span class="verdictLabel">补偿力度</span><span class="verdictText">${esc(comp.strength)}</span>${comp.value?ratePill('估算市值',comp.value,comp.tone):''}</div>`;
  const compPane=comp.text?`${compHead}<p class="dataWhy">${esc(comp.text)}</p>${compNote}`:'<p class="muted">暂无补偿信息。</p>';

  // 三张卡
  const cardTag=k=>{const t=ct[k];return t&&t.tag?`<span class="cardTag t-${esc(t.tone||'warn')}">${esc(t.tag)}</span>`:'';};
  const toneCls=k=>{const t=ct[k];return t&&t.tone?' tone-'+esc(t.tone):'';};
  const compTag=comp.tag?`<span class="cardTag t-${esc(comp.tone||'warn')}">${esc(comp.tag)}</span>`:'';
  const cardOf=(key,label,akCls,sub,bodyHtml,tagHtml,footHtml)=>`<div class="axisCard assessCard${key==='vol'?' active':''}${key==='comp'?' tone-'+esc(comp.tone||'warn'):toneCls(key)}" data-imp="${key}" role="button" tabindex="0" onclick="showImpPanel('${key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showImpPanel('${key}')}"><div class="axisHead"><span class="axisKey ${akCls}">${label}</span><span class="axisSub">${sub}</span>${tagHtml}</div><p>${bodyHtml}</p>${footHtml}</div>`;
  const assessCards=`<div class="axisRow assessCards">`
    +cardOf('vol','声量','akVol','大不大',strip(quad.axis1),cardTag('vol'),q.volumeLevel?`<div class="cardFoot">${ratePill('声量',gradeLevel(q.volumeLevel),volTone)}</div>`:'')
    +cardOf('data','数据','akData','动没动',strip(quad.axis3),cardTag('data'),dmg.grade?`<div class="cardFoot">${ratePill('伤害',gradeLevel(dmg.grade),dmg.tone)}</div>`:'')
    +cardOf('comp','补偿','akComp','力度大不大',esc(comp.summary||''),compTag,(comp.strength||comp.value)?`<div class="cardFoot">${ratePill('力度',comp.strength,comp.tone)}${comp.value?ratePill('估值',comp.value,comp.tone):''}</div>`:'')
    +`</div>`;

  const assessBlock=`<div class="block assessBlock"><div class="assessHead"><h3>影响量化评估</h3></div>${assessCards}<div class="assessPanel"><div class="impPane" data-pane="vol">${volPane}</div><div class="impPane" data-pane="data" hidden>${dataPane}</div><div class="impPane" data-pane="comp" hidden>${compPane}</div></div></div>`;

  // ③ 其他影响（去掉商业数据 + 补偿/止血成本）
  const pi=(q.productImpact||[]).filter(x=>!/商业数据|止血成本|补偿/.test(x.name||''));
  const otherBlock=pi.length?`<div class="block"><h3>其他影响</h3><div class="damageGrid">${pi.map(x=>`<article><div><b>${esc(x.name)}</b>${x.level?`<span>${esc(x.level)}</span>`:''}</div><p>${esc(x.text)}</p></article>`).join('')}</div></div>`:'';

  return `${conclBlock}${assessBlock}${otherBlock}`;
}

/* 影响量化评估：点卡片 → 面板原地切换到该维度详情（声量/数据/补偿） */
function showImpPanel(which){
  document.querySelectorAll('.assessPanel .impPane').forEach(p=>{p.hidden=(p.dataset.pane!==which);});
  document.querySelectorAll('.assessCard').forEach(b=>b.classList.toggle('active',b.dataset.imp===which));
}

/* 脱敏趋势柱状图（SVG）：常规柱浅蓝、赛季节点(season)深蓝、事件节点(event)红；节点顶部带名称+日期引导线；底部 x 轴起止周 */
function renderBarTrend(ch,ds){
  ch=ch||{};ds=ds||{};
  const vals=(ch.values||[]).map(v=>Math.max(0,Math.min(100,Number(v)||0)));
  const n=vals.length; if(!n) return '';
  const markers=ds.markers||[];
  const kindOf={}; markers.forEach(m=>{kindOf[m.idx]=m.kind||'event';});
  const W=900,H=236,padL=16,padR=16,padT=48,padB=34;
  const iw=W-padL-padR,ih=H-padT-padB;
  const slot=iw/n, bw=Math.min(slot*0.6,34);
  const cx=i=>padL+slot*i+slot/2;
  const y=v=>padT+ih-(v/100)*ih;
  const baseY=padT+ih;
  const grid=[25,50,75,100].map(g=>`<line x1="${padL}" y1="${y(g).toFixed(1)}" x2="${padL+iw}" y2="${y(g).toFixed(1)}" class="btGrid"/>`).join('');
  const beOf={}; (ds.barEvents||[]).forEach(b=>{beOf[b.idx]={date:b.date,label:b.label};});
  const tipOf=i=>beOf[i]?`<title>${esc(beOf[i].date)} · ${esc(beOf[i].label)}</title>`:'';
  const bars=vals.map((v,i)=>{
    const k=kindOf[i];
    const cls='btBar'+(k==='event'?' btEv':(k==='season'?' btSeason':''));
    return `<rect class="${cls}" x="${(cx(i)-bw/2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(baseY-y(v)).toFixed(1)}" rx="3">${tipOf(i)}</rect>`;
  }).join('');
  const dots=vals.map((v,i)=>beOf[i]?`<circle class="btDot" cx="${cx(i).toFixed(1)}" cy="${(y(v)-7).toFixed(1)}" r="3.5">${tipOf(i)}</circle>`:'').join('');
  const mk=markers.map(m=>{
    const X=cx(m.idx).toFixed(1);
    const cls=m.kind==='event'?'mkEvent':'mkSeason';
    const anchor=m.idx<=0?'start':(m.idx>=n-1?'end':'middle');
    const lx=m.idx<=0?padL:(m.idx>=n-1?padL+iw:X);
    return `<line x1="${X}" y1="${padT-2}" x2="${X}" y2="${baseY}" class="btMkLine ${cls}"/><text x="${lx}" y="${padT-16}" class="btMkLabel ${cls}" text-anchor="${anchor}">${esc(m.label)} · ${esc(m.date)}</text>`;
  }).join('');
  // 横坐标：优先按月标（monthTicks），否则回退起止周
  let axisLbls;
  if((ds.monthTicks||[]).length){
    axisLbls=ds.monthTicks.map(t=>{
      const anchor=t.idx<=0?'start':(t.idx>=n-1?'end':'middle');
      const lx=t.idx<=0?padL:(t.idx>=n-1?padL+iw:cx(t.idx).toFixed(1));
      return `<text x="${lx}" y="${H-9}" class="btAxis" text-anchor="${anchor}">${esc(t.label)}</text>`;
    }).join('');
  }else{
    axisLbls=`<text x="${padL}" y="${H-9}" class="btAxis" text-anchor="start">${esc(ds.rangeStart)}</text><text x="${padL+iw}" y="${H-9}" class="btAxis" text-anchor="end">${esc(ds.rangeEnd)}</text>`;
  }
  return `<div class="barTrend"><div class="btHead"><span class="btTitle">${esc(ch.metric)}</span></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(ch.metric)}脱敏趋势">${grid}<line x1="${padL}" y1="${baseY}" x2="${padL+iw}" y2="${baseY}" class="btAxisLine"/>${bars}${dots}${mk}${axisLbls}</svg></div>`;
}

/* 案例启发：① 案例定型(四要素 + 四象限定性) → ② 这类游戏的玩家特征(认知特征) → ③ 关键启发 */
function renderInsightV1(c){
  const n=c.insight||{};const q=c.impact||{};const quad=q.quadrant||{};const ca=c.cause||{};

  // ① 案例定型：大字判定 + 小字归因解释 + 四象限
  const pf=n.profile||{};
  const pfHeadline=pf.headline?`<p class="pfVerdict lb-${esc(quad.resultCell||'noise')}">${esc(pf.headline)}</p>`:'';
  const profileSummary=pf.summary?`<p class="pfSummary">${esc(pf.summary)}</p>`:'';
  const cellFn=(key,name,desc)=>{const on=quad.resultCell===key;return `<div class="qmCell${on?' qmActive qm-'+key:''}"><b>${name}</b>${desc?`<small>${esc(desc)}</small>`:''}${on?'<span class="qmHere">← 本案落点</span>':''}</div>`;};
  const matrix=quad.resultCell?`<div class="quadMatrix"><div class="qmCorner">声量 ↓ ／ 数据 →</div><div class="qmColHead">数据动了</div><div class="qmColHead">数据没动</div><div class="qmRowHead">声量来自<br>承重墙</div>${cellFn('crisis','真危机','')}${cellFn('deficit','信任赤字累积','延迟爆发')}<div class="qmRowHead">声量来自<br>非承重墙</div>${cellFn('silent','沉默流失','最易误判')}${cellFn('noise','真噪声','')}</div>`:'';
  const profileBlock=(pfHeadline||profileSummary||matrix)?`<div class="block ctBlock"><h3>案例定型</h3>${pfHeadline}${profileSummary}${matrix}</div>`:'';

  // ② 这类游戏的玩家特征（从核心矛盾页迁来）
  const tBadge=t=>t?`<span class="ctType ct-${t==='稳态'?'stable':(t==='新出现'?'new':'up')}">${esc(t)}</span>`:'';
  const traits=(ca.cognitionTraits||[]).map(x=>`<article class="ctCard"><div class="ctHead"><b>${esc(x.trait)}</b>${tBadge(x.type)}</div><p>${esc(x.text)}</p></article>`).join('');
  const genreLine=(c.genre||[]).length?`<div class="ctGenre"><span class="ctGenreLabel">游戏类型</span>${(c.genre||[]).map((g,i)=>`<span class="genreTag ${i===0?'gPrim':'gSub'}">${esc(g)}</span>`).join('')}</div>`:'';
  const cognitionBlock=(ca.cognitionLead||traits)?`<div class="block ctBlock"><div class="ctHeadRow"><h3>这类游戏的玩家特征</h3>${genreLine}</div>${ca.cognitionLead?`<p class="ctLead">${esc(ca.cognitionLead)}</p>`:''}<p class="muted">本次舆论事件中，该类型游戏玩家体现出的认知特征（不刻意区分玩家共性还是品类独有；徽章标注该特征属新出现 / 新强化 / 稳态）。后续将汇总多案例横向归纳。</p>${traits?`<div class="ctGrid">${traits}</div>`:''}</div>`:'';

  // ③ 关键启发
  const ki=(n.keyInsights||[]).map(x=>`<article class="ccCard"><b class="ccTitle">${esc(x.title)}</b>${x.text?`<p class="ccDesc">${esc(x.text)}</p>`:''}</article>`).join('');
  const kiBlock=ki?`<div class="block ccBlock"><h3>关键启发</h3><div class="ccGrid">${ki}</div></div>`:(n.coreInsight?`<div class="block goldBox"><h3>核心启发</h3><p class="coreInsight">${esc(n.coreInsight)}</p></div>`:'');

  return profileBlock+cognitionBlock+kiBlock;
}

function renderPlayerJourney(c){
  // 仅保留：核心矛盾 + 玩家心路历程 + 玩家认知特征（已删除 V2 原始内容）
  if(c.cause) return `<div class="v1cause v1causeTop">${renderCauseV1(c)}</div>`;
  return `<div class="analysisBox fullWidth"><p class="muted">本案暂无原因追溯数据。</p></div>`;
}

function renderInsight(c){
  if(c.analysis && c.analysis.takeaways) {
     const oa = c.analysis.official_action || {};
     const takeaways = c.analysis.takeaways || [];
     
     let officialHtml = '';
     if(oa.stages && oa.stages.length > 0) {
        officialHtml = `<div style="margin-bottom: 32px;">
          <h3 style="margin-bottom: 16px;">实际官方是怎么做的与深度评价</h3>
          <div style="background:var(--soft); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px;">
            <b style="color:var(--text); font-size:15px;">📌 总体定性：</b>
            <span style="font-size:14px;">${oa.judgement || ''}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${oa.stages.map(s => `
              <article style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; box-shadow:var(--shadow);">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                  <h5 style="margin:0; font-size:16px; color:var(--text);">${s.action}</h5>
                  <span style="font-size:12px; font-weight:bold; padding:4px 10px; border-radius:6px; background:${s.result.includes('成功')||s.result.includes('✅')?'var(--greenBg)':'var(--redBg)'}; color:${s.result.includes('成功')||s.result.includes('✅')?'var(--green)':'var(--red)'};">${s.result}</span>
                </div>
                <p style="margin:0 0 12px; font-size:14px; color:var(--muted); line-height:1.6;"><b>核心动作：</b>${s.content}</p>
                <div style="background:var(--blueBg); border-left:4px solid var(--blue); padding:14px; font-size:14px; color:var(--text); line-height:1.65; border-radius:0 8px 8px 0;">
<b style="color:var(--blue); display:block; margin-bottom:4px;">深度拆解：</b>${(s.critique||'').split('\n').join('<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:#000;">$1</b>')}
/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:#000;">$1</b>')}
                </div>
              </article>
            `).join('')}
          </div>
        </div>`;
     } else {
        officialHtml = `<div style="margin-bottom: 32px;">
          <h3 style="margin-bottom: 16px;">实际官方是怎么做的与评价</h3>
          <div class="officialValueGrid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <section style="background: #fff; padding: 18px; border-radius: 12px; border-top: 4px solid var(--green); box-shadow: var(--shadow);">
              <h5 style="margin-top:0; color:var(--green); font-size:16px;">👍 做得好/起效的部分 (Pros)</h5>
              <p style="margin-bottom:0; font-size:14px;">${oa.pros || '无'}</p>
            </section>
            <section style="background: #fff; padding: 18px; border-radius: 12px; border-top: 4px solid var(--red); box-shadow: var(--shadow);">
              <h5 style="margin-top:0; color:var(--red); font-size:16px;">👎 失误/无效的部分 (Cons)</h5>
              <p style="margin-bottom:0; font-size:14px;">${oa.cons || '无'}</p>
            </section>
          </div>
        </div>`;
     }

     return `<div class="block insightPage">
       ${officialHtml}
       <h3 style="margin-bottom: 16px;">PR 应对建议与核心启发</h3>
       <div class="conclusionGrid" style="display:grid; gap:16px;">
         ${takeaways.map((x,i)=>`<article style="background:var(--soft); padding:16px; border-radius:12px; border:1px solid var(--line);"><b>💡 启发 ${i+1}</b><p style="margin-top:8px; margin-bottom:0; font-size:15px;">${x.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</p></article>`).join('')}
       </div>
     </div>`;
  }
  return `<div class="block"><p class="muted">旧版数据，请升级至新模板。</p></div>`;
}

init().catch(err=>{
  console.error("Initialization error:", err);
  document.body.innerHTML=`<div class="app"><div class="block"><h3 style="color:red;">页面加载失败</h3><p class="muted">如果在本地访问，请使用 HTTP 服务器 (如 VSCode Live Server) 打开，直接双击文件会因为 CORS 被拦截。</p><p style="color:red; font-family:monospace; background:#f5f5f5; padding:10px;">${err.message}</p><p>请打开 F12 控制台查看详细报错。</p></div></div>`;
});
