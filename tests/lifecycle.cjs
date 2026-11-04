'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const M=require('../refund-model.js');
const E=require('../refund-export.js');
const data=M.createData();
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const labels=['全部 退款','发货前 退款','未收货 退款','已收货 退款','已收货 退货退款'];
test('four stages have the requested order and every mock child order belongs to exactly one stage',()=>{
  assert.deepEqual(['all',...M.REFUND_TYPES].map(type=>M.REFUND_TYPE_LABELS[type]),labels);
  const orders=new Map();
  for(const row of data.refunds){assert(M.REFUND_TYPES.includes(row.type));if(orders.has(row.subOrderId))assert.equal(orders.get(row.subOrderId),row.type);orders.set(row.subOrderId,row.type);}
  assert.deepEqual(new Set(orders.values()),new Set(M.REFUND_TYPES));
});
test('receipt split preserves original core totals, refund-only cohort and amount share',()=>{
  const query=M.query(data,{basis:'pay',period:'seven'}),all=M.summarize(query),mid=M.summarize(query,'mid'),transit=M.summarize(query,'transit'),only=M.summarize(query,'only'),returned=M.summarize(query,'return');
  assert.equal(all.amount,5039037);assert.equal(all.count,193);
  assert.equal(mid.amount,3481656);assert.equal(mid.count,121);
  assert.equal(transit.amount+only.amount,773175);assert.equal(transit.count+only.count,45);
  assert(transit.count>0&&only.count>0);assert.equal(returned.amount,784206);assert.equal(returned.count,27);
  assert.equal((mid.amount/all.amount*100).toFixed(2),'69.09');
});
test('four-stage totals and shared denominators reconcile in both bases and every date mode',()=>{
  for(const basis of ['pay','refund'])for(const period of ['today','one','seven','thirty','day','week','month','custom']){
    const state={...M.defaults(),basis,period,customStart:'2026-10-01',customEnd:'2026-10-03'},query=M.query(data,state),all=M.summarize(query),parts=M.REFUND_TYPES.map(type=>M.summarize(query,type));
    assert.equal(parts.reduce((sum,p)=>sum+p.amount,0),all.amount);assert.equal(parts.reduce((sum,p)=>sum+p.count,0),all.count);
    for(const p of parts){assert.equal(p.paid,all.paid);assert.equal(p.paidAmount,all.paidAmount);}
    if(all.rate!==null)assert(Math.abs(parts.reduce((sum,p)=>sum+p.rate,0)-all.rate)<1e-12);
    if(all.amountRate!==null)assert(Math.abs(parts.reduce((sum,p)=>sum+p.amountRate,0)-all.amountRate)<1e-12);
  }
});
test('transit filters isolate product and reason numerators while keeping paid product cohorts',()=>{
  for(const basis of ['pay','refund']){
    const query=M.query(data,{basis,period:'seven'}),expected=M.summarize(query,'transit'),products=M.summarizeProducts(query,'transit'),reasons=M.summarizeReasonHierarchy({...query,refunds:M.typeRows(query.refunds,'transit')});
    assert.equal(products.reduce((sum,p)=>sum+p.amount,0),expected.amount);assert.equal(reasons.reduce((sum,p)=>sum+p.amount,0),expected.amount);
    for(const p of products)assert.equal(p.paid,new Set(query.payments.filter(row=>row.product===p.product).map(row=>row.subOrderId)).size);
  }
});
test('XLSX includes five core rows and carries new stage names into trend and local scopes',()=>{
  for(const basis of ['pay','refund']){
    const state={basis,period:'seven',type:'transit',metric:'amount',productType:'transit',reasonType:'only'},report=E.buildReport(data,state),[core,products,reasons]=report.sheets;
    assert.deepEqual(core.rows.map(row=>row.type),labels);assert(core.trend.title.includes('未收货 退款'));
    assert(products.metadata.some(text=>text.includes('未收货 退款')));assert(reasons.metadata.some(text=>text.includes('已收货 退款')));
    assert.equal(Math.round(core.rows[0].amount*100),core.rows.slice(1).reduce((sum,row)=>sum+Math.round(row.amount*100),0));
    assert.equal(core.rows[0].count,core.rows.slice(1).reduce((sum,row)=>sum+row.count,0));
  }
});
test('every stage has payment and refund explanations with a daily example',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../metric-definitions.js'),'utf8'),context);
  const definitions=context.window.RefundMetricDefinitions;
  for(const type of ['all',...M.REFUND_TYPES])for(const basis of ['pay','refund'])for(const metric of basis==='pay'?['amount','count','rate','amountRate']:['amount','count']){
    assert(definitions[type][basis][metric].definition.length>0);assert(definitions[type][basis][metric].example.includes('10月'));
    assert(!/发货后仅退款|发货后退货退款/.test(definitions[type][basis][metric].definition));
  }
});
console.log(`\n${passed}/${passed} lifecycle checks passed`);
