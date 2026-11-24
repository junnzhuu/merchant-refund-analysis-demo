(function () {
  'use strict';

  const STORAGE_KEY = 'merchant-protocol-demo-v1';
  const SIGNING_DEADLINE = '2027-02-08 23:59';
  const SCENES = {
    before: { label: '活动开始前', time: '2027-01-20 10:00' },
    after: { label: '活动开始后', time: '2027-02-03 10:00' },
    expired: { label: '签署有效期已过', time: '2027-02-09 10:00' }
  };
  const REASONS = { warehouse: '仓库打烊', transport: '运输打烊', customer: '客服打烊', aftersales: '售后打烊' };
  const SEED = [
    { id: 'spring-2027-direct', kind: 'direct', name: '2027年春节不打烊服务协议-直发履约', createdAt: '2026-12-22 10:00', confirmedAt: '2026-12-22 10:08', status: 'signed', reasons: [] },
    { id: 'spring-2027-aftersales', kind: 'aftersales', name: '2027年春节不打烊服务协议-售后履约', createdAt: '2026-12-22 10:00', confirmedAt: '2026-12-22 10:08', status: 'signed', reasons: [] },
    { id: 'spring-2027-customer', kind: 'customer', name: '2027年春节不打烊服务协议-客服履约', createdAt: '2026-12-22 10:00', confirmedAt: '2026-12-22 10:08', status: 'signed', reasons: [] }
  ];
  const STATUS_LABELS = { signed: '已签署', unsigned: '未签署', exited: '已退出' };
  const LOGISTICS_LINK = '<a href="https://t1-stark.dewu.com/main/brandStraight/logisticsConfig" target="_blank" rel="noopener noreferrer">转得物配</a>';
  const WAREHOUSE_LINK = '<a href="#" data-pm-action="warehouse">转入仓发货</a>';
  const DEFAULT_EXIT_COPY = '确定要退出该协议？退出后协议对应权益也会取消。';
  const EXIT_COPY = {
    before: {
      warehouse: `您正在申请解除【2027年春节直发发货不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，或通过${WAREHOUSE_LINK}，以获取平台的推广资源。若您确认需退出，请关注平台在27年1月发布的春节发货时效调整公告！`,
      transport: `您正在申请解除【2027年春节直发发货不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，或通过${LOGISTICS_LINK}，以获取平台的推广资源，切换后需保持使用得物配3个月。若您确认需退出，请关注平台在27年1月发布的春节发货时效调整公告！`,
      both: `您正在申请解除【2027年春节直发发货不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，或通过${LOGISTICS_LINK}、${WAREHOUSE_LINK}，以获取平台的推广资源，切换后需保持使用得物配3个月。若您确认需退出，请关注平台在27年1月发布的春节发货时效调整公告！`,
      customer: '您正在申请解除【2027年春节客服不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，。。。。。若您确认需退出，请关注平台在27年1月发布的春节客服时效调整公告！',
      aftersales: '您正在申请解除【2027年春节售后不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，若您确认需退出，请关注平台在27年1月发布的春节售后时效调整公告！'
    },
    after: {
      warehouse: `您正在申请解除【2027年春节直发发货不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，或通过${WAREHOUSE_LINK}，以获取平台的推广资源。若您确认需退出，自协议解除之日起，新产生的订单将按春节发货时效考核，并按活动期内成交订单金额的 5% 收取违约金（退出前已产生的订单仍需按原时效完成发货），请关注平台在27年1月发布的春节发货时效调整公告！`,
      transport: `您正在申请解除【2027年春节直发发货不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，或通过${LOGISTICS_LINK}，以获取平台的推广资源，切换后需保持使用得物配3个月。若您确认需退出，平台将xxxxxx，请关注平台在27年1月发布的春节发货时效调整公告！`,
      both: `您正在申请解除【2027年春节直发发货不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，或通过${LOGISTICS_LINK}、${WAREHOUSE_LINK}，以获取平台的推广资源，切换后需保持使用得物配3个月。若您确认需退出，请关注平台在27年1月发布的春节发货时效调整公告！`,
      customer: '您正在申请解除【2027年春节客服不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，。。。。。若您确认需退出，请关注平台在27年1月发布的春节客服时效调整公告！',
      aftersales: '您正在申请解除【2027年春节售后不打烊活动协议】，点击确认后，您将不再享受得物平台提供的营销推广的奖励资源，若您确认需退出，请关注平台在27年1月发布的春节售后时效调整公告！'
    }
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function mount({ root, notify = function () {} }) {
    let records = SEED.map(record => ({ ...record, reasons: [] }));
    let scene = 'before';
    let filters = { name: '', type: '', status: '', start: '', end: '', limit: '' };
    let page = 1;
    let activeRecord = null;
    let selectedReasons = [];
    let opener = null;
    let jumpOpener = null;
    let viewerMode = 'view';
    const pageSize = 10;

    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.version === 1 && Array.isArray(saved.records)) {
        records = records.map(record => {
          const previous = saved.records.find(item => item && item.id === record.id);
          if (!previous || !Object.hasOwn(STATUS_LABELS, previous.status)) return record;
          return { ...record, status: previous.status, confirmedAt: typeof previous.confirmedAt === 'string' ? previous.confirmedAt : record.confirmedAt, exitedAt: typeof previous.exitedAt === 'string' ? previous.exitedAt : '', reasons: Array.isArray(previous.reasons) ? previous.reasons.filter(reason => Object.hasOwn(REASONS, reason)) : [] };
        });
      }
    } catch (_) { /* Storage is optional for this browser-local prototype. */ }
    const requestedScene = new URLSearchParams(location.search).get('protocolScene');
    if (Object.hasOwn(SCENES, requestedScene)) scene = requestedScene;
    else if (requestedScene === 'during') scene = 'after';

    root.innerHTML = `
      <div class="pm-page">
        <h1 class="pm-page-title">商家信息</h1>
        <nav class="pm-tabs" aria-label="商家信息页签">
          ${['商家信息', '商家服务', '协议管理', '地址管理', '品牌资质', '直发资质', '专供资质', '号店一体', '关联主体', '主体数据切换'].map(label => `<button type="button" class="pm-tab"${label === '协议管理' ? ' aria-current="page"' : ''} data-pm-tab="${label}">${label}</button>`).join('')}
        </nav>
        <form class="pm-filters" aria-label="协议筛选条件">
          <div class="pm-filter-item pm-filter-name"><label for="pmProtocolName">协议名称:</label><input class="pm-input" id="pmProtocolName" name="name" placeholder="请输入协议名称" autocomplete="off"></div>
          <div class="pm-filter-item pm-filter-type"><label for="pmProtocolType">协议类型:</label><select class="pm-select" id="pmProtocolType" name="type"><option value="">全部</option>${SEED.map(record => `<option value="${record.id}">${record.name}</option>`).join('')}</select></div>
          <div class="pm-filter-item pm-filter-status"><label for="pmProtocolStatus">状态:</label><select class="pm-select" id="pmProtocolStatus" name="status"><option value="">全部</option><option value="unsigned">未签署</option><option value="signed">已签署</option><option value="exited">已退出</option></select></div>
          <div class="pm-filter-item pm-filter-dates"><label for="pmStartDate">截止签约日期:</label><div class="pm-date-range"><input class="pm-date" data-empty="true" id="pmStartDate" type="date" name="start" aria-label="开始日期" title="开始日期"><span aria-hidden="true">→</span><input class="pm-date" data-empty="true" type="date" name="end" aria-label="结束日期" title="结束日期"></div></div>
          <div class="pm-filter-item pm-filter-limit"><label for="pmProtocolLimit">是否限制出价:</label><select class="pm-select" id="pmProtocolLimit" name="limit"><option value="">全部</option><option value="limited">限制出价</option><option value="unlimited">不限制出价</option></select></div>
          <div class="pm-filter-actions"><button type="reset" class="pm-button">重 置</button><button type="submit" class="pm-button pm-button-primary">查 询</button></div>
        </form>
        <section class="pm-list" aria-labelledby="pmListHeading">
          <h2 id="pmListHeading">协议列表</h2>
          <div class="pm-table-scroll"><table class="pm-table" aria-label="协议列表"><colgroup><col class="pm-col-name"><col class="pm-col-type"><col class="pm-col-created"><col class="pm-col-limit"><col class="pm-col-status"><col class="pm-col-confirmed"><col class="pm-col-actions"></colgroup><thead><tr><th scope="col">协议名称</th><th scope="col">协议类型</th><th scope="col">协议创建时间</th><th scope="col">未签约是否限制出价</th><th scope="col">状态</th><th scope="col">协议确认时间</th><th scope="col">操作</th></tr></thead><tbody></tbody></table></div>
          <nav class="pm-pagination" aria-label="协议列表分页"></nav>
        </section>
      </div>
      <dialog class="pm-dialog pm-exit-dialog" aria-labelledby="pmExitTitle">
        <header class="pm-dialog-header"><h2 id="pmExitTitle">退出协议确认</h2><button type="button" class="pm-dialog-close" data-pm-close aria-label="关闭退出协议确认">×</button></header>
        <div class="pm-dialog-body">
          <div class="pm-reason-field"><label id="pmReasonLabel" for="pmReasonTrigger"><span class="pm-required-mark" aria-hidden="true">*</span>退出原因:<span id="pmReasonRequired" class="sr-only">必选</span></label><div class="pm-reason-select"><button type="button" id="pmReasonTrigger" class="pm-select-trigger" aria-label="退出原因" aria-describedby="pmReasonRequired" aria-haspopup="true" aria-expanded="false" aria-controls="pmReasonMenu"><span class="pm-placeholder">请选择退出原因</span></button><div id="pmReasonMenu" class="pm-reason-menu" role="group" aria-labelledby="pmReasonLabel" hidden></div></div></div>
          <div class="pm-exit-copy">${DEFAULT_EXIT_COPY}</div>
          <label class="pm-exit-confirmation" hidden><span class="pm-required-mark" aria-hidden="true">*</span><input type="checkbox">我已了解，确认退出该协议</label>
        </div>
        <footer class="pm-dialog-footer"><button type="button" class="pm-button pm-button-primary" data-pm-confirm-exit disabled>确定退出</button><button type="button" class="pm-button" data-pm-close>取 消</button></footer>
      </dialog>
      <dialog class="pm-dialog pm-view-dialog" aria-labelledby="pmViewTitle">
        <header class="pm-dialog-header"><h2 id="pmViewTitle">协议详情</h2><button type="button" class="pm-dialog-close" data-pm-close aria-label="关闭协议详情">×</button></header>
        <div class="pm-view-meta"></div>
        <div class="pm-document-viewer"><div class="pm-document-toolbar"><span>协议样稿</span><span>1 / 1</span><span>100%</span></div><div class="pm-document-viewer-body"><aside class="pm-document-thumbnails" aria-hidden="true"><div class="pm-document-thumbnail">1</div></aside><div class="pm-document-scroll" tabindex="0" aria-label="协议正文"><article class="pm-document"></article></div></div></div>
        <footer class="pm-dialog-footer pm-view-footer"><button type="button" class="pm-button" data-pm-close>关 闭</button><button type="button" class="pm-button pm-button-primary" data-pm-confirm-sign hidden>确认协议</button></footer>
      </dialog>
      <dialog class="pm-dialog pm-jump-dialog" aria-labelledby="pmJumpTitle"><header class="pm-dialog-header"><h2 id="pmJumpTitle">入仓预约</h2><button type="button" class="pm-dialog-close" data-pm-close-jump aria-label="关闭入仓预约跳转示意">×</button></header><div class="pm-dialog-body"><h3>入仓预约跳转示意</h3><p>此处演示从退出协议提示进入商家后台「入仓预约」的路径。返回后可继续选择原因或确认退出协议。</p><p class="pm-document-notice">原型示例，不会创建真实入仓预约。</p></div><footer class="pm-dialog-footer"><button type="button" class="pm-button pm-button-primary" data-pm-close-jump>返回协议</button></footer></dialog>
      <div class="pm-demo"><button type="button" class="pm-demo-toggle" aria-expanded="false" aria-controls="pmDemoPanel">原型演示</button><section class="pm-demo-panel" id="pmDemoPanel" aria-label="原型演示设置" hidden><h3>原型演示</h3><div class="pm-demo-scenes">${Object.entries(SCENES).map(([key, value]) => `<button type="button" class="pm-demo-scene" data-pm-scene="${key}" aria-pressed="${key === scene}">${value.label}</button>`).join('')}</div><p class="pm-demo-time"></p><p class="pm-demo-note">演示签署截止时间：${SIGNING_DEADLINE}。场景时间仅用于原型演示，正式时间待配置。</p><div class="pm-demo-reset"><button type="button" class="pm-button" data-pm-reset="signed">重置为已签署</button><button type="button" class="pm-button" data-pm-reset="unsigned">重置为未签署</button></div><p class="pm-demo-note">签署与退出只更新浏览器中的示例状态；协议正文为非约束性的演示内容。</p></section></div>
    `;

    const form = root.querySelector('.pm-filters');
    const tbody = root.querySelector('.pm-table tbody');
    const pagination = root.querySelector('.pm-pagination');
    const exitDialog = root.querySelector('.pm-exit-dialog');
    const viewDialog = root.querySelector('.pm-view-dialog');
    const jumpDialog = root.querySelector('.pm-jump-dialog');
    const reasonTrigger = root.querySelector('#pmReasonTrigger');
    const reasonMenu = root.querySelector('#pmReasonMenu');
    const exitCopy = exitDialog.querySelector('.pm-exit-copy');
    const exitConfirmation = exitDialog.querySelector('.pm-exit-confirmation');
    const exitAcknowledgement = exitConfirmation.querySelector('input');
    const exitButton = exitDialog.querySelector('[data-pm-confirm-exit]');
    const signButton = root.querySelector('[data-pm-confirm-sign]');
    const demoPanel = root.querySelector('.pm-demo-panel');
    const demoToggle = root.querySelector('.pm-demo-toggle');

    function persist() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, records: records.map(({ id, status, reasons, confirmedAt, exitedAt }) => ({ id, status, reasons, confirmedAt, exitedAt })) }));
      } catch (_) { /* Interactions continue when storage is unavailable. */ }
    }

    function isWithinSigningPeriod() {
      return SCENES[scene].time <= SIGNING_DEADLINE;
    }

    function render() {
      const withinSigningPeriod = isWithinSigningPeriod();
      const cutoff = SIGNING_DEADLINE.slice(0, 10);
      const filtered = records.filter(record => {
        return (!filters.name || record.name.includes(filters.name)) && (!filters.type || record.id === filters.type) && (!filters.status || record.status === filters.status) && filters.limit !== 'limited' && (!filters.start || cutoff >= filters.start) && (!filters.end || cutoff <= filters.end);
      });
      const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
      page = Math.min(page, pages);
      const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
      tbody.innerHTML = visible.length ? visible.map(record => {
        const reasonTitle = record.status === 'exited' && record.reasons.length ? ` title="退出原因：${record.reasons.map(reason => REASONS[reason]).join('、')}"` : '';
        const canSign = record.status !== 'signed' && withinSigningPeriod;
        const viewAction = canSign ? '' :
          `<button type="button" class="pm-link" data-pm-action="view" data-protocol-id="${record.id}">查看</button>`;
        let action = '';
        if (record.status === 'signed') {
          action = withinSigningPeriod ? `<button type="button" class="pm-link" data-pm-action="exit" data-protocol-id="${record.id}">退出协议</button>` : `<span class="pm-disabled-action" tabindex="0" title="已过协议签署有效期，不可申请退出" aria-label="已过协议签署有效期，不可申请退出"><button type="button" class="pm-link" disabled>退出协议</button><span class="pm-expired-tooltip" role="tooltip">已过协议签署有效期，不可申请退出</span></span>`;
        } else if (canSign) {
          action = `<button type="button" class="pm-link" data-pm-action="sign" data-protocol-id="${record.id}">签署协议</button>`;
        }
        return `<tr data-protocol-id="${record.id}"><td>${record.name}</td><td>${record.name}</td><td>${record.createdAt}</td><td>不限制出价</td><td><span class="pm-status pm-status-${record.status}"${reasonTitle}>${STATUS_LABELS[record.status]}</span></td><td>${record.confirmedAt || '-'}</td><td><div class="pm-row-actions">${viewAction}${action}</div></td></tr>`;
      }).join('') : '<tr><td colspan="7" class="pm-empty"><div class="pm-empty-icon" aria-hidden="true">▱</div>暂无数据</td></tr>';
      const start = filtered.length ? (page - 1) * pageSize + 1 : 0;
      const end = Math.min(page * pageSize, filtered.length);
      pagination.innerHTML = `<span class="pm-page-count">第 ${start}-${end} 条/总共 ${filtered.length} 条</span><button type="button" class="pm-page-arrow" aria-label="上一页" data-pm-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>${Array.from({ length: pages }, (_, index) => `<button type="button" class="pm-page-button" data-pm-page="${index + 1}"${index + 1 === page ? ' aria-current="page"' : ''}>${index + 1}</button>`).join('')}<button type="button" class="pm-page-arrow" aria-label="下一页" data-pm-page="${page + 1}" ${page === pages ? 'disabled' : ''}>›</button>`;
      root.querySelector('.pm-demo-time').textContent = `当前演示时间：${SCENES[scene].time}`;
      root.querySelectorAll('[data-pm-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pmScene === scene)));
    }

    function closeReasonMenu() {
      reasonMenu.hidden = true;
      reasonTrigger.setAttribute('aria-expanded', 'false');
    }

    function updateExitConfirmation() {
      const hasReason = selectedReasons.length > 0;
      exitConfirmation.hidden = !hasReason;
      exitButton.disabled = !hasReason || !exitAcknowledgement.checked;
    }

    function closeDialogs(restoreFocus = true) {
      closeReasonMenu();
      if (jumpDialog.open) jumpDialog.close();
      if (exitDialog.open) exitDialog.close();
      if (viewDialog.open) viewDialog.close();
      activeRecord = null;
      selectedReasons = [];
      exitAcknowledgement.checked = false;
      updateExitConfirmation();
      if (restoreFocus && opener && opener.isConnected) opener.focus();
      opener = null;
      jumpOpener = null;
    }

    function allowedReasons(record) {
      return record.kind === 'direct' ? ['warehouse', 'transport'] : [record.kind];
    }

    function updateExitCopy() {
      reasonTrigger.innerHTML = selectedReasons.length ? selectedReasons.map(reason => `<span class="pm-reason-tag">${REASONS[reason]}</span>`).join('') : '<span class="pm-placeholder">请选择退出原因</span>';
      if (!selectedReasons.length) {
        exitCopy.textContent = DEFAULT_EXIT_COPY;
      } else {
        const key = selectedReasons.includes('warehouse') && selectedReasons.includes('transport') ? 'both' : selectedReasons[0];
        exitCopy.innerHTML = EXIT_COPY[scene === 'before' ? 'before' : 'after'][key];
      }
    }

    function openExit(record, target) {
      if (!isWithinSigningPeriod()) return;
      closeDialogs(false);
      activeRecord = record;
      opener = target;
      reasonMenu.innerHTML = allowedReasons(record).map(reason => `<label class="pm-reason-option"><input type="checkbox" value="${reason}"><span>${REASONS[reason]}</span></label>`).join('');
      updateExitCopy();
      exitDialog.showModal();
      reasonTrigger.focus();
    }

    function openViewer(record, mode, target) {
      closeDialogs(false);
      activeRecord = record;
      viewerMode = mode;
      opener = target;
      const kindLabel = record.kind === 'direct' ? '直发履约' : record.kind === 'customer' ? '客服履约' : '售后履约';
      const signing = mode === 'sign' && isWithinSigningPeriod();
      root.querySelector('.pm-view-meta').innerHTML = `<span>协议类型：${escapeHtml(record.name)}</span>` + (signing
        ? `<span>协议签署时间：${escapeHtml(record.confirmedAt || '')}</span><span>截止签约时间：${SIGNING_DEADLINE}:00</span><span>截止限制出价时间未签约是否限制出价：不限制出价</span>`
        : `<span>状态：${STATUS_LABELS[record.status]}</span><span>协议创建时间：${record.createdAt}</span><span>协议确认时间：${escapeHtml(record.confirmedAt || '-')}</span>`);
      root.querySelector('.pm-document').innerHTML = `
        <h2 class="pm-document-title">${escapeHtml(record.name)}</h2>
        <p class="pm-document-meta">协议状态：${STATUS_LABELS[record.status]}${record.confirmedAt ? `　协议确认时间：${escapeHtml(record.confirmedAt)}` : ''}</p>
        <p class="pm-document-notice">原型示例，2027 正式正文待提供。本页为非约束性的演示内容，不构成真实协议。</p>
        <h3>一、审慎阅读</h3><p>本示例用于展示协议阅读、签署、退出和再次签署的交互。正式签署前，请完整阅读平台提供的协议正文，并确认您理解相关活动约定。</p>
        <h3>二、签约</h3><p>当前示例为${kindLabel}协议。点击下方确认按钮后，协议列表将展示签署后的示例状态和确认时间。</p>
        <h3>三、活动约定</h3><p>活动时间、适用范围、履约要求及权益以正式发布的协议和公告为准。本示例不对尚未确认的合同内容作补充约定。</p>
        <h3>四、协议退出与再次签署</h3><p>本原型支持演示在签署有效期内选择原因退出协议，以及退出后重新进入签署流程。正式规则与退出提示请以经确认的协议内容为准。</p>
        ${record.status === 'exited' && record.reasons.length ? `<p class="pm-document-meta">示例退出原因：${record.reasons.map(reason => REASONS[reason]).join('、')}<br>示例退出时间：${escapeHtml(record.exitedAt || '-')}</p>` : ''}
      `;
      signButton.hidden = !signing;
      viewDialog.querySelector('.pm-view-footer [data-pm-close]').textContent = signing ? '取 消' : '关 闭';
      viewDialog.showModal();
      root.querySelector('.pm-document-scroll').scrollTop = 0;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = new FormData(form);
      const next = Object.fromEntries(fields.entries());
      if (next.start && next.end && next.start > next.end) {
        notify('开始日期不能晚于结束日期');
        form.elements.start.focus();
        return;
      }
      filters = { ...next, name: next.name.trim() };
      page = 1;
      render();
    });
    form.addEventListener('reset', () => {
      filters = { name: '', type: '', status: '', start: '', end: '', limit: '' };
      page = 1;
      render();
      queueMicrotask(syncDatePlaceholders);
    });
    function syncDatePlaceholders() {
      form.querySelectorAll('.pm-date').forEach(input => { input.dataset.empty = String(!input.value); });
    }
    form.querySelectorAll('.pm-date').forEach(input => {
      input.addEventListener('input', syncDatePlaceholders);
      input.addEventListener('change', syncDatePlaceholders);
    });
    tbody.addEventListener('click', event => {
      const button = event.target.closest('[data-pm-action]');
      if (!button) return;
      const record = records.find(item => item.id === button.dataset.protocolId);
      if (!record) return;
      if (button.dataset.pmAction === 'exit') openExit(record, button);
      else openViewer(record, button.dataset.pmAction === 'sign' ? 'sign' : 'view', button);
    });
    pagination.addEventListener('click', event => {
      const button = event.target.closest('[data-pm-page]');
      if (!button || button.disabled) return;
      page = Number(button.dataset.pmPage);
      render();
    });
    root.querySelectorAll('[data-pm-close]').forEach(button => button.addEventListener('click', () => closeDialogs()));
    [exitDialog, viewDialog].forEach(dialog => {
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        if (dialog === exitDialog && !reasonMenu.hidden) {
          closeReasonMenu();
          reasonTrigger.focus();
        } else closeDialogs();
      });
    });
    reasonTrigger.addEventListener('click', () => {
      reasonMenu.hidden = !reasonMenu.hidden;
      reasonTrigger.setAttribute('aria-expanded', String(!reasonMenu.hidden));
    });
    reasonTrigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        reasonMenu.hidden = false;
        reasonTrigger.setAttribute('aria-expanded', 'true');
        reasonMenu.querySelector('input').focus();
      }
    });
    exitAcknowledgement.addEventListener('change', updateExitConfirmation);
    reasonMenu.addEventListener('change', () => {
      selectedReasons = [...reasonMenu.querySelectorAll('input:checked')].map(input => input.value);
      exitAcknowledgement.checked = false;
      updateExitCopy();
      updateExitConfirmation();
      if (activeRecord.kind !== 'direct') {
        closeReasonMenu();
        reasonTrigger.focus();
      }
    });
    exitDialog.addEventListener('click', event => {
      if (!event.target.closest('.pm-reason-select')) closeReasonMenu();
      const warehouseLink = event.target.closest('[data-pm-action="warehouse"]');
      if (warehouseLink) {
        event.preventDefault();
        jumpOpener = warehouseLink;
        jumpDialog.showModal();
      }
    });
    function closeJump() {
      jumpDialog.close();
      if (jumpOpener && jumpOpener.isConnected) jumpOpener.focus();
      jumpOpener = null;
    }
    root.querySelectorAll('[data-pm-close-jump]').forEach(button => button.addEventListener('click', closeJump));
    jumpDialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeJump();
    });
    function focusRecord(recordId) {
      const button = tbody.querySelector(`[data-protocol-id="${recordId}"] :is([data-pm-action="view"], [data-pm-action="sign"])`);
      if (button) button.focus();
      else form.elements.name.focus();
    }
    exitButton.addEventListener('click', () => {
      if (!exitDialog.open || !activeRecord || !isWithinSigningPeriod() || !selectedReasons.length || !exitAcknowledgement.checked) return;
      activeRecord.status = 'exited';
      activeRecord.reasons = [...selectedReasons];
      activeRecord.exitedAt = SCENES[scene].time;
      const recordId = activeRecord.id;
      persist();
      closeDialogs(false);
      render();
      focusRecord(recordId);
      notify('已退出协议');
    });
    signButton.addEventListener('click', () => {
      if (!viewDialog.open || !activeRecord || viewerMode !== 'sign' || !isWithinSigningPeriod()) return;
      activeRecord.status = 'signed';
      activeRecord.confirmedAt = SCENES[scene].time;
      activeRecord.reasons = [];
      activeRecord.exitedAt = '';
      const recordId = activeRecord.id;
      persist();
      closeDialogs(false);
      render();
      focusRecord(recordId);
      notify('协议签署成功（原型演示）');
    });
    demoToggle.addEventListener('click', () => {
      demoPanel.hidden = !demoPanel.hidden;
      demoToggle.setAttribute('aria-expanded', String(!demoPanel.hidden));
    });
    root.querySelectorAll('[data-pm-scene]').forEach(button => button.addEventListener('click', () => {
      closeDialogs(false);
      scene = button.dataset.pmScene;
      const url = new URL(location.href);
      url.searchParams.set('protocolScene', scene);
      history.replaceState(history.state, '', url);
      render();
      notify(`已切换至${SCENES[scene].label}演示场景`);
    }));
    root.querySelectorAll('[data-pm-reset]').forEach(button => button.addEventListener('click', () => {
      closeDialogs(false);
      const status = button.dataset.pmReset;
      records = SEED.map(record => ({ ...record, status, reasons: [], exitedAt: '', confirmedAt: status === 'signed' ? record.confirmedAt : '' }));
      filters = { name: '', type: '', status: '', start: '', end: '', limit: '' };
      form.reset();
      page = 1;
      persist();
      render();
      notify(`示例协议已重置为${STATUS_LABELS[status]}`);
    }));
    root.querySelectorAll('[data-pm-tab]').forEach(button => button.addEventListener('click', () => {
      if (button.dataset.pmTab !== '协议管理') notify(`${button.dataset.pmTab}为原型展示入口`);
    }));
    render();
    return {
      show() { render(); },
      hide() {
        closeDialogs(false);
        demoPanel.hidden = true;
        demoToggle.setAttribute('aria-expanded', 'false');
      }
    };
  }

  window.ProtocolManagerDemo = { mount };
}());
