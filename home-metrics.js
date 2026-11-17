(function () {
  'use strict';

  const PERIODS = [
    ['today', '实时'], ['one', '昨天'], ['seven', '近7天'], ['thirty', '近30天']
  ];
  const METRICS = [
    { key: 'paidAmount', name: '支付金额', format: 'money' },
    { key: 'paid', name: '支付订单数', format: 'count' },
    { key: 'buyers', name: '支付用户数', format: 'count' },
    { key: 'amount', name: '退款金额', format: 'money', refund: true },
    { key: 'count', name: '退款订单数', format: 'count', refund: true },
    { key: 'rate', name: '订单退款率', format: 'percent', refund: true },
    { key: 'visitors', name: '商详访问人数', format: 'count' },
    { key: 'conversion', name: '商详转化率', format: 'percent' },
    { key: 'spend', name: '投放消耗', format: 'money' },
    { key: 'spendShare', name: '投放费比', format: 'percent', note: '演示口径：投放消耗 ÷ 同期支付金额' }
  ];
  const formats = {
    money: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
    count: new Intl.NumberFormat('zh-CN'),
    percent: new Intl.NumberFormat('zh-CN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    change: new Intl.NumberFormat('zh-CN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' })
  };
  const DATA_CENTER_URL = 'https://pre-stark.dewu.com/main/dataCenter/productList';

  function buyerId(payment) {
    const key = `${payment.product}|${payment.payTime || payment.payDate}|${payment.skuId || payment.subOrderId}`;
    let hash = 0;
    for (const character of key) hash = (Math.imul(31, hash) + character.charCodeAt(0)) | 0;
    return (hash >>> 0) % 4500;
  }

  // The shared refund fixture has no buyer, visitor or ad data. Generate a repeatable
  // example from its payments so these metrics follow the same range and cutoff.
  function summarize(model, result) {
    const totals = model.summarize(result, 'all');
    const buyers = new Set();
    const paymentDays = new Map();
    for (const payment of result.payments) {
      buyers.add(buyerId(payment));
      if (!paymentDays.has(payment.payDate)) paymentDays.set(payment.payDate, { orders: 0, amount: 0 });
      const day = paymentDays.get(payment.payDate);
      day.orders += 1;
      day.amount += payment.amount;
    }

    let visitors = buyers.size;
    let spend = 0;
    for (const [date, day] of paymentDays) {
      const seed = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
      const visitsPerOrder = 36 + (seed * 17) % 23;
      const dailySpendShare = 0.052 + ((seed * 11) % 17) * 0.0035;
      visitors += day.orders * visitsPerOrder;
      spend += Math.round(day.amount * dailySpendShare);
    }

    return {
      ...totals,
      buyers: buyers.size,
      visitors,
      conversion: visitors ? buyers.size / visitors : null,
      spend,
      spendShare: totals.paidAmount ? spend / totals.paidAmount : null
    };
  }

  function formatValue(value, format) {
    if (!Number.isFinite(value)) return '—';
    return formats[format].format(format === 'money' ? value / 100 : value);
  }

  function cardMarkup(metric) {
    const tag = metric.refund ? 'button' : 'div';
    const control = metric.refund ? ` type="button" data-home-refund title="查看${metric.name}分析（支付时间口径）"` : '';
    const note = metric.note ? ` title="${metric.note}"` : '';
    return `<${tag} class="home-metric-card" data-home-metric="${metric.key}"${control}${note}>
      <span class="home-metric-label">${metric.name}</span>
      <strong class="home-metric-value">—</strong>
      <span class="home-metric-compare"><span data-home-compare-label>较昨日</span> <b data-home-change>—</b></span>
    </${tag}>`;
  }

  function mount({ root, model, getData, onRefund }) {
    let period = 'today';
    root.classList.add('home-metrics');
    root.innerHTML = `<div class="home-metrics-heading">
      <h2>经营数据</h2>
      <div class="home-metrics-periods" role="group" aria-label="经营数据时间周期">
        ${PERIODS.map(([key, label]) => `<button type="button" data-home-period="${key}" aria-pressed="${key === period}">${label}</button>`).join('')}
      </div>
      <div class="home-metrics-meta">
        <span class="home-metrics-cutoff" data-home-cutoff></span>
        <span class="home-metrics-comparison" data-home-comparison>对比昨日全天</span>
      </div>
      <a class="home-metrics-more" href="${DATA_CENTER_URL}" target="_blank" rel="noopener">查看更多<span aria-hidden="true">›</span></a>
    </div>
    <div class="home-metrics-scroll" role="region" aria-label="经营数据指标，可横向滚动" tabindex="0">
      <div class="home-metrics-track" style="--home-metric-count: ${METRICS.length}">${METRICS.map(cardMarkup).join('')}</div>
    </div>`;

    const cutoffLabel = root.querySelector('[data-home-cutoff]');
    const comparisonLabel = root.querySelector('[data-home-comparison]');
    const periodButtons = [...root.querySelectorAll('[data-home-period]')];
    const cards = METRICS.map(metric => {
      const card = root.querySelector(`[data-home-metric="${metric.key}"]`);
      return {
        metric,
        value: card.querySelector('.home-metric-value'),
        compareLabel: card.querySelector('[data-home-compare-label]'),
        change: card.querySelector('[data-home-change]')
      };
    });

    function refresh() {
      const data = getData();
      const cutoff = data.cutoff || model.CUTOFF;
      const scope = { basis: 'pay', period, cutoff };
      const ranges = model.getPeriod(scope, cutoff.slice(0, 10));
      const current = summarize(model, model.query(data, scope, ranges.current));
      const previous = summarize(model, model.query(data, scope, ranges.previous));
      cutoffLabel.textContent = `${cutoff} 更新`;
      comparisonLabel.hidden = !ranges.realtime;

      for (const button of periodButtons) button.setAttribute('aria-pressed', String(button.dataset.homePeriod === period));
      for (const { metric, value, compareLabel, change } of cards) {
        const latest = current[metric.key];
        const diff = model.change(latest, previous[metric.key], current.complete && previous.complete);
        const displayed = formatValue(current.complete ? latest : null, metric.format);
        value.textContent = displayed;
        value.classList.toggle('is-compact', displayed.length > 8);
        value.classList.toggle('is-long', displayed.length > 11);
        compareLabel.textContent = ranges.realtime ? '较昨日' : '较上周期';
        change.textContent = formatValue(diff.value, 'change');
        change.dataset.direction = diff.value > 0 ? 'up' : diff.value < 0 ? 'down' : 'flat';
        change.title = diff.reason || (ranges.realtime ? '对比昨日全天' : '对比相邻上周期');
      }
    }

    for (const button of periodButtons) {
      button.addEventListener('click', () => {
        if (button.dataset.homePeriod === period) return;
        period = button.dataset.homePeriod;
        refresh();
      });
    }
    for (const button of root.querySelectorAll('[data-home-refund]')) {
      button.addEventListener('click', () => onRefund(period));
    }
    refresh();
    return { refresh };
  }

  window.HomeMetrics = { mount };
})();
