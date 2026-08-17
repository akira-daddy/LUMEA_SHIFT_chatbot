/* LUMEA SHIFT – JavaScript */

// Scroll reveal
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting) e.target.classList.add('visible');
  });
},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// Header removed

// Sticky CTA
const stickyCta = document.getElementById('stickyCta');
const heroSection = document.querySelector('.hero');
const finalSection = document.querySelector('.section-final');
const stickyObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.target===heroSection && !e.isIntersecting){
      stickyCta.classList.add('visible');
    } else if(e.target===heroSection && e.isIntersecting){
      stickyCta.classList.remove('visible');
    }
    if(e.target===finalSection && e.isIntersecting){
      stickyCta.classList.remove('visible');
    } else if(e.target===finalSection && !e.isIntersecting){
      if(!heroSection.getBoundingClientRect().bottom < 0){
        stickyCta.classList.add('visible');
      }
    }
  });
},{threshold:0.1});
stickyObserver.observe(heroSection);
stickyObserver.observe(finalSection);

// FAQ toggle
function toggleFAQ(el){
  const item = el.closest('.faq-item');
  item.classList.toggle('open');
}

// Review dots
const scroll = document.getElementById('reviewsScroll');
const dots = document.querySelectorAll('#reviewDots .dot');
if(scroll){
  scroll.addEventListener('scroll',()=>{
    const idx = Math.round(scroll.scrollLeft / 276);
    dots.forEach((d,i)=>d.classList.toggle('active',i===idx));
  });
}

