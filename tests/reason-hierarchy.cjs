'use strict';

const assert = require('node:assert/strict');
const M = require('../refund-model.js');
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('PASS ' + name);
}
const payments = ['A', 'B', 'C'].map(subOrderId => ({
  subOrderId, product: 'p0', sku: 'M', payDate: '2026-10-01',
  payTime: '2026-10-01 10:00:00', amount: 10000
}));
function refund(refundId, subOrderId, reason, amount, type = 'return') {
  return {...payments.find(row => row.subOrderId === subOrderId), refundId, reason, amount, type,
    status: 'success', refundDate: '2026-10-05', refundTime: '2026-10-05 10:00:00'};
}
const first = refund('A1', 'A', '收到不合适', 2000);
const data = {payments, refunds: [first, {...first}, refund('A2', 'A', '选错SKU', 3000),
  refund('B1', 'B', '商品质量待优化', 4000, 'only')],
  cutoff: M.CUTOFF, coverage: {start: M.DATA_START, end: M.DAY}};
const state = {basis: 'pay', period: 'custom', customStart: '2026-10-01', customEnd: '2026-10-01'};
const query = M.query(data, state);

test('a parent deduplicates child orders while retaining every actual refund amount', () => {
  const groups = M.summarizeReasonHierarchy(query);
  const user = groups.find(group => group.reason === '用户问题');
  assert.equal(user.amount, 5000);
  assert.equal(user.count, 1);
  assert.equal(user.children.reduce((sum, child) => sum + child.count, 0), 2);
  assert.equal(user.children.reduce((sum, child) => sum + child.amount, 0), user.amount);
  assert.deepEqual(user.children.map(child => child.parentReason), ['用户问题', '用户问题']);
  assert.equal(groups.reduce((sum, group) => sum + group.amount, 0), M.summarize(query).amount);
});

test('both levels retain the complete paid denominator, including unrefunded orders', () => {
  const user = M.summarizeReasonHierarchy(query).find(group => group.reason === '用户问题');
  assert.equal(user.rate, 1 / 3);
  assert.equal(user.amountRate, 5000 / 30000);
  const selected = user.children.find(child => child.reason === '选错SKU');
  assert.equal(selected.rate, 1 / 3);
  assert.equal(selected.amountRate, 3000 / 30000);
});

test('refund-type filtering changes the numerator without changing the paid denominator', () => {
  const groups = M.summarizeReasonHierarchy({...query, refunds: M.typeRows(query.refunds, 'only')});
  assert.equal(groups.length, 1);
  assert.equal(groups[0].reason, '商品问题');
  assert.equal(groups[0].amount, 4000);
  assert.equal(groups[0].rate, 1 / 3);
});

test('refund-date and incomplete-data cases preserve amounts and null rates', () => {
  const refundQuery = M.query(data, {...state, basis: 'refund', customStart: '2026-10-05', customEnd: '2026-10-05'});
  const groups = M.summarizeReasonHierarchy(refundQuery);
  assert.equal(groups.reduce((sum, group) => sum + group.amount, 0), 9000);
  assert(groups.every(group => group.rate === null && group.children.every(child => child.rate === null)));
  assert(M.summarizeReasonHierarchy({...query, complete: false}).every(group => group.rate === null && group.amountRate === null));
});

test('empty and unclassified reasons never invent rows or drop successful refunds', () => {
  assert.deepEqual(M.summarizeReasonHierarchy({...query, refunds: []}), []);
  const groups = M.summarizeReasonHierarchy({...query, refunds: [refund('C1', 'C', '未映射原因', 1000)]});
  assert.equal(groups[0].reason, '其他');
  assert.equal(groups[0].children[0].reason, '未映射原因');
  assert.equal(groups[0].amount, 1000);
});

test('the mock covers the observed taxonomy without changing core monetary totals', () => {
  const generated = M.createData();
  const result = M.query(generated, {basis: 'pay', period: 'seven'});
  const groups = M.summarizeReasonHierarchy(result), summary = M.summarize(result);
  assert.equal(M.REASON_GROUPS.length, 9);
  assert.equal(M.REASON_GROUPS.reduce((sum, group) => sum + group.reasons.length, 0), 22);
  assert.equal(groups.length, 9);
  assert.equal(groups.reduce((sum, group) => sum + group.children.length, 0), 22);
  assert.equal(summary.amount, 5039037);
  assert.equal(summary.count, 193);
  assert.equal(summary.paid, 1277);
  assert.equal(groups.reduce((sum, group) => sum + group.amount, 0), summary.amount);
  for (const row of result.refunds) {
    const group = M.REASON_GROUPS.find(item => item.id === row.reasonGroup);
    assert(group && group.reasons.includes(row.reason));
  }
});

console.log(`\n${passed}/${passed} reason-hierarchy checks passed`);
