(function (root) {
  'use strict';

  const PRESETS = [
    ['custom', '自定义'], ['today', '今日实时'], ['one', '近1天'],
    ['seven', '近7天'], ['thirty', '近30天'],
    ['calendar_week', '自然周'], ['calendar_month', '自然月']
  ];
  const DATE_FIELDS = ['period', 'selectedDay', 'selectedWeek', 'selectedMonth', 'customStart', 'customEnd'];
  const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
  const CALENDAR_ICON = '<svg class="rdp-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4.5" width="14" height="13" rx="2"/><path d="M6.5 2.5v4m7-4v4M3 8.5h14M6.5 11.5h2m3 0h2m-7 3h2"/></svg>';
  let instanceCount = 0;

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function mount({ trigger, model: M, getState, onApply }) {
    if (!trigger || !M || typeof getState !== 'function' || typeof onApply !== 'function') {
      throw new TypeError('RefundDatePicker.mount 需要 trigger、model、getState 和 onApply');
    }
    const id = 'refund-date-picker-' + (++instanceCount);
    const popup = document.createElement('div');
    popup.id = id;
    popup.className = 'rdp-popover';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-labelledby', id + '-title');
    popup.tabIndex = -1;
    popup.hidden = true;
    Object.assign(popup.style, { position: 'fixed', display: 'none', zIndex: '1200' });
    document.body.appendChild(popup);

    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', id);
    trigger.setAttribute('aria-expanded', 'false');

    let opened = false, draft = null, monthView = '', monthYear = 0;
    let pickingEnd = false, hoverDate = '', validationMessage = '';
    const offset = (date, count) => M.dayOffset(date, count);
    const referenceDay = () => getState().referenceDay || M.DAY;
    const yesterday = () => offset(referenceDay(), -1);
    const minDate = () => M.SELECTABLE_START;
    const monthOffset = (month, count) => {
      const date = new Date(month + '-01T00:00:00Z');
      date.setUTCMonth(date.getUTCMonth() + count);
      return date.toISOString().slice(0, 7);
    };
    const readableDate = date => date || '请选择日期';
    const monthTitle = month => Number(month.slice(0, 4)) + '年' + Number(month.slice(5)) + '月';
    const presetName = period => (PRESETS.find(item => item[0] === period) || PRESETS[0])[1];
    const isDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '');

    function normalize(state) {
      const initial = typeof M.defaults === 'function' ? M.defaults(state.referenceDay || M.DAY) : {};
      const merged = { ...initial, ...state };
      if (merged.period === 'calendar_day' || merged.period === 'day') {
        merged.period = 'custom';
        merged.customStart = merged.customEnd = merged.selectedDay || yesterday();
      }
      if (merged.period === 'week') merged.period = 'calendar_week';
      if (merged.period === 'month') merged.period = 'calendar_month';
      merged.selectedDay = merged.selectedDay || yesterday();
      merged.selectedWeek = merged.selectedWeek || M.isoWeek(yesterday());
      merged.selectedMonth = merged.selectedMonth || yesterday().slice(0, 7);
      merged.customStart = merged.customStart || yesterday();
      merged.customEnd = merged.customEnd || merged.customStart;
      return merged;
    }

    function getRange(candidate) {
      try {
        const period = M.getPeriod(candidate);
        return period && period.current ? period.current : { start: '', end: '' };
      } catch (error) {
        return { start: '', end: '' };
      }
    }

    function selectionError(candidate) {
      try { return M.validateSelection(candidate) || ''; }
      catch (error) { return '请选择有效日期'; }
    }

    function sync() {
      const current = normalize(getState()), range = getRange(current);
      const rangeText = isDate(range.start) && isDate(range.end)
        ? range.start === range.end ? range.start : range.start + ' 至 ' + range.end : '请选择日期';
      trigger.innerHTML = '<span class="rdp-trigger-label">' + escape(presetName(current.period)) +
        '</span><span class="rdp-trigger-separator" aria-hidden="true">|</span><span class="rdp-trigger-range">' +
        escape(rangeText) + '</span>' + CALENDAR_ICON;
      trigger.setAttribute('aria-label', '统计时间：' + presetName(current.period) + '，' + rangeText);
      trigger.setAttribute('aria-expanded', String(opened));
      if (opened) place();
    }

    function triggerVisible(anchor, width, height) {
      let left = Math.max(0, anchor.left), right = Math.min(width, anchor.right);
      let top = Math.max(0, anchor.top), bottom = Math.min(height, anchor.bottom);
      if (left >= right || top >= bottom) return false;
      const clips = value => /^(auto|scroll|hidden|clip|overlay)$/.test(value);
      for (let parent = trigger.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), clipX = clips(style.overflowX), clipY = clips(style.overflowY);
        if (!clipX && !clipY) continue;
        const bounds = parent.getBoundingClientRect();
        const scaleX = parent.offsetWidth ? bounds.width / parent.offsetWidth : 1;
        const scaleY = parent.offsetHeight ? bounds.height / parent.offsetHeight : 1;
        const clipLeft = bounds.left + parent.clientLeft * scaleX;
        const clipTop = bounds.top + parent.clientTop * scaleY;
        if (clipX) { left = Math.max(left, clipLeft); right = Math.min(right, clipLeft + parent.clientWidth * scaleX); }
        if (clipY) { top = Math.max(top, clipTop); bottom = Math.min(bottom, clipTop + parent.clientHeight * scaleY); }
        if (left >= right || top >= bottom) return false;
      }
      return true;
    }

    function place() {
      if (!opened) return;
      const anchor = trigger.getBoundingClientRect();
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      if (!triggerVisible(anchor, width, height)) { close(); return; }
      const margin = 12, gap = 8;
      popup.style.maxWidth = Math.max(0, width - margin * 2) + 'px';
      popup.style.maxHeight = Math.max(0, height - margin * 2) + 'px';
      popup.style.overflow = 'auto';
      const box = popup.getBoundingClientRect();
      let left = Math.min(anchor.left, width - box.width - margin);
      left = Math.max(margin, left);
      let top = anchor.bottom + gap;
      if (top + box.height > height - margin && anchor.top - gap > height - anchor.bottom - gap) {
        top = anchor.top - gap - box.height;
      }
      top = Math.max(margin, Math.min(top, height - box.height - margin));
      popup.style.left = Math.round(left) + 'px';
      popup.style.top = Math.round(top) + 'px';
    }

    function close() {
      if (!opened) return;
      opened = false;
      popup.hidden = true;
      popup.style.display = 'none';
      trigger.setAttribute('aria-expanded', 'false');
      draft = null;
      validationMessage = '';
      pickingEnd = false;
      hoverDate = '';
      trigger.focus({ preventScroll: true });
    }

    function clampMonth(month, dual) {
      const first = minDate().slice(0, 7), latest = yesterday().slice(0, 7);
      const last = dual && monthOffset(latest, -1) >= first ? monthOffset(latest, -1) : latest;
      return month < first ? first : month > last ? last : month;
    }

    function open() {
      if (opened) { close(); return; }
      draft = normalize(getState());
      pickingEnd = false;
      hoverDate = '';
      validationMessage = '';
      const range = getRange(draft);
      const initialDate = draft.period === 'custom' ? draft.customStart : range.start;
      monthView = clampMonth((isDate(initialDate) ? initialDate : yesterday()).slice(0, 7), draft.period === 'custom');
      monthYear = Number((draft.selectedMonth || yesterday()).slice(0, 4));
      opened = true;
      popup.hidden = false;
      popup.style.display = '';
      trigger.setAttribute('aria-expanded', 'true');
      render();
      if (opened) popup.querySelector('[data-preset="' + draft.period + '"]')?.focus();
    }

    function dayAvailable(date) {
      if (date < minDate() || date > yesterday()) return false;
      if (draft.period !== 'calendar_week') return true;
      return !selectionError({ ...draft, period: 'calendar_week', selectedWeek: M.isoWeek(date) });
    }

    function selectedRange() {
      if (draft.period === 'custom' && pickingEnd && hoverDate) {
        return { start: hoverDate < draft.customStart ? hoverDate : draft.customStart,
          end: hoverDate < draft.customStart ? draft.customStart : hoverDate };
      }
      return getRange(draft);
    }

    function dayClasses(date, month) {
      const range = selectedRange();
      return ['rdp-day', date.slice(0, 7) !== month ? 'is-outside' : '',
        date === range.start ? 'is-start' : '', date === range.end ? 'is-end' : '',
        date >= range.start && date <= range.end ? 'is-in-range' : '',
        date === referenceDay() ? 'is-today' : ''].filter(Boolean).join(' ');
    }

    function arrow(direction, disabled, action, label) {
      return '<button type="button" class="rdp-nav-button" data-action="' + action + '" aria-label="' + label + '"' +
        (disabled ? ' disabled' : '') + '><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="' +
        (direction === 'previous' ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5') + '"/></svg></button>';
    }

    function calendar(month, index, dual) {
      const first = month + '-01';
      const weekday = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7;
      const gridStart = offset(first, -weekday);
      const earliestMonth = minDate().slice(0, 7);
      const latestMonth = clampMonth(yesterday().slice(0, 7), dual);
      const headingId = id + '-month-' + index;
      const prev = index === 0 ? arrow('previous', monthView <= earliestMonth, 'previous-month', '上个月') : '<span class="rdp-nav-spacer"></span>';
      const next = !dual || index === 1 ? arrow('next', monthView >= latestMonth, 'next-month', '下个月') : '<span class="rdp-nav-spacer"></span>';
      const dates = Array.from({ length: 42 }, (_, day) => offset(gridStart, day));
      const range = getRange(draft);
      const preferred = dates.find(date => date === range.start && date.slice(0, 7) === month && dayAvailable(date)) ||
        dates.find(date => date.slice(0, 7) === month && dayAvailable(date));
      let weeks = '';
      for (let week = 0; week < 6; week++) {
        weeks += '<div class="rdp-week-row" role="row">' + dates.slice(week * 7, week * 7 + 7).map(date => {
          const enabled = dayAvailable(date), inRange = date >= range.start && date <= range.end;
          const label = date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日') + (draft.period === 'calendar_week' ? '，选择所在自然周' : '');
          return '<button type="button" role="gridcell" class="' + dayClasses(date, month) + '" data-date="' + date +
            '" data-month="' + month + '" aria-label="' + label + '" aria-selected="' + inRange + '" tabindex="' +
            (date === preferred ? '0' : '-1') + '"' + (enabled ? '' : ' disabled') + '>' + Number(date.slice(8)) + '</button>';
        }).join('') + '</div>';
      }
      return '<section class="rdp-calendar" aria-labelledby="' + headingId + '"><div class="rdp-monthbar">' + prev +
        '<strong class="rdp-month-title" id="' + headingId + '">' + monthTitle(month) + '</strong>' + next +
        '</div><div class="rdp-weekdays" aria-hidden="true">' + WEEKDAYS.map(day => '<span>' + day + '</span>').join('') +
        '</div><div class="rdp-days" role="grid" aria-labelledby="' + headingId + '">' + weeks + '</div></section>';
    }

    function monthGrid() {
      const firstYear = Number(minDate().slice(0, 4)), latestYear = Number(yesterday().slice(0, 4));
      const months = Array.from({ length: 12 }, (_, index) => {
        const month = monthYear + '-' + String(index + 1).padStart(2, '0');
        const disabled = !!selectionError({ ...draft, period: 'calendar_month', selectedMonth: month });
        return '<button type="button" class="rdp-month-option' + (draft.selectedMonth === month ? ' is-selected' : '') +
          '" data-month-value="' + month + '" aria-label="' + monthYear + '年' + (index + 1) + '月" aria-pressed="' +
          (draft.selectedMonth === month) + '"' + (disabled ? ' disabled' : '') + '>' + (index + 1) + '月</button>';
      }).join('');
      return '<div class="rdp-month-picker"><div class="rdp-monthbar">' + arrow('previous', monthYear <= firstYear, 'previous-year', '上一年') +
        '<strong class="rdp-month-title">' + monthYear + '年</strong>' + arrow('next', monthYear >= latestYear, 'next-year', '下一年') +
        '</div><div class="rdp-month-grid" aria-label="选择月份">' + months + '</div></div>';
    }

    function hint() {
      if (draft.period === 'custom') return pickingEnd ? '可继续选择结束日期，或直接确定查询所选当天。' : '点击开始和结束日期；也可以选择同一天。';
      if (draft.period === 'calendar_week') return '自然周为周一至周日；当前周只统计截至昨天的已结束日期。';
      if (draft.period === 'calendar_month') return '选择自然月；当前月只统计截至昨天的已结束日期。';
      if (draft.period === 'today') return '统计今天截至当前的数据。';
      return '统计已结束的自然日，最晚截至昨天。';
    }

    function render(focus) {
      const range = getRange(draft), error = selectionError(draft);
      const quick = ['today', 'one', 'seven', 'thirty'].includes(draft.period);
      const single = quick && range.start === range.end;
      let view;
      if (draft.period === 'custom') view = '<div class="rdp-calendars is-dual">' + calendar(monthView, 0, true) + calendar(monthOffset(monthView, 1), 1, true) + '</div>';
      else if (draft.period === 'calendar_week') view = '<div class="rdp-calendars is-week">' + calendar(monthView, 0, false) + '</div>';
      else if (draft.period === 'calendar_month') view = monthGrid();
      else view = '';
      popup.dataset.period = draft.period;
      popup.dataset.quick = String(quick);
      popup.innerHTML = '<div class="rdp-body"><nav class="rdp-presets" aria-label="统计时间周期">' +
        PRESETS.map(([period, label]) => '<button type="button" class="rdp-preset' + (period === draft.period ? ' is-selected' : '') +
          '" data-preset="' + period + '" aria-pressed="' + (period === draft.period) + '">' + label + '</button>').join('') +
        '</nav><section class="rdp-main"><header class="rdp-selection"><span class="rdp-selection-label" id="' + id +
        '-title">已选时间</span><div class="rdp-range"><span class="rdp-date-value rdp-range-start">' + escape(readableDate(range.start)) +
        '</span>' + (single ? '' : '<span class="rdp-range-divider" aria-hidden="true">→</span><span class="rdp-date-value rdp-range-end">' +
        escape(readableDate(range.end)) + '</span>') + '</div></header><div class="rdp-view">' + view +
        '</div><p class="rdp-hint">' + hint() + '</p><div class="rdp-error" role="alert"' +
        (validationMessage ? '' : ' hidden') + '>' + escape(validationMessage) + '</div></section></div><footer class="rdp-footer"><button type="button" class="rdp-cancel" data-action="cancel">取消</button>' +
        '<button type="button" class="rdp-apply" data-action="apply"' + (error ? ' disabled' : '') + '>确定</button></footer>';
      place();
      if (!opened) return;
      if (focus?.date) focusDate(focus.date);
      else if (focus) {
        const selector = focus.preset ? '[data-preset="' + focus.preset + '"]' :
          focus.action ? '[data-action="' + focus.action + '"]' : '[data-month-value="' + focus.month + '"]';
        const requested = popup.querySelector(selector);
        const fallback = popup.querySelector('.rdp-nav-button:not(:disabled), .rdp-day[tabindex="0"], .rdp-month-option:not(:disabled)');
        (requested && !requested.disabled ? requested : fallback || popup).focus({ preventScroll: true });
      }
    }

    function focusDate(date) {
      const options = [...popup.querySelectorAll('[data-date="' + date + '"]:not(:disabled)')];
      const button = options.find(element => !element.classList.contains('is-outside')) || options[0];
      if (!button) return;
      const calendarElement = button.closest('.rdp-calendar');
      calendarElement.querySelectorAll('[data-date]').forEach(element => { element.tabIndex = element === button ? 0 : -1; });
      button.focus({ preventScroll: true });
    }

    function selectPreset(period) {
      draft.period = period;
      validationMessage = '';
      pickingEnd = false;
      hoverDate = '';
      const range = getRange(draft);
      const initial = period === 'custom' ? draft.customStart : range.start;
      monthView = clampMonth((isDate(initial) ? initial : yesterday()).slice(0, 7), period === 'custom');
      if (period === 'calendar_month') monthYear = Number(draft.selectedMonth.slice(0, 4));
      render({ preset: period });
    }

    function selectDate(date) {
      if (!dayAvailable(date)) return;
      validationMessage = '';
      if (draft.period === 'calendar_week') {
        draft.selectedWeek = M.isoWeek(date);
      } else if (!pickingEnd) {
        draft.customStart = draft.customEnd = date;
        pickingEnd = true;
      } else {
        const initial = draft.customStart;
        draft.customStart = date < initial ? date : initial;
        draft.customEnd = date < initial ? initial : date;
        pickingEnd = false;
      }
      hoverDate = '';
      render({ date });
    }

    function apply() {
      const candidate = { ...getState() };
      DATE_FIELDS.forEach(field => { candidate[field] = draft[field]; });
      const error = selectionError(candidate);
      if (error) {
        validationMessage = error;
        render({ action: 'apply' });
        return;
      }
      const selected = {};
      DATE_FIELDS.forEach(field => { selected[field] = candidate[field]; });
      close();
      onApply(selected);
      sync();
    }

    trigger.addEventListener('click', open);
    popup.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.preset) { selectPreset(button.dataset.preset); return; }
      if (button.dataset.date) { selectDate(button.dataset.date); return; }
      if (button.dataset.monthValue) {
        draft.selectedMonth = button.dataset.monthValue;
        validationMessage = '';
        render({ month: draft.selectedMonth });
        return;
      }
      const action = button.dataset.action;
      if (action === 'cancel') close();
      else if (action === 'apply') apply();
      else if (action === 'previous-month' || action === 'next-month') {
        monthView = clampMonth(monthOffset(monthView, action === 'previous-month' ? -1 : 1), draft.period === 'custom');
        render({ action });
      } else if (action === 'previous-year' || action === 'next-year') {
        monthYear += action === 'previous-year' ? -1 : 1;
        render({ action });
      }
    });

    popup.addEventListener('pointerover', event => {
      const button = event.target.closest('[data-date]');
      if (draft?.period !== 'custom' || !pickingEnd || !button || button.disabled) return;
      hoverDate = button.dataset.date;
      popup.querySelectorAll('[data-date]').forEach(element => {
        element.className = dayClasses(element.dataset.date, element.dataset.month);
      });
    });
    popup.addEventListener('pointerleave', () => {
      if (!hoverDate) return;
      hoverDate = '';
      popup.querySelectorAll('[data-date]').forEach(element => {
        element.className = dayClasses(element.dataset.date, element.dataset.month);
      });
    });

    popup.addEventListener('keydown', event => {
      const day = event.target.closest('[data-date]');
      if (!day) return;
      const movements = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (!(event.key in movements) && !['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
      event.preventDefault();
      let next = day.dataset.date;
      if (event.key in movements) next = offset(next, movements[event.key]);
      else if (event.key === 'Home') next = M.weekBounds(next).start;
      else if (event.key === 'End') next = M.weekBounds(next).end;
      else {
        const month = monthOffset(next.slice(0, 7), event.key === 'PageUp' ? -1 : 1);
        const lastDay = Number(M.monthBounds(month).end.slice(8));
        next = month + '-' + String(Math.min(Number(next.slice(8)), lastDay)).padStart(2, '0');
      }
      if (!dayAvailable(next)) return;
      const nextMonth = next.slice(0, 7);
      if (nextMonth < monthView || nextMonth > monthOffset(monthView, draft.period === 'custom' ? 1 : 0)) {
        monthView = clampMonth(nextMonth, draft.period === 'custom');
        render({ date: next });
      } else focusDate(next);
    });

    document.addEventListener('pointerdown', event => {
      if (!opened || popup.contains(event.target) || trigger.contains(event.target)) return;
      event.preventDefault();
      close();
    }, true);

    document.addEventListener('keydown', event => {
      if (!opened) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'Tab') {
        const focusable = [...popup.querySelectorAll('button:not(:disabled), [tabindex="0"]')]
          .filter(element => element.tabIndex >= 0 && element.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (!first) { event.preventDefault(); popup.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || !popup.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !popup.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }, true);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', event => {
      if (!popup.contains(event.target)) place();
    }, true);

    sync();
    return { sync, close };
  }

  root.RefundDatePicker = { mount };
})(typeof window !== 'undefined' ? window : globalThis);