// Story scenes – SP=連続再生 / PC=横並び同時再生 を画面幅で切替
(function(){
  const scenes = Array.from(document.querySelectorAll('.story-scene'));
  if(!scenes.length) return;

  const mqPC = window.matchMedia('(min-width:768px)');
  let mode = null;        // 'sp' | 'pc'
  let teardown = null;    // 現モードの後始末関数

  // 全シーン停止（モード切替時の共通処理）
  function stopAllScenes(){
    scenes.forEach(s=>{
      const v = s.querySelector('video');
      if(v){ v.pause(); v.currentTime = 0; }
      s.classList.remove('playing');
    });
  }

  /* ══════════ PC：SCENE01→02→03→04 を順番に自動再生（1巡で停止） ══════════ */
  function setupPC(){
    let isRunning = false;
    let currentIdx = -1;
    let curVideo = null, curEnded = null;

    scenes.forEach(s=>{
      const v = s.querySelector('video');
      if(!v) return;
      v.removeAttribute('loop');
      v.loop = false;            // 1本ずつ順番に → ループしない
      v.muted = true;            // 自動再生のため無音（scene動画は no_voice）
      v.setAttribute('playsinline','');
    });

    function clearEnded(){
      if(curVideo && curEnded) curVideo.removeEventListener('ended', curEnded);
      curVideo = null; curEnded = null;
    }
    // 再生中以外を停止（先頭に戻す）
    function stopAll(){
      clearEnded();
      scenes.forEach(s=>{
        const v = s.querySelector('video');
        if(v){ v.pause(); v.currentTime = 0; }
        s.classList.remove('playing');
      });
    }

    function playScene(idx){
      // 04 まで再生し終えたら一旦ストップ
      if(idx >= scenes.length){
        isRunning = false; currentIdx = -1; stopAll();
        return;
      }
      currentIdx = idx;
      const scene = scenes[idx];
      const video = scene.querySelector('video');
      if(!video){ playScene(idx + 1); return; }

      // 再生対象以外はすべて停止＋先頭に戻す
      clearEnded();
      scenes.forEach((s,i)=>{
        if(i !== idx){
          const v = s.querySelector('video');
          if(v){ v.pause(); v.currentTime = 0; }
          s.classList.remove('playing');
        }
      });

      video.currentTime = 0;
      video.muted = true;
      const p = video.play();
      scene.classList.add('playing');
      if(p && p.catch) p.catch(()=>{});

      curVideo = video;
      curEnded = function(){
        scene.classList.remove('playing');
        if(isRunning) playScene(currentIdx + 1);   // 次のシーンへ
      };
      video.addEventListener('ended', curEnded, {once:true});
    }

    function startSequence(from){ isRunning = true; playScene(from || 0); }
    function stopSequence(){ isRunning = false; currentIdx = -1; stopAll(); }

    // 横並びの先頭シーンが見えたら、SCENE01から自動で連続再生（1巡のみ）
    const anchor = scenes[0];
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting && !isRunning) startSequence(0);
      });
    }, { threshold: 0.5 });
    io.observe(anchor);

    // クリックしたシーンから連続再生を再スタート
    const handlers = [];
    scenes.forEach((s, i)=>{
      const h = ()=>{ stopSequence(); startSequence(i); };
      s.addEventListener('click', h);
      handlers.push([s, h]);
    });

    return function cleanup(){
      io.disconnect();
      handlers.forEach(([s,h])=>s.removeEventListener('click', h));
      stopAll();
      isRunning = false; currentIdx = -1;
    };
  }

  /* ══════════ SP：SCENE01→04 を順番に連続再生（音声あり） ══════════ */
  function setupSP(){
    let currentIdx = -1;
    let isRunning = false;

    scenes.forEach(s=>{
      const v = s.querySelector('video');
      if(v) v.removeAttribute('loop');
    });

    // 初回インタラクションで音声ロック解除
    let audioUnlocked = false;
    function unlockAudio(){
      if(audioUnlocked) return;
      audioUnlocked = true;
      scenes.forEach(s=>{
        const v = s.querySelector('video');
        if(!v) return;
        v.muted = false;
        v.play().then(()=>{ v.pause(); v.currentTime = 0; }).catch(()=>{});
      });
    }
    const unlockEvents = ['mousemove','touchstart','click'];
    unlockEvents.forEach(ev=>document.addEventListener(ev, unlockAudio, {once:true, passive:true}));

    function stopAll(){ stopAllScenes(); }

    // ユーザーの能動スクロール検知（自動スクロールと区別）
    let programmaticScroll = false;
    let programmaticScrollTimer = null;
    function markProgrammaticScroll(){
      programmaticScroll = true;
      clearTimeout(programmaticScrollTimer);
      programmaticScrollTimer = setTimeout(()=>{ programmaticScroll = false; }, 900);
    }
    function onUserScroll(){
      if(programmaticScroll) return;
      if(isRunning) stopSequence();
    }
    window.addEventListener('scroll', onUserScroll, {passive:true});
    window.addEventListener('wheel', onUserScroll, {passive:true});
    window.addEventListener('touchmove', onUserScroll, {passive:true});

    const endedHandlers = new Map();

    function playScene(idx){
      if(idx >= scenes.length){ isRunning = false; return; }
      currentIdx = idx;
      const scene = scenes[idx];
      const video = scene.querySelector('video');
      if(!video) return;

      scenes.forEach((s,i)=>{
        if(i !== idx){
          const v = s.querySelector('video');
          if(v){ v.pause(); v.currentTime = 0; }
          s.classList.remove('playing');
        }
      });

      markProgrammaticScroll();
      scene.scrollIntoView({behavior:'smooth', block:'start'});

      video.currentTime = 0;
      video.muted = false;
      const p = video.play();
      scene.classList.add('playing');
      if(p && p.catch){
        p.catch(()=>{
          video.muted = true;
          video.play().catch(()=>{});
          scene.classList.add('playing');
        });
      }

      const onEnded = function(){
        scene.classList.remove('playing');
        if(isRunning) playScene(currentIdx + 1);
      };
      endedHandlers.set(video, onEnded);
      video.addEventListener('ended', onEnded, {once:true});
    }

    function startSequence(){ isRunning = true; playScene(0); }
    function stopSequence(){ isRunning = false; stopAll(); currentIdx = -1; }

    const scene1 = scenes[0];
    const seqObserver = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting && !isRunning) startSequence(); });
    }, { threshold: 0.5 });
    seqObserver.observe(scene1);

    const onScene1Enter = ()=>{ if(!isRunning) startSequence(); };
    scene1.addEventListener('mouseenter', onScene1Enter);

    const onScene1Click = ()=>{
      if(!isRunning){ startSequence(); }
      else {
        const v = scene1.querySelector('video');
        const isCurrent = currentIdx === 0;
        if(isCurrent && v && !v.paused){ stopSequence(); }
        else { stopSequence(); setTimeout(startSequence, 50); }
      }
    };
    scene1.addEventListener('click', onScene1Click);

    const restClicks = [];
    scenes.slice(1).forEach((scene)=>{
      const h = ()=>{
        const video = scene.querySelector('video');
        if(!video) return;
        if(video.paused){
          video.muted = false;
          video.play().catch(()=>{ video.muted = true; video.play(); });
          scene.classList.add('playing');
        } else {
          video.pause();
          scene.classList.remove('playing');
        }
      };
      scene.addEventListener('click', h);
      restClicks.push([scene, h]);
    });

    return function cleanup(){
      isRunning = false;
      seqObserver.disconnect();
      window.removeEventListener('scroll', onUserScroll);
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchmove', onUserScroll);
      unlockEvents.forEach(ev=>document.removeEventListener(ev, unlockAudio));
      scene1.removeEventListener('mouseenter', onScene1Enter);
      scene1.removeEventListener('click', onScene1Click);
      restClicks.forEach(([s,h])=>s.removeEventListener('click', h));
      endedHandlers.forEach((h,v)=>v.removeEventListener('ended', h));
    };
  }

  // モード適用（初期 & ブレークポイント跨ぎ）
  function applyMode(){
    const want = mqPC.matches ? 'pc' : 'sp';
    if(want === mode) return;
    if(teardown){ teardown(); teardown = null; }
    stopAllScenes();
    mode = want;
    teardown = (want === 'pc') ? setupPC() : setupSP();
  }
  if(mqPC.addEventListener) mqPC.addEventListener('change', applyMode);
  else if(mqPC.addListener) mqPC.addListener(applyMode);
  applyMode();
})();


