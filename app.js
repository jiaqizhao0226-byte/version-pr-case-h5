let caseSummaries=[];
let currentCase=null;

const $=id=>document.getElementById(id);
const esc=s=>(s==null?'':String(s));
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const splitType=v=>(v||'').split('/').map(x=>x.trim()).filter(Boolean);
const sevClass=v=>typeof v==='string'?(v.includes('S')?'s':(v.includes('A')?'a':'s')):'s';
// 声量/伤害等级 → 高/中/低（S=高，A=中，B=低；A/S、B/A 含A→中）；无数据/未收录 如实透传
const gradeLevel=g=>{g=g||'';if(g==='无数据'||g==='未收录')return g;return /S/.test(g)?'高':(/A/.test(g)?'中':'低');};
// 等级 → 徽章配色（高=红 / 中=琥珀 / 低=绿 / 无数据·未收录=灰）
const levelClass=g=>{const l=gradeLevel(g);if(l==='无数据'||l==='未收录')return 'lv-na';return l==='高'?'lv-hi':(l==='中'?'lv-mid':'lv-lo');};

function switchMainTab(tabId) {
  document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tabId);
  if (btn) btn.classList.add('active');
  
  if(document.getElementById('overview')) document.getElementById('overview').style.display = 'none';
  if(document.getElementById('dashboard')) document.getElementById('dashboard').style.display = 'none';
  if(document.getElementById('mapping')) document.getElementById('mapping').style.display = 'none';
  if(document.getElementById('conclusions')) document.getElementById('conclusions').style.display = 'none';
  if(document.getElementById('detail')) document.getElementById('detail').style.display = 'none';
  
  // 用 hash 记住当前 tab，刷新后能恢复
  if (location.hash.indexOf('case=') === -1) {
    location.hash = 'tab=' + tabId;
  }
  if(document.getElementById(tabId)) document.getElementById(tabId).style.display = 'block';
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
  // value = matrixCell() 编码（声量+伤害：h高/m中/l低），与散点矩阵同一套标准分类。
  // 本库声量仅 S(高)/A(中)，无 B(低)；故仅提供 高/中 声量两档。
  [
    { v:'hh', t:'高伤害 + 高声量' },
    { v:'hm', t:'中伤害 + 高声量' },
    { v:'hl', t:'低伤害 + 高声量' },
    { v:'mh', t:'高伤害 + 中声量' },
    { v:'mm', t:'中伤害 + 中声量' },
    { v:'ml', t:'低伤害 + 中声量' }
  ].forEach(x => {
    const o=document.createElement('option');o.value=x.v;o.textContent=x.t;matrixEl.appendChild(o);
  });

  // Core Tags grouped（四族 11 标准标签，与校对表 + cases.json 核心矛盾完全对齐）
  const tagCategories = {
    '💰 商业化 / 付费': [
       '付费内容贬值/不实',
       '商业化契约/动机争议'
    ],
    '🎮 数值 / 玩法 / 体验': [
       '数值/平衡争议',
       '体验/质量争议',
       '自创玩法管控争议',
       '产能/优先级排期'
    ],
    '🎭 内容与价值观': [
       '情感/价值观争议',
       '内容尺度/合规争议'
    ],
    '👥 圈层矛盾': [
       '圈层矛盾-性别',
       '圈层矛盾-竞品',
       '圈层矛盾-内部'
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

  // 公关应对：四类固定枚举（校对后），按诚意/有效性高→低排序
  const prEl = $('pr');
  if (prEl) {
    const prOrder = [
      '立刻滑跪',
      '正常处理',
      '前期冷处理+后期滑跪',
      '冷处理',
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

function filtered(){
  const q=$('q')?$('q').value.trim().toLowerCase():'';
  const mx=$('matrix')?$('matrix').value:'';
  const ct=$('core_tag')?$('core_tag').value:'';
  const pr=$('pr')?$('pr').value:'';

  return caseSummaries.filter(c=>{
    const hay=[c.title||'',c.game||'',c.company||'',c.market||'',c.type||'',c.summary||'',c.pr||'',...(c.tags||[])].join(' ').toLowerCase();
    
    if (q && !hay.includes(q)) return false;

    // 声量×伤害筛选：与散点矩阵同一套标准分类（matrixCell），
    // 无数据/未收录（na）不落入任何声量×伤害档，仅在「全部」下出现。
    if (mx && matrixCell(c) !== mx) return false;

    if (ct && !(c.tags || []).includes(ct)) return false;

    if (pr && c.pr !== pr) return false;

    return true;
  });
}


function renderStats(){
  // stats 已移除
}

// 每个案例在散点图中的相对坐标（x: 声量低→高 0-100；y: 伤害低→高 0-100）
// 校准原则：
//   y 轴（伤害）——仅「伤害高(S)」进上区(y>50)，中/低一律下区；档内按严重度微调。
//   x 轴（声量）——按「声量强度实感」（含破圈广度）铺排，而非简单 S/A 档位；
//                 破圈/全网级讨论的案例右推，真正未出圈的小众事件留左侧。
// 结果：黄区（高声量·低/中伤害「舆论风暴」）为最大区块，印证「声量普遍高于实际伤害」。
// 声量×伤害 3×3 分类矩阵：声量 S=高、A=中、B=低；伤害 S=高、A/中=中、B=低
// 本案例库无 B 级（低声量）样本，低声量列保留框架但显示"无样本"
function matrixCell(c) {
  const d = c.damage || '';
  if (d === '无数据' || d === '未收录') return 'na';
  // 声量 3 档
  let vol;
  if (/S/.test(c.volume || '')) vol = 'h';      // S=高声量
  else if (/A/.test(c.volume || '')) vol = 'm'; // A=中声量
  else vol = 'l';                                // B=低声量
  // 伤害 3 档
  let dmg;
  if (/S/.test(d)) dmg = 'h';                   // S=高伤害
  else if (/A/.test(d) || d === '中') dmg = 'm'; // A/中=中伤害
  else dmg = 'l';                                // B=低伤害
  return vol + dmg;
}

const CELL_META = {
  // 高伤害行
  lh: { sub: '低声量 · 高伤害', color: 'b-blue' },
  mh: { sub: '中声量 · 高伤害', color: 'b-midblue' },
  hh: { sub: '高声量 · 高伤害', color: 'b-red'  },
  // 中伤害行
  lm: { sub: '低声量 · 中伤害', color: 'b-midblue' },
  mm: { sub: '中声量 · 中伤害', color: 'b-midamber' },
  hm: { sub: '高声量 · 中伤害', color: 'b-midamber' },
  // 低伤害行
  ll: { sub: '低声量 · 低伤害', color: 'b-gray' },
  ml: { sub: '中声量 · 低伤害', color: 'b-gray' },
  hl: { sub: '高声量 · 低伤害', color: 'b-amber'},
};

function renderMatrixChart() {
  const container = document.getElementById('matrixChartContainer');
  if (!container) return;
  const all = caseSummaries || [];

  const groups = { lh:[], mh:[], hh:[], lm:[], mm:[], hm:[], ll:[], ml:[], hl:[], na:[] };
  all.forEach(c => groups[matrixCell(c)].push(c));

  // 单个案例胶囊
  const chip = (c, color) => {
    const parts = (c.title || '').split('-');
    const sub = parts.length > 1 ? parts.slice(1).join('-').slice(0, 12) : '';
    return `<button type="button" class="qcase ${color}" onclick="openCase('${c.id}')"
        title="${esc(c.title)}&#10;声量 ${gradeLevel(c.volume)} / 伤害 ${gradeLevel(c.damage)}">
        <span class="qcName">${esc(c.game || '')}</span>${sub ? `<span class="qcSub">${esc(sub)}</span>` : ''}
      </button>`;
  };

  // 单个象限格子
  const quad = (key) => {
    const m = CELL_META[key];
    const list = groups[key];
    return `<div class="qcell qcell-${key}">
        <div class="qcHead"><span class="qcMeta">${m.sub}</span><span class="qcCount">${list.length}</span></div>
        <div class="qcBody">${list.map(c => chip(c, m.color)).join('') || '<span class="qcEmpty">—</span>'}</div>
      </div>`;
  };

  const naList = groups.na;
  const naBlock = naList.length ? `
      <div class="qnaTray">
        <div class="qnaHead"><span class="qnaTitle">数据缺失 · 未收录</span><span class="qcMeta">停运/未上架/数据源不覆盖，伤害无法量化，不参与上方分类</span><span class="qcCount">${naList.length}</span></div>
        <div class="qnaBody">${naList.map(c => chip(c, 'b-na')).join('')}</div>
      </div>` : '';

  container.innerHTML = `
    <div class="qmatrix-wrap">
      <div class="qmatrix-title">声量 × 伤害 3×3 分类矩阵<span class="qmatrix-note">声量 S=高 / A=中 / B=低；本案例库无 B 级样本，低声量列保留框架</span></div>
      <div class="qmatrix-grid qmatrix-3x3">
        <div class="qaxis-y"><span>高伤害</span><span>中伤害</span><span>低伤害</span></div>
        <div class="qquads qquads-3">
          ${quad('lh')}${quad('mh')}${quad('hh')}
          ${quad('lm')}${quad('mm')}${quad('hm')}
          ${quad('ll')}${quad('ml')}${quad('hl')}
        </div>
      </div>
      <div class="qaxis-x"><span>低声量</span><span>中声量</span><span>高声量</span></div>
      ${naBlock}
    </div>
  `;
}

// === 量化分析仪表盘：5 个图表 ===

// 公关应对环形图
function renderPrChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => { const k = c.pr || '其他'; counter[k] = (counter[k]||0)+1; });
  renderBarChart('prChart', counter, DIST_RAMP);
  const wrap = document.getElementById('prChart');
  if (wrap) wrap.innerHTML += `<div class="chartInsights chartInsightsSub"><b>洞察：</b>这是基础计数，只能看处置口径分布；处置是否有效，需要回到“公关应对 × 伤害结构”和“核心矛盾 × 公关应对 × 伤害”。</div>`;
}

// 时间线分布
// 年度趋势分析：热力图矩阵（矛盾构成 × 公关应对）
function renderYearTrendChart() {
  const wrap = document.getElementById('yearTrendChart');
  if (!wrap) return;
  const all = caseSummaries || [];

  // 按年份分组
  const yearMap = {};
  all.forEach(c => {
    const y = (c.time||'').slice(0,4);
    if (!y) return;
    if (!yearMap[y]) yearMap[y] = { tags:{}, pr:{} };
    caseTags(c).forEach(t => yearMap[y].tags[t] = (yearMap[y].tags[t]||0)+1);
    const p = c.pr || '其他';
    yearMap[y].pr[p] = (yearMap[y].pr[p]||0)+1;
  });
  const years = Object.keys(yearMap).sort();
  if (!years.length) { wrap.innerHTML = '<p class="muted">无时间数据</p>'; return; }

  // Top 6 矛盾标签
  const tagTotal = {};
  all.forEach(c => caseTags(c).forEach(t => tagTotal[t]=(tagTotal[t]||0)+1));
  const topTags = Object.entries(tagTotal).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e[0]);

  // 公关应对
  const prOrder = ['立刻滑跪','正常处理','前期冷处理+后期滑跪','冷处理'];

  // 通用频次热力图渲染（跟公关应对×年份统一格式）
  function drawFreqHeatmap(rows, cols, cells, rowTitle, colTitle, color) {
    const maxVal = Math.max(...Object.values(cells), 1);
    const colHeads = cols.map(c=>`<div class="thColHead">${esc(c)}</div>`).join('');
    const body = rows.map(r=>{
      const cellHtml = cols.map(c=>{
        const n = cells[`${r}|||${c}`] || 0;
        const intensity = n / maxVal;
        const bg = n === 0 ? 'transparent' : `rgba(${color},${0.12 + intensity * 0.78})`;
        const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
        return `<div class="thCell" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${c}: ${n}">
          ${n?`<b style="color:${txtColor}">${n}</b>`:''}
        </div>`;
      }).join('');
      return `<div class="thRow"><div class="thRowHead">${esc(r)}</div>${cellHtml}</div>`;
    }).join('');
    const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(${color},${i});border-radius:2px"></span>`).join('');
    return `<div class="triHeat">
      <div class="triHeatAxis"><span>${esc(rowTitle)}</span><span>${esc(colTitle)}</span></div>
      <div class="triHeatGrid" style="--th-cols:${cols.length}">
        <div class="thCorner"></div>${colHeads}${body}
      </div>
      <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    </div>`;
  }
  // 占比热力图：格子显示百分比，颜色按百分比深浅
  function drawPctHeatmap(rows, cols, freqCells, pctCells, rowTitle, colTitle, color) {
    const colHeads = cols.map(c=>`<div class="thColHead">${esc(c)}</div>`).join('');
    const body = rows.map(r=>{
      const cellHtml = cols.map(c=>{
        const n = freqCells[`${r}|||${c}`] || 0;
        const pct = pctCells[`${r}|||${c}`] || 0;
        const intensity = pct / 100;
        const bg = n === 0 ? 'transparent' : `rgba(${color},${0.12 + intensity * 0.78})`;
        const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
        return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${c}: ${n}次 (${pct}%)">
          ${n?`<b style="color:${txtColor}">${pct}%</b>`:''}
        </div>`;
      }).join('');
      return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
    }).join('');
    const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(${color},${i});border-radius:2px"></span>`).join('');
    return `<div class="triHeat">
      <div class="triHeatAxis"><span>${esc(rowTitle)}</span><span>${esc(colTitle)}</span></div>
      <div class="triHeatGrid" style="--th-cols:${cols.length}">
        <div class="thCorner"></div>${colHeads}${body}
      </div>
      <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">占比：</span>低${legendStops}高</div>
    </div>`;
  }

  // 矛盾构成占比热力图（红色系）— 按年份归一化为占比
  const tagCells = {};
  const tagPctCells = {};
  topTags.forEach(t=>years.forEach(y=>tagCells[`${t}|||${y}`]=yearMap[y].tags[t]||0));
  // 每年标签总数
  years.forEach(y=>{
    const yearTagTotal = topTags.reduce((s,t)=>s+(yearMap[y].tags[t]||0),0);
    topTags.forEach(t=>{
      const n = yearMap[y].tags[t]||0;
      tagPctCells[`${t}|||${y}`] = yearTagTotal>0 ? Math.round(n/yearTagTotal*100) : 0;
    });
  });
  const tagHeatmap = drawPctHeatmap(topTags, years, tagCells, tagPctCells, '核心矛盾', '年份', '184,84,80');

  // 公关应对占比热力图（深靛蓝系）— 按年份归一化为占比
  const prCells = {};
  const prPctCells = {};
  prOrder.forEach(p=>years.forEach(y=>prCells[`${p}|||${y}`]=yearMap[y].pr[p]||0));
  years.forEach(y=>{
    const yearPrTotal = prOrder.reduce((s,p)=>s+(yearMap[y].pr[p]||0),0);
    prOrder.forEach(p=>{
      const n = yearMap[y].pr[p]||0;
      prPctCells[`${p}|||${y}`] = yearPrTotal>0 ? Math.round(n/yearPrTotal*100) : 0;
    });
  });
  const prHeatmap = drawPctHeatmap(prOrder, years, prCells, prPctCells, '公关应对', '年份', '44,62,92');

  wrap.innerHTML = `
    <div class="ytSection">
      <div class="ytSectionTitle">矛盾构成年度趋势</div>
      ${tagHeatmap}
    </div>
    <div class="ytSection">
      <div class="ytSectionTitle">公关应对年度趋势</div>
      ${prHeatmap}
    </div>
    <div class="chartInsights"><b>洞察：</b>
      <ul>
        <li><b>矛盾类型结构性迁移：</b>2021 年以商业化契约和数值平衡争议为主，属于"功能性矛盾"；2023 年起情感/价值观争议和内容尺度/合规争议开始出现并持续增多，舆情重心从"钱和数值"转向"角色认同与价值观"——这一迁移与二次元抽卡、乙女向等强角色绑定品类的高声量案例集中爆发相关。</li>
        <li><b>情感/价值观争议的上升趋势：</b>该类争议在 2021 年为零，2023 年起逐年增加，到 2025-2026 年已成为最高频的矛盾类型之一。这类争议的特点是声量高但伤害不一定高——情绪向议题容易引发广泛讨论，但是否伤到核心付费盘取决于官方是否触及了玩家的情感契约底线。</li>
      </ul>
    </div>
  `;
}

// 象限堆叠条
// —— 生命周期归箱：按各案自述 lifecycle 文本归箱；'运营期/稳定运营期' 等泛化写法为人工判断（可在此调整）——
function lcStage(c){
  const OVERRIDE = { 'lianyu-aoyin':'成长期', 'bluearchive-cn':'成长期', 'dnf-mobile-dragon':'成长期' };
  if (OVERRIDE[c.id]) return OVERRIDE[c.id];
  const lc = c.lifecycle || '';
  if (/回炉|停运/.test(lc)) return '回炉/停运';
  if (/近四年|四周年|十余年|长青|衰退|成熟/.test(lc)) return '成熟期';
  if (/第一年|一周年|三周年|爆款上升|长线/.test(lc)) return '成长期';
  if (/公测|上线|开服|开测|国服|大赛季|半年后|约2个月|约3个月|ML转型|S1|S2/.test(lc)) return '上线期';
  return '未归类';
}
// 图 · 生命周期阶段 × 伤害（按案例数堆叠，诚实呈现小样本；无数据/未收录不计入，与方法论 3.2 一致）
function renderLifecycleDamageChart(){
  const wrap = document.getElementById('lifecycleDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const order = ['上线期','成长期','成熟期','回炉/停运'];
  const label = {'上线期':'上线期（首年内）','成长期':'成长期（1–3年）','成熟期':'成熟期（3年+）','回炉/停运':'回炉 / 停运'};
  const agg = {}; order.forEach(s=>agg[s]={high:0,mid:0,low:0,na:0});
  all.forEach(c=>{ const s=lcStage(c); if(!agg[s])return; agg[s][dmgTier3(c.damage)]++; });
  const maxN = Math.max(...order.map(s=>agg[s].high+agg[s].mid+agg[s].low), 1);
  const seg = (n,tier)=> n? `<div class="quadStackSeg" style="width:${n/maxN*100}%;background:${DMG3_COLORS[tier]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px" title="${DMG3_LABELS[tier]}伤害：${n}">${n}</div>`:'';
  const rows = order.map(s=>{
    const a=agg[s]; const valid=a.high+a.mid+a.low;
    const rate = valid? Math.round(100*a.high/valid) : null;
    const rateTxt = valid ? (valid<=3? `n=${valid}（样本小）` : `n=${valid} · 高伤害 ${rate}%`) : 'n=0';
    return `<div class="quadStackRow" style="display:flex;gap:10px;min-width:0"><div class="quadStackLabel" style="flex:0 0 112px">${esc(label[s])}</div><div class="quadStackBar" style="flex:1 1 auto;min-width:0">${seg(a.high,'high')}${seg(a.mid,'mid')}${seg(a.low,'low')}</div><div class="quadStackVal" style="flex:0 0 132px;text-align:right;font-size:12px;color:var(--muted)">${rateTxt}</div></div>`;
  }).join('');
  const legend = `<div style="display:flex;gap:14px;margin-top:12px;font-size:12px;color:var(--muted);flex-wrap:wrap"><span><i style="display:inline-block;width:10px;height:10px;background:${DMG3_COLORS.high};border-radius:2px;margin-right:4px"></i>高</span><span><i style="display:inline-block;width:10px;height:10px;background:${DMG3_COLORS.mid};border-radius:2px;margin-right:4px"></i>中</span><span><i style="display:inline-block;width:10px;height:10px;background:${DMG3_COLORS.low};border-radius:2px;margin-right:4px"></i>低</span><span>条长 = 案例数（无数据 / 未收录不计入）</span></div>`;
  const insight = `<div class="chartInsights"><b>洞察：</b>越靠近上线窗口，同样的舆情越容易真伤到核心盘——上线期高伤害率 58%（7/12），成长期降到 20%（2/10），成熟期为 0（0/3）。新游付费盘尚未夯实、又正处买量拉新峰值，一个坏的第一印象即结构性伤害；老游有稳固基本盘，同样的事更扛得住。</div>`;
  wrap.innerHTML = `<div class="quadStack">${rows}</div>${legend}${insight}`;
}
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
    {label:'声量 高', filter:k=>k.startsWith('声量S'), color:'#B85450'},
    {label:'声量 中', filter:k=>k.startsWith('声量A'), color:'#8B6F47'},
  ];
  const damageColors = {'S':'#B85450','A':'#8B6F47','B':'#5B7B9A'};
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
  const legend = `<div style="display:flex;gap:14px;margin-top:14px;font-size:12px;color:var(--muted)"><span><span style="display:inline-block;width:10px;height:10px;background:#B85450;border-radius:2px;margin-right:4px"></span>伤害 高</span><span><span style="display:inline-block;width:10px;height:10px;background:#8B6F47;border-radius:2px;margin-right:4px"></span>伤害 中</span><span><span style="display:inline-block;width:10px;height:10px;background:#5B7B9A;border-radius:2px;margin-right:4px"></span>伤害 低</span></div>`;
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

function renderMiniDistribution(containerId, title, meta, entries, note, colors){
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const max = Math.max(1, ...entries.map(e=>e.value));
  const rows = entries.map((e,i)=>{
    const w = Math.max(3, e.value / max * 100);
    const color = colors[i % colors.length];
    return `<div class="overviewMiniRow">
      <span class="overviewMiniLabel">${esc(e.label)}</span>
      <div class="overviewMiniTrack"><div class="overviewMiniFill" style="width:${w}%;background:${color}"></div></div>
      <b>${esc(e.display || e.value)}</b>
    </div>`;
  }).join('');
  wrap.innerHTML = `<div class="overviewMiniHead"><h3>${esc(title)}</h3>${meta?`<span>${esc(meta)}</span>`:''}</div>
    <div class="overviewMiniRows">${rows}</div>
    ${note?`<p>${esc(note)}</p>`:''}`;
}

function counterEntries(counter, limit=6){
  return Object.entries(counter)
    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label,value])=>({label,value}));
}

// 计数分布图统一配色：同一墨蓝色系、由深到浅（bar 按数值降序，最大最深）。
// 颜色不表意，只承担"同族一致感"；语义色（伤害档等）另见 DMG3_COLORS。
const DIST_RAMP = ['#2F3E56','#3E5470','#4E6A8A','#6486A5','#8AA0B8','#B2C0CE','#C9D2DC','#DDE3EA'];

function renderOverviewCards(){
  const all = caseSummaries || [];
  const colors = DIST_RAMP;
  const warmColors = DIST_RAMP;

  const yearCounter = {};
  all.forEach(c=>{ const y=(c.time||'').slice(0,4); if(y) yearCounter[y]=(yearCounter[y]||0)+1; });
  const years = Object.keys(yearCounter).sort();
  const recent = ['2024','2025','2026'].reduce((s,y)=>s+(yearCounter[y]||0),0);
  renderMiniDistribution(
    'overviewTimeCard',
    '时间分布',
    `${all.length} 个案例 · ${years[0] || ''}–${years[years.length-1] || ''}`,
    years.map(y=>({label:y,value:yearCounter[y]})),
    `其中 2024–2026 占 ${recent} 个，以近年为主。`,
    colors
  );

  const genreCounter = {};
  all.forEach(c=>{ if(c.theme) genreCounter[c.theme]=(genreCounter[c.theme]||0)+1; });
  renderMiniDistribution(
    'overviewGenreCard',
    '题材分布',
    '全 5 类',
    counterEntries(genreCounter, 6),
    '按题材分 5 类：二次元 / 写实竞技 / 情怀IP / 乙女向 / 武侠国风。',
    warmColors
  );

  const marketCounter = {};
  all.forEach(c=>{ const m=c.market || '未标注'; marketCounter[m]=(marketCounter[m]||0)+1; });
  renderMiniDistribution(
    'overviewMarketCard',
    '市场分布',
    '',
    counterEntries(marketCounter, 6),
    '',
    DIST_RAMP
  );

  const tagCounter = {};
  all.forEach(c=>caseTags(c).forEach(t=>tagCounter[t]=(tagCounter[t]||0)+1));
  renderMiniDistribution(
    'overviewTagCard',
    '核心矛盾',
    'Top 6',
    counterEntries(tagCounter, 6),
    '只表示出现频次，严重度以上方「核心矛盾 × 伤害」为准。',
    DIST_RAMP
  );

  const prCounter = {};
  all.forEach(c=>{ const p=c.pr || '未标注'; prCounter[p]=(prCounter[p]||0)+1; });
  const prOrder = PR_ORDER.filter(p=>prCounter[p]).map(p=>({label:p,value:prCounter[p]}));
  const prRest = counterEntries(prCounter, 6).filter(e=>!PR_ORDER.includes(e.label));
  renderMiniDistribution(
    'overviewPrCard',
    '公关应对',
    '',
    prOrder.concat(prRest).slice(0,6),
    '只表示处置口径分布，不直接代表处置效果。',
    DIST_RAMP
  );
}

// 品类分布条形图
function renderGenreChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => (c.genre||[]).forEach(g => counter[g] = (counter[g]||0)+1));
  renderBarChart('genreChart', counter, DIST_RAMP);
  const wrap = document.getElementById('genreChart');
  if (wrap) wrap.innerHTML += `<div class="chartInsights chartInsightsSub"><b>洞察：</b>这是样本结构提示，二次元抽卡、乙女向、情怀 IP 等样本较多，后续品类结论更适用于这些样本充足的方向。</div>`;
}

