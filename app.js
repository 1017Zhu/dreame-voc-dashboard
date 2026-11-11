'use strict';
const $=s=>document.querySelector(s);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('zh-CN');
const paths=['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z','M4 20V10m7 10V4m7 16v-7','M3 5h18M3 12h18M3 19h18M8 3v18','M8 4h12v17H4V4h4m0-2h8v5H8zM8 12h8m-8 4h5','M3 4h9l9 9-8 8-10-10V4m5 3h.01'];
const navs=[['overview','VOC 总览'],['products','产品洞察'],['reviews','评论工作台'],['actions','行动跟进'],['tags','标签管理']];
let saved={},tasks=[];
try{saved=JSON.parse(localStorage.getItem('dreame-voc-edits-v1')||'{}');tasks=JSON.parse(localStorage.getItem('dreame-voc-tasks-v1')||'[]');}catch{}
const sourceRecords = new Map(window.VOC_DATA.map(record => [record.id, record]));
const records=window.VOC_DATA.map(r=>migrateRecord({...r,...saved[r.id]}));
let state={page:'overview',tag:'',direction:'',query:'',sentiment:'',reviewed:'',pageNo:1};
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function unique(key){return [...new Set(records.map(r=>r[key]).filter(Boolean))].sort();}
function options(id,values,label){$(id).innerHTML='<option value="">'+label+'</option>'+values.map(v=>'<option>'+escapeHTML(v)+'</option>').join('');}
options('#model',unique('model'),'全部型号');options('#platform',unique('platform'),'全部渠道');options('#month',unique('month').reverse(),'全部月份');
$('#nav').innerHTML=navs.map(([key,name],i)=>'<button data-page="'+key+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="'+paths[i]+'"/></svg><span>'+name+'</span>'+(key==='reviews'?'<span class="count">3,739</span>':'')+'</button>').join('');
function base(){return records.filter(r=>(!$('#kind').value||r.kind===$('#kind').value)&&(!$('#model').value||r.model===$('#model').value)&&(!$('#platform').value||r.platform===$('#platform').value)&&(!$('#month').value||r.month===$('#month').value));}
function reviewRows(){return base().filter(r=>(!state.tag||(state.direction?r[state.direction]:r.topics).includes(state.tag))&&(!state.query||[r.zh,r.text,r.model,r.id,...r.topics,...r.positive,...r.negative].join(' ').toLowerCase().includes(state.query.toLowerCase()))&&(!state.sentiment||(state.sentiment==='positive'&&r.positive.length>0)||(state.sentiment==='negative'&&r.negative.length>0)||(state.sentiment==='unknown'&&!r.positive.length&&!r.negative.length)||(state.sentiment==='unmatched'&&!r.topics.length))&&(!state.reviewed||(state.reviewed==='yes'&&r.reviewed)||(state.reviewed==='no'&&!r.reviewed)));}
function ranking(rows,direction){const c={};rows.forEach(r=>new Set(r[direction]).forEach(t=>c[t]=(c[t]||0)+1));return Object.entries(c).sort((a,b)=>b[1]-a[1]);}
function percent(n,d){return d?(100*n/d).toFixed(1)+'%':'—';}
function kpis(rows){const neg=rows.filter(r=>r.negative.length).length;const rated=rows.filter(r=>r.rating!==null);const average=rated.length?(rated.reduce((s,r)=>s+r.rating,0)/rated.length).toFixed(2):'—';return '<div class="kpis">'+[
 ['VOC 数量',fmt(rows.length),'条','当前筛选下的独立 VOC 记录','▤'],
 ['负向标签提及率',percent(neg,rows.length),'',fmt(neg)+' 条含负向标签 / '+fmt(rows.length)+' 条记录','↘'],
 ['平均星级',average,rated.length?'/ 5':'',fmt(rated.length)+' 条有星级记录','☆'],
 ['待复核记录',fmt(rows.filter(r=>!r.reviewed).length),'条','规则初标 · 已复核 '+fmt(rows.filter(r=>r.reviewed).length)+' 条','◷']
 ].map(([name,value,unit,note,icon])=>'<div class="kpi"><div class="kpi-top">'+name+'<span class="kpi-icon">'+icon+'</span></div><div class="kpi-value">'+value+'<small>'+unit+'</small></div><p>'+note+'</p></div>').join('')+'</div>';}
function trend(rows){const months=[...new Set(rows.map(r=>r.month).filter(Boolean))].sort();if(!months.length)return '<div class="empty">当前记录没有可用月份</div>';const all=months.map(m=>rows.filter(r=>r.month===m).length),neg=months.map(m=>rows.filter(r=>r.month===m&&r.negative.length).length);const max=Math.max(...all,1),W=640,H=210,L=32,R=12,T=15,B=34;const x=i=>L+(W-L-R)*(months.length===1?.5:i/(months.length-1));const y=v=>H-B-(H-T-B)*v/max;const points=arr=>arr.map((v,i)=>x(i)+','+y(v)).join(' ');let svg='<svg class="chart" viewBox="0 0 640 210" role="img" aria-label="VOC 与负向反馈月度趋势">';for(let i=0;i<4;i++){let v=max*i/3;svg+='<line x1="32" x2="628" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#edf1ed" stroke-dasharray="3 4"/><text x="0" y="'+(y(v)+4)+'">'+Math.round(v)+'</text>';}svg+='<polygon points="'+x(0)+','+(H-B)+' '+points(all)+' '+x(months.length-1)+','+(H-B)+'" fill="#edf5ef"/><polyline points="'+points(all)+'" fill="none" stroke="#408569" stroke-width="2.3"/><polyline points="'+points(neg)+'" fill="none" stroke="#cf927b" stroke-width="1.7"/>';months.forEach((m,i)=>{svg+='<circle cx="'+x(i)+'" cy="'+y(all[i])+'" r="3" fill="#408569"><title>'+m+' · '+all[i]+' 条 VOC · '+neg[i]+' 条负向</title></circle>';if(i%Math.max(1,Math.ceil(months.length/7))===0||i===months.length-1)svg+='<text x="'+x(i)+'" y="202" text-anchor="middle">'+m.slice(2)+'</text>';});return svg+'</svg>';}
function bars(rows,dir){const items=ranking(rows,dir).slice(0,6),max=items[0]?.[1]||1;return items.length?items.map(([tag,n])=>'<button class="bar-row '+(dir==='positive'?'green':'')+'" data-tag="'+escapeHTML(tag)+'" data-direction="'+dir+'"><span>'+escapeHTML(tag)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+100*n/max+'%"></div></div><span class="bar-number">'+n+'</span></button>').join(''):'<div class="empty">当前筛选没有此方向标签</div>';}
function panel(title,body,extra='',className=''){return '<section class="panel '+className+'"><div class="panel-title"><h2>'+title+'</h2>'+extra+'</div>'+body+'</section>';}
function chips(r){return [...r.negative.slice(0,2).map(t=>'<span class="tag negative">'+escapeHTML(t)+'</span>'),...r.positive.slice(0,r.negative.length?0:2).map(t=>'<span class="tag positive">'+escapeHTML(t)+'</span>')].join('')||'<span class="tag">'+escapeHTML(r.topics[0]||r.status)+'</span>';}
function table(rows){return rows.length?'<div class="table-wrap"><table><thead><tr><th>用户反馈</th><th>产品型号</th><th>渠道</th><th>星级</th><th>体验标签</th><th>日期</th><th>标签操作</th></tr></thead><tbody>'+rows.map(r=>'<tr tabindex="0" data-id="'+r.id+'"><td class="cell-text" title="'+escapeHTML(r.zh)+'">'+escapeHTML(r.zh)+'</td><td><strong>'+escapeHTML(r.model)+'</strong></td><td><span class="platform">'+escapeHTML(r.platform)+'</span></td><td>'+(r.rating?'☆ '+r.rating:'—')+'</td><td>'+chips(r)+'</td><td>'+escapeHTML(r.date||'缺失')+'</td><td><button type="button" class="tag review-button" title="'+(r.reviewed?'已复核':'待复核')+'">编辑标签 ›</button></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">没有符合筛选条件的记录，请调整筛选。</div>';}
function heatmap(rows){const tags=ranking(rows,'negative').slice(0,5).map(x=>x[0]);const models=[...new Set(rows.map(r=>r.model))].sort();if(!tags.length)return '<div class="empty">当前筛选没有负向标签</div>';return '<div class="table-wrap"><table class="matrix"><thead><tr><th>型号 / 负向提及</th>'+tags.map(t=>'<th>'+escapeHTML(t)+'</th>').join('')+'</tr></thead><tbody>'+models.map(m=>{const rs=rows.filter(r=>r.model===m);return '<tr data-model="'+escapeHTML(m)+'"><td><strong>'+escapeHTML(m)+'</strong><small style="color:#a4b1a7"> · '+rs.length+'</small></td>'+tags.map(t=>{const n=rs.filter(r=>r.negative.includes(t)).length;return '<td><span class="heat" style="background:rgba(75,130,96,'+(n?Math.min(.55,.08+n/rs.length*.8):.025)+')">'+(n||'—')+'</span></td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
function overview(){const rows=base(),focus=rows.filter(r=>r.negative.length).sort((a,b)=>(a.rating||6)-(b.rating||6)).slice(0,5);return kpis(rows)+'<div class="overview-links"><button class="panel-link" data-page="tags">VOC 标签域总览 ↗</button></div><div class="grid">'+panel('用户声音趋势',trend(rows),'<div class="legend"><span><i></i>VOC</span><span><i class="red"></i>含负向标签</span></div>')+panel('用户在意的体验',bars(rows,'negative'),'<small>负向标签 · 提及记录数</small>')+'</div><div class="grid">'+panel('产品问题分布',heatmap(rows),'<small>单元格为提及记录数</small>')+panel('被认可的产品体验',bars(rows,'positive'),'<small>正向标签 · 提及记录数</small>')+'</div>'+panel('值得关注的用户反馈',table(focus),'<button class="panel-link" data-page="reviews">查看全部反馈 ↗</button>');}
const insight = {metric:'negativeRate', model:'', domain:'A', group:'', tag:''};

function products() {
 const rows = base();
 if (!rows.length) return panel('型号 × 标签域','<div class="empty">当前筛选没有 VOC</div>');
 const domains = new Map();
 for (const entry of dictionary) {
  const code = entry['编码'][0];
  if (!domains.has(code)) domains.set(code, {name:entry['一级域'], entries:[]});
  domains.get(code).entries.push(entry);
 }
 const models = new Map();
 for (const record of rows) {
  if (!models.has(record.model)) models.set(record.model, []);
  models.get(record.model).push(record);
 }
 const metric = {
  negativeRate:['negative','负向提及率'],
  positiveRate:['positive','正向提及率'],
  count:['topics','提及条数']
 }[insight.metric];
 const count = (records, entries) => {
  const names = new Set(entries.map(entry => entry['三级标签']));
  return records.filter(record => record[metric[0]].some(label => names.has(label))).length;
 };
 const cells = [...models].map(([model,records]) => ({
  model, size:records.length, values:[...domains.values()].map(domain=>count(records,domain.entries))
 }));
 const score = (value, size) => insight.metric==='count' ? value : value/size;
 const maximum = Math.max(...cells.flatMap(row=>row.values.map(value=>score(value,row.size))),0.0001);
 if (!models.has(insight.model)) insight.model = cells.reduce((largest,row)=>row.size>largest.size?row:largest).model;
 const heading = [...domains].map(([code,domain])=>'<th><b>'+code+'</b><br>'+escapeHTML(domain.name)+'</th>').join('');
 const matrix = cells.map(row=>'<tr><th>'+escapeHTML(row.model)+'<small>'+fmt(row.size)+' 条 VOC</small></th>'
  +[...domains.keys()].map((code,index)=>{
   const value = row.values[index];
   const selected = row.model===insight.model && code===insight.domain;
   const opacity = .07 + .74 * score(value,row.size)/maximum;
   const label = insight.metric==='count' ? fmt(value) : percent(value,row.size);
   return '<td><button class="insight-cell" data-insight-model="'+escapeHTML(row.model)+'" data-insight-domain="'+code
    +'" aria-pressed="'+selected+'" style="--intensity:'+opacity+'" title="'+value+' / '+row.size+' 条">'
    +label+'<small>'+fmt(value)+' / '+fmt(row.size)+'</small></button></td>';
  }).join('')+'</tr>').join('');
 const controls = '<select id="insightMetric" aria-label="热力图指标">'+Object.entries({
  negativeRate:'负向提及率',positiveRate:'正向提及率',count:'提及条数'
 }).map(([key,label])=>'<option value="'+key+'"'+(key===insight.metric?' selected':'')+'>'+label+'</option>').join('')+'</select>';
 const records = models.get(insight.model);
 const domain = domains.get(insight.domain);
 const groups = new Map();
 for (const entry of domain.entries) {
  const name = entry['二级域'];
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name).push(entry);
 }
 const ranked = [...groups].map(([name,entries])=>[name,count(records,entries)]).sort((a,b)=>b[1]-a[1]);
 if (!groups.has(insight.group)) insight.group = ranked[0][0];
 const maxGroup = Math.max(1,ranked[0][1]);
 const bars = ranked.map(([name,value])=>'<button class="bar-row insight-bar" data-insight-group="'+escapeHTML(name)
  +'" aria-pressed="'+(name===insight.group)+'"><span>'+escapeHTML(name)
  +'</span><span class="bar-track"><span class="bar-fill" style="width:'+100*value/maxGroup
  +'%"></span></span><span class="bar-number">'+fmt(value)+'</span></button>').join('');
 const labels = groups.get(insight.group).map(entry=>[entry,count(records,[entry])]).sort((a,b)=>b[1]-a[1]);
 const maxLabel = Math.max(1,labels[0][1]);
 if (!labels.some(([entry])=>entry['三级标签']===insight.tag)) insight.tag = labels[0][0]['三级标签'];
 const direction = metric[0]==='topics' ? '' : metric[0];
 const leaves = labels.map(([entry,value])=>'<button class="bar-row insight-bar" data-insight-tag="'+escapeHTML(entry['三级标签'])
  +'" aria-pressed="'+(entry['三级标签']===insight.tag)+'"><span><b>'
  +escapeHTML(entry['编码'])+'</b> '+escapeHTML(entry['三级标签'])+'</span><span class="bar-track"><span class="bar-fill" style="width:'
  +100*value/maxLabel+'%"></span></span><span class="bar-number">'+fmt(value)+'</span></button>').join('');
 const tag = byLabel.get(insight.tag);
 const matches = record => record[metric[0]].includes(insight.tag);
 const drill = (model, month='') => ' data-tag="'+escapeHTML(insight.tag)+'" data-direction="'+direction
  +'" data-drill-model="'+escapeHTML(model)+'"'+(month?' data-drill-month="'+month+'"':'');
 const detail = '<div class="insight-selection">'+escapeHTML(tag['编码']+' '+insight.tag)+' · '+metric[1]+'</div>';
 const comparison = [...models].map(([model,items])=>({model,total:items.length,n:items.filter(matches).length}))
  .sort((a,b)=>b.n/b.total-a.n/a.total || b.total-a.total);
 const comparisonBars = comparison.map(({model,total,n})=>'<button class="bar-row insight-bar comparison-bar"'+drill(model)
  +'><span>'+escapeHTML(model)+'</span><span class="bar-track"><span class="bar-fill" style="width:'+100*n/total
  +'%"></span></span><span>'+percent(n,total)+' <small>('+n+'/'+total+')</small></span></button>').join('');
 return panel('型号 × 一级标签域','<p class="insight-help">色深随'+metric[1]+'增加。提及率以该型号在当前筛选下的 VOC 总量为分母，点格子查看细分。</p>'
  +'<div class="table-wrap"><table class="insight-matrix"><thead><tr><th>型号 / 样本量</th>'+heading
  +'</tr></thead><tbody>'+matrix+'</tbody></table></div>',controls,'insight-overview')
  +'<div class="insight-selection">'+escapeHTML(insight.model)+' · '+insight.domain+' '+escapeHTML(domain.name)+' · '+fmt(records.length)+' 条样本</div>'
  +'<div class="grid">'+panel('二级域排行',bars,'<small>按提及条数排序</small>')
  +panel(escapeHTML(insight.group)+' · 三级码',leaves,'<small>点击查看趋势</small>')+'</div>'+detail
  +'<div class="grid">'+panel('标签月度趋势', insightTrend(records,matches,month=>drill(insight.model,month)),
   '<small>'+escapeHTML(insight.model)+'</small>')
  +panel('同标签型号对比',comparisonBars,'<small>提及率 · 点击查看评论</small>')+'</div>'+diagnostics(records, matches);
}
const consequenceRules = [
 ['反复操作', /(?:不得不|需要|必须|只好).{0,12}(?:反复|多次|再拖|来回|重新加水)|(?:拖|吸|擦)了[两三四五多][次遍]/],
 ['无法继续使用', /无法(?:继续)?使用|不能(?:继续)?使用|完全用不了|无法正常使用|没办法继续用/],
 ['送修', /送(?:去)?修(?:理|了|过)?|寄(?:去|回)维修|已寄修|送到了.{0,15}维修/],
 ['已退货或换货', /已(?:经)?(?:退货|换货)|退货了|换货了|退回了商品|给我换了(?:一台|新的)|我把.{0,15}退了/]
];
let diagnosticEvidence = new Map();

function diagnostics(records, matches) {
 const selected = records.filter(matches);
 diagnosticEvidence = new Map();
 const currentTag = insight.tag;
 const cooccurrences = new Map();
 for (const record of selected) {
  for (const tag of new Set(record.topics)) {
   if (tag === currentTag) continue;
   if (!cooccurrences.has(tag)) cooccurrences.set(tag, []);
   cooccurrences.get(tag).push(record);
  }
 }
 const pairs = [...cooccurrences].sort((a,b)=>b[1].length-a[1].length).slice(0,8);
 const consequences = consequenceRules.map(([name,pattern])=>[name,selected.filter(record=>
  record.kind !== '电商问答' && (record.title+' '+record.zh).split(/[。！？!?；;\n]/).some(clause=>
   pattern.test(clause) && !/如果|想要|打算|考虑|能否|希望|请问|没有送修|未送修|还没|尚未/.test(clause))
 )]);
 const channels = [...new Set(records.map(record=>record.platform))].map(name=>{
  const samples = records.filter(record=>record.platform===name);
  return [name,samples.filter(matches),samples.length];
 }).sort((a,b)=>b[1].length/b[2]-a[1].length/a[2] || b[2]-a[2]);
 const covered = new Set(consequences.flatMap(([,items])=>items.map(record=>record.id))).size;

 function barsWithEvidence(entries, prefix) {
  return entries.map(([name,items,denominator=selected.length],index)=>{
   const key = prefix+index;
   diagnosticEvidence.set(key,{name,items});
   const width = denominator ? 100*items.length/denominator : 0;
   return '<button class="bar-row insight-bar comparison-bar" data-evidence="'+key+'"><span>'+escapeHTML(name)
    +'</span><span class="bar-track"><span class="bar-fill" style="width:'+width+'%"></span></span><span>'
    +fmt(items.length)+' / '+fmt(denominator)+'</span></button>';
  }).join('');
 }
 const empty = '<div class="empty">当前筛选没有可展示的记录</div>';
 return '<div class="insight-selection">问题诊断 · '+escapeHTML(currentTag)+' · '+fmt(selected.length)+' 条匹配 VOC</div>'
  +'<div class="grid">'+panel('共现问题',barsWithEvidence(pairs,'pair')||empty,'<small>同一条 VOC 同时提及</small>')
  +panel('用户后果',barsWithEvidence(consequences,'effect')+'<p class="insight-help">规则提取 · '+covered+' / '+selected.length
   +' 条描述了可识别的后果。一条记录可有多种后果。</p>')+'</div>'
  +panel('渠道对比',barsWithEvidence(channels,'channel'),'<small>标签提及数 / 该渠道样本</small>')
  +'<div id="diagnosticEvidence" class="diagnostic-evidence" hidden></div>';
}
function insightTrend(records, matches, drill) {
 const observed = records.map(record=>record.month).filter(Boolean).sort();
 if (!observed.length) return '<div class="empty">当前样本没有日期</div>';
 const monthly = new Map();
 const cursor = new Date(observed[0]+'-01T00:00:00Z');
 while (cursor.toISOString().slice(0,7)<=observed.at(-1)) {
  monthly.set(cursor.toISOString().slice(0,7),{total:0,n:0});
  cursor.setUTCMonth(cursor.getUTCMonth()+1);
 }
 for (const record of records) {
  const month = monthly.get(record.month);
  if (!month) continue;
  month.total++;
  month.n += Number(matches(record));
 }
 const max = Math.max(1,...[...monthly.values()].map(month=>month.n));
 const step = 516/monthly.size;
 const y = rate => 142-116*rate;
 let line = '';
 let started = false;
 const points = [...monthly].map(([month,{total,n}],index)=>{
  const x = 35+(index+.5)*step;
  const label = month+' · '+n+'/'+total+' 条 · '+percent(n,total);
  const rateY = y(total?n/total:0);
  if(total) line += (started?' L':' M')+x+' '+rateY;
  started = total>0;
  const tick = index%Math.ceil(monthly.size/7)===0 || index===monthly.size-1;
  return '<g'+(total?drill(month)+' role="button" tabindex="0" aria-label="'+label+'"':'')+'><title>'+label+'</title>'
   +'<rect x="'+(x-step/2)+'" y="24" width="'+step+'" height="120" fill="transparent"/>'
   +'<rect x="'+(x-step*.28)+'" y="'+y(n/max)+'" width="'+step*.56+'" height="'+116*n/max+'" fill="#a4cbb8"/>'
   +(total?'<circle cx="'+x+'" cy="'+rateY+'" r="3" fill="#a85842"/>':'')
   +(tick?'<text x="'+x+'" y="163" text-anchor="middle">'+month.slice(2)+'</text>':'')+'</g>';
 }).join('');
 return '<div class="legend insight-trend-legend"><span><i></i>提及条数（左轴）</span><span><i class="red"></i>提及率（右轴）</span></div>'
  +'<svg class="chart insight-trend" viewBox="0 0 590 176" aria-label="按月提及条数与提及率">'
  +'<path d="M35 26H551 M35 142H551" stroke="#e5eae7" fill="none"/><text x="8" y="30">'+max+'</text>'
  +'<text x="8" y="145">0</text><text x="553" y="30">100%</text><text x="553" y="145">0%</text>'
  +points+'<path d="'+line+'" stroke="#a85842" stroke-width="2" fill="none" pointer-events="none"/></svg>';
}
function reviews(){const rows=reviewRows(),pages=Math.max(1,Math.ceil(rows.length/20));state.pageNo=Math.min(state.pageNo,pages);return (state.tag?'<div class="active-filter">当前标签 · '+escapeHTML(state.tag)+'<button id="clearTag">清除 ×</button></div>':'')+panel('评论工作台','<div class="search-row"><input id="search" type="search" placeholder="搜索评论、型号、标签或 VOC ID" value="'+escapeHTML(state.query)+'"><select id="sentiment"><option value="">全部标签方向</option><option value="negative">含负向标签</option><option value="positive">含正向标签</option><option value="unknown">无正负标签</option><option value="unmatched">无字典标签</option></select><select id="reviewFilter"><option value="">全部复核状态</option><option value="no">待复核</option><option value="yes">已复核</option></select></div>'+table(rows.slice((state.pageNo-1)*20,state.pageNo*20))+'<div class="pagination"><span>共 '+fmt(rows.length)+' 条 · 每页 20 条</span><div><button class="button" id="prev" '+(state.pageNo===1?'disabled':'')+'>上一页</button><span style="padding-top:10px">'+state.pageNo+' / '+pages+'</span><button class="button" id="next" '+(state.pageNo===pages?'disabled':'')+'>下一页</button></div></div>','<small>点击任意记录查看原文与编辑标签</small>');}
function actions(){return '<div class="notice">在评论详情中点击“加入行动跟进”，将用户反馈保存为待办。行动与标签修改保存在当前浏览器，可通过导出备份。</div>'+panel('行动跟进',tasks.length?tasks.map(t=>{const r=records.find(r=>r.id===t.id);return '<div class="task-card"><div><h3>'+escapeHTML(t.title)+'</h3><small>'+escapeHTML(r?.model||'')+' · '+escapeHTML(r?.platform||'')+' · <button class="panel-link" data-id="'+t.id+'">查看关联 VOC ↗</button></small></div><select data-task="'+t.id+'">'+['待处理','处理中','已完成'].map(s=>'<option '+(s===t.status?'selected':'')+'>'+s+'</option>').join('')+'</select></div>';}).join(''):'<div class="empty">暂未创建行动。打开一条评论，即可加入跟进。</div>','<small>'+tasks.length+' 项行动</small>');}
const domainQuestions = {
 A: '能不能完成清洁任务？',
 B: '用起来累不累、顺不顺手？',
 C: '会不会坏、能用多久？',
 D: '买得顺不顺、配件买得到吗？',
 E: '出问题后能否得到有效处理？',
 F: '宣传与实际体验一致吗？',
 G: '用户如何评价、推荐或信任品牌？',
 H: '竞品和品类有哪些机会？'
};

function dictionaryTree(rows = null) {
 const insights = rows !== null;
 const counts = entries => {
  const labels = new Set(entries.map(entry => entry['三级标签']));
  const has = (record, field) => record[field].some(label => labels.has(label));
  const total = rows.filter(record => has(record, 'topics')).length;
  const positive = rows.filter(record => has(record, 'positive')).length;
  const negative = rows.filter(record => has(record, 'negative')).length;
  return fmt(total)+' 条 · 正向 '+fmt(positive)+' · 负向 '+fmt(negative);
 };
 const domains = new Map();
 for (const entry of dictionary) {
  const code = entry['编码'];
  const domainCode = code[0];
  const groupName = entry['二级域'];
  const groupCode = domainCode === 'H' ? '' : code.slice(0, -2);
  if (!domains.has(domainCode)) domains.set(domainCode, {name:entry['一级域'], groups:new Map(), count:0});
  const domain = domains.get(domainCode);
  if (!domain.groups.has(groupName)) domain.groups.set(groupName, {code:groupCode, entries:[]});
  domain.groups.get(groupName).entries.push(entry);
  domain.count++;
 }
 return [...domains].map(([code,domain]) => {
  const groups = [...domain.groups].map(([groupName,group]) => {
   const groupCode = group.code;
   const leaves = group.entries.map(entry => {
    const fields = ['判定要点','正向表达示例','负向表达示例','默认责任域','默认严重度'];
    const details = fields.map(field => '<dt>'+field+'</dt><dd>'+escapeHTML(entry[field])+'</dd>').join('');
    return '<details class="tag-leaf" data-dictionary="'+escapeHTML(Object.values(entry).join(' '))+'">'
     +'<summary><code>'+escapeHTML(entry['编码'])+'</code>'+escapeHTML(entry['三级标签'])+(insights?'<small>'+counts([entry])+'</small>':'')+'</summary>'
     +'<dl>'+details+'</dl><button class="panel-link" data-tag="'+escapeHTML(entry['三级标签'])+'">查看相关 VOC ↗</button></details>';
   }).join('');
   return '<details class="tag-group"'+(groupCode==='A1'?' open':'')+'><summary>'+(groupCode?'<code>'+escapeHTML(groupCode)+'</code>':'')
    +escapeHTML(groupName)+'<small>'+(insights?counts(group.entries):group.entries.length+' 个三级码')+'</small></summary><div>'+leaves+'</div></details>';
  }).join('');
  return '<details class="tag-domain"'+(code==='A'?' open':'')+'><summary><code>'+escapeHTML(code)+'</code>'
   +'<span><strong>'+escapeHTML(domain.name)+'</strong><span class="domain-question">'+escapeHTML(domainQuestions[code])+'</span></span>'
   +'<small>'+(insights?counts([...domain.groups.values()].flatMap(group=>group.entries)):domain.groups.size+' 个二级域 · '+domain.count+' 个三级码')+'</small></summary><div>'+groups+'</div></details>';
 }).join('');
}

function filterDictionary() {
 const query = $('#dictionarySearch').value.trim().toLowerCase();
 let visible = 0;
 document.querySelectorAll('[data-dictionary]').forEach(leaf => {
  leaf.hidden = !leaf.dataset.dictionary.toLowerCase().includes(query);
  visible += Number(!leaf.hidden);
 });
 document.querySelectorAll('.tag-group, .tag-domain').forEach(branch => {
  branch.hidden = !branch.querySelector('[data-dictionary]:not([hidden])');
  if (query && !branch.hidden) branch.open = true;
  if (!query) branch.open = branch.matches('.tag-domain:first-child, .tag-group:first-child') &&
   branch.closest('.tag-domain') === $('.tag-domain');
 });
 $('#dictionaryCount').textContent = '共 '+visible+' 条';
}

function tags() {
 const groupCount = new Set(dictionary.map(entry => entry['编码'][0]+' '+entry['二级域'])).size;
 const domainCount = new Set(dictionary.map(entry => entry['编码'][0])).size;
 const severity = new Map();
 for (const entry of dictionary) {
  const level = entry['默认严重度'];
  severity.set(level, (severity.get(level) || 0) + 1);
 }
 const stats = [[domainCount,'一级域'],[groupCount,'二级域'],[dictionary.length,'三级码']];
 const counters = stats.map(([count,label]) => '<div><strong>'+count+'</strong><span>'+label+'</span></div>').join('');
 const levels = [...severity].sort().map(([level,count])=>escapeHTML(level==='-'?'不计':level)+' '+count).join(' · ');
 const owners = [...new Set(dictionary.map(entry=>entry['默认责任域']))].map(escapeHTML).join(' / ');
 return panel('VOC 标签字典 v0.1','<div class="taxonomy-stats">'+counters+'</div>'
  +'<p>默认严重度 · '+levels+'</p><p>默认责任域 · '+owners+'</p>'
  +'<div class="search-row"><input id="dictionarySearch" type="search" aria-label="搜索标签字典" placeholder="搜索编码、标签或关键词"><span id="dictionaryCount" aria-live="polite">共 '+dictionary.length+' 条</span></div>'
  +'<div class="taxonomy-tree">'+dictionaryTree()+'</div>', '', 'domain-overview');
}
function navigate(page){state.page=page;state.pageNo=1;render();}
function render(){const title={overview:['VOC 总览','连接用户反馈，发现产品体验中的机会。'],products:['产品洞察','比较型号体验，定位值得深入的问题与优势。'],reviews:['评论工作台','查阅原始反馈、核对标签，让洞察有据可循。'],actions:['行动跟进','将用户声音转化为可跟进的产品事项。'],tags:['标签管理','查看标签体系、数据来源与分析口径。']}[state.page];$('#pageTitle').textContent=title[0];$('#pageDesc').textContent=title[1];$('#crumb').textContent=navs.find(n=>n[0]===state.page)[1];document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===state.page));$('#content').innerHTML=({overview,products,reviews,actions,tags})[state.page]();if(state.page==='reviews'){$('#sentiment').value=state.sentiment;$('#reviewFilter').value=state.reviewed;}syncSelects();}
function annotationEvidence(record) {
 const annotations = (record.annotations || []).filter(item => {
  const label = byCode.get(item.code)?.['三级标签'];
  const field = {'正向':'positive','负向':'negative','主题':'topics'}[item.direction];
  return field && record[field].includes(label);
 });
 if (!annotations.length) return '<p>'+escapeHTML(record.status)+'</p>';
 return '<details><summary>查看自动标注依据</summary>'+annotations.map(item =>
  '<p><strong>'+escapeHTML(item.code+' '+item.direction)+'</strong> '+escapeHTML(item.evidence)+'</p>'
 ).join('')+'</details>';
}
function tagPicker(id, title, selected) {
 const options = dictionary.map(entry => {
  const code = entry['编码'];
  const name = entry['三级标签'];
  const path = entry['一级域']+' / '+entry['二级域'];
  return '<label class="picker-option"><input type="checkbox" value="'+escapeHTML(code)+'"'
   +(selected.includes(name)?' checked':'')+'><span><code>'+escapeHTML(code)+'</code> '
   +escapeHTML(name)+'<small>'+escapeHTML(path)+'</small></span></label>';
 }).join('');
 return '<div class="detail-block"><h3>'+title+'</h3><details class="tag-picker" id="'+id+'">'
  +'<summary>选择'+title+' <span class="picker-count">已选 '+selected.length+' 项</span></summary>'
  +'<div class="picker-body"><input type="search" aria-label="搜索'+title+'" placeholder="搜索编码、标签或分类">'
  +'<div class="picker-options">'+options+'</div><p class="picker-empty" hidden>没有匹配的标签</p></div></details></div>';
}

function drawer(id){const r=records.find(x=>x.id===id);if(!r)return;$('#overlay').hidden=false;$('#drawer').hidden=false;document.body.style.overflow='hidden';$('#drawer').innerHTML='<div class="drawer-head"><h2>VOC 详情</h2><button class="close" aria-label="关闭详情">×</button></div><div class="detail-meta"><span class="platform">'+escapeHTML(r.platform)+'</span><span class="tag">'+escapeHTML(r.model)+'</span><span class="tag">'+escapeHTML(r.kind)+'</span><span>'+escapeHTML(r.date||r.rawdate||'日期缺失')+'</span>'+(r.rating?'<span>☆ '+r.rating+' / 5</span>':'')+'</div><div class="detail-block"><h3>中文译文</h3><p>'+escapeHTML(r.zh)+'</p></div><div class="detail-block"><h3>用户原文</h3><p class="original">'+escapeHTML(r.text)+'</p></div>'+(r.answer?'<div class="detail-block"><h3>回答或官方回复</h3><p>'+escapeHTML(r.answer)+'</p></div>':'')+'<div class="detail-block"><h3>主题</h3>'+r.topics.map(t=>'<span class="tag">'+escapeHTML(byLabel.get(t)?.['编码']+' '+t)+'</span>').join('')+(r.unmapped.length?'<p>待复核旧标签 · '+escapeHTML(r.unmapped.join('、'))+'</p>':'')+annotationEvidence(r)+'</div>'+tagPicker('positiveEdit','正向标签',r.positive)+tagPicker('negativeEdit','负向标签',r.negative)+'<label style="font-size:11px;color:#6e8576"><input id="reviewEdit" type="checkbox" '+(r.reviewed?'checked':'')+'> 已人工复核</label><div class="drawer-actions"><button class="button primary" id="saveEdit">保存修改</button><button class="button" id="createTask">加入行动跟进</button>'+(safeURL(r.url)?'<a class="button" href="'+escapeHTML(r.url)+'" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>':'')+'</div><div class="detail-block"><h3>溯源信息</h3><div class="detail-source">'+escapeHTML(r.id)+'<br>型号依据 · '+escapeHTML(r.attribution)+'<br>'+escapeHTML(r.source)+'</div></div>';$('#saveEdit').onclick=()=>{const selected = id => [...document.querySelectorAll('#'+id+' input:checked')].map(option=>option.value);
const positive = selected('positiveEdit');
const negative = selected('negativeEdit');
const findEntry = label => byCode.get(label.toUpperCase()) || byLabel.get(label);
const invalid = [...positive,...negative].filter(label => !findEntry(label));
if(invalid.length){toast('字典中无此标签 · '+invalid.join('、'));return;}
const names = labels => [...new Set(labels.map(label => findEntry(label)['三级标签']))];
const edit={positive:names(positive),negative:names(negative),reviewed:$('#reviewEdit').checked,dictionaryVersion:'0.1'};
try{localStorage.setItem('dreame-voc-edits-v1',JSON.stringify({...saved,[r.id]:edit}));saved[r.id]=edit;Object.assign(r,migrateRecord({...sourceRecords.get(r.id),...edit}));render();toast('标签已保存，图表已更新');}catch{toast('浏览器存储不可用，修改未保存');}};$('#createTask').onclick=()=>{if(tasks.some(t=>t.id===r.id)){toast('这条 VOC 已加入行动跟进');return;}const task={id:r.id,title:r.negative[0]||r.topics[0]||'用户反馈跟进',status:'待处理'};try{localStorage.setItem('dreame-voc-tasks-v1',JSON.stringify([...tasks,task]));tasks.push(task);toast('已加入行动跟进');if(state.page==='actions')render();}catch{toast('浏览器存储不可用，行动未保存');}};}
function safeURL(s){try{return ['https:','http:'].includes(new URL(s).protocol);}catch{return false;}}
function close(){ $('#drawer').hidden=true;$('#overlay').hidden=true;document.body.style.overflow='';}
document.addEventListener('click',e=>{
 const evidence=e.target.closest('[data-evidence]');
 if(evidence){
  const {name,items}=diagnosticEvidence.get(evidence.dataset.evidence);
  const target=$('#diagnosticEvidence');
  target.hidden=false;
  target.innerHTML=panel(escapeHTML(name)+' · 对应评论',table(items),
   '<small>共 '+fmt(items.length)+' 条</small>');
  target.scrollIntoView({block:'start'});
  return;
 }
 const cell=e.target.closest('[data-insight-model]');
 if(cell){Object.assign(insight,{model:cell.dataset.insightModel,domain:cell.dataset.insightDomain,group:''});render();return;}
 const leaf=e.target.closest('[data-insight-tag]');
 if(leaf){insight.tag=leaf.dataset.insightTag;render();return;}
 const group=e.target.closest('[data-insight-group]');
 if(group){insight.group=group.dataset.insightGroup;render();return;}
const page=e.target.closest('[data-page]');if(page){navigate(page.dataset.page);if(page.dataset.page==='tags')$('.domain-overview').scrollIntoView({block:'start'});return;}const row=e.target.closest('[data-id]');if(row){drawer(row.dataset.id);return;}const tag=e.target.closest('[data-tag]');if(tag){if(tag.dataset.drillModel)$('#model').value=tag.dataset.drillModel;if(tag.dataset.drillMonth)$('#month').value=tag.dataset.drillMonth;if(state.page==='tags'){for(const id of ['kind','model','platform','month'])$('#'+id).value='';}state.query='';state.sentiment='';state.reviewed='';state.tag=tag.dataset.tag;state.direction=tag.dataset.direction||'';navigate('reviews');return;}const model=e.target.closest('[data-model]');if(model){$('#model').value=model.dataset.model;state.tag='';if(state.page==='products')render();else navigate('reviews');return;}if(e.target.closest('.close')||e.target===$('#overlay'))close();if(e.target.id==='clearTag'){state.tag='';render();}if(e.target.id==='prev'){state.pageNo--;render();}if(e.target.id==='next'){state.pageNo++;render();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if((e.key==='Enter'||e.key===' ')&&e.target.matches('.insight-trend [data-tag]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}if(e.key==='Enter'&&e.target.matches('tr[data-id]'))drawer(e.target.dataset.id);});
document.addEventListener('change',e=>{if(e.target.id==='insightMetric'){insight.metric=e.target.value;insight.group='';render();return;}if(e.target.matches('.filters select')){state.pageNo=1;render();}if(e.target.id==='sentiment'){state.sentiment=e.target.value;state.pageNo=1;render();}if(e.target.id==='reviewFilter'){state.reviewed=e.target.value;state.pageNo=1;render();}if(e.target.dataset.task){const next=tasks.map(t=>t.id===e.target.dataset.task?{...t,status:e.target.value}:t);try{localStorage.setItem('dreame-voc-tasks-v1',JSON.stringify(next));tasks=next;toast('行动状态已保存');}catch{toast('保存失败，请重试');render();}}});
document.addEventListener('input',e=>{
const picker = e.target.closest('.tag-picker');
if (picker && e.target.type === 'search') {
 const query = e.target.value.trim().toLowerCase();
 let matches = 0;
 for (const option of picker.querySelectorAll('.picker-option')) {
  option.hidden = !option.textContent.toLowerCase().includes(query);
  matches += Number(!option.hidden);
 }
 picker.querySelector('.picker-empty').hidden = matches > 0;
}
if (picker && e.target.type === 'checkbox') {
 picker.querySelector('.picker-count').textContent = '已选 '+picker.querySelectorAll('input:checked').length+' 项';
}
if(e.target.id==='dictionarySearch')filterDictionary();if(e.target.id==='search'){state.query=e.target.value;state.pageNo=1;render();$('#search').focus();}});
$('#reset').onclick=()=>{$('#kind').value='电商评论';$('#model').value='';$('#platform').value='';$('#month').value='';Object.assign(state,{tag:'',query:'',sentiment:'',reviewed:'',pageNo:1});render();};
$('#export').onclick=()=>{const rows=state.page==='reviews'?reviewRows():base();const body=JSON.stringify({exportedAt:new Date().toISOString(),filters:{kind:$('#kind').value,model:$('#model').value,platform:$('#platform').value,month:$('#month').value,tag:state.tag},dictionaryVersion:'0.1',records:rows.map(r=>({...r,tagCodes:Object.fromEntries(['positive','negative','topics'].map(key=>[key,r[key].map(name=>byLabel.get(name)['编码'])]))})),actions:tasks.filter(t=>rows.some(r=>r.id===t.id))},null,2);const a=document.createElement('a'),url=URL.createObjectURL(new Blob([body],{type:'application/json;charset=utf-8'}));a.href=url;a.download='dreame-voc-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出 '+rows.length+' 条记录及关联行动');};
render();