// ── Hero promo video: SP=縦動画 / PC=横動画 を画面幅で出し分け ──
//    autoplay on viewport enter, hover/tap to toggle
(function(){
  const wrap  = document.getElementById('heroVideoWrap');
  const video = document.getElementById('heroPromoVideo');
  if(!wrap || !video) return;

  // SP（縦9:16）と PC（横16:9）の動画ソース
  const SRC_SP = 'images_dir/LUMEA_SHIFT_LP_movie_hero_size916_no_audio_text.mp4';
  const SRC_PC = 'images_dir/LUMEA_SHIFT_LP_movie_size43_hero_no_audio_text.mp4';
  const mqPC   = window.matchMedia('(min-width:768px)');

  video.loop  = true;
  video.muted = true;

  // 画面幅に応じて適切なソースへ差し替え（無駄な二重ロードを避ける）
  function applyHeroSource(){
    const want = mqPC.matches ? SRC_PC : SRC_SP;
    if(!video.currentSrc || !video.currentSrc.endsWith(want)){
      const wasPlaying = !video.paused;
      video.src = want;
      video.load();
      if(wasPlaying || isHeroInView()) playHero();
    }
  }
  function isHeroInView(){
    const r = wrap.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || 0);
  }
  if(mqPC.addEventListener) mqPC.addEventListener('change', applyHeroSource);
  else if(mqPC.addListener) mqPC.addListener(applyHeroSource); // 旧Safari

  function playHero(){
    const p = video.play();
    if(p && p.catch) p.catch(()=>{});
    wrap.classList.add('playing');
  }
  function pauseHero(){
    video.pause();
    wrap.classList.remove('playing');
  }

  // ビューポートに入ったら、正しいソースを適用したうえで自動再生
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ applyHeroSource(); playHero(); }
    });
  }, { threshold: 0.3 });
  observer.observe(wrap);

  // 初期ロード時点で画面幅に合うソースを適用
  applyHeroSource();

  // Desktop: mouseenter でも再生
  wrap.addEventListener('mouseenter', ()=>{
    if(video.paused) playHero();
  });

  // tap/click で再生トグル
  let isTouching = false;
  wrap.addEventListener('touchstart', ()=>{ isTouching = true; }, {passive:true});
  wrap.addEventListener('touchend', ()=>{
    if(video.paused){ playHero(); } else { pauseHero(); }
    setTimeout(()=>{ isTouching = false; }, 400);
  }, {passive:true});
  wrap.addEventListener('click', ()=>{
    if(isTouching) return;
    if(video.paused){ playHero(); } else { pauseHero(); }
  });
})();


