(function (root, factory) {
  const api = factory(typeof window !== 'undefined' ? new Date() : null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RefundModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (now) {
  'use strict';
  // The browser demo follows Beijing time; Node fixtures retain their reproducible clock.
  const beijingClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23'
  });
  function hourlyCutoff(time) {
    const {year, month, day, hour} = Object.fromEntries(
      beijingClock.formatToParts(time).map(part => [part.type, part.value])
    );
    return `${year}-${month}-${day} ${hour}:00:00`;
  }
  let CUTOFF = now ? hourlyCutoff(now) : '2026-11-02 14:30:00';
  let DAY = CUTOFF.slice(0,10);
  const REFUND_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const SELECTABLE_START = '2026-01-01', DATA_START = '2025-01-01';
  const REFUND_TYPES = ['mid', 'transit', 'return'];
  const REFUND_TYPE_LABELS = {all:'全部 退款',mid:'发货前 退款',transit:'未收货 退款',return:'已收货 退货退款'};
  function normalizeRefundType(type) {
    return type === 'only' ? 'return' : type;
  }
  const SKUS = ['灰色 / M', '灰色 / L', '黑色 / L'];
  // Display taxonomy observed in the Douyin refund-analysis page on 2026-11-03.
  // Names and parent/child mapping are demo parameters, not Dewu production rules.
  const REASON_GROUPS = [
    {id:'user_problem',name:'用户问题',reasons:['收到不合适','选错SKU','购买多单类似品对比','退后购买同质化商品','订单信息存疑重拍','凑满减','不再需要','买多了']},
    {id:'product_problem',name:'商品问题',reasons:['缺少用户权益','商品质量待优化','商品与描述信息不符']},
    {id:'delivert_time_problem',name:'交付时效',reasons:['发货慢','物流慢']},
    {id:'other',name:'其他',reasons:['其他']},
    {id:'customer_service_problem',name:'服务问题',reasons:['售后解决方案用户不满意','用户诉求无法满足']},
    {id:'price_problem',name:'价格问题',reasons:['少参加活动','买贵','少用优惠券']},
    {id:'delivery_quality_problem',name:'交付质量',reasons:['商家/物流发错包裹']},
    {id:'shop_problem',name:'店铺问题',reasons:['商品下架']},
    {id:'content_problem',name:'内容问题',reasons:['图文问题']}
  ];
  const reasonParents = new Map(REASON_GROUPS.flatMap(group=>group.reasons.map(reason=>[reason,group])));
  const MOCK_REASON_POOLS = {
    mid:['选错SKU','购买多单类似品对比','订单信息存疑重拍','凑满减','不再需要','买多了','缺少用户权益','发货慢','售后解决方案用户不满意','用户诉求无法满足','少参加活动','买贵','少用优惠券','商品下架','图文问题','其他'],
    only:['商品质量待优化','商品与描述信息不符','缺少用户权益','物流慢','商家/物流发错包裹','售后解决方案用户不满意','用户诉求无法满足','不再需要','其他'],
    return:['收到不合适','选错SKU','购买多单类似品对比','退后购买同质化商品','商品质量待优化','商品与描述信息不符','缺少用户权益','商家/物流发错包裹','买贵','图文问题','其他']
  };
  MOCK_REASON_POOLS.transit = MOCK_REASON_POOLS.only;
  const catalog = [
    {id:'p0',spu:'1000398261',name:'FAESSLIN 秋冬宽松弯刀卫裤 男女同款',code:'K83736-服饰',category:'休闲裤',channel:'品牌直发',color:'#6d6c6c',unitCents:28120},
    {id:'p1',spu:'1000398278',name:'FAESSLIN 高腰灯芯绒直筒休闲裤 女款',code:'K1057-服饰',category:'休闲裤',channel:'品牌直发',color:'#8a847b',unitCents:28900},
    {id:'p2',spu:'1000398296',name:'FAESSLIN 复古灯芯绒弯刀长裤 女款',code:'K2585-服饰',category:'休闲裤',channel:'入仓',color:'#7e6b58',unitCents:26750},
    {id:'p3',spu:'1000398302',name:'FAESSLIN 美拉德直筒休闲裤 女款',code:'K1015R-服饰',category:'休闲裤',channel:'品牌直发',color:'#706151',unitCents:28000},
    {id:'p4',spu:'1000398355',name:'FAESSLIN 宽松垂感羊毛阔腿裤 男女同款',code:'K2730-服饰',category:'休闲裤',channel:'品牌直发',color:'#b3afa6',unitCents:29088},
    {id:'p5',spu:'1000398390',name:'FAESSLIN 复古水洗高腰微喇牛仔裤 女款',code:'K2925Q-服饰',category:'牛仔裤',channel:'现货',color:'#46546b',unitCents:32500}
  ].map(product=>({...product,skus:SKUS.map((label,index)=>({
    id:product.spu+String(index+1).padStart(2,'0'),label,color:label.startsWith('黑色')?'#34363b':'#85878c'
  }))}));
  function dayOffset(date, n) { const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10); }
  function dayCount(start,end) { return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1; }
  function dateList(start,end) { const out=[];for(let d=start;d<=end;d=dayOffset(d,1))out.push(d);return out; }
  function monthBounds(month) { const [year,m]=month.split('-').map(Number);return {start:month+'-01',end:new Date(Date.UTC(year,m,0)).toISOString().slice(0,10)}; }
  function weekBounds(week) {
    if(/^\d{4}-W\d{2}$/.test(week)) { const [year,num]=week.split('-W').map(Number),jan4=`${year}-01-04`,monday=dayOffset(jan4,-((new Date(jan4+'T00:00:00Z').getUTCDay()+6)%7));const start=dayOffset(monday,(num-1)*7);return {start,end:dayOffset(start,6)}; }
    const start=dayOffset(week,-((new Date(week+'T00:00:00Z').getUTCDay()+6)%7));return {start,end:dayOffset(start,6)};
  }
  function isoWeek(date) { const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+3-((d.getUTCDay()+6)%7));const year=d.getUTCFullYear(),first=new Date(Date.UTC(year,0,4));const n=1+Math.round(((d-first)/86400000-3+((first.getUTCDay()+6)%7))/7);return `${year}-W${String(n).padStart(2,'0')}`; }
  function defaults(referenceDay=DAY) {
    const yesterday=dayOffset(referenceDay,-1),week=weekBounds(referenceDay),month=referenceDay.slice(0,7);
    return {
      selectedDay:yesterday,
      selectedWeek:isoWeek(week.start<=yesterday?referenceDay:dayOffset(week.start,-1)),
      selectedMonth:month+'-01'<=yesterday?month:dayOffset(month+'-01',-1).slice(0,7)
    };
  }
  function getPeriod(state, referenceDay=state.referenceDay||DAY) {
    const yesterday=dayOffset(referenceDay,-1),d={...defaults(referenceDay),...state};d.period=({calendar_day:'day',calendar_week:'week',calendar_month:'month'})[d.period]||d.period;let current,natural=null;
    if(d.period==='today')current={start:referenceDay,end:referenceDay};
    else if(d.period==='one')current={start:yesterday,end:yesterday};
    else if(d.period==='seven'||d.period==='thirty')current={start:dayOffset(referenceDay,d.period==='seven'?-7:-30),end:yesterday};
    else if(d.period==='day')current={start:d.selectedDay,end:d.selectedDay};
    else if(d.period==='week'){natural=weekBounds(d.selectedWeek);current={start:natural.start,end:natural.end<yesterday?natural.end:yesterday};}
    else if(d.period==='month'){natural=monthBounds(d.selectedMonth);current={start:natural.start,end:natural.end<yesterday?natural.end:yesterday};}
    else current={start:d.customStart,end:d.customEnd};
    const partial=!!natural&&current.end<natural.end;
    let previous;
    if(d.period==='month'){
      previous=monthBounds(dayOffset(current.start,-1).slice(0,7));
      if(partial){const progressEnd=dayOffset(previous.start,dayCount(current.start,current.end)-1);previous.end=progressEnd<previous.end?progressEnd:previous.end;}
    }
    else if(d.period==='week'){
      const start=dayOffset(current.start,-7);
      previous={start,end:dayOffset(start,dayCount(current.start,current.end)-1)};
    }
    else { const n=dayCount(current.start,current.end);previous={start:dayOffset(current.start,-n),end:dayOffset(current.start,-1)}; }
    return {current,previous,realtime:d.period==='today',partial,comparison:d.period==='today'?'yesterday_full_day':partial?'same_progress':'previous_period',period:state.period};
  }
  function validateSelection(state, referenceDay=state.referenceDay||DAY) {
    let p;try { p=getPeriod(state,referenceDay); } catch(e) { return '请选择有效日期'; }
    const {start,end}=p.current;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||''))return '请选择完整日期';
    if(start>end)return ['week','month','calendar_week','calendar_month'].includes(state.period)?'所选周期暂无已结束日期，请选择更早的周期':'开始日期不能晚于结束日期';
    if(state.period!=='today'&&end>=referenceDay)return '请选择已经结束的周期，最晚截至昨天';
    if(state.period!=='today'&&start<SELECTABLE_START)return '示例支持选择 2026-01-01 起的日期';
    return '';
  }
  function createData(cutoff = CUTOFF) {
    const day = cutoff.slice(0,10);
    const payments=[],refunds=[];let serial=0,dayIndex=0;
    for(let date=DATA_START;date<=day;date=dayOffset(date,1),dayIndex++) {
      catalog.forEach((p,pi)=>{ const n=32-pi*3+(dayIndex*7+pi*3)%13;
        for(let j=0;j<n;j++) {
          const hour=(j*7+pi*3+dayIndex)%24,minute=(j*13+pi*7)%60;
          const payTime=`${date} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;
          if(payTime>cutoff)continue;
          const subOrderId='DE'+date.replaceAll('-','')+String(++serial).padStart(7,'0'),sku=SKUS[j%3];
          const paid={subOrderId,product:p.id,sku,skuId:p.skus[j%3].id,payDate:date,payTime,amount:p.unitCents};payments.push(paid);
          const seed=dayIndex*17+j*11+pi*5;
          if(seed%100>=32)continue;
          // Preserve the original mock amount, reason and timing before grouping by the new stages.
          const legacyType=seed%10<3?'mid':seed%10<8?'return':seed%10===8?'transit':'only';
          const lag=legacyType==='mid'?(seed%3):2+seed%11;
          let refundDate=dayOffset(date,lag),refundHour=8+seed%15;
          let refundTime=`${refundDate} ${String(refundHour).padStart(2,'0')}:${String((minute+7)%60).padStart(2,'0')}:00`;
          if(lag===0){refundTime=new Date(Date.parse(payTime.replace(' ','T')+'Z')+67*60000).toISOString().slice(0,19).replace('T',' ');refundDate=refundTime.slice(0,10);refundHour=Number(refundTime.slice(11,13));}
          if(refundTime>cutoff)continue;
          const pool=MOCK_REASON_POOLS[legacyType],reason=pool[(dayIndex*13+j*7+pi*11)%pool.length],reasonGroup=reasonParents.get(reason).id;
          const amount=legacyType==='only'||legacyType==='transit'?Math.round(p.unitCents*(.25+(seed%5)*.1)):p.unitCents;
          const type=normalizeRefundType(legacyType);
          const base={...paid,type,reason,reasonGroup,status:'success',refundDate,refundHour,refundTime};
          if(seed%19===0) { const first=Math.floor(amount*.4);refunds.push({...base,refundId:'RF'+serial+'A',afterSale:'RE'+serial+'A',amount:first});refunds.push({...base,refundId:'RF'+serial+'B',afterSale:'RE'+serial+'B',amount:amount-first}); }
          else refunds.push({...base,refundId:'RF'+serial,afterSale:'RE'+serial,amount});
        }
      });
    }
    return {catalog,payments,refunds,coverage:{start:DATA_START,end:day},cutoff};
  }
  function refreshData(data, time) {
    const cutoff = hourlyCutoff(time);
    if (cutoff === data.cutoff) return false;
    Object.assign(data, createData(cutoff));
    CUTOFF = cutoff;
    DAY = data.coverage.end;
    return true;
  }
  function timestamp(value) {
    if(!value)return NaN;
    const iso=value.replace(' ','T');
    return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso)?iso:iso+'+08:00');
  }
  function uniqueRecords(rows, cutoff=CUTOFF) { const end=timestamp(cutoff);return [...new Map(rows.filter(r=>r.status==='success'&&(!r.refundTime||timestamp(r.refundTime)<=end)).map(r=>[r.refundId,r])).values()]; }
  function total(rows,cutoff=CUTOFF) { return uniqueRecords(rows,cutoff).reduce((s,r)=>s+r.amount,0); }
  function count(rows,cutoff=CUTOFF) { return new Set(uniqueRecords(rows,cutoff).map(r=>r.subOrderId)).size; }
  function typeRows(rows,type) {
    if (type === 'all') return rows;
    const stage = normalizeRefundType(type);
    return rows.filter(row => normalizeRefundType(row.type) === stage);
  }
  function matches(row,state,items=catalog) {
    const p=items.find(p=>p.id===row.product);if(!p)return false;
    return (!state.brand||state.brand==='全部品牌'||p.name.startsWith(state.brand))&&(!state.category||state.category==='全部类目'||p.category===state.category)&&(!state.channel||state.channel==='全部出价渠道'||p.channel===state.channel)&&(!state.search||(p.name+p.code+p.spu).toLowerCase().includes(state.search.toLowerCase()))&&(!state.product||row.product===state.product)&&(!state.sku||row.sku===state.sku);
  }
  function query(data,state,range=getPeriod(state).current) {
    const cutoff=state.cutoff||data.cutoff||CUTOFF,items=data.catalog||catalog;
    const cutoffMs=timestamp(cutoff);
    const payments=[...new Map(data.payments.filter(p=>(!p.payTime||timestamp(p.payTime)<=cutoffMs)&&p.payDate>=range.start&&p.payDate<=range.end&&matches(p,state,items)).map(p=>[p.subOrderId,p])).values()];
    const validPaid=state.basis==='pay'?new Map(payments.map(p=>[p.subOrderId,p])):null;
    const refunds=uniqueRecords(data.refunds,cutoff).filter(r=>{
      if(!matches(r,state,items))return false;
      if(!validPaid)return r.refundDate>=range.start&&r.refundDate<=range.end;
      const paid=validPaid.get(r.subOrderId);if(!paid)return false;
      const refundMs=timestamp(r.refundTime||r.refundDate+' 00:00:00'),payMs=timestamp(paid.payTime||paid.payDate+' 00:00:00');
      return refundMs>=payMs&&refundMs<=payMs+REFUND_WINDOW_MS&&refundMs<=cutoffMs;
    });
    const complete=!data.coverage||(range.start>=data.coverage.start&&range.end<=data.coverage.end);
    return {refunds,payments,complete,cutoff,range};
  }
  function summarize(result,type='all') {
    const rows=typeRows(result.refunds,type),amount=total(rows,result.cutoff),orders=count(rows,result.cutoff),payments=[...new Map(result.payments.map(r=>[r.subOrderId,r])).values()],paid=payments.length,paidAmount=payments.reduce((sum,p)=>sum+p.amount,0);
    return {amount,count:orders,paid,paidAmount,rate:result.complete&&paid?orders/paid:null,amountRate:result.complete&&paidAmount?amount/paidAmount:null,complete:result.complete};
  }
  function summarizeReasons(result) {
    const groups=new Map();
    for(const row of uniqueRecords(result.refunds,result.cutoff)) {
      if(!groups.has(row.reason))groups.set(row.reason,[]);
      groups.get(row.reason).push(row);
    }
    return [...groups].map(([reason,refunds])=>{
      const {amount,count,amountRate,rate}=summarize({...result,refunds});
      return {reason,amount,count,amountRate,rate};
    }).sort((a,b)=>b.amount-a.amount);
  }
  function summarizeReasonHierarchy(result) {
    const groups=new Map(),other=REASON_GROUPS.find(group=>group.id==='other');
    for(const row of uniqueRecords(result.refunds,result.cutoff)) {
      const parent=reasonParents.get(row.reason)||REASON_GROUPS.find(group=>group.id===row.reasonGroup)||other;
      if(!groups.has(parent.id))groups.set(parent.id,{parent,refunds:[]});
      groups.get(parent.id).refunds.push(row);
    }
    return [...groups].map(([id,{parent,refunds}])=>{
      const scoped={...result,refunds},summary=summarize(scoped);
      const {amount,count,amountRate,rate}=summary;
      const children=summarizeReasons(scoped).map(child=>({...child,parentId:id,parentReason:parent.name}));
      // Deduplicate the parent orders from its records, never by summing child counts.
      return {id,reason:parent.name,amount,count,amountRate,rate,children};
    }).sort((a,b)=>b.amount-a.amount);
  }
  function summarizeProducts(result,refundType='all') {
    const products=new Map();
    for(const row of typeRows(uniqueRecords(result.refunds,result.cutoff),refundType)) {
      if(!products.has(row.product))products.set(row.product,[]);
      products.get(row.product).push(row);
    }
    function details(refunds,payments) {
      const scoped={...result,refunds,payments},summary=summarize(scoped);
      const {amount,count,paid,paidAmount,rate,amountRate}=summary;
      const reasons=summarizeReasons(scoped).map(({reason,amount:reasonAmount,count})=>({reason,amount:reasonAmount,count,amountShare:amount?reasonAmount/amount:null}));
      return {amount,count,paid,paidAmount,rate,amountRate,reasons};
    }
    return [...products].map(([product,refunds])=>{
      const payments=result.payments.filter(p=>p.product===product),groups=new Map();
      for(const row of refunds) {
        if(!groups.has(row.sku))groups.set(row.sku,[]);
        groups.get(row.sku).push(row);
      }
      const skus=[...groups].map(([sku,items])=>{
        const skuPayments=payments.filter(p=>p.sku===sku),skuId=items.find(row=>row.skuId)?.skuId||skuPayments.find(row=>row.skuId)?.skuId||null;
        return {sku,skuId,...details(items,skuPayments)};
      }).sort((a,b)=>b.amount-a.amount);
      return {product,...details(refunds,payments),skus};
    }).sort((a,b)=>b.amount-a.amount);
  }
  function change(current,previous,complete=true) { if(!complete||current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return {value:null,reason:'对比期数据缺失，无法计算'};if(previous===0)return {value:null,reason:'上周期为0，无法计算变化率'};return {value:(current-previous)/previous,reason:''}; }
  function buildTrend(data,state,queries) {
    const period=getPeriod(state),a=queries?.current||query(data,state,period.current),b=queries?.previous||query(data,state,period.previous),curDates=dateList(period.current.start,period.current.end),prevDates=dateList(period.previous.start,period.previous.end);
    const n=period.realtime?24:curDates.length,crossYear=period.current.start.slice(0,4)!==period.current.end.slice(0,4),labels=[],current=[],previous=[],currentDates=[],previousDates=[],currentReasons=[],previousReasons=[];
    const cutoffHour=Number((state.cutoff||data.cutoff||CUTOFF).slice(11,13));
    function point(result,date,index,realtime) {
      if(!date)return {value:null,reason:'无对应日期'};
      if(!result.complete)return {value:null,reason:'数据缺失'};
      if(realtime&&date===(state.referenceDay||DAY)&&index>cutoffHour)return {value:null,reason:'尚未到达该时段'};
      const rows=result.refunds.filter(r=>(state.basis==='pay'?r.payDate:r.refundDate)===date&&(!realtime||Number((state.basis==='pay'?r.payTime:r.refundTime).slice(11,13))===index));
      const payments=result.payments.filter(r=>r.payDate===date&&(!realtime||Number(r.payTime.slice(11,13))===index));
      const summary=summarize({...result,refunds:rows,payments},state.type||'all');
      const rateMetric=state.metric==='rate'||state.metric==='orderRate'||state.metric==='amountRate';
      const value=state.metric==='amount'?summary.amount/100:state.metric==='amountRate'?summary.amountRate:rateMetric?summary.rate:summary.count;
      return {value,reason:rateMetric&&value===null?(state.metric==='amountRate'?'该时段无成交金额':'该时段无支付订单'):''};
    }
    for(let i=0;i<n;i++) {
      const cd=period.realtime?period.current.start:curDates[i]||null,pd=period.realtime?period.previous.start:prevDates[i]||null;
      labels.push(period.realtime?String(i).padStart(2,'0')+':00':crossYear?cd:cd.slice(5));
      currentDates.push(cd?(cd+(period.realtime?' '+String(i).padStart(2,'0')+':00':'')):null);previousDates.push(pd?(pd+(period.realtime?' '+String(i).padStart(2,'0')+':00':'')):null);
      const c=point(a,cd,i,period.realtime),p=point(b,pd,i,period.realtime);current.push(c.value);previous.push(p.value);currentReasons.push(c.reason);previousReasons.push(p.reason);
    }
    return {...period,labels,current,previous,currentDates,previousDates,currentReasons,previousReasons,currentLabel:period.realtime?'今日截至当前':'本期',previousLabel:period.realtime?'昨日全天':period.partial?'上期同进度':'上周期'};
  }
  return {get DAY(){return DAY},get CUTOFF(){return CUTOFF},SELECTABLE_START,DATA_START,REFUND_TYPES,REFUND_TYPE_LABELS,SKUS,REASON_GROUPS,catalog,dayOffset,dayCount,dateList,monthBounds,weekBounds,isoWeek,defaults,getPeriod,validateSelection,createData,refreshData,uniqueRecords,total,count,normalizeRefundType,typeRows,matches,query,summarize,summarizeReasons,summarizeReasonHierarchy,summarizeProducts,change,buildTrend};
});
