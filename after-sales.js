(function (global) {
  'use strict';

  function mount({ root, onAnalyze, notify, getReport } = {}) {
    if (!root || typeof root.appendChild !== 'function') throw new TypeError('AfterSalesDemo.mount requires a root element');
    const pages = {};
    for (const page of ['return-center', 'assistant']) {
      const element = document.createElement('section');
      element.className = 'after-sales-page as-' + page;
      element.dataset.afterSalesPage = page;
      element.hidden = true;
      element.setAttribute('aria-label', page === 'return-center' ? '退货中心' : '售后小助手');
      root.appendChild(element);
      pages[page] = element;
    }
    const views = {
      'return-center': global.ReturnCenterDemo.mount({ root: pages['return-center'], onAnalyze, notify }),
      assistant: global.AssistantReplica.mount({ root: pages.assistant, getReport, onAnalyze, notify })
    };
    let activePage = null;
    return {
      show(page) {
        if (!Object.prototype.hasOwnProperty.call(pages, page)) return;
        if (activePage && activePage !== page) views[activePage].hide();
        Object.entries(pages).forEach(([key, element]) => { element.hidden = key !== page; });
        views[page].show();
        activePage = page;
      },
      hide() {
        if (activePage) views[activePage].hide();
        activePage = null;
      }
    };
  }

  global.AfterSalesDemo = { mount };
})(window);
