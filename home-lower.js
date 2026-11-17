(function () {
  'use strict';

  const assets = './assets/home/';
  const diagnosis = '近1日经营整体平稳，支付金额−2.5%，商详访问量−5.7%，退货订单数−43.8%，履约端表现良好。流量小幅回落主要受付费推广渠道流量下滑拖累，品牌新客收藏占比0.2% ↑ 基本持平，经营层面没有显著异动，可持续观察。';
  const suggestions = [
    { title: '出价赢￥3000打榜赛奖励', text: '您已报名「上新打榜赛」，按类目要求完成上新出价即可参与排名，最高可获得￥3000激励', action: '去参与' },
    { title: '12个商品可发布蓝 V 内容，提升成交转化', text: '「秋冬高腰阔腿休闲裤」等12个商品可发布品牌蓝 V 内容，超70%可入选穿搭精选，有助于提升品牌曝光和购买转化', action: '去发布', product: 1, extra: 11 },
    { title: '10个商品可报名超级单品，获取大促曝光', text: '「英式加厚直筒休闲裤」等10个商品符合「大促超级单品」报名条件，报名后可获取大促核心流量资源位曝光机会', action: '去报名', product: 2, extra: 9 },
    { title: '10个商品可设置新客促销价，提升首单转化', text: '「英式加厚直筒休闲裤」等10个商品符合「品牌新客促销价」报名条件，设置新客专属价有助于提升新客首单转化', action: '去报名', product: 2, extra: 9 },
    { title: '1个新品可投放引力，加速新品动销', text: '「宽松水洗弯刀牛仔裤」点击转化率优于同行均值，投放「引力」可帮助新品更快积累初始销量', action: '去投放', product: 3 },
    { title: '12个商品穿搭精选不足 9 篇，补充获取自然流量', text: '「日常米白色直筒裤」等12个商品穿搭精选不足 9 篇，铺设穿搭精选有助于获取更多自然流量推荐', action: '去发布', product: 4, extra: 11 },
    { title: '3个新品符合流量扶持条件', text: '完成指定任务后，可获得新品的搜索和频道流量扶持', action: '查看任务', product: 5, extra: 2 },
    { title: '1个商品可报名降价享营销权益', text: '报名后可获得促销标签，并有机会被推荐到更多活动资源位', action: '去报名', product: 6 },
    { title: '6个主推商品可参与平台活动', text: '根据库存和上新计划选择适合的商品，提前报名并准备大促素材', action: '去报名', product: 1, extra: 5 }
  ];

  function productImage(number) {
    return `<img class="home-lower-product" src="${assets}product-${number}.jpg" alt="" loading="lazy" width="50" height="50">`;
  }

  function imageList(numbers) {
    return `<div class="home-lower-image-list">${numbers.map(productImage).join('')}</div>`;
  }

  function actionButton(label, action = label, extraClass = '') {
    return `<button class="home-lower-button ${extraClass}" type="button" data-home-lower-action="${action}">${label}</button>`;
  }

  function moreButton(action) {
    return `<button class="home-lower-more" type="button" data-home-lower-action="${action}">更多<i aria-hidden="true"></i></button>`;
  }

  function suggestionCard(suggestion, index) {
    const thumbnail = suggestion.product
      ? productImage(suggestion.product)
      : `<img class="home-lower-product home-lower-contest" src="${assets}contest.jpg" alt="" loading="lazy" width="50" height="50">`;
    return `<article class="home-lower-suggestion" ${index >= 6 ? 'data-home-lower-extra hidden' : ''}>
      <button type="button" class="home-lower-dismiss" data-home-lower-dismiss aria-label="关闭建议：${suggestion.title}"></button>
      <div class="home-lower-suggestion-copy">
        <h3><span class="home-lower-tag">机会</span>${suggestion.title}</h3>
        <p>${suggestion.text}</p>
      </div>
      <div class="home-lower-suggestion-link">
        <div class="home-lower-thumb">${thumbnail}${suggestion.extra ? `<span>+${suggestion.extra}</span>` : ''}</div>
        ${actionButton(suggestion.action)}
      </div>
    </article>`;
  }

  function promoCard(title, product, name, reason, help = '') {
    return `<article class="home-lower-promo-card">
      <div class="home-lower-heading">
        <h3>${title}${help ? `<span class="home-lower-help" title="${help}" aria-label="${help}">?</span>` : ''}</h3>
        ${moreButton(title)}
      </div>
      <div class="home-lower-promo-product">${productImage(product)}
        <div><strong>${name}</strong><p>${reason}</p></div>
        ${actionButton('去推广', title + ' · 去推广', 'home-lower-button-muted')}
      </div>
    </article>`;
  }

  function mount(root, { notify = () => {}, onAnalyze } = {}) {
    root.classList.add('home-lower');
    root.innerHTML = `
      <section class="home-lower-panel home-lower-recommendations" aria-labelledby="home-suggestions-label">
        <h2 id="home-suggestions-label">经营建议</h2>
        <button class="home-lower-diagnosis" type="button" data-home-lower-diagnosis>
          <span class="home-lower-diagnosis-label"><i aria-hidden="true">Ai</i>经营诊断</span>
          <span class="home-lower-diagnosis-copy">${diagnosis}</span>
          <i class="home-lower-chevron" aria-hidden="true"></i>
        </button>
        <div class="home-lower-suggestions" id="home-suggestions-list">
          ${suggestions.map(suggestionCard).join('')}
        </div>
        <button class="home-lower-expand" type="button" aria-expanded="false" aria-controls="home-suggestions-list" data-home-lower-expand>
          <span>展开更多经营建议</span><i aria-hidden="true"></i>
        </button>
      </section>

      <div class="home-lower-columns">
        <section class="home-lower-panel" aria-labelledby="home-promotion-label">
          <h2 id="home-promotion-label">付费推广</h2>
          <div class="home-lower-promos">
            ${promoCard('得物推', 1, '秋冬加厚高腰阔腿休闲裤', '消费者种草意愿强', '推广商品或品牌内容')}
            ${promoCard('引力投放', 2, '英式加厚直筒休闲裤', '消费者种草意愿强')}
          </div>
        </section>
        <section class="home-lower-panel" aria-labelledby="home-campaigns-label">
          <div class="home-lower-heading">
            <h2 id="home-campaigns-label">平台活动</h2>
            ${moreButton('平台活动')}
          </div>
          <article class="home-lower-campaign">
            <div class="home-lower-campaign-info">
              <h3><span>平台大促</span> · 火热报名中</h3>
              <p>流量狂欢，订单爆发！迅速报名，抢占先机！</p>
              ${actionButton('立即报名', '平台大促 · 立即报名', 'home-lower-button-primary')}
            </div>
            <div class="home-lower-campaign-products">
              <p>报名时间 11/07 – 12/11&nbsp; | &nbsp;活动时间 11/12 – 12/11</p>
              ${imageList([1, 2, 3, 4, 5, 6])}
            </div>
          </article>
        </section>
      </div>

      <section class="home-lower-panel" aria-labelledby="home-competition-label">
        <h2 id="home-competition-label">商品竞争力</h2>
        <div class="home-lower-three">
          <article class="home-lower-detail-card">
            <div class="home-lower-heading"><h3>新品流量扶持</h3>${moreButton('新品流量扶持')}</div>
            <p>完成任务即可获得 <strong>平台流量扶持</strong></p>
            <ul class="home-lower-task-list"><li>搜索新品流量扶持</li><li>加入新品频道</li><li>新品热销标签</li><li>加入商品榜</li></ul>
          </article>
          <article class="home-lower-detail-card">
            <div class="home-lower-heading"><h3>降价享营销权益</h3>${actionButton('立即参与')}</div>
            <p><strong>1</strong>件商品可报名 · <strong>185</strong>件商品已报名 · <strong>16</strong>个商品待处理</p>
            ${imageList([2, 3, 4, 5])}
          </article>
          <article class="home-lower-detail-card">
            <div class="home-lower-heading"><h3>铺设穿搭精选</h3>${moreButton('铺设穿搭精选')}</div>
            <p>平均每新增1篇，商详转化率<strong>+4%</strong></p>
            ${imageList([1, 3, 4, 6])}
          </article>
        </div>
      </section>

      <section class="home-lower-panel" aria-labelledby="home-opportunity-label">
        <h2 id="home-opportunity-label">商机推荐</h2>
        <div class="home-lower-columns">
          <article class="home-lower-detail-card">
            <div class="home-lower-heading"><h3>11月品类日历洞察</h3>${moreButton('11月品类日历洞察')}</div>
            <p><strong>冬上新</strong>　针织衫、大衣</p><p><strong>平季品类</strong>　休闲裤、女装阔腿裤</p>
          </article>
          <article class="home-lower-detail-card">
            <div class="home-lower-heading"><h3>全网趋势解读</h3>${moreButton('全网趋势解读')}</div>
            <p><strong>女装棉麻休闲裤</strong>　<span class="home-lower-tag">趋势上升</span></p>
            <p><strong>女式弯刀版型牛仔裤</strong>　<span class="home-lower-tag">热度上升</span></p>
          </article>
        </div>
      </section>`;

    const expand = root.querySelector('[data-home-lower-expand]');
    const extraCards = root.querySelectorAll('[data-home-lower-extra]');
    expand.addEventListener('click', () => {
      const opening = expand.getAttribute('aria-expanded') === 'false';
      expand.setAttribute('aria-expanded', String(opening));
      expand.querySelector('span').textContent = opening ? '收起经营建议' : '展开更多经营建议';
      extraCards.forEach(card => { card.hidden = !opening; });
    });
    root.querySelectorAll('[data-home-lower-dismiss]').forEach(button => {
      button.addEventListener('click', () => {
        button.closest('.home-lower-suggestion').remove();
        expand.focus();
      });
    });
    root.querySelectorAll('[data-home-lower-action]').forEach(button => {
      button.addEventListener('click', () => notify(`${button.dataset.homeLowerAction}为演示入口`));
    });
    root.querySelector('[data-home-lower-diagnosis]').addEventListener('click', event => {
      if (onAnalyze) onAnalyze({ opener: event.currentTarget });
      else notify('经营诊断为演示入口');
    });
  }

  window.HomeLower = { mount };
})();
