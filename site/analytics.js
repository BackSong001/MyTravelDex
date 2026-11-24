// 공개 GA4 웹 스트림 ID를 설정하면 방문자가 분석 수집을 선택할 수 있다.
(() => {
  const measurementId = '';
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;
  const button = document.querySelector('#analytics-choice');
  if (!button) return;
  const key = 'travel-site-analytics';
  let enabled = localStorage.getItem(key) === 'yes';
  function start() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {page_location:location.origin+location.pathname, page_referrer:'',allow_google_signals:false});
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id='+measurementId;
    script.async = true;
    document.head.append(script);
  }
  function update() { button.textContent = enabled ? '방문 통계 수집 동의 철회' : '선택 사항 · 방문 통계 수집에 동의'; }
  button.hidden = false; update();
  if (enabled) start();
  button.onclick = () => {
    enabled = !enabled; localStorage.setItem(key,enabled?'yes':'no');update();
    window['ga-disable-'+measurementId] = !enabled;
    if (enabled && !window.gtag) start();
  };
  document.addEventListener('click', event => {
    const a=event.target.closest('a[href]');
    if (!enabled || !a) return;
    const target=new URL(a.href).hostname;
    if (target==='mytraveldex-app.pages.dev' || target==='play.google.com')
      window.gtag('event',target==='play.google.com'?'store_download_click':'web_app_open',{placement:a.closest('header')?'header':'body',platform:target==='play.google.com'?'android':'web'});
  });
})();
