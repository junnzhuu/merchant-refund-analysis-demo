'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const M=require('../refund-model.js');
const E=require('../refund-export.js');
const data=M.createData('2026-11-02 14:30:00');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const types=['all','mid','transit','return'];
const labels=['全部 退款','发货前 退款','未收货 退款','已收货 退货退款'];
test('three stages have the requested order and every mock child order belongs to exactly one stage',()=>{
  assert.deepEqual(['all',...M.REFUND_TYPES],types);
  assert.deepEqual(Object.keys(M.REFUND_TYPE_LABELS),types);
  assert.deepEqual(types.map(type=>M.REFUND_TYPE_LABELS[type]),labels);
  const orders=new Map();
  for(const row of data.refunds){assert(M.REFUND_TYPES.includes(row.type));if(orders.has(row.subOrderId))assert.equal(orders.get(row.subOrderId),row.type);orders.set(row.subOrderId,row.type);}
  assert.deepEqual(new Set(orders.values()),new Set(M.REFUND_TYPES));
});
test('near-seven golden baseline preserves totals and folds both former received stages together',()=>{
  // Baseline from e566d76 at the fixed cutoff. The last pair sums the old only/return cohorts.
  const expected={
    pay:{current:[[5039037,193],[3481656,121],[362789,23],[1194592,49]],previous:[[9109601,337],[4500268,156],[404895,26],[4204438,155]]},
    refund:{current:[[10944038,417],[3976042,138],[771718,49],[6196278,230]],previous:[[10702947,410],[4401058,153],[663653,42],[5638236,215]]}
  };
  const paid={current:[36671318,1277],previous:[36869592,1286]};
  for(const basis of ['pay','refund']){
    const state={basis,period:'seven'},period=M.getPeriod(state);
    assert.deepEqual(period.current,{start:'2026-10-26',end:'2026-11-01'});
    assert.deepEqual(period.previous,{start:'2026-10-19',end:'2026-10-25'});
    for(const scope of ['current','previous']){
      const query=M.query(data,state,period[scope]);
      types.forEach((type,index)=>{
        const actual=M.summarize(query,type),[amount,count]=expected[basis][scope][index], [paidAmount,paidCount]=paid[scope];
        assert.deepEqual([actual.amount,actual.count,actual.paidAmount,actual.paid],[amount,count,paidAmount,paidCount],`${basis} ${scope} ${type}`);
        if(basis==='pay') assert.deepEqual([actual.amountRate,actual.rate],[amount/paidAmount,count/paidCount]);
      });
    }
  }
});
test('three-stage totals and shared denominators reconcile in both bases and every date mode',()=>{
  for(const basis of ['pay','refund'])for(const period of ['today','one','seven','thirty','day','week','month','custom']){
    const state={...M.defaults(),basis,period,customStart:'2026-10-01',customEnd:'2026-10-03'},query=M.query(data,state),all=M.summarize(query),parts=M.REFUND_TYPES.map(type=>M.summarize(query,type));
    assert.equal(parts.reduce((sum,p)=>sum+p.amount,0),all.amount);assert.equal(parts.reduce((sum,p)=>sum+p.count,0),all.count);
    for(const p of parts){assert.equal(p.paid,all.paid);assert.equal(p.paidAmount,all.paidAmount);}
    if(all.rate!==null)assert(Math.abs(parts.reduce((sum,p)=>sum+p.rate,0)-all.rate)<1e-12);
    if(all.amountRate!==null)assert(Math.abs(parts.reduce((sum,p)=>sum+p.amountRate,0)-all.amountRate)<1e-12);
  }
});
test('stage filters isolate product and reason numerators while keeping paid product cohorts',()=>{
  for(const basis of ['pay','refund'])for(const type of M.REFUND_TYPES){
    const query=M.query(data,{basis,period:'seven'}),expected=M.summarize(query,type),products=M.summarizeProducts(query,type),reasons=M.summarizeReasonHierarchy({...query,refunds:M.typeRows(query.refunds,type)});
    assert.equal(products.reduce((sum,p)=>sum+p.amount,0),expected.amount);assert.equal(reasons.reduce((sum,p)=>sum+p.amount,0),expected.amount);
    for(const p of products)assert.equal(p.paid,new Set(query.payments.filter(row=>row.product===p.product).map(row=>row.subOrderId)).size);
  }
});
test('the merged stage includes each former cohort in the current daily trend',()=>{
  const expected={
    pay:{amount:[3765.43,3150.66,3242.8,1250.78,536.25,0,0],count:[15,14,13,5,2,0,0]},
    refund:{amount:[8414.67,8999.59,9453.6,10516.03,8375.85,7691.13,8511.91],count:[31,34,35,38,31,29,32]}
  };
  for(const basis of ['pay','refund'])for(const metric of ['amount','count']){
    const trend=M.buildTrend(data,{basis,period:'seven',type:'return',metric});
    assert.deepEqual(trend.currentDates,M.dateList('2026-10-26','2026-11-01'));
    assert.deepEqual(trend.current,expected[basis][metric]);
  }
});
test('XLSX includes four core rows and carries the merged stage into trend and independent local scopes',()=>{
  for(const basis of ['pay','refund']){
    const state={basis,period:'seven',type:'return',metric:'amount',productType:'transit',reasonType:'return'},report=E.buildReport(data,state),[core,products,reasons]=report.sheets;
    assert.deepEqual(core.rows.map(row=>row.type),labels);assert(core.trend.title.includes('已收货 退货退款'));
    assert(products.metadata.some(text=>text.includes('未收货 退款')));assert(reasons.metadata.some(text=>text.includes('已收货 退货退款')));
    assert.equal(Math.round(core.rows[0].amount*100),core.rows.slice(1).reduce((sum,row)=>sum+Math.round(row.amount*100),0));
    assert.equal(core.rows[0].count,core.rows.slice(1).reduce((sum,row)=>sum+row.count,0));
  }
});
test('every stage has payment and refund explanations with a daily example',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../metric-definitions.js'),'utf8'),context);
  const definitions=context.window.RefundMetricDefinitions;
  assert.deepEqual(Object.keys(definitions),types);
  for(const type of types)for(const basis of ['pay','refund'])for(const metric of basis==='pay'?['amount','count','rate','amountRate']:['amount','count']){
    assert(definitions[type][basis][metric].definition.length>0);assert(definitions[type][basis][metric].example.includes('10月'));
    assert(!/发货后仅退款|发货后退货退款/.test(definitions[type][basis][metric].definition));
  }
  const received=definitions.return.pay;
  assert.match(received.amountRate.example,/800元.*8%/);
  assert.match(received.rate.example,/3单.*3%/);
});
console.log(`\n${passed}/${passed} lifecycle checks passed`);
