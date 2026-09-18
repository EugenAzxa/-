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
  var T0 = Date.now(), MIN_INTRO = 1250;
  var intro = $("#intro");
  function killIntro() {
    if (!intro) return;
    var wait = MIN_INTRO - (Date.now() - T0);
    if (wait > 0) { setTimeout(killIntro, wait); return; }   /* даём анимации доиграть */
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
      setTimeout(killIntro, 2600);
    }
  }

  /* ---------- 2. Камера: лицо -> корпус -> полный рост ---------- */
  /* геометрия кадров: доля ширины кепки, верх головы и её центр в самом изображении */
  var LAYERS = [
    { key:"face",  w:992, h:1712, hw:0.920, hy:0.001, hx:0.526 },
    { key:"torso", w:863, h:1500, hw:0.300, hy:0.003, hx:0.500 },
    { key:"full",  w:710, h:1500, hw:0.115, hy:0.000, hx:0.512 }
  ];

  var stage = $("#hero");
  var ideas = $("#ideas"), cue = $("#cue"), nav = $("#nav"), callbar = $(".callbar");
  var scenes = $$("[data-scene]");
  var vw = 0, vh = 0, mobile = false, px = 0, py = 0, tx = 0, ty = 0;
  var ent = 1, entT0 = 0, entOn = false, ENT_D = 1200;
  var CAM = {};

  LAYERS.forEach(function (L) { L.el = $('[data-layer="' + L.key + '"]'); L.ratio = L.h / L.w; });

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    mobile = vw < 860;
    /* ширина кепки на экране: от крупного плана до фигуры в полный рост */
    if (mobile) {
      CAM.hw0 = vw * 0.98;
      CAM.x0 = CAM.x1 = 0.50 * vw;
      CAM.y0 = 0.58 * vh; CAM.y1 = 0.30 * vh;
    } else {
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
      ideas.style.setProperty("--iy", (ay - (mobile ? 18 : 26) - (1 - io) * 80).toFixed(1) + "px");
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

  if (stage && !reduced) {
    draw(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); draw(progress()); });
    window.addEventListener("pointermove", pointer, { passive: true });
    requestAnimationFrame(loop);
    if (!intro) startEntrance();
    setTimeout(function () { if (!entOn && ent > 0) startEntrance(); }, 4000);  /* страховка */
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
              "Telegram-боты", "Анимации по прокрутке", "Домен и хостинг", "Поддержка сайтов"];
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

  /* ---------- 5. Вопросы ---------- */
  var FAQ = [
    ["Сколько времени занимает сайт?", "Лендинг 5-7 дней, сайт с приложением 10-14 дней, проект с 3D до трёх недель. Отсчёт идёт с момента, когда вы прислали тексты и фото. Если материалов нет, помогаю их собрать, это добавляет пару дней."],
    ["Что нужно от меня, кроме денег?", "Полчаса на звонок и ответы на вопросы по ходу работы. Тексты, структуру и подбор картинок беру на себя, вы только проверяете, что всё правда про ваш бизнес."],
    ["Сайт останется моим?", "Да. Домен оформляем на вас, доступы отдаю все. Если решите уйти к другому разработчику или вести сайт самостоятельно, ничего не заблокируется."],
    ["Что если мне не понравится дизайн?", "Первый экран показываю до того, как начну собирать остальное. На этом этапе правки бесплатные и без ограничений. Дальше две бесплатные правки по мелочам, крупные переделки обсуждаем отдельно."],
    ["Можно без поддержки?", "Можно. Тогда сайт живёт сам, а правки я считаю почасово. С поддержкой за сайтом кто-то присматривает: резервные копии, обновления, мелкие правки без отдельного счёта и ответ в тот же день. Хостинг и домен в обоих случаях оплачиваете вы напрямую провайдеру, счёт приходит вам, а не мне."],
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