// 核心矛盾聚类条形图
function renderTagsChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => caseTags(c).forEach(t => counter[t] = (counter[t]||0)+1));
  renderBarChart('tagsChart', counter, DIST_RAMP);
  const wrap = document.getElementById('tagsChart');
  if (wrap) wrap.innerHTML += `<div class="chartInsights chartInsightsSub"><b>洞察：</b>这是基础计数，只回答“哪些矛盾更常见”，不直接回答“哪些更严重”；严重度以上方“核心矛盾 × 伤害”为准。</div>`;
}

// 三维热力图：横纵轴为分类，颜色为伤害，数字为案例数
const PR_ORDER = ['立刻滑跪','正常处理','前期冷处理+后期滑跪','冷处理'];
const DMG3_COLORS = { high:'#B85450', mid:'#D99A3E', low:'#7A93B5', na:'#E6E9ED' };
const DMG3_LABELS = { high:'高', mid:'中', low:'低', na:'无' };
const DMG3_RANK = { high:3, mid:2, low:1, na:0 };

function damageLevelFromCase(c){ return dmgTier3(c.damage); }
function highestDamage(cases){
  if (!cases.length) return 'empty';
  return cases.map(damageLevelFromCase).sort((a,b)=>(DMG3_RANK[b]||0)-(DMG3_RANK[a]||0))[0] || 'na';
}
function damageMix(cases){
  const m={high:0,mid:0,low:0,na:0};
  cases.forEach(c=>m[damageLevelFromCase(c)]++);
  return m;
}
function caseShort(c){ return `${c.game||c.title}: ${(c.summary||c.type||'').slice(0,18)}${(c.summary||c.type||'').length>18?'...':''}`; }
function topNByCount(counter, n, min=1){
  return Object.entries(counter).filter(([,v])=>v>=min).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>k);
}
function matrixCells(rows, cols, getRowVals, getColVals){
  const cells={};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=[]));
  (caseSummaries||[]).forEach(item=>{
    getRowVals(item).filter(v=>rows.includes(v)).forEach(r=>{
      getColVals(item).filter(v=>cols.includes(v)).forEach(c=>{
        cells[`${r}|||${c}`].push(item);
      });
    });
  });
  return cells;
}
function heatLegend(){
  return `<div class="triHeatLegend">
    <span><i style="background:${DMG3_COLORS.high}"></i>出现高伤害</span>
    <span><i style="background:${DMG3_COLORS.mid}"></i>以中伤害为主</span>
    <span><i style="background:${DMG3_COLORS.low}"></i>低伤害</span>
    <span><i style="background:${DMG3_COLORS.na}"></i>无数据/未收录</span>
  </div>`;
}
function renderTriHeatmap({rows, cols, cells, rowTitle='', colTitle='', note='', conclusion='', compact=false}){
  const colHeads = cols.map(c=>`<div class="thColHead">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const list = cells[`${r}|||${c}`] || [];
      const tier = highestDamage(list);
      const mix = damageMix(list);
      const cases = list.slice(0,6).map(caseShort).join('\n');
      const count = list.length;
      const detail = count ? `${r} × ${c}\n案例数：${count}\n伤害：${mix.high}高 / ${mix.mid}中 / ${mix.low}低${mix.na?` / ${mix.na}无`:''}\n${cases}` : `${r} × ${c}\n暂无案例`;
      return `<div class="thCell th-${tier}" title="${esc(detail)}">
        ${count?`<b>${count}</b><span>${mix.high?`${mix.high}高`:mix.mid?`${mix.mid}中`:mix.low?`${mix.low}低`:'无'}</span>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  return `<div class="triHeat${compact?' triHeatCompact':''}">
    <div class="triHeatAxis"><span>${esc(rowTitle)}</span><span>${esc(colTitle)}</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    ${heatLegend()}
    ${conclusion?`<div class="chartInsights"><b>洞察：</b>${conclusion}</div>`:''}
    ${note?`<p class="chartReadNote">${note}</p>`:''}
  </div>`;
}

// 品类 × 核心矛盾 × 伤害
function renderGenreDamageChart() {
  const wrap = document.getElementById('genreDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const themeTotal = {};
  const tagTotal = {};
  all.forEach(c=>{
    if (c.theme) themeTotal[c.theme]=(themeTotal[c.theme]||0)+1;
    caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1);
  });
  const rows = Object.keys(themeTotal).sort((a,b)=>themeTotal[b]-themeTotal[a]);
  const cols = topNByCount(tagTotal, 8);
  // 纯频次统计
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    if (c.theme && rows.includes(c.theme)) caseTags(c).forEach(t=>{
      if (cols.includes(t)) cells[`${c.theme}|||${t}`]++;
    });
  });
  // 频次热力图（暖棕色系）
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(139,111,71,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(139,111,71,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>游戏题材</span><span>核心矛盾</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>洞察：</b>
      <ul>
        <li data-tag="乙女向"><b>乙女向</b>的情感/价值观争议最密集——核心资产是角色关系与情感契约，一旦被冒犯容易引发广泛讨论。</li>
        <li data-tag="二次元"><b>二次元</b>的付费内容贬值/商业化动机争议突出——抽卡资产被削弱或缩水时，易引发付费信任争议。</li>
        <li data-tag="写实/竞技"><b>写实/竞技</b>风险集中在数值公平与玩法生态——竞技属性强，平衡性调整和玩法管控是最敏感的触发点。</li>
        <li data-tag="情怀IP"><b>情怀IP</b>更易因定位偏离、价值观冲突或老玩家预期落差引发争议——老玩家对 IP 调性有固定期待，偏离即触发。</li>
        <li data-tag="武侠/国风"><b>武侠/国风</b>样本集中在开放世界类，矛盾多为玩法平衡与内容争议。</li>
      </ul>
    </div>
  </div>`;
}

// 玩法 × 核心矛盾（频次热力图）
function renderGameplayTagChart(){
  const wrap = document.getElementById('gameplayTagChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const gameplayTotal = {};
  const tagTotal = {};
  all.forEach(c=>{
    if (c.gameplay) gameplayTotal[c.gameplay]=(gameplayTotal[c.gameplay]||0)+1;
    caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1);
  });
  const rows = Object.keys(gameplayTotal).sort((a,b)=>gameplayTotal[b]-gameplayTotal[a]);
  const cols = topNByCount(tagTotal, 8);
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    if (c.gameplay && rows.includes(c.gameplay)) caseTags(c).forEach(t=>{
      if (cols.includes(t)) cells[`${c.gameplay}|||${t}`]++;
    });
  });
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(91,123,166,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(91,123,166,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>游戏玩法</span><span>核心矛盾</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>洞察：</b>
      <ul>
        <li data-tag="模拟/养成"><b>模拟/养成</b>以情感/价值观争议和付费内容贬值为主要矛盾——这类玩法的核心是长线情感投入和持续付费，一旦角色或付费权益变动，玩家反应最强烈。</li>
        <li data-tag="射击类"><b>射击类</b>集中在数值公平与玩法生态争议——竞技属性强，平衡性调整和玩法管控是最敏感的触发点。</li>
        <li data-tag="开放世界"><b>开放世界</b>矛盾类型较分散，但体验/质量争议相对突出——大世界对技术品质要求高，优化和bug问题容易成为导火索。</li>
        <li data-tag="抽卡RPG"><b>抽卡RPG</b>以商业化契约和付费内容贬值为主——抽卡资产的保值承诺是这类玩法的信任基石。</li>
      </ul>
    </div>
  </div>`;
}

// —— 伤害分档辅助：S/A=中高，B=低，无数据/未收录=无（旧·两档，保留兼容）——
function dmgTier(d){
  d = d || '';
  if (d === '无数据' || d === '未收录') return 'na';
  if (/S/.test(d) || d === 'A') return 'high';
  return 'low';
}
// —— 伤害三档：S=高，A=中，B=低，无数据/未收录=无 ——
function dmgTier3(d){
  d = d || '';
  if (d === '无数据' || d === '未收录') return 'na';
  if (/S/.test(d) || d === '高') return 'high';
  if (/A/.test(d) || d === '中') return 'mid';
  return 'low';
}
// —— 核心矛盾标签合并：圈层矛盾-性别 / 圈层矛盾-竞品 统称「圈层矛盾」 ——
const mergeTag = t => (t||'').startsWith('圈层矛盾') ? '圈层矛盾' : (t||'');
// 返回单个案例去重后的合并标签数组
const caseTags = c => [...new Set((c.tags||[]).map(mergeTag).filter(Boolean))];
// 图1 · 核心矛盾 × 伤害（频次热力图）
function renderTagDamageChart(){
  const wrap = document.getElementById('tagDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  // 收集标签和伤害档位
  const tagTotal = {};
  all.forEach(c => caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1));
  const rows = topNByCount(tagTotal, 9);
  const cols = ['高伤害(S)','中伤害(A)','低伤害(B)'];
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    const tier = dmgTier3(c.damage);
    if (tier === 'na') return; // 跳过无数据案例
    const tierName = tier==='high'?'高伤害(S)':tier==='mid'?'中伤害(A)':'低伤害(B)';
    caseTags(c).forEach(t=>{
      if (rows.includes(t)) cells[`${t}|||${tierName}`]++;
    });
  });
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(184,84,80,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(184,84,80,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>核心矛盾</span><span>伤害档位</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>洞察：</b>
      <ul>
        <li data-tag="商业化契约/动机争议,体验/质量争议"><b>商业化契约/动机争议</b>和<b>体验/质量争议</b>的高伤害占比最高（分别 62% 和 67%）——前者是玩家认为厂商"故意坑钱"时信任受损，后者是基础品质问题直接导致流失。这两类矛盾最容易实质伤到留存盘。</li>
        <li data-tag="情感/价值观争议"><b>情感/价值观争议</b>两极分化（50% 高 / 50% 低）——触及情感契约底线则伤及留存，未触及则只是情绪宣泄。</li>
        <li data-tag="数值/平衡争议"><b>数值/平衡争议</b>以低伤害为主（17%），多数可通过后续调整修复。</li>
      </ul>
    </div>
  </div>`;
}

// 图2 · 声量 × 核心矛盾（频次热力图）
function renderScopeTagChart(){
  const wrap = document.getElementById('scopeTagChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const tagTotal = {};
  all.forEach(c => caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1));
  const rows = ['高声量','中声量'];
  const cols = topNByCount(tagTotal, 7);
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    const vol = c.volume || '';
    let scope;
    if (/S/.test(vol)) scope = '高声量';
    else if (/A/.test(vol)) scope = '中声量';
    else scope = '低声量';
    caseTags(c).forEach(t=>{
      if (cols.includes(t)) cells[`${scope}|||${t}`]++;
    });
  });
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(44,62,92,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(44,62,92,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>声量</span><span>核心矛盾</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>洞察：</b>
      <ul>
        <li data-tag="内容尺度/合规争议,情感/价值观争议">内容尺度/合规争议和情感/价值观争议集中在高声量场景——这类议题容易引发跨平台讨论和破圈传播。</li>
      </ul>
    </div>
  </div>`;
}

// 图3 · 公关应对 × 伤害（含选择效应说明）— 三档：高/中/低
function renderPrDamageChart(){
  const wrap = document.getElementById('prDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const order = ['立刻滑跪','正常处理','前期冷处理+后期滑跪','冷处理'];
  const data = {}; order.forEach(p=> data[p]={high:0,mid:0,low:0,na:0,total:0});
  all.forEach(c => {
    const p = c.pr; if (!data[p]) return;
    data[p][dmgTier3(c.damage)]++; data[p].total++;
  });
  const rows = order.filter(p=>data[p].total>0);
  const maxTotal = Math.max(...rows.map(p=>data[p].total));
  const C = DMG3_COLORS;
  const html = rows.map(p=>{
    const d=data[p]; const w=d.total/maxTotal*100;
    const hi=d.total?d.high/d.total*100:0, mi=d.total?d.mid/d.total*100:0, lo=d.total?d.low/d.total*100:0, na=d.total?d.na/d.total*100:0;
    return `<div class="gdRow" data-row="${esc(p)}">
      <div class="gdGenre">${esc(p)} <span class="gdCount">${d.total}</span></div>
      <div class="gdBars"><div class="gdBarLine">
        <span class="gdBarLabel">伤害</span>
        <div class="gdBar" style="width:${w}%">
          <div class="gdSeg" style="width:${hi}%;background:${C.high}" title="高伤害(S): ${d.high}"></div>
          <div class="gdSeg" style="width:${mi}%;background:${C.mid}" title="中伤害(A): ${d.mid}"></div>
          <div class="gdSeg" style="width:${lo}%;background:${C.low}" title="低伤害(B): ${d.low}"></div>
          <div class="gdSeg" style="width:${na}%;background:${C.na}" title="无数据/未收录: ${d.na}"></div>
        </div>
        <span class="gdBarVal">${d.high}高 / ${d.mid}中 / ${d.low}低${d.na?` / ${d.na}无`:''}</span>
      </div></div>
    </div>`;
  }).join('');
  const legend = `<div class="gdLegend">
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.high}"></span>高伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.mid}"></span>中伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.low}"></span>低伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.na}"></span>无数据/未收录</span>
  </div>`;
  wrap.innerHTML = `<div class="gdRows">${html}</div>${legend}
    <div class="chartInsights"><b>洞察：</b>
      <p style="margin:0 0 8px;">先看数据本身：四种处置方式与伤害档位之间并非随机分布，而是存在明显的匹配关系——说明官方并非"随便选一个应对方式"，处置选择与事件性质高度相关。</p>
      <ul>
        <li data-tag="立刻滑跪,前期冷处理+后期滑跪"><b>滑跪（含立刻滑跪和后期滑跪）</b>的伤害分布比其它处置更偏向中 / 高档（合并后 13 例中，中高伤害 9 例、低伤害仅 1 例、无数据 3 例），且触及核心付费 / 契约的案例几乎都会滑跪。这说明滑跪更多是<b>事件已被判定为"动了根基"后的止损选择</b>——不是"滑跪导致高伤害"，而是"判断伤到核心才滑跪"（选择效应，非因果）。需注意：单看"立刻滑跪"一项，伤害分布其实较分散（高/中/低都有），滑跪速度本身是姿态选择，不能直接当作严重度信号。</li>
        <li data-tag="冷处理"><b>冷处理</b>集中在低伤害（7/10 为低伤害），说明它多用于官方判断"没动到核心盘"的场景。风险在于误判：如果实际已触及核心付费，冷处理会错过最佳窗口。</li>
        <li data-tag="正常处理"><b>正常处理</b>的案例伤害分布较均匀，是矛盾可控、诉求明确时的标准路径——按常规节奏公告说明即可。</li>
      </ul>
      <p style="margin:8px 0 0;"><b>一句话结论：</b>处置方式没有绝对优劣，关键是匹配事件性质——触及核心付费就快速止损，没触及就冷处理，判断对了比选哪个更重要。</p>
    </div>`;
}

// 图4「结局落点分布」已废弃：落点统一由 matrixCell() 生成，并在 Mapping 页九宫格呈现，
// 不再单独维护基于 resultCell 字段的分布图（原 renderResultCellChart 已移除）。


function renderGrid(){
  renderStats();
  renderMatrixChart();
  renderOverviewCards();
  renderGenreChart();
  renderPrChart();
  renderYearTrendChart();
  renderTagsChart();
  renderGenreDamageChart();
  renderGameplayTagChart();
  renderTagDamageChart();
  renderScopeTagChart();
  renderPrDamageChart();
  renderLifecycleDamageChart();
  const list=filtered();
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  $('caseGrid').innerHTML=list.map(c=>`<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${c.title}</div><div class="game">${c.game} / ${c.company}${(c.genre||[]).length?' / '+(c.genre||[]).join(' · '):''}</div></div><div class="caseBadges"><span class="badge ${levelClass(c.volume)}" title="声量等级">声量 ${gradeLevel(c.volume)}</span><span class="badge ${levelClass(c.damage)}" title="伤害等级">伤害 ${gradeLevel(c.damage)}</span></div></div><div class="desc">${c.summary}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip chip-conflict">${t}</span>`).join('')}${c.pr?`<span class="chip chip-pr">${c.pr}</span>`:''}</div><div class="foot"><span>${c.market}</span><span>${c.time}</span></div></article>`).join('');
}

