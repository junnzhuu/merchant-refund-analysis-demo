'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the actual chart functions against a small DOM surface. Fixtures supply
// model output, so the checks observe rendered SVG and pointer interactions.
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const start = app.indexOf('function trendValue(');
const end = app.indexOf('const reasonMetricLabels', start);
assert(start >= 0 && end > start, 'Actual trend functions must be present');
const helpers = ['money', 'typeName', 'metricName', 'percentage', 'escapeHTML', 'isRateMetric', 'isReviewView'].map(name => {
  const match = app.match(new RegExp('^const\\s+' + name + '\\s*=.*$', 'm'));
  assert(match, 'Actual chart helper must exist: ' + name);
  return match[0];
}).join('\n');
const source = helpers + '\n' + app.slice(start, end);

function fixture(current, overrides = {}) {
  return {
    labels: current.map((_, i) => '10-' + String(i + 1).padStart(2, '0')),
    current,
    previous: current.map(() => 90000),
    currentDates: current.map((_, i) => '2026-10-' + String(i + 1).padStart(2, '0')),
    previousDates: current.map((_, i) => '2019-01-' + String(i + 1).padStart(2, '0')),
    currentReasons: current.map(() => ''),
    previousReasons: current.map(() => '旧期缺失哨兵'),
    currentLabel: '本期',
    previousLabel: '旧期哨兵',
    realtime: false,
    ...overrides
  };
}

function render(series, metric = 'amount', review = false, cutoff = '2026-11-02 14:30:00') {
  let html = '', hits = [], tip;
  const host = {
    getBoundingClientRect: () => ({ left: 0, width: 1000 }),
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      hits = [...value.matchAll(/<rect\b[^>]*data-trend-index="(\d+)"[^>]*>/g)].map(match => ({ dataset: { trendIndex: match[1] } }));
      tip = { innerHTML: '', hidden: true, style: {} };
    }
  };
  const heading = {textContent:''}, legend = {hidden:true,innerHTML:''};
  const floating = () => ({attrs:{hidden:''},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},toggleAttribute(k,on){if(on)this.attrs[k]='';else delete this.attrs[k]}});
  const hoverLine=floating(),hoverDot=floating();
  const context = vm.createContext({
    document:{body:{dataset:{refundView:review?'review':'v0'}}},
    state: { metric, type: 'all' },
    data: {cutoff},
    M: { REFUND_TYPE_LABELS: require('../refund-model.js').REFUND_TYPE_LABELS, buildTrend: () => series },
    $: selector => {
      if (selector === '#trend') return host;
      if (selector === '#trendTooltip') return tip;
      if (selector === '#trendHeading') return heading;
      if (selector === '#trendLegend') return legend;
      if (selector === '#trendHoverLine') return hoverLine;
      if (selector === '#trendHoverDot') return hoverDot;
      throw new Error('Unexpected DOM selector: ' + selector);
    },
    $$: selector => {
      assert.equal(selector, '[data-trend-index]');
      return hits;
    }
  });
  vm.runInContext(source, context);
  vm.runInContext('renderTrend({}, {});', context);
  return {
    svg: html.match(/<svg\b[\s\S]*?<\/svg>/)[0],
    heading,legend,hoverLine,hoverDot,
    hover(index) {
      assert(hits[index], 'Hover target must exist at index ' + index);
      hits[index].onpointermove({ clientX: 150 });
      assert.equal(tip.hidden, false);
      return tip.innerHTML;
    },
    leave(index) {
      hits[index].onpointerleave();
      assert.equal(tip.hidden, true);
    }
  };
}

