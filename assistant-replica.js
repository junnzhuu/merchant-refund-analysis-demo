(function (global) {
  'use strict';

  const EMPTY_IMAGE = 'https://cdn.poizon.com/node-common/2490cebb-3202-ccee-7cf0-ba60049f9150-241-235.png';
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const money = cents => '¥' + (cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const rate = value => Number.isFinite(value) ? (value * 100).toFixed(2) + '%' : '—';
  const spark = '<svg class="ar-spark" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 2.3 6.7L18 14l-6.7 2.3L9 23l-2.3-6.7L0 14l6.7-2.3L9 5Z"/><path d="m19 0 1.3 3.7L24 5l-3.7 1.3L19 10l-1.3-3.7L14 5l3.7-1.3L19 0Z"/></svg>';
  const arrow = '<svg class="ar-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>';

  function changeMarkup(change) {
    if (!Number.isFinite(change?.value)) return '<span class="ar-change" title="' + escape(change?.reason || '上周期数据不足') + '">较上期 —</span>';
    const value = change.value;
    const direction = value > 0 ? 'rise' : value < 0 ? 'fall' : 'flat';
    const text = value > 0 ? '增加' : value < 0 ? '减少' : '持平';
    return '<span class="ar-change ar-' + direction + '" aria-label="较上周期' + text + rate(Math.abs(value)) + '"><span aria-hidden="true">' + (value > 0 ? '↑' : value < 0 ? '↓' : '—') + '</span>' + rate(Math.abs(value)) + '</span>';
  }

  function aiCardMarkup(report) {
    const scope = report ? report.period.current.start + ' 至 ' + report.period.current.end + ' · 全店近7日 · 按支付时间口径' : '';
    const heading = '<span class="ar-ai-card-heading"><span class="ar-ai-title">' + spark + 'AI近7日退款分析</span>' + (scope ? '<span class="ar-ai-scope" title="' + escape(scope) + '">' + escape(scope) + '</span>' : '') + '<span class="ar-ai-open">查看分析 ' + arrow + '</span></span>';
    if (!report) return heading + '<span class="ar-ai-empty">查看全店退款金额、退款率及变化趋势</span>';
    const {current, changes} = report;
    const summary = typeof global.RefundAiDemo?.summaryMarkup === 'function' ? global.RefundAiDemo.summaryMarkup(report) : '本期累计退款 <strong>' + money(current.amount) + '</strong>，涉及 <strong>' + current.count.toLocaleString('en-US') + '</strong> 个子订单。';
    const metrics = [
      ['amount', '退款金额', money(current.amount)],
      ['count', '退款订单数', current.count.toLocaleString('en-US')],
      ['amountRate', '金额退款率', rate(current.amountRate)],
      ['rate', '订单退款率', rate(current.rate)]
    ];
    return heading + '<span class="ar-ai-summary" title="' + escape(summary.replace(/<[^>]*>/g, '')) + '">' + summary + '</span><span class="ar-ai-metrics">' + metrics.map(([key, label, value]) => '<span class="ar-ai-metric" data-ar-ai-metric="' + key + '"><span class="ar-ai-metric-label">' + label + '</span><span class="ar-ai-metric-line"><strong>' + value + '</strong>' + changeMarkup(changes[key]) + '</span></span>').join('') + '</span>';
  }

  function taskRow(title, description, action, copy) {
    return '<div class="ar-task-row"><div class="ar-task-copy"><strong>' + title + '</strong><p>' + description + '</p></div><button type="button" class="ar-button ar-outline" data-ar-action="' + action + '">' + copy + '</button></div>';
  }

  function markup(report) {
    return '<header class="ar-page-heading"><h1>售后小助手</h1></header>' +
      '<section class="ar-panel ar-strategies" aria-labelledby="arStrategiesTitle"><h2 class="ar-panel-title" id="arStrategiesTitle">售后经营工具</h2><div class="ar-strategy-grid"><article class="ar-retention-card"><div class="ar-retention-heading"><h3>退款挽留</h3><span class="ar-popularity"><span aria-hidden="true"><svg class="ar-flame" viewBox="0 0 16 20"><path d="M9 0c1 5-4 6-2 10 1-2 3-3 4-5 0 4 5 6 4 10-1 4-4 5-7 5-5 0-8-4-6-8 0-2 2-4 3-5-1 4 1 5 2 6C5 7 11 5 9 0Z"/></svg></span>36,330个商家使用</span><button type="button" class="ar-button ar-primary" data-ar-action="strategy">设置策略</button></div><div class="ar-retention-body"><div class="ar-retention-benefits"><div><span>节约时长</span><strong>6<small>h</small></strong></div><div><span>使用场景</span><strong>退货退款</strong></div></div><p>女装-品牌直发等类目还未设置，近30天有111笔因竞价降价、商品瑕疵等原因导致的退货，累计损失GMV35089.00元。</p></div></article><button type="button" class="ar-ai-card" data-ar-action="analyze" aria-label="查看全店近7日退款分析（按支付时间口径）" aria-haspopup="dialog">' + aiCardMarkup(report) + '</button></div></section>' +
      '<section class="ar-panel ar-daily" aria-labelledby="arDailyTitle"><h2 class="ar-panel-title" id="arDailyTitle">售后日报</h2><div class="ar-daily-grid"><article class="ar-task-card ar-pending-card"><h3>售后待处理</h3><div class="ar-task-body">' + taskRow('待签收(44)', '如您已收到买家退货，请尽快操作确认收货', 'receipt', '去签收') + taskRow('待质检(17)', '24小时内不处理将自动查验通过，请尽快查验', 'inspection', '去质检') + '</div></article><article class="ar-task-card ar-empty-card"><h3>待回复工单</h3><div class="ar-empty-body"><img src="' + EMPTY_IMAGE + '" alt="" width="82" height="80"><p>暂无待处理事项</p></div></article><article class="ar-task-card"><h3>待举证</h3><div class="ar-task-body">' + taskRow('仲裁待举证(1)', '超时将自动转为平台判责，请及时处理', 'evidence', '去处理') + '</div></article><article class="ar-task-card"><h3>开票申请</h3><div class="ar-task-body">' + taskRow('买家申请开票(1)', '请在8个自然日内开具，如您超时未开票，将被处以罚款、延长账期并扣除信用分', 'invoice', '去处理') + '</div></article></div></section>';
  }

  function mount({root, getReport, onAnalyze, notify} = {}) {
    if (!root || typeof root.querySelector !== 'function') throw new TypeError('AssistantReplica.mount requires a root element');
    root.classList.add('ar-root');
    root.innerHTML = markup(typeof getReport === 'function' ? getReport() : null);
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-ar-action]');
      if (!button || !root.contains(button)) return;
      const action = button.dataset.arAction;
      if (action === 'analyze') {
        if (typeof onAnalyze === 'function') onAnalyze({source: 'assistant', opener: button});
        return;
      }
      if (typeof notify !== 'function') return;
      const messages = {
        strategy: '退款挽留策略为演示入口',
        receipt: '签收为演示操作，不会确认真实收货或执行退款',
        inspection: '质检为演示操作，不会修改真实售后状态',
        evidence: '仲裁举证为演示入口',
        invoice: '开票申请为演示入口'
      };
      notify(messages[action] || '当前为页面交互演示');
    });
    return {
      show() { root.hidden = false; },
      hide() { root.hidden = true; }
    };
  }

  global.AssistantReplica = {mount};
})(window);
