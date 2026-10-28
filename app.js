const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const DAY = '2026-10-28', CUTOFF = '2026-10-28 14:30:00';
const catalog = [
  {id:'p0',spu:'1000398261',name:'FAESSLIN 秋冬宽松弯刀卫裤 男女同款',code:'K83736-服饰',category:'休闲裤',channel:'品牌直发',color:'#6d6c6c',count:15,cents:421800},
  {id:'p1',spu:'1000398278',name:'FAESSLIN 高腰灯芯绒直筒休闲裤 女款',code:'K1057-服饰',category:'休闲裤',channel:'品牌直发',color:'#8a847b',count:10,cents:289000},
  {id:'p2',spu:'1000398296',name:'FAESSLIN 复古灯芯绒弯刀长裤 女款',code:'K2585-服饰',category:'休闲裤',channel:'入仓',color:'#7e6b58',count:8,cents:214000},
  {id:'p3',spu:'1000398302',name:'FAESSLIN 美拉德直筒休闲裤 女款',code:'K1015R-服饰',category:'休闲裤',channel:'品牌直发',color:'#706151',count:6,cents:168000},
  {id:'p4',spu:'1000398355',name:'FAESSLIN 宽松垂感羊毛阔腿裤 男女同款',code:'K2730-服饰',category:'休闲裤',channel:'品牌直发',color:'#b3afa6',count:5,cents:145440},
  {id:'p5',spu:'1000398390',name:'FAESSLIN 复古水洗高腰微喇牛仔裤 女款',code:'K2925Q-服饰',category:'牛仔裤',channel:'现货',color:'#46546b',count:4,cents:130000}
];
function dayOffset(date,n){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function makeRecords(){const out=[];let serial=1;const todayHours=[1,0,1,0,0,0,1,2,3,4,5,6,8,10,7].flatMap((n,h)=>Array(n).fill(h));for(let n=-29;n<=0;n++){const date=dayOffset(DAY,n);let index=0;for(let p=0;p<catalog.length;p++){const item=catalog[p];const count=n===0?item.count:Math.max(2,Math.round(item.count*(.82+((n+30)*7%9)/20)));for(let j=0;j<count;j++,index++){const only=index%3===0;const hour=n===0?todayHours[(index*17)%48]:index%24;const minute=(index*11)%30;const lag=only&&index%4===0?0:2+index%6;const payDate=dayOffset(date,-lag);const payHour=lag===0?Math.max(0,hour-1):9+(index%10);const reason=only?['不喜欢或不想要','暂时不想要了','发货等待时间长'][j%3]:['尺码不合适','不喜欢或不想要','穿着效果不符','尺码不合适','货品质量问题'][j%5];out.push({id:'DE202610'+String(serial++).padStart(10,'0'),afterSale:'RE202610'+String(serial).padStart(9,'0'),product:item.id,sku:['灰色 / M','灰色 / L','黑色 / L'][j%3],type:only?'only':'return',stage:only?(index%2===0?'商家发货前':'查验及配送中'):'买家收货后',reason,amount:Math.round(item.cents/item.count),payDate,payTime:payDate+' '+String(payHour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00',refundDate:date,refundHour:hour,refundTime:date+' '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00'});}}}return out}
const records=makeRecords();
const state={basis:'refund',period:'today',type:'all',metric:'amount',search:'',brand:'全部品牌',category:'全部类目',channel:'全部出价渠道',sort:'amount',expanded:new Set(['p0']),customStart:'2026-10-21',customEnd:'2026-10-27'};
const money=c=> (c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const total=rows=>rows.reduce((s,r)=>s+r.amount,0);
const count=rows=>new Set(rows.map(r=>r.id)).size;
const typeName=t=>({all:'全部',only:'仅退款',return:'退货退款'}[t]);
function range(){return state.period==='today'?[DAY,DAY]:state.period==='seven'?[dayOffset(DAY,-6),DAY]:state.period==='thirty'?[dayOffset(DAY,-29),DAY]:[state.customStart,state.customEnd]}
function baseFilter(r){const p=catalog.find(p=>p.id===r.product);return(state.type==='all'||r.type===state.type)&&(state.category==='全部类目'||p.category===state.category)&&(state.channel==='全部出价渠道'||p.channel===state.channel)&&(!state.search||(p.name+p.code+p.spu).toLowerCase().includes(state.search.toLowerCase()))}
function rowsFor(start,end){return records.filter(r=>{const date=state.basis==='refund'?r.refundDate:r.payDate;return date>=start&&date<=end&&baseFilter(r)})}
function currentRows(){const [start,end]=range();return rowsFor(start,end)}
function compareRows(){const[start,end]=range();if(state.basis==='pay')return null;if(state.period==='today')return rowsFor(dayOffset(DAY,-1),dayOffset(DAY,-1)).filter(r=>r.refundTime.slice(11)<='14:30:00');const days=Math.round((new Date(end)-new Date(start))/86400000)+1;const prevEnd=dayOffset(end,-days);return rowsFor(dayOffset(start,-days),prevEnd).filter(r=>end!==DAY||r.refundDate!==prevEnd||r.refundTime.slice(11)<='14:30:00')}
function delta(now,prev){if(!prev)return '—';const x=(now-prev)/prev*100;return `<span class="${x>=0?'up':'down'}">${x>=0?'↑':'↓'} ${Math.abs(x).toFixed(2)}%</span>`}
function byGroup(rows,fn){const map=new Map();for(const r of rows){const key=fn(r);if(!map.has(key))map.set(key,[]);map.get(key).push(r)}return[...map].map(([key,items])=>({key,items,amount:total(items),count:count(items)}))}
function metricCard(label,value,foot,main=false,action='all'){return `<button class="metric-card ${main?'main':''}" data-card="${action}"><span class="metric-label">${label}<span class="info">?</span></span><div class="metric-value">${value}</div><div class="metric-foot">${foot}<span class="card-arrow">查看订单 ›</span></div></button>`}
function breakdownCard(label,rows,type){return `<button class="metric-card" data-card="${type}"><span class="metric-label">${label}<span class="info">?</span></span><div class="breakdown-values"><span><b>${count(rows)}</b><small>单</small></span><span><b>${money(total(rows))}</b><small>元</small></span></div><div class="metric-foot">已包含在全部退款中<span class="card-arrow">查看订单 ›</span></div></button>`}
function render(){
 const rows=currentRows(),comp=compareRows(),ret=rows.filter(r=>r.type==='return'),[start,end]=range();
 $('#dateRange').textContent=state.period==='today'?'2026-10-28 00:00—14:30':`${start} 至 ${end}`;
 $('#scopeNote').innerHTML=state.basis==='refund'?'<span class="dot"></span>按退款成功时间统计，包含历史支付订单在所选时间内成功退款的数据。':'<span class="dot"></span>按支付时间归属，统计该批支付订单截至 2026-10-28 14:30 的累计成功退款；历史支付日数据将持续回补。';
 const footCount=comp?`${state.period==='today'?'较昨日同时段':'较上一周期'} ${delta(count(rows),count(comp))}`:'截至当前累计，后续持续更新';
 const footAmount=comp?`${state.period==='today'?'较昨日同时段':'较上一周期'} ${delta(total(rows),total(comp))}`:'截至当前累计，后续持续更新';
 $('#metrics').className='metric-grid'+(state.type==='all'?'':' two');
 $('#metrics').innerHTML=metricCard('退款订单数',count(rows).toLocaleString(),footCount,true)+metricCard('退款金额（元）',money(total(rows)),footAmount,true)+(state.type==='all'?breakdownCard('仅退款',rows.filter(r=>r.type==='only'),'only')+breakdownCard('退货退款',ret,'return'):'');
 $('#compareLegend').hidden=!(state.basis==='refund'&&state.period==='today');
 $('#legendCurrent').textContent=state.period==='today'?'今日':(state.basis==='pay'?'所选支付日期':'所选退款日期');
 $('#chartCaption').textContent=state.basis==='pay'?'按支付时间归属；退款结果截至 2026-10-28 14:30，后续持续回补':state.period==='today'?'今日与昨日均统计至 14:30；未到时段不补零':'按退款成功日期展示，包含所选时间内实际发生的成功退款';
 $('#stageUnit').textContent=$('#reasonUnit').textContent=state.metric==='amount'?'按退款金额':'按退款订单数';
 renderTrend(rows,comp);renderBreakdowns(rows);renderProducts(rows);
 $$('[data-card]').forEach(b=>b.onclick=()=>{const type=b.dataset.card==='all'?state.type:b.dataset.card;openOrders(type==='all'?rows:rows.filter(r=>r.type===type),'退款订单明细',type)});
}
function renderTrend(rows,comp){
 const [start,end]=range(),isToday=state.period==='today';const labels=[];if(isToday){for(let h=0;h<=23;h++)labels.push(String(h).padStart(2,'0')+':00')}else{for(let d=start;d<=end;d=dayOffset(d,1))labels.push(d.slice(5).replace('-','.'))}
 const values=(set)=>labels.map((label,i)=>{if(isToday&&i>14)return null;const subset=set.filter(r=>isToday?(state.basis==='pay'?Number(r.payTime.slice(11,13)):r.refundHour)===i:(state.basis==='pay'?r.payDate:r.refundDate).slice(5).replace('-','.')===label);return state.metric==='amount'?total(subset)/100:count(subset)});
 const cur=values(rows),prev=comp&&isToday?values(comp):null;const all=cur.concat(prev||[]).filter(x=>x!==null);const max=Math.max(...all,1);const step=state.metric==='amount'?Math.max(100,Math.ceil(max/4/100)*100):Math.max(1,Math.ceil(max/4));const upper=step*4;const W=1500,H=220,L=64,R=15,T=20,B=32;const x=i=>labels.length===1?(L+W-R)/2:L+i*(W-L-R)/(labels.length-1),y=v=>T+(H-T-B)*(1-v/upper);
 const path=arr=>arr.map((v,i)=>v===null?'':`${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="退款${state.metric==='amount'?'金额':'订单数'}趋势"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8cc6c7" stop-opacity=".2"/><stop offset="100%" stop-color="#8cc6c7" stop-opacity="0"/></linearGradient></defs><text x="5" y="12" font-size="11" fill="#9ba1aa">${state.metric==='amount'?'单位：元':'单位：单'}</text>`;
 for(let i=0;i<=4;i++){const v=upper/4*i;svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#edf0f4" stroke-dasharray="4 4"/><text x="${L-15}" y="${y(v)+4}" text-anchor="end" fill="#999fa9" font-size="11">${v.toLocaleString()}</text>`}
 const last=cur.findLastIndex(x=>x!==null);svg+=`<path d="${path(cur)} L${x(last)},${H-B} L${L},${H-B}Z" fill="url(#area)"/>`;
 if(prev)svg+=`<path d="${path(prev)}" fill="none" stroke="#b7bec8" stroke-width="1.7" stroke-dasharray="6 5"/>`;
 svg+=`<path d="${path(cur)}" fill="none" stroke="#70b9ba" stroke-width="2.2" stroke-linejoin="round"/>`;
 if(labels.length===1)svg+=`<circle cx="${x(0)}" cy="${y(cur[0])}" r="4" fill="#70b9ba"/>`;
 labels.forEach((label,i)=>{if(isToday?i%2===0||i===23:labels.length<=8||i%Math.ceil(labels.length/8)===0||i===labels.length-1)svg+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="#999fa9" font-size="11">${label}</text>`});
 if(isToday)svg+=`<circle cx="${x(14)}" cy="${y(cur[14])}" r="3.5" fill="#70b9ba" stroke="white" stroke-width="2"/><line x1="${x(14)}" x2="${x(14)}" y1="${T}" y2="${H-B}" stroke="#c5dddd" stroke-dasharray="3 4"/><text x="${x(14)+8}" y="17" font-size="11" fill="#79a9aa">更新至 14:30</text>`;
 $('#trend').innerHTML=svg+'</svg>';
}
function renderBreakdowns(rows){
 const totalValue=state.metric==='amount'?total(rows):count(rows);const value=g=>state.metric==='amount'?g.amount:g.count;const display=g=>state.metric==='amount'?money(g.amount):g.count+' 单';
 const stageGroups=byGroup(rows,r=>r.stage);$('#stages').innerHTML=['商家发货前','查验及配送中','买家收货后'].map((s,i)=>{const g=stageGroups.find(g=>g.key===s)||{amount:0,count:0};return `<button class="stage-row" data-stage="${s}"><span>${s}</span><span class="bar-track"><span class="bar-fill ${i===1?'secondary':i===2?'third':''}" style="width:${totalValue?value(g)/totalValue*100:0}%;display:block"></span></span><span class="num">${display(g)}</span><span class="percent">${totalValue?(value(g)/totalValue*100).toFixed(1):'0.0'}%</span></button>`}).join('');
 const reasons=byGroup(rows,r=>r.reason).sort((a,b)=>value(b)-value(a));const top=reasons.slice(0,5);if(reasons.length>5){const items=[...top[4].items,...reasons.slice(5).flatMap(g=>g.items)];top[4]={key:'其他原因',items,amount:total(items),count:count(items),other:true}}
 $('#reasons').innerHTML=top.map((g,i)=>`<button class="reason-row" data-reason="${g.key}"><span class="rank">${i+1}</span><span>${g.key}</span><span class="bar-track"><span class="bar-fill" style="width:${totalValue?value(g)/totalValue*100:0}%;display:block"></span></span><span class="num">${display(g)}</span><span class="percent">${totalValue?(value(g)/totalValue*100).toFixed(1):'0.0'}%</span></button>`).join('')||'<div class="subnote">暂无数据</div>';
 $$('[data-stage]').forEach(b=>b.onclick=()=>openOrders(rows.filter(r=>r.stage===b.dataset.stage),b.dataset.stage+' · 退款订单'));
 $$('[data-reason]').forEach(b=>b.onclick=()=>openOrders(b.dataset.reason==='其他原因'?top[4].items:rows.filter(r=>r.reason===b.dataset.reason),b.dataset.reason+' · 退款订单'));
}
function pants(color){return `<svg viewBox="0 0 40 60" aria-hidden="true"><path d="M9 3L31 3 34 56 23 57 20 25 16 57 5 56Z" fill="${color}"/><path d="M9 5H31M20 5V25M12 9L10 16M28 9L30 16" fill="none" stroke="white" stroke-opacity=".23" stroke-width="1"/><path d="M10 20L9 53M29 20L30 53" stroke="black" stroke-opacity=".09" fill="none"/></svg>`}
function paidOrders(productId,sku=null){const p=catalog.findIndex(p=>p.id===productId);const bases=[64,52,43,35,29,24];let n=0;const[start,end]=range();for(let d=start;d<=end;d=dayOffset(d,1)){let v=bases[p]+Number(d.slice(-2))%7;if(d===DAY)v=Math.round(v*.62);if(sku){const k=['灰色 / M','灰色 / L','黑色 / L'].indexOf(sku);v=Math.floor(v/3)+(k<v%3?1:0)}n+=v}return n}
function paymentCells(items,productId,sku=null){if(state.basis!=='pay')return '';const paid=paidOrders(productId,sku);const rate=range()[0]===DAY&&range()[1]===DAY?'—':(count(items)/paid*100).toFixed(2)+'%';return `<td>${paid}</td><td>${rate}</td>`}
function renderProducts(rows){
 const table=$('.products table');table.classList.toggle('pay-table',state.basis==='pay');
 table.querySelector('thead').innerHTML=`<tr><th class="product-col">商品信息</th><th><button id="sortAmount" class="sort ${state.sort==='amount'?'active':''}">退款金额（元） ↓</button></th><th><button id="sortCount" class="sort ${state.sort==='count'?'active':''}">退款订单数 ↕</button></th>${state.basis==='pay'?'<th>支付订单数</th><th>累计退款率</th>':''}<th>金额占比</th><th>主要退款原因</th><th>操作</th></tr>`;
 $('.products .subtle').textContent=state.basis==='pay'?'累计退款率基于同批支付订单，结果截至当前；今日暂不展示退款率':'支持展开规格，定位具体退款商品';
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
function openOrders(rows,title,type=state.type){drawerRows=rows;drawerType=type;drawerLabel=title;$('#drawerTitle').textContent=title;const[start,end]=range();$('#drawerScope').textContent=`仅统计本商家订单 ｜ ${state.basis==='refund'?'按退款时间（退款成功）':'按支付时间'} ｜ ${start} 至 ${end} ｜ ${typeName(type)} ｜ ${title} ｜ 退款成功 ｜ 数据截至 ${CUTOFF}`;$('#drawerSummary').innerHTML=`<span>退款订单数 <b>${count(rows)}</b></span><span>退款金额（元） <b>${money(total(rows))}</b></span>`;$('#orderTable').innerHTML=`<table class="orders"><thead><tr><th>销售订单号 / 售后单号</th><th>商品 / 规格</th><th>支付时间</th><th>退款成功时间</th><th>退款金额</th><th>退款方式</th><th>状态</th></tr></thead><tbody>${[...rows].sort((a,b)=>b.refundTime.localeCompare(a.refundTime)).slice(0,20).map(r=>{const p=catalog.find(p=>p.id===r.product);return `<tr><td>${r.id}<br><span style="color:#a4a8b0">${r.afterSale}</span></td><td class="order-product">${p.code}<br><span style="color:#a4a8b0">${r.sku}</span></td><td>${r.payTime.slice(0,10)}<br>${r.payTime.slice(11)}</td><td>${r.refundDate}<br>${r.refundTime.slice(11)}</td><td>${money(r.amount)}</td><td>${typeName(r.type)}</td><td><span class="success">退款成功</span></td></tr>`}).join('')}</tbody></table><div class="subnote">${rows.length>20?'当前预览前 20 条，导出可查看全部订单。':'已展示全部符合条件的订单。'}</div>`;$('#overlay').hidden=false;document.body.style.overflow='hidden'}
function closeOrders(){$('#overlay').hidden=true;document.body.style.overflow=''}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function download(name,rows){const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#basis').onchange=e=>{state.basis=e.target.value;render()};
$$('#period button').forEach(b=>b.onclick=()=>{if(b.dataset.period==='custom'){customDate();return}state.period=b.dataset.period;$$('#period button').forEach(x=>x.classList.toggle('on',x===b));render()});
$$('#type button').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;$$('#type button').forEach(x=>x.classList.toggle('on',x===b));render()});
$$('#metric button').forEach(b=>b.onclick=()=>{state.metric=b.dataset.metric;$$('#metric button').forEach(x=>x.classList.toggle('on',x===b));render()});
$('#query').onclick=()=>{state.brand=$('#brandSelect').value;state.category=$('#categorySelect').value;state.channel=$('#channelSelect').value;state.search=$('#search').value.trim();render()};
$('#search').onkeydown=e=>{if(e.key==='Enter')$('#query').click()};
$('#reset').onclick=()=>{state.search='';state.category='全部类目';state.channel='全部出价渠道';state.brand='全部品牌';$('#search').value='';$('#categorySelect').selectedIndex=$('#channelSelect').selectedIndex=$('#brandSelect').selectedIndex=0;render()};
$('#sortAmount').onclick=()=>{state.sort='amount';$('#sortAmount').classList.add('active');$('#sortCount').classList.remove('active');renderProducts(currentRows())};
$('#sortCount').onclick=()=>{state.sort='count';$('#sortCount').classList.add('active');$('#sortAmount').classList.remove('active');renderProducts(currentRows())};
$('#showOrders').onclick=()=>openOrders(currentRows(),'退款订单明细');$('#closeDrawer').onclick=closeOrders;$('#overlay').onclick=e=>{if(e.target===$('#overlay'))closeOrders()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOrders()});
$('#definitions').onclick=()=>$('#help').showModal();$('#closeHelp').onclick=()=>$('#help').close();
$('#salesNav').onclick=()=>toast('当前为退款分析页面预览');
const exportMeta=(type=state.type)=>[['统计口径',state.basis==='refund'?'按退款成功时间':'按支付时间'],['统计时间',range().join(' 至 ')],['退款方式',typeName(type)],['数据截至',CUTOFF],['品牌/类目/出价渠道',`${state.brand}/${state.category}/${state.channel}`]];
$('#exportProducts').onclick=()=>download('退款商品分析_示例数据.csv',[...exportMeta(),['商品名称','货号','退款金额','退款订单数'],...byGroup(currentRows(),r=>r.product).map(g=>{const p=catalog.find(p=>p.id===g.key);return[p.name,p.code,money(g.amount),g.count]})]);
$('#exportOrders').onclick=()=>download('退款订单明细_示例数据.csv',[...exportMeta(drawerType),['下钻范围',drawerLabel],['销售订单号','售后单号','货号','规格','支付时间','退款成功时间','实际退款金额','退款方式','退款原因'],...drawerRows.map(r=>[r.id,r.afterSale,catalog.find(p=>p.id===r.product).code,r.sku,r.payTime,r.refundTime,money(r.amount),typeName(r.type),r.reason])]);
function customDate(){let d=$('#dateDialog');if(!d){d=document.createElement('dialog');d.id='dateDialog';d.innerHTML='<div class="dialog-head"><h2>自定义时间</h2><button class="close" id="cancelDates">×</button></div><div class="filter-row"><input type="date" id="startDate" min="2026-09-29" max="2026-10-28"><span>至</span><input type="date" id="endDate" min="2026-09-29" max="2026-10-28"><button class="btn primary" id="confirmDates">确定</button></div>';document.body.appendChild(d);$('#cancelDates').onclick=()=>d.close();$('#confirmDates').onclick=()=>{if(!$('#startDate').value||!$('#endDate').value){toast('请选择完整的起止日期');return}if($('#startDate').value>$('#endDate').value){toast('开始日期不能晚于结束日期');return}state.customStart=$('#startDate').value;state.customEnd=$('#endDate').value;state.period='custom';$$('#period button').forEach(x=>x.classList.toggle('on',x.dataset.period==='custom'));d.close();render()}}$('#startDate').value=state.customStart;$('#endDate').value=state.customEnd;d.showModal()}
render();