// ══════════════════════════════════════════════════════════════
// 注文モーダル – Order Modal Controller
// ① GAS Web App URL をデプロイ後にここへ貼り付けてください
// ══════════════════════════════════════════════════════════════
(function () {
  var GAS_URL = "https://script.google.com/macros/s/AKfycbxrBgyfo7zx9e3HviZ3fxImznVO30OPnhWT2rrHopxoliDxBtmDkoVi3zancE9n10Ze2Q/exec"; // ← ここを書き換える

  // ── プラン設定 ──
  var PLANS = {
    subscription: {
      label: "定期購入 おすすめ",
      price: "初回 ¥1,980",
      priceDetail: "（2回目以降 ¥3,480）",
      summaryPlan: "定期購入（初回¥1,980）",
      summaryPrice: "¥1,980（送料無料）",
    },
    normal: {
      label: "通常購入",
      price: "¥3,980",
      priceDetail: "（税込 ＋ 送料¥550）",
      summaryPlan: "通常購入（¥3,980）",
      summaryPrice: "¥3,980 ＋ 送料¥550",
    },
  };

  // ── DOM 参照 ──
  var modal       = document.getElementById("orderModal");
  var btnClose    = document.getElementById("omClose");
  var btnDoneClose= document.getElementById("omDoneClose");
  var btnBack     = document.getElementById("omBack");
  var btnNext     = document.getElementById("omNext");
  var btnSubmit   = document.getElementById("omSubmit");
  var errorBox    = document.getElementById("omErrorBox");
  var doneScreen  = document.getElementById("omDone");
  var pages       = [
    document.getElementById("omPage1"),
    document.getElementById("omPage2"),
    document.getElementById("omPage3"),
  ];
  var steps = document.querySelectorAll(".om-step");

  var currentStep = 1; // 1〜3
  var currentPlan = "subscription";

  // ── モーダルを開く ──
  function openModal(plan) {
    currentPlan = plan || "subscription";
    currentStep = 1;

    // プランバナー更新
    var p = PLANS[currentPlan];
    document.getElementById("omPlanLabel").textContent  = p.label;
    document.getElementById("omPlanPrice").innerHTML    =
      p.price + '<small>' + p.priceDetail + '</small>';

    // サマリー更新
    document.getElementById("omSummaryPlan").querySelector("span:last-child").textContent  = p.summaryPlan;
    document.getElementById("omSummaryPrice").querySelector("span:last-child").textContent = p.summaryPrice;

    // UI 初期化
    showPage(1);
    clearAllErrors();
    hideErrorBox();
    doneScreen.hidden = true;
    modal.querySelector(".om-body").hidden   = false;
    modal.querySelector(".om-footer").hidden = false;
    modal.querySelector(".om-steps").hidden  = false;
    modal.querySelector(".om-plan-banner").hidden = false;

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    // フォーカス管理
    setTimeout(function () {
      var first = document.getElementById("omName");
      if (first) first.focus();
    }, 350);
  }

  // ── モーダルを閉じる ──
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    resetForm();
  }

  // ── フォームリセット ──
  function resetForm() {
    ["omName","omKana","omEmail","omEmailC","omTel","omZip","omAddr","omNote"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.querySelectorAll('input[name="omPayment"]').forEach(function(r){ r.checked = false; });
    clearAllErrors();
    hideErrorBox();
    currentStep = 1;
  }

  // ── ページ切り替え ──
  function showPage(n) {
    pages.forEach(function (p, i) { p.hidden = (i + 1 !== n); });
    steps.forEach(function (s, i) {
      s.classList.remove("active", "done");
      if (i + 1 === n) s.classList.add("active");
      if (i + 1 < n)  s.classList.add("done");
    });
    btnBack.hidden   = (n === 1);
    btnNext.hidden   = (n === 3);
    btnSubmit.hidden = (n !== 3);
    currentStep = n;

    // ページトップへ
    var body = modal.querySelector(".om-body");
    if (body) body.scrollTop = 0;
  }

  // ── バリデーション ──────────────────────────────────────────
  function showFieldError(id, msg) {
    var el = document.getElementById("err" + id);
    var input = document.getElementById("om" + id) || document.getElementById("om" + id.charAt(0).toUpperCase() + id.slice(1));
    if (el) el.textContent = msg;
    if (input) input.classList.add("is-error");
  }
  function clearFieldError(fieldId, errId) {
    var el  = document.getElementById(errId);
    var inp = document.getElementById(fieldId);
    if (el)  el.textContent = "";
    if (inp) inp.classList.remove("is-error");
  }
  function clearAllErrors() {
    document.querySelectorAll(".om-field-err").forEach(function(e){ e.textContent = ""; });
    document.querySelectorAll(".om-input").forEach(function(e){ e.classList.remove("is-error"); });
  }
  function showErrorBox(msgs) {
    errorBox.innerHTML = msgs.map(function(m){ return "・" + m; }).join("<br>");
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function hideErrorBox() {
    errorBox.hidden = true;
    errorBox.innerHTML = "";
  }

  function validateStep1() {
    var errs = [];
    var name  = (document.getElementById("omName").value || "").trim();
    var kana  = (document.getElementById("omKana").value || "").trim();
    var email = (document.getElementById("omEmail").value || "").trim();
    var emailC= (document.getElementById("omEmailC").value || "").trim();
    var tel   = (document.getElementById("omTel").value || "").trim();

    clearAllErrors();
    hideErrorBox();

    if (name.length < 2) {
      showFieldError("Name", "お名前を2文字以上で入力してください");
      errs.push("お名前を正しく入力してください");
    }
    if (!kana || !/^[ァ-ヶー\s　]+$/.test(kana)) {
      showFieldError("Kana", "カタカナで入力してください");
      errs.push("フリガナはカタカナで入力してください");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("Email", "正しいメールアドレスを入力してください");
      errs.push("メールアドレスを正しく入力してください");
    }
    if (!emailC || email !== emailC) {
      showFieldError("EmailC", "メールアドレスが一致しません");
      errs.push("メールアドレス（確認）が一致しません");
    }
    var telClean = tel.replace(/[\s\-]/g, "");
    if (!tel || !/^[0-9]{10,11}$/.test(telClean)) {
      showFieldError("Tel", "電話番号を10〜11桁で入力してください");
      errs.push("電話番号を正しく入力してください");
    }
    if (errs.length) showErrorBox(errs);
    return errs.length === 0;
  }

  function validateStep2() {
    var errs = [];
    var zip  = (document.getElementById("omZip").value || "").trim().replace(/\-/g, "");
    var addr = (document.getElementById("omAddr").value || "").trim();

    clearAllErrors();
    hideErrorBox();

    if (!/^\d{7}$/.test(zip)) {
      showFieldError("Zip", "郵便番号を7桁の数字で入力してください");
      errs.push("郵便番号を正しく入力してください");
    }
    if (addr.length < 5) {
      showFieldError("Addr", "住所を正しく入力してください");
      errs.push("住所を正しく入力してください");
    }
    if (errs.length) showErrorBox(errs);
    return errs.length === 0;
  }

  function validateStep3() {
    var checked = document.querySelector('input[name="omPayment"]:checked');
    clearFieldError(null, "errPayment");
    hideErrorBox();
    if (!checked) {
      document.getElementById("errPayment").textContent = "お支払い方法を選択してください";
      showErrorBox(["お支払い方法を選択してください"]);
      return false;
    }
    return true;
  }

  // ── フォーム送信 ──
  function submitOrder() {
    if (!validateStep3()) return;

    var payload = {
      plan:         currentPlan,
      name:         (document.getElementById("omName").value  || "").trim(),
      kana:         (document.getElementById("omKana").value  || "").trim(),
      email:        (document.getElementById("omEmail").value || "").trim(),
      emailConfirm: (document.getElementById("omEmailC").value|| "").trim(),
      tel:          (document.getElementById("omTel").value   || "").trim(),
      zip:          (document.getElementById("omZip").value   || "").trim().replace(/\-/g, ""),
      address:      (document.getElementById("omAddr").value  || "").trim(),
      payment:      (document.querySelector('input[name="omPayment"]:checked') || {}).value || "",
      note:         (document.getElementById("omNote").value  || "").trim(),
    };

    // 送信中UI
    btnSubmit.disabled = true;
    document.getElementById("omSubmitLabel").textContent = "送信中...";
    document.getElementById("omSubmitSpinner").hidden = false;
    hideErrorBox();

    // ── GAS CORS 対策 ──────────────────────────────────────────
    // GASはOPTIONSプリフライトを処理しないため
    // Content-Type: application/json でのPOSTはCORSエラーになる。
    // 対策: text/plain で送り、GAS側で e.postData.contents を読む。
    //       また GAS はリダイレクトを返すので redirect:"follow" が必要。
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    })
      .then(function (r) {
        // opaque（リダイレクト後no-cors）は body 読み取り不可 → 成功扱い
        if (r.type === "opaque") {
          showDoneScreen();
          return;
        }
        return r.text().then(function (txt) {
          try {
            var data = JSON.parse(txt);
            if (data.ok) {
              showDoneScreen();
            } else {
              var msgs = data.errors || ["エラーが発生しました。内容をご確認ください。"];
              showErrorBox(msgs);
              resetSubmitBtn();
            }
          } catch (e) {
            // JSONパース失敗 = GASが処理済みとみなして完了画面へ
            showDoneScreen();
          }
        });
      })
      .catch(function (err) {
        console.error("fetch error:", err);
        // フォールバック: no-cors で fire-and-forget
        sendViaBeacon(payload);
      });
  }

  // no-cors フォールバック（sendBeacon / XMLHttpRequest）
  function sendViaBeacon(payload) {
    var blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon && navigator.sendBeacon(GAS_URL, blob)) {
      showDoneScreen();
      return;
    }
    // 最終手段: XMLHttpRequest（非同期）
    var xhr = new XMLHttpRequest();
    xhr.open("POST", GAS_URL, true);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        showDoneScreen(); // 成否問わず完了画面（GASは処理済み）
      }
    };
    xhr.onerror = function () { showDoneScreen(); };
    xhr.send(JSON.stringify(payload));
  }

  function resetSubmitBtn() {
    btnSubmit.disabled = false;
    document.getElementById("omSubmitLabel").textContent = "注文を確定する";
    document.getElementById("omSubmitSpinner").hidden = true;
  }

  function showDoneScreen() {
    modal.querySelector(".om-body").hidden   = true;
    modal.querySelector(".om-footer").hidden = true;
    modal.querySelector(".om-steps").hidden  = true;
    modal.querySelector(".om-plan-banner").hidden = true;
    doneScreen.hidden = false;
  }

  // ── イベント登録 ──────────────────────────────────────────
  // CTAボタン群（すべて data-plan 付き）
  document.querySelectorAll(".open-order-modal").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.dataset.plan || "subscription");
    });
  });

  // 閉じる
  btnClose.addEventListener("click", closeModal);
  btnDoneClose.addEventListener("click", closeModal);

  // オーバーレイ背景クリックで閉じる
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

  // ESCキー
  document.addEventListener("keydown", function (e) {
    if (!modal.hidden && e.key === "Escape") closeModal();
  });

  // 戻る
  btnBack.addEventListener("click", function () {
    if (currentStep > 1) {
      clearAllErrors();
      hideErrorBox();
      showPage(currentStep - 1);
    }
  });

  // 次へ
  btnNext.addEventListener("click", function () {
    var valid = (currentStep === 1) ? validateStep1()
              : (currentStep === 2) ? validateStep2()
              : true;
    if (valid) showPage(currentStep + 1);
  });

  // 送信
  btnSubmit.addEventListener("click", submitOrder);

  // ── リアルタイム入力クリア ──
  ["omName","omKana","omEmail","omEmailC","omTel","omZip","omAddr"].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function() { el.classList.remove("is-error"); });
  });
  document.querySelectorAll('input[name="omPayment"]').forEach(function(r){
    r.addEventListener("change", function(){
      document.getElementById("errPayment").textContent = "";
      hideErrorBox();
    });
  });

})();

