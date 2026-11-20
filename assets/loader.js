/* 첫 진입 로딩 (GSAP 필요)
   1) 퍼센트가 0→100%로 올라가는 동안 X-Check 로고가 그려짐 (짙은 대각선 → 민트 체크)
   2) 화면 가운데 창문이 열리며 화면 전체로 커지고 사이트가 드러남
   3) 그동안 로딩 로고는 헤더 왼쪽 로고 자리로 날아가 크기를 맞춰 그대로 앉음
   클릭하거나 아무 키나 누르면 바로 끝으로 건너뜀. */
(function () {
  var loader = document.getElementById('cx-loader');
  if (!loader) return;
  var root = document.documentElement;

  function finish() {
    root.classList.remove('cx-loading');
    // 로딩 로고가 착지한 순간 헤더의 진짜 로고와 교대
    var headerLogo = document.querySelector('.site-header .logo svg');
    if (headerLogo) { headerLogo.style.opacity = ''; headerLogo.style.visibility = ''; if (window.gsap) gsap.set(headerLogo, { autoAlpha: 1 }); }
    if (loader.isConnected) loader.remove();
  }

  // GSAP이 없거나 '동작 줄이기' 사용자 → 짧게 페이드만
  if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loader.style.transition = 'opacity .4s';
    requestAnimationFrame(function () { loader.style.opacity = '0'; });
    setTimeout(finish, 450);
    return;
  }

  root.classList.add('cx-loading');

  var logo = loader.querySelector('.cx-logo');
  var diag = loader.querySelector('.lg-diag');
  var check = loader.querySelector('.lg-chk');
  var win = loader.querySelector('.cx-window');
  var pct = loader.querySelector('.cx-loader__pct');
  var target = document.querySelector('.site-header .logo svg'); // 로고가 내려앉을 자리

  // 선 그리기 준비: 선 길이만큼 점선 간격을 두고 밀어 둠
  [diag, check].forEach(function (p) {
    var len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });
  gsap.set(logo, { transformOrigin: '50% 50%' });

  // 로딩 로고 → 헤더 로고까지의 이동량과 배율 (이동이 시작되는 순간에 계산)
  function toHeader(prop) {
    return function () {
      var a = logo.getBoundingClientRect(), b = target.getBoundingClientRect();
      if (prop === 'scale') return b.width / a.width;
      if (prop === 'x') return (b.left + b.width / 2) - (a.left + a.width / 2);
      return (b.top + b.height / 2) - (a.top + a.height / 2);
    };
  }

  var counter = { v: 0 };
  var tl = gsap.timeline({ onComplete: finish });

  tl.to(counter, {
      v: 100, duration: 2.3, ease: 'power2.inOut',
      onUpdate: function () { pct.textContent = Math.round(counter.v) + '%'; }
    }, 0)
    .to(diag, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.1)
    .to(check, { strokeDashoffset: 0, duration: 0.9, ease: 'power3.out' }, 1.25)
    // 다 그려지면 살짝 '톡' 하고 커졌다 돌아옴
    .to(logo, { scale: 1.1, duration: 0.18, ease: 'power2.out' }, 2.2)
    .to(logo, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 2.38)
    .to('.cx-loader__text, .cx-loader__brand', { autoAlpha: 0, y: 8, duration: 0.3 }, '+=0.1')
    // 이 순간부터 페이지 등장 애니메이션 시작 (헤더가 서서히 나타남)
    .add(function () { root.classList.remove('cx-loading'); }, '<')
    .to(win, {
      width: function () { return window.innerWidth * 1.02; },
      height: function () { return window.innerHeight * 1.02; },
      duration: 1.1, ease: 'expo.inOut'
    }, '<0.1');

  if (target) {
    tl.to(logo, { x: toHeader('x'), y: toHeader('y'), scale: toHeader('scale'), duration: 1.1, ease: 'expo.inOut' }, '<');
  } else {
    tl.to(logo, { scale: 0.4, autoAlpha: 0, duration: 0.8, ease: 'expo.inOut' }, '<');
  }

  function skip() { if (tl.progress() < 1) tl.progress(1); }
  loader.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });
})();
