(function () {
  'use strict';
  const ROUTES = {
    home: '/main/dataBoard',
    analysis: '/data/refund-analysis',
    'return-center': '/after-sales/return-center',
    assistant: '/after-sales/assistant'
  };
  const LABELS = { home: '首页', analysis: '退款分析', 'return-center': '退货中心', assistant: '售后小助手' };
  const homePage = document.getElementById('merchantHome');
  const analysisPage = document.getElementById('refundAnalysisPage');
  const salesRoot = document.getElementById('afterSalesRoot');
  const dataSidebar = document.getElementById('dataSidebar');
  const salesSidebar = document.getElementById('afterSalesSidebar');
  const returnButton = document.getElementById('returnToAfterSales');
  const returnTopbar = document.getElementById('returnCenterTopbar');
  const returnFloats = document.getElementById('returnCenterFloats');
  const primaryNav = [...document.querySelectorAll('[data-nav-section]')];
  const bridge = window.RefundAnalysisDemo;
  const positions = new Map();
  let currentPage = null;
  let returnPage = null;
  let homeMetrics;
  let homeRefreshTimer;
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
  document.querySelector('#refundAiSummary .refund-ai-summary-copy').innerHTML = window.RefundAiDemo.summaryMarkup(window.RefundAiDemo.createReport(window.RefundModel, bridge.getData()));
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

  function openHome() {
    if (!homeMetrics) {
      homeMetrics = window.HomeMetrics.mount({
        root: window.HomePage.mount(homePage, { notify: toast }),
        model: window.RefundModel,
        getData: bridge.getData,
        onRefund(period) {
          returnPage = 'home';
          bridge.applyScope({basis: 'pay', period, brand: '全部品牌', category: '全部类目', channel: '全部出价渠道'});
          positions.set('analysis', 0);
          navigate('analysis');
        }
      });
    }
    bridge.refreshData();
    homeMetrics.refresh();
    const hour = 60 * 60 * 1000;
    homeRefreshTimer = setTimeout(openHome, hour - Date.now() % hour);
  }

  function showPage(page) {
    if (currentPage === page) return;
    if (currentPage) positions.set(currentPage, window.scrollY);
    clearTimeout(homeRefreshTimer);
    sales.hide();
    ai.close();
    bridge.suspend();
    document.body.dataset.demoPage = page;
    returnTopbar.hidden = false;
    returnFloats.hidden = page === 'analysis';
    const isAnalysis = page === 'analysis';
    const isHome = page === 'home';
    const isAfterSales = !isAnalysis && !isHome;
    homePage.hidden = !isHome;
    analysisPage.hidden = !isAnalysis;
    salesRoot.hidden = !isAfterSales;
    dataSidebar.hidden = !isAnalysis;
    salesSidebar.hidden = !isAfterSales;
    returnButton.hidden = !isAnalysis || !returnPage;
    returnButton.textContent = returnPage === 'home' ? '返回首页' : '返回售后';
    const activeSection = isHome ? 'home' : isAnalysis ? 'data' : 'after-sales';
    primaryNav.forEach(button => {
      const active = button.dataset.navSection === activeSection;
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
    if (isAfterSales) sales.show(page);
    if (isHome) openHome();
    currentPage = page;
    document.title = '得物商家后台 · ' + LABELS[page];
    window.scrollTo({ top: positions.get(page) || 0, behavior: 'instant' });
    if (isAnalysis) bridge.resume();
  }

  const pageBySection = { home: 'home', data: 'analysis', 'after-sales': 'return-center' };
  primaryNav.forEach(button => button.addEventListener('click', () => {
    navigate(pageBySection[button.dataset.navSection]);
  }));
  document.getElementById('refundNav').addEventListener('click', () => navigate('analysis'));
  returnButton.addEventListener('click', () => navigate(returnPage || 'return-center'));
  salesSidebar.querySelectorAll('[data-demo-action]').forEach(button => {
    button.addEventListener('click', () => toast(button.dataset.demoAction + '仅展示入口，当前为售后分析 Demo'));
  });
  returnTopbar.querySelectorAll('button').forEach(button => button.addEventListener('click', () => toast(button.textContent.trim() + '为演示入口')));
  returnFloats.querySelector('[data-return-ai]').addEventListener('click', event => ai.open({sourceLabel: LABELS[currentPage] || '退货中心', opener: event.currentTarget}));
  returnFloats.querySelector('[data-return-support]').addEventListener('click', () => toast('客服为页面演示入口'));
  window.addEventListener('hashchange', () => showPage(pageFromHash()));
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  showPage(pageFromHash());
  window.RefundViewDemo.mount({bridge});
})();
