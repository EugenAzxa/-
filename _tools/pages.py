# -*- coding: utf-8 -*-
"""Страницы услуг: презентации и AI-видео. Собираются из build_blog.py."""

TEL = "+79919149854"
PHONE = "+7 991 914-98-54"


def contact(title, note):
    return """<section class="section section--ink" id="kontakt">
  <div class="wrap contact">
    <div class="contact__text">
      <p class="eyebrow eyebrow--light">Цена по договорённости</p>
      <h2 class="h2">%(t)s</h2>
      <p class="contact__note">%(n)s</p>
      <a class="phone" href="tel:%(tel)s">%(ph)s</a>
      <div class="contact__btns">
        <a class="btn btn--light" href="tel:%(tel)s">Позвонить</a>
        <a class="btn btn--ghostLight" href="https://wa.me/79919149854" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn btn--ghostLight" href="https://t.me/+79919149854" target="_blank" rel="noopener">Telegram</a>
        <a class="btn btn--ghostLight" href="sms:%(tel)s">SMS</a>
      </div>
      <p class="contact__small">Связь по телефону. Если не дозвонились, напишите SMS на этот номер, перезвоню в тот же день.</p>
    </div>
    <img class="contact__man" src="/assets/img/stand.webp" alt="Александр в полный рост" loading="lazy" decoding="async">
  </div>
</section>
""" % dict(t=title, n=note, tel=TEL, ph=PHONE)


def slide(src, alt, cap, wide=False):
    return """<figure class="slide reveal%s">
  <a href="%s" target="_blank" rel="noopener"><img src="%s" alt="%s" loading="lazy" decoding="async" width="1400" height="788"></a>
  <figcaption>%s</figcaption>
</figure>""" % (" slide--wide" if wide else "", src, src, alt, cap)


def clip(name, cap, tag, shape="h"):
    return """<figure class="clip clip--%s reveal">
  <video src="/assets/work/ai/%s.mp4" poster="/assets/work/ai/%s.jpg" muted loop playsinline preload="none" aria-label="%s"></video>
  <figcaption><span>%s</span>%s</figcaption>
</figure>""" % (shape, name, name, cap, tag, cap)


