const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const M = RefundModel;
const {DAY,CUTOFF,catalog,uniqueRecords,total,count} = M;
const data=M.createData(),records=data.refunds,payments=data.payments;
const state={basis:'refund',period:'today',type:'all',metric:'amount',search:'',brand:'全部品牌',category:'全部类目',channel:'全部出价渠道',sort:'amount',expanded:new Set(['p0']),customStart:'2026-10-21',customEnd:'2026-10-27',...M.defaults()};
const money=c=> (c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const typeName=t=>({all:'全部退款',mid:'发货前退款',return:'发货后退货退款',only:'发货后仅退款'}[t]);
const metricName=()=>({amount:'退款金额',count:'退款订单数',rate:'订单退款率',amountRate:'金额退款率'}[state.metric]);
const amountShare=(amount,allAmount)=>allAmount?(amount/allAmount*100).toFixed(2)+'%':'—';
const percentage=n=>n===null?'—':(n*100).toFixed(2)+'%';
const escapeHTML=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function range(){const r=M.getPeriod(state).current;return[r.start,r.end]}
function baseFilter(r){return M.matches(r,state,catalog)}
// Reuse one coherent pair of period queries while only card/metric/sort state changes.
let queryCacheSignature='',queryCache=new Map();
function queryFor(start,end){const signature=JSON.stringify([state.basis,state.period,state.selectedDay,state.selectedWeek,state.selectedMonth,state.customStart,state.customEnd,state.brand,state.category,state.channel,state.search]);if(signature!==queryCacheSignature){queryCacheSignature=signature;queryCache.clear()}const key=start+'|'+end;if(!queryCache.has(key))queryCache.set(key,M.query(data,state,{start,end}));return queryCache.get(key)}
function rowsFor(start,end){return queryFor(start,end).refunds}
function currentRows(){return rowsFor(...range())}
function byGroup(rows,fn){const map=new Map();for(const r of uniqueRecords(rows)){const key=fn(r);if(!map.has(key))map.set(key,[]);map.get(key).push(r)}return[...map].map(([key,items])=>({key,items,amount:total(items),count:count(items)}))}
function changeText(value,previous,complete=true){const c=M.change(value,previous,complete);return `<span class="change ${c.value>0?'rise':c.value<0?'fall':''}" title="${c.reason||'（本期值－上周期值）÷上周期值'}">较上周期 <b>${c.value===null?'—':(c.value>0?'+':'')+(c.value*100).toFixed(2)+'%'}</b></span>`}
const CARD_TYPES=['all','mid','only','return'];
const isRateMetric=metric=>metric==='rate'||metric==='amountRate';
const metricLabel=metric=>({amount:'退款金额（元）',count:'退款订单数',rate:'订单退款率',amountRate:'金额退款率'}[metric]);
const infoIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.1"/><path d="M8 7v4M8 4.5v.4"/></svg>';
function definitionButton(type,metric,label){return `<button type="button" class="metric-definition" data-definition="${type}|${metric}" aria-describedby="metricTooltip">${label}${infoIcon}</button>`}
function metricCard(current,previous,type,allAmount,realtime) {
 const c=M.summarize(current,type),p=M.summarize(previous,type),share=type==='all'?(allAmount?'100%':'—'):amountShare(c.amount,allAmount);
 const format=(value,metric)=>value===null?'—':metric==='amount'?money(value):isRateMetric(metric)?percentage(value):value.toLocaleString();
 const compare=metric=>realtime?`<span class="change">昨日全天 <b>${previous.complete?format(p[metric],metric):'—'}</b></span>`:changeText(c[metric],p[metric],current.complete&&previous.complete);
 const cell=metric=>`<div class="metric-cell ${isRateMetric(metric)?'rate-cell':''} ${state.type===type&&state.metric===metric?'is-active':''}">${definitionButton(type,metric,metricLabel(metric))}<button class="metric-value ${metric==='amount'&&money(c.amount).length>10?'long-value':''}" data-card-metric="${type}|${metric}" aria-label="查看${typeName(type)}${metricLabel(metric)}趋势" aria-pressed="${state.type===type&&state.metric===metric}"><strong>${format(c[metric],metric)}${metric==='count'?'<em>单</em>':''}</strong>${compare(metric)}</button></div>`;
 return `<article class="metric-card ${state.type===type?'selected':''} ${state.basis==='pay'?'with-rate':''}"><div class="metric-card-head"><button class="card-select" data-card="${type}" aria-pressed="${state.type===type}">${typeName(type)}</button><span class="amount-share">${definitionButton(type,'share','金额占比')} <b>${share}</b></span></div><div class="metric-content">${cell('amount')}${cell('count')}</div>${state.basis==='pay'?`<div class="metric-rates">${cell('amountRate')}${cell('rate')}</div>`:''}</article>`;
}
function selectTrend(type,metric=state.metric){const active=document.activeElement,focusKey=active?.dataset.cardMetric,focusType=active?.dataset.card;state.type=type;state.metric=metric;render();const selector=focusKey?`[data-card-metric="${focusKey}"]`:focusType?`[data-card="${focusType}"]`:null;if(selector)$(selector)?.focus({preventScroll:true})}
let datePicker;
function render(){
 hideMetricTooltip();
 const period=M.getPeriod(state),cur=queryFor(period.current.start,period.current.end),prev=queryFor(period.previous.start,period.previous.end),rows=cur.refunds,[start,end]=range(),allAmount=total(rows);
 const comparison=period.realtime?'昨日全天':period.partial?'上周期同进度':'上周期';
 $('#compareRange').textContent=`对比${comparison}：${period.previous.start}${period.previous.start===period.previous.end?'':' 至 '+period.previous.end}`;
 $('#scopeNote').textContent=state.basis==='refund'?'按退款完成日期统计成功退款数据':'按支付日期统计，退款观察期为各订单支付后30天';
 $('#updated').textContent=`更新至 ${CUTOFF.replace('T',' ')}`;
 $('#metrics').innerHTML=CARD_TYPES.map((type,i)=>(i?`<span class="metric-operator" aria-hidden="true">${i===1?'＝':'＋'}</span>`:'')+metricCard(cur,prev,type,allAmount,period.realtime)).join('');
 $('#rateMetric').hidden=$('#amountRateMetric').hidden=state.basis!=='pay';
 $$('#metric button').forEach(b=>b.classList.toggle('on',b.dataset.metric===state.metric));
 $('#legendCurrent').textContent=period.realtime?'今日截至当前':'本期';
 $('#legendPrevious').textContent=comparison;
 $('#trendSelection').textContent=`${typeName(state.type)} / ${metricName()}`;
 $('#chartCaption').textContent=period.realtime?`今日截至 14:30，对比昨日完整24小时${state.basis==='pay'?'；退款按各订单支付后30天统计':''}`:state.basis==='pay'?`${start} 至 ${end}支付订单，在各自支付后30天内的成功退款；未满30天的数据持续更新`:'横轴为本周期日期，上周期按对应进度对齐；悬停查看两期实际日期';
 $('#reasonUnit').textContent='按退款金额';
 $('#downloadDetails').disabled=!rows.length;$('#downloadDetails').title=rows.length?'下载当前筛选条件下的退款明细':'当前筛选条件下暂无可下载的退款明细';
 renderTrend(cur,prev);renderReasons(rows);renderProducts(rows);
 $$('[data-card]').forEach(b=>b.onclick=()=>selectTrend(b.dataset.card));
 $$('[data-card-metric]').forEach(b=>b.onclick=()=>{const[type,metric]=b.dataset.cardMetric.split('|');selectTrend(type,metric)});
 bindMetricTooltips();datePicker?.sync();
}
function trendValue(value,reason){return value===null?(reason||'—'):state.metric==='amount'?money(value*100)+'元':isRateMetric(state.metric)?percentage(value):value.toLocaleString()+'单'}
function renderTrend(current,previous){
 const series=M.buildTrend(data,state,{current,previous}),{labels,current:cur,previous:prev}=series;
 const values=[...cur,...prev].filter(v=>v!==null),max=Math.max(...values,isRateMetric(state.metric)?.01:1);
 const step=state.metric==='amount'?Math.max(100,Math.ceil(max/4/100)*100):isRateMetric(state.metric)?Math.max(.01,Math.ceil(max/4/.01)*.01):Math.max(1,Math.ceil(max/4));
 const upper=step*4,W=1500,H=220,L=64,R=15,T=20,B=32,x=i=>labels.length===1?(L+W-R)/2:L+i*(W-L-R)/(labels.length-1),y=v=>T+(H-T-B)*(1-v/upper);
 const path=arr=>{let active=false;return arr.map((v,i)=>{if(v===null){active=false;return ''}const s=`${active?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;active=true;return s}).join(' ')};
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${typeName(state.type)} · ${metricName()} · ${series.currentLabel}与${series.previousLabel}趋势"><text x="5" y="12" font-size="11" fill="#9ba1aa">${state.metric==='amount'?'单位：元':isRateMetric(state.metric)?'单位：%':'单位：单'}</text>`;
 for(let i=0;i<=4;i++){const v=upper/4*i;svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#edf0f4" stroke-dasharray="4 4"/><text x="${L-15}" y="${y(v)+4}" text-anchor="end" fill="#999fa9" font-size="11">${isRateMetric(state.metric)?(v*100).toFixed(0)+'%':v.toLocaleString()}</text>`}
 svg+=`<path d="${path(prev)}" fill="none" stroke="#9aaebe" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"/><path d="${path(cur)}" fill="none" stroke="#70b9ba" stroke-width="2.3" stroke-linejoin="round"/>`;
 [prev,cur].forEach((a,k)=>{if(labels.length===1||a.filter(v=>v!==null).length===1)a.forEach((v,i)=>{if(v!==null)svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${k?'#70b9ba':'#9aaebe'}" stroke="white" stroke-width="1.5"/>`})});
 labels.forEach((label,i)=>{if(series.realtime?i%2===0||i===23:labels.length<=8||i%Math.ceil(labels.length/8)===0||i===labels.length-1)svg+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="#999fa9" font-size="11">${escapeHTML(label)}</text>`});
 if(series.realtime)svg+=`<line x1="${x(14)}" x2="${x(14)}" y1="${T}" y2="${H-B}" stroke="#c5dddd" stroke-dasharray="3 4"/><text x="${x(14)+8}" y="17" font-size="11" fill="#79a9aa">更新至 14:30</text>`;
 labels.forEach((_,i)=>{const left=labels.length===1?L:i?((x(i-1)+x(i))/2):L,right=labels.length===1?W-R:i===labels.length-1?W-R:((x(i)+x(i+1))/2);svg+=`<rect class="trend-hit" data-trend-index="${i}" x="${left}" y="${T}" width="${Math.max(1,right-left)}" height="${H-T-B}" fill="transparent"><title>${escapeHTML(`${metricName()}\n${series.currentLabel} ${series.currentDates[i]||'无对应日期'}：${trendValue(cur[i],series.currentReasons[i])}\n${series.previousLabel} ${series.previousDates[i]||'无对应日期'}：${trendValue(prev[i],series.previousReasons[i])}`)}</title></rect>`});
 $('#trend').innerHTML=svg+'</svg><div class="trend-tooltip" id="trendTooltip" hidden></div>';
 $$('[data-trend-index]').forEach(hit=>{hit.onpointermove=e=>{const i=Number(hit.dataset.trendIndex),tip=$('#trendTooltip'),rect=$('#trend').getBoundingClientRect();tip.innerHTML=`<b>${metricName()}</b><div><i></i>${series.currentLabel} · ${series.currentDates[i]||'无对应日期'}<strong>${trendValue(cur[i],series.currentReasons[i])}</strong></div><div class="previous"><i></i>${series.previousLabel} · ${series.previousDates[i]||'无对应日期'}<strong>${trendValue(prev[i],series.previousReasons[i])}</strong></div>`;tip.hidden=false;tip.style.left=Math.min(Math.max(0,e.clientX-rect.left+15),Math.max(0,rect.width-340))+'px';tip.style.top='15px'};hit.onpointerleave=()=>$('#trendTooltip').hidden=true});
}
function renderReasons(rows){
 const totalValue=total(rows),value=g=>g.amount,display=g=>money(g.amount);
 const reasons=byGroup(rows,r=>r.reason).sort((a,b)=>value(b)-value(a));const top=reasons.slice(0,5);if(reasons.length>5){const items=[...top[4].items,...reasons.slice(5).flatMap(g=>g.items)];top[4]={key:'其他原因',items,amount:total(items),count:count(items),other:true}}
 $('#reasons').innerHTML=top.map((g,i)=>`<div class="reason-row"><span class="rank">${i+1}</span><span>${g.key}</span><span class="bar-track"><span class="bar-fill" style="width:${totalValue?value(g)/totalValue*100:0}%;display:block"></span></span><span class="num">${display(g)}</span><span class="percent">${totalValue?(value(g)/totalValue*100).toFixed(2)+'%':'—'}</span></div>`).join('')||'<div class="subnote">暂无数据</div>';
}
function pants(color){return `<svg viewBox="0 0 40 60" aria-hidden="true"><path d="M9 3L31 3 34 56 23 57 20 25 16 57 5 56Z" fill="${color}"/><path d="M9 5H31M20 5V25M12 9L10 16M28 9L30 16" fill="none" stroke="white" stroke-opacity=".23" stroke-width="1"/><path d="M10 20L9 53M29 20L30 53" stroke="black" stroke-opacity=".09" fill="none"/></svg>`}
function paidOrders(productId,sku=null){return queryFor(...range()).payments.filter(p=>p.product===productId&&(!sku||p.sku===sku)).length}
function paymentCells(items,productId,sku=null){if(state.basis!=='pay')return '';const paid=paidOrders(productId,sku);return `<td>${paid}</td><td>${paid?percentage(count(items)/paid):'—'}</td>`}
function renderProducts(rows){
 const table=$('.products table');table.classList.toggle('pay-table',state.basis==='pay');
 table.querySelector('thead').innerHTML=`<tr><th class="product-col">商品信息</th><th><button id="sortAmount" class="sort ${state.sort==='amount'?'active':''}">退款金额（元） ↓</button></th><th><button id="sortCount" class="sort ${state.sort==='count'?'active':''}">退款订单数 ↕</button></th>${state.basis==='pay'?'<th>支付订单数</th><th>订单退款率</th>':''}<th>金额占比</th><th>主要退款原因</th></tr>`;
 $('.products .subtle').textContent=state.basis==='pay'?'订单退款率基于同批支付子订单，含未退款订单；退款按支付后30天统计':'支持展开规格，定位具体退款商品';
 const groups=byGroup(rows,r=>r.product).sort((a,b)=>b[state.sort]-a[state.sort]);const amount=total(rows);
 $('#productRows').innerHTML=groups.map(g=>{const p=catalog.find(p=>p.id===g.key),reason=byGroup(g.items,r=>r.reason).sort((a,b)=>b.amount-a.amount)[0]?.key||'—';const skuRows=state.expanded.has(p.id)?byGroup(g.items,r=>r.sku).map(s=>`<tr class="sku-row"><td>└ ${s.key}</td><td>${money(s.amount)}</td><td>${s.count}</td>${paymentCells(s.items,p.id,s.key)}<td>${amount?(s.amount/amount*100).toFixed(2):'0.00'}%</td><td>${byGroup(s.items,r=>r.reason).sort((a,b)=>b.amount-a.amount)[0]?.key||'—'}</td></tr>`).join(''):'';return `<tr><td><div class="product-info"><div class="thumb">${pants(p.color)}</div><div><div class="product-name">${p.name}</div><div class="product-sub"><span>货号：${p.code}</span><button class="sku-toggle" data-expand="${p.id}">${state.expanded.has(p.id)?'收起':'展开'} SKU ${state.expanded.has(p.id)?'⌃':'⌄'}</button></div></div></div></td><td>${money(g.amount)}</td><td>${g.count}</td>${paymentCells(g.items,p.id)}<td>${amount?(g.amount/amount*100).toFixed(2):'0.00'}%</td><td>${reason}</td></tr>${skuRows}`}).join('')||`<tr><td colspan="${state.basis==='pay'?7:5}" style="text-align:center;color:#a2a7af;height:120px">暂无符合条件的退款数据</td></tr>`;
 $('#totalProducts').textContent=`共 ${groups.length} 个商品`;
 $('#sortAmount').onclick=()=>{state.sort='amount';renderProducts(currentRows())};
 $('#sortCount').onclick=()=>{state.sort='count';renderProducts(currentRows())};
 $$('[data-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.expand;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);renderProducts(currentRows())});
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function download(name,rows){const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#basis').onchange=e=>{state.basis=e.target.value;if(state.basis==='refund'&&isRateMetric(state.metric))state.metric='amount';render()};
$$('#metric button').forEach(b=>b.onclick=()=>{state.metric=b.dataset.metric;render()});
$('#query').onclick=()=>{state.brand=$('#brandSelect').value;state.category=$('#categorySelect').value;state.channel=$('#channelSelect').value;state.search=$('#search').value.trim();render()};
$('#search').onkeydown=e=>{if(e.key==='Enter')$('#query').click()};
$('#reset').onclick=()=>{state.search='';state.category='全部类目';state.channel='全部出价渠道';state.brand='全部品牌';$('#search').value='';$('#categorySelect').selectedIndex=$('#channelSelect').selectedIndex=$('#brandSelect').selectedIndex=0;render()};
$('#definitions').onclick=()=>$('#help').showModal();$('#closeHelp').onclick=()=>$('#help').close();
$('#salesNav').onclick=()=>toast('当前为退款分析页面预览');
const exportMeta=(type='all')=>[['统计口径',state.basis==='refund'?'按退款成功时间':'按支付时间'],['统计时间',range().join(' 至 ')],['退款类型',typeName(type)],['商品搜索',state.search||'全部商品'],['退款观察期',state.basis==='pay'?'各订单支付后30天':'按退款完成日期统计'],['数据截至',CUTOFF],['品牌/类目/出价渠道',`${state.brand}/${state.category}/${state.channel}`]];
function detailExportRows(){
 const rows=uniqueRecords(currentRows()).sort((a,b)=>b.refundTime.localeCompare(a.refundTime));
 const header=['子订单号','售后单号','商品名称','货号','规格','品牌','类目','出价渠道','支付时间','退款成功时间','实际退款金额（元）','退款类型','退款原因','状态'];
 return [...exportMeta(),['退款订单数',count(rows)],['退款金额（元）',money(total(rows))],[],header,...rows.map(r=>{const p=catalog.find(p=>p.id===r.product);return[r.subOrderId,r.afterSale,p.name,p.code,r.sku,p.brand||p.name.split(' ')[0],p.category,p.channel,r.payTime,r.refundTime,money(r.amount),typeName(r.type),r.reason,'退款成功']})];
}
$('#downloadDetails').onclick=()=>{const[start,end]=range();download(`退款明细_${state.basis==='pay'?'支付时间':'退款时间'}_${start}_${end}.csv`,detailExportRows())};
// Tooltip content follows the confirmed PRD; floating surface stays visible above cards.
const metricTooltip=document.createElement('div');metricTooltip.id='metricTooltip';metricTooltip.className='metric-tooltip';metricTooltip.role='tooltip';metricTooltip.hidden=true;document.body.appendChild(metricTooltip);
let tooltipAnchor=null,tooltipTimer;
function hideMetricTooltip(){clearTimeout(tooltipTimer);if(typeof metricTooltip!=='undefined'){metricTooltip.hidden=true;tooltipAnchor=null}}
function showMetricTooltip(anchor){
 clearTimeout(tooltipTimer);tooltipAnchor=anchor;const[type,metric]=anchor.dataset.definition.split('|');
 const copy=metric==='share'?{definition:'该类退款金额 ÷ 全部退款金额。用于查看不同退款类型的金额构成。',example:type==='all'?'选择10月5日，全部退款金额1,000元，全部退款金额占比为100%。':`选择10月5日，全部退款金额1,000元，其中${typeName(type)}200元，该类退款金额占比为20%。`}:RefundMetricDefinitions[type][state.basis][metric];
 metricTooltip.innerHTML=`<h4>${typeName(type)} · ${metric==='share'?'金额占比':metricLabel(metric)}</h4><b>指标释义</b><p>${escapeHTML(copy.definition)}</p><b>举例</b><p>${escapeHTML(copy.example)}</p>`;
 metricTooltip.hidden=false;const r=anchor.getBoundingClientRect(),t=metricTooltip.getBoundingClientRect(),left=Math.min(Math.max(12,r.left),innerWidth-t.width-12);let top=r.bottom+10;if(top+t.height>innerHeight-12)top=Math.max(12,r.top-t.height-10);metricTooltip.style.left=left+'px';metricTooltip.style.top=top+'px';
}
function bindMetricTooltips(){$$('[data-definition]').forEach(b=>{b.onpointerenter=()=>showMetricTooltip(b);b.onpointerleave=()=>{tooltipTimer=setTimeout(hideMetricTooltip,120)};b.onfocus=()=>showMetricTooltip(b);b.onblur=hideMetricTooltip;b.onclick=e=>{e.stopPropagation();showMetricTooltip(b)}})}
metricTooltip.onpointerenter=()=>clearTimeout(tooltipTimer);metricTooltip.onpointerleave=hideMetricTooltip;
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideMetricTooltip()});const repositionMetricTooltip=()=>{if(tooltipAnchor&&document.activeElement===tooltipAnchor)showMetricTooltip(tooltipAnchor);else hideMetricTooltip()};window.addEventListener('scroll',repositionMetricTooltip,true);window.addEventListener('resize',repositionMetricTooltip);
datePicker=RefundDatePicker.mount({trigger:$('#dateTrigger'),model:M,getState:()=>state,onApply:fields=>{Object.assign(state,fields);render()}});
render();