function openCase(id){location.hash=`case=${id}`;}
function goHome(){
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
    // 读取 #tab=xxx 恢复之前所在 tab，没有则默认 overview
    const tabId=(location.hash.match(/tab=([^&]+)/)||[])[1] || 'overview';
    switchMainTab(tabId);
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
  return `<div class="trendWrap"><svg class="emoTrend" viewBox="0 0 ${W} ${H}" role="img" aria-label="玩家情感强度趋势"><defs><linearGradient id="emoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B85450" stop-opacity="0.18"/><stop offset="1" stop-color="#B85450" stop-opacity="0.02"/></linearGradient></defs>${grid.map(g=>`<line x1="${padL}" y1="${y(g)}" x2="${padL+iw}" y2="${y(g)}" class="tGrid"/>`).join('')}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+ih}" class="tAxisLine"/><line x1="${padL}" y1="${padT+ih}" x2="${padL+iw}" y2="${padT+ih}" class="tAxisLine"/><text x="22" y="${padT+ih/2}" class="tAxisTitle" transform="rotate(-90 22 ${padT+ih/2})">玩家情感强度</text><polygon points="${area}" fill="url(#emoArea)"/><polyline points="${pts}" class="tLine" fill="none"/>${stages.map((s,i)=>{const sc=s.emotionScore||0;const cy=y(sc);const ly=sc>=75?cy+28:cy-26;return `<g class="tPoint" onclick="openStage(${i})"><line x1="${x(i)}" y1="${cy}" x2="${x(i)}" y2="${padT+ih}" class="tGuide"/><circle cx="${x(i)}" cy="${cy}" r="7"/><text x="${x(i)}" y="${ly}" class="tCallout" text-anchor="middle">${esc(s.label)}</text><text x="${x(i)}" y="${padT+ih+26}" class="tStageNo" text-anchor="middle">阶段${sno(s,i)}</text><text x="${x(i)}" y="${padT+ih+45}" class="tDate" text-anchor="middle">${esc(s.chartDate||sd(s.time))}</text></g>`;}).join('')}</svg><div class="tHint">点击趋势图节点展开对应阶段（每次只展开一个）↓</div></div>`;
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
  let dataPane;
  if(charts){
    dataPane=`${verdict('数据结论',ds.verdict)}${dmgRow}${whyHtml}<div class="dataCharts">${charts}</div>${ds.caption?`<p class="muted dataCaption">${esc(ds.caption)}</p>`:''}`;
  }else if(ds.verdict||dmg.grade||ds.caption){
    // 无脱敏图（无数据/未收录/无法量化）：优雅降级，仍展示数据结论 + 伤害评级 + 说明
    const naBadge=`<div class="dataNaBadge dna-${esc(dmg.tone||'mute')}">${esc(gradeLevel(dmg.grade)||'无数据')} · 无脱敏图</div>`;
    dataPane=`<div class="dataNaBox">${naBadge}${verdict('数据结论',ds.verdict)}${dmgRow}${whyHtml}${ds.caption?`<p class="muted dataCaption">${esc(ds.caption)}</p>`:''}</div>`;
  }else{
    dataPane='<p class="muted">暂无脱敏数据。</p>';
  }

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

  // ① 案例定型：大字判定 + 小字归因解释
  const pf=n.profile||{};
  const pfHeadline=pf.headline?`<p class="pfVerdict">${esc(pf.headline)}</p>`:'';
  const profileSummary=pf.summary?`<p class="pfSummary">${esc(pf.summary)}</p>`:'';
  const profileBlock=(pfHeadline||profileSummary)?`<div class="block ctBlock"><h3>案例定型</h3>${pfHeadline}${profileSummary}</div>`:'';

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

init().then(()=>{
  // 洞察 hover 高亮：hover <li data-tag="..."> 时高亮热力图对应行/列和条形图行
  document.addEventListener('mouseover', e=>{
    const li = e.target.closest('.chartInsights li[data-tag]');
    if(!li) return;
    const tags = li.dataset.tag.split(',');
    document.querySelectorAll('.thRowHead, .thColHead, .thCell, .gdRow').forEach(el=>el.classList.remove('hl'));
    tags.forEach(tag=>{
      // 高亮热力图行（thRowHead + thCell）
      document.querySelectorAll(`.thRowHead[data-row="${tag}"]`).forEach(el=>el.classList.add('hl'));
      document.querySelectorAll(`.thCell[data-row="${tag}"]`).forEach(el=>el.classList.add('hl'));
      // 高亮热力图列（thColHead + thCell）
      document.querySelectorAll(`.thColHead[data-col="${tag}"]`).forEach(el=>el.classList.add('hl'));
      document.querySelectorAll(`.thCell[data-col="${tag}"]`).forEach(el=>el.classList.add('hl'));
      // 高亮条形图行（gdRow）
      document.querySelectorAll(`.gdRow[data-row="${tag}"]`).forEach(el=>el.classList.add('hl'));
    });
  });
  document.addEventListener('mouseout', e=>{
    if(e.target.closest('.chartInsights li[data-tag]')){
      document.querySelectorAll('.thRowHead.hl, .thColHead.hl, .thCell.hl, .gdRow.hl').forEach(el=>el.classList.remove('hl'));
    }
  });
}).catch(err=>{
  console.error("Initialization error:", err);
  document.body.innerHTML=`<div class="app"><div class="block"><h3 style="color:red;">页面加载失败</h3><p class="muted">如果在本地访问，请使用 HTTP 服务器 (如 VSCode Live Server) 打开，直接双击文件会因为 CORS 被拦截。</p><p style="color:red; font-family:monospace; background:#f5f5f5; padding:10px;">${err.message}</p><p>请打开 F12 控制台查看详细报错。</p></div></div>`;
});