const tags = (svg, tag) => [...svg.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'g'))].map(match => match[0]);
const attribute = (tag, name) => tag.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1];
function noPrevious(view, hoverIndex = 0) {
  const curves=tags(view.svg,'path').filter(tag=>attribute(tag,'data-series')==='current');
  assert.equal(curves.length, 1, 'There must be one current-series curve');
  assert.doesNotMatch(curves[0], /stroke-dasharray/, 'The series path must not be the previous dashed trace');
  assert.doesNotMatch(view.svg, /旧期|2019-01|#9aaebe/, 'SVG, titles and accessible label must contain only current data');
  assert.doesNotMatch(view.hover(hoverIndex), /旧期|2019-01|class="previous"/, 'Hover content must contain only current data');
}

const checks = [];
function test(name, fn) {
  try {
    fn();
    checks.push(true);
    console.log('PASS ' + name);
  } catch (error) {
    checks.push(false);
    console.error('FAIL ' + name + '\n' + error.stack);
  }
}

test('previous values cannot change current SVG, vertical range or hover output', () => {
  const base = fixture([10, 20, 15]);
  const high = render(base);
  const absent = render({ ...base, previous: [null, null, null] });
  assert.equal(high.svg, absent.svg, 'A much larger previous period must not rescale or redraw the chart');
  assert.equal(high.hover(1), absent.hover(1));
  noPrevious(high, 1);
  assert.match(high.svg, /aria-label="[^"]*本期趋势"/);
  assert.match(high.hover(1), /2026-10-02/);
  assert.match(high.hover(1), /20\.00元/);
  high.leave(1);
});

test('a single current point remains a single marker with no previous marker or title data', () => {
  const view = render(fixture([42]));
  noPrevious(view);
  assert.equal(tags(view.svg, 'circle').length, 1);
  assert.equal([...view.svg.matchAll(/<title>/g)].length, 1);
  assert.match(view.hover(0), /42\.00元/);
});

test('zero, missing and isolated current points never fall back to previous values', () => {
  const zero = render(fixture([0, 0]), 'count');
  noPrevious(zero);
  assert.equal(tags(zero.svg, 'circle').length, 0);
  const coordinates = [...attribute(tags(zero.svg, 'path')[0], 'd').matchAll(/[ML]([\d.]+),([\d.]+)/g)];
  assert.equal(coordinates.length, 2);
  assert.equal(coordinates[0][2], coordinates[1][2], 'Two zero values must render at the same height');
  assert.match(zero.hover(0), /0单/);

  const missing = render(fixture([null, null], { currentReasons: ['本期缺失哨兵', '本期缺失哨兵'] }), 'rate');
  noPrevious(missing);
  assert.equal(attribute(tags(missing.svg, 'path')[0], 'd').trim(), '');
  assert.equal(tags(missing.svg, 'circle').length, 0);
  assert.match(missing.hover(0), /本期缺失哨兵/);

  const isolated = render(fixture([null, 5, null]), 'count');
  noPrevious(isolated, 1);
  assert.equal(tags(isolated.svg, 'circle').length, 1);
  assert.match(isolated.hover(1), /5单/);
});

test('the four metric modes retain correct chart and hover units', () => {
  for (const [metric, value, axisUnit, shown] of [
    ['amount', 12.34, '元', '12.34元'],
    ['count', 12, '单', '12单'],
    ['rate', 0.2, '%', '20.00%'],
    ['amountRate', 0.125, '%', '12.50%']
  ]) {
    const view = render(fixture([value]), metric);
    noPrevious(view);
    assert(view.svg.includes('单位：' + axisUnit), metric + ' axis unit');
    assert(view.svg.includes('：' + shown + '</title>'), metric + ' native hover value');
    assert(view.hover(0).includes('<strong>' + shown + '</strong>'), metric + ' pointer hover value');
  }
});

test('realtime retains hourly dates and cutoff marker while future hours stay empty', () => {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
  const current = hours.map((_, i) => i <= 14 ? i + 1 : null);
  const view = render(fixture(current, {
    realtime: true,
    currentLabel: '今日截至当前',
    labels: hours,
    currentDates: hours.map(hour => '2026-11-02 ' + hour),
    currentReasons: hours.map((_, i) => i > 14 ? '尚未到达该时段' : '')
  }), 'count');
  noPrevious(view, 14);
  assert.match(view.svg, />00:00<\/text>/);
  assert.match(view.svg, />23:00<\/text>/);
  assert.match(view.svg, /更新至 14:00/);
  const cutoff = tags(view.svg, 'line').find(line => attribute(line, 'x1') === attribute(line, 'x2'));
  assert(cutoff, 'A vertical cutoff marker must remain');
  const lastDrawnX = Math.max(...[...attribute(tags(view.svg, 'path')[0], 'd').matchAll(/[ML]([\d.]+),/g)].map(match => Number(match[1])));
  assert(lastDrawnX <= Number(attribute(cutoff, 'x1')) + 0.1, 'Future hours must not extend the line past the cutoff');
  assert.match(view.hover(14), /2026-11-02 14:00/);
  assert.match(view.hover(14), /15单/);
  assert.match(view.hover(15), /2026-11-02 15:00/);
  assert.match(view.hover(15), /尚未到达该时段/);
  assert.equal(tags(view.svg, 'circle').length, 0);
});

test('review adds current-period area and context without adding a second data series', () => {
  const view=render(fixture([10,20,15]),'amount',true);
  noPrevious(view,1);
  assert.equal(tags(view.svg,'path').length,2);
  assert.match(view.svg,/class="trend-area"/);
  assert.match(view.hover(1),/¥20\.00/);
  assert.match(view.heading.textContent,/数据趋势.*全部 退款.*退款金额/);
  assert.equal(view.legend.hidden,false);
  assert.match(view.legend.innerHTML,/全部 退款/);
  assert.equal(view.hoverLine.attrs.x1,view.hoverLine.attrs.x2);
  assert.equal('hidden' in view.hoverLine.attrs,false);
  assert.equal('hidden' in view.hoverDot.attrs,false);
  assert.equal(view.svg,render({...fixture([10,20,15]),previous:[null,null,null]},'amount',true).svg);
  view.leave(1);assert.equal('hidden' in view.hoverLine.attrs,true);
});

test('review area closes each available segment and leaves missing samples empty', () => {
  const view=render(fixture([1,2,null,3,4]),'count',true);
  noPrevious(view,1);
  const area=attribute(tags(view.svg,'path').find(tag=>attribute(tag,'class')==='trend-area'),'d');
  assert.equal((area.match(/M/g)||[]).length,2);
  assert.equal((area.match(/Z/g)||[]).length,2);
  view.hover(2);assert.equal('hidden' in view.hoverDot.attrs,true);
  const single=render(fixture([null,5,null]),'count',true);
  assert.equal(attribute(tags(single.svg,'path').find(tag=>attribute(tag,'class')==='trend-area'),'d'),'');
  const zero=render(fixture([0,0]),'amountRate',true);noPrevious(zero);assert.match(zero.hover(0),/0\.00%/);
  const missing=render(fixture([null,null]),'rate',true);noPrevious(missing);
  assert.equal(attribute(tags(missing.svg,'path').find(tag=>attribute(tag,'class')==='trend-area'),'d'),'');
});

test('review realtime shading stops at the last available hour', () => {
  const cur=Array.from({length:24},(_,i)=>i<=14?i+1:null);
  const view=render(fixture(cur,{realtime:true}),'count',true);
  const cutoff=tags(view.svg,'line').find(tag=>attribute(tag,'class')==='trend-cutoff');
  const area=attribute(tags(view.svg,'path').find(tag=>attribute(tag,'class')==='trend-area'),'d');
  const largestX=Math.max(...[...area.matchAll(/[ML]([\d.]+),/g)].map(match=>Number(match[1])));
  assert(largestX<=Number(attribute(cutoff,'x1'))+.1);
  noPrevious(view,14);
});

test('realtime marker rounds down to the latest hour, including at day end', () => {
  const cur=Array.from({length:24},(_,i)=>i<=8?i+1:null);
  const view=render(fixture(cur,{realtime:true}),'count',true,'2026-11-10 08:17:00');
  assert.match(view.svg,/更新至 08:00/);
  assert.doesNotMatch(view.svg,/更新至 08:17/);
  const markerAtEight=tags(view.svg,'line').find(tag=>attribute(tag,'class')==='trend-cutoff');
  assert.equal(Number(attribute(markerAtEight,'x1')),56+8*(984-56)/23);
  const late=render(fixture(cur,{realtime:true}),'count',true,'2026-11-10 23:59:00');
  const marker=tags(late.svg,'line').find(tag=>attribute(tag,'class')==='trend-cutoff');
  assert.equal(Number(attribute(marker,'x1')),984);
  assert.match(late.svg,/text-anchor="end"[^>]*>更新至 23:00/);
});

console.log(`\n${checks.filter(Boolean).length}/${checks.length} trend-view checks passed`);
if (checks.some(passed => !passed)) process.exitCode = 1;
