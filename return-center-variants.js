(function (global) {
  'use strict';

  const OPTIONS = [
    ['1', '方案一 · 当前按钮'],
    ['2', '方案二 · 标题栏飘条'],
    ['3', '方案三 · 概览下方飘条'],
    ['4', '方案四 · 筛选下方飘条']
  ];
  const STORAGE_KEY = 'return-center-entry-variant';

  function mount({ root } = {}) {
    const heading = root.querySelector('.rc-page-heading');
    const actions = root.querySelector('.rc-heading-actions');
    const originalEntry = actions.querySelector('[data-rc-action="analyze"]');
    const banner = document.getElementById('refundAiSummary').cloneNode(true);
    banner.removeAttribute('id');
    banner.classList.add('rc-entry-banner');
    banner.dataset.rcAction = 'analyze';
    banner.querySelector('.refund-ai-summary-label').textContent = 'AI近7日退款分析';
    banner.title = banner.textContent.trim();

    const slots = {};
    for (const value of ['2', '3', '4']) {
      const slot = document.createElement('div');
      slot.className = 'rc-entry-slot rc-entry-slot-' + value;
      slot.hidden = true;
      slots[value] = slot;
    }
    heading.insertBefore(slots['2'], actions);
    root.querySelector('.rc-overview').after(slots['3']);
    root.querySelector('.rc-filter-panel').after(slots['4']);

    const picker = document.createElement('div');
    picker.className = 'rc-variant-picker';
    picker.innerHTML = '<button type="button" class="rc-variant-toggle" aria-label="切换退货中心触点方案" aria-haspopup="menu" aria-expanded="false" aria-controls="rcVariantMenu"><span>方案</span> <span class="rc-variant-number">1/4</span></button><div class="rc-variant-menu" id="rcVariantMenu" role="menu" aria-label="退货中心触点方案" hidden>' + OPTIONS.map(([value, label]) => '<button type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-rc-variant="' + value + '"><span>' + label + '</span><span class="rc-variant-check" aria-hidden="true">✓</span></button>').join('') + '</div>';
    root.appendChild(picker);
    const toggle = picker.querySelector('.rc-variant-toggle');
    const menu = picker.querySelector('.rc-variant-menu');
    const choices = [...menu.querySelectorAll('[data-rc-variant]')];
    let active = '1';

    function closePicker(restoreFocus) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }

    function selectVariant(value, remember) {
      if (!OPTIONS.some(option => option[0] === value)) value = '1';
      active = value;
      root.dataset.entryVariant = value;
      originalEntry.hidden = value !== '1';
      for (const [key, slot] of Object.entries(slots)) slot.hidden = key !== value;
      if (value === '1') banner.remove();
      else slots[value].appendChild(banner);
      toggle.querySelector('.rc-variant-number').textContent = value + '/4';
      toggle.title = OPTIONS.find(option => option[0] === value)[1] + '，点击切换';
      choices.forEach(choice => choice.setAttribute('aria-checked', String(choice.dataset.rcVariant === value)));
      if (remember) {
        try { sessionStorage.setItem(STORAGE_KEY, value); } catch (_) { /* Selection still works without storage. */ }
        const url = new URL(location.href);
        url.searchParams.set('rcVariant', value);
        history.replaceState(history.state, '', url);
      }
    }

    toggle.addEventListener('click', () => {
      if (!menu.hidden) { closePicker(false); return; }
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      choices.find(choice => choice.dataset.rcVariant === active).focus({ preventScroll: true });
    });
    choices.forEach(choice => choice.addEventListener('click', () => {
      selectVariant(choice.dataset.rcVariant, true);
      closePicker(true);
    }));
    picker.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        closePicker(true);
      } else if (event.key === 'Tab') closePicker(false);
      else if (!menu.hidden && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const index = choices.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
        choices[next].focus({ preventScroll: true });
      }
    });
    document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) closePicker(false); });

    let stored = null;
    try { stored = sessionStorage.getItem(STORAGE_KEY); } catch (_) { /* Use the default on restricted browsers. */ }
    selectVariant(new URLSearchParams(location.search).get('rcVariant') || stored || '1', false);
    return { close: () => closePicker(false) };
  }

  global.ReturnCenterVariants = { mount };
})(window);
