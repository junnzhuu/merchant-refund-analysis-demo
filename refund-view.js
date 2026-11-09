(function (global) {
  'use strict';

  const OPTIONS = [
    ['v0', '产品原型v0'],
    ['review', '设计评审稿']
  ];
  const STORAGE_KEY = 'refund-analysis-view';
  const validView = value => OPTIONS.some(([key]) => key === value);
  let mounted;

  function mount({ bridge = global.RefundAnalysisDemo } = {}) {
    if (mounted) return mounted;
    if (!bridge) throw new Error('RefundViewDemo requires the existing refund analysis bridge.');

    const picker = document.createElement('div');
    picker.className = 'refund-view-picker';
    picker.hidden = true;
    picker.innerHTML = '<button type="button" class="refund-view-toggle" aria-label="切换退款分析页面版本" aria-haspopup="menu" aria-expanded="false" aria-controls="refundViewMenu"><span>版本</span><span aria-hidden="true">·</span><span class="refund-view-current">v0</span></button><div class="refund-view-menu" id="refundViewMenu" role="menu" aria-label="退款分析页面版本" hidden>' + OPTIONS.map(([value, label]) => '<button type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-refund-view-choice="' + value + '"><span>' + label + '</span><span class="refund-view-check" aria-hidden="true">✓</span></button>').join('') + '</div>';
    document.body.appendChild(picker);

    const toggle = picker.querySelector('.refund-view-toggle');
    const menu = picker.querySelector('.refund-view-menu');
    const choices = [...menu.querySelectorAll('[data-refund-view-choice]')];
    const definitions = document.getElementById('definitions');
    const definitionClass = definitions?.className;
    const definitionHome = definitions ? document.createComment('refund definitions original location') : null;
    if (definitions) definitions.before(definitionHome);
    let active;

    function isAnalysisRoute() {
      const path = global.location.hash.slice(1).replace(/\/$/, '');
      // The router uses analysis as its fallback for empty or unknown paths.
      return path !== '/after-sales/return-center' && path !== '/after-sales/assistant';
    }

    function closeMenu(restoreFocus = false) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus && !picker.hidden) toggle.focus({ preventScroll: true });
    }

    function openMenu(index) {
      if (picker.hidden) return;
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      const target = index === undefined ? choices.find(choice => choice.dataset.refundViewChoice === active) : choices[index];
      target?.focus({ preventScroll: true });
    }

    function adaptSharedControls(value) {
      const review = value === 'review';
      for (const [id, label] of [['brandSelect', '全部品牌'], ['categorySelect', '全部类目'], ['channelSelect', '全部出价渠道']]) {
        const select = document.getElementById(id);
        if (select?.options.length) select.options[0].textContent = review ? label : '全部';
      }
      if (definitions) {
        const headingActions = document.getElementById('refundHeadingActions');
        if (review && headingActions) headingActions.appendChild(definitions);
        else definitionHome.after(definitions);
        definitions.textContent = review ? '指标说明' : '查看指标说明';
        definitions.className = review ? 'btn refund-review-definitions' : definitionClass;
      }
    }

    function remember(value) {
      try { global.sessionStorage.setItem(STORAGE_KEY, value); } catch (_) { /* Explicit URL selection remains usable without storage. */ }
      const url = new URL(global.location.href);
      url.searchParams.set('refundView', value);
      global.history.replaceState(global.history.state, '', url);
    }

    function setView(value, persist = true) {
      if (!validView(value)) return false;
      if (active !== value) {
        const scroll = { left: global.scrollX, top: global.scrollY };
        bridge.suspend();
        active = value;
        document.body.dataset.refundView = value;
        adaptSharedControls(value);
        toggle.querySelector('.refund-view-current').textContent = value === 'review' ? '评审稿' : 'v0';
        toggle.title = OPTIONS.find(([key]) => key === value)[1] + '，点击切换';
        choices.forEach(choice => choice.setAttribute('aria-checked', String(choice.dataset.refundViewChoice === value)));
        if (isAnalysisRoute()) {
          bridge.resume();
          const doc = document.documentElement;
          global.scrollTo({
            left: Math.max(0, Math.min(scroll.left, doc.scrollWidth - global.innerWidth)),
            top: Math.max(0, Math.min(scroll.top, doc.scrollHeight - global.innerHeight)),
            behavior: 'instant'
          });
        }
      }
      if (persist) remember(value);
      return true;
    }

    function syncRoute() {
      picker.hidden = !isAnalysisRoute();
      if (picker.hidden) closeMenu();
    }

    toggle.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu());
    toggle.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(event.key === 'ArrowDown' ? 0 : choices.length - 1);
      }
    });
    choices.forEach(choice => choice.addEventListener('click', () => {
      setView(choice.dataset.refundViewChoice);
      closeMenu(true);
    }));
    picker.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
      } else if (event.key === 'Tab') {
        closeMenu();
      } else if (!menu.hidden && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && event.target !== toggle) {
        event.preventDefault();
        const index = choices.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
        choices[next].focus({ preventScroll: true });
      }
    });
    document.addEventListener('pointerdown', event => {
      if (!picker.contains(event.target)) closeMenu();
    });
    global.addEventListener('hashchange', syncRoute);
    global.addEventListener('popstate', () => {
      const value = new URL(global.location.href).searchParams.get('refundView');
      if (validView(value)) setView(value, false);
      syncRoute();
    });

    let stored;
    try { stored = global.sessionStorage.getItem(STORAGE_KEY); } catch (_) { /* Use an explicit URL or v0 if storage is restricted. */ }
    const parameter = new URL(global.location.href).searchParams.get('refundView');
    const initial = validView(parameter) ? parameter : validView(stored) ? stored : 'v0';
    setView(initial, false);
    try { global.sessionStorage.setItem(STORAGE_KEY, initial); } catch (_) { /* Selection works without storage. */ }
    syncRoute();

    mounted = {
      setView,
      getView: () => active,
      close: () => closeMenu(),
      syncRoute
    };
    return mounted;
  }

  global.RefundViewDemo = { mount };
})(window);
