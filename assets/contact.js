/* VERIX 검증 요청서 (contact.html)
   - 편지지에 쓰는 내용이 오른쪽 접수증에 실시간으로 찍힘
   - 마우스·손가락으로 서명
   - 보내기: 편지가 접혀 날아가고, 접수증에 접수번호·회신 예정일·RECEIVED 도장이 찍힘

   ⚙ 받는 주소 설정
   정적 사이트라 서버로 직접 보낼 수 없습니다. 아래 email에 팀 메일 주소를 넣으면
   '보내기'를 눌렀을 때 작성 내용이 채워진 메일 창이 열립니다.
   비워 두면 시안 모드로 동작합니다(애니메이션만, 실제 전송 없음). */
(function () {
  var CONFIG = {
    email: ''   // 예: 'verix@company.com'
  };

  var form = document.getElementById('req-form');
  if (!form) return;
  var nameInput = form.elements.namedItem('name'); // form.name은 폼 자체의 name 속성이라 따로 잡아 둠
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var byId = function (id) { return document.getElementById(id); };
  var hasG = !!window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = hasG && !reduce;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var fmt = function (d) { return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()); };

  var KIND = { release: '출시 전 검증', context: '상품·현장·과제', ai: 'AI 협업 검증', levelup: '리포트·교육', hello: '그냥 문의' };
  var today = new Date();
  byId('today').textContent = fmt(today);

  // 영업일 기준 n일 뒤 (주말 제외)
  function addBizDays(d, n) {
    d = new Date(d);
    while (n > 0) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n--; }
    return d;
  }

  /* ---------- 바코드: 문자열에서 막대 패턴을 만들어 그림 ---------- */
  var barcode = byId('rc-barcode');
  function drawBarcode(seed) {
    var h = 0, bars = '';
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    for (var k = 0; k < 46; k++) {
      h = (h * 1103515245 + 12345) >>> 0;
      var w = 1 + (h >>> 28) % 3, gap = 1 + (h >>> 24) % 2;
      bars += '<i style="width:' + w + 'px;margin-right:' + gap + 'px"></i>';
    }
    barcode.innerHTML = bars;
  }
  drawBarcode('VERIX');

  /* ---------- 접수증 실시간 갱신 (바뀐 칸은 아래에서 굴러 올라옴) ---------- */
  function setField(id, text) {
    var el = byId(id);
    if (el.textContent === text) return;
    el.textContent = text;
    if (animate) gsap.fromTo(el, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: 'power3.out' });
  }
  var signed = false, sent = false;
  function update() {
    if (sent) return;
    var kind = form.querySelector('input[name="kind"]:checked');
    var ptype = form.querySelector('input[name="ptype"]:checked');
    setField('rc-kind', kind ? KIND[kind.value] : '—');
    setField('rc-type', ptype ? ptype.value : '—');
    setField('rc-team', form.team.value.trim() || '—');
    setField('rc-due', form.due.value ? form.due.value.replace(/-/g, '.') : '—');
    var started = !!(kind || form.team.value || form.email.value || form.body.value || nameInput.value || signed);
    setField('rc-status', signed && nameInput.value.trim() ? '서명 완료' : started ? '작성 중' : '작성 전');
    byId('sign-state').textContent = signed ? '서명 완료' : '아직 서명 전';
    byId('sign-state').className = signed ? 'ok' : '';
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  /* ---------- 서명 패드 ---------- */
  var signBox = byId('sign'), canvas = byId('sig'), ctx = canvas.getContext('2d');
  var strokes = [], drawing = false;
  function sizeCanvas() {
    var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = '#1E2A78';
    redraw();
  }
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(function (s) {
      ctx.beginPath();
      s.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
    });
  }
  function point(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener('pointerdown', function (e) {
    drawing = true; canvas.setPointerCapture(e.pointerId);
    strokes.push([point(e)]);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var s = strokes[strokes.length - 1], p = point(e), q = s[s.length - 1];
    s.push(p);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
  });
  function endStroke() {
    if (!drawing) return;
    drawing = false;
    var total = strokes.reduce(function (n, s) { return n + s.length; }, 0);
    signed = total > 12; // 점 하나 찍은 건 서명으로 보지 않음
    signBox.classList.toggle('signed', signed);
    update();
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  $('.sign-clear', signBox).addEventListener('click', function () {
    strokes = []; signed = false; redraw(); signBox.classList.remove('signed'); update();
  });
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  /* ---------- 보내기 ---------- */
  var msg = $('.form-msg', form);
  function fail(el, text) {
    msg.textContent = text;
    el.classList.add('invalid');
    if (animate) gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, .3)' });
    var focusEl = el.matches('input, textarea') ? el : el.querySelector('input');
    if (focusEl) focusEl.focus({ preventScroll: false });
    return false;
  }
  form.addEventListener('input', function (e) { if (e.target.classList) e.target.classList.remove('invalid'); byId('f-kind').classList.remove('invalid'); msg.textContent = ''; });

  function validate() {
    if (!form.querySelector('input[name="kind"]:checked')) return fail(byId('f-kind'), '요청 종류를 골라 주세요.');
    if (!form.email.value.trim() || !form.email.checkValidity()) return fail(form.email, '회신 받을 메일 주소를 확인해 주세요.');
    if (form.body.value.trim().length < 5) return fail(form.body, '검증할 내용을 조금만 더 적어 주세요.');
    if (!nameInput.value.trim()) return fail(nameInput, '이름을 적어 주세요.');
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sent || !validate()) return;
    sent = true;
    var reply = addBizDays(today, 2);
    var no = 'VX-' + String(today.getFullYear()).slice(2) + pad(today.getMonth() + 1) + pad(today.getDate()) + '-' + String(Math.floor(100 + Math.random() * 900));
    var kind = KIND[form.querySelector('input[name="kind"]:checked').value];

    // 접수증 채우기
    sent = false; setField('rc-recv', fmt(today)); setField('rc-reply', fmt(reply)); setField('rc-status', '접수 완료'); sent = true;
    byId('rc-no').textContent = no;
    drawBarcode(no + form.email.value);
    byId('sent-no').textContent = no;
    byId('sent-reply').textContent = fmt(reply);
    var demo = !CONFIG.email;
    byId('sent-demo').style.display = demo ? 'block' : 'none';
    byId('rc-demo').style.display = demo ? 'block' : 'none';
    byId('print').style.display = 'block';

    var mail = function () {
      if (demo) return;
      var lines = [
        '[VERIX 검증 요청서] ' + no,
        '요청: ' + kind + ' / ' + form.querySelector('input[name="ptype"]:checked').value,
        '보내는 팀: ' + (form.team.value || '-'),
        '회신 받을 곳: ' + form.email.value,
        '출시 예정일: ' + (form.due.value || '-'),
        '', form.body.value, '', '— ' + nameInput.value + (signed ? ' (서명함)' : '')
      ];
      location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('[검증 요청] ' + kind + ' · ' + (form.team.value || nameInput.value) + ' · ' + no) + '&body=' + encodeURIComponent(lines.join('\n'));
    };

    var letter = form, done = byId('sent');
    function showDone() {
      letter.style.display = 'none';
      done.style.display = 'block';
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      var sm = window.ScrollSmoother && ScrollSmoother.get();
      if (sm) sm.scrollTo(0, true); else window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!animate) { showDone(); $('.rc-stamp').style.opacity = 1; mail(); return; }

    gsap.timeline({ onComplete: mail })
      // 편지를 세 번 접듯이 줄이고 → 기울며 위로 날아감
      .to(letter, { scaleY: 0.34, transformOrigin: '50% 0%', duration: 0.55, ease: 'power2.inOut' })
      .to(letter, { y: -160, x: 120, rotation: -8, scale: 0.4, autoAlpha: 0, duration: 0.7, ease: 'power3.in' })
      .add(showDone)
      .fromTo(done, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' })
      .fromTo('.rc-stamp', { scale: 2.2, opacity: 0, rotation: -4 }, { scale: 1, opacity: 1, rotation: -14, duration: 0.5, ease: 'back.out(2.5)' }, '-=0.3');
  });

  byId('again').addEventListener('click', function () { location.reload(); });
  byId('print').addEventListener('click', function () { window.print(); });

  /* ---------- 첫 등장: 편지지가 책상 위로 올라오고, 머리글이 타자 치듯 찍히고, 접수증이 인쇄되어 나옴 ---------- */
  if (animate) {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(form, { y: 140, rotation: -2.5, autoAlpha: 0, duration: 1.1 }, 0.1);
    if (window.SplitText) {
      var typed = new SplitText(form.querySelectorAll('.type'), { type: 'chars' });
      gsap.set(typed.chars, { autoAlpha: 0 });
      tl.to(typed.chars, { autoAlpha: 1, duration: 0.01, stagger: 0.028, ease: 'none' }, 0.7);
    }
    tl.from(form.querySelectorAll('.row-re, .row, .body, .closing, .sign, .name, .foot-note, .actions'), { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.06 }, 1.2)
      .from('.rc', { clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'steps(18)' }, 0.5)
      .from('.clip', { y: -40, autoAlpha: 0, duration: 0.6, ease: 'bounce.out' }, 1.7);

    // 넓은 화면: 편지를 쓰는 동안 접수증이 화면에 따라붙음
    if (window.ScrollTrigger && window.matchMedia('(min-width: 961px)').matches) {
      ScrollTrigger.create({ trigger: '.receipt', start: 'top 96px', endTrigger: '.desk-wrap', end: 'bottom bottom', pin: true, pinSpacing: false });
    }
  }
  update();
})();