PRES = {
    "slug": "prezentacii",
    "title": "Презентации любой сложности на заказ - Александр",
    "desc": "Презентации для инвесторов, коммерческие предложения, отчёты, каталоги и выступления. Структура, тексты, дизайн и AI-иллюстрации. Цена по договорённости.",
    "nav": "pres",
    "body": """
<section class="seo-hero">
  <div class="wrap">
    <a class="seo-back" href="/">
      <svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
      На главную
    </a>
    <p class="eyebrow"><span class="dot"></span> Презентации</p>
    <h1 class="seo-h1">Презентации<br>любой сложности</h1>
    <p class="seo-lead">Для инвесторов, клиентов, партнёров и сцены. Придумываю структуру, пишу тексты, рисую слайды и иллюстрации с помощью нейросетей. Вы приходите с идеей, уходите с готовым файлом.</p>
    <div class="svc-price">
      <b>Цена по договорённости</b>
      <span>Зависит от количества слайдов, текстов и иллюстраций. Назову после короткого звонка.</span>
    </div>
    <div class="hero__cta svc-cta">
      <a class="btn btn--lg" href="tel:+79919149854">Обсудить презентацию</a>
      <a class="btn btn--ghost btn--lg" href="#raboty">Смотреть работы</a>
    </div>
  </div>
</section>

<section class="section section--dark" id="raboty">
  <div class="wrap">
    <header class="shead reveal">
      <p class="eyebrow">Работа</p>
      <h2 class="h2">Кино-альбом выпуска<br>для фотостудии «Миллениум»</h2>
      <p class="shead__note">Презентация услуги для школ: концепция, тексты, структура продаж и все иллюстрации сгенерированы нейросетями под задачу. Тёмный кинематографичный стиль под тему «выпускной как премьера».</p>
    </header>
    <div class="slides">
%(mil)s
    </div>
  </div>
</section>

<section class="section" id="stili">
  <div class="wrap">
    <header class="shead reveal">
      <p class="eyebrow">Примеры стилей</p>
      <h2 class="h2">Под любую задачу<br>и любой характер</h2>
      <p class="shead__note">Шесть слайдов для вымышленных компаний, чтобы показать разброс: от строгого отчёта до сцены конференции. Каждый стиль подбираю под вашу аудиторию.</p>
    </header>
    <div class="slides slides--3">
%(styles)s
    </div>
  </div>
</section>

<section class="section section--tint" id="chto">
  <div class="wrap">
    <header class="shead reveal">
      <p class="eyebrow">Что делаю</p>
      <h2 class="h2">Какие бывают<br>презентации</h2>
    </header>
    <div class="seo-grid">
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/></svg><h3>Для инвесторов</h3><p>Питч-дек на 10-15 слайдов: проблема, решение, рынок, модель, команда, сколько денег и на что.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><h3>Коммерческое предложение</h3><p>Что вы предлагаете, сколько стоит и почему именно вы. Удобно отправить клиенту в PDF после звонка.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg><h3>Отчёты и итоги года</h3><p>Цифры превращаются в понятную инфографику, а не в таблицу на весь экран.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/></svg><h3>Товар и каталог</h3><p>Презентация продукта, линейки или каталога для дилеров и маркетплейсов.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg><h3>Выступления</h3><p>Слайды для сцены: крупно, мало текста, сильные картинки. Помогу и с текстом самого выступления.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg><h3>Обучение и курсы</h3><p>Уроки, инструкции для сотрудников, онбординг. Сложное объясняю схемами.</p></article>
    </div>
  </div>
</section>

<section class="section" id="vhodit">
  <div class="wrap wrap--narrow">
    <header class="shead reveal">
      <p class="eyebrow">Что входит</p>
      <h2 class="h2">От идеи<br>до готового файла</h2>
    </header>
    <dl class="gloss reveal">
      <div><dt>Структура</dt><dd>Выстраиваю логику так, чтобы слушатель шёл от проблемы к решению и к нужному вам действию.</dd></div>
      <div><dt>Тексты</dt><dd>Пишу коротко и по делу. Одна мысль на слайд, без простыней.</dd></div>
      <div><dt>Дизайн</dt><dd>Свой стиль под ваш бренд или с нуля. Сетка, шрифты, цвета, иконки.</dd></div>
      <div><dt>Иллюстрации</dt><dd>Фото, сцены и визуализации, сгенерированные нейросетями под задачу, а не стоковые картинки, которые видели все.</dd></div>
      <div><dt>Форматы</dt><dd>PowerPoint, PDF, Google Slides, Keynote или веб-презентация по ссылке с анимацией.</dd></div>
    </dl>
  </div>
</section>
""",
    "contact": ("Расскажите, кому и зачем<br>нужна презентация", "Цена зависит от количества слайдов, текстов и иллюстраций. Назову её после короткого звонка. Если нужно срочно к конкретной дате, тоже скажите сразу."),
}

PRES["body"] = PRES["body"] % dict(
    mil="\n".join([
        slide("/assets/work/pres/kino-1.webp", "Титульный слайд: кино-альбом выпуска", "Титул: идея одной фразой", True),
        slide("/assets/work/pres/kino-3.webp", "Слайд: как проходит съёмка", "Как это работает: 4 шага"),
        slide("/assets/work/pres/kino-4.webp", "Слайд: кинопостер выпуска", "Сюжет 1: кинопостер"),
        slide("/assets/work/pres/kino-5.webp", "Слайд: обложка журнала", "Сюжет 2: обложка журнала"),
        slide("/assets/work/pres/kino-6.webp", "Слайд: миссия на Марсе", "Сюжет 3: фантастика"),
        slide("/assets/work/pres/kino-7.webp", "Слайд: что вы получаете", "Результат для клиента"),
    ]),
    styles="\n".join([
        slide("/assets/work/pres/svetlyak-title.webp", "Титул питч-дека стартапа зарядных станций", "Питч-дек: титул"),
        slide("/assets/work/pres/svetlyak-market.webp", "Слайд о рынке с графиком роста", "Питч-дек: рынок"),
        slide("/assets/work/pres/garage-offer.webp", "Коммерческое предложение автосервиса", "Коммерческое предложение"),
        slide("/assets/work/pres/bakery-report.webp", "Итоги года сети пекарен в инфографике", "Отчёт с инфографикой"),
        slide("/assets/work/pres/chair-product.webp", "Слайд товара: кресло с вариантами обивки", "Товар и каталог"),
        slide("/assets/work/pres/keynote-ai.webp", "Слайд выступления о нейросетях", "Выступление на конференции"),
    ]))

