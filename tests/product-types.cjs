'use strict';
const assert = require('node:assert/strict');
const M = require('../refund-model.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const payments = [
  {subOrderId:'A', product:'p0', sku:'M', skuId:'sku-M', amount:10000},
  {subOrderId:'B', product:'p0', sku:'L', skuId:'sku-L', amount:20000},
  {subOrderId:'C', product:'p0', sku:'M', skuId:'sku-M', amount:30000},
  {subOrderId:'D', product:'p1', sku:'M', skuId:'sku-p1-M', amount:10000}
].map(row => ({...row, payDate:'2026-10-01', payTime:'2026-10-01 10:00:00'}));
const refund = (refundId, id, type, amount, reason) => ({
  ...payments.find(row => row.subOrderId === id), refundId, type, amount, reason,
  status:'success', refundDate:'2026-10-05', refundTime:'2026-10-05 10:00:00'
});
const first = refund('A1','A','return',3000,'收到不合适');
const data = {payments, refunds:[first, {...first}, refund('A2','A','return',1000,'选错SKU'),
  refund('B1','B','mid',5000,'发货慢'), refund('D1','D','only',1000,'商品质量待优化')],
  cutoff:M.CUTOFF, coverage:{start:M.DATA_START,end:M.DAY}};
const query = M.query(data,{basis:'pay',period:'custom',customStart:'2026-10-01',customEnd:'2026-10-01'});

test('a product type changes refund numerators and retains every paid product order', () => {
  const [row] = M.summarizeProducts(query,'mid');
  assert.deepEqual([row.product,row.amount,row.count,row.paid,row.paidAmount],['p0',5000,1,3,60000]);
  assert.equal(row.rate,1/3);
  assert.equal(row.amountRate,5000/60000);
  assert.deepEqual(row.reasons.map(item=>item.reason),['发货慢']);
  assert.deepEqual([row.skus[0].paid,row.skus[0].paidAmount,row.skus[0].skuId],[1,20000,'sku-L']);
});

test('SKU denominators and IDs remain tied to their own paid records across types', () => {
  const [row] = M.summarizeProducts(query,'return'), [sku] = row.skus;
  assert.deepEqual([row.amount,row.count,sku.amount,sku.count],[4000,1,4000,1]);
  assert.deepEqual([sku.skuId,sku.paid,sku.paidAmount],['sku-M',2,40000]);
  assert.equal(sku.rate,1/2);
  assert.equal(sku.amountRate,0.1);
});

test('type summaries do not mutate global data or invent products without that refund type', () => {
  const before = M.summarize(query);
  assert.deepEqual(M.summarizeProducts(query,'only').map(row=>row.product),['p1']);
  assert.deepEqual(M.summarizeProducts(query),M.summarizeProducts(query,'all'));
  assert.deepEqual(M.summarize(query),before);
  assert.deepEqual(M.summarizeProducts({...query,refunds:[]},'return'),[]);
});

test('generated SKU identities are unique and stable across product ranking changes', () => {
  const ids = M.catalog.flatMap(product=>product.skus.map(sku=>sku.id));
  assert.equal(ids.length,18);
  assert.equal(new Set(ids).size,18);
  assert(ids.every(id=>/^\d+$/.test(id)));
  const generated = M.createData(), result = M.query(generated,{basis:'pay',period:'seven'});
  for (const type of ['all','mid','only','return']) for (const product of M.summarizeProducts(result,type)) {
    const item = M.catalog.find(row=>row.id===product.product);
    for (const sku of product.skus) assert.equal(sku.skuId,item.skus.find(row=>row.label===sku.sku).id);
  }
});
console.log(`\n${passed}/${passed} product-type checks passed`);