/* ══════════════════════════════════════════════
   チャットボット（段階3: Google Sheets × Claude API連携／Railwayバックエンド経由）
   ・丸型トリガーの開閉アニメーション（段階1）
   ・sticky-ctaとの重なり回避（段階1）
   ・Google SheetsをCSV公開URLからfetch → PapaParseでパース
     → システムプロンプトに埋め込み → Railway上のバックエンド(/chat)へPOST
     → Claude APIの応答を吹き出しに表示
   ・バックエンドに接続できない場合は、Sheetsのキーワード一致（段階2ロジック）
     に自動フォールバックしてボットが完全に沈黙しないようにする
═══════════════════════════════════════════════ */
(function () {
  // ── Google Sheets（LumeaShift Q&Aシート）CSV公開URL ──
  var CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjsy7uLvLKz4fS76G6xIqZioSYNr-TyBGlmj21jIRmgyFeDoNacMuYgkKDvA29Vkjl143fLSj0IMrY/pub?output=csv';

  // ── Railway上のバックエンド（APIキーはここには置かない。/chat エンドポイントを叩くだけ） ──
  var BACKEND_URL = 'https://chatbot-production-7c69.up.railway.app/chat';
  var BACKEND_TIMEOUT_MS = 20000; // Railway無料枠のコールドスタート等を考慮した余裕あるタイムアウト

  var COMPANY_NAME = 'LUMEA SHIFT';

  // Sheets取得・API呼び出しともに失敗した場合の最終フォールバック
  var HARD_FALLBACK = '申し訳ございません、うまくお答えできませんでした。担当者にお問い合わせください。';

  var widget  = document.getElementById('cbWidget');
  var trigger = document.getElementById('cbTrigger');
  var win     = document.getElementById('cbWindow');
  var closeBtn= document.getElementById('cbClose');
  var body    = document.getElementById('cbBody');
  var form    = document.getElementById('cbForm');
  var input   = document.getElementById('cbInput');
  var sendBtn = document.getElementById('cbSend');
  var stickyCta = document.getElementById('stickyCta');
  if (!widget || !trigger || !win) return;

  var isOpen = false;

  // ── ナレッジ（Sheets）読み込み状態 ──
  // 段階2の keyword/answer 形式・段階3推奨の category/question/answer/priority 形式のどちらでも動くようにしている
  var knowledgeRows = null;
  var knowledgeReadyPromise = loadKnowledge();

  function loadKnowledge() {
    if (typeof Papa === 'undefined') return Promise.resolve();
    return fetch(CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('CSV fetch failed: ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        knowledgeRows = (parsed.data || []).map(function (row) {
          return {
            category: (row.category || '').toString().trim(),
            question: (row.question || '').toString().trim(),
            keyword:  (row.keyword  || '').toString().trim(),
            answer:   (row.answer   || '').toString().trim(),
            priority: (row.priority || '').toString().trim()
          };
        }).filter(function (row) { return row.answer; });
      })
      .catch(function (err) {
        console.error('[chatbot] Google Sheets の取得に失敗しました:', err);
      });
  }

  // ── キーワード一致ロジック（段階2の仕組みをオフライン時のフォールバックとして温存） ──
  function findAnswerByKeyword(userInput) {
    if (!knowledgeRows || !knowledgeRows.length) return null;
    var normalizedInput = userInput.trim();
    var fallbackRow = null;

    for (var i = 0; i < knowledgeRows.length; i++) {
      var row = knowledgeRows[i];
      if (!row.keyword) {
        if (!fallbackRow) fallbackRow = row;
        continue;
      }
      var keywords = row.keyword.split('|').map(function (k) { return k.trim(); }).filter(Boolean);
      var matched = keywords.some(function (k) { return normalizedInput.includes(k); });
      if (matched) return row.answer;
    }
    return fallbackRow ? fallbackRow.answer : null;
  }

  // ── Sheetsのナレッジをシステムプロンプトへ埋め込み（ハルシネーション対策込み） ──
  function buildSystemPrompt() {
    var rows = (knowledgeRows || []).slice();

    // priority列があれば数値優先度の昇順に並べる（値が無い/数値でない行は末尾扱い）
    rows.sort(function (a, b) {
      var pa = parseInt(a.priority, 10);
      var pb = parseInt(b.priority, 10);
      if (isNaN(pa)) pa = 999;
      if (isNaN(pb)) pb = 999;
      return pa - pb;
    });

    var knowledgeText = rows
      .map(function (row) {
        var q = row.question || row.keyword; // question列が無ければkeywordを質問文の代用にする
        if (!q) return null; // 質問文もkeywordも無い行（段階2の空欄デフォルト行など）はプロンプトに含めない
        return 'Q: ' + q + '\nA: ' + row.answer;
      })
      .filter(Boolean)
      .join('\n\n');

    return 'あなたは' + COMPANY_NAME + 'の窓口担当です。\n' +
      '以下の情報だけを根拠に、丁寧な日本語で簡潔に回答してください。\n' +
      '情報に記載のない内容や推測が必要な質問には、「わかりかねますので、お問い合わせフォームよりご連絡ください」と回答してください。\n' +
      '憶測で答えてはいけません。LPの内容と関係のない雑談には応じず、上記の案内文のみ返してください。\n\n' +
      knowledgeText;
  }

  // ── Railwayバックエンド(/chat)を呼び出し、Claude APIの応答テキストを取り出す ──
  function askBackend(userInput, systemPrompt) {
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId = controller && setTimeout(function () { controller.abort(); }, BACKEND_TIMEOUT_MS);

    return fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput: userInput, systemPrompt: systemPrompt }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Backend responded with status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        // Claude APIがエラーを返した場合（例: type:"error"）
        if (data && data.type === 'error') {
          throw new Error((data.error && data.error.message) || 'Claude API error');
        }
        var textBlock = Array.isArray(data && data.content)
          ? data.content.find(function (c) { return c.type === 'text'; })
          : null;
        var answer = textBlock && textBlock.text ? textBlock.text.trim() : '';
        if (!answer) throw new Error('Empty response from backend');
        return answer;
      });
  }

  // ── ボットの返答を決定（第一候補: Claude API経由 / 失敗時: キーワード一致 / それも無ければ定型文） ──
  function getBotReply(userInput) {
    return knowledgeReadyPromise.then(function () {
      var systemPrompt = buildSystemPrompt();
      return askBackend(userInput, systemPrompt).catch(function (err) {
        console.error('[chatbot] Railwayバックエンドとの通信に失敗しました:', err);
        var fallback = findAnswerByKeyword(userInput);
        return fallback || HARD_FALLBACK;
      });
    });
  }

  function openChat() {
    isOpen = true;
    widget.classList.add('cb-open');
    widget.classList.remove('cb-pulse');
    trigger.setAttribute('aria-expanded', 'true');
    win.setAttribute('aria-hidden', 'false');
    document.addEventListener('click', onOutsideClick, true);
    document.addEventListener('keydown', onKeydown);
    // モバイルでズームを誘発しないよう少し遅らせてフォーカス
    setTimeout(function () { input && input.focus({ preventScroll: true }); }, 260);
  }

  function closeChat() {
    isOpen = false;
    widget.classList.remove('cb-open');
    trigger.setAttribute('aria-expanded', 'false');
    win.setAttribute('aria-hidden', 'true');
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('keydown', onKeydown);
    trigger.focus({ preventScroll: true });
  }

  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function onOutsideClick(e) {
    if (!widget.contains(e.target)) closeChat();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeChat();
  }

  trigger.addEventListener('click', toggleChat);
  closeBtn && closeBtn.addEventListener('click', closeChat);

  // ── 送信ボタンの活性/非活性 ──
  if (input && sendBtn) {
    input.addEventListener('input', function () {
      sendBtn.disabled = input.value.trim().length === 0;
    });
  }

  // ── 吹き出しの追加ヘルパー ──
  function appendMessage(text, who) {
    var msg = document.createElement('div');
    msg.className = 'cb-msg ' + (who === 'user' ? 'cb-msg-user' : 'cb-msg-bot');
    var p = document.createElement('p');
    p.textContent = text;
    msg.appendChild(p);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }

  function showTyping() {
    var t = document.createElement('div');
    t.className = 'cb-typing';
    t.id = 'cbTypingIndicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
    return t;
  }

  // ── フォーム送信（段階3: Railway経由でClaude APIに問い合わせ。失敗時はキーワード一致にフォールバック） ──
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;

      appendMessage(text, 'user');
      input.value = '';
      sendBtn.disabled = true;

      var typing = showTyping();
      var MIN_DELAY = 500; // 応答が一瞬すぎて不自然にならないよう最低限の間を置く
      var startedAt = Date.now();

      getBotReply(text).then(function (answer) {
        var elapsed = Date.now() - startedAt;
        var wait = Math.max(0, MIN_DELAY - elapsed);
        setTimeout(function () {
          typing.remove();
          appendMessage(answer, 'bot');
        }, wait);
      });
    });
  }

  // ── sticky-ctaと重なる場合はトリガーを押し上げる ──
  if (stickyCta) {
    var syncCtaOffset = function () {
      widget.classList.toggle('cb-avoid-cta', stickyCta.classList.contains('visible'));
    };
    syncCtaOffset();
    new MutationObserver(syncCtaOffset).observe(stickyCta, { attributes: true, attributeFilter: ['class'] });
  }

  // ── 初回訪問時のみ、さりげなく気づいてもらうためのパルス演出 ──
  setTimeout(function () {
    if (!isOpen) widget.classList.add('cb-pulse');
  }, 2500);
})();
