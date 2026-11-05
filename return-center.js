(function (global) {
  'use strict';

  // Demonstration orders are deliberately separate from RefundModel and never
  // enter the AI report. All identifiers and amounts below are fictional.
  const ASSETS = {
    ip: 'https://cdn.poizon.com/node-common/ce9f97dc-4728-9fa5-deae-3e5ebc5a2a02-163-282.png',
    products: [
      'https://cdn.poizon.com/pro-img/origin-img/20260131/4ef713719522413eb5af69eced04b8bd.jpg',
      'https://cdn.poizon.com/pro-img/origin-img/20260909/12d9db0ea6434162b964873130334ab5.jpg',
      'https://cdn.poizon.com/pro-img/origin-img/20260917/a73643a81b9b4b40863336192eea1336.jpg',
      'https://cdn.poizon.com/pro-img/origin-img/20260917/eae7eef541564c2c9db36b589f342037.jpg',
      'https://cdn.poizon.com/pro-img/origin-img/20260424/965df2be4d7442ddad2c42a17addee55.jpg',
      'https://cdn.poizon.com/pro-img/origin-img/20260909/12d9db0ea6434162b964873130334ab5.jpg',
      'https://cdn.poizon.com/pro-img/origin-img/20260917/eae7eef541564c2c9db36b589f342037.jpg'
    ]
  };
  const PAGE_SIZE = 20;
  const DEFAULT_START = '2026-08-05T00:00';
  const DEFAULT_END = '2026-11-05T23:59';
  const STATUS_LABELS = { 'buyer-shipping': '待买家发货', success: '售后成功', receiving: '待卖家签收', inspection: '待查验鉴别', closed: '售后关闭', review: '待审核', pickup: '待取件', 'return-buyer': '待寄回买家' };
  const PRODUCTS = [
    ['示例服饰 复古拼接纯棉宽松阔腿高腰牛仔裤', 'D1001-服饰', '牛仔蓝正常版裤长102cm S', '演示服饰', 189],
    ['示例服饰 纯色羊毛糯米裤秋冬季 阔腿休闲长裤', 'D1002-服饰', '深花灰正常版裤长102cm L', '演示服饰', 169],
    ['示例服饰 复古风咖色灯芯绒镰刀裤 秋冬加长版', 'D1003-服饰', '（春秋款）加长版裤长108cm 建议身高167–173 M', '演示服饰', 159],
    ['示例服饰 老钱风羊毛西装裤女 秋冬加绒长裤', 'D1004-服饰', '（冬款）深灰色加长版裤长107cm 建议身高167–174 M', '演示服饰', 219],
    ['示例服饰 深蓝复古直筒牛仔裤 高个加长阔腿裤', 'D1005-服饰', '复古蓝加长版裤长108cm【加绒】M', '演示服饰', 199],
    ['示例服饰 秋冬宽松弯刀灰色卫裤 柔软加绒长裤', 'D1006-服饰', '黑色正常版（加绒款）建议身高158–166 S', '演示服饰', 139],
    ['简约日常 修身休闲直筒长裤 女款秋冬通勤', 'D1007-服饰', '米白色正常版 M', '简约日常', 129]
  ];
  const REASONS = ['款式/颜色不合适', '穿着不好看/一般', '商品多拍/错拍', '偏大', '偏小', '不想要了', '商品瑕疵', '竞价降价'];
  const pad = value => String(value).padStart(2, '0');
  const dateText = date => date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()) + ' ' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds());
  const orders = Array.from({ length: 2051 }, (_, index) => {
    const product = PRODUCTS[index % PRODUCTS.length];
    const status = index === 0 ? 'buyer-shipping' : index === 1 ? 'success' : index < 60 ? 'receiving' : index < 63 ? 'inspection' : index % 9 === 0 ? 'closed' : 'success';
    return {
      id: 'RC-DEMO-' + String(index + 1).padStart(6, '0'), orderId: 'DM20261105' + String(index + 1).padStart(7, '0'), afterSaleId: 'REDEMO2026' + String(index + 1).padStart(7, '0'), logisticsId: 'DEMO-SF-' + String(index + 1).padStart(8, '0'),
      product: product[0], code: product[1], sku: product[2], brand: product[3], amount: product[4] + (index % 5) * 10,
      productIndex: index % PRODUCTS.length, spu: 'DEMO' + (700001 + index % PRODUCTS.length), status, type: index % 11 === 1 ? '取消' : index % 17 === 0 && index !== 0 ? '仅退款' : '退货', reason: REASONS[index % REASONS.length],
      returnType: index % 2 ? '普通退货' : '极速退款', hasNote: index % 8 === 0, marked: index % 19 === 17, overdue: index >= 60 && index < 63 ? '24h内逾期' : '未逾期', anomaly: index > 63 && index % 41 === 0 ? '运输异常' : '无异常', pickup: index < 60 && index > 1 ? '已取件' : '无需取件',
      appliedAt: dateText(new Date(Date.UTC(2026, 10, 5, 20, 30) - index * 55 * 60 * 1000)), quantity: 1
    };
  });
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const copyIcon = '<svg class="rc-copy-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3h8v10H5zM3 11H2V1h8v1"/></svg>';
  const spark = '<svg class="rc-spark" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 2.3 6.7L18 14l-6.7 2.3L9 23l-2.3-6.7L0 14l6.7-2.3L9 5Z"/><path d="m19 0 1.3 3.7L24 5l-3.7 1.3L19 10l-1.3-3.7L14 5l3.7-1.3L19 0Z"/></svg>';
  const arrow = '<svg class="rc-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  const garment = '<svg viewBox="0 0 60 110" aria-hidden="true"><path d="m14 4 32 0 8 99-19 3-6-63-6 63-18-3Z" fill="#68717b"/><path d="M14 7h32M29 7v36M17 17l-1 13M42 17l2 13" fill="none" stroke="#b5bdc6" stroke-width="1.5"/></svg>';
  const mascot = '<svg viewBox="0 0 68 116" aria-hidden="true"><path d="M18 35 8 20l6-10 15 10 17-5 11 10-5 16Z" fill="#1c2735"/><path d="M14 37c0-19 41-19 41 2l-4 20-27 4-14-14Z" fill="#bff7f7"/><path d="m21 36 9 1m9-2 8-2M28 49q8 6 15-2" stroke="#102936" stroke-width="4" stroke-linecap="round" fill="none"/><path d="m25 61 24-4 10 25-14 24-32-10 1-24Z" fill="#32c9d1"/><path d="m16 69-13 8 3 12 16-10m29-13 14 5-4 9-10-4" stroke="#243948" stroke-width="9"/><path d="m20 98-2 15m23-10 5 10" stroke="#263542" stroke-width="10"/></svg>';

  function textField(name, label, placeholder, batch) {
    return '<label class="rc-field"><span>' + label + '</span><input name="' + name + '" placeholder="' + placeholder + '" autocomplete="off">' + (batch ? '<button type="button" class="rc-text-button" data-rc-action="batch-query" data-rc-field="' + name + '">批量查询</button>' : '') + '</label>';
  }
  function selectField(name, label, options) {
    return '<label class="rc-field rc-select-field"><span>' + label + '</span><select name="' + name + '" aria-label="' + label + '"><option value="">请选择' + label + '</option>' + options.map(value => '<option value="' + escape(value) + '">' + escape(value) + '</option>').join('') + '</select>' + arrow + '</label>';
  }
  function layout() {
    const quick = [['soon', '24h内逾期', 3], ['overdue', '已逾期', 0], ['review', '待审核', 0], ['receiving', '待签收', 58], ['pickup', '待取件', 0], ['inspection', '待查验鉴别', 3], ['return-buyer', '待寄回买家', 0], ['pending', '待处理', 61]];
    return '<header class="rc-page-heading"><div class="rc-title-line"><h1>退货中心</h1><span>若未选择售后申请时间，将默认查询最近3个月的售后单</span></div><div class="rc-heading-actions"><button type="button" class="rc-button rc-ai-button" data-rc-action="analyze">' + spark + 'AI退款分析</button><button type="button" class="rc-button" data-rc-action="settings">退货设置</button><button type="button" class="rc-button" data-rc-action="guide">查看快速上手文档</button></div></header>' +
      '<section class="rc-overview" aria-label="售后经营概览"><div class="rc-patrol"><div class="rc-mascot">' + (ASSETS.ip ? '<img src="' + escape(ASSETS.ip) + '" alt="售后小助手">' : mascot) + '</div><div class="rc-patrol-bubble"><p>售后小助手已为您完成<br>今日售后巡检：</p><strong>0 单物流异常待处理</strong><strong>1 个经营策略可设置</strong></div></div><div class="rc-overview-panel rc-todos"><div class="rc-overview-title"><strong>待办事项</strong><span>统计周期：近7日</span><button type="button" class="rc-text-button" data-rc-action="daily">售后日报 ›</button></div><div class="rc-todo-items">' + [['待举证', '1'], ['待回复工单', '-'], ['开票申请', '-'], ['运输异常', '-'], ['包裹丢损', '-']].map(([label, value]) => '<button type="button" data-rc-action="todo"><span>' + label + '</span><strong>' + value + '</strong></button>').join('') + '</div></div><div class="rc-overview-panel rc-retention"><div class="rc-overview-title"><strong>退款挽留</strong><span class="rc-popularity">♨ 36,209个商家使用</span><button type="button" class="rc-text-button" data-rc-action="strategy">设置策略 ›</button></div><div class="rc-retention-content"><div class="rc-retention-benefits"><div><span>节约时长</span><strong>6<small>h</small></strong></div><div><span>使用场景</span><strong>退货退款</strong></div></div><p>服饰类目还未设置退款挽留策略，可通过协商方案减少退货，降低售后处理成本。</p></div></div></section>' +
      '<section class="rc-filter-panel" aria-label="退货订单筛选"><div class="rc-quick-status">' + quick.map(([key, label, count]) => '<button type="button" data-rc-action="quick" data-rc-quick="' + key + '" aria-pressed="false">' + label + ' <span>' + count + '</span></button>').join('') + '</div><form class="rc-filter-form"><div class="rc-filter-grid">' +
      textField('orderId', '订单号', '请填写订单号', true) + textField('afterSaleId', '售后单号', '请填写售后单号', true) + textField('logisticsId', '物流单号', '请填写物流单号', true) +
      selectField('status', '售后状态', Object.values(STATUS_LABELS)) + selectField('type', '售后类型', ['退货', '取消', '仅退款', '补寄']) + textField('product', '商品名称/货号', '请选择商品名称/货号') +
      selectField('brand', '品牌', ['演示服饰', '简约日常']) + selectField('hasNote', '是否备注', ['是', '否']) + selectField('reason', '售后原因', REASONS) +
      selectField('returnType', '退货类型', ['普通退货', '极速退款']) + selectField('marked', '是否标记', ['是', '否']) + selectField('overdue', '逾期类型', ['24h内逾期', '已逾期', '未逾期']) +
      selectField('anomaly', '物流异常', ['无异常', '运输异常', '包裹丢损']) + selectField('pickup', '取件状态', ['待取件', '已取件', '无需取件']) +
      '<label class="rc-field rc-date-field"><span>申请时间</span><input type="datetime-local" name="start" value="' + DEFAULT_START + '" aria-label="申请开始时间"><span class="rc-date-arrow">→</span><input type="datetime-local" name="end" value="' + DEFAULT_END + '" aria-label="申请结束时间"></label></div><div class="rc-query-actions"><button type="reset" class="rc-button">重 置</button><button type="submit" class="rc-button rc-primary">查 询</button><button type="button" class="rc-collapse" data-rc-action="collapse" aria-expanded="true">⌃ 收起</button></div></form></section>' +
      '<section class="rc-order-section" aria-label="退货订单"><div class="rc-list-toolbar"><div class="rc-list-summary"><span class="rc-total" aria-live="polite"></span><span class="rc-toolbar-divider"></span><label class="rc-sort-label"><select name="sort" aria-label="订单排序"><option value="recent">最近申请</option><option value="oldest">最早申请</option><option value="amount-desc">退款金额从高到低</option><option value="amount-asc">退款金额从低到高</option></select>' + arrow + '</label></div><div class="rc-list-actions"><button type="button" class="rc-button" data-rc-action="export">导出</button><button type="button" class="rc-button" data-rc-action="bulk">批量操作退货单 ' + arrow + '</button><button type="button" class="rc-button" data-rc-action="create-refund">创建仅退款售后单</button><button type="button" class="rc-button" data-rc-action="create-resend">创建补寄单</button></div></div><div class="rc-orders-scroll" tabindex="0" aria-label="退货订单，可横向滚动"><div class="rc-list-columns"><span>商品信息</span><span>金额信息</span><span>数量</span><span>售后状态</span><span>售后原因</span><span>物流信息</span><span>操作</span></div><div class="rc-order-list"></div></div><div class="rc-pagination" aria-label="订单分页"></div></section>' +
      '<dialog class="rc-batch-dialog"><form class="rc-batch-form"><div class="rc-dialog-heading"><h2>批量查询</h2><button type="button" class="rc-dialog-close" data-rc-action="close-batch" aria-label="关闭批量查询">×</button></div><p>每行填写一个编号，也可使用逗号分隔</p><textarea name="batchValues" rows="6" aria-label="批量查询编号" placeholder="请输入示例编号"></textarea><div class="rc-dialog-actions"><button type="button" class="rc-button" data-rc-action="close-batch">取消</button><button type="submit" class="rc-button rc-primary">确定</button></div></form></dialog>';
  }

  function mount({ root, onAnalyze, notify } = {}) {
    if (!root || typeof root.querySelector !== 'function') throw new TypeError('ReturnCenterDemo.mount requires root');
    root.classList.add('rc-root');
    root.innerHTML = layout();
    const variants = global.ReturnCenterVariants.mount({ root });
    const form = root.querySelector('.rc-filter-form');
    const batchDialog = root.querySelector('.rc-batch-dialog');
    const state = { page: 1, sort: 'recent', quick: '', collapsed: false, filters: { start: DEFAULT_START, end: DEFAULT_END } };
    let batchField = '', batchOpener = null, savedScroll = { left: 0, top: 0 };
    const say = message => { if (typeof notify === 'function') notify(message); };
    const selectedRows = () => orders.filter(order => {
      const f = state.filters;
      for (const key of ['orderId', 'afterSaleId', 'logisticsId']) if (f[key] && !String(f[key]).split(/[，,;；\s]+/).filter(Boolean).some(value => order[key].toLowerCase().includes(value.toLowerCase()))) return false;
      if (f.product && ![order.product, order.code].join(' ').toLowerCase().includes(f.product.toLowerCase())) return false;
      if (f.status && STATUS_LABELS[order.status] !== f.status) return false;
      for (const key of ['type', 'brand', 'reason', 'returnType', 'overdue', 'anomaly', 'pickup']) if (f[key] && order[key] !== f[key]) return false;
      for (const key of ['hasNote', 'marked']) if (f[key] && order[key] !== (f[key] === '是')) return false;
      const time = order.appliedAt.slice(0, 16).replace(' ', 'T');
      if (f.start && time < f.start || f.end && time > f.end) return false;
      if (state.quick === 'soon' && order.overdue !== '24h内逾期') return false;
      if (state.quick === 'overdue' && order.overdue !== '已逾期') return false;
      if (state.quick === 'pending' && !['receiving', 'inspection', 'review', 'pickup', 'return-buyer'].includes(order.status)) return false;
      if (state.quick && !['soon', 'overdue', 'pending'].includes(state.quick) && order.status !== state.quick) return false;
      return true;
    }).sort((a, b) => state.sort === 'oldest' ? a.appliedAt.localeCompare(b.appliedAt) : state.sort === 'amount-desc' ? b.amount - a.amount || b.appliedAt.localeCompare(a.appliedAt) : state.sort === 'amount-asc' ? a.amount - b.amount || b.appliedAt.localeCompare(a.appliedAt) : b.appliedAt.localeCompare(a.appliedAt));

    function orderMarkup(order) {
      const pending = ['receiving', 'inspection'].includes(order.status);
      const productImage = ASSETS.products[order.productIndex];
      return '<article class="rc-order' + (pending ? ' rc-order-pending' : '') + '" data-rc-order="' + order.id + '"><header class="rc-order-heading"><span>订单编号： <b>' + order.orderId + '</b><button type="button" class="rc-copy" data-rc-action="copy" data-rc-value="' + order.orderId + '" aria-label="复制订单编号">' + copyIcon + '</button></span><span class="rc-order-tag">品牌直发</span><span>售后编号： <b>' + order.afterSaleId + '</b><button type="button" class="rc-copy" data-rc-action="copy" data-rc-value="' + order.afterSaleId + '" aria-label="复制售后编号">' + copyIcon + '</button></span><span class="rc-order-tag">' + escape(order.type) + '</span><span class="rc-application-time">申请时间：' + order.appliedAt + '</span><button type="button" class="rc-mark' + (order.marked ? ' is-marked' : '') + '" data-rc-action="mark" data-rc-id="' + order.id + '" aria-label="' + (order.marked ? '取消标记' : '标记订单') + '" aria-pressed="' + order.marked + '"><svg viewBox="0 0 16 20" aria-hidden="true"><path d="M2 1h12v18l-6-4-6 4Z"/></svg></button></header><div class="rc-order-body"><div class="rc-product-cell"><div class="rc-product-image">' + (productImage ? '<img src="' + escape(productImage) + '" alt="' + escape(order.product) + '" loading="lazy">' : garment) + '</div><div class="rc-product-description"><strong title="' + escape(order.product) + '">' + escape(order.product) + '</strong><p><span>SPU ID：</span>' + order.spu + copyIcon + '</p><p><span>货号：</span>' + escape(order.code) + copyIcon + '</p><p class="rc-spec"><span>规格：</span>' + escape(order.sku) + '</p><p class="rc-service"><span>' + (order.returnType === '极速退款' ? '支持极速退款&gt;' : '') + '</span><span class="' + (pending ? 'rc-service-tag' : '') + '">7天无理由退货' + (!pending ? '&gt;' : '') + '</span></p></div></div><div class="rc-amount-cell"><p><span>实付：</span>' + order.amount + '元</p><p><span>退款：</span>' + order.amount + '元</p></div><div>Ｘ' + order.quantity + '</div><div class="rc-status-cell"><span>' + STATUS_LABELS[order.status] + '</span>' + (pending ? '<p class="rc-remaining">剩余处理时间6天' + (12 + order.productIndex) + '小时<br>' + (18 + order.productIndex * 3) + '分钟45秒</p>' : '') + '</div><div class="rc-reason-cell">' + escape(order.reason) + '</div><div class="rc-logistics-cell">' + (pending ? '<span class="rc-logistics-tag">买家-卖家</span><button type="button" class="rc-text-button" data-rc-action="logistics" data-rc-id="' + order.id + '">查看</button>' : '<span class="rc-muted">暂无</span>') + '</div><div class="rc-operation-cell"><button type="button" class="rc-text-button" data-rc-action="details" data-rc-id="' + order.id + '">查看详情</button>' + (pending ? '<button type="button" class="rc-text-button" data-rc-action="receipt" data-rc-id="' + order.id + '">确认收货</button>' : '') + '<button type="button" class="rc-text-button" data-rc-action="' + (order.status === 'success' ? 'note' : 'more') + '" data-rc-id="' + order.id + '">' + (order.status === 'success' ? '备注' : '更多 ' + arrow) + '</button></div></div></article>';
    }
    function render() {
      const rows = selectedRows(), pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      state.page = Math.max(1, Math.min(state.page, pages));
      root.querySelector('.rc-total').textContent = '共' + rows.length + '条';
      root.querySelector('.rc-order-list').innerHTML = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE).map(orderMarkup).join('') || '<div class="rc-empty"><strong>暂无符合条件的售后订单</strong><p>请调整筛选条件或点击重置</p></div>';
      root.querySelectorAll('[data-rc-quick]').forEach(button => { const active = button.dataset.rcQuick === state.quick; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
      const visiblePages = state.page < 5 ? [1, 2, 3, 4, 5] : [1, state.page - 1, state.page, state.page + 1];
      const pageNumbers = [...new Set(visiblePages.filter(page => page > 0 && page <= pages).concat(pages))].sort((a, b) => a - b);
      let previous = 0;
      const buttons = pageNumbers.map(page => { const gap = previous && page - previous > 1 ? '<span class="rc-pagination-ellipsis">•••</span>' : ''; previous = page; return gap + '<button type="button" data-rc-action="page" data-rc-page="' + page + '"' + (page === state.page ? ' class="is-current" aria-current="page"' : '') + '>' + page + '</button>'; }).join('');
      root.querySelector('.rc-pagination').innerHTML = '<button type="button" data-rc-action="page" data-rc-page="' + (state.page - 1) + '" aria-label="上一页" ' + (state.page === 1 ? 'disabled' : '') + '>‹</button>' + buttons + '<button type="button" data-rc-action="page" data-rc-page="' + (state.page + 1) + '" aria-label="下一页" ' + (state.page === pages ? 'disabled' : '') + '>›</button><form class="rc-page-jump"><label>跳至 <input type="number" name="page" min="1" max="' + pages + '" aria-label="跳转页码"> 页</label><button type="submit" class="rc-jump-submit">确定</button></form>';
      root.querySelector('.rc-page-jump').addEventListener('submit', event => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get('page')); if (!Number.isInteger(value) || value < 1 || value > pages) { say('请输入1至' + pages + '之间的页码'); return; } changePage(value); });
    }
    function changePage(page) {
      state.page = page;
      render();
      root.querySelector('.rc-list-toolbar').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    function applyFilters() {
      const values = Object.fromEntries(new FormData(form));
      if (values.start && values.end && values.start > values.end) { say('申请开始时间不能晚于结束时间'); return false; }
      Object.keys(values).forEach(key => { values[key] = String(values[key]).trim(); });
      if (!values.start && !values.end) { values.start = DEFAULT_START; values.end = DEFAULT_END; }
      state.filters = values; state.page = 1; render(); return true;
    }
    form.addEventListener('submit', event => { event.preventDefault(); applyFilters(); });
    form.addEventListener('reset', () => { state.filters = { start: DEFAULT_START, end: DEFAULT_END }; state.quick = ''; state.page = 1; state.sort = 'recent'; root.querySelector('[name="sort"]').value = 'recent'; render(); });
    root.querySelector('[name="sort"]').addEventListener('change', event => { state.sort = event.target.value; state.page = 1; render(); });
    form.querySelectorAll('select').forEach(select => select.addEventListener('change', () => select.classList.toggle('rc-has-value', Boolean(select.value))));
    form.addEventListener('reset', () => form.querySelectorAll('select').forEach(select => select.classList.remove('rc-has-value')));
    root.querySelector('.rc-batch-form').addEventListener('submit', event => { event.preventDefault(); form.elements[batchField].value = String(new FormData(event.currentTarget).get('batchValues') || '').trim(); batchDialog.close(); applyFilters(); batchOpener?.focus(); });
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-rc-action]');
      if (!button || !root.contains(button)) return;
      const action = button.dataset.rcAction;
      if (action === 'analyze') { if (typeof onAnalyze === 'function') onAnalyze({ source: 'return-center', opener: button }); return; }
      if (action === 'quick') { state.quick = state.quick === button.dataset.rcQuick ? '' : button.dataset.rcQuick; state.page = 1; render(); return; }
      if (action === 'page') { changePage(Number(button.dataset.rcPage)); return; }
      if (action === 'collapse') { state.collapsed = !state.collapsed; root.querySelector('.rc-filter-grid').classList.toggle('rc-is-collapsed', state.collapsed); button.setAttribute('aria-expanded', String(!state.collapsed)); button.textContent = state.collapsed ? '⌄ 展开' : '⌃ 收起'; return; }
      if (action === 'mark') { const order = orders.find(item => item.id === button.dataset.rcId); if (order) { order.marked = !order.marked; render(); } return; }
      if (action === 'batch-query') { batchField = button.dataset.rcField; batchOpener = button; root.querySelector('[name="batchValues"]').value = form.elements[batchField].value; batchDialog.showModal(); return; }
      if (action === 'close-batch') { batchDialog.close(); batchOpener?.focus(); return; }
      const messages = { settings: '退货设置为演示入口', guide: '快速上手：选择状态或填写筛选条件后查询，可查看售后进度、排序及分页', daily: '售后日报为演示入口，可在售后小助手查看日报', todo: '该待办为演示数据', strategy: '退款挽留策略为演示入口', export: '当前为演示，未导出真实商家订单', bulk: '批量操作为演示入口，不会修改订单', 'create-refund': '创建仅退款售后单为演示操作', 'create-resend': '创建补寄单为演示操作', details: '当前为虚构订单详情演示', receipt: '确认收货为演示操作，不会执行真实确认或退款', note: '备注为演示操作', more: '更多售后操作为演示入口', logistics: '示例物流：买家已寄回，等待商家签收', copy: '示例编号：' + (button.dataset.rcValue || '') };
      say(messages[action] || '当前为交互演示');
    });
    batchDialog.addEventListener('click', event => { if (event.target === batchDialog) batchDialog.close(); });
    render();
    return {
      show() { root.hidden = false; const scroller = root.querySelector('.rc-orders-scroll'); scroller.scrollLeft = savedScroll.left; scroller.scrollTop = savedScroll.top; },
      hide() { const scroller = root.querySelector('.rc-orders-scroll'); if (!root.hidden) savedScroll = { left: scroller.scrollLeft, top: scroller.scrollTop }; variants.close(); if (batchDialog.open) batchDialog.close(); root.hidden = true; }
    };
  }
  global.ReturnCenterDemo = { mount };
})(window);
