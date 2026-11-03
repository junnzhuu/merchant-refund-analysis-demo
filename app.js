const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const M = RefundModel;
const {DAY,CUTOFF,catalog,uniqueRecords,total,count} = M;
const data=M.createData(),records=data.refunds,payments=data.payments;
const state={basis:'pay',period:'seven',type:'all',metric:'amount',productSearch:'',brand:'全部品牌',category:'全部类目',channel:'全部出价渠道',sort:'amount',productDirection:'desc',productPage:1,reasonType:'all',reasonLevel:'primary',reasonExpanded:new Set(),reasonSort:'amount',reasonDirection:'desc',expanded:new Set(),customStart:'2026-10-21',customEnd:'2026-10-27',...M.defaults()};
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
function queryFor(start,end){const signature=JSON.stringify([state.basis,state.period,state.selectedDay,state.selectedWeek,state.selectedMonth,state.customStart,state.customEnd,state.brand,state.category,state.channel]);if(signature!==queryCacheSignature){queryCacheSignature=signature;queryCache.clear()}const key=start+'|'+end;if(!queryCache.has(key))queryCache.set(key,M.query(data,state,{start,end}));return queryCache.get(key)}
function rowsFor(start,end){return queryFor(start,end).refunds}
function currentRows(){return rowsFor(...range())}
function byGroup(rows,fn){const map=new Map();for(const r of uniqueRecords(rows)){const key=fn(r);if(!map.has(key))map.set(key,[]);map.get(key).push(r)}return[...map].map(([key,items])=>({key,items,amount:total(items),count:count(items)}))}
function changeText(value,previous,complete=true){const c=M.change(value,previous,complete);return `<span class="change ${c.value>0?'rise':c.value<0?'fall':''}" title="${c.reason||'（本期值－上周期值）÷上周期值'}">较上周期 <b>${c.value===null?'—':(c.value>0?'+':'')+(c.value*100).toFixed(2)+'%'}</b></span>`}
const CARD_TYPES=['all','mid','only','return'];
const isRateMetric=metric=>metric==='rate'||metric==='amountRate';
const metricLabel=metric=>({amount:'退款金额',count:'退款订单数',rate:'订单退款率',amountRate:'金额退款率'}[metric]);
const infoIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.1"/><path d="M6.3 5.9a1.75 1.75 0 0 1 3.4.6c0 1.2-1.7 1.5-1.7 2.7M8 11.4h.01"/></svg>';
const refundTypeDefinitions={
 mid:'订单在所选时间口径下（支付时间/退款时间），所选时间范围内，商家还未发货，买家就产生了退款；或买家退款时间早于商家发货时间产生的退款金额。',
 only:'订单在所选时间口径下（支付时间/退款时间），所选时间范围内，商家已发货，买家无需退货就完成退款所产生的退款金额。',
 return:'订单在所选时间口径下（支付时间/退款时间），所选时间范围内，商家已发货，买家退回商品并完成退款所产生的退款金额。'
};
function definitionButton(type,metric,label){return `<span class="metric-definition-label">${label}<button type="button" class="metric-definition" data-definition="${type}|${metric}" aria-label="${label}指标释义" aria-describedby="metricTooltip">${infoIcon}</button></span>`}
function metricCard(current,previous,type,allAmount,realtime) {
 const c=M.summarize(current,type),p=M.summarize(previous,type),share=type==='all'?(allAmount?'100%':'—'):amountShare(c.amount,allAmount);
 const format=(value,metric)=>value===null?'—':metric==='amount'?'¥'+money(value):isRateMetric(metric)?percentage(value):value.toLocaleString();
 const compare=metric=>realtime?`<span class="change">昨日全天 <b>${previous.complete?format(p[metric],metric):'—'}</b></span>`:changeText(c[metric],p[metric],current.complete&&previous.complete);
 const cell=metric=>`<div class="metric-cell ${isRateMetric(metric)?'rate-cell':''} ${state.type===type&&state.metric===metric?'is-active':''}">${definitionButton(type,metric,metricLabel(metric))}<button class="metric-value ${metric==='amount'&&format(c.amount,metric).length>10?'long-value':''}" data-card-metric="${type}|${metric}" aria-label="查看${typeName(type)}${metricLabel(metric)}趋势" aria-pressed="${state.type===type&&state.metric===metric}"><strong>${format(c[metric],metric)}</strong>${compare(metric)}</button></div>`;
 const typeHelp=type==='all'?'':`<button type="button" class="metric-definition card-type-definition" data-definition="${type}|type" aria-label="${typeName(type)}说明" aria-describedby="metricTooltip">${infoIcon}</button>`;
 return `<article class="metric-card ${state.type===type?'selected':''} ${state.basis==='pay'?'with-rate':''}"><div class="metric-card-head"><div class="card-title"><button class="card-select" data-card="${type}" aria-pressed="${state.type===type}">${typeName(type)}</button>${typeHelp}</div><span class="amount-share">金额占比 <b>${share}</b></span></div><div class="metric-content">${cell('amount')}${cell('count')}</div>${state.basis==='pay'?`<div class="metric-rates">${cell('amountRate')}${cell('rate')}</div>`:''}</article>`;
}
function selectTrend(type,metric=state.metric){const active=document.activeElement,focusKey=active?.dataset.cardMetric,focusType=active?.dataset.card;state.type=type;state.metric=metric;render();const selector=focusKey?`[data-card-metric="${focusKey}"]`:focusType?`[data-card="${focusType}"]`:null;if(selector)$(selector)?.focus({preventScroll:true})}
let datePicker;
function render(){
 hideMetricTooltip();hideProductReasonTooltip();
 const period=M.getPeriod(state),cur=queryFor(period.current.start,period.current.end),prev=queryFor(period.previous.start,period.previous.end),rows=cur.refunds,allAmount=total(rows);
 $('#metrics').innerHTML=CARD_TYPES.map((type,i)=>(i?`<span class="metric-operator" aria-hidden="true">${i===1?'＝':'＋'}</span>`:'')+metricCard(cur,prev,type,allAmount,period.realtime)).join('');
 $('#rateMetric').hidden=$('#amountRateMetric').hidden=state.basis!=='pay';
 $$('#metric button').forEach(b=>b.classList.toggle('on',b.dataset.metric===state.metric));
 $$('.filter-field select').forEach(select=>{const active=select.selectedIndex>0;select.parentElement.classList.toggle('has-value',active);select.parentElement.querySelector('.filter-clear').hidden=!active});
 $('#downloadDetails').disabled=!rows.length;$('#downloadDetails').title=rows.length?'下载顶部筛选条件下的退款明细':'当前筛选条件下暂无可下载的退款明细';
 renderTrend(cur,prev);renderReasons(cur);renderProducts(cur);
 $$('[data-card]').forEach(b=>b.onclick=()=>selectTrend(b.dataset.card));
 $$('[data-card-metric]').forEach(b=>b.onclick=()=>{const[type,metric]=b.dataset.cardMetric.split('|');selectTrend(type,metric)});
 bindMetricTooltips();datePicker?.sync();
}
function trendValue(value,reason){return value===null?(reason||'—'):state.metric==='amount'?money(value*100)+'元':isRateMetric(state.metric)?percentage(value):value.toLocaleString()+'单'}
function renderTrend(current,previous){
 const series=M.buildTrend(data,state,{current,previous}),{labels,current:cur}=series;
 const values=cur.filter(v=>v!==null),max=Math.max(...values,isRateMetric(state.metric)?.01:1);
 const step=state.metric==='amount'?Math.max(100,Math.ceil(max/4/100)*100):isRateMetric(state.metric)?Math.max(.01,Math.ceil(max/4/.01)*.01):Math.max(1,Math.ceil(max/4));
 const upper=step*4,W=Math.max(800,Math.round($('#trend').getBoundingClientRect().width||1500)),H=280,L=64,R=16,T=24,B=40,x=i=>labels.length===1?(L+W-R)/2:L+i*(W-L-R)/(labels.length-1),y=v=>T+(H-T-B)*(1-v/upper);
 const path=arr=>{let active=false;return arr.map((v,i)=>{if(v===null){active=false;return ''}const s=`${active?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;active=true;return s}).join(' ')};
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${typeName(state.type)} · ${metricName()} · ${series.currentLabel}趋势"><text x="5" y="12" font-size="12" fill="var(--dw-color-chart-label)">${state.metric==='amount'?'单位：元':isRateMetric(state.metric)?'单位：%':'单位：单'}</text>`;
 for(let i=0;i<=4;i++){const v=upper/4*i;svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="var(--dw-color-chart-grid)" stroke-dasharray="4 4"/><text x="${L-15}" y="${y(v)+4}" text-anchor="end" fill="var(--dw-color-chart-label)" font-size="12">${isRateMetric(state.metric)?(v*100).toFixed(0)+'%':v.toLocaleString()}</text>`}
 svg+=`<path d="${path(cur)}" fill="none" stroke="var(--dw-color-chart-1)" stroke-width="2.3" stroke-linejoin="round"/>`;
 if(labels.length===1||cur.filter(v=>v!==null).length===1)cur.forEach((v,i)=>{if(v!==null)svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--dw-color-chart-1)" stroke="white" stroke-width="1.5"/>`});
 labels.forEach((label,i)=>{if(series.realtime?i%2===0||i===23:labels.length<=8||i%Math.ceil(labels.length/8)===0||i===labels.length-1)svg+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="var(--dw-color-chart-label)" font-size="12">${escapeHTML(label)}</text>`});
 if(series.realtime)svg+=`<line x1="${x(14)}" x2="${x(14)}" y1="${T}" y2="${H-B}" stroke="var(--dw-color-chart-reference)" stroke-dasharray="3 4"/><text x="${x(14)+8}" y="17" font-size="12" fill="var(--dw-color-chart-label)">更新至 14:30</text>`;
 labels.forEach((_,i)=>{const left=labels.length===1?L:i?((x(i-1)+x(i))/2):L,right=labels.length===1?W-R:i===labels.length-1?W-R:((x(i)+x(i+1))/2);svg+=`<rect class="trend-hit" data-trend-index="${i}" x="${left}" y="${T}" width="${Math.max(1,right-left)}" height="${H-T-B}" fill="transparent"><title>${escapeHTML(`${metricName()}\n${series.currentLabel} ${series.currentDates[i]||'无对应日期'}：${trendValue(cur[i],series.currentReasons[i])}`)}</title></rect>`});
 $('#trend').innerHTML=svg+'</svg><div class="trend-tooltip" id="trendTooltip" hidden></div>';
 $$('[data-trend-index]').forEach(hit=>{hit.onpointermove=e=>{const i=Number(hit.dataset.trendIndex),tip=$('#trendTooltip'),rect=$('#trend').getBoundingClientRect();tip.innerHTML=`<b>${metricName()}</b><div><i></i>${series.currentLabel} · ${series.currentDates[i]||'无对应日期'}<strong>${trendValue(cur[i],series.currentReasons[i])}</strong></div>`;tip.hidden=false;tip.style.left=Math.min(Math.max(0,e.clientX-rect.left+15),Math.max(0,rect.width-340))+'px';tip.style.top='15px'};hit.onpointerleave=()=>$('#trendTooltip').hidden=true});
}
const reasonMetricLabels={amountRate:'金额退款率',rate:'订单退款率',amount:'退款金额',count:'退款订单数'};
function renderReasons(result){
 const pay=state.basis==='pay',columns=pay?['amountRate','rate','amount','count']:['amount','count'];
 if(!columns.includes(state.reasonSort)){state.reasonSort='amount';state.reasonDirection='desc'}
 const direction=state.reasonDirection==='asc'?1:-1,hierarchy=M.summarizeReasonHierarchy({...result,refunds:M.typeRows(result.refunds,state.reasonType)});
 const sortRows=rows=>rows.sort((a,b)=>a[state.reasonSort]===null?(b[state.reasonSort]===null?0:1):b[state.reasonSort]===null?-1:(a[state.reasonSort]-b[state.reasonSort])*direction);
 const primary=state.reasonLevel==='primary',rows=sortRows(primary?hierarchy:hierarchy.flatMap(row=>row.children));
 const header=metric=>{const label=reasonMetricLabels[metric],active=state.reasonSort===metric,sort=active?state.reasonDirection:null;return `<th scope="col" class="reason-numeric" aria-sort="${sort==='asc'?'ascending':sort==='desc'?'descending':'none'}"><div class="reason-column-head"><button type="button" class="reason-sort ${active?'is-active':''}" data-reason-sort="${metric}" aria-label="按${label}${sort==='desc'?'升序':'降序'}排列">${label}<span class="reason-sort-icon ${sort||''}" aria-hidden="true"><i></i><i></i></span></button><button type="button" class="metric-definition reason-info" data-definition="reason|${metric}" aria-label="${label}指标释义" aria-describedby="metricTooltip">${infoIcon}</button></div></th>`};
 $('#reasons').classList.toggle('has-rates',pay);
 const cells=row=>columns.map(metric=>`<td data-reason-value="${metric}">${metric==='amount'?'¥'+money(row.amount):metric==='count'?row.count.toLocaleString():percentage(row[metric])}</td>`).join('');
 const childRow=(row,nested=false)=>`<tr class="${nested?'reason-child-row':'reason-detail-row'}" data-reason-level="2" data-parent-id="${row.parentId}"><th scope="row"><span class="reason-detail-name">${escapeHTML(row.reason)}</span>${nested?'':`<span class="reason-parent-name">${escapeHTML(row.parentReason)}</span>`}</th>${cells(row)}</tr>`;
 const body=rows.map(row=>{
  if(!primary)return childRow(row);
  const expanded=state.reasonExpanded.has(row.id);
  return `<tr class="reason-parent-row" data-reason-level="1"><th scope="row"><button type="button" class="reason-expand" data-reason-toggle="${row.id}" aria-expanded="${expanded}" aria-label="${expanded?'收起':'展开'}${escapeHTML(row.reason)}二级原因"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg><span>${escapeHTML(row.reason)}</span></button></th>${cells(row)}</tr>${expanded?sortRows(row.children).map(child=>childRow(child,true)).join(''):''}`;
 }).join('');
 $('#reasons').innerHTML=`<thead><tr><th scope="col">退款原因</th>${columns.map(header).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${columns.length+1}" class="reason-empty">暂无符合条件的退款数据</td></tr>`}</tbody>`;
 $('#reasonTotal').textContent=`共 ${rows.length} 个${primary?'一级':'二级'}原因`;
 $$('[data-reason-level-tab]').forEach(button=>{const selected=button.dataset.reasonLevelTab===state.reasonLevel;button.classList.toggle('on',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1});
 $('#reasonPanel').setAttribute('aria-labelledby',primary?'reasonPrimaryTab':'reasonSecondaryTab');
 $('#reasonNote').textContent=pay?'退款率以同批全部成交金额、成交订单数为分母':'按退款完成日期统计成功退款数据';
 $$('[data-reason-sort]').forEach(button=>button.onclick=()=>{const key=button.dataset.reasonSort;state.reasonDirection=state.reasonSort===key&&state.reasonDirection==='desc'?'asc':'desc';state.reasonSort=key;hideMetricTooltip();renderReasons(queryFor(...range()));bindMetricTooltips();$(`[data-reason-sort="${key}"]`).focus({preventScroll:true})});
 $$('[data-reason-toggle]').forEach(button=>button.onclick=()=>{const key=button.dataset.reasonToggle;state.reasonExpanded.has(key)?state.reasonExpanded.delete(key):state.reasonExpanded.add(key);hideMetricTooltip();renderReasons(queryFor(...range()));bindMetricTooltips();$(`[data-reason-toggle="${key}"]`).focus({preventScroll:true})});
}
function pants(color){return `<svg viewBox="0 0 40 60" aria-hidden="true"><path d="M9 3L31 3 34 56 23 57 20 25 16 57 5 56Z" fill="${color}"/><path d="M9 5H31M20 5V25M12 9L10 16M28 9L30 16" fill="none" stroke="white" stroke-opacity=".23" stroke-width="1"/><path d="M10 20L9 53M29 20L30 53" stroke="black" stroke-opacity=".09" fill="none"/></svg>`}
const productMetricLabels={amountRate:'金额退款率',rate:'订单退款率',amount:'退款金额',paidAmount:'用户支付金额',count:'退款订单数',paid:'支付订单数',reasons:'退款原因'};
const PRODUCT_PAGE_SIZE=5;
let productScopeSignature='',productReasonData=new Map();
function renderProducts(result){
 hideProductReasonTooltip();
 const scope=JSON.stringify([state.basis,result.range,state.brand,state.category,state.channel,state.productSearch]);
 if(scope!==productScopeSignature){state.productPage=1;productScopeSignature=scope}
 const pay=state.basis==='pay',columns=pay?['amountRate','rate','amount','paidAmount','count','paid']:['amount','paidAmount','count','paid'];
 if(!columns.includes(state.sort)){state.sort='amount';state.productDirection='desc'}
 const productResult=state.productSearch?{...result,refunds:result.refunds.filter(row=>M.matches(row,{search:state.productSearch},catalog)),payments:result.payments.filter(row=>M.matches(row,{search:state.productSearch},catalog))}:result;
 const ranking=M.summarizeProducts(productResult).slice(0,20),direction=state.productDirection==='asc'?1:-1;
 ranking.sort((a,b)=>a[state.sort]===null?(b[state.sort]===null?0:1):b[state.sort]===null?-1:(a[state.sort]-b[state.sort])*direction);
 const pageCount=Math.max(1,Math.ceil(ranking.length/PRODUCT_PAGE_SIZE));state.productPage=Math.min(Math.max(1,state.productPage),pageCount);
 const visible=ranking.slice((state.productPage-1)*PRODUCT_PAGE_SIZE,state.productPage*PRODUCT_PAGE_SIZE),table=$('.top-products-table');
 table.classList.toggle('has-rates',pay);productReasonData=new Map();
 $('#productColumns').innerHTML='<col class="col-product">'+columns.map(metric=>`<col class="col-${metric}">`).join('')+'<col class="col-reasons">';
 const info=metric=>`<button type="button" class="metric-definition product-info-button" data-definition="product|${metric}" aria-label="${productMetricLabels[metric]}指标释义" aria-describedby="metricTooltip">${infoIcon}</button>`;
 $('#productHeaders').innerHTML=`<tr><th scope="col">商品信息</th>${columns.map(metric=>{const active=state.sort===metric,sort=active?state.productDirection:null;return `<th scope="col" aria-sort="${sort==='asc'?'ascending':sort==='desc'?'descending':'none'}"><div class="product-column-head"><button type="button" class="product-sort ${active?'is-active':''}" data-product-sort="${metric}" aria-label="按${productMetricLabels[metric]}${sort==='desc'?'升序':'降序'}排列">${productMetricLabels[metric]}<span class="reason-sort-icon ${sort||''}" aria-hidden="true"><i></i><i></i></span></button>${info(metric)}</div></th>`}).join('')}<th scope="col"><div class="product-column-head product-reason-head">退款原因${info('reasons')}</div></th></tr>`;
 const metricCells=row=>columns.map(metric=>`<td data-product-value="${metric}">${metric==='amount'||metric==='paidAmount'?'¥'+money(row[metric]):isRateMetric(metric)?percentage(row[metric]):row[metric].toLocaleString()}</td>`).join('');
 const reasonsCell=(row,key,p,sku='')=>{productReasonData.set(key,{reasons:row.reasons,product:p,sku});return `<td class="product-reason-cell"><button type="button" class="product-reasons" data-product-reasons="${escapeHTML(key)}" aria-label="查看${sku?'该规格':'该商品'}全部退款原因" aria-describedby="productReasonsTooltip"><span>${escapeHTML(row.reasons.map(reason=>`${reason.reason}（${percentage(reason.amountShare)}）`).join(' ｜ '))||'—'}</span></button></td>`};
 $('#productRows').innerHTML=visible.map(row=>{const p=catalog.find(item=>item.id===row.product),expanded=state.expanded.has(p.id),skuRows=expanded?row.skus.map(sku=>`<tr class="sku-row" data-product-sku="${p.id}"><td>└ ${escapeHTML(sku.sku)}</td>${metricCells(sku)}${reasonsCell(sku,p.id+'|'+sku.sku,p,sku.sku)}</tr>`).join(''):'';return `<tr class="top-product-row" data-product-id="${p.id}"><td><div class="product-info"><div class="thumb">${pants(p.color)}</div><div class="top-product-description"><div class="product-name" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</div><div class="product-code">货号：${escapeHTML(p.code)}</div><div class="product-meta"><span>SPU ${p.spu}</span><button type="button" class="sku-toggle" data-expand="${p.id}" aria-expanded="${expanded}">${expanded?'收起':'展开'} SKU ${expanded?'⌃':'⌄'}</button></div></div></div></td>${metricCells(row)}${reasonsCell(row,p.id,p)}</tr>${skuRows}`}).join('')||`<tr><td colspan="${columns.length+2}" class="product-empty">暂无符合条件的退款商品</td></tr>`;
 $('#totalProducts').textContent=ranking.length?`共 ${ranking.length} 个商品，展示第 ${(state.productPage-1)*PRODUCT_PAGE_SIZE+1}–${Math.min(state.productPage*PRODUCT_PAGE_SIZE,ranking.length)} 个`:'共 0 个商品';
 $('#productPagination').innerHTML=`<button type="button" data-product-page="${state.productPage-1}" aria-label="上一页" ${state.productPage===1?'disabled':''}>‹</button>${Array.from({length:pageCount},(_,i)=>`<button type="button" class="${state.productPage===i+1?'current':''}" data-product-page="${i+1}" ${state.productPage===i+1?'aria-current="page"':''}>${i+1}</button>`).join('')}<button type="button" data-product-page="${state.productPage+1}" aria-label="下一页" ${state.productPage===pageCount?'disabled':''}>›</button><span class="product-page-size">${PRODUCT_PAGE_SIZE} 条/页</span>`;
 $$('[data-product-sort]').forEach(button=>button.onclick=()=>{const key=button.dataset.productSort;state.productDirection=state.sort===key&&state.productDirection==='desc'?'asc':'desc';state.sort=key;state.productPage=1;hideMetricTooltip();renderProducts(queryFor(...range()));bindMetricTooltips();$(`[data-product-sort="${key}"]`).focus({preventScroll:true})});
 $$('[data-expand]').forEach(button=>button.onclick=()=>{const key=button.dataset.expand;state.expanded.has(key)?state.expanded.delete(key):state.expanded.add(key);renderProducts(queryFor(...range()));bindMetricTooltips();$(`[data-expand="${key}"]`).focus({preventScroll:true})});
 $$('[data-product-page]').forEach(button=>button.onclick=()=>{state.productPage=Number(button.dataset.productPage);renderProducts(queryFor(...range()));bindMetricTooltips();$(`[data-product-page="${state.productPage}"].current`)?.focus({preventScroll:true})});
 bindProductReasonTips();
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function download(name,rows){const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#basis').onchange=e=>{state.basis=e.target.value;if(state.basis==='refund'&&isRateMetric(state.metric))state.metric='amount';render()};
$('#reasonType').onchange=e=>{state.reasonType=e.target.value;hideMetricTooltip();renderReasons(queryFor(...range()));bindMetricTooltips()};
 const selectReasonLevel=level=>{state.reasonLevel=level;hideMetricTooltip();renderReasons(queryFor(...range()));bindMetricTooltips()};
 $$('[data-reason-level-tab]').forEach(button=>{
  button.onclick=()=>selectReasonLevel(button.dataset.reasonLevelTab);
  button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const level=event.key==='Home'?'primary':event.key==='End'?'secondary':state.reasonLevel==='primary'?'secondary':'primary';selectReasonLevel(level);$(`[data-reason-level-tab="${level}"]`).focus({preventScroll:true})};
 });
$$('#metric button').forEach(b=>b.onclick=()=>{state.metric=b.dataset.metric;render()});
for(const [id,key] of [['brandSelect','brand'],['categorySelect','category'],['channelSelect','channel']]){
 const select=$('#'+id),clear=select.parentElement.querySelector('.filter-clear');
 const apply=()=>{state[key]=select.value;state.productPage=1;render()};
 select.onchange=apply;
 clear.onclick=()=>{select.selectedIndex=0;apply();select.focus({preventScroll:true})};
}
const applyProductSearch=()=>{state.productSearch=$('#productSearch').value.trim();state.productPage=1;hideMetricTooltip();renderProducts(queryFor(...range()));bindMetricTooltips()};
$('#productSearchForm').onsubmit=event=>{event.preventDefault();applyProductSearch()};
$('#productSearch').onsearch=applyProductSearch;
$('#definitions').onclick=()=>$('#help').showModal();$('#closeHelp').onclick=()=>$('#help').close();
$('#salesNav').onclick=()=>toast('当前为退款分析页面预览');
const exportMeta=(type='all')=>[['统计口径',state.basis==='refund'?'按退款成功时间':'按支付时间'],['统计时间',range().join(' 至 ')],['退款类型',typeName(type)],['商品范围','顶部筛选条件下的全部商品'],['退款观察期',state.basis==='pay'?'各订单支付后30天':'按退款完成日期统计'],['数据截至',CUTOFF],['品牌/类目/出价渠道',`${state.brand}/${state.category}/${state.channel}`]];
function detailExportRows(){
 const rows=uniqueRecords(currentRows()).sort((a,b)=>b.refundTime.localeCompare(a.refundTime));
 const header=['子订单号','售后单号','商品名称','货号','规格','品牌','类目','出价渠道','支付时间','退款成功时间','实际退款金额（元）','退款类型','一级退款原因','二级退款原因','状态'];
 return [...exportMeta(),['退款订单数',count(rows)],['退款金额（元）',money(total(rows))],[],header,...rows.map(r=>{const p=catalog.find(p=>p.id===r.product);return[r.subOrderId,r.afterSale,p.name,p.code,r.sku,p.brand||p.name.split(' ')[0],p.category,p.channel,r.payTime,r.refundTime,money(r.amount),typeName(r.type),M.REASON_GROUPS.find(group=>group.id===r.reasonGroup)?.name||'其他',r.reason,'退款成功']})];
}
$('#downloadDetails').onclick=()=>{const[start,end]=range();download(`退款明细_${state.basis==='pay'?'支付时间':'退款时间'}_${start}_${end}.csv`,detailExportRows())};
// Tooltip content follows the confirmed PRD; floating surface stays visible above cards.
const metricTooltip=document.createElement('div');metricTooltip.id='metricTooltip';metricTooltip.className='metric-tooltip';metricTooltip.role='tooltip';metricTooltip.hidden=true;document.body.appendChild(metricTooltip);
let tooltipAnchor=null,tooltipTimer;
function hideMetricTooltip(){clearTimeout(tooltipTimer);if(typeof metricTooltip!=='undefined'){metricTooltip.hidden=true;tooltipAnchor=null}}
function showMetricTooltip(anchor){
 hideProductReasonTooltip();clearTimeout(tooltipTimer);tooltipAnchor=anchor;const[type,metric]=anchor.dataset.definition.split('|');
 const reasonCopy={
  amountRate:{definition:'该原因退款金额（支付日）÷所选周期内全部成交金额。退款金额统计这批订单在各自支付后30天内因该原因成功退款的金额。',example:'10月1日成交金额为10,000元，这批订单在各自支付后30天内因“收到不合适”成功退款500元，该原因的金额退款率为5%。'},
  rate:{definition:'该原因退款订单数（支付日）÷所选周期内全部成交订单数。退款订单数统计这批订单在各自支付后30天内因该原因成功退款的子订单数。',example:'10月1日成交100单，这批订单在各自支付后30天内有5单因“收到不合适”成功退款，该原因的订单退款率为5%。'},
  amount:state.basis==='pay'?{definition:'统计所选周期内支付成功的订单，在各自支付后30天内因该原因成功退款的金额总和。',example:'选择10月1日，某笔订单当天支付、10月5日因“收到不合适”成功退款200元，这200元计入该原因在10月1日支付口径下的退款金额。'}:{definition:'统计所选周期内因该原因成功退款的金额总和，按退款完成日期统计。',example:'选择10月5日，某笔订单在10月1日支付、10月5日因“收到不合适”成功退款200元，这200元计入该原因在10月5日退款口径下的退款金额。'},
  count:state.basis==='pay'?{definition:'统计所选周期内支付成功的订单中，在各自支付后30天内因该原因成功退款的订单数，按子订单号去重。',example:'选择10月1日，某笔当天支付的子订单在10月5日因“收到不合适”分两笔成功退款，在该原因下仍计1单。'}:{definition:'统计所选周期内因该原因成功退款的订单数，按退款完成日期统计，按子订单号去重。',example:'选择10月5日，某笔子订单当天因“收到不合适”分两笔成功退款，在该原因下仍计1单。'}
 };
 const productCopy={
  amountRate:{definition:'该商品退款金额（支付日）÷该商品用户支付金额。退款统计所选周期内支付的订单，在各自支付后30天内成功退款的结果。',example:'10月1日该商品用户支付金额为10,000元，这批订单在各自支付后30天内成功退款1,000元，金额退款率为10%。'},
  rate:{definition:'该商品退款订单数（支付日）÷该商品支付订单数，按子订单号去重。退款统计这批订单在各自支付后30天内成功退款的结果。',example:'10月1日该商品支付100单，这批订单在各自支付后30天内有10单成功退款，订单退款率为10%。'},
  amount:state.basis==='pay'?{definition:'统计所选周期内支付的该商品订单，在各自支付后30天内成功退款的金额总和。',example:'选择10月1日，该商品某笔订单当天支付、10月5日成功退款200元，这200元计入10月1日支付口径的退款金额。'}:{definition:'统计所选周期内该商品成功退款的金额总和，按退款完成日期统计。',example:'选择10月5日，该商品某笔订单10月1日支付、10月5日成功退款200元，这200元计入10月5日退款口径的退款金额。'},
  paidAmount:{definition:'统计所选周期内该商品支付成功的金额总和，按支付完成日期统计，包含未退款订单。',example:'选择10月1日，该商品当天支付100单、合计10,000元，用户支付金额为10,000元。'},
  count:state.basis==='pay'?{definition:'统计所选周期内支付的该商品订单中，在各自支付后30天内成功退款的子订单数，按子订单号去重。',example:'选择10月1日，该商品某笔当天支付的子订单在10月5日分两笔成功退款，退款订单数仍计1单。'}:{definition:'统计所选周期内该商品成功退款的子订单数，按退款完成日期统计，按子订单号去重。',example:'选择10月5日，该商品某笔子订单当天分两笔成功退款，退款订单数仍计1单。'},
  paid:{definition:'统计所选周期内该商品支付成功的子订单数，按支付完成日期统计，包含未退款订单。',example:'选择10月1日，该商品当天支付100单，其中90单未退款，支付订单数仍为100单。'},
  reasons:{definition:'按各原因退款金额占该商品退款金额的比例降序展示。原因（占比）中的占比＝该原因退款金额÷该商品退款金额；悬浮可查看全部原因，规格行以该规格退款金额为分母。',example:'选择10月5日，该商品退款1,000元，其中“收到不合适”退款400元，展示为“收到不合适（40.00%）”。'}
 };
 const copy=metric==='type'?{definition:refundTypeDefinitions[type]}:type==='product'?productCopy[metric]:type==='reason'?reasonCopy[metric]:RefundMetricDefinitions[type][state.basis][metric];
 metricTooltip.innerHTML=metric==='type'?`<p>${escapeHTML(copy.definition)}</p>`:`<p><b>指标释义：</b>${escapeHTML(copy.definition)}</p><p><b>举例：</b>${escapeHTML(copy.example)}</p>`;
 metricTooltip.hidden=false;
 const r=anchor.getBoundingClientRect(),t=metricTooltip.getBoundingClientRect(),center=r.left+r.width/2;
 const left=Math.min(Math.max(12,center-t.width/2),innerWidth-t.width-12),above=r.top-t.height-10;
 const placement=above>=12?'top':'bottom',top=placement==='top'?above:r.bottom+10;
 metricTooltip.dataset.placement=placement;
 metricTooltip.style.left=left+'px';metricTooltip.style.top=Math.max(12,Math.min(top,innerHeight-t.height-12))+'px';
 metricTooltip.style.setProperty('--tooltip-arrow-x',Math.min(Math.max(14,center-left),t.width-14)+'px');
}
function bindMetricTooltips(){$$('[data-definition]').forEach(b=>{b.onpointerenter=()=>showMetricTooltip(b);b.onpointerleave=()=>{tooltipTimer=setTimeout(hideMetricTooltip,120)};b.onfocus=()=>showMetricTooltip(b);b.onblur=hideMetricTooltip;b.onclick=e=>{e.stopPropagation();showMetricTooltip(b)}})}
metricTooltip.onpointerenter=()=>clearTimeout(tooltipTimer);metricTooltip.onpointerleave=hideMetricTooltip;
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideMetricTooltip()});const repositionMetricTooltip=()=>{if(tooltipAnchor&&document.activeElement===tooltipAnchor)showMetricTooltip(tooltipAnchor);else hideMetricTooltip()};window.addEventListener('scroll',repositionMetricTooltip,true);window.addEventListener('resize',repositionMetricTooltip);
const productReasonTooltip=document.createElement('div');productReasonTooltip.id='productReasonsTooltip';productReasonTooltip.className='product-reasons-tooltip';productReasonTooltip.role='tooltip';productReasonTooltip.hidden=true;document.body.appendChild(productReasonTooltip);
let productReasonAnchor=null,productReasonTimer;
function hideProductReasonTooltip(){clearTimeout(productReasonTimer);if(typeof productReasonTooltip!=='undefined'){productReasonTooltip.hidden=true;productReasonAnchor=null}}
function showProductReasonTooltip(anchor){
 clearTimeout(productReasonTimer);hideMetricTooltip();productReasonAnchor=anchor;const item=productReasonData.get(anchor.dataset.productReasons);if(!item)return;
 productReasonTooltip.innerHTML=`<h4>全部退款原因</h4><div class="product-reasons-context">${escapeHTML(item.product.code)}${item.sku?' · '+escapeHTML(item.sku):''}</div><div class="product-reasons-list">${item.reasons.map(reason=>`<div><span>${escapeHTML(reason.reason)}</span><strong>${percentage(reason.amountShare)}</strong></div>`).join('')||'<p>暂无退款原因</p>'}</div><p class="product-reasons-note">占该${item.sku?'规格':'商品'}退款金额的比例</p>`;
 productReasonTooltip.hidden=false;const r=anchor.getBoundingClientRect(),t=productReasonTooltip.getBoundingClientRect();productReasonTooltip.style.left=Math.min(Math.max(12,r.left),innerWidth-t.width-12)+'px';productReasonTooltip.style.top=(r.bottom+10+t.height>innerHeight-12?Math.max(12,r.top-t.height-10):r.bottom+10)+'px';
}
function bindProductReasonTips(){$$('[data-product-reasons]').forEach(button=>{button.onpointerenter=()=>showProductReasonTooltip(button);button.onpointerleave=()=>{productReasonTimer=setTimeout(hideProductReasonTooltip,120)};button.onfocus=()=>showProductReasonTooltip(button);button.onblur=hideProductReasonTooltip;button.onclick=()=>showProductReasonTooltip(button)})}
productReasonTooltip.onpointerenter=()=>clearTimeout(productReasonTimer);productReasonTooltip.onpointerleave=hideProductReasonTooltip;
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideProductReasonTooltip()});
const repositionProductReasonTooltip=event=>{if(event?.target instanceof Element&&productReasonTooltip.contains(event.target))return;if(productReasonAnchor&&document.activeElement===productReasonAnchor)showProductReasonTooltip(productReasonAnchor);else hideProductReasonTooltip()};window.addEventListener('scroll',repositionProductReasonTooltip,true);window.addEventListener('resize',repositionProductReasonTooltip);
datePicker=RefundDatePicker.mount({trigger:$('#dateTrigger'),model:M,getState:()=>state,onApply:fields=>{Object.assign(state,fields);state.productPage=1;render()}});
render();

// Recalculate only the displayed SVG when its container changes width.
if (typeof ResizeObserver === 'function') {
 let chartWidth = 0;
 const chartResizeObserver = new ResizeObserver(entries => {
  const width = Math.round(entries[0].contentRect.width);
  if (width <= 0 || width === chartWidth) return;
  chartWidth = width;
  const period = M.getPeriod(state);
  renderTrend(queryFor(period.current.start,period.current.end),queryFor(period.previous.start,period.previous.end));
 });
 chartResizeObserver.observe($('#trend'));
}

// Keep the existing analytics DOM and state mounted while the shell changes views.
window.RefundAnalysisDemo = {
 getData:()=>data,
 applyScope(scope){
  Object.assign(state,scope,{type:'all',metric:'amount',productSearch:'',sort:'amount',productDirection:'desc',productPage:1,reasonType:'all',reasonLevel:'primary',reasonExpanded:new Set(),reasonSort:'amount',reasonDirection:'desc',expanded:new Set()});
  for(const [id,key] of [['basis','basis'],['brandSelect','brand'],['categorySelect','category'],['channelSelect','channel'],['reasonType','reasonType']])$('#'+id).value=state[key];
  $('#productSearch').value='';
  render();
 },
 suspend(){datePicker?.close();hideMetricTooltip();hideProductReasonTooltip();if($('#help').open)$('#help').close()},
 resume(){render()}
};
