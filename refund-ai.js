(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RefundAiDemo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Keep the analysis scope independent of the operational after-sales filters.
  // Amounts in this report stay in cents, matching RefundModel's public API.
  function createReport(model, data) {
    const scope = {
      ...model.defaults(),
      basis: 'pay', period: 'seven',
      brand: '全部品牌', category: '全部类目', channel: '全部出价渠道'
    };
    const period = model.getPeriod(scope);
    const currentQuery = model.query(data, scope, period.current);
    const previousQuery = model.query(data, scope, period.previous);
    const current = model.summarize(currentQuery);
    const previous = model.summarize(previousQuery);
    const complete = current.complete && previous.complete;
    const changes = {};
    for (const key of ['amount', 'count', 'amountRate', 'rate']) {
      changes[key] = model.change(current[key], previous[key], complete);
    }
    const reasons = model.summarizeReasons(currentQuery).slice(0, 3).map(row => ({
      ...row, amountShare: current.amount ? row.amount / current.amount : null
    }));
    const catalog = data.catalog || model.catalog;
    const products = model.summarizeProducts(currentQuery).slice(0, 2).map(row => ({
      ...row,
      item: catalog.find(item => item.id === row.product),
      amountShare: current.amount ? row.amount / current.amount : null
    }));
    return {scope, period, current, previous, changes, reasons, products, cutoff: currentQuery.cutoff};
  }

  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const money = cents => '¥' + (cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const rate = value => value === null ? '—' : (value * 100).toFixed(2) + '%';
  const number = value => value.toLocaleString('en-US');
  const spark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/><path d="m20 2 .7 1.8L22.5 4.5l-1.8.7L20 7l-.7-1.8-1.8-.7 1.8-.7z"/></svg>';

  function changeMarkup(change) {
    if (change.value === null) return '<span class="rai-change" title="' + escape(change.reason) + '">较上周期 —</span>';
    const direction = change.value > 0 ? 'rise' : change.value < 0 ? 'fall' : 'flat';
    const prefix = change.value > 0 ? '+' : '';
    return '<span class="rai-change">较上周期 <b class="rai-' + direction + '">' + prefix + (change.value * 100).toFixed(2) + '%</b></span>';
  }

  function reportMarkup(report) {
    const {current, changes, reasons, products} = report;
    const change = changes.amount.value;
    const comparison = change === null ? '上周期数据不足，暂不作变化判断。' : change === 0 ? '退款金额与上周期持平。' : '退款金额较上周期' + (change > 0 ? '增加' : '减少') + ' ' + (Math.abs(change) * 100).toFixed(2) + '%。';
    const leadingReason = reasons[0];
    const observation = current.count ? '本期累计退款 ' + money(current.amount) + '，涉及 ' + number(current.count) + ' 个子订单。' + comparison : '所选周期内暂无成功退款记录。';
    const focus = leadingReason ? '退款金额最多的原因为「' + leadingReason.reason + '」，占本期退款金额 ' + rate(leadingReason.amountShare) + '。可优先查看对应商品及售后记录。' : '可进入完整退款分析，调整时间或筛选范围后查看。';
    const metrics = [
      ['amount', '退款金额', money(current.amount)],
      ['count', '退款订单数', number(current.count)],
      ['amountRate', '金额退款率', rate(current.amountRate)],
      ['rate', '订单退款率', rate(current.rate)]
    ];
    return `
      <section class="rai-scope" aria-label="分析范围">
        <div><span class="rai-scope-label">分析范围</span><strong>全店 · 近7天</strong></div>
        <p>${escape(report.period.current.start)} 至 ${escape(report.period.current.end)}<span>按支付时间口径</span></p>
        <small>独立分析全店数据，不受当前页面筛选影响</small>
      </section>
      <section class="rai-section" aria-labelledby="raiMetricsTitle">
        <h3 id="raiMetricsTitle">退款概况</h3>
        <div class="rai-metrics">${metrics.map(([key, label, value]) => `<div class="rai-metric" data-ai-metric="${key}"><span>${label}</span><strong>${value}</strong>${changeMarkup(changes[key])}</div>`).join('')}</div>
      </section>
      <section class="rai-insight" aria-labelledby="raiInsightTitle">
        <h3 id="raiInsightTitle">${spark} 本期分析</h3>
        <p>${escape(observation)}</p>
        <p>${escape(focus)}</p>
      </section>
      <section class="rai-section" aria-labelledby="raiReasonsTitle">
        <div class="rai-section-heading"><h3 id="raiReasonsTitle">主要退款原因</h3><span>按退款金额排序</span></div>
        <div class="rai-reasons">${reasons.length ? reasons.map((row, index) => `<div class="rai-reason"><div class="rai-reason-top"><span><i>${index + 1}</i>${escape(row.reason)}</span><strong>${rate(row.amountShare)}</strong></div><div class="rai-reason-track" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, (row.amountShare || 0) * 100)).toFixed(2)}%"></span></div><div class="rai-reason-bottom"><span>${money(row.amount)}</span><span>${number(row.count)} 个退款子订单</span></div></div>`).join('') : '<p class="rai-empty">暂无退款原因数据</p>'}</div>
        <p class="rai-caption">占比为该原因退款金额占本期全部退款金额的比例</p>
      </section>
      <section class="rai-section" aria-labelledby="raiProductsTitle">
        <div class="rai-section-heading"><h3 id="raiProductsTitle">重点退款商品</h3><span>退款金额 Top 2</span></div>
        <div class="rai-products">${products.length ? products.map((row, index) => `<article class="rai-product"><div class="rai-product-rank">${String(index + 1).padStart(2, '0')}</div><div class="rai-product-details"><h4>${escape(row.item ? row.item.name : row.product)}</h4><p>货号：${escape(row.item ? row.item.code : '—')}</p><div class="rai-product-stats"><strong>${money(row.amount)}</strong><span>${number(row.count)} 个退款子订单</span><span>占比 ${rate(row.amountShare)}</span></div></div></article>`).join('') : '<p class="rai-empty">暂无退款商品数据</p>'}</div>
      </section>
      <div class="rai-note"><p>近7天支付订单尚处于30天退款观察期，后续成功退款会继续计入。</p><p>示例数据与分析仅用于方案演示，数据截至 ${escape(report.cutoff)}。</p></div>`;
  }

  function mount({model, data, onViewAnalysis}) {
    const dialog = document.createElement('dialog');
    dialog.id = 'refundAiDrawer';
    dialog.className = 'refund-ai-drawer';
    dialog.setAttribute('aria-labelledby', 'refundAiTitle');
    dialog.innerHTML = `<div class="rai-shell"><header class="rai-header"><div class="rai-title-icon">${spark}</div><div class="rai-header-title"><h2 id="refundAiTitle">AI退款分析</h2><span class="rai-source"></span></div><span class="rai-demo-tag">AI分析演示</span><button type="button" class="rai-close" aria-label="关闭AI退款分析"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button></header><div class="rai-body"></div><footer class="rai-footer"><span>结合完整数据继续查看</span><button type="button" class="btn primary rai-view">查看完整退款分析 <span aria-hidden="true">→</span></button></footer></div>`;
    document.body.appendChild(dialog);
    let opener = null, report = null, locked = false, savedOverflow = '', restoreFocus = true;

    function unlock() {
      if (locked) document.documentElement.style.overflow = savedOverflow;
      locked = false;
    }
    function close() {
      if (dialog.open) dialog.close();
    }
    dialog.addEventListener('close', () => {
      unlock();
      if (restoreFocus && opener && opener.isConnected && opener.getClientRects().length) opener.focus({preventScroll: true});
      opener = null;
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
    });
    dialog.querySelector('.rai-close').addEventListener('click', close);
    dialog.querySelector('.rai-view').addEventListener('click', () => {
      const scope = {...report.scope};
      restoreFocus = false;
      close();
      if (onViewAnalysis) onViewAnalysis({scope});
    });

    function open({sourceLabel = '售后', opener: sourceButton} = {}) {
      if (dialog.open) return;
      opener = sourceButton || document.activeElement;
      restoreFocus = true;
      report = createReport(model, data);
      dialog.querySelector('.rai-source').textContent = '来自' + sourceLabel;
      dialog.querySelector('.rai-body').innerHTML = reportMarkup(report);
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      locked = true;
      dialog.showModal();
      dialog.querySelector('.rai-body').scrollTop = 0;
      dialog.querySelector('.rai-close').focus({preventScroll: true});
    }
    return {open, close};
  }

  return {createReport, mount};
});
