/* VERIX 사이트 모션: GSAP ScrollSmoother로 부드러운 스크롤 + 스크롤 기반 패럴랙스.
   - 사용 라이브러리: GSAP 3.13 (gsap, ScrollTrigger, ScrollSmoother)
   - '동작 줄이기' 설정 사용자에게는 아무 효과도 적용하지 않고 기본 스크롤을 유지합니다. */
(function () {
  if (!window.gsap || !window.ScrollTrigger || !window.ScrollSmoother) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var hasSplit = !!window.SplitText;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  if (hasSplit) gsap.registerPlugin(SplitText);
  document.documentElement.classList.add('has-smoother');

  // 넓고 충분히 높은 화면: 섹션 하나가 화면 한 장 (CSS의 같은 조건과 짝). 섹션 안에 헤더 높이만큼 여백이 있으므로 앵커는 맨 위에 맞춤
  var pageMode = window.matchMedia('(min-width: 961px) and (min-height: 700px)').matches;
  var HEADER = pageMode ? 0 : 68;
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return gsap.utils.toArray(s, root); };
  var cols = window.matchMedia('(min-width: 961px)').matches ? 4
           : window.matchMedia('(min-width: 601px)').matches ? 2 : 1;

  /* ---------- 1. 카드 그리드: 열마다 다른 지연(lag)으로 패럴랙스 ---------- */
  function lagGrid(selector, perRow, step) {
    var n = Math.min(perRow, cols);
    $$(selector).forEach(function (el, i) {
      el.setAttribute('data-lag', (0.06 + (i % n) * step).toFixed(2));
    });
  }
  lagGrid('.svc', 2, 0.1);
  lagGrid('.psteps .step', 2, 0.06);
  lagGrid('.metric', 4, 0.05);
  lagGrid('.three > .card, .tone-grid > .card', 3, 0.07);
  lagGrid('.swatches > .sw', 6, 0.04);

  /* ---------- 2. ScrollSmoother ---------- */
  var smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.2,          // 스크롤이 따라오는 시간(초)
    effects: true,        // data-speed / data-lag 사용
    smoothTouch: 0.1
  });

  // 페이지 안 링크(#services 등)는 고정 헤더 높이만큼 띄워서 부드럽게 이동.
  // 고정(pin) 구간이 있으면 요소 위치만으로는 틀어지므로, 섹션마다 ScrollTrigger로 정확한 스크롤 위치를 계산해 둠
  var anchorST = {};
  function anchorPos(id) {
    var st = anchorST[id];
    if (st) return st.start;
    var el = document.getElementById(id);
    return el ? smoother.offset(el, 'top ' + HEADER + 'px') : null;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var pos = id && anchorPos(id);
    if (pos == null || pos === '') return;
    e.preventDefault();
    smoother.scrollTo(pos, true);
    history.replaceState(null, '', '#' + id);
  });

  /* ---------- 3. 히어로: 첫 등장 + 스크롤 패럴랙스 ---------- */
  var hero = $('.hero') || $('.guide-hero');
  if (hero) {
    var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 1 } });
    if (document.getElementById('cx-loader')) {
      // 로딩 로고가 헤더 로고 자리로 날아와 앉으므로: 헤더는 제자리에서 나타나고, 헤더 로고는 착지 순간에 교대
      intro.from('.site-header', { autoAlpha: 0, duration: 0.6 }, 0);
      gsap.set('.site-header .logo svg', { autoAlpha: 0 });
    } else {
      intro.from('.site-header', { yPercent: -100, duration: 0.8 }, 0);
    }
    var bigWord = $('.hero-word', hero);
    if (bigWord && hasSplit) {
      // 거대한 단어: 글자마다 아래에서 밀려 올라옴
      var bw = new SplitText(bigWord, { type: 'chars', mask: 'chars' });
      intro.from(bw.chars, { yPercent: 105, duration: 1.1, ease: 'power4.out', stagger: 0.05 }, 0.15)
           .from($$('.hero-stats > div, .hero-sub, .hero-name, .lead, .cta, .scroll-down, .hero-rail', hero), { y: 30, autoAlpha: 0, stagger: 0.08 }, 0.45);
    } else {
      intro.from($$('.eyebrow, h1, .lead, .cta, .toc a', hero), { y: 40, autoAlpha: 0, stagger: 0.09 }, 0.15);
    }

    // 히어로 인물 사진: 살짝 크게 시작해 제자리로 (부드럽게 드러남)
    var visual = $('.hero-visual', hero);
    if (visual) intro.from(visual, { autoAlpha: 0, scale: 1.06, transformOrigin: '70% 30%', duration: 1.8, ease: 'power2.out' }, 0.05);

    // 로딩 화면이 걷힐 때 시작 (로딩 화면이 없으면 바로 시작)
    var root = document.documentElement;
    if (root.classList.contains('cx-loading')) {
      var mo = new MutationObserver(function () {
        if (!root.classList.contains('cx-loading')) {
          mo.disconnect();
          // 로딩 중엔 스크롤바가 없다가 생기면서 화면 폭이 바뀌므로, 위치를 다시 계산
          ScrollTrigger.refresh();
          intro.play();
        }
      });
      mo.observe(root, { attributes: true, attributeFilter: ['class'] });
      setTimeout(function () { mo.disconnect(); if (!intro.isActive() && intro.progress() === 0) intro.play(); }, 11000);
    } else {
      intro.play();
    }

    // 스크롤 패럴랙스 (고정 없이): 배경 그리드는 느리게, 글은 위로 올라가며 흐려지고, 사진은 한 박자 늦게
    var scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    if ($('.grid-bg', hero)) gsap.to($('.grid-bg', hero), { yPercent: 35, ease: 'none', scrollTrigger: scrub });
    gsap.to($('.hero-copy', hero) || $('.wrap', hero), { y: -90, autoAlpha: 0.2, ease: 'none', scrollTrigger: scrub });
    if (visual && cols === 4) gsap.to(visual, { y: 90, ease: 'none', scrollTrigger: scrub });
  }

  /* ---------- 3-1. 검증 스캐너 ('VERIX가 하는 일' 섹션)
     화면에 들어오면 → 화면들이 프레임 안으로 들어오고 → 스캔 선이 훑으며 이슈 핀이 꽂히고
     → 저절로 하나씩 고쳐진 뒤 VERIFIED 도장. '다시 보기'로 처음부터 재생 ---------- */
  var scan = $('.scan');
  if (scan) {
    var scanTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 1 } });
    var scrs = $$('.scr', scan), pins = $$('.pin', scan), line = $('.scan-line', scan);
    var foundEl = $('.scan-found', scan), fixedEl = $('.scan-fixed', scan), labelEl = $('.scan-label', scan);
    var stamp = $('.scan-stamp', scan);
    pins.forEach(function (p) {
      var s = document.createElement('span'); s.className = 'strike'; $('.chip', p).appendChild(s);
    });

    scanTl.from(scrs, { y: 70, autoAlpha: 0, rotationX: -28, transformPerspective: 900, duration: 1, stagger: 0.12 }, 0)
          .from($('.scan-status', scan), { autoAlpha: 0, y: 10, duration: 0.6 }, 0.4);
    var SWEEP_AT = 0.9, SWEEP = 1.6;
    scanTl.fromTo(line, { top: '0%', autoAlpha: 1 }, { top: '100%', duration: SWEEP, ease: 'none' }, SWEEP_AT)
          .to(line, { autoAlpha: 0, duration: 0.3 }, SWEEP_AT + SWEEP);
    // 스캔 선이 핀 높이를 지나는 순간 핀이 튀어나옴
    pins.forEach(function (p) {
      var at = SWEEP_AT + SWEEP * (+p.dataset.y / 100);
      scanTl.from(p, {
        scale: 0, autoAlpha: 0, duration: 0.45, ease: 'back.out(2.2)',
        transformOrigin: p.classList.contains('left') ? 'calc(100% - 7px) 50%' : '7px 50%'
      }, at)
      .call(function () { foundEl.textContent = +foundEl.textContent + 1; }, null, at);
    });
    scanTl.call(function () { labelEl.textContent = 'ISSUES FOUND'; }, null, SWEEP_AT + SWEEP + 0.2);

      /* 3-2. 스캔이 끝나면 저절로 이슈가 하나씩 고쳐지고(핀은 민트 체크 + 취소선, 화면은 수정된 모습) 마지막에 VERIFIED 도장.
              스크롤을 붙잡지 않고 시간 흐름으로 재생되며, '다시 보기'로 언제든 다시 볼 수 있음 */
      var fixTl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      var fixAt = [];
      pins.forEach(function (p, i) {
        var at = 1 + i; // 처음 1칸은 이슈를 보여주는 대기 구간
        fixAt.push(at + 0.2);
        var fix = $(p.dataset.fix, scan);
        fixTl.to($('.dot', p), { backgroundColor: '#19E3B1', boxShadow: '0 0 0 4px rgba(25,227,177,.3)', duration: 0.4 }, at)
             .to($('.strike', p), { scaleX: 1, duration: 0.4 }, at)
             .to($('.chip', p), { opacity: 0.55, duration: 0.4 }, at + 0.2)
             .fromTo(fix, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }, at);
      });
      var endAt = pins.length + 1;
      fixTl.to($$('.dot, .chip', scan), { autoAlpha: 0, duration: 0.5, stagger: 0.04 }, endAt)
           .fromTo(stamp, { opacity: 0, scale: 1.9, rotation: -4 }, { opacity: 1, scale: 1, rotation: -10, duration: 0.6, ease: 'back.out(2.5)' }, endAt + 0.3)
