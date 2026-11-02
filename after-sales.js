(function (global) {
  'use strict';

  // Independent, fictional after-sales fixtures. These are not the successful
  // refund records used by RefundModel or a connection to a merchant API.
  const fixtures = [
    ['2600001001', 'AS2600001001', '轻量缓震运动鞋', 'DW-DEMO-101', '雾白 / 42', 369, 'pending-audit', '退货退款', '尺码不合适', '2026-11-02 11:26', '买家已提交退货申请，等待审核'],
    ['2600001002', 'AS2600001002', '宽松直筒休闲长裤', 'DW-DEMO-102', '炭灰 / L', 239, 'pending-audit', '仅退款', '不想要了', '2026-11-02 10:18', '商品尚未发货，等待审核'],
    ['2600001003', 'AS2600001003', '基础款连帽卫衣', 'DW-DEMO-103', '藏青 / M', 299, 'pending-receipt', '退货退款', '颜色与预期不符', '2026-11-01 16:42', '买家已寄回，等待商家收货'],
    ['2600001004', 'AS2600001004', '轻量缓震运动鞋', 'DW-DEMO-101', '雾白 / 40', 369, 'pending-refund', '退货退款', '尺码不合适', '2026-11-01 14:35', '退货已签收，等待确认退款'],
    ['2600001005', 'AS2600001005', '简约双肩背包', 'DW-DEMO-104', '黑色 / 均码', 199, 'platform', '退货退款', '商品质量问题', '2026-11-01 09:10', '平台协助处理中，等待处理结果'],
    ['2600001006', 'AS2600001006', '宽松直筒休闲长裤', 'DW-DEMO-102', '炭灰 / M', 239, 'completed', '退货退款', '尺码不合适', '2026-10-31 18:20', '退款已完成'],
    ['2600001007', 'AS2600001007', '基础款连帽卫衣', 'DW-DEMO-103', '燕麦 / L', 299, 'pending-audit', '退货退款', '不想要了', '2026-10-31 15:08', '买家已提交退货申请，等待审核'],
    ['2600001008', 'AS2600001008', '简约双肩背包', 'DW-DEMO-104', '黑色 / 均码', 199, 'closed', '仅退款', '不想要了', '2026-10-30 12:46', '买家已撤销申请'],
    ['2600001009', 'AS2600001009', '基础款连帽卫衣', 'DW-DEMO-103', '藏青 / XL', 299, 'pending-receipt', '退货退款', '尺码不合适', '2026-10-30 10:30', '买家已寄回，等待商家收货'],
    ['2600001010', 'AS2600001010', '轻量缓震运动鞋', 'DW-DEMO-101', '雾白 / 43', 369, 'completed', '仅退款', '不想要了', '2026-10-29 17:12', '退款已完成'],
    ['2600001011', 'AS2600001011', '宽松直筒休闲长裤', 'DW-DEMO-102', '沙色 / XL', 239, 'completed', '退货退款', '颜色与预期不符', '2026-10-29 13:45', '退款已完成'],
    ['2600001012', 'AS2600001012', '简约双肩背包', 'DW-DEMO-104', '深灰 / 均码', 199, 'closed', '退货退款', '不想要了', '2026-10-29 09:20', '售后申请已关闭']
  ].map(row => Object.fromEntries(['orderId', 'afterSaleId', 'product', 'code', 'sku', 'amount', 'status', 'type', 'reason', 'appliedAt', 'progress'].map((key, i) => [key, row[i]])));
  const statusNames = { all: '全部', 'pending-audit': '待商家审核', 'pending-receipt': '待商家收货', 'pending-refund': '待商家退款', platform: '平台处理中', completed: '售后完成', closed: '售后关闭' };
  const statusCount = key => key === 'all' ? fixtures.length : fixtures.filter(row => row.status === key).length;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const spark = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6L20 2Z"/></svg>';
  const boxIcon = '<svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="m9 10 11-4 11 4-3 8-5-2v25H12V16l-5 2-3-8 5-2Z"/><path d="M15 8c0 6 10 6 10 0M13 34h10"/></svg>';

  function pageHeader(page, title, actions) {
    return '<header class="as-page-header"><div><div class="as-breadcrumb">售后 <span>/</span> ' + title + '</div><h1>' + title + '</h1></div><div class="as-header-actions">' + actions + '</div></header>';
  }
  function analyzeButton(page, copy, primary) {
    return '<button type="button" class="as-button ' + (primary ? 'as-primary' : '') + '" data-as-action="analyze" data-as-source="' + page + '">' + spark + copy + '</button>';
  }

  function returnCenterMarkup() {
    return pageHeader('return-center', '退货中心', analyzeButton('return-center', 'AI退款分析', true) + '<button type="button" class="as-button" data-as-action="settings">退货设置</button><button type="button" class="as-link" data-as-action="guide">查看快速上手文档 ↗</button>') +
      '<div class="as-overview-grid">' +
      '<section class="as-card as-inspection"><div class="as-section-heading"><h2>售后巡检</h2><span class="as-subtle">今日</span></div><div class="as-inspection-body"><span class="as-check-icon" aria-hidden="true">✓</span><div><strong>及时处理售后，提升买家体验</strong><p>关注待办进度，避免售后处理超时</p></div></div><div class="as-inspection-bottom"><span>待处理售后 <b>' + (statusCount('pending-audit') + statusCount('pending-receipt') + statusCount('pending-refund')) + '</b> 笔</span><button type="button" class="as-link" data-as-action="jump-pending">去处理 →</button></div></section>' +
      '<section class="as-card as-todo-overview"><div class="as-section-heading"><h2>售后待办</h2><span class="as-subtle">示例数据</span></div><div class="as-mini-metrics">' + ['pending-audit', 'pending-receipt', 'pending-refund'].map(key => '<button type="button" data-as-action="quick-status" data-as-status="' + key + '"><span>' + statusNames[key] + '</span><strong>' + statusCount(key) + '</strong></button>').join('') + '</div></section>' +
      '<section class="as-card as-retention-overview"><div class="as-section-heading"><h2>退款挽留</h2><button type="button" class="as-link" data-as-action="retention">查看详情 →</button></div><p class="as-subtle">通过协商方案，为买家提供更多选择</p><div class="as-retention-metrics"><div><span>近7天挽留成功</span><strong>8<span> 笔</span></strong></div><div><span>挽留订单金额</span><strong><small>¥</small> 1,286.00</strong></div></div></section></div>' +
      '<section class="as-card as-orders-card"><div class="as-section-heading"><h2>售后订单</h2><span class="as-demo-label">交互演示 · 虚构订单</span></div><div class="as-status-scroll"><div class="as-status-tabs" role="tablist" aria-label="售后订单状态">' + Object.entries(statusNames).map(([key, label]) => '<button type="button" role="tab" data-as-action="status" data-as-status="' + key + '" aria-selected="' + (key === 'all') + '" class="' + (key === 'all' ? 'is-active' : '') + '">' + label + '<span>' + statusCount(key) + '</span></button>').join('') + '</div></div>' +
      '<form class="as-filter-form"><div class="as-filter-fields"><label class="as-search-field"><span>订单信息</span><input name="keyword" type="search" placeholder="输入订单号 / 售后单号 / 商品名称" autocomplete="off"></label><label><span>售后类型</span><select name="type"><option value="all">全部类型</option><option>退货退款</option><option>仅退款</option></select></label><label><span>退款原因</span><select name="reason"><option value="all">全部原因</option><option>尺码不合适</option><option>不想要了</option><option>颜色与预期不符</option><option>商品质量问题</option></select></label><label class="as-date-field"><span>申请时间</span><input type="date" name="start" aria-label="申请开始日期" max="2026-11-02"><span class="as-date-divider">至</span><input type="date" name="end" aria-label="申请结束日期" max="2026-11-02"></label></div><div class="as-query-actions"><button class="as-button as-primary" type="submit">查询</button><button class="as-button" type="reset">重置</button></div></form>' +
      '<div class="as-results-toolbar"><span class="as-result-count" aria-live="polite"></span><button type="button" class="as-link" data-as-action="export">导出售后订单</button></div><div class="as-order-scroll" tabindex="0" aria-label="售后订单列表，可横向和纵向滚动"><table class="as-order-table"><colgroup><col class="as-col-product"><col class="as-col-order"><col class="as-col-amount"><col class="as-col-reason"><col class="as-col-time"><col class="as-col-status"><col class="as-col-action"></colgroup><thead><tr><th scope="col">商品信息</th><th scope="col">订单信息</th><th scope="col">申请退款金额</th><th scope="col">售后类型 / 原因</th><th scope="col">申请时间</th><th scope="col">售后状态</th><th scope="col">操作</th></tr></thead><tbody></tbody></table></div><div class="as-order-footer"><span>订单、金额及售后进度均为演示数据</span><span class="as-pagination"><button type="button" disabled aria-label="上一页">‹</button><button type="button" class="is-current" aria-current="page">1</button><button type="button" disabled aria-label="下一页">›</button><span>20 条/页</span></span></div></section>';
  }

  function assistantMarkup() {
    return pageHeader('assistant', '售后小助手', '<span class="as-demo-label">交互演示 · 示例数据</span>') +
      '<section class="as-card as-tools"><div class="as-section-heading"><h2>售后经营工具</h2><span class="as-subtle">让售后处理更省心</span></div><div class="as-tool-grid"><article class="as-tool-card as-retention-tool"><div class="as-tool-icon" aria-hidden="true">↺</div><div class="as-tool-copy"><div class="as-tool-heading"><h3>退款挽留</h3><span class="as-tag">经营工具</span></div><p>提供协商方案，争取挽留退款订单</p><button type="button" class="as-button" data-as-action="retention">查看退款挽留</button></div></article><article class="as-tool-card as-ai-tool"><div class="as-tool-icon">' + spark + '</div><div class="as-tool-copy"><div class="as-tool-heading"><h3>AI退款分析</h3><span class="as-tag">AI</span></div><p>查看退款金额、退款率及变化趋势</p>' + analyzeButton('assistant', '开始分析', true) + '</div></article></div></section>' +
      '<section class="as-card as-daily-report"><div class="as-section-heading"><h2>售后日报</h2><div class="as-daily-date">2026年11月2日 <span>今日待办</span></div></div><div class="as-daily-grid">' + [
        ['pending-audit', '待审核', '及时审核买家申请'],
        ['pending-receipt', '待收货', '关注买家寄回进度'],
        ['pending-refund', '待退款', '及时确认退款结果'],
        ['platform', '平台处理中', '关注平台处理进展']
      ].map(([key, label, desc]) => '<article class="as-daily-cell"><div class="as-daily-label">' + label + '</div><strong>' + statusCount(key) + '<small> 笔</small></strong><p>' + desc + '</p><button type="button" class="as-link" data-as-action="assistant-pending" data-as-status="' + key + '">查看待办 →</button></article>').join('') + '</div></section>' +
      '<div class="as-assistant-note">售后数据与经营工具仅作页面交互演示，未连接真实商家订单。</div>';
  }

  function mount(options) {
    const { root, onAnalyze, notify } = options || {};
    if (!root || typeof root.appendChild !== 'function') throw new TypeError('AfterSalesDemo.mount requires a root element');
    const say = message => { if (typeof notify === 'function') notify(message); };
    const pages = {};
    ['return-center', 'assistant'].forEach(page => {
      const element = document.createElement('section');
      element.className = 'after-sales-page as-' + page;
      element.dataset.afterSalesPage = page;
      element.hidden = true;
      element.setAttribute('aria-label', page === 'return-center' ? '退货中心' : '售后小助手');
      element.innerHTML = page === 'return-center' ? returnCenterMarkup() : assistantMarkup();
      root.appendChild(element);
      pages[page] = element;
    });
    const center = pages['return-center'];
    const form = center.querySelector('form');
    const filters = { status: 'all', keyword: '', type: 'all', reason: 'all', start: '', end: '' };
    const orders = center.querySelector('tbody');
    const listScroll = center.querySelector('.as-order-scroll');
    const positions = new Map();
    let activePage = null;

    function renderOrders() {
      const rows = fixtures.filter(row => (filters.status === 'all' || row.status === filters.status) && (filters.type === 'all' || row.type === filters.type) && (filters.reason === 'all' || row.reason === filters.reason) && (!filters.start || row.appliedAt.slice(0, 10) >= filters.start) && (!filters.end || row.appliedAt.slice(0, 10) <= filters.end) && (!filters.keyword || [row.orderId, row.afterSaleId, row.product, row.code].join(' ').toLowerCase().includes(filters.keyword.toLowerCase())));
      center.querySelectorAll('[role="tab"]').forEach(button => {
        const selected = button.dataset.asStatus === filters.status;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      center.querySelector('.as-result-count').textContent = '共 ' + rows.length + ' 笔售后订单';
      orders.innerHTML = rows.map(row => '<tr><td><div class="as-product-info"><div class="as-product-picture">' + boxIcon + '</div><div><strong>' + escape(row.product) + '</strong><p>货号：' + escape(row.code) + '</p><p>' + escape(row.sku) + ' <span>×1</span></p></div></div></td><td><div class="as-order-id">订单号：' + row.orderId + '</div><p class="as-cell-secondary">售后单：' + row.afterSaleId + '</p></td><td class="as-money">¥' + money(row.amount) + '</td><td><div>' + escape(row.type) + '</div><p class="as-cell-secondary">' + escape(row.reason) + '</p></td><td>' + row.appliedAt.slice(0, 10) + '<p class="as-cell-secondary">' + row.appliedAt.slice(11) + '</p></td><td><span class="as-order-status ' + (row.status.startsWith('pending') ? 'as-status-pending' : '') + '">' + statusNames[row.status] + '</span><p class="as-order-progress">' + escape(row.progress) + '</p></td><td><button type="button" class="as-link" data-as-action="order-detail" data-as-order="' + row.afterSaleId + '">查看详情</button>' + (row.status.startsWith('pending') ? '<button type="button" class="as-button as-small-button" data-as-action="order-process" data-as-order="' + row.afterSaleId + '">去处理</button>' : '') + '</td></tr>').join('') || '<tr><td class="as-empty" colspan="7"><strong>暂无符合条件的售后订单</strong><p>试试调整筛选条件，或点击重置查看全部示例订单</p></td></tr>';
      listScroll.scrollTop = 0;
    }
    function setStatus(status) {
      filters.status = statusNames[status] ? status : 'all';
      renderOrders();
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = new FormData(form);
      const start = String(fields.get('start') || ''), end = String(fields.get('end') || '');
      if (start && end && start > end) { say('申请开始日期不能晚于结束日期'); return; }
      Object.assign(filters, { keyword: String(fields.get('keyword') || '').trim(), type: String(fields.get('type') || 'all'), reason: String(fields.get('reason') || 'all'), start, end });
      renderOrders();
    });
    form.addEventListener('reset', () => {
      Object.assign(filters, { status: 'all', keyword: '', type: 'all', reason: 'all', start: '', end: '' });
      renderOrders();
    });
    center.querySelector('.as-status-tabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(center.querySelectorAll('[role="tab"]'));
      const current = tabs.indexOf(event.target);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setStatus(tabs[next].dataset.asStatus);
      tabs[next].focus();
    });

    root.addEventListener('click', event => {
      const button = event.target.closest('[data-as-action]');
      if (!button || !root.contains(button)) return;
      const action = button.dataset.asAction;
      if (action === 'analyze') { if (typeof onAnalyze === 'function') onAnalyze({ source: button.dataset.asSource, opener: button }); return; }
      if (action === 'status' || action === 'quick-status') { setStatus(button.dataset.asStatus); return; }
      if (action === 'jump-pending') { setStatus('pending-audit'); center.querySelector('.as-orders-card').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if (action === 'assistant-pending') { say(statusNames[button.dataset.asStatus] + '：共 ' + statusCount(button.dataset.asStatus) + ' 笔示例待办，可在退货中心查看'); return; }
      const messages = {
        settings: '退货设置为演示入口，未更改商家配置',
        guide: '快速上手：选择售后状态，按订单信息查询，再查看处理进度；点击 AI退款分析可查看店铺退款表现',
        retention: '退款挽留为演示入口，未发送协商方案或修改订单',
        export: '售后订单导出为演示操作，未生成真实商家订单文件',
        'order-detail': '示例售后单 ' + button.dataset.asOrder + '：仅展示虚构售后进度',
        'order-process': '示例售后单 ' + button.dataset.asOrder + '：当前为演示，不会执行审核、收货或退款'
      };
      say(messages[action] || '当前为页面交互演示');
    });
    renderOrders();

    return {
      show(page) {
        if (!Object.prototype.hasOwnProperty.call(pages, page)) return;
        if (activePage) positions.set(activePage, Array.from(pages[activePage].querySelectorAll('.as-order-scroll, .as-status-scroll')).map(element => [element.scrollLeft, element.scrollTop]));
        Object.entries(pages).forEach(([key, element]) => { element.hidden = key !== page; });
        const saved = positions.get(page);
        if (saved) Array.from(pages[page].querySelectorAll('.as-order-scroll, .as-status-scroll')).forEach((element, i) => { if (saved[i]) { element.scrollLeft = saved[i][0]; element.scrollTop = saved[i][1]; } });
        activePage = page;
      }
    };
  }

  global.AfterSalesDemo = { mount };
})(window);
