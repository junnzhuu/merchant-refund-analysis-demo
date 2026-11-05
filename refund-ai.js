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
  const closeIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
  const collapseIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M8 3v14m5-10-3 3 3 3"/></svg>';
  const plusIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v8M6 10h8"/></svg>';
  const sendIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 3 15 7-15 7 3-7zM6 10h12"/></svg>';
  const metricKeys = ['amount', 'count', 'amountRate', 'rate'];

  function comparisonText(report) {
    const values = metricKeys.map(key => report.changes[key].value);
    if (values.every(value => value !== null && value < 0)) return '四项指标均较上周期下降。';
    if (values.every(value => value !== null && value > 0)) return '四项指标均较上周期上升。';
    const change = report.changes.amount.value;
    if (change === null) return '上周期数据不足，暂不作变化判断。';
    if (change === 0) return '退款金额与上周期持平。';
    return '退款金额较上周期' + (change > 0 ? '增加' : '减少') + ' ' + (Math.abs(change) * 100).toFixed(2) + '%。';
  }

  function summaryMarkup(report) {
    const {current, changes, reasons} = report;
    if (!current.count) return '本期暂无成功退款记录，可进入完整退款分析调整时间或筛选范围后查看。';
    const change = changes.amount.value;
    const comparison = change === null ? '上周期数据不足，暂不作变化判断。' : change === 0 ? '退款金额与上周期持平。' : `退款金额较上周期${change > 0 ? '增加' : '减少'} <strong>${(Math.abs(change) * 100).toFixed(2)}%</strong>。`;
    const focus = reasons[0] ? `金额最多的原因为「<strong>${escape(reasons[0].reason)}</strong>」，占比 <strong>${rate(reasons[0].amountShare)}</strong>。可优先查看对应商品及售后记录。` : '';
    return `本期累计退款 <strong>${money(current.amount)}</strong>，涉及 <strong>${number(current.count)}</strong> 个子订单。${comparison}${focus}`;
  }

  function reportIntroMarkup(report) {
    const {current, period} = report;
    return `近7日（${escape(period.current.start)} 至 ${escape(period.current.end)}）按订单支付日期统计，查看各订单支付后30天内已成功退款的情况，并与前一等长周期（${escape(period.previous.start)} 至 ${escape(period.previous.end)}）对比。本期退款金额 <strong>${money(current.amount)}</strong>，退款订单数 <strong>${number(current.count)}</strong>，金额退款率 <strong>${rate(current.amountRate)}</strong>，订单退款率 <strong>${rate(current.rate)}</strong>。${comparisonText(report)}本期支付订单尚未观察满30天，后续成功退款会继续计入。`;
  }

  function changeMarkup(change) {
    if (change.value === null) return '<span class="rai-change" title="' + escape(change.reason) + '">较上周期 —</span>';
    const direction = change.value > 0 ? 'rise' : change.value < 0 ? 'fall' : 'flat';
    const prefix = change.value > 0 ? '+' : '';
    return '<span class="rai-change">较上周期 <b class="rai-' + direction + '">' + prefix + (change.value * 100).toFixed(2) + '%</b></span>';
  }

  function metricsMarkup(report) {
    const values = [money(report.current.amount), number(report.current.count), rate(report.current.amountRate), rate(report.current.rate)];
    return '<div class="rai-metrics">' + metricKeys.map((key, index) => `<div class="rai-metric" data-ai-metric="${key}"><span>${['退款金额','退款订单数','金额退款率','订单退款率'][index]}</span><strong>${values[index]}</strong>${changeMarkup(report.changes[key])}</div>`).join('') + '</div>';
  }

  function reasonsMarkup(report) {
    const reasons = report.reasons;
    return `<div class="rai-report-heading"><h3>二、主要退款原因</h3><span>按退款金额排序</span></div><div class="rai-table-scroll"><table class="rai-table" aria-label="主要退款原因"><thead><tr><th>退款原因</th><th>退款金额</th><th>退款订单数</th><th>金额占比</th></tr></thead><tbody>${reasons.length ? reasons.map(row => `<tr><td>${escape(row.reason)}</td><td>${money(row.amount)}</td><td>${number(row.count)}</td><td>${rate(row.amountShare)}</td></tr>`).join('') : '<tr><td colspan="4" class="rai-empty">暂无退款原因数据</td></tr>'}</tbody></table></div><p class="rai-table-note">金额占比为该原因退款金额占本期全部退款金额的比例。</p>${reasons[0] ? `<p class="rai-report-paragraph">本期退款金额最多的原因为「<strong>${escape(reasons[0].reason)}</strong>」，占比 <strong>${rate(reasons[0].amountShare)}</strong>。建议结合对应售后记录核实具体情况，再判断是否需要调整商品信息或履约安排。</p>` : ''}`;
  }

  function productsMarkup(report) {
    const products = report.products;
    return `<div class="rai-report-heading"><h3>三、重点退款商品</h3><span>退款金额 Top 2</span></div><div class="rai-table-scroll"><table class="rai-table rai-product-table" aria-label="重点退款商品"><thead><tr><th>商品（名称 / 货号）</th><th>退款金额</th><th>退款订单数</th><th>金额占比</th></tr></thead><tbody>${products.length ? products.map(row => `<tr><td><strong>${escape(row.item ? row.item.name : row.product)}</strong><span class="rai-product-code">${escape(row.item ? row.item.code : '—')}</span></td><td>${money(row.amount)}</td><td>${number(row.count)}</td><td>${rate(row.amountShare)}</td></tr>`).join('') : '<tr><td colspan="4" class="rai-empty">暂无退款商品数据</td></tr>'}</tbody></table></div>${products[0] ? `<p class="rai-report-paragraph">「<strong>${escape(products[0].item ? products[0].item.name : products[0].product)}</strong>」的退款金额居首，为 ${money(products[0].amount)}。可进入完整退款分析查看商品、规格及退款原因明细。</p>` : ''}`;
  }

  function reportMarkup(report) {
    return `<article class="rai-report"><p class="rai-report-summary">${reportIntroMarkup(report)}</p><h3>一、退款概况与周期变化</h3>${metricsMarkup(report)}<p class="rai-report-paragraph">${escape(comparisonText(report))}退款率以同批全部支付订单或支付金额为分母，包含未退款订单；退款订单数按子订单去重。</p>${reasonsMarkup(report)}${productsMarkup(report)}<div class="rai-report-bottom"><span>全店 · 按支付时间口径</span><button type="button" class="btn rai-view" data-rai-view>查看完整退款分析 <span aria-hidden="true">→</span></button></div><p class="rai-report-footnote">AI分析演示 · 示例数据截至 ${escape(report.cutoff)}。分析范围独立于当前页面筛选。</p></article>`;
  }

  function skillMarkup() {
    const names = ['实时巡店', '经营总结', '单品分析', '退款分析', '竞品对比', '活动推荐', '更多技能'];
    const paths = [
      '<path d="M3 8V3h12v5M3 8h12M5 8v7h8V8M7 11h4M2 5h14"/>',
      '<path d="m2 8 6-6h6v6l-6 6zM11 5h.01M4 15l2 2 9-9"/>',
      '<path d="M3 3v12h12M6 12V8m3 4V5m3 7V7"/>',
      '<path d="M3 2h8l3 3v11H3zM10 2v4h4M6 9h5M6 12h5"/>',
      '<path d="M3 3h12v13H3zM6 6h6M6 10l2 2 4-4"/>',
      '<path d="m2 9 7-7h6v6l-7 7zM12 5h.01M5 8l4 4"/>',
      '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="11" y="2" width="5" height="5" rx="1"/><rect x="2" y="11" width="5" height="5" rx="1"/><rect x="11" y="11" width="5" height="5" rx="1"/>'
    ];
    return names.map((name, index) => `<button type="button" class="rai-skill${name === '退款分析' ? ' is-selected' : ''}" data-rai-skill="${name}" aria-pressed="${name === '退款分析'}"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[index]}</svg>${name}${name === '退款分析' ? '<i>NEW</i>' : ''}</button>`).join('');
  }

  function mount({model, data, onViewAnalysis}) {
    const dialog = document.createElement('dialog');
    dialog.id = 'refundAiDrawer';
    dialog.className = 'refund-ai-drawer';
    dialog.setAttribute('aria-labelledby', 'refundAiTitle');
    dialog.innerHTML = `<div class="rai-shell" data-collapsed="false"><aside class="rai-sidebar" aria-label="得参谋会话"><div class="rai-brand"><span class="rai-ai-mark" aria-hidden="true">Ai</span><h2 id="refundAiTitle">得参谋</h2><button type="button" class="rai-collapse" aria-label="收起会话栏" aria-expanded="true" title="收起会话栏">${collapseIcon}</button></div><button type="button" class="rai-new-chat" title="发起新对话">${plusIcon}<span>发起新对话</span></button><div class="rai-history-label"><span>历史对话</span><span class="rai-history-help" title="本次演示中的对话记录，关闭页面后清空">?</span></div><nav class="rai-history" aria-label="历史对话"></nav><div class="rai-sidebar-bottom"><span>得参谋 · 商家经营助手</span><small>AI分析演示</small></div></aside><section class="rai-main" aria-label="退款分析对话"><header class="rai-chat-header"><span class="rai-source"></span><span class="rai-chat-demo">AI分析演示</span><button type="button" class="rai-close" aria-label="关闭得参谋">${closeIcon}</button></header><div class="rai-body" tabindex="0" aria-label="对话内容"><div class="rai-thread"></div></div><div class="rai-composer-area"><div class="rai-composer-inner"><div class="rai-skills" aria-label="可用技能">${skillMarkup()}</div><form class="rai-composer"><label class="rai-input-label" for="raiQuestion">向得参谋提问</label><textarea id="raiQuestion" maxlength="500" rows="2" placeholder="请输入您想咨询的问题" aria-describedby="raiComposerHelp"></textarea><div class="rai-composer-bottom"><span id="raiComposerHelp">示例对话 · 支持退款概况、退款原因和重点商品</span><span class="rai-input-count">0/500</span><button type="submit" class="rai-send" aria-label="发送问题" disabled>${sendIcon}</button></div></form></div></div><div class="rai-notice" role="status" hidden></div></section></div>`;
    document.body.appendChild(dialog);
    const shell = dialog.querySelector('.rai-shell');
    const history = dialog.querySelector('.rai-history');
    const body = dialog.querySelector('.rai-body');
    const thread = dialog.querySelector('.rai-thread');
    const input = dialog.querySelector('textarea');
    const send = dialog.querySelector('.rai-send');
    const count = dialog.querySelector('.rai-input-count');
    const collapseButton = dialog.querySelector('.rai-collapse');
    const notice = dialog.querySelector('.rai-notice');
    let opener = null, report = null, locked = false, savedOverflow = '', restoreFocus = true, noticeTimer;
    let sessions = [], activeId = '', serial = 0;

    const currentSession = () => sessions.find(session => session.id === activeId);
    function unlock() {
      if (locked) document.documentElement.style.overflow = savedOverflow;
      locked = false;
    }
    function close() { if (dialog.open) dialog.close(); }
    dialog.addEventListener('close', () => {
      unlock();
      clearTimeout(noticeTimer);
      notice.hidden = true;
      if (restoreFocus && opener && opener.isConnected && opener.getClientRects().length) opener.focus({preventScroll: true});
      opener = null;
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
    });
    dialog.querySelector('.rai-close').addEventListener('click', close);
    collapseButton.addEventListener('click', () => {
      const collapsed = shell.dataset.collapsed !== 'true';
      shell.dataset.collapsed = String(collapsed);
      collapseButton.setAttribute('aria-expanded', String(!collapsed));
      collapseButton.setAttribute('aria-label', collapsed ? '展开会话栏' : '收起会话栏');
      collapseButton.title = collapsed ? '展开会话栏' : '收起会话栏';
    });

    function renderHistory() {
      history.innerHTML = sessions.map(session => `<button type="button" class="rai-history-item${session.id === activeId ? ' is-active' : ''}" data-session="${session.id}" ${session.id === activeId ? 'aria-current="true"' : ''} title="${escape(session.title)}"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M3 3h12v10H8l-4 3v-3H3zM6 6h6M6 9h4"/></svg><span>${escape(session.title)}</span></button>`).join('');
    }
    function welcomeMarkup() {
      return `<div class="rai-welcome"><span class="rai-welcome-ai">Ai</span><h3>你好，我是得参谋</h3><p>帮你了解店铺退款表现，从数据中找到值得关注的问题。</p><div><button type="button" data-prompt="近7日退款分析">近7日退款分析 <span>→</span></button><button type="button" data-prompt="查看主要退款原因">查看主要退款原因 <span>→</span></button><button type="button" data-prompt="查看重点退款商品">查看重点退款商品 <span>→</span></button></div></div>`;
    }
    function answerMarkup(message) {
      if (message.kind === 'report') return reportMarkup(report);
      if (message.kind === 'reasons') return `<article class="rai-report rai-short-report"><p>以下为近7日全店支付订单的主要退款原因，统计范围为 ${escape(report.period.current.start)} 至 ${escape(report.period.current.end)}，退款观察期为各订单支付后30天。</p>${reasonsMarkup(report)}<button type="button" class="btn rai-view" data-rai-view>查看完整退款分析 →</button></article>`;
      if (message.kind === 'products') return `<article class="rai-report rai-short-report"><p>以下商品按近7日支付订单的成功退款金额排序，统计范围为 ${escape(report.period.current.start)} 至 ${escape(report.period.current.end)}。</p>${productsMarkup(report)}<button type="button" class="btn rai-view" data-rai-view>查看完整退款分析 →</button></article>`;
      if (message.kind === 'definition') return '<article class="rai-report rai-short-report"><h3>退款指标口径</h3><p>当前按支付时间统计近7日全店数据。退款金额统计这批订单在各自支付后30天内已成功退款的实际金额；退款订单数按子订单去重。</p><p>金额退款率＝同批订单的成功退款金额÷全部支付金额；订单退款率＝退款子订单数÷全部支付子订单数。分母包含未退款订单。</p><p>本期订单尚未观察满30天，后续成功退款会继续计入。</p><button type="button" class="btn rai-view" data-rai-view>查看完整退款分析 →</button></article>';
      return '<article class="rai-report rai-short-report"><p>当前为退款分析交互演示。你可以查看近7日全店退款概况、主要退款原因和重点商品，或进入完整退款分析调整时间和筛选范围。</p><button type="button" class="btn rai-view" data-rai-view>查看完整退款分析 →</button></article>';
    }
    function renderThread(scrollToEnd = false) {
      const session = currentSession();
      thread.innerHTML = session.messages.length ? `<p class="rai-conversation-time">${escape(report.period.current.start)} — ${escape(report.period.current.end)} · 示例会话</p>` + session.messages.map(message => message.role === 'user' ? `<div class="rai-user-message"><div>${escape(message.text)}</div></div>` : `<div class="rai-assistant-message"><div class="rai-complete-status">${spark}<span>已完成分析，请查看结果</span><span aria-hidden="true">›</span></div>${answerMarkup(message)}</div>`).join('') : welcomeMarkup();
      if (scrollToEnd) body.scrollTop = body.scrollHeight;
      else body.scrollTop = 0;
    }
    function updateInput() {
      if (input.value.length > 500) input.value = input.value.slice(0, 500);
      count.textContent = input.value.length + '/500';
      send.disabled = !input.value.trim();
    }
    function sendQuestion(question) {
      const text = question.trim().slice(0, 500);
      if (!text) return;
      const session = currentSession();
      if (!session.messages.length) session.title = text.length > 16 ? text.slice(0, 16) + '…' : text;
      let kind = /口径|怎么算|计算|分母|观察期/.test(text) ? 'definition' : /原因/.test(text) ? 'reasons' : /商品|规格|SKU/i.test(text) ? 'products' : /退款|分析|概况|近7|近七/.test(text) ? 'report' : 'help';
      session.messages.push({role: 'user', text}, {role: 'assistant', kind});
      input.value = '';
      updateInput();
      renderHistory();
      renderThread(false);
      // Bring the new question and its answer into view, keeping the answer start readable.
      const messages = thread.querySelectorAll('.rai-user-message');
      const latest = messages[messages.length - 1];
      if (latest) body.scrollTop = Math.max(0, latest.offsetTop - thread.offsetTop - 24);
      input.focus({preventScroll: true});
    }
    history.addEventListener('click', event => {
      const button = event.target.closest('[data-session]');
      if (!button) return;
      activeId = button.dataset.session;
      renderHistory();
      renderThread();
    });
    dialog.querySelector('.rai-new-chat').addEventListener('click', () => {
      const existingEmpty = sessions.find(session => !session.messages.length);
      if (existingEmpty) activeId = existingEmpty.id;
      else { activeId = 'conversation-' + (++serial); sessions.unshift({id: activeId, title: '未命名对话', messages: []}); }
      renderHistory(); renderThread(); input.value = ''; updateInput(); input.focus({preventScroll: true});
    });
    input.addEventListener('input', updateInput);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendQuestion(input.value); }
    });
    dialog.querySelector('.rai-composer').addEventListener('submit', event => { event.preventDefault(); sendQuestion(input.value); });
    dialog.addEventListener('click', event => {
      const prompt = event.target.closest('[data-prompt]');
      if (prompt) sendQuestion(prompt.dataset.prompt);
      const view = event.target.closest('[data-rai-view]');
      if (view) {
        restoreFocus = false;
        close();
        if (onViewAnalysis) onViewAnalysis({scope: {...report.scope}});
      }
      const skill = event.target.closest('[data-rai-skill]');
      if (skill) {
        if (skill.dataset.raiSkill === '退款分析') sendQuestion('近7日退款分析');
        else {
          clearTimeout(noticeTimer);
          notice.textContent = skill.dataset.raiSkill + '功能暂未在本次演示中开放';
          notice.hidden = false;
          noticeTimer = setTimeout(() => { notice.hidden = true; }, 2400);
        }
      }
    });

    function open({sourceLabel = '售后', opener: sourceButton} = {}) {
      if (dialog.open) return;
      opener = sourceButton || document.activeElement;
      restoreFocus = true;
      report = createReport(model, data);
      dialog.querySelector('.rai-source').textContent = '来自' + sourceLabel;
      if (!sessions.length) {
        sessions = [
          {id: 'refund-overview', title: '近7日退款分析', messages: [{role: 'user', text: '近7日退款分析'}, {role: 'assistant', kind: 'report'}]},
          {id: 'refund-reasons', title: '退款原因分布', messages: [{role: 'user', text: '查看主要退款原因'}, {role: 'assistant', kind: 'reasons'}]},
          {id: 'refund-products', title: '重点退款商品', messages: [{role: 'user', text: '查看重点退款商品'}, {role: 'assistant', kind: 'products'}]},
          {id: 'refund-definition', title: '退款指标口径', messages: [{role: 'user', text: '退款率是怎么算的？'}, {role: 'assistant', kind: 'definition'}]}
        ];
      }
      activeId = 'refund-overview';
      renderHistory();
      renderThread();
      input.value = ''; updateInput();
      if (typeof matchMedia === 'function' && matchMedia('(max-width: 900px)').matches) {
        shell.dataset.collapsed = 'true'; collapseButton.setAttribute('aria-expanded', 'false'); collapseButton.setAttribute('aria-label', '展开会话栏'); collapseButton.title = '展开会话栏';
      }
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      locked = true;
      dialog.showModal();
      dialog.querySelector('.rai-close').focus({preventScroll: true});
      // Native dialogs may restore the last focused report link on reopening.
      body.scrollTop = 0;
    }
    return {open, close};
  }

  return {createReport, summaryMarkup, mount};
});
