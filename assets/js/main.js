/* =========================================================
   Работа не волк - логика лендинга
   ========================================================= */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var range = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- 1. Интро ---------- */
  var T0 = Date.now(), MIN_INTRO = 2350;
  var intro = $("#intro");
  function killIntro(force) {
    if (!intro) return;
    var wait = MIN_INTRO - (Date.now() - T0);
    if (wait > 0 && force !== true) { setTimeout(killIntro, wait); return; }   /* даём сборке доиграть */
    intro.classList.add("is-out");
    document.body.classList.remove("is-locked");
    startEntrance();
    setTimeout(function () { intro && intro.remove(); intro = null; }, 900);
  }
  /* ждём декодирования фотографий, иначе первый кадр может уйти в пустоту */
  function photosReady(cb) {
    var imgs = $$(".photo__layer");
    if (!imgs.length || !imgs[0].decode) return cb();
    var left = imgs.length, done = function () { if (--left <= 0) cb(); };
    imgs.forEach(function (im) {
      (im.complete && im.naturalWidth ? im.decode() : new Promise(function (res, rej) {
        im.addEventListener("load", res, { once: true });
        im.addEventListener("error", rej, { once: true });
      }).then(function () { return im.decode(); })).then(done, done);
    });
  }

  if (intro) {
    if (reduced) { intro.remove(); intro = null; ent = 0; }
    else {
      document.body.classList.add("is-locked");
      window.addEventListener("load", function () {
        photosReady(function () { setTimeout(killIntro, 150); });
      });
      setTimeout(killIntro, 3600);
      /* пропустить: клик по сцене или кнопка */
      intro.addEventListener("click", function () { killIntro(true); });
      var sk = $("#introSkip"); sk && sk.addEventListener("click", function (e) { e.stopPropagation(); killIntro(true); });
    }
  }

  /* ---------- 2. Камера: лицо -> корпус -> полный рост ---------- */
  /* геометрия кадров: доля ширины кепки, верх головы и её центр в самом изображении */
  var LAYERS = [
    { key:"face",  w:992, h:1712, hw:0.920, hy:0.001, hx:0.526 },
    { key:"torso", w:863, h:1500, hw:0.300, hy:0.003, hx:0.500 },
    { key:"full",  w:521, h:1500, hw:0.284, hy:0.003, hx:0.530 }
  ];

  var stage = $("#hero");
  var ideas = $("#ideas"), cue = $("#cue"), nav = $("#nav"), callbar = $(".callbar");
  var scenes = $$("[data-scene]");
  var vw = 0, vh = 0, mobile = false, px = 0, py = 0, tx = 0, ty = 0;
  var ent = 1, entT0 = 0, entOn = false, ENT_D = 1200;
  var CAM = {};

  LAYERS.forEach(function (L) { L.el = $('[data-layer="' + L.key + '"]'); L.ratio = L.h / L.w; });

  function measure() {
    var nvw = window.innerWidth, nvh = window.innerHeight;
    /* в мобильных браузерах адресная строка меняет высоту на лету, не дёргаем кадр */
    if (vh && nvw === vw && nvw < 860 && Math.abs(nvh - vh) < 130) nvh = vh;
    vw = nvw; vh = nvh;
    mobile = vw < 860;
    /* ширина кепки на экране: от крупного плана до фигуры в полный рост */
    if (mobile) {
      CAM.hw0 = vw * 0.98;
      CAM.x0 = CAM.x1 = 0.50 * vw;
      /* пузыри и лицо встают под текстом, высоту меряем, а не угадываем */
      var heroEl = $(".hero");
      var ih = ideas ? (ideas.offsetHeight || 46) : 0;
      var hb = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 0.42 * vh;
      CAM.iy0 = hb + 16;
      CAM.y0 = clamp(CAM.iy0 + ih + 14, 0.40 * vh, vh - 140);
      CAM.y1 = 0.30 * vh;
    } else {
      CAM.iy0 = null;
      /* фото встаёт правее текстовой колонки, поэтому считаем от неё */
      var lft  = Math.min(92, Math.max(16, 0.06 * vw));
      var colW = Math.min(560, 0.46 * vw);
      var left = lft + colW + 28;
      var iw   = Math.min((vw - left) * 1.12, vh * 0.75);
      CAM.hw0 = LAYERS[0].hw * iw;
      CAM.x0  = left + LAYERS[0].hx * iw;
      CAM.x1  = Math.min(CAM.x0, vw * 0.70);
      CAM.y0  = 0.45 * vh; CAM.y1 = 0.16 * vh;
    }
    CAM.hw1 = LAYERS[2].hw * (LAYERS[2].w * (vh * (mobile ? 0.62 : 0.74)) / LAYERS[2].h);
    LAYERS.forEach(function (L) {
      if (!L.el) return;
      L.el.style.width = L.w + "px";
      L.el.style.transformOrigin = "0 0";
    });
  }

  function draw(p) {
    /* камера доезжает до полного роста к 72% прокрутки и держит кадр до конца */
    var c  = clamp(p / 0.72, 0, 1);
    var e  = c * c * (3 - 2 * c);
    var hw = CAM.hw0 * Math.pow(CAM.hw1 / CAM.hw0, e);   /* плавный отъезд камеры */
    var ax = lerp(CAM.x0, CAM.x1, e) + tx;
    var ay = lerp(CAM.y0, CAM.y1, e) + ty;
    var ayPhoto = ay + ent * vh * 0.13;
    var band = { faceOut: [0.46, 0.55], fullIn: [0.155, 0.19] };   /* доли от hw0 */
    var k = hw / CAM.hw0;

    LAYERS.forEach(function (L) {
      if (!L.el) return;
      var iw = hw / L.hw, ih = iw * L.ratio;
      var o;
      if (L.key === "face")  o = range(k, band.faceOut[0], band.faceOut[1]);
      else if (L.key === "full") o = 1 - range(k, band.fullIn[0], band.fullIn[1]);
      else o = (1 - range(k, band.faceOut[0], band.faceOut[1])) * range(k, band.fullIn[0], band.fullIn[1]);
      o *= 1 - ent;
      L.el.style.opacity = o.toFixed(3);
      if (o < 0.002) { L.el.style.visibility = "hidden"; return; }
      L.el.style.visibility = "visible";
      L.el.style.transform = "translate3d(" + (ax - L.hx * iw).toFixed(1) + "px," +
                             (ayPhoto - L.hy * ih).toFixed(1) + "px,0) scale(" + (iw / L.w).toFixed(4) + ")";
    });

    if (ideas) {
      var io = 1 - range(p, 0.03, 0.15);
      ideas.style.opacity = io.toFixed(3);
      ideas.style.setProperty("--ix", ax.toFixed(1) + "px");
      var iyBase = (mobile && CAM.iy0 != null) ? CAM.iy0 + (ay - CAM.y0) : ay - 26;
      ideas.style.setProperty("--iy", (iyBase - (1 - io) * 80).toFixed(1) + "px");
      ideas.style.pointerEvents = io < .25 ? "none" : "auto";
    }

    scenes.forEach(function (el) {
      var i = +el.getAttribute("data-scene"), o, sh;
      if (i === 0) { o = 1 - range(p, 0.03, 0.14); sh = -30 * (1 - o); }
      else if (i === 1) { o = range(p, 0.24, 0.33) * (1 - range(p, 0.40, 0.47)); sh = 26 * (1 - range(p, 0.24, 0.33)); }
      else { o = range(p, 0.53, 0.62) * (1 - range(p, 0.92, 0.98)); sh = 26 * (1 - range(p, 0.53, 0.62)); }
      el.style.opacity = o.toFixed(3);
      el.style.transform = "translate3d(0," + sh.toFixed(1) + "px,0)";
      el.style.pointerEvents = o < .3 ? "none" : "auto";
    });

    if (cue) cue.style.opacity = (1 - range(p, 0, 0.07)).toFixed(3);
  }

  function progress() {
    if (!stage) return 0;
    var r = stage.getBoundingClientRect();
    return clamp(-r.top / (stage.offsetHeight - vh), 0, 1);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (!reduced) draw(progress());
      if (nav) nav.classList.toggle("is-stuck", window.scrollY > 40);
      if (callbar) callbar.classList.toggle("is-on", window.scrollY > vh * 0.9);
      ticking = false;
    });
  }

  /* мягкий параллакс за курсором */
  function pointer(e) {
    if (reduced || mobile) return;
    px = (e.clientX / vw - .5) * 22;
    py = (e.clientY / vh - .5) * 14;
  }
  function startEntrance() {
    stage && stage.classList.add("is-live");
    ideas && ideas.classList.add("is-live");
    if (reduced) { ent = 0; draw(progress()); return; }
    entT0 = Date.now(); entOn = true;
    /* если кадры не идут (вкладка в фоне), доводим состояние по таймеру */
    setTimeout(function () { if (ent > 0) { ent = 0; entOn = false; draw(progress()); } }, ENT_D + 400);
  }

  function loop() {
    if (entOn) {
      var t = clamp((Date.now() - entT0) / ENT_D, 0, 1);
      ent = Math.pow(1 - t, 3);
      if (t >= 1) { ent = 0; entOn = false; }
      draw(progress());
    } else {
      tx += (px - tx) * .06;
      ty += (py - ty) * .06;
      if (Math.abs(px - tx) > .1 || Math.abs(py - ty) > .1) draw(progress());
    }
    requestAnimationFrame(loop);
  }

  if (location.search.indexOf("dev=1") >= 0) {   /* отладка кадров */
    window.__draw = function (p) { ent = 0; entOn = false; draw(p); };
  }

  if (stage) measure();
  else { vw = window.innerWidth; vh = window.innerHeight; }

  if (stage && !reduced) {
    draw(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); draw(progress()); });
    window.addEventListener("pointermove", pointer, { passive: true });
    /* шрифт меняет высоту текста, пересчитываем когда он подгрузился */
    window.addEventListener("load", function () { measure(); draw(progress()); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); draw(progress()); });
    }
    requestAnimationFrame(loop);
    if (!intro) startEntrance();
    setTimeout(function () { if (!entOn && ent > 0) startEntrance(); }, 4000);  /* страховка */
  } else if (!stage) {
    /* внутренние страницы: только шапка и кнопка звонка */
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { vw = window.innerWidth; vh = window.innerHeight; });
  } else if (stage) {
    ent = 0;
    stage.classList.add("is-live");
    ideas && ideas.classList.add("is-live");
    var ph = $("#photo"); if (ph) ph.style.cssText = "position:static;text-align:center";
    LAYERS[1].el && (LAYERS[1].el.style.cssText = "position:static;opacity:1;width:min(420px,70vw);margin:0 auto");
    LAYERS[0].el && LAYERS[0].el.remove(); LAYERS[0].el = null;
    LAYERS[2].el && LAYERS[2].el.remove(); LAYERS[2].el = null;
    LAYERS[1].el = null;
    scenes.forEach(function (el) { el.style.cssText = "position:static;opacity:1;margin:40px auto 0;transform:none"; });
    ideas && (ideas.style.cssText = "position:static;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;width:auto;height:auto;margin:30px 0");
    $$(".idea").forEach(function (el) { el.style.cssText = "position:static;animation:none"; });
  }

  /* ---------- 3. Бегущая строка ---------- */
  var TICK = ["Лендинги", "Интернет-магазины", "Веб-приложения", "Личные кабинеты", "3D и WebGL",
              "Telegram-боты", "Анимации по прокрутке", "SEO", "AI SEO для нейросетей", "Домен и хостинг", "Поддержка сайтов"];
  var ticker = $("#ticker");
  if (ticker) {
    var html = TICK.map(function (t) { return "<span>" + t + "</span>"; }).join("");
    ticker.innerHTML = html + html;
  }

  /* ---------- 4. Примеры под ниши: у каждой свой макет ---------- */
  var DEMOS = [
    { n:"Кофейня", kind:"hero", tier:"Лендинг", t:1, url:"zerno-coffee.ru", logo:"ЗЕРНО",
      ac:"#B4653C", bg:"#FFF9F3", ink:"#2A1B12",
      h:"Кофе, ради которого<br>стоит выйти из дома",
      p:"Обжариваем сами, варим при вас. Завтраки с 8 утра, навынос за 3 минуты.",
      b1:"Меню и цены", b2:"Забронировать стол",
      c:[["Завтраки","Каша, сырники, яйца бенедикт с 8:00"],["Своя обжарка","Зерно из Эфиопии и Бразилии"],["Навынос","Заказ через сайт, без очереди"]] },

    { n:"Цветы", kind:"catalog", tier:"Лендинг", t:1, url:"pion-shop.ru", logo:"ПИОН",
      ac:"#D6486E", bg:"#FFF6F8", ink:"#2B1119",
      h:"Букет у двери через два часа", p:"Собираем при вас, фото букета до отправки",
      chips:["Все","До 3 000","Пионы","Розы","Композиции","Подписка"],
      goods:[["Пионовый сад","3 400"],["Белое утро","2 900"],["Пыльная роза","4 200"],
             ["Полевой микс","1 800"],["Ваниль и хлопок","3 100"],["Букет недели","2 400"]] },

    { n:"Барбершоп", kind:"booking", tier:"Сайт и веб-приложение", t:2, url:"britva.ru", logo:"БРИТВА",
      ac:"#C9A227", bg:"#17161A", ink:"#F4F1EA",
      h:"Запись за 20 секунд",
      masters:[["Игорь","стрижка, борода"],["Тимур","классика"],["Саша","фейд"]],
      days:["Пн 14","Вт 15","Ср 16","Чт 17","Пт 18"],
      slots:["10:00","11:30","13:00","14:30","16:00","17:30","19:00","20:30"] },

    { n:"Фитнес", kind:"dash", tier:"Сайт и веб-приложение", t:2, url:"forma-fit.ru", logo:"ФОРМА",
      ac:"#12A97A", bg:"#F1FBF7", ink:"#0C2A20",
      menu:["Обзор","Расписание","Абонемент","Тренеры","Оплата"],
      stats:[["Тренировок в месяце","12"],["Осталось по абонементу","8"],["Следующая","завтра 19:00"]],
      bars:[40,65,52,78,60,88,72],
      list:[["Силовая, зал 2","Пн 19:00","Игорь"],["Растяжка","Ср 18:00","Аня"],["Кроссфит","Пт 20:00","Марк"]] },

    { n:"Автосервис", kind:"calc", tier:"Сайт и веб-приложение", t:2, url:"garage47.ru", logo:"ГАРАЖ 47",
      ac:"#1F6FEB", bg:"#F3F6FB", ink:"#101828",
      h:"Расчёт до приезда",
      rows:[["Марка и модель","Toyota Camry 2018"],["Что беспокоит","Стук спереди при кочках"],["Пробег","148 000 км"]],
      opts:[["Диагностика подвески","1 500"],["Замена стоек, пара","6 800"],["Развал-схождение","2 400"]],
      total:"10 700" },

    { n:"Юрист", kind:"split", tier:"Лендинг", t:1, url:"pravodelo.ru", logo:"ПРАВО И ДЕЛО",
      ac:"#1B3A6B", bg:"#F5F6F9", ink:"#111827",
      h:"Разберём вашу<br>ситуацию на первом<br>звонке",
      p:"Банкротство, споры с застройщиком, семейные дела. Работаем по договору и фиксированной цене.",
      facts:[["17 лет","в практике"],["340 дел","доведено до конца"],["92%","решений в пользу клиента"]],
      b1:"Бесплатная консультация" },

    { n:"Мебель и 3D", kind:"three", tier:"Сайт высшего уровня", t:3, url:"formadrevo.ru", logo:"ФОРМА ДРЕВО",
      ac:"#8A5A2B", bg:"#151311", ink:"#F2EBE1",
      h:"Покрутите кресло<br>перед заказом",
      p:"Материал, цвет и размер меняются прямо на странице. Сцена собрана на WebGL.",
      swatches:["#8A5A2B","#2F3A34","#A8A29A","#3C2B22"],
      specs:[["Ширина","74 см"],["Ткань","велюр"],["Срок","21 день"]] }
  ];

  function miniNav(d, right) {
    return '<div class="mini__nav"><span class="mini__logo">' + d.logo + '</span>' +
      '<span class="mini__menu">' + (d.menu || ["Услуги","О нас","Отзывы","Контакты"]).map(function (m, i) {
        return '<span' + (i === 0 && d.menu ? ' class="on"' : '') + '>' + m + '</span>'; }).join("") + '</span>' +
      '<span class="mini__cta" style="background:' + d.ac + '">' + (right || "Оставить заявку") + '</span></div>';
  }

  var RENDER = {
    hero: function (d) {
      return miniNav(d) +
        '<div class="m-hero"><div><div class="mini__h">' + d.h + '</div><div class="mini__p">' + d.p + '</div>' +
        '<div class="mini__row"><span class="mini__pill" style="background:' + d.ac + '">' + d.b1 + '</span>' +
        '<span class="mini__pill mini__pill--o">' + d.b2 + '</span></div></div>' +
        '<div class="mini__art" style="background:linear-gradient(150deg,' + d.ac + ',' + d.ac + '22)"></div></div>' +
        '<div class="mini__cards">' + d.c.map(function (c) {
          return '<div class="mini__card"><b>' + c[0] + '</b><span>' + c[1] + '</span><div class="mini__bar"></div></div>';
        }).join("") + '</div>';
    },
    catalog: function (d) {
      return miniNav(d, "Корзина") +
        '<div class="m-cat__top"><div class="mini__h sm">' + d.h + '</div><div class="mini__p">' + d.p + '</div>' +
        '<div class="m-chips">' + d.chips.map(function (c, i) {
          return '<span' + (i === 0 ? ' style="background:' + d.ac + ';color:#fff;border-color:' + d.ac + '"' : '') + '>' + c + '</span>';
        }).join("") + '</div></div>' +
        '<div class="m-grid">' + d.goods.map(function (g, i) {
          return '<div class="m-good"><div class="m-good__img" style="background:linear-gradient(' + (120 + i * 35) + 'deg,' + d.ac + '33,' + d.ac + 'aa)"></div>' +
            '<b>' + g[0] + '</b><span class="m-good__p">' + g[1] + ' &#8381;<i style="background:' + d.ac + '">+</i></span></div>';
        }).join("") + '</div>';
    },
    booking: function (d) {
      return miniNav(d, "Мои записи") +
        '<div class="m-book"><div class="m-book__side"><div class="m-lbl">Мастер</div>' +
        d.masters.map(function (m, i) {
          return '<div class="m-master' + (i === 1 ? ' on' : '') + '"><i style="background:' + d.ac + '"></i><b>' + m[0] + '</b><span>' + m[1] + '</span></div>';
        }).join("") + '</div>' +
        '<div class="m-book__main"><div class="mini__h sm">' + d.h + '</div>' +
        '<div class="m-days">' + d.days.map(function (x, i) {
          return '<span' + (i === 2 ? ' class="on" style="background:' + d.ac + ';border-color:' + d.ac + '"' : '') + '>' + x + '</span>';
        }).join("") + '</div>' +
        '<div class="m-slots">' + d.slots.map(function (x, i) {
          return '<span class="' + (i === 4 ? 'on' : (i === 1 || i === 6 ? 'off' : '')) + '"' +
            (i === 4 ? ' style="background:' + d.ac + ';border-color:' + d.ac + ';color:#17161A"' : '') + '>' + x + '</span>';
        }).join("") + '</div>' +
        '<div class="m-book__foot"><span class="mini__pill" style="background:' + d.ac + ';color:#17161A">Записаться на 16:00</span>' +
        '<span class="m-note">Напомним в Telegram за час</span></div></div></div>';
    },
    dash: function (d) {
      var max = Math.max.apply(null, d.bars);
      return '<div class="m-dash">' +
        '<div class="m-dash__side"><span class="mini__logo">' + d.logo + '</span>' +
        d.menu.map(function (m, i) { return '<span class="m-nav' + (i === 0 ? ' on' : '') + '">' + m + '</span>'; }).join("") +
        '<span class="m-user"><i style="background:' + d.ac + '"></i>Анна К.</span></div>' +
        '<div class="m-dash__main"><div class="m-dash__head"><b>Личный кабинет</b>' +
        '<span class="mini__cta" style="background:' + d.ac + '">Продлить абонемент</span></div>' +
        '<div class="m-tiles">' + d.stats.map(function (s) {
          return '<div class="m-tile"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>'; }).join("") + '</div>' +
        '<div class="m-panels"><div class="m-chart"><span class="m-lbl">Посещения за неделю</span><div class="m-bars">' +
        d.bars.map(function (v) { return '<i style="height:' + Math.round(v / max * 100) + '%;background:' + d.ac + '"></i>'; }).join("") +
        '</div></div><div class="m-table"><span class="m-lbl">Ближайшие тренировки</span>' +
        d.list.map(function (r) {
          return '<div class="m-row"><b>' + r[0] + '</b><span>' + r[1] + '</span><span>' + r[2] + '</span></div>'; }).join("") +
        '</div></div></div></div>';
    },
    calc: function (d) {
      return miniNav(d, "Записаться") +
        '<div class="m-calc"><div class="m-calc__form"><div class="mini__h sm">' + d.h + '</div>' +
        d.rows.map(function (r) {
          return '<label class="m-field"><span>' + r[0] + '</span><i>' + r[1] + '</i></label>'; }).join("") +
        '<div class="m-lbl">Что предлагаем</div>' +
        d.opts.map(function (o, i) {
          return '<div class="m-opt"><i class="' + (i < 2 ? 'on' : '') + '" style="' + (i < 2 ? 'background:' + d.ac + ';border-color:' + d.ac : '') + '"></i>' +
            '<b>' + o[0] + '</b><span>' + o[1] + ' &#8381;</span></div>'; }).join("") + '</div>' +
        '<div class="m-calc__sum" style="border-color:' + d.ac + '33"><span class="m-lbl">Предварительно</span>' +
        '<b style="color:' + d.ac + '">' + d.total + ' &#8381;</b>' +
        '<span class="m-note">Точную сумму подтвердим после диагностики, без вашего согласия работы не начинаем.</span>' +
        '<span class="mini__pill" style="background:' + d.ac + '">Записаться на диагностику</span></div></div>';
    },
    split: function (d) {
      return miniNav(d, "Консультация") +
        '<div class="m-split"><div class="m-split__l"><div class="mini__h">' + d.h + '</div>' +
        '<div class="mini__p">' + d.p + '</div>' +
        '<span class="mini__pill" style="background:' + d.ac + '">' + d.b1 + '</span></div>' +
        '<div class="m-split__r" style="background:linear-gradient(160deg,' + d.ac + ',' + d.ac + '55)">' +
        '<div class="m-quote">Договор, фиксированная цена<br>и отчёт по каждому шагу</div></div></div>' +
        '<div class="m-facts">' + d.facts.map(function (f) {
          return '<div><b style="color:' + d.ac + '">' + f[0] + '</b><span>' + f[1] + '</span></div>'; }).join("") + '</div>';
    },
    three: function (d) {
      return miniNav(d, "Заказать") +
        '<div class="m-3d"><div class="m-3d__scene"><div class="m-chair" style="--c1:' + d.ac + ';--c2:#2b211a">' +
        '<i class="ch-back"></i><i class="ch-arm l"></i><i class="ch-arm r"></i>' +
        '<i class="ch-seat"></i><i class="ch-leg l"></i><i class="ch-leg r"></i></div><div class="m-3d__shadow"></div>' +
        '<div class="m-3d__hint"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 0 9 9"/><path d="M21 12a9 9 0 0 0-9-9"/><path d="m18 3 3 3-3 3"/><path d="m6 21-3-3 3-3"/></svg>Потяните, чтобы повернуть</div></div>' +
        '<div class="m-3d__panel"><div class="mini__h sm">' + d.h + '</div><div class="mini__p">' + d.p + '</div>' +
        '<div class="m-lbl">Обивка</div><div class="m-sw">' + d.swatches.map(function (c, i) {
          return '<i style="background:' + c + '"' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join("") + '</div>' +
        '<div class="m-specs">' + d.specs.map(function (s) {
          return '<div><span>' + s[0] + '</span><b>' + s[1] + '</b></div>'; }).join("") + '</div>' +
        '<span class="mini__pill" style="background:' + d.ac + '">В корзину</span></div></div>';
    }
  };

  var tabsEl = $("#demoTabs"), viewEl = $("#demoView"), urlEl = $("#demoUrl"), noteEl = $("#demoNote");
  function renderDemo(i) {
    var d = DEMOS[i];
    if (!viewEl) return;
    urlEl.textContent = d.url;
    viewEl.style.background = d.bg;
    viewEl.style.color = d.ink;
    viewEl.innerHTML = '<div class="mini mini--' + d.kind + '">' + RENDER[d.kind](d) + '</div>';
    if (noteEl) noteEl.innerHTML = 'Такой экран входит в тариф <a href="#t' + d.t + '">' + d.tier + '</a>';
    $$(".tab", tabsEl).forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); });
  }
  if (tabsEl) {
    tabsEl.innerHTML = DEMOS.map(function (d, i) {
      return '<button class="tab" type="button" role="tab" aria-selected="' + (i === 0) + '">' + d.n + "</button>";
    }).join("");
    $$(".tab", tabsEl).forEach(function (t, i) {
      t.addEventListener("click", function () { renderDemo(i); auto = -1; });
    });
    renderDemo(0);
    var auto = 0;
    setInterval(function () {
      if (auto < 0 || reduced || document.hidden) return;
      var wrap = $("#primery").getBoundingClientRect();
      if (wrap.top > vh || wrap.bottom < 0) return;
      auto = (auto + 1) % DEMOS.length;
      renderDemo(auto);
    }, 5200);
  }

  /* ---------- 4a. Фильм по прокрутке: камера через нос в голову, сайты выходят из уха ---------- */
  /* 301 кадр (20 секунд, 15 кадров в секунду). Цвет края каждого кадра, чтобы фон секции совпадал с роликом */
  var FILM_N = 301;
  var FILM_COLS = "bab0a1bdb2a3bdb2a3bdb2a2bcb2a2bcb1a2bcb1a2bbb0a1bab0a1b9afa0b9aea0b8ae9fb7ad9eb7ad9eb7ac9db7ac9db7ac9db7ac9db8ac9db9ad9db9ad9dbaad9dbaae9dbcaf9fc0b3a2c3b5a4c8b9a7cabaa8cbbba9cabaa8c9b9a7c7b7a5c6b5a3c4b3a1bfad9bbdab99bdaa98baa794ad9a88a89381a58f7d9e816c9b7d69967864957662967662a07e69a6836eae8a74b59079b79079b58d75b38c74b48d75b38970b7896fc28e70c69273cc9676ce9777ce9878ce9877cd9777ca9474c58f6fc28c6dbb8668b88365b47f62b27d61b17c60b07b5fb07b5eaf7a5daf795daf795dae785cad775bac765aab7559ab7458a97357a97357a87256a67054a56f54a46e53a46e52a36d52a26c52a26c51a06c529e6b529a684f93624b8e5e488455417e513e734b386b46356947366a4a3a6a4c3c6d503f5b403050352455362160402965452e5e3d2b5c392b562f33572a43622b687837948a45adbd6de1d681eedf8eedc875dcb160ce7d3da467308f421b6528113f1d0c30160d23190f251e122b21142f22153024163324173525173627173927183928183a29183c2a193d2b1a3e2b1a3e2d1b402d1b412f1c42301d44311e44321e46331f47341f4836204936214a39224c3b234c3c254d3d254d3e264e3e264f3e264f3e274f4027503f2751402851402852412952412953412953422a54432b55452d58482f5b49305c4b325f4b316049305e462e59432c553d284d3c274b3b26493b26493c2749442e4e452f4f4730524b36564730525a416170547085647d8e698792738d5d436756406253435f6356696f6371847b7e8f8687a19894ada39eb2a8a1b8aea6bab0a8bcb2a9bdb3aabeb4abbeb4abbfb4abbfb5acc0b6acc0b6adc0b6adc0b6adc0b7adc1b7adc1b7adc1b7adc1b7adc1b8adc1b8adc1b8adc1b8adc1b8adc1b8adc1b8adc1b8adc2b8adc2b8adc2b8adc3b9aec3b9afc3b9b0c3b9b0c1b7aec2b8afc3b8afc3b9afc2b7aebdb2abbbb1a9bbb1a9bdb3abbfb4abc3b8afc2b6acc3b8aec2b7aec1b7aebbb0a7bbb0a8beb3aac5baafc4b9afc7bcb1c6bab0c7bbb0c6bbafc9beb1c7bcafc6bbafc7bcafc7bcafc7bbadc6baacc7bbacc8bcadcabeaecbbeaecbbfafccbfb0ccbfb0cdc1b1cfc2b2d2c5b4d5c7b7d7c9b8dacbbadbcdbbdecfbee1d1c0e2d2c0e4d3c1e4d3c1e5d4c1e5d4c1e5d4c2e5d4c1e5d4c1e4d4c1e4d3c1e4d3c1e4d3c1e4d3c1e4d3c1e3d3c1e3d3c1e2d2c0e2d2c0e2d2c0e2d2c0e2d2c0";
  var film = $("#ideya");
  if (film) (function () {
    var cv = $("#filmCanvas"), ctx = cv && cv.getContext("2d");
    var bar = $("#filmBar"), caps = $$(".film__cap", film);
    if (reduced || !ctx) { film.classList.add("film--static"); return; }

    var small = window.innerWidth < 700;   /* телефон: кадры 1280px, компьютер: 1600px */
    var dir = "assets/film/" + (small ? "m2" : "d2") + "/";   /* новая версия ролика = новая папка, кеш браузера годовой */
    var frames = new Array(FILM_N), got = 0, started = false;
    var cur = 0, want = 0, drawn = -1, cw = 0, chh = 0;

    function src(i) { return dir + ("00" + (i + 1)).slice(-3) + ".webp"; }
    /* сначала каждый 16-й кадр, потом заполняем промежутки: ролик листается сразу, а не после загрузки всего */
    function order() {
      var seen = {}, out = [];
      [16, 8, 4, 2, 1].forEach(function (st) {
        for (var i = 0; i < FILM_N; i += st) if (!seen[i]) { seen[i] = 1; out.push(i); }
        if (!seen[FILM_N - 1]) { seen[FILM_N - 1] = 1; out.push(FILM_N - 1); }
      });
      return out;
    }
    function load() {
      if (started) return;
      started = true;
      var q = order(), live = 0;
      function next() {
        while (live < 6 && q.length) {
          (function (i) {
            var im = new Image();
            live++;
            im.decoding = "async";
            im.onload = function () {
              frames[i] = im; got++; live--;
              if (got === 1 || got % 20 === 0) drawn = -1;
              if (got > 24) film.classList.add("is-ready");
              next();
            };
            im.onerror = function () { live--; next(); };
            im.src = src(i);
          })(q.shift());
        }
      }
      next();
    }

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      cw = Math.round(r.width * dpr); chh = Math.round(r.height * dpr);
      if (cv.width !== cw) cv.width = cw;
      if (cv.height !== chh) cv.height = chh;
      drawn = -1;
    }
    function near(i, step) {
      for (var k = i; k >= 0 && k < FILM_N; k += step) if (frames[k]) return k;
      return -1;
    }
    /* кадр на экране. На широком экране как object-fit: cover.
       На вертикальном (телефон) кадр крупный, но не уже 42% ширины ролика, края растворяются в фоне,
       а к финалу камера отъезжает, чтобы были видны и Александр, и сайты */
    var box = { x: 0, y: 0, w: 0, h: 0 };
    function place(iw, ih, z) {
      var cover = Math.max(cw / iw, chh / ih), fit = Math.min(cw / iw, chh / ih);
      var s = cover, cy = 0.5;
      if (cw / chh < 1.3) { s = Math.min(cover, cw / (iw * 0.42)); cy = 0.42; s = s * Math.pow(fit / s, z); }
      var w = iw * s, h = ih * s, y = h >= chh ? (chh - h) / 2 : clamp(chh * cy - h / 2, 0, chh - h);
      box.x = (cw - w) / 2; box.y = y; box.w = w; box.h = h;
    }
    function paint(im, a) {
      ctx.globalAlpha = a;
      ctx.drawImage(im, box.x, box.y, box.w, box.h);
    }
    function edges(hex) {
      if (box.h >= chh - 1) return;
      var f = Math.min(box.h * 0.16, 90 * (cw / cv.clientWidth || 1));
      var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
      var c0 = "rgba(" + r + "," + g + "," + b + ",1)", c1 = "rgba(" + r + "," + g + "," + b + ",0)";
      var gr = ctx.createLinearGradient(0, box.y, 0, box.y + f);
      gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      ctx.fillStyle = gr; ctx.fillRect(0, box.y - 1, cw, f + 1);
      gr = ctx.createLinearGradient(0, box.y + box.h - f, 0, box.y + box.h);
      gr.addColorStop(0, c1); gr.addColorStop(1, c0);
      ctx.fillStyle = gr; ctx.fillRect(0, box.y + box.h - f, cw, f + 1);
    }
    function render() {
      var i = Math.floor(cur), f = cur - i;
      var lo = near(i, -1), hi = near(Math.min(i + 1, FILM_N - 1), 1);
      if (lo < 0) lo = hi;
      if (lo < 0) return;
      var key = lo * 1000 + (hi === lo + 1 ? Math.round(f * 20) : 0) + cw * 1e7;
      if (key === drawn) return;
      drawn = key;
      var c = FILM_COLS.substr(lo * 6, 6);
      var z = range(cur / (FILM_N - 1), 0.8, 0.96); z = z * z * (3 - 2 * z);
      place(frames[lo].naturalWidth, frames[lo].naturalHeight, z);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#" + c;
      ctx.fillRect(0, 0, cw, chh);
      paint(frames[lo], 1);
      if (hi === lo + 1 && f > 0.02) paint(frames[hi], f);   /* мягкая склейка соседних кадров */
      ctx.globalAlpha = 1;
      edges(c);
      film.style.setProperty("--fbg", "#" + c);
      var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
      film.classList.toggle("is-dark", (0.299 * r + 0.587 * g + 0.114 * b) < 120);
    }

    /* подписи: [появилась, исчезает] в долях ролика */
    var CAPS = [[-1, 0.15], [0.33, 0.56], [0.64, 0.82], [0.9, 2]];
    function prog() {
      var r = film.getBoundingClientRect();
      return clamp(-r.top / (film.offsetHeight - window.innerHeight), 0, 1);
    }
    function frameTarget() {
      var p = prog();
      var v = clamp(p / 0.94, 0, 1);   /* последний кадр держим до конца секции */
      want = v * (FILM_N - 1);
      if (bar) bar.style.transform = "scaleX(" + v.toFixed(4) + ")";
      caps.forEach(function (el, k) {
        var a = CAPS[k][0], z = CAPS[k][1];
        var o = range(v, a, a + 0.05) * (1 - range(v, z - 0.04, z));
        el.style.opacity = o.toFixed(3);
        el.style.transform = "translate3d(0," + (26 * (1 - range(v, a, a + 0.05))).toFixed(1) + "px,0)";
        el.style.pointerEvents = o > 0.5 ? "auto" : "none";
      });
    }

    var on = false;
    function tick() {
      if (!on) return;
      cur += (want - cur) * 0.2;
      if (Math.abs(want - cur) < 0.01) cur = want;
      render();
      requestAnimationFrame(tick);
    }
    if ("IntersectionObserver" in window) {
      /* грузим заранее, за полтора экрана до секции */
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) load(); }, { rootMargin: "150% 0px" }).observe(film);
      new IntersectionObserver(function (es) {
        var was = on; on = es[0].isIntersecting;
        if (on && !was) { size(); frameTarget(); cur = want; requestAnimationFrame(tick); }
      }).observe(film);
    } else { load(); on = true; requestAnimationFrame(tick); }
    window.addEventListener("load", function () { setTimeout(load, 2500); });
    window.addEventListener("scroll", function () { if (on) frameTarget(); }, { passive: true });
    window.addEventListener("resize", function () { size(); frameTarget(); });
    size(); frameTarget();
  })();

  /* ---------- 5. Вопросы ---------- */
  var FAQ = [
    ["Сколько времени занимает сайт?", "Лендинг 5-7 дней, сайт с приложением 10-14 дней, проект с 3D до трёх недель. Отсчёт идёт с момента, когда вы прислали тексты и фото. Если материалов нет, помогаю их собрать, это добавляет пару дней."],
    ["Что нужно от меня, кроме денег?", "Полчаса на звонок и ответы на вопросы по ходу работы. Тексты, структуру и подбор картинок беру на себя, вы только проверяете, что всё правда про ваш бизнес."],
    ["Сайт останется моим?", "Да. Домен оформляем на вас, доступы отдаю все. Если решите уйти к другому разработчику или вести сайт самостоятельно, ничего не заблокируется."],
    ["Что если мне не понравится дизайн?", "Первый экран показываю до того, как начну собирать остальное. На этом этапе правки бесплатные и без ограничений. Дальше две бесплатные правки по мелочам, крупные переделки обсуждаем отдельно."],
    ["Можно без поддержки?", "Можно. Тогда сайт живёт сам, а правки я считаю почасово. С поддержкой за сайтом кто-то присматривает: резервные копии, обновления, мелкие правки без отдельного счёта и ответ в тот же день. Хостинг и домен в обоих случаях оплачиваете вы напрямую провайдеру, счёт приходит вам, а не мне."],
    ["Можно получать клиентов без рекламы?", "Да, через поиск и нейросети. В тарифе «Сайт высшего уровня» я настраиваю SEO под Яндекс и Google и AI SEO под ChatGPT, Gemini, Claude, DeepSeek и Алису. Первые заявки из поиска обычно появляются в течение двух месяцев. Точный срок зависит от ниши и конкуренции в вашем городе, это честно скажу на звонке."],
    ["Как с вами связаться?", "По телефону +7 991 914-98-54. Если не дозвонились, напишите SMS на этот же номер, перезвоню в тот же день. Можно написать и в WhatsApp или Telegram."],
    ["Как происходит оплата?", "Предоплаты нет. Сначала делаю работу, показываю вам почти готовый сайт, и вы платите, когда он готов примерно на 80 процентов. После оплаты довожу до конца, подключаю домен и запускаю. Работаю по договору или самозанятым чеком, как вам удобнее для бухгалтерии."]
  ];
  var faqEl = $("#faqList");
  if (faqEl) {
    faqEl.innerHTML = FAQ.map(function (f, i) {
      return '<div class="qa"><button class="qa__q" type="button" aria-expanded="false" aria-controls="a' + i + '">' +
             "<span>" + f[0] + '</span><span class="qa__ico"></span></button>' +
             '<div class="qa__a" id="a' + i + '" role="region"><p>' + f[1] + "</p></div></div>";
    }).join("");
    $$(".qa__q", faqEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var qa = btn.parentNode, body = btn.nextElementSibling, open = qa.classList.contains("is-open");
        $$(".qa.is-open", faqEl).forEach(function (o) {
          o.classList.remove("is-open");
          o.querySelector(".qa__a").style.height = "0px";
          o.querySelector(".qa__q").setAttribute("aria-expanded", "false");
        });
        if (!open) {
          qa.classList.add("is-open");
          body.style.height = body.scrollHeight + "px";
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------- 6. Появление блоков ---------- */
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    $$(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 0.07 + "s";
      io.observe(el);
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- 7. Плавная прокрутка по якорям ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      var y = window.scrollY + t.getBoundingClientRect().top - 74;
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    });
  });

  onScroll();
})();
