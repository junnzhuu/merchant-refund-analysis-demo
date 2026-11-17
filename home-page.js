(function () {
  'use strict';

  const navigationIcons = {
    goods: 'https://cdn.dewu.com/node-common/ad34eca2-99c8-54b6-edf4-4ac77c2ab785-48-48.png',
    orders: 'https://cdn.dewu.com/node-common/27ac8531-e649-57cf-9eb8-cee953fd5b08-48-48.png',
    afterSales: 'https://cdn.dewu.com/node-common/7512f260-0366-012e-2ac8-8cc554d325ef-48-48.png',
    business: 'https://cdn.dewu.com/node-common/812cbd51-e284-2649-8c75-140da5de6183-48-48.png'
  };

  const banners = [
    ['assets/home/hero-double11.jpg', '双11 第一波订单里的 6 个爆单信号'],
    ['assets/home/hero-merchant-app.png', '得物商家版 APP'],
    ['assets/home/hero-new-customers.jpg', '新客经营指南']
  ];

  const notices = {
    latest: [
      ['违规', '描述不符/虚假宣传违规公示', '11/11'],
      ['违规', '关于巡检不合格商家的违规公示（第 1 期）', '11/11'],
      ['商品', '关于上架商品数量治理专项的公告', '11/09'],
      ['商品', '【重要通知】得物平台品质管理细则上线', '11/04'],
      ['违规', '关于抽检不合格商家的违规公示（第 1 期）', '10/28']
    ],
    rules: [
      ['商品', '得物平台综合认定品质管理细则', '11/04'],
      ['违规', '商家违规处理规则更新', '10/28']
    ],
    features: [
      ['商品', '商家后台功能上新公告', '11/11'],
      ['商品', '商品竞争力分析功能更新', '11/09']
    ]
  };

  const taskGroups = [
    ['商品', 'goods', [['缺货待补货', '83']]],
    ['订单', 'orders', [['待发货', '36']]],
    ['售后', 'afterSales', [['售后待处理', '66'], ['待回复工单', '1']]],
    ['经营', 'business', [['违规待申诉', '0']]]
  ];

  function renderTasks() {
    return taskGroups.map(([label, icon, tasks]) => `
      <div class="home-task-group">
        <h3><img src="${navigationIcons[icon]}" alt="">${label}</h3>
        <dl>${tasks.map(([name, count]) => `<div><dt>${name}</dt><dd>${count}</dd></div>`).join('')}</dl>
      </div>
    `).join('');
  }

  function renderNotices(key) {
    return notices[key].map(([category, title, date]) => `
      <li><span class="home-notice-tag" data-category="${category}">${category}</span><span class="home-notice-title" title="${title}">${title}</span><time>${date}</time></li>
    `).join('');
  }

  function mount(root, {notify}) {
    root.innerHTML = `
      <div class="home-top-grid">
        <div class="home-main-column">
          <section class="home-banner" aria-label="平台推广">
            <div class="home-banner-fallback"><strong></strong><span>点击查看 〉</span></div>
            <img class="home-banner-image" src="${banners[0][0]}" alt="${banners[0][1]}">
            <button type="button" class="home-banner-arrow home-banner-prev" aria-label="上一张横幅">‹</button>
            <button type="button" class="home-banner-arrow home-banner-next" aria-label="下一张横幅">›</button>
          </section>
          <section class="home-task-panel" aria-label="待办事项">${renderTasks()}</section>
          <section id="homeMetrics" aria-label="经营数据"></section>
        </div>
        <aside class="home-side-column">
          <section class="home-store-panel" aria-label="店铺信息">
            <h2>杭州示例服饰电子商务有限公司</h2>
            <div class="home-store-grid">
              <div><span>体验综合分</span><strong>99.45 <i>›</i></strong></div>
              <div><span>费率折扣 <b>收费规则</b></span><strong>9.00 <i>›</i></strong></div>
              <div><span>商家信用分</span><strong>100 <i>›</i></strong></div>
              <div><span>一般违规</span><div>处罚 <b>0</b> <i>›</i></div></div>
              <div><span>严重违规</span><div>处罚 <b>0</b> <i>›</i></div></div>
              <div><span>违规预警</span><div>今日新增 <b>0</b> <i>›</i></div></div>
            </div>
          </section>
          <section class="home-notice-panel" aria-label="公告">
            <div class="home-notice-header">
              <div class="home-notice-tabs" aria-label="公告类别">
                <button type="button" data-notice="latest" aria-pressed="true">最新公告</button>
                <button type="button" data-notice="rules" aria-pressed="false">规则通知</button>
                <button type="button" data-notice="features" aria-pressed="false">功能上新</button>
              </div>
              <button class="home-notice-more" type="button">查看更多 ›</button>
            </div>
            <ul class="home-notice-list">${renderNotices('latest')}</ul>
          </section>
        </aside>
      </div>
      <div id="homeLower"></div>
    `;

    const bannerImage = root.querySelector('.home-banner-image');
    const bannerTitle = root.querySelector('.home-banner-fallback strong');
    let bannerIndex = 0;
    function showBanner(offset) {
      bannerIndex = (bannerIndex + offset + banners.length) % banners.length;
      const [image, title] = banners[bannerIndex];
      bannerTitle.textContent = title;
      bannerImage.alt = title;
      bannerImage.hidden = false;
      bannerImage.src = image;
    }
    bannerImage.addEventListener('error', () => { bannerImage.hidden = true; });
    root.querySelector('.home-banner-prev').addEventListener('click', () => showBanner(-1));
    root.querySelector('.home-banner-next').addEventListener('click', () => showBanner(1));
    showBanner(0);

    const noticeButtons = root.querySelectorAll('[data-notice]');
    const noticeList = root.querySelector('.home-notice-list');
    noticeButtons.forEach(button => button.addEventListener('click', () => {
      noticeButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      noticeList.innerHTML = renderNotices(button.dataset.notice);
    }));

    root.querySelector('.home-notice-more').addEventListener('click', () => notify('公告为演示入口'));
    window.HomeLower.mount(root.querySelector('#homeLower'), {notify});
    return root.querySelector('#homeMetrics');
  }

  window.HomePage = {mount};
}());
