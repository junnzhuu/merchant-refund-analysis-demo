'use strict';

const assert = require('node:assert/strict');
const M = require('../refund-model.js');
const tests = [];
function test(name, fn) {
  try {
    fn();
    tests.push({ name, passed: true });
    console.log('PASS ' + name);
  } catch (error) {
    tests.push({ name, passed: false });
    console.error('FAIL ' + name + '\n' + error.stack);
  }
}
function equalPeriod(state, current, previous, referenceDay) {
  const result = M.getPeriod(state, referenceDay);
  assert.deepEqual(result.current, { start: current[0], end: current[1] });
  assert.deepEqual(result.previous, { start: previous[0], end: previous[1] });
  return result;
}

test('fixed demo clock and yesterday shortcut', () => {
  assert.equal(M.DAY, '2026-11-02');
  assert.equal(M.CUTOFF, '2026-11-02 14:30:00');
  const p = equalPeriod({ period: 'one' }, ['2026-11-01', '2026-11-01'], ['2026-10-31', '2026-10-31']);
  assert.equal(p.realtime, false);
});
test('rolling seven and thirty days end yesterday across month boundaries', () => {
  equalPeriod({ period: 'seven' }, ['2026-10-26', '2026-11-01'], ['2026-10-19', '2026-10-25']);
  equalPeriod({ period: 'thirty' }, ['2026-10-03', '2026-11-01'], ['2026-09-03', '2026-10-02']);
});
test('defaults choose current natural periods only when historical days exist', () => {
  assert.deepEqual(M.defaults(), { selectedDay: '2026-11-01', selectedWeek: '2026-W44', selectedMonth: '2026-11' });
  assert.deepEqual(M.defaults('2026-11-04'), { selectedDay: '2026-11-03', selectedWeek: '2026-W45', selectedMonth: '2026-11' });
  assert.equal(M.defaults('2026-11-01').selectedMonth, '2026-10');
});
test('current natural month is clipped to yesterday and compares equal progress', () => {
  const p = equalPeriod({ period: 'calendar_month', selectedMonth: '2026-11' }, ['2026-11-01', '2026-11-01'], ['2026-10-01', '2026-10-01']);
  assert.equal(p.partial, true);
  assert.equal(p.comparison, 'same_progress');
  assert.equal(M.validateSelection({ period: 'calendar_month', selectedMonth: '2026-11' }), '');
});
test('Monday current week has no historical date and is not selectable', () => {
  assert.match(M.validateSelection({ period: 'calendar_week', selectedWeek: '2026-W45' }), /暂无已结束日期/);
  const p = equalPeriod({ period: 'calendar_week' }, ['2026-10-26', '2026-11-01'], ['2026-10-19', '2026-10-25']);
  assert.equal(p.partial, false);
  assert.equal(p.comparison, 'previous_period');
});
test('partial natural week compares the same weekdays of preceding week', () => {
  const p = equalPeriod({ period: 'calendar_week', selectedWeek: '2026-W45' }, ['2026-11-02', '2026-11-04'], ['2026-10-26', '2026-10-28'], '2026-11-05');
  assert.equal(p.partial, true);
  assert.equal(p.comparison, 'same_progress');
  assert.equal(M.validateSelection({ period: 'calendar_week', selectedWeek: '2026-W45' }, '2026-11-05'), '');
});
test('partial month comparison stops at previous short month end', () => {
  const p = equalPeriod({ period: 'calendar_month', selectedMonth: '2026-03' }, ['2026-03-01', '2026-03-30'], ['2026-02-01', '2026-02-28'], '2026-03-31');
  assert.equal(p.partial, true);
});
test('completed historical natural months retain both full month totals', () => {
  const p = equalPeriod({ period: 'calendar_month', selectedMonth: '2026-10' }, ['2026-10-01', '2026-10-31'], ['2026-09-01', '2026-09-30']);
  assert.equal(p.partial, false);
  equalPeriod({ period: 'calendar_month', selectedMonth: '2026-02' }, ['2026-02-01', '2026-02-28'], ['2026-01-01', '2026-01-31'], '2026-03-01');
});
test('first day of month disables empty current month and selects preceding month by default', () => {
  assert.match(M.validateSelection({ period: 'calendar_month', selectedMonth: '2026-11' }, '2026-11-01'), /暂无已结束日期/);
  assert.equal(M.defaults('2026-11-01').selectedMonth, '2026-10');
  assert.match(M.validateSelection({ period: 'calendar_month', selectedMonth: '2026-12' }), /暂无已结束日期/);
});
test('legacy natural period aliases and cross year ISO weeks remain compatible', () => {
  assert.deepEqual(M.weekBounds('2026-W01'), { start: '2025-12-29', end: '2026-01-04' });
  assert.equal(M.isoWeek('2025-12-29'), '2026-W01');
  const weekA = M.getPeriod({ period: 'week', selectedWeek: '2026-W44' });
  const weekB = M.getPeriod({ period: 'calendar_week', selectedWeek: '2026-W44' });
  assert.deepEqual(weekA.current, weekB.current);
  assert.deepEqual(weekA.previous, weekB.previous);
  equalPeriod({ period: 'calendar_day', selectedDay: '2026-10-31' }, ['2026-10-31', '2026-10-31'], ['2026-10-30', '2026-10-30']);
  assert.deepEqual(M.monthBounds('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
});
test('custom dates reject today and reversed ranges while realtime remains valid', () => {
  assert.match(M.validateSelection({ period: 'custom', customStart: '2026-11-01', customEnd: '2026-11-02' }), /最晚截至昨天/);
  assert.match(M.validateSelection({ period: 'custom', customStart: '2026-11-01', customEnd: '2026-10-31' }), /开始日期/);
  assert.equal(M.validateSelection({ period: 'today' }), '');
});

const catalog = [
  { id: 'p0', name: 'FAESSLIN fixture pants', code: 'A001', spu: '1000', category: '休闲裤', channel: '品牌直发' },
  { id: 'p1', name: 'FAESSLIN fixture jeans', code: 'B001', spu: '2000', category: '牛仔裤', channel: '入仓' }
];
const payment = (id, date, time, amount, product = 'p0', sku = 'M') => ({ subOrderId: id, payDate: date, payTime: `${date} ${time}`, amount, product, sku });
const payments = [
  payment('A', '2026-10-01', '10:00:00', 10000),
  payment('B', '2026-10-01', '11:00:00', 20000, 'p1', 'XL'),
  payment('C', '2026-10-01', '12:00:00', 10000, 'p0', 'L'),
  payment('D', '2026-11-02', '10:00:00', 10000),
  payment('F', '2026-11-02', '14:30:01', 10000)
];
const refund = (refundId, child, date, time, amount, type = 'mid', status = 'success') => ({ ...payments.find(p => p.subOrderId === child), refundId, afterSale: 'AS-' + refundId, refundDate: date, refundTime: `${date} ${time}`, amount, type, status, reason: 'fixture' });
const boundary = refund('A-boundary', 'A', '2026-10-31', '10:00:00', 1000);
const refunds = [
  boundary,
  { ...boundary },
  refund('A-over', 'A', '2026-10-31', '10:00:01', 500),
  refund('A-before', 'A', '2026-10-01', '09:59:59', 100),
  refund('B-1', 'B', '2026-10-15', '10:00:00', 2000, 'return'),
  refund('B-2', 'B', '2026-10-17', '10:00:00', 3000, 'return'),
  refund('C-failed', 'C', '2026-10-02', '12:00:00', 2000, 'transit', 'failed'),
  refund('D-success', 'D', '2026-11-02', '14:30:00', 500),
  refund('D-future', 'D', '2026-11-02', '14:30:01', 500),
  refund('F-future-payment', 'F', '2026-11-02', '14:31:00', 500)
];
const data = { catalog, payments, refunds, cutoff: M.CUTOFF, coverage: { start: '2025-01-01', end: M.DAY } };
const state = { basis: 'pay', period: 'custom', customStart: '2026-10-01', customEnd: '2026-10-01', type: 'all', metric: 'rate', brand: '全部品牌', category: '全部类目', channel: '全部出价渠道', search: '' };

test('payment window includes exactly 30x24 hours and excludes one second later or prepayment refund', () => {
  const q = M.query(data, state);
  assert.deepEqual(q.refunds.map(r => r.refundId), ['A-boundary', 'B-1', 'B-2']);
  assert.equal(q.payments.length, 3);
});
test('refund time includes successful refunds beyond payment window', () => {
  const q = M.query(data, { ...state, basis: 'refund', customStart: '2026-10-31', customEnd: '2026-10-31' });
  assert.deepEqual(q.refunds.map(r => r.refundId), ['A-boundary', 'A-over']);
  assert.equal(M.summarize(q).count, 1);
  assert.equal(M.summarize(q).amount, 1500);
});
test('multiple refunds and duplicate source records produce distinct order and amount rates', () => {
  const s = M.summarize(M.query(data, state));
  assert.equal(s.amount, 6000);
  assert.equal(s.count, 2);
  assert.equal(s.paid, 3);
  assert.equal(s.paidAmount, 40000);
  assert.equal(s.rate, 2 / 3);
  assert.equal(s.amountRate, 0.15);
  assert.notEqual(s.rate, s.amountRate);
});
test('a received order paid 500 and partially refunded 200 contributes 200 and one distinct order', () => {
  const paid = { ...payments[1], amount: 50000 };
  const first = refund('B-200-1', 'B', '2026-10-15', '10:00:00', 8000, 'return');
  const second = refund('B-200-2', 'B', '2026-10-15', '11:00:00', 12000, 'return');
  const fixture = { ...data, payments: [paid], refunds: [first, { ...first }, second] };
  const byPayment = M.summarize(M.query(fixture, state), 'return');
  assert.deepEqual([byPayment.amount, byPayment.count, byPayment.paidAmount, byPayment.paid], [20000, 1, 50000, 1]);
  assert.equal(byPayment.amountRate, 0.4);
  const refundDate = { ...state, basis: 'refund', customStart: '2026-10-15', customEnd: '2026-10-15' };
  const byRefund = M.summarize(M.query(fixture, refundDate), 'return');
  assert.deepEqual([byRefund.amount, byRefund.count], [20000, 1]);
});
test('classification rates use the same complete payment cohort and add up', () => {
  const q = M.query(data, state), all = M.summarize(q), parts = M.REFUND_TYPES.map(type => M.summarize(q, type));
  assert(parts.every(p => p.paid === all.paid && p.paidAmount === all.paidAmount));
  for (const key of ['amount', 'count', 'rate', 'amountRate']) assert(Math.abs(parts.reduce((n, p) => n + p[key], 0) - all[key]) < 1e-12);
  assert.deepEqual(M.query(data, { ...state, type: 'return' }), q);
});
test('reason summaries deduplicate records and orders while sharing all paid order and amount denominators', () => {
  const reasonRefunds = [
    { ...boundary, reason: '尺码' }, { ...boundary, reason: '尺码' },
    { ...refunds.find(r => r.refundId === 'B-1'), reason: '尺码' },
    { ...refunds.find(r => r.refundId === 'B-2'), reason: '不喜欢' },
    { ...refund('B-3', 'B', '2026-10-18', '10:00:00', 500, 'return'), reason: '尺码' },
    { ...refunds.find(r => r.refundId === 'A-over'), reason: '超出观察期' }
  ];
  const reasons = M.summarizeReasons(M.query({ ...data, refunds: reasonRefunds }, state));
  assert.deepEqual(reasons, [
    { reason: '尺码', amount: 3500, count: 2, amountRate: 3500 / 40000, rate: 2 / 3 },
    { reason: '不喜欢', amount: 3000, count: 1, amountRate: 3000 / 40000, rate: 1 / 3 }
  ]);
});
test('all refund reasons remain present with stable source order for equal amounts', () => {
  const reasonRefunds = [100, 300, 200, 300, 50, 40, 30].map((amount, i) => ({ ...boundary, refundId: 'reason-' + i, reason: '原因' + i, amount }));
  const reasons = M.summarizeReasons(M.query({ ...data, refunds: reasonRefunds }, state));
  assert.deepEqual(reasons.map(r => r.reason), ['原因1', '原因3', '原因2', '原因0', '原因4', '原因5', '原因6']);
  assert(reasons.every(r => r.count === 1));
});
test('reason rates retain null denominators and missing coverage semantics from summaries', () => {
  const result = M.query({ ...data, refunds: [boundary] }, state);
  const noPayments = M.summarizeReasons({ ...result, payments: [] })[0];
  assert.equal(noPayments.amountRate, null);
  assert.equal(noPayments.rate, null);
  const zeroAmount = M.summarizeReasons({ ...result, payments: [{ ...payments[0], amount: 0 }] })[0];
  assert.equal(zeroAmount.amountRate, null);
  assert.equal(zeroAmount.rate, 1);
  const missing = M.summarizeReasons({ ...result, complete: false })[0];
  assert.equal(missing.amountRate, null);
  assert.equal(missing.rate, null);
  assert.deepEqual(M.summarizeReasons({ ...result, refunds: [] }), []);
});
test('product and SKU summaries retain unrefunded payments, isolate denominators and deduplicate partial refunds', () => {
  const fixture = {
    ...data,
    payments: [...payments, payment('UNREFUNDED-M', '2026-10-01', '13:00:00', 5000), payment('UNREFUNDED-S', '2026-10-01', '14:00:00', 6000, 'p0', 'S')],
    refunds: [
      { ...boundary, reason: '尺码' }, { ...boundary, reason: '尺码' },
      { ...refund('A-part', 'A', '2026-10-20', '10:00:00', 500), reason: '不喜欢' },
      { ...refund('C-success', 'C', '2026-10-20', '10:00:00', 2000), reason: '尺码' },
      ...refunds.filter(r => r.subOrderId === 'B')
    ]
  };
  const products = M.summarizeProducts(M.query(fixture, state)), [jeans, pants] = products;
  assert.deepEqual(products.map(p => p.product), ['p1', 'p0']);
  assert.deepEqual([jeans.amount, jeans.count, jeans.paid, jeans.paidAmount, jeans.rate, jeans.amountRate], [5000, 1, 1, 20000, 1, 0.25]);
  assert.deepEqual([pants.amount, pants.count, pants.paid, pants.paidAmount, pants.rate, pants.amountRate], [3500, 2, 4, 31000, 0.5, 3500 / 31000]);
  assert.deepEqual(pants.skus.map(s => s.sku), ['L', 'M']);
  const medium = pants.skus.find(s => s.sku === 'M');
  assert.deepEqual([medium.amount, medium.count, medium.paid, medium.paidAmount, medium.rate, medium.amountRate], [1500, 1, 2, 15000, 0.5, 0.1]);
  assert.deepEqual(medium.reasons, [
    { reason: '尺码', amount: 1000, count: 1, amountShare: 2 / 3 },
    { reason: '不喜欢', amount: 500, count: 1, amountShare: 1 / 3 }
  ]);
  assert.deepEqual(pants.reasons.map(r => [r.reason, r.amountShare]), [['尺码', 6 / 7], ['不喜欢', 1 / 7]]);
  for (const item of [pants, ...pants.skus]) assert(Math.abs(item.reasons.reduce((sum, r) => sum + r.amountShare, 0) - 1) < 1e-12);
});
test('refund-basis product denominators use same-period payments rather than refunded orders historical payments', () => {
  const samePeriod = payment('OCT31-UNREFUNDED', '2026-10-31', '12:00:00', 40000);
  const q = M.query({ ...data, payments: [...payments, samePeriod] }, { ...state, basis: 'refund', customStart: '2026-10-31', customEnd: '2026-10-31' });
  const [product] = M.summarizeProducts(q);
  assert.deepEqual([product.amount, product.count, product.paid, product.paidAmount, product.amountRate], [1500, 1, 1, 40000, 1500 / 40000]);
  assert.equal(product.skus[0].paidAmount, 40000);
});
test('product summaries keep every ranked product, stable ties, and null zero or missing denominator semantics', () => {
  const fixturePayments = Array.from({ length: 21 }, (_, i) => payment('RANK' + i, '2026-10-01', '10:00:00', 10000, 'product' + i));
  const q = { complete: true, cutoff: M.CUTOFF, payments: fixturePayments, refunds: fixturePayments.map((p, i) => ({ ...boundary, ...p, refundId: 'rank-' + i, amount: 100, reason: '尺码' })) };
  const products = M.summarizeProducts(q);
  assert.deepEqual(products.map(p => p.product), fixturePayments.map(p => p.product));
  const zero = M.summarizeProducts({ ...q, payments: [{ ...fixturePayments[0], amount: 0 }], refunds: [{ ...q.refunds[0], amount: 0 }] })[0];
  assert.equal(zero.amountRate, null);
  assert.equal(zero.reasons[0].amountShare, null);
  assert.equal(zero.skus[0].reasons[0].amountShare, null);
  const missing = M.summarizeProducts({ ...q, complete: false })[0];
  assert.equal(missing.rate, null);
  assert.equal(missing.amountRate, null);
  assert.equal(missing.skus[0].rate, null);
  assert.deepEqual(M.summarizeProducts({ ...q, refunds: [] }), []);
});
test('product, SKU, brand, category and channel filters restrict the payment denominator coherently', () => {
  const product = M.summarize(M.query(data, { ...state, product: 'p0' }));
  assert.equal(product.paid, 2);
  assert.equal(product.paidAmount, 20000);
  assert.equal(product.rate, 0.5);
  assert.equal(product.amountRate, 0.05);
  const sku = M.summarize(M.query(data, { ...state, product: 'p0', sku: 'M' }));
  assert.equal(sku.rate, 1);
  assert.equal(sku.amountRate, 0.1);
  const jeans = M.summarize(M.query(data, { ...state, brand: 'FAESSLIN', category: '牛仔裤', channel: '入仓' }));
  assert.equal(jeans.paidAmount, 20000);
  assert.equal(jeans.amountRate, 0.25);
  assert.equal(M.summarize(M.query(data, { ...state, brand: 'not-present' })).paid, 0);
});
test('payment source timestamp determines the observation window rather than a copied refund timestamp', () => {
  const spoofed = { ...data, refunds: [{ ...refunds.find(r => r.refundId === 'A-over'), payTime: '2026-10-31 10:00:00' }] };
  assert.equal(M.query(spoofed, state).refunds.length, 0);
});
test('timezone-qualified timestamps use the same Beijing-time 30 day boundary', () => {
  const zoned = { ...data, refunds: [{ ...boundary, refundTime: '2026-10-31T02:00:00Z' }] };
  assert.equal(M.query(zoned, state).refunds.length, 1);
});
test('cutoff excludes future refunds and payments but includes exact cutoff', () => {
  const q = M.query(data, { ...state, period: 'today' });
  assert.deepEqual(q.payments.map(p => p.subOrderId), ['D']);
  assert.deepEqual(q.refunds.map(r => r.refundId), ['D-success']);
  assert.equal(M.summarize(q).amountRate, 0.05);
});
test('no payments, zero paid amount, paid without refund, and missing coverage stay distinguishable', () => {
  const empty = M.summarize(M.query({ ...data, payments: [], refunds: [] }, state));
  assert.equal(empty.rate, null);
  assert.equal(empty.amountRate, null);
  const zero = M.summarize(M.query({ ...data, refunds: [] }, state));
  assert.equal(zero.rate, 0);
  assert.equal(zero.amountRate, 0);
  const zeroAmount = M.summarize(M.query({ ...data, payments: [{ ...payments[0], amount: 0 }], refunds: [] }, state));
  assert.equal(zeroAmount.rate, 0);
  assert.equal(zeroAmount.amountRate, null);
  const missing = M.summarize(M.query({ ...data, coverage: { start: '2026-10-02', end: M.DAY } }, state));
  assert.equal(missing.complete, false);
  assert.equal(missing.rate, null);
  assert.equal(missing.amountRate, null);
});
test('amount and order trend metrics preserve cents versus yuan and ratio units', () => {
  assert.deepEqual(M.buildTrend(data, { ...state, metric: 'amount' }).current, [60]);
  assert.deepEqual(M.buildTrend(data, { ...state, metric: 'rate' }).current, [2 / 3]);
  assert.deepEqual(M.buildTrend(data, { ...state, metric: 'orderRate' }).current, [2 / 3]);
  assert.deepEqual(M.buildTrend(data, { ...state, metric: 'amountRate' }).current, [0.15]);
});
test('historical trend labels use the actual current dates including a single day and cross year ranges', () => {
  assert.deepEqual(M.buildTrend(data, state).labels, ['10-01']);
  assert.deepEqual(M.buildTrend(data, { ...state, period: 'seven' }).labels, ['10-26', '10-27', '10-28', '10-29', '10-30', '10-31', '11-01']);
  assert.deepEqual(M.buildTrend(data, { ...state, customStart: '2025-12-31', customEnd: '2026-01-01' }).labels, ['2025-12-31', '2026-01-01']);
});
test('a longer previous month does not extend the current date axis or shrink its full period summary', () => {
  const paid = payment('JAN-END', '2026-01-30', '10:00:00', 10000);
  const janEnd = { ...paid, refundId: 'JAN-END-1', refundDate: '2026-01-31', refundTime: '2026-01-31 10:00:00', amount: 1234, type: 'mid', status: 'success' };
  const fixture = { ...data, payments: [paid], refunds: [janEnd] };
  const s = { ...state, basis: 'refund', period: 'calendar_month', selectedMonth: '2026-02', metric: 'amount' };
  const previous = M.query(fixture, s, M.getPeriod(s).previous), trend = M.buildTrend(fixture, s);
  assert.equal(trend.labels.length, 28);
  assert.deepEqual([trend.labels[0], trend.labels.at(-1)], ['02-01', '02-28']);
  assert.equal(trend.previousDates.at(-1), '2026-01-28');
  assert.equal(M.summarize(previous).amount, 1234);
});
test('period amount rate uses total refund amount divided by total paid amount instead of averaging points', () => {
  const extraPayment = payment('E', '2026-10-02', '09:00:00', 100000);
  const extraRefund = { ...extraPayment, refundId: 'E-1', refundDate: '2026-10-03', refundTime: '2026-10-03 09:00:00', amount: 10000, status: 'success', type: 'return' };
  const expanded = { ...data, payments: [...payments, extraPayment], refunds: [...refunds, extraRefund] };
  const s = { ...state, customEnd: '2026-10-02', metric: 'amountRate' };
  const summary = M.summarize(M.query(expanded, s)), trend = M.buildTrend(expanded, s);
  assert.equal(summary.amountRate, 16000 / 140000);
  assert.deepEqual(trend.current, [0.15, 0.1]);
  assert.notEqual(summary.amountRate, 0.125);
});
test('trend null reasons distinguish missing coverage and each zero denominator', () => {
  const absent = M.buildTrend({ ...data, coverage: { start: '2026-10-02', end: M.DAY } }, { ...state, metric: 'amountRate' });
  assert.equal(absent.current[0], null);
  assert.equal(absent.currentReasons[0], '数据缺失');
  const empty = M.buildTrend({ ...data, payments: [], refunds: [] }, { ...state, metric: 'amountRate' });
  assert.equal(empty.current[0], null);
  assert.equal(empty.currentReasons[0], '该时段无成交金额');
  assert.equal(M.buildTrend({ ...data, payments: [], refunds: [] }, state).currentReasons[0], '该时段无支付订单');
});
test('realtime amount rate uses hourly payments and leaves future hours empty', () => {
  const trend = M.buildTrend(data, { ...state, period: 'today', metric: 'amountRate' });
  assert.equal(trend.current.length, 24);
  assert.deepEqual([trend.labels[0], trend.labels.at(-1)], ['00:00', '23:00']);
  assert.equal(trend.current[10], 0.05);
  assert.equal(trend.current[11], null);
  assert.equal(trend.currentReasons[11], '该时段无成交金额');
  assert.deepEqual(trend.current.slice(15), Array(9).fill(null));
  assert.equal(trend.currentReasons[15], '尚未到达该时段');
});
test('partial month trends keep unmatched short month days empty rather than zero', () => {
  const expanded = { ...data, coverage: { start: '2025-01-01', end: M.DAY } };
  const trend = M.buildTrend(expanded, { ...state, period: 'calendar_month', selectedMonth: '2026-03', referenceDay: '2026-03-31', metric: 'amount' });
  assert.equal(trend.current.length, 30);
  assert.equal(trend.previous.length, 30);
  assert.deepEqual(trend.previous.slice(28), [null, null]);
  assert.equal(trend.previousReasons[28], '无对应日期');
  assert.equal(trend.previousLabel, '上期同进度');
});
test('generated data remains coherent through the new fixed demo day', () => {
  const generated = M.createData(), paid = new Map(generated.payments.map(p => [p.subOrderId, p])), types = new Map(), amounts = new Map();
  assert.equal(generated.coverage.end, M.DAY);
  for (const r of generated.refunds) {
    assert(paid.has(r.subOrderId));
    assert(r.refundTime >= paid.get(r.subOrderId).payTime);
    assert(r.refundTime <= M.CUTOFF);
    assert(!types.has(r.subOrderId) || types.get(r.subOrderId) === r.type);
    types.set(r.subOrderId, r.type);
    amounts.set(r.subOrderId, (amounts.get(r.subOrderId) || 0) + r.amount);
  }
  for (const [id, amount] of amounts) assert(amount <= paid.get(id).amount);
  for (const period of ['today', 'one', 'seven', 'thirty', 'calendar_week', 'calendar_month']) {
    const s = { ...state, period }, p = M.getPeriod(s), q = M.query(generated, s), summary = M.summarize(q);
    assert.equal(q.complete, true);
    assert.equal(M.query(generated, s, p.previous).complete, true);
    assert(summary.count <= summary.paid);
    assert(summary.amount <= summary.paidAmount);
    for (const key of ['amount', 'count', 'rate', 'amountRate']) assert(Math.abs(M.REFUND_TYPES.reduce((n, t) => n + M.summarize(q, t)[key], 0) - summary[key]) < 1e-10);
  }
});

const failed = tests.filter(t => !t.passed);
console.log(`\n${tests.length - failed.length}/${tests.length} model checks passed`);
if (failed.length) process.exitCode = 1;
