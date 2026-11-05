(function (global) {
  'use strict';

  const assistantCounts = {'pending-audit': 3, 'pending-receipt': 2, 'pending-refund': 1, platform: 1};
  const statusNames = {'pending-audit':'待商家审核','pending-receipt':'待商家收货','pending-refund':'待商家退款',platform:'平台处理中'};
  const statusCount = key => assistantCounts[key] || 0;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const spark = '<svg class="as-spark" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 2.3 6.7L18 14l-6.7 2.3L9 23l-2.3-6.7L0 14l6.7-2.3L9 5Z"/><path d="m19 0 1.3 3.7L24 5l-3.7 1.3L19 10l-1.3-3.7L14 5l3.7-1.3L19 0Z"/></svg>';

  function pageHeader(page, title, actions) {
    return '<header class="as-page-header"><div><div class="as-breadcrumb">售后 <span>/</span> ' + title + '</div><h1>' + title + '</h1></div><div class="as-header-actions">' + actions + '</div></header>';
  }
  function analyzeButton(page, copy, primary) {
    return '<button type="button" class="as-button as-ai-entry ' + (primary ? 'as-ai-emphasis' : '') + '" data-as-action="analyze" data-as-source="' + page + '">' + spark + copy + '</button>';
  }

  function summaryChangeMarkup(change) {
    if (!Number.isFinite(change?.value)) return '<span class="as-ai-change" title="' + escape(change?.reason || '上周期数据不足') + '">较上周期 —</span>';
    const value = change.value;
    const direction = value > 0 ? 'rise' : value < 0 ? 'fall' : 'flat';
    const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '';
    const label = value > 0 ? '增加' : value < 0 ? '减少' : '持平';
    const percentage = (Math.abs(value) * 100).toFixed(2) + '%';
    return '<span class="as-ai-change" aria-label="较上周期' + label + percentage + '">较上周期 <b class="as-ai-' + direction + '"><span aria-hidden="true">' + arrow + '</span>' + percentage + '</b></span>';
  }

  function assistantSummaryMarkup(report) {
    const title = '<div class="as-ai-heading-row"><h2 class="as-ai-heading">' + spark + '<span>AI近7日退款分析</span></h2>' + analyzeButton('assistant', '查看完整分析', true) + '</div>';
    if (!report) return '<section class="as-card as-ai-overview" aria-label="AI近7日退款分析">' + title + '<p class="as-ai-unavailable">暂无可用的退款分析摘要，可点击查看完整分析继续查看。</p></section>';
    const rate = value => Number.isFinite(value) ? (value * 100).toFixed(2) + '%' : '—';
    const { current, changes, reasons, period } = report;
    const leadingReason = reasons[0];
    const amountChange = changes.amount.value;
    const comparison = !Number.isFinite(amountChange) ? '上周期数据不足，暂不作变化判断；' : amountChange === 0 ? '退款金额与上周期持平；' : '退款金额较上周期' + (amountChange > 0 ? '增加 ' : '减少 ') + '<strong>' + rate(Math.abs(amountChange)) + '</strong>；';
    const fallbackCopy = current.count ? '本期累计退款 <strong>¥' + money(current.amount / 100) + '</strong>，涉及 <strong>' + current.count.toLocaleString('en-US') + ' 个子订单</strong>，' + comparison + (leadingReason ? '退款金额最多的原因为「<strong>' + escape(leadingReason.reason) + '</strong>」，占本期退款金额 <strong>' + rate(leadingReason.amountShare) + '</strong>，可优先查看对应商品及售后记录。' : '可进入完整退款分析继续查看。') : '所选周期内暂无成功退款记录，可进入完整退款分析调整时间或筛选范围后查看。';
    const summaryCopy = typeof global.RefundAiDemo?.summaryMarkup === 'function' ? global.RefundAiDemo.summaryMarkup(report) : fallbackCopy;
    const metrics = [
      ['amount', '退款金额', '¥' + money(current.amount / 100)],
      ['count', '退款订单数', current.count.toLocaleString('en-US')],
      ['amountRate', '金额退款率', rate(current.amountRate)],
      ['rate', '订单退款率', rate(current.rate)]
    ];
    return '<section class="as-card as-ai-overview" aria-label="AI近7日退款分析">' + title +
      '<div class="as-ai-meta"><span class="as-ai-shop">全店</span><span>' + escape(period.current.start) + ' 至 ' + escape(period.current.end) + '</span><span>按支付时间口径 <span class="as-ai-info" title="统计所选日期支付的订单，在各自支付后30天内成功退款的结果。" aria-label="按支付时间口径：统计所选日期支付的订单，在各自支付后30天内成功退款的结果。" tabindex="0">?</span></span></div>' +
      '<p class="as-ai-scope-note">统计所选日期支付订单的退款结果；近7日支付订单尚在30天退款观察期，后续成功退款会继续计入。</p>' +
      '<div class="as-ai-summary"><h3>' + spark + '总结概述</h3><p class="as-ai-summary-copy">' + summaryCopy + '</p><div class="as-ai-metrics-panel"><h4>退款概况</h4><div class="as-ai-metrics">' + metrics.map(([key, label, value]) => '<div class="as-ai-metric" data-as-ai-metric="' + key + '"><span class="as-ai-metric-label">' + label + '</span><strong class="as-ai-metric-value">' + value + '</strong>' + summaryChangeMarkup(changes[key]) + '</div>').join('') + '</div></div></div></section>';
  }

  function assistantMarkup(report) {
    return pageHeader('assistant', '售后小助手', '<span class="as-demo-label">交互演示 · 示例数据</span>') +
      assistantSummaryMarkup(report) +
      '<section class="as-card as-retention-strip" aria-label="退款挽留"><div class="as-tool-icon" aria-hidden="true">↺</div><div class="as-retention-copy"><h2>退款挽留</h2><p>提供协商方案，争取挽留退款订单</p></div><button type="button" class="as-button" data-as-action="retention">查看退款挽留</button></section>' +
      '<section class="as-card as-daily-report"><div class="as-section-heading"><h2>售后日报</h2><div class="as-daily-date">2026年11月2日 <span>今日待办</span></div></div><div class="as-daily-grid">' + [
        ['pending-audit', '待审核', '及时审核买家申请'],
        ['pending-receipt', '待收货', '关注买家寄回进度'],
        ['pending-refund', '待退款', '及时确认退款结果'],
        ['platform', '平台处理中', '关注平台处理进展']
      ].map(([key, label, desc]) => '<article class="as-daily-cell"><div class="as-daily-label">' + label + '</div><strong>' + statusCount(key) + '<small> 笔</small></strong><p>' + desc + '</p><button type="button" class="as-link" data-as-action="assistant-pending" data-as-status="' + key + '">查看待办 →</button></article>').join('') + '</div></section>' +
      '<div class="as-assistant-note">售后数据与经营工具仅作页面交互演示，未连接真实商家订单。</div>';
  }

  function mount(options) {
    const { root, onAnalyze, notify, getReport } = options || {};
    if (!root || typeof root.appendChild !== 'function') throw new TypeError('AfterSalesDemo.mount requires a root element');
    const say = message => { if (typeof notify === 'function') notify(message); };
    const pages = {};
    for (const page of ['return-center', 'assistant']) {
      const element = document.createElement('section');
      element.className = 'after-sales-page as-' + page;
      element.dataset.afterSalesPage = page;
      element.hidden = true;
      element.setAttribute('aria-label', page === 'return-center' ? '退货中心' : '售后小助手');
      if (page === 'assistant') element.innerHTML = assistantMarkup(typeof getReport === 'function' ? getReport() : null);
      root.appendChild(element);
      pages[page] = element;
    }
    const center = global.ReturnCenterDemo.mount({root: pages['return-center'], onAnalyze, notify: say});
    let activePage = null;
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-as-action]');
      if (!button || !pages.assistant.contains(button)) return;
      const action = button.dataset.asAction;
      if (action === 'analyze') {
        if (typeof onAnalyze === 'function') onAnalyze({source: 'assistant', opener: button});
      } else if (action === 'assistant-pending') {
        say(statusNames[button.dataset.asStatus] + '：共 ' + statusCount(button.dataset.asStatus) + ' 笔示例待办，可在退货中心查看');
      } else if (action === 'retention') {
        say('退款挽留为演示入口，未发送协商方案或修改订单');
      }
    });
    return {
      show(page) {
        if (!Object.prototype.hasOwnProperty.call(pages, page)) return;
        if (activePage === 'return-center' && page !== activePage) center.hide();
        Object.entries(pages).forEach(([key, element]) => { element.hidden = key !== page; });
        if (page === 'return-center') center.show();
        activePage = page;
      },
      hide() {
        if (activePage === 'return-center') center.hide();
        activePage = null;
      }
    };
  }

  global.AfterSalesDemo = { mount };
})(window);