AI = {
    "slug": "ai-video",
    "title": "AI-видео любой сложности: реклама, анимация, оживление фото - Александр",
    "desc": "Рекламные ролики, анимация логотипа, оживление фото, исторические сцены и видео для сайта с помощью нейросетей. Цена по договорённости.",
    "nav": "ai",
    "dark": True,
    "body": """
<section class="ai-hero2">
  <video class="ai-hero2__bg" src="/assets/work/ai/pupil-dive.mp4" poster="/assets/work/ai/pupil-dive.jpg" muted loop playsinline autoplay aria-hidden="true"></video>
  <div class="ai-hero2__shade" aria-hidden="true"></div>
  <div class="wrap ai-hero2__in">
    <a class="seo-back seo-back--light" href="/">
      <svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
      На главную
    </a>
    <p class="eyebrow eyebrow--light"><span class="dot"></span> AI-видео</p>
    <h1 class="seo-h1">AI-видео<br>любой сложности</h1>
    <p class="seo-lead">Реклама, анимация логотипа, оживление фото, сцены, которые дорого или невозможно снять на камеру. Делаю на нейросетях: Kling, Seedance, Veo и других, в горизонтальном и вертикальном формате.</p>
    <div class="svc-price svc-price--dark">
      <b>Цена по договорённости</b>
      <span>Зависит от длины, количества сцен и сложности. Назову после короткого звонка.</span>
    </div>
    <div class="hero__cta svc-cta">
      <a class="btn btn--light btn--lg" href="tel:+79919149854">Обсудить ролик</a>
      <a class="btn btn--ghostLight btn--lg" href="#raboty">Смотреть работы</a>
    </div>
  </div>
</section>

<section class="section section--dark" id="raboty">
  <div class="wrap">
    <header class="shead reveal">
      <p class="eyebrow">Работы</p>
      <h2 class="h2">Ролик для этого сайта</h2>
      <p class="shead__note">Камера заходит в глаз, пролетает через мозг, где собираются сайты, и сайты вылетают наружу. На главной он проигрывается по прокрутке. Пять ключевых кадров по студийным фото и четыре перехода на нейросетях.</p>
    </header>
    <div class="clips clips--2">
%(film)s
    </div>

    <h3 class="ai-sub reveal">Реклама и продукт</h3>
    <div class="clips clips--3">
%(ads)s
    </div>

    <h3 class="ai-sub reveal">Вертикальные ролики и персонажи</h3>
    <p class="ai-subnote reveal">Формат 9:16 для Reels, Shorts, TikTok и VK Клипов.</p>
    <div class="clips clips--v">
%(vert)s
    </div>

    <h3 class="ai-sub reveal">AI-фото и раскадровки</h3>
    <p class="ai-subnote reveal">Из этих кадров потом собираются ролики: один персонаж в разных ракурсах, предметная съёмка без студии.</p>
    <div class="stills">
      <figure class="still still--wide reveal"><img src="/assets/work/ai/cars.webp" alt="Два внедорожника в поле, сгенерированная предметная съёмка" loading="lazy" decoding="async"><figcaption>Предметная съёмка авто без площадки и фотографа</figcaption></figure>
      <figure class="still still--tall reveal"><img src="/assets/work/ai/hair-sheet.webp" alt="Персонаж в девяти ракурсах" loading="lazy" decoding="async"><figcaption>Лист персонажа: 9 ракурсов для роликов</figcaption></figure>
      <figure class="still reveal"><img src="/assets/work/ai/eye.webp" alt="Макросъёмка глаза" loading="lazy" decoding="async"><figcaption>Макро-кадр для перехода</figcaption></figure>
      <figure class="still reveal"><img src="/assets/work/ai/brain.webp" alt="Нейронная вселенная с сайтами" loading="lazy" decoding="async"><figcaption>Сцена, которую не снять камерой</figcaption></figure>
    </div>
  </div>
</section>

<section class="section section--tint" id="chto">
  <div class="wrap">
    <header class="shead reveal">
      <p class="eyebrow">Что делаю</p>
      <h2 class="h2">Какие бывают<br>AI-ролики</h2>
    </header>
    <div class="seo-grid">
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg><h3>Реклама</h3><p>Кофейня, цветы, авто, недвижимость, приложение. Ролик без съёмочной группы, площадки и аренды техники.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><h3>Анимация логотипа</h3><p>Логотип собирается, вращается, оживает. Для заставки ролика, сайта или экрана загрузки приложения.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg><h3>Оживление фото</h3><p>Человек на фото улыбается, поворачивается, машет рукой. Подходит для поздравлений и истории компании.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><h3>История и обучение</h3><p>Учёные, изобретатели, эпохи. Оживлённые сцены для курсов, музеев и образовательных проектов.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M12 3v18"/><path d="M5 8h14"/><path d="M5 16h14"/></svg><h3>Видео для сайта</h3><p>Ролик, который играет по прокрутке, как на главной этого сайта. Самый запоминающийся первый экран.</p></article>
      <article class="seo-card reveal"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg><h3>Перенос движения</h3><p>Ваш персонаж повторяет движения из любого видео: танец, жест, походку. Лица реальных людей только с их согласия.</p></article>
    </div>
  </div>
</section>

<section class="section" id="kak">
  <div class="wrap wrap--narrow">
    <header class="shead reveal">
      <p class="eyebrow">Как работаем</p>
      <h2 class="h2">От идеи<br>до готового ролика</h2>
    </header>
    <dl class="gloss reveal">
      <div><dt>Сценарий</dt><dd>Обсуждаем идею, я расписываю сцены по секундам: что в кадре и куда движется камера.</dd></div>
      <div><dt>Ключевые кадры</dt><dd>Сначала показываю картинки каждой сцены. Правки на этом шаге быстрые и дешёвые.</dd></div>
      <div><dt>Анимация</dt><dd>Оживляю кадры и склеиваю переходы, выбираю лучшие варианты из нескольких попыток.</dd></div>
      <div><dt>Монтаж</dt><dd>Склейка, цвет, текст, музыка. Отдаю в нужных форматах: 16:9, 9:16, 1:1.</dd></div>
    </dl>
  </div>
</section>
""",
    "contact": ("Опишите ролик,<br>который хотите увидеть", "Цена зависит от длины, количества сцен и сложности. Назову после короткого звонка. Если есть пример ролика, который нравится, пришлите его в WhatsApp."),
}

