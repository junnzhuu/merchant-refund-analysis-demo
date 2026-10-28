(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RefundModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = '2026-10-28', CUTOFF = '2026-10-28 14:30:00';
  const SELECTABLE_START = '2026-01-01', DATA_START = '2025-01-01';
  const REFUND_TYPES = ['mid', 'return', 'only'];
  const SKUS = ['灰色 / M', '灰色 / L', '黑色 / L'];
  const catalog = [
    {id:'p0',spu:'1000398261',name:'FAESSLIN 秋冬宽松弯刀卫裤 男女同款',code:'K83736-服饰',category:'休闲裤',channel:'品牌直发',color:'#6d6c6c',unitCents:28120},
    {id:'p1',spu:'1000398278',name:'FAESSLIN 高腰灯芯绒直筒休闲裤 女款',code:'K1057-服饰',category:'休闲裤',channel:'品牌直发',color:'#8a847b',unitCents:28900},
    {id:'p2',spu:'1000398296',name:'FAESSLIN 复古灯芯绒弯刀长裤 女款',code:'K2585-服饰',category:'休闲裤',channel:'入仓',color:'#7e6b58',unitCents:26750},
    {id:'p3',spu:'1000398302',name:'FAESSLIN 美拉德直筒休闲裤 女款',code:'K1015R-服饰',category:'休闲裤',channel:'品牌直发',color:'#706151',unitCents:28000},
    {id:'p4',spu:'1000398355',name:'FAESSLIN 宽松垂感羊毛阔腿裤 男女同款',code:'K2730-服饰',category:'休闲裤',channel:'品牌直发',color:'#b3afa6',unitCents:29088},
    {id:'p5',spu:'1000398390',name:'FAESSLIN 复古水洗高腰微喇牛仔裤 女款',code:'K2925Q-服饰',category:'牛仔裤',channel:'现货',color:'#46546b',unitCents:32500}
  ];
  function dayOffset(date, n) { const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10); }
  function dayCount(start,end) { return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1; }
  function dateList(start,end) { const out=[];for(let d=start;d<=end;d=dayOffset(d,1))out.push(d);return out; }
  function monthBounds(month) { const [year,m]=month.split('-').map(Number);return {start:month+'-01',end:new Date(Date.UTC(year,m,0)).toISOString().slice(0,10)}; }
  function weekBounds(week) {
    if(/^\d{4}-W\d{2}$/.test(week)) { const [year,num]=week.split('-W').map(Number),jan4=`${year}-01-04`,monday=dayOffset(jan4,-((new Date(jan4+'T00:00:00Z').getUTCDay()+6)%7));const start=dayOffset(monday,(num-1)*7);return {start,end:dayOffset(start,6)}; }
    const start=dayOffset(week,-((new Date(week+'T00:00:00Z').getUTCDay()+6)%7));return {start,end:dayOffset(start,6)};
  }
  function isoWeek(date) { const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+3-((d.getUTCDay()+6)%7));const year=d.getUTCFullYear(),first=new Date(Date.UTC(year,0,4));const n=1+Math.round(((d-first)/86400000-3+((first.getUTCDay()+6)%7))/7);return `${year}-W${String(n).padStart(2,'0')}`; }
  function defaults(referenceDay=DAY) { return {selectedDay:dayOffset(referenceDay,-1),selectedWeek:isoWeek(dayOffset(weekBounds(referenceDay).start,-1)),selectedMonth:dayOffset(referenceDay.slice(0,7)+'-01',-1).slice(0,7)}; }
  function getPeriod(state, referenceDay=state.referenceDay||DAY) {
    const yesterday=dayOffset(referenceDay,-1),d={...defaults(referenceDay),...state};d.period=({calendar_day:'day',calendar_week:'week',calendar_month:'month'})[d.period]||d.period;let current;
    if(d.period==='today')current={start:referenceDay,end:referenceDay};
    else if(d.period==='seven'||d.period==='thirty')current={start:dayOffset(referenceDay,d.period==='seven'?-7:-30),end:yesterday};
    else if(d.period==='day')current={start:d.selectedDay,end:d.selectedDay};
    else if(d.period==='week')current=weekBounds(d.selectedWeek);
    else if(d.period==='month')current=monthBounds(d.selectedMonth);
    else current={start:d.customStart,end:d.customEnd};
    let previous;
    if(d.period==='month')previous=monthBounds(dayOffset(current.start,-1).slice(0,7));
    else { const n=dayCount(current.start,current.end);previous={start:dayOffset(current.start,-n),end:dayOffset(current.start,-1)}; }
    return {current,previous,realtime:d.period==='today',comparison:d.period==='today'?'yesterday_full_day':'previous_period',period:state.period};
  }
  function validateSelection(state, referenceDay=state.referenceDay||DAY) {
    let p;try { p=getPeriod(state,referenceDay); } catch(e) { return '请选择有效日期'; }
    const {start,end}=p.current;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||''))return '请选择完整日期';
    if(start>end)return '开始日期不能晚于结束日期';
    if(state.period!=='today'&&end>=referenceDay)return '请选择已经结束的周期，最晚截至昨天';
    if(state.period!=='today'&&start<SELECTABLE_START)return '示例支持选择 2026-01-01 起的完整周期';
    return '';
  }
  function createData() {
    const payments=[],refunds=[];let serial=0,dayIndex=0;
    for(let date=DATA_START;date<=DAY;date=dayOffset(date,1),dayIndex++) {
      catalog.forEach((p,pi)=>{ const n=32-pi*3+(dayIndex*7+pi*3)%13;
        for(let j=0;j<n;j++) {
          const hour=(j*7+pi*3+dayIndex)%24,minute=(j*13+pi*7)%60;
          const payTime=`${date} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;
          if(payTime>CUTOFF)continue;
          const subOrderId='DE'+date.replaceAll('-','')+String(++serial).padStart(7,'0'),sku=SKUS[j%3];
          const paid={subOrderId,product:p.id,sku,payDate:date,payTime,amount:p.unitCents};payments.push(paid);
          const seed=dayIndex*17+j*11+pi*5;
          if(seed%100>=32)continue;
          const type=seed%10<3?'mid':seed%10<8?'return':'only';
          const lag=type==='mid'?(seed%3):2+seed%11;
          let refundDate=dayOffset(date,lag),refundHour=8+seed%15;
          let refundTime=`${refundDate} ${String(refundHour).padStart(2,'0')}:${String((minute+7)%60).padStart(2,'0')}:00`;
          if(lag===0){refundTime=new Date(Date.parse(payTime.replace(' ','T')+'Z')+67*60000).toISOString().slice(0,19).replace('T',' ');refundDate=refundTime.slice(0,10);refundHour=Number(refundTime.slice(11,13));}
          if(refundTime>CUTOFF)continue;
          const reason=type==='mid'?['不喜欢或不想要','暂时不想要了','发货等待时间长'][seed%3]:type==='only'?['货品质量问题','商品瑕疵协商退款'][seed%2]:['尺码不合适','不喜欢或不想要','穿着效果不符','尺码不合适','货品质量问题'][seed%5];
          const amount=type==='only'?Math.round(p.unitCents*(.25+(seed%5)*.1)):p.unitCents;
          const base={...paid,type,reason,status:'success',refundDate,refundHour,refundTime};
          if(seed%19===0) { const first=Math.floor(amount*.4);refunds.push({...base,refundId:'RF'+serial+'A',afterSale:'RE'+serial+'A',amount:first});refunds.push({...base,refundId:'RF'+serial+'B',afterSale:'RE'+serial+'B',amount:amount-first}); }
          else refunds.push({...base,refundId:'RF'+serial,afterSale:'RE'+serial,amount});
        }
      });
    }
    return {catalog,payments,refunds,coverage:{start:DATA_START,end:DAY},cutoff:CUTOFF};
  }
  function uniqueRecords(rows, cutoff=CUTOFF) { return [...new Map(rows.filter(r=>r.status==='success'&&(!r.refundTime||r.refundTime<=cutoff)).map(r=>[r.refundId,r])).values()]; }
  function total(rows,cutoff=CUTOFF) { return uniqueRecords(rows,cutoff).reduce((s,r)=>s+r.amount,0); }
  function count(rows,cutoff=CUTOFF) { return new Set(uniqueRecords(rows,cutoff).map(r=>r.subOrderId)).size; }
  function typeRows(rows,type) { return type==='all'?rows:rows.filter(r=>r.type===type); }
  function matches(row,state,items=catalog) {
    const p=items.find(p=>p.id===row.product);if(!p)return false;
    return (!state.brand||state.brand==='全部品牌'||p.name.startsWith(state.brand))&&(!state.category||state.category==='全部类目'||p.category===state.category)&&(!state.channel||state.channel==='全部出价渠道'||p.channel===state.channel)&&(!state.search||(p.name+p.code+p.spu).toLowerCase().includes(state.search.toLowerCase()))&&(!state.product||row.product===state.product)&&(!state.sku||row.sku===state.sku);
  }
  function query(data,state,range=getPeriod(state).current) {
    const cutoff=state.cutoff||data.cutoff||CUTOFF,items=data.catalog||catalog;
    const payments=[...new Map(data.payments.filter(p=>(!p.payTime||p.payTime<=cutoff)&&p.payDate>=range.start&&p.payDate<=range.end&&matches(p,state,items)).map(p=>[p.subOrderId,p])).values()];
    const validPaid=state.basis==='pay'?new Set(payments.map(p=>p.subOrderId)):null;
    const refunds=uniqueRecords(data.refunds,cutoff).filter(r=>{const date=state.basis==='pay'?r.payDate:r.refundDate;return date>=range.start&&date<=range.end&&matches(r,state,items)&&(!validPaid||validPaid.has(r.subOrderId));});
    const complete=!data.coverage||(range.start>=data.coverage.start&&range.end<=data.coverage.end);
    return {refunds,payments,complete,cutoff,range};
  }
  function summarize(result,type='all') { const rows=typeRows(result.refunds,type),amount=total(rows,result.cutoff),orders=count(rows,result.cutoff),paid=new Set(result.payments.map(r=>r.subOrderId)).size;return {amount,count:orders,paid,rate:result.complete&&paid?orders/paid:null,complete:result.complete}; }
  function change(current,previous,complete=true) { if(!complete||current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return {value:null,reason:'对比期数据缺失，无法计算'};if(previous===0)return {value:null,reason:'上周期为0，无法计算变化率'};return {value:(current-previous)/previous,reason:''}; }
  function buildTrend(data,state,queries) {
    const period=getPeriod(state),a=queries?.current||query(data,state,period.current),b=queries?.previous||query(data,state,period.previous),curDates=dateList(period.current.start,period.current.end),prevDates=dateList(period.previous.start,period.previous.end);
    const n=period.realtime?24:Math.max(curDates.length,prevDates.length),labels=[],current=[],previous=[],currentDates=[],previousDates=[],currentReasons=[],previousReasons=[];
    const cutoffHour=Number((state.cutoff||data.cutoff||CUTOFF).slice(11,13));
    function point(result,date,index,realtime) {
      if(!date)return {value:null,reason:'无对应日期'};
      if(!result.complete)return {value:null,reason:'数据缺失'};
      if(realtime&&date===DAY&&index>cutoffHour)return {value:null,reason:'尚未到达该时段'};
      const rows=result.refunds.filter(r=>(state.basis==='pay'?r.payDate:r.refundDate)===date&&(!realtime||Number((state.basis==='pay'?r.payTime:r.refundTime).slice(11,13))===index));
      const payments=result.payments.filter(r=>r.payDate===date&&(!realtime||Number(r.payTime.slice(11,13))===index));
      const summary=summarize({...result,refunds:rows,payments},state.type||'all');
      return {value:state.metric==='amount'?summary.amount/100:state.metric==='rate'?summary.rate:summary.count,reason:state.metric==='rate'&&summary.rate===null?'该时段无支付订单':''};
    }
    for(let i=0;i<n;i++) {
      const cd=period.realtime?period.current.start:curDates[i]||null,pd=period.realtime?period.previous.start:prevDates[i]||null;
      labels.push(period.realtime?String(i).padStart(2,'0')+':00':n===1?'所选日期':`第${i+1}天`);
      currentDates.push(cd?(cd+(period.realtime?' '+String(i).padStart(2,'0')+':00':'')):null);previousDates.push(pd?(pd+(period.realtime?' '+String(i).padStart(2,'0')+':00':'')):null);
      const c=point(a,cd,i,period.realtime),p=point(b,pd,i,period.realtime);current.push(c.value);previous.push(p.value);currentReasons.push(c.reason);previousReasons.push(p.reason);
    }
    return {...period,labels,current,previous,currentDates,previousDates,currentReasons,previousReasons,currentLabel:period.realtime?'今日截至当前':'本期',previousLabel:period.realtime?'昨日全天':'上周期'};
  }
  return {DAY,CUTOFF,SELECTABLE_START,DATA_START,REFUND_TYPES,SKUS,catalog,dayOffset,dayCount,dateList,monthBounds,weekBounds,isoWeek,defaults,getPeriod,validateSelection,createData,uniqueRecords,total,count,typeRows,matches,query,summarize,change,buildTrend};
});
