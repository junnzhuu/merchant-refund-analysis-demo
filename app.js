const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const M = RefundModel;
const {DAY,CUTOFF,catalog,REFUND_TYPES,dayOffset,uniqueRecords,total,count,typeRows} = M;
const data=M.createData(),records=data.refunds,payments=data.payments;
const state={basis:'refund',period:'today',type:'all',metric:'amount',search:'',brand:'全部品牌',category:'全部类目',channel:'全部出价渠道',sort:'amount',expanded:new Set(['p0']),customStart:'2026-10-21',customEnd:'2026-10-27',...M.defaults()};
const money=c=> (c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const typeName=t=>({all:'全部退款',mid:'发货前退款',return:'发货后退货退款',only:'发货后仅退款'}[t]);
const metricName=()=>({amount:'退款金额',count:'退款订单数',rate:'退款率'}[state.metric]);
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
function metricCard(current,previous,type,allAmount,realtime) {
 const c=M.summarize(current,type),p=M.summarize(previous,type),share=type==='all'?(allAmount?'100%':'—'):amountShare(c.amount,allAmount);
 const compare=(metric)=>realtime?`<span class="change">昨日全天：<b>${previous.complete?(metric==='amount'?money(p.amount)+'元':p.count.toLocaleString()+'单'):'—'}</b></span>`:changeText(c[metric],p[metric],current.complete&&previous.complete);
 const rate=state.basis==='pay'?`<span class="metric-rate"><span><small>退款率</small><strong>${percentage(c.rate)}</strong></span>${realtime?`<span class="change">昨日全天：<b>${percentage(p.rate)}</b></span>`:changeText(c.rate,p.rate,current.complete&&previous.complete)}</span>`:'';
 return `<article class="metric-card ${state.type===type?'selected':''} ${state.basis==='pay'?'with-rate':''}"><button class="card-select" data-card="${type}" aria-pressed="${state.type===type}" aria-label="${typeName(type)}，查看趋势"><span class="metric-card-head"><span class="metric-label">${typeName(type)}</span><span class="amount-share" title="该类退款金额占全部退款金额的比例">金额占比 <b>${share}</b></span></span><span class="metric-content"><span class="metric-amount"><small>退款金额（元）</small><strong>${money(c.amount)}</strong>${compare('amount')}</span><span class="metric-count"><small>退款订单数</small><strong>${c.count.toLocaleString()}<em>单</em></strong>${compare('count')}</span></span>${rate}</button><button class="card-orders" data-card-orders="${type}" aria-label="查看${typeName(type)}订单">查看订单 <span>›</span></button></article>`;
}
function selectTrend(type){state.type=type;render()}
function render(){
 const period=M.getPeriod(state),cur=queryFor(period.current.start,period.current.end),prev=queryFor(period.previous.start,period.previous.end),rows=cur.refunds,[start,end]=range(),allAmount=total(rows);
 $('#dateRange').textContent=period.realtime?`${DAY} 00:00—14:30`:`${start} 至 ${end}`;
 $('#compareRange').textContent=`对比${period.realtime?'昨日全天':'上周期'}：${period.previous.start}${period.previous.start===period.previous.end?'':' 至 '+period.previous.end}`;
 const basisNote=state.basis==='refund'?'按退款成功时间统计，包含历史支付订单在所选时间内成功退款的数据。':'按支付时间归属，两期退款结果均截至 2026-10-28 14:30；历史数据持续回补，不同支付批次的退款观察时长不同。';
 $('#scopeNote').innerHTML='<span class="dot"></span>'+basisNote;
 $('#metrics').innerHTML=['all',...REFUND_TYPES].map((type,i)=>(i?`<span class="metric-operator" aria-hidden="true">${i===1?'＝':'＋'}</span>`:'')+metricCard(cur,prev,type,allAmount,period.realtime)).join('');
 $('#rateMetric').hidden=state.basis!=='pay';
 $$('#period button').forEach(b=>b.classList.toggle('on',b.dataset.period===state.period));
 $$('#metric button').forEach(b=>b.classList.toggle('on',b.dataset.metric===state.metric));
 $('#legendCurrent').textContent=`${period.realtime?'今日截至当前':'本期'} · ${typeName(state.type)}`;
 $('#legendPrevious').textContent=period.realtime?'昨日全天':'上周期';
 $('#chartCaption').textContent=period.realtime?`今日截至 14:30，昨日展示完整24小时${state.basis==='pay'?'；两批支付订单的退款结果均截至当前':''}`:state.basis==='pay'?'按支付日期归属；两期退款结果均截至 2026-10-28 14:30，后续持续回补':'本期与上周期按周期内第几天对齐；悬停查看实际日期';
 $('#reasonUnit').textContent='按退款金额';
 renderTrend(cur,prev);renderReasons(rows);renderProducts(rows);
 $$('[data-card]').forEach(b=>b.onclick=()=>selectTrend(b.dataset.card));
 $$('[data-card-orders]').forEach(b=>b.onclick=()=>{const type=b.dataset.cardOrders;openOrders(typeRows(rows,type),typeName(type)+' · 退款订单',type)});
}
function trendValue(value,reason){return value===null?(reason||'—'):state.metric==='amount'?money(value*100)+'元':state.metric==='rate'?percentage(value):value.toLocaleString()+'单'}
function renderTrend(current,previous){
 const series=M.buildTrend(data,state,{current,previous}),{labels,current:cur,previous:prev}=series;
 const values=[...cur,...prev].filter(v=>v!==null),max=Math.max(...values,state.metric==='rate'?.01:1);
 const step=state.metric==='amount'?Math.max(100,Math.ceil(max/4/100)*100):state.metric==='rate'?Math.max(.01,Math.ceil(max/4/.01)*.01):Math.max(1,Math.ceil(max/4));
 const upper=step*4,W=1500,H=220,L=64,R=15,T=20,B=32,x=i=>labels.length===1?(L+W-R)/2:L+i*(W-L-R)/(labels.length-1),y=v=>T+(H-T-B)*(1-v/upper);
 const path=arr=>{let active=false;return arr.map((v,i)=>{if(v===null){active=false;return ''}const s=`${active?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;active=true;return s}).join(' ')};
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${typeName(state.type)} · ${metricName()} · ${series.currentLabel}与${series.previousLabel}趋势"><text x="5" y="12" font-size="11" fill="#9ba1aa">${state.metric==='amount'?'单位：元':state.metric==='rate'?'单位：%':'单位：单'}</text>`;
 for(let i=0;i<=4;i++){const v=upper/4*i;svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#edf0f4" stroke-dasharray="4 4"/><text x="${L-15}" y="${y(v)+4}" text-anchor="end" fill="#999fa9" font-size="11">${state.metric==='rate'?(v*100).toFixed(0)+'%':v.toLocaleString()}</text>`}
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
 $('#reasons').innerHTML=top.map((g,i)=>`<button class="reason-row" data-reason="${g.key}"><span class="rank">${i+1}</span><span>${g.key}</span><span class="bar-track"><span class="bar-fill" style="width:${totalValue?value(g)/totalValue*100:0}%;display:block"></span></span><span class="num">${display(g)}</span><span class="percent">${totalValue?(value(g)/totalValue*100).toFixed(2)+'%':'—'}</span></button>`).join('')||'<div class="subnote">暂无数据</div>';
 $$('[data-reason]').forEach(b=>b.onclick=()=>openOrders(b.dataset.reason==='其他原因'?top[4].items:rows.filter(r=>r.reason===b.dataset.reason),b.dataset.reason+' · 退款订单'));
}
function pants(color){return `<svg viewBox="0 0 40 60" aria-hidden="true"><path d="M9 3L31 3 34 56 23 57 20 25 16 57 5 56Z" fill="${color}"/><path d="M9 5H31M20 5V25M12 9L10 16M28 9L30 16" fill="none" stroke="white" stroke-opacity=".23" stroke-width="1"/><path d="M10 20L9 53M29 20L30 53" stroke="black" stroke-opacity=".09" fill="none"/></svg>`}
function paidOrders(productId,sku=null){return queryFor(...range()).payments.filter(p=>p.product===productId&&(!sku||p.sku===sku)).length}
function paymentCells(items,productId,sku=null){if(state.basis!=='pay')return '';const paid=paidOrders(productId,sku);return `<td>${paid}</td><td>${paid?percentage(count(items)/paid):'—'}</td>`}
function renderProducts(rows){
 const table=$('.products table');table.classList.toggle('pay-table',state.basis==='pay');
 table.querySelector('thead').innerHTML=`<tr><th class="product-col">商品信息</th><th><button id="sortAmount" class="sort ${state.sort==='amount'?'active':''}">退款金额（元） ↓</button></th><th><button id="sortCount" class="sort ${state.sort==='count'?'active':''}">退款订单数 ↕</button></th>${state.basis==='pay'?'<th>支付订单数</th><th>退款率</th>':''}<th>金额占比</th><th>主要退款原因</th><th>操作</th></tr>`;
 $('.products .subtle').textContent=state.basis==='pay'?'退款率基于同批支付子订单，含未退款订单；结果截至 2026-10-28 14:30':'支持展开规格，定位具体退款商品';
 const groups=byGroup(rows,r=>r.product).sort((a,b)=>b[state.sort]-a[state.sort]);const amount=total(rows);
 $('#productRows').innerHTML=groups.map(g=>{const p=catalog.find(p=>p.id===g.key),reason=byGroup(g.items,r=>r.reason).sort((a,b)=>b.amount-a.amount)[0]?.key||'—';const skuRows=state.expanded.has(p.id)?byGroup(g.items,r=>r.sku).map(s=>`<tr class="sku-row"><td>└ ${s.key}</td><td>${money(s.amount)}</td><td>${s.count}</td>${paymentCells(s.items,p.id,s.key)}<td>${amount?(s.amount/amount*100).toFixed(2):'0.00'}%</td><td>${byGroup(s.items,r=>r.reason).sort((a,b)=>b.amount-a.amount)[0]?.key||'—'}</td><td><button class="text-btn" data-sku="${p.id}|${s.key}">查看订单</button></td></tr>`).join(''):'';return `<tr><td><div class="product-info"><div class="thumb">${pants(p.color)}</div><div><div class="product-name">${p.name}</div><div class="product-sub"><span>货号：${p.code}</span><button class="sku-toggle" data-expand="${p.id}">${state.expanded.has(p.id)?'收起':'展开'} SKU ${state.expanded.has(p.id)?'⌃':'⌄'}</button></div></div></div></td><td>${money(g.amount)}</td><td>${g.count}</td>${paymentCells(g.items,p.id)}<td>${amount?(g.amount/amount*100).toFixed(2):'0.00'}%</td><td>${reason}</td><td><button class="text-btn" data-product="${p.id}">查看订单</button></td></tr>${skuRows}`}).join('')||`<tr><td colspan="${state.basis==='pay'?8:6}" style="text-align:center;color:#a2a7af;height:120px">暂无符合条件的退款数据</td></tr>`;
 $('#totalProducts').textContent=`共 ${groups.length} 个商品`;
 $('#sortAmount').onclick=()=>{state.sort='amount';renderProducts(currentRows())};
 $('#sortCount').onclick=()=>{state.sort='count';renderProducts(currentRows())};
 $$('[data-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.expand;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);renderProducts(currentRows())});
 $$('[data-product]').forEach(b=>b.onclick=()=>openOrders(rows.filter(r=>r.product===b.dataset.product),catalog.find(p=>p.id===b.dataset.product).code+' · 退款订单'));
 $$('[data-sku]').forEach(b=>b.onclick=()=>{const[p,sku]=b.dataset.sku.split('|');openOrders(rows.filter(r=>r.product===p&&r.sku===sku),sku+' · 退款订单')});
}
let drawerRows=[],drawerType='all',drawerLabel='';
function openOrders(rows,title,type='all'){rows=uniqueRecords(rows);drawerRows=rows;drawerType=type;drawerLabel=title;$('#drawerTitle').textContent=title;const[start,end]=range();$('#drawerScope').textContent=`仅统计本商家订单 ｜ ${state.basis==='refund'?'按退款时间（退款成功）':'按支付时间'} ｜ ${start} 至 ${end} ｜ ${typeName(type)} ｜ ${title} ｜ 退款成功 ｜ 数据截至 ${CUTOFF}`;$('#drawerSummary').innerHTML=`<span>退款订单数 <b>${count(rows)}</b></span><span>退款金额（元） <b>${money(total(rows))}</b></span>`;$('#orderTable').innerHTML=`<table class="orders"><thead><tr><th>子订单号 / 售后单号</th><th>商品 / 规格</th><th>支付时间</th><th>退款成功时间</th><th>退款金额</th><th>退款类型</th><th>状态</th></tr></thead><tbody>${[...rows].sort((a,b)=>b.refundTime.localeCompare(a.refundTime)).slice(0,20).map(r=>{const p=catalog.find(p=>p.id===r.product);return `<tr><td>${r.subOrderId}<br><span style="color:#a4a8b0">${r.afterSale}</span></td><td class="order-product">${p.code}<br><span style="color:#a4a8b0">${r.sku}</span></td><td>${r.payTime.slice(0,10)}<br>${r.payTime.slice(11)}</td><td>${r.refundDate}<br>${r.refundTime.slice(11)}</td><td>${money(r.amount)}</td><td>${typeName(r.type)}</td><td><span class="success">退款成功</span></td></tr>`}).join('')}</tbody></table><div class="subnote">${rows.length>20?'当前预览前 20 条，导出可查看全部订单。':'已展示全部符合条件的订单。'}</div>`;$('#overlay').hidden=false;document.body.style.overflow='hidden'}
function closeOrders(){$('#overlay').hidden=true;document.body.style.overflow=''}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function download(name,rows){const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#basis').onchange=e=>{state.basis=e.target.value;if(state.basis==='refund'&&state.metric==='rate')state.metric='amount';render()};
$$('#period button').forEach(b=>b.onclick=()=>{const period=b.dataset.period;if(['calendar_day','calendar_week','calendar_month','custom'].includes(period)){choosePeriod(period);return}state.period=period;render()});
$$('#metric button').forEach(b=>b.onclick=()=>{state.metric=b.dataset.metric;render()});
$('#query').onclick=()=>{state.brand=$('#brandSelect').value;state.category=$('#categorySelect').value;state.channel=$('#channelSelect').value;state.search=$('#search').value.trim();render()};
$('#search').onkeydown=e=>{if(e.key==='Enter')$('#query').click()};
$('#reset').onclick=()=>{state.search='';state.category='全部类目';state.channel='全部出价渠道';state.brand='全部品牌';$('#search').value='';$('#categorySelect').selectedIndex=$('#channelSelect').selectedIndex=$('#brandSelect').selectedIndex=0;render()};
$('#showOrders').onclick=()=>openOrders(currentRows(),'退款订单明细');$('#closeDrawer').onclick=closeOrders;$('#overlay').onclick=e=>{if(e.target===$('#overlay'))closeOrders()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOrders()});
$('#definitions').onclick=()=>$('#help').showModal();$('#closeHelp').onclick=()=>$('#help').close();
$('#salesNav').onclick=()=>toast('当前为退款分析页面预览');
const exportMeta=(type='all')=>[['统计口径',state.basis==='refund'?'按退款成功时间':'按支付时间'],['统计时间',range().join(' 至 ')],['退款类型',typeName(type)],['商品搜索',state.search||'全部商品'],['数据截至',CUTOFF],['品牌/类目/出价渠道',`${state.brand}/${state.category}/${state.channel}`]];
function productExportRows(){const header=['商品名称','货号','规格','退款金额','退款订单数',...(state.basis==='pay'?['支付订单数','退款率']:[]),'金额占比','主要退款原因'],rows=currentRows(),all=total(rows),out=[];for(const g of byGroup(rows,r=>r.product)){const p=catalog.find(p=>p.id===g.key),write=(items,sku='全部规格')=>{const paid=paidOrders(p.id,sku==='全部规格'?null:sku),amount=total(items);out.push([p.name,p.code,sku,money(amount),count(items),...(state.basis==='pay'?[paid,paid?percentage(count(items)/paid):'—']:[]),amountShare(amount,all),byGroup(items,r=>r.reason).sort((a,b)=>b.amount-a.amount)[0]?.key||'—'])};write(g.items);for(const s of byGroup(g.items,r=>r.sku))write(s.items,s.key)}return[...exportMeta(),header,...out]}
$('#exportProducts').onclick=()=>download('退款商品分析_示例数据.csv',productExportRows());
$('#exportOrders').onclick=()=>download('退款订单明细_示例数据.csv',[...exportMeta(drawerType),['下钻范围',drawerLabel],['子订单号','售后单号','货号','规格','支付时间','退款成功时间','实际退款金额','退款类型','退款原因'],...drawerRows.map(r=>[r.subOrderId,r.afterSale,catalog.find(p=>p.id===r.product).code,r.sku,r.payTime,r.refundTime,money(r.amount),typeName(r.type),r.reason])]);
function choosePeriod(period){
 let d=$('#dateDialog');if(d)d.remove();d=document.createElement('dialog');d.id='dateDialog';
 const labels={calendar_day:'选择自然日',calendar_week:'选择自然周',calendar_month:'选择自然月',custom:'自定义时间'},yesterday=dayOffset(DAY,-1),latest=M.defaults();
 let fields=period==='calendar_day'?`<label for="periodDay">自然日</label><input type="date" id="periodDay" min="${M.SELECTABLE_START}" max="${yesterday}" value="${state.selectedDay}">`:period==='calendar_week'?`<label for="periodWeek">自然周</label><input type="week" id="periodWeek" min="2026-W02" max="${latest.selectedWeek}" value="${state.selectedWeek}">`:period==='calendar_month'?`<label for="periodMonth">自然月</label><input type="month" id="periodMonth" min="2026-01" max="${latest.selectedMonth}" value="${state.selectedMonth}">`:`<label for="startDate">起止日期</label><input type="date" id="startDate" min="${M.SELECTABLE_START}" max="${yesterday}" value="${state.customStart}"><span>至</span><input type="date" id="endDate" min="${M.SELECTABLE_START}" max="${yesterday}" value="${state.customEnd}">`;
 d.innerHTML=`<div class="dialog-head"><h2>${labels[period]}</h2><button class="close" id="cancelDates" aria-label="关闭日期选择">×</button></div><div class="date-fields">${fields}</div><div class="period-preview" id="periodPreview"></div><p class="date-help">仅支持已结束的周期，自然周为周一至周日。示例可选 2026-01-01 至 ${yesterday}；当前未结束的自然周、自然月不可选。</p><div class="dialog-actions"><button class="btn" id="cancelPeriod">取消</button><button class="btn primary" id="confirmDates">确定</button></div>`;
 document.body.appendChild(d);
 const candidate=()=>({...state,period,...(period==='calendar_day'?{selectedDay:$('#periodDay').value}:period==='calendar_week'?{selectedWeek:$('#periodWeek').value}:period==='calendar_month'?{selectedMonth:$('#periodMonth').value}:{customStart:$('#startDate').value,customEnd:$('#endDate').value})});
 const preview=()=>{const proposed=candidate(),error=M.validateSelection(proposed);if(error){$('#periodPreview').textContent=error;$('#periodPreview').classList.add('invalid');return}const p=M.getPeriod(proposed);$('#periodPreview').classList.remove('invalid');$('#periodPreview').innerHTML=`本期：${p.current.start} 至 ${p.current.end}<br>上周期：${p.previous.start} 至 ${p.previous.end}`};
 $$('#dateDialog input').forEach(i=>i.oninput=preview);preview();$('#cancelDates').onclick=$('#cancelPeriod').onclick=()=>d.close();
 $('#confirmDates').onclick=()=>{const proposed=candidate(),error=M.validateSelection(proposed);if(error){toast(error);return}Object.assign(state,proposed);d.close();render()};d.showModal();
}
render();