AI["body"] = AI["body"] % dict(
    film="\n".join([
        clip("eye-in", "Наезд камеры в глаз", "Переход"),
        clip("pupil-dive", "Через зрачок в мозг", "Переход"),
        clip("ear-out", "Сайты вылетают из уха", "Переход"),
        clip("sites-arc", "Финал: шесть сайтов рядом", "Переход"),
    ]),
    ads="\n".join([
        clip("coffee", "Реклама кофейни", "Реклама"),
        clip("peonies", "Цветочный магазин", "Реклама"),
        clip("apartment", "Недвижимость", "Реклама"),
        clip("supercar", "Автомобиль в студии", "Продукт"),
        clip("tablet-ad", "Реклама приложения", "Продукт"),
        clip("logo-loop", "Анимация логотипа", "Логотип"),
    ]),
    vert="\n".join([
        clip("inventor", "Изобретатель, 1900-е", "История", "v"),
        clip("tesla-lab", "Лаборатория, 1890-е", "История", "v"),
        clip("scholar", "Учёная античности", "История", "v"),
        clip("astronomer", "Астроном и звёзды", "Обучение", "v"),
        clip("jungle", "Исследовательница", "Персонаж", "v"),
        clip("tornado", "Мультфильм: торнадо", "Анимация", "v"),
        clip("logo-space", "Логотип в космосе", "Логотип", "v"),
        clip("rocket", "Ракета бренда", "Реклама", "v"),
        clip("motion-swap", "Перенос движения", "Персонаж", "v"),
        clip("car-build", "Машина собирается", "Эффект", "v"),
    ]))

PAGES = [PRES, AI]