;

      function onFixUpdate() {
        var t = fixTl.time(), n = fixAt.filter(function (a) { return t >= a; }).length;
        fixedEl.textContent = n;
        if (t >= endAt + 0.3) labelEl.textContent = 'VERIFIED ✓';
        else if (n > 0) labelEl.textContent = 'FIXING…';
        else if (+foundEl.textContent === pins.length) labelEl.textContent = 'ISSUES FOUND';
      }
    fixTl.eventCallback('onUpdate', onFixUpdate);
    // 스캔이 끝나고 1초 뒤 저절로 수정 시작
    scanTl.call(function () { fixTl.play(0); }, null, SWEEP_AT + SWEEP + 1);

    // 화면에 들어오면 한 번 재생
    ScrollTrigger.create({ trigger: scan, start: 'top 75%', once: true, onEnter: function () { scanTl.play(); } });

    // 다시 보기: 스캔부터 처음으로
    var replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'scan-replay';
    replay.textContent = '↻ 다시 보기';
    $('.scan-status', scan).appendChild(replay);
    replay.addEventListener('click', function () {
      fixTl.pause(0);
      foundEl.textContent = '0'; fixedEl.textContent = '0'; labelEl.textContent = 'SCANNING…';
      scanTl.restart();
    });
  }

  /* ---------- 4. 섹션 제목: 제목은 줄 단위로 아래에서 굴러 올라오고, 나머지는 차례로 등장 ---------- */
  $$('.sec-head').forEach(function (head) {
    var title = hasSplit && $('h2', head);
    var rest = $$(head.children).filter(function (el) { return el !== title; });
    gsap.from(rest, {
      y: 44, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: head, start: 'top 85%' }
    });
    if (title) {
      SplitText.create(title, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.12,
            scrollTrigger: { trigger: head, start: 'top 85%' }
          });
        }
      });
    }
  });

  /* ---------- 4-1. 글자 롤링: 기존 글자는 위로, 새 글자는 아래에서 (슬롯머신처럼) ---------- */
  function rollText(el, text, dir) {
    // 빠르게 넘길 때 아직 빠져나가는 중인 글자가 쌓이지 않도록, 가장 최근 것만 남기고 정리
    var all = $$('.r-cur', el);
    var old = all[all.length - 1];
    all.slice(0, -1).forEach(function (e) { gsap.killTweensOf(e.children); e.remove(); });
    if (old) gsap.set(old, { position: 'relative' });
    if (old && old.textContent === text) return;
    var next = document.createElement('span');
    next.className = 'r-cur';
    next.textContent = text;
    el.appendChild(next);
    gsap.set(next, { position: 'absolute', left: 0, top: 0 });
    var sn = new SplitText(next, { type: 'chars' });
    // 글자가 많아도 전체가 0.3초 안에 시작되도록 간격을 줄임 (긴 이름도 빨리 끝나게)
    var gap = function (n) { return Math.min(0.05, 0.3 / Math.max(n, 1)); };
    gsap.fromTo(sn.chars, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.6, stagger: gap(sn.chars.length), ease: 'power3.out' });
    if (!old) return;
    gsap.killTweensOf(old);
    var so = new SplitText(old, { type: 'chars' });
    gsap.to(so.chars, {
      yPercent: -110 * dir, duration: 0.6, stagger: gap(so.chars.length), ease: 'power3.out',
      onComplete: function () { old.remove(); gsap.set(next, { position: 'relative' }); }
    });
  }

  var pad2 = function (n) { return String(n).padStart(2, '0'); };

  /* ---------- 4-2. 자동 넘김 슬라이더 공통 장치 (스크롤을 붙잡지 않음)
     - 화면에 보이는 동안만 일정 간격으로 다음 장으로 넘어감
     - 마우스를 올리거나 버튼·키보드로 조작하면 잠시 멈춤
     - ‹ › 버튼, 재생/일시정지 버튼, 좌우 방향키 지원 ---------- */
  function autoSlider(section, count, go, opts) {
    var current = 0, playing = true, inView = false, hover = false, timer = null, holdUntil = 0;
    var labels = opts.labels;
    var ctl = document.createElement('div');
    ctl.className = 'ctl';
    ctl.innerHTML = '<button type="button" class="ctl-btn" data-d="-1" aria-label="이전 ' + labels.unit + '">‹</button>' +
                    '<button type="button" class="ctl-play" aria-label="자동 넘김 일시정지">❚❚</button>' +
                    '<button type="button" class="ctl-btn" data-d="1" aria-label="다음 ' + labels.unit + '">›</button>' +
                    '<span class="ctl-bar" aria-hidden="true"><i></i></span>';
    opts.mount.appendChild(ctl);
    var bar = $('.ctl-bar i', ctl), playBtn = $('.ctl-play', ctl);
    var barTween = null;

    function move(to, dir) {
      to = (to + count) % count;
      if (to === current) return;
      go(to, current, dir || (to > current ? 1 : -1));
      current = to;
      schedule();
    }
    function schedule() {
      if (timer) timer.kill();
      if (barTween) barTween.kill();
      gsap.set(bar, { scaleX: 0 });
      if (!playing || !inView || hover) return;
      var wait = Math.max(opts.interval, (holdUntil - Date.now()) / 1000);
      barTween = gsap.to(bar, { scaleX: 1, duration: wait, ease: 'none' });
      timer = gsap.delayedCall(wait, function () { move(current + 1, 1); });
    }
    function userAct() { holdUntil = Date.now() + 8000; }

    $$('.ctl-btn', ctl).forEach(function (b) {
      b.addEventListener('click', function () { userAct(); move(current + (+b.dataset.d), +b.dataset.d); });
    });
    playBtn.addEventListener('click', function () {
      playing = !playing;
      playBtn.textContent = playing ? '❚❚' : '▶';
      playBtn.setAttribute('aria-label', playing ? '자동 넘김 일시정지' : '자동 넘김 재생');
      schedule();
    });
    section.addEventListener('pointerenter', function () { hover = true; schedule(); });
    section.addEventListener('pointerleave', function () { hover = false; schedule(); });
    section.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      userAct(); move(current + (e.key === 'ArrowRight' ? 1 : -1));
    });
    ScrollTrigger.create({
      trigger: section, start: 'top 70%', end: 'bottom 30%',
      onToggle: function (self) { inView = self.isActive; schedule(); }
    });
    return { goTo: function (i) { userAct(); move(i); } };
  }

  /* ---------- 4-4. 연간 업무: 월 이름이 큰 원호(휠)를 따라 회전 ---------- */
  var annual = $('#annual');
  var months = annual ? $$('.year-list li', annual) : [];
  if (hasSplit && months.length > 1) {
    annual.classList.add('is-wheel');
    var N = months.length;

    // 가운데 달에 붙는 태그
    months.forEach(function (li) {
      var t = document.createElement('span');
      t.className = 'yr-tags';
      [li.dataset.tag, li.dataset.area].forEach(function (txt) {
        var s = document.createElement('span'); s.textContent = txt; t.appendChild(s);
      });
      li.appendChild(t);
    });

    // 오른쪽(휴대폰은 아래) 상세 패널
    var det = document.createElement('div');
    det.className = 'yr-detail';
    det.innerHTML = '<div class="yr-no">N°<span class="roll" id="yr-num"><span class="r-cur">01</span></span><em>/ ' + pad2(N) + '</em></div>' +
                    '<span class="yr-area"></span><h3></h3><p></p>';
    $('.annual-layout', annual).appendChild(det);
    var yrNum = $('#yr-num', det), yrArea = $('.yr-area', det), yrTitle = $('h3', det), yrText = $('p', det);

    // 휠 크기: 화면 높이에 맞춰 반지름과 간격을 계산
    var geo = {};
    function measureWheel() {
      var h = annual.clientHeight, w = annual.clientWidth, mobile = w < 761;
      geo.R = mobile ? 560 : Math.min(1100, h * 1.2);
      geo.step = (mobile ? 58 : Math.max(66, h * 0.1)) / geo.R;       // 항목 사이 각도(라디안)
      geo.cx = (mobile ? 16 : Math.max(24, (w - 1180) / 2 + 24)) - geo.R; // 가운데 항목이 왼쪽 여백에 오도록
      geo.cy = mobile ? h * 0.4 : h / 2;
    }
    function layoutWheel(p) {
      months.forEach(function (li, i) {
        var a = (i - p) * geo.step, d = Math.abs(i - p);
        gsap.set(li, {
          x: geo.cx + geo.R * Math.cos(a), y: geo.cy + geo.R * Math.sin(a), yPercent: -50,
          rotation: a * 180 / Math.PI,
          autoAlpha: Math.max(0, 1 - d * 0.17), scale: 1 - Math.min(d, 5) * 0.04
        });
      });
    }
    var activeMonth = -1;
    function setMonth(idx, dir) {
      if (idx === activeMonth) return;
      var first = activeMonth < 0;
      activeMonth = idx;
      months.forEach(function (li, k) { li.classList.toggle('on', k === idx); });
      var li = months[idx];
      if (!first) rollText(yrNum, pad2(idx + 1), dir);
      yrArea.textContent = li.dataset.area + ' · ' + li.dataset.tag;
      yrTitle.textContent = $('b', li).textContent;
      yrText.textContent = $('p', li).textContent;
      if (!first) gsap.fromTo([yrArea, yrTitle, yrText], { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', overwrite: true });
    }
    measureWheel(); layoutWheel(0); setMonth(0, 1);

    // 휠 회전: 현재 위치(wheel.p)에서 목표 달까지 부드럽게 돌림 (12월 → 1월은 거꾸로 감아 돌아옴)
    var wheel = { p: 0 };
    var wheelSlider = autoSlider(annual, N, function (to, from, dir) {
      gsap.to(wheel, {
        p: to, duration: Math.min(1.4, 0.6 + 0.07 * Math.abs(to - from)), ease: 'power3.inOut', overwrite: true,
        onUpdate: function () { layoutWheel(wheel.p); setMonth(Math.round(wheel.p), dir); }
      });
    }, { interval: 3.2, mount: det, labels: { unit: '달' } });
    window.addEventListener('resize', function () { measureWheel(); layoutWheel(wheel.p); });
    ScrollTrigger.addEventListener('refresh', function () { measureWheel(); layoutWheel(wheel.p); });

    // 월을 누르면 그 달로 이동
    months.forEach(function (li, i) {
      li.addEventListener('click', function () { wheelSlider.goTo(i); });
    });
  }

  /* ---------- 4-5. 셀원 소개: 가운데 큰 카드가 한 장씩 넘어가고 주변 카드가 떠다님 ---------- */
  var teamSec = $('#team');
  var members = teamSec ? $$('.member', teamSec) : [];
  if (hasSplit && members.length > 1) {
    teamSec.classList.add('is-slider');
    var AREA_COLOR = { 'RELEASE GATE': '#3D5AFE', 'FIT FOR CONTEXT': '#19E3B1', 'AI × QA': '#A78BFA', 'LEVEL UP': '#5AC8FA' };
    var people = members.map(function (m) {
      var img = $('.avatar img', m);
      return {
        ini: $('.avatar', m).textContent.trim(), photo: img ? img.getAttribute('src') : '',
        name: $('h3', m).textContent, kr: $('.kr', m).textContent,
        role: $('.role', m).textContent, desc: $('p', m).textContent,
        area: m.dataset.area || '', c: AREA_COLOR[m.dataset.area] || '#3D5AFE'
      };
    });
    var M = people.length;
    var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    var tmStage = el('div', 'tm-stage');

    // 12명 전원을 원형 사진으로 배치 (넓은 화면: 가운데 카드 양옆 둥근 호 / 휴대폰: 이름 아래 6×2 격자)
    // 누르면 그 사람이 가운데 카드로 나옴
    var ring = el('div', 'tm-ring');
    ring.setAttribute('role', 'group');
    ring.setAttribute('aria-label', '셀원 선택');
    var avatars = people.map(function (p, i) {
      var b = el('button', 'tm-av');
      b.type = 'button';
      b.setAttribute('aria-label', p.name + ' (' + p.kr + ') 보기');
      b.style.setProperty('--c', p.c);
      if (p.photo) { var im = el('img'); im.src = p.photo; im.alt = ''; im.decoding = 'async'; b.appendChild(im); }
      else b.textContent = p.ini;
      ring.appendChild(b);
      return b;
    });

    var center = el('div', 'tm-center');
    var tmDeck = el('div', 'tm-deck');
    people.forEach(function (p) {
      var c = el('div', 'tm-card');
      c.style.setProperty('--c', p.c);
      if (p.photo) {
        var ph = el('img', 'photo');
        ph.src = p.photo; ph.alt = ''; ph.decoding = 'async';
        c.appendChild(ph);
      }
      c.appendChild(el('span', 'area', p.area));
      c.appendChild(el('span', 'role', p.role));
      tmDeck.appendChild(c);
    });
    tmDeck.setAttribute('aria-hidden', 'true'); // 사진 카드는 장식, 정보는 아래 tm-info가 읽힘
    var info = el('div', 'tm-info');
    info.setAttribute('aria-live', 'polite');
    info.innerHTML = '<div class="tm-no">N°<span class="roll" id="tm-num"><span class="r-cur">01</span></span><span>/ ' + pad2(M) + '</span></div>' +
                     '<div class="tm-name roll" id="tm-name"><span class="r-cur"></span></div>';
    var tmKr = el('div', 'tm-kr'), tmTags = el('div', 'tm-tags'), tmDesc = el('p', 'tm-desc');
    info.appendChild(tmKr); info.appendChild(tmTags); info.appendChild(tmDesc);
    center.appendChild(tmDeck); center.appendChild(info);
    tmStage.appendChild(ring); tmStage.appendChild(center);
    $('.wrap', teamSec).appendChild(tmStage);

    var tmCards = $$('.tm-card', tmStage);
    var tmNum = $('#tm-num'), tmName = $('#tm-name');
    gsap.set(tmCards.slice(1), { autoAlpha: 0, xPercent: 80, rotation: 12, scale: 0.85 });

    // 카드: 왼쪽으로 기울며 빠지고, 다음 카드가 오른쪽에서 세워지며 들어옴
    var tmTl = gsap.timeline({ defaults: { ease: 'none', duration: 1 } });
    for (var j = 0; j < M - 1; j++) {
      tmTl.to(tmCards[j], { xPercent: -80, rotation: -12, scale: 0.85, autoAlpha: 0 }, j)
          .to(tmCards[j + 1], { xPercent: 0, rotation: 0, scale: 1, autoAlpha: 1 }, j);
    }

    // 원형 사진 배치: 앞 6명은 왼쪽 호(위→아래), 뒤 6명은 오른쪽 호(위→아래)
    function layoutRing() {
      var flat = window.innerWidth < 761;
      ring.classList.toggle('flat', flat);
      if (flat) {
        if (ring.parentNode !== center) center.appendChild(ring);
        gsap.set(avatars, { clearProps: 'x,y' });
        return;
      }
      if (ring.parentNode !== tmStage) tmStage.insertBefore(ring, center);
      var st = tmStage.getBoundingClientRect(), dk = tmDeck.getBoundingClientRect();
      var size = avatars[0].offsetWidth;
      var cx = st.width / 2, cy = (dk.top + dk.height / 2) - st.top + 60;
      var rx = Math.min(st.width * 0.4, 560), ry = Math.min(st.height * 0.36, 300);
      var half = Math.ceil(M / 2);
      // 섹션 제목 영역(무대 기준 좌표) — 이 아래로만 사진을 놓음
      var head = $('.sec-head', teamSec).getBoundingClientRect();
      var headRight = head.right - st.left + 12, headBottom = head.bottom - st.top + 14;
      function place(ryNow, shift) {
        return avatars.map(function (b, i) {
          var left = i < half, k = left ? i : i - half, n = left ? half : M - half;
          var t = n > 1 ? k / (n - 1) : 0.5;
          var deg = left ? 222 - t * 84 : -42 + t * 84; // 위·아래 끝을 덜 올려서 제목·소개 글과 겹치지 않게
          var a = deg * Math.PI / 180;
          return { x: cx + rx * Math.cos(a) - size / 2, y: cy + shift + ryNow * Math.sin(a) - size / 2 };
        });
      }
      var pos = place(ry, 0);
      // 제목과 겹치는 사진이 있으면 호 전체를 그만큼 아래로, 대신 바닥을 넘지 않게 호 높이를 줄임
      var need = 0;
      pos.forEach(function (p) { if (p.x < headRight) need = Math.max(need, headBottom - p.y); });
      if (need > 0) {
        var bottomRoom = st.height - 24 - Math.max.apply(null, pos.map(function (p) { return p.y + size; }));
        var squeeze = Math.max(0, need - bottomRoom);
        pos = place(Math.max(ry - squeeze, ry * 0.55), need - squeeze / 2);
      }
      avatars.forEach(function (b, i) { gsap.set(b, pos[i]); });
    }
    layoutRing();
    window.addEventListener('resize', layoutRing);
    ScrollTrigger.addEventListener('refresh', layoutRing);

    // 등장: 원형 사진들이 하나씩 톡톡 나타남 / 이후 사진이 제자리에서 살짝 둥실거림
    gsap.from(avatars, { scale: 0, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.05,
      scrollTrigger: { trigger: teamSec, start: 'top 70%' } });
    avatars.forEach(function (b, i) {
      var im = b.querySelector('img');
      if (im) gsap.to(im, { yPercent: -5, duration: 1.6 + (i % 4) * 0.3, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i * 0.13 });
    });

    var activeMember = -1;
    function setMember(idx, dir) {
      if (idx === activeMember) return;
      var first = activeMember < 0;
      activeMember = idx;
      var p = people[idx];
      if (first) { $('.r-cur', tmName).textContent = p.name; }
      else { rollText(tmNum, pad2(idx + 1), dir); rollText(tmName, p.name, dir); }
      tmKr.textContent = p.kr;
      tmTags.textContent = '';
      [p.role, p.area].forEach(function (t) { tmTags.appendChild(el('span', null, t)); });
      tmDesc.textContent = p.desc;
      // 지금 가운데에 있는 사람의 원형 사진 강조
      avatars.forEach(function (b, k) {
        var on = k === idx;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
      if (!first) gsap.fromTo([tmKr, tmTags, tmDesc], { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out', overwrite: true });
    }
    setMember(0, 1);
    tmTl.pause();

    // 카드 넘김: 타임라인을 해당 셀원 위치까지 재생 (주변 카드도 그만큼 떠오름)
    var teamSlider = autoSlider(teamSec, M, function (to, from, dir) {
      tmTl.tweenTo(to, { duration: Math.min(1.2, 0.55 + 0.05 * Math.abs(to - from)), ease: 'power2.inOut', overwrite: true });
      setMember(to, dir);
    }, { interval: 3.8, mount: info, labels: { unit: '셀원' } });
    // 원형 사진을 누르면 그 사람이 가운데로
    avatars.forEach(function (b, i) { b.addEventListener('click', function () { teamSlider.goTo(i); }); });
  }

  /* ---------- 4-3. 메뉴 링크: 마우스를 올리면 글자가 위로 굴러감 ---------- */
  $$('.nav a').forEach(function (a) {
    var label = a.textContent;
    a.classList.add('roll-link');
    a.innerHTML = '<span data-text="' + label.replace(/"/g, '&quot;') + '">' + label + '</span>';
  });

  /* ---------- 5. 카드류: 묶어서 순서대로 등장 (위치는 lag가 담당하므로 크기·투명도만) ---------- */
  var cards = '.svc, .step, .metric, .card, .sw, .grade, .logo-stage, .misuse > div, .type-row';
  gsap.set(cards, { autoAlpha: 0, scale: 0.94 });
  ScrollTrigger.batch(cards, {
    start: 'top 90%', once: true,
    onEnter: function (batch) {
      gsap.to(batch, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: 'auto' });
    }
  });

  /* ---------- 6. 다짐 문장: 화면에 들어오면 단어가 하나씩 진하게 채워짐 (핵심 구절은 민트로)
     스크롤 위치에 묶지 않고, 한 번 들어오면 같은 속도로 끝까지 채워짐 ---------- */
  var mf = $('.mf-text');
  if (mf && hasSplit) {
    var mfSplit = new SplitText(mf, { type: 'words', wordsClass: 'w' });
    var mfTl = gsap.timeline({ paused: true });
    mfSplit.words.forEach(function (w, i) {
      mfTl.to(w, { color: w.closest('em') ? '#0A8A66' : '#12302B', duration: 0.45, ease: 'power1.out' }, i * 0.11);
    });
    ScrollTrigger.create({ trigger: mf, start: 'top 75%', once: true, onEnter: function () { mfTl.play(); } });
    gsap.from('.mf-label', { x: -20, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.manifesto', start: 'top 80%' } });
  }

  /* ---------- 7. 품질 기준: 탭과 타임라인 ---------- */
  if ($('.std-tabs')) {
    gsap.from('.std-tabs', { y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.std-tabs', start: 'top 88%' } });
    gsap.from('#std-general .tl-box, #std-general .tl-launch', {
      y: 50, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '#std-general .timeline', start: 'top 85%' }
    });
    // 탭을 바꾸면 페이지 높이가 바뀌므로 위치 다시 계산
    $$('.std-tabs [role="tab"]').forEach(function (t) {
      t.addEventListener('click', function () { requestAnimationFrame(function () { ScrollTrigger.refresh(); }); });
    });
  }

  /* ---------- 8. 성과 숫자: 카운트업 ---------- */
  $$('.metric b').forEach(function (b) {
    var m = b.textContent.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var end = parseFloat(m[2]);
    var dec = (m[2].split('.')[1] || '').length;
    var o = { v: 0 };
    b.textContent = m[1] + (0).toFixed(dec) + m[3];
    gsap.to(o, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: b, start: 'top 90%', once: true },
      onUpdate: function () { b.textContent = m[1] + o.v.toFixed(dec) + m[3]; }
    });
  });

  /* ---------- 9. 검증 배지: 오른쪽에서 차례로 ---------- */
  if ($('.badge-list')) {
    gsap.from('.badge-item', {
      y: 40, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.badge-list', start: 'top 85%' }
    });
  }
  if ($('.badge-stage')) {
    gsap.from('.badge-stage .vbadge', {
      y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.badge-stage', start: 'top 85%' }
    });
  }

  /* ---------- 10. 마지막 CTA: 큰 심볼이 회전하며 커짐 ---------- */
  if ($('.big-mark')) {
    gsap.fromTo('.big-mark', { rotate: -18, scale: 0.8 }, {
      rotate: 18, scale: 1.2, ease: 'none',
      scrollTrigger: { trigger: '.cta-sec', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  // 웹폰트가 늦게 적용되면 높이가 바뀌므로 다시 계산
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  /* ---------- 11. 한 장씩 넘기기: 스크롤을 멈추면 진행 방향의 다음(또는 이전) 섹션 맨 위로 딱 맞춤 ----------
     화면을 붙잡지 않고, 휠 한 번에 한 섹션씩 넘어가는 프레젠테이션 방식. 넓은 화면에서만 */
  var pages = $$('main > section');
  if (pageMode && pages.length > 1) {
    // 섹션마다 '맨 위가 화면 맨 위에 닿는 지점'을 ScrollTrigger가 계산해 두게 함 (스냅할 때 읽기만 함)
    var pageST = pages.map(function (s) { return ScrollTrigger.create({ trigger: s, start: 'top top' }); });
    var restY = window.scrollY, snapping = false; // restY: 마지막으로 멈춰 있던 위치 (방향 판단 기준)
    function points() {
      var pts = pageST.map(function (t) { return t.start; });
      pts.push(ScrollTrigger.maxScroll(window)); // 맨 끝(푸터까지)
      return pts.sort(function (a, b) { return a - b; });
    }
    // 스크롤이 멈추면: 이미 섹션 맨 위면 그대로, 아니면 진행 방향의 다음(이전) 섹션 맨 위로 부드럽게 이동
    ScrollTrigger.addEventListener('scrollEnd', function () {
      var y = window.scrollY, pts = points(), i;
      if (snapping) { snapping = false; restY = y; return; }
      for (i = 0; i < pts.length; i++) if (Math.abs(pts[i] - y) < 4) { restY = y; return; }
      var down = y > restY, target = null;
      if (down) { for (i = 0; i < pts.length; i++) if (pts[i] > y) { target = pts[i]; break; } }
      else { for (i = pts.length - 1; i >= 0; i--) if (pts[i] < y) { target = pts[i]; break; } }
      if (target === null) target = down ? pts[pts.length - 1] : 0;
      snapping = true;
      restY = target;
      smoother.scrollTo(target, true);
    });
  }

  // 앵커 위치 계산용 트리거 (고정 구간들보다 나중에 계산되도록 맨 마지막에 생성)
  $$('section[id]').forEach(function (sec) {
    anchorST[sec.id] = ScrollTrigger.create({ trigger: sec, start: 'top ' + HEADER + 'px' });
  });

  // 다른 페이지에서 #앵커로 들어온 경우
  if (location.hash.length > 1 && anchorST[location.hash.slice(1)]) {
    setTimeout(function () { smoother.scrollTo(anchorPos(location.hash.slice(1)), false); }, 60);
  }
})();
