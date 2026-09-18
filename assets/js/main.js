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
  var ease  = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- 1. Интро ---------- */
  var intro = $("#intro");
  function killIntro() {
    if (!intro) return;
    intro.classList.add("is-out");
    document.body.classList.remove("is-locked");
    setTimeout(function () { intro && intro.remove(); intro = null; }, 900);
  }
  if (intro) {
    if (reduced) { intro.remove(); intro = null; }
    else {
      document.body.classList.add("is-locked");
      window.addEventListener("load", function () { setTimeout(killIntro, 900); });
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

  var stage = $("#hero"), sticky = stage && $(".stage__sticky", stage);
  var ideas = $("#ideas"), cue = $("#cue"), nav = $("#nav"), callbar = $(".callbar");
  var scenes = $$("[data-scene]");
  var vw = 0, vh = 0, mobile = false, px = 0, py = 0, tx = 0, ty = 0;
  var CAM = {};

  LAYERS.forEach(function (L) { L.el = $('[data-layer="' + L.key + '"]'); L.ratio = L.h / L.w; });

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    mobile = vw < 860;
    /* ширина кепки на экране: от крупного плана до фигуры в полный рост */
    CAM.hw0 = mobile ? vw * 0.98 : Math.min(vw * 0.38, 620);
    CAM.hw1 = LAYERS[2].hw * (LAYERS[2].w * (vh * (mobile ? 0.62 : 0.74)) / LAYERS[2].h);
    CAM.y0  = (mobile ? 0.58 : 0.60) * vh;
    CAM.y1  = (mobile ? 0.24 : 0.16) * vh;
    CAM.x0  = (mobile ? 0.50 : 0.68) * vw;
    CAM.x1  = (mobile ? 0.50 : 0.66) * vw;
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
    var band = { faceOut: [0.46, 0.55], fullIn: [0.155, 0.19] };   /* доли от hw0 */
    var k = hw / CAM.hw0;

    LAYERS.forEach(function (L) {
      if (!L.el) return;
      var iw = hw / L.hw, ih = iw * L.ratio;
      var o;
      if (L.key === "face")  o = range(k, band.faceOut[0], band.faceOut[1]);
      else if (L.key === "full") o = 1 - range(k, band.fullIn[0], band.fullIn[1]);
      else o = (1 - range(k, band.faceOut[0], band.faceOut[1])) * range(k, band.fullIn[0], band.fullIn[1]);
      L.el.style.opacity = o.toFixed(3);
      if (o < 0.002) { L.el.style.visibility = "hidden"; return; }
      L.el.style.visibility = "visible";
      L.el.style.transform = "translate3d(" + (ax - L.hx * iw).toFixed(1) + "px," +
                             (ay - L.hy * ih).toFixed(1) + "px,0) scale(" + (iw / L.w).toFixed(4) + ")";
    });

    if (ideas) {
      var io = 1 - range(p, 0.03, 0.15);
      ideas.style.opacity = io.toFixed(3);
      ideas.style.setProperty("--ix", ax.toFixed(1) + "px");
      ideas.style.setProperty("--iy", (ay - (mobile ? 16 : 26) - (1 - io) * 80).toFixed(1) + "px");
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
      draw(progress());
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
  function loop() {
    tx += (px - tx) * .06;
    ty += (py - ty) * .06;
    if (Math.abs(px - tx) > .1 || Math.abs(py - ty) > .1) draw(progress());
    requestAnimationFrame(loop);
  }

  if (location.search.indexOf("dev=1") >= 0) window.__draw = draw;   /* отладка кадров */

  if (stage && !reduced) {
    measure(); draw(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); draw(progress()); });
    window.addEventListener("pointermove", pointer, { passive: true });
    requestAnimationFrame(loop);
  } else if (stage) {
    var ph = $("#photo"); if (ph) ph.style.cssText = "position:static;text-align:center";
    LAYERS[1].el && (LAYERS[1].el.style.cssText = "position:static;opacity:1;width:min(420px,70vw);margin:0 auto");
    LAYERS[0].el && LAYERS[0].el.remove();
    LAYERS[2].el && LAYERS[2].el.remove();
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

  /* ---------- 4. Примеры под ниши ---------- */
  var DEMOS = [
    { n:"Кофейня", url:"zerno-coffee.ru", logo:"ЗЕРНО", ac:"#B4653C", bg:"#FFF9F3", ink:"#2A1B12",
      h:"Кофе, ради которого<br>стоит выйти из дома",
      p:"Обжариваем сами, варим при вас. Завтраки с 8 утра, навынос за 3 минуты.",
      b1:"Меню и цены", b2:"Забронировать стол",
      c:[["Завтраки","Каша, сырники, яйца бенедикт с 8:00"],["Своя обжарка","Зерно из Эфиопии и Бразилии"],["Навынос","Заказ через сайт, забираете без очереди"]] },
    { n:"Автосервис", url:"garage47.ru", logo:"ГАРАЖ 47", ac:"#1F6FEB", bg:"#F3F6FB", ink:"#101828",
      h:"Ремонт без сюрпризов<br>в счёте",
      p:"Диагностика за 30 минут, смета до начала работ, гарантия на работы 12 месяцев.",
      b1:"Записаться", b2:"Рассчитать стоимость",
      c:[["Диагностика","Показываем ошибки на экране вместе с вами"],["Смета заранее","Ни одной работы без вашего согласия"],["Гарантия","Год на работы и установленные детали"]] },
    { n:"Барбершоп", url:"britva.ru", logo:"БРИТВА", ac:"#C9A227", bg:"#17161A", ink:"#F4F1EA",
      h:"Стрижка, борода,<br>горячее полотенце",
      p:"Пять мастеров, запись онлайн, кофе и разговор по желанию клиента.",
      b1:"Записаться онлайн", b2:"Цены",
      c:[["Онлайн-запись","Выбираете мастера и время за 20 секунд"],["Мастера","Профили, работы и свободные окна"],["Абонемент","Шесть стрижек по цене пяти"]] },
    { n:"Фитнес", url:"forma-fit.ru", logo:"ФОРМА", ac:"#12A97A", bg:"#F1FBF7", ink:"#0C2A20",
      h:"Зал, где вам покажут,<br>что делать",
      p:"Первая тренировка с тренером бесплатно. Расписание и абонемент в личном кабинете.",
      b1:"Пробная тренировка", b2:"Расписание",
      c:[["Личный кабинет","Абонемент, заморозка и история тренировок"],["Расписание","Запись на группу в два касания"],["Тренеры","Специализация, опыт и отзывы"]] },
    { n:"Юрист", url:"pravodelo.ru", logo:"ПРАВО И ДЕЛО", ac:"#1B3A6B", bg:"#F5F6F9", ink:"#111827",
      h:"Разберём вашу ситуацию<br>на первом звонке",
      p:"Банкротство, споры с застройщиком, семейные дела. Работаем по договору и фиксированной цене.",
      b1:"Бесплатная консультация", b2:"Услуги и цены",
      c:[["Фиксированная цена","Стоимость в договоре, без доплат по ходу"],["Отчёт по делу","Видите каждый шаг в личном кабинете"],["Практика","Выигранные дела и суммы"]] },
    { n:"Цветы", url:"pion-shop.ru", logo:"ПИОН", ac:"#D6486E", bg:"#FFF6F8", ink:"#2B1119",
      h:"Букет у двери<br>через два часа",
      p:"Собираем при вас, отправляем фото букета до доставки. Работаем круглосуточно.",
      b1:"Собрать букет", b2:"Каталог",
      c:[["Фото до отправки","Согласовываем букет в мессенджере"],["Два часа","Доставка по городу и области"],["Подписка","Свежие цветы в офис каждую неделю"]] }
  ];

  var tabsEl = $("#demoTabs"), viewEl = $("#demoView"), urlEl = $("#demoUrl");
  function renderDemo(i) {
    var d = DEMOS[i];
    if (!viewEl) return;
    urlEl.textContent = d.url;
    viewEl.style.background = d.bg;
    viewEl.style.color = d.ink;
    viewEl.innerHTML =
      '<div class="mini">' +
        '<div class="mini__nav"><span class="mini__logo">' + d.logo + '</span>' +
          '<span class="mini__menu"><span>Услуги</span><span>О нас</span><span>Отзывы</span><span>Контакты</span></span>' +
          '<span class="mini__cta" style="background:' + d.ac + '">Оставить заявку</span></div>' +
        '<div class="mini__hero"><div>' +
          '<div class="mini__h">' + d.h + '</div><div class="mini__p">' + d.p + '</div>' +
          '<div class="mini__row"><span class="mini__pill" style="background:' + d.ac + '">' + d.b1 + '</span>' +
          '<span class="mini__pill mini__pill--o">' + d.b2 + '</span></div></div>' +
          '<div class="mini__art" style="background:linear-gradient(150deg,' + d.ac + ',' + d.ac + '22)"></div>' +
        '</div>' +
        '<div class="mini__cards">' + d.c.map(function (c) {
          return '<div class="mini__card"><b>' + c[0] + '</b><span>' + c[1] + '</span><div class="mini__bar"></div></div>';
        }).join("") + '</div>' +
      '</div>';
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
      if (auto < 0 || document.hidden) return;
      var wrap = $("#primery").getBoundingClientRect();
      if (wrap.top > vh || wrap.bottom < 0) return;
      auto = (auto + 1) % DEMOS.length;
      renderDemo(auto);
    }, 4200);
  }

  /* ---------- 5. Вопросы ---------- */
  var FAQ = [
    ["Сколько времени занимает сайт?", "Лендинг 5-7 дней, сайт с приложением 10-14 дней, проект с 3D до трёх недель. Отсчёт идёт с момента, когда вы прислали тексты и фото. Если материалов нет, помогаю их собрать, это добавляет пару дней."],
    ["Что нужно от меня, кроме денег?", "Полчаса на звонок и ответы на вопросы по ходу работы. Тексты, структуру и подбор картинок беру на себя, вы только проверяете, что всё правда про ваш бизнес."],
    ["Сайт останется моим?", "Да. Домен оформляем на вас, доступы отдаю все. Если решите уйти к другому разработчику или вести сайт самостоятельно, ничего не заблокируется."],
    ["Что если мне не понравится дизайн?", "Первый экран показываю до того, как начну собирать остальное. На этом этапе правки бесплатные и без ограничений. Дальше две бесплатные правки по мелочам, крупные переделки обсуждаем отдельно."],
    ["Можно без поддержки?", "Можно. Тогда хостинг и домен оплачиваете сами, а правки считаю почасово. Поддержка удобнее: сайт под присмотром, а мелкие правки не превращаются в отдельный счёт."],
    ["Как происходит оплата?", "Половина суммы до начала работы, половина после запуска. Работаю по договору или самозанятым чеком, как вам удобнее для бухгалтерии."]
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
