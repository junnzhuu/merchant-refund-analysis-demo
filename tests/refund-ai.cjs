'use strict';

const assert = require('node:assert/strict');
const M = require('../refund-model.js');
const { createReport } = require('../refund-ai.js');
const tests = [];
function test(name, fn) {
  try { fn(); tests.push(true); console.log('PASS ' + name); }
  catch (error) { tests.push(false); console.error('FAIL ' + name + '\n' + error.stack); }
}
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-12, `${actual} should equal ${expected}`);
const catalog = [
  { id: 'pants', name: '品牌甲 休闲裤', code: 'A01', spu: '1001', category: '休闲裤', channel: '品牌直发' },
  { id: 'jeans', name: '品牌乙 牛仔裤', code: 'B01', spu: '1002', category: '牛仔裤', channel: '入仓' },
  { id: 'coat', name: '品牌丙 外套', code: 'C01', spu: '1003', category: '外套', channel: '现货' }
];
const pay = (subOrderId, payDate, amount, product) => ({ subOrderId, payDate, payTime: payDate + ' 10:00:00', amount, product, sku: 'M' });
const payments = [
  pay('A', '2026-10-26', 10000, 'pants'),
  pay('B', '2026-10-27', 20000, 'jeans'),
  pay('C', '2026-10-29', 10000, 'pants'),
  pay('D', '2026-10-30', 10000, 'coat'),
  pay('PREV', '2026-10-20', 5000, 'pants'),
  pay('OLD', '2026-10-18', 90000, 'jeans'),
  pay('TODAY', '2026-11-02', 90000, 'coat')
];
function refund(refundId, id, amount, reason, refundDate = '2026-11-01') {
  return { ...payments.find(row => row.subOrderId === id), refundId, afterSale: 'AS-' + refundId, amount, reason, type: 'return', status: 'success', refundDate, refundTime: refundDate + ' 12:00:00' };
}
const first = refund('A1', 'A', 1000, '尺码不合适');
const fixture = {
  catalog, payments,
  refunds: [first, { ...first }, refund('A2', 'A', 500, '商品瑕疵'), refund('B1', 'B', 4000, '不喜欢'), refund('D1', 'D', 500, '尺码不合适'), refund('P1', 'PREV', 1000, '不喜欢', '2026-10-25'), refund('O1', 'OLD', 90000, '范围外'), refund('T1', 'TODAY', 90000, '今日', '2026-11-02')],
  cutoff: M.CUTOFF,
  coverage: { start: '2025-01-01', end: M.DAY }
};

test('report uses all-shop seven completed payment days and the adjacent previous week', () => {
  const report = createReport(M, fixture);
  assert.deepEqual(report.period.current, { start: '2026-10-26', end: '2026-11-01' });
  assert.deepEqual(report.period.previous, { start: '2026-10-19', end: '2026-10-25' });
  assert.equal(report.scope.basis, 'pay');
  assert.equal(report.scope.period, 'seven');
  assert.equal(report.scope.brand, '全部品牌');
  assert.equal(report.scope.category, '全部类目');
  assert.equal(report.scope.channel, '全部出价渠道');
  assert.equal(report.cutoff, M.CUTOFF);
});

test('summary preserves cents, excludes out-of-cohort refunds and includes unrefunded payments', () => {
  const report = createReport(M, fixture);
  assert.equal(report.current.amount, 6000);
  assert.equal(report.current.count, 3);
  assert.equal(report.current.paid, 4);
  assert.equal(report.current.paidAmount, 50000);
  near(report.current.amountRate, 0.12);
  near(report.current.rate, 0.75);
  assert.equal(report.previous.amount, 1000);
  assert.equal(report.previous.count, 1);
  assert.equal(report.changes.amount.value, 5);
  assert.equal(report.changes.count.value, 2);
  near(report.changes.amountRate.value, -0.4);
  near(report.changes.rate.value, -0.25);
});

test('top reasons and products use the same full-shop refund total as their share denominator', () => {
  const report = createReport(M, fixture);
  assert.deepEqual(report.reasons.map(row => [row.reason, row.amount, row.count]), [['不喜欢', 4000, 1], ['尺码不合适', 1500, 2], ['商品瑕疵', 500, 1]]);
  [2 / 3, 0.25, 1 / 12].forEach((share, index) => near(report.reasons[index].amountShare, share));
  assert.deepEqual(report.products.map(row => [row.product, row.amount]), [['jeans', 4000], ['pants', 1500]]);
  assert.equal(report.products[0].item.name, '品牌乙 牛仔裤');
  near(report.products[0].amountShare, 2 / 3);
  near(report.products[1].amountShare, 0.25);
  assert.equal(report.products[1].paid, 2, 'A non-refunded order stays in the product denominator');
});

test('generated report matches the existing data page queries without mutating its data', () => {
  const data = M.createData();
  const before = JSON.stringify(data);
  const report = createReport(M, data);
  const scope = { ...M.defaults(), basis: 'pay', period: 'seven', brand: '全部品牌', category: '全部类目', channel: '全部出价渠道' };
  const period = M.getPeriod(scope);
  assert.deepEqual(report.current, M.summarize(M.query(data, scope, period.current)));
  assert.deepEqual(report.previous, M.summarize(M.query(data, scope, period.previous)));
  assert.equal(JSON.stringify(data), before);
});

test('empty data preserves zero amounts and unknown rates without invented insights', () => {
  const report = createReport(M, { ...fixture, payments: [], refunds: [] });
  assert.equal(report.current.amount, 0);
  assert.equal(report.current.count, 0);
  assert.equal(report.current.amountRate, null);
  assert.equal(report.current.rate, null);
  assert.equal(report.changes.amount.value, null);
  assert.equal(report.changes.rate.value, null);
  assert.deepEqual(report.reasons, []);
  assert.deepEqual(report.products, []);
});

test('missing historical coverage makes comparison unavailable', () => {
  const report = createReport(M, { ...fixture, coverage: { start: '2026-10-26', end: M.DAY } });
  assert.equal(report.current.complete, true);
  assert.equal(report.previous.complete, false);
  for (const change of Object.values(report.changes)) assert.equal(change.value, null);
});

console.log(`\n${tests.filter(Boolean).length}/${tests.length} refund-ai checks passed`);
if (tests.some(passed => !passed)) process.exitCode = 1;
