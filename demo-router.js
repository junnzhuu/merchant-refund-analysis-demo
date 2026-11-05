(function () {
  'use strict';
  const ROUTES = {
    analysis: '/data/refund-analysis',
    'return-center': '/after-sales/return-center',
    assistant: '/after-sales/assistant'
  };
  const LABELS = { analysis: '退款分析', 'return-center': '退货中心', assistant: '售后小助手' };
  const analysisPage = document.getElementById('refundAnalysisPage');
  const salesRoot = document.getElementById('afterSalesRoot');
  const dataSidebar = document.getElementById('dataSidebar');
  const salesSidebar = document.getElementById('afterSalesSidebar');
  const returnButton = document.getElementById('returnToAfterSales');
  const primaryNav = [...document.querySelectorAll('[data-nav-section]')];
  const bridge = window.RefundAnalysisDemo;
  const positions = new Map();
  let currentPage = null;
  let returnPage = null;
  const ai = window.RefundAiDemo.mount({
    model: window.RefundModel,
    data: bridge.getData(),
    onViewAnalysis({ scope }) {
      returnPage = currentPage === 'analysis' ? returnPage : currentPage;
      bridge.applyScope(scope);
      positions.set('analysis', 0);
      navigate('analysis');
    }
  });
  document.getElementById('refundAiSummary').addEventListener('click', event => {
    bridge.suspend();
    ai.open({sourceLabel: LABELS.analysis, opener: event.currentTarget});
  });
  const sales = window.AfterSalesDemo.mount({
    root: salesRoot,
    getReport: () => window.RefundAiDemo.createReport(window.RefundModel, bridge.getData()),
    notify: text => toast(text),
    onAnalyze({ source, opener }) {
      bridge.suspend();
      ai.open({ sourceLabel: LABELS[source], opener });
    }
  });

  function pageFromHash() {
    const path = location.hash.slice(1).replace(/\/$/, '');
    return Object.keys(ROUTES).find(page => ROUTES[page] === path) || 'analysis';
  }

  function navigate(page) {
    const hash = '#' + ROUTES[page];
    if (location.hash === hash) showPage(page);
    else location.hash = hash;
  }

  function showPage(page) {
    if (currentPage === page) return;
    if (currentPage) positions.set(currentPage, window.scrollY);
    ai.close();
    bridge.suspend();
    const isAnalysis = page === 'analysis';
    analysisPage.hidden = !isAnalysis;
    salesRoot.hidden = isAnalysis;
    dataSidebar.hidden = !isAnalysis;
    salesSidebar.hidden = isAnalysis;
    returnButton.hidden = !isAnalysis || !returnPage;
    primaryNav.forEach(button => {
      const active = button.dataset.navSection === (isAnalysis ? 'data' : 'after-sales');
      button.classList.toggle('selected', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-after-sales-nav]').forEach(link => {
      const active = link.dataset.afterSalesNav === page;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (!isAnalysis) sales.show(page);
    currentPage = page;
    document.title = '得物商家后台 · ' + LABELS[page];
    window.scrollTo({ top: positions.get(page) || 0, behavior: 'instant' });
    if (isAnalysis) bridge.resume();
  }

  primaryNav.forEach(button => button.addEventListener('click', () => {
    navigate(button.dataset.navSection === 'data' ? 'analysis' : 'return-center');
  }));
  document.getElementById('refundNav').addEventListener('click', () => navigate('analysis'));
  returnButton.addEventListener('click', () => navigate(returnPage || 'return-center'));
  salesSidebar.querySelectorAll('[data-demo-action]').forEach(button => {
    button.addEventListener('click', () => toast(button.dataset.demoAction + '仅展示入口，当前为售后分析 Demo'));
  });
  window.addEventListener('hashchange', () => showPage(pageFromHash()));
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  showPage(pageFromHash());
})();
