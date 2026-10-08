# -*- coding: utf-8 -*-
"""
Сборка блога: _blog/*.md -> blog/*.html, blog/index.html, блок "Из блога" на главной,
sitemap.xml, robots.txt, llms.txt.

Запуск из корня репозитория:  python3 _tools/build_blog.py
"""
import io, os, re, glob, html, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://rabota-ne-volk.vercel.app"
PHONE = "+7 991 914-98-54"
TEL = "+79919149854"
DATE = "2026-10-08"          # дата публикации по умолчанию, можно задать в файле полем date:
MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
          "сентября", "октября", "ноября", "декабря"]
TAG_ORDER = ["Цены", "Разработка", "SEO", "AI SEO", "Запуск", "Ниши"]


def rd(p): return io.open(p, encoding="utf-8").read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8").write(s)
def esc(s): return html.escape(s, quote=True)
def ru_date(d):
    y, m, dd = d.split("-")
    return "%d %s %s" % (int(dd), MONTHS[int(m) - 1], y)


# ---------- markdown: только то, что нужно статьям ----------
def inline(t):
    t = esc(t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
    def link(m):
        txt, url = m.group(1), html.unescape(m.group(2))
        ext = url.startswith("http")
        return '<a href="%s"%s>%s</a>' % (esc(url), ' target="_blank" rel="noopener"' if ext else "", txt)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, t)
    return t


def slugify_h(t, used):
    tr = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
                  ["a","b","v","g","d","e","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","h","c","ch","sh","sch","","y","","e","yu","ya"]))
    s = "".join(tr.get(c, c) for c in t.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:48] or "razdel"
    base, i = s, 2
    while s in used: s = "%s-%d" % (base, i); i += 1
    used.add(s)
    return s


def md(text):
    out, toc, used = [], [], set()
    lines = text.strip("\n").split("\n")
    i, para = 0, []
    def flush():
        if para:
            out.append("<p>%s</p>" % inline(" ".join(x.strip() for x in para)))
            del para[:]
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if s.startswith("```"):
            flush(); i += 1; code = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i]); i += 1
            out.append("<pre><code>%s</code></pre>" % esc("\n".join(code)))
            i += 1; continue
        if not s:
            flush(); i += 1; continue
        m = re.match(r"^(#{2,4})\s+(.*)$", s)
        if m:
            flush()
            lvl, t = len(m.group(1)), m.group(2).strip()
            hid = slugify_h(t, used)
            if lvl == 2: toc.append((hid, t))
            out.append('<h%d id="%s">%s</h%d>' % (lvl, hid, inline(t), lvl))
            i += 1; continue
        if s.startswith(">"):
            flush(); q = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                q.append(lines[i].strip()[1:].strip()); i += 1
            out.append("<blockquote><p>%s</p></blockquote>" % inline(" ".join(q)))
            continue
        if re.match(r"^(-|\*|\d+[.)])\s+", s):
            flush()
            ordered = bool(re.match(r"^\d", s))
            items = []
            while i < len(lines) and re.match(r"^\s*(-|\*|\d+[.)])\s+", lines[i]):
                item = re.sub(r"^\s*(-|\*|\d+[.)])\s+", "", lines[i]).strip()
                i += 1
                while i < len(lines) and lines[i].startswith("  ") and lines[i].strip() and \
                        not re.match(r"^\s*(-|\*|\d+[.)])\s+", lines[i]):
                    item += " " + lines[i].strip(); i += 1
                items.append("<li>%s</li>" % inline(item))
            tag = "ol" if ordered else "ul"
            out.append("<%s>%s</%s>" % (tag, "".join(items), tag))
            continue
        if re.match(r"^-{3,}$", s):
            flush(); out.append("<hr>"); i += 1; continue
        para.append(ln); i += 1
    flush()
    return "\n".join(out), toc


def parse(p):
    raw = rd(p)
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if not m: raise SystemExit("нет шапки в " + p)
    meta = {}
    for ln in m.group(1).split("\n"):
        if ":" in ln:
            k, v = ln.split(":", 1); meta[k.strip()] = v.strip().strip('"')
    body = m.group(2)
    words = len(re.findall(r"[\wЁё-]+", re.sub(r"```.*?```", "", body, flags=re.S)))
    meta.setdefault("date", DATE)
    meta["words"] = words
    meta["mins"] = max(2, round(words / 180))
    meta["html"], meta["toc"] = md(body)
    meta["first"] = re.sub(r"<[^>]+>", "", re.search(r"<p>(.*?)</p>", meta["html"], re.S).group(1))
    return meta


# ---------- общие куски страницы ----------
ICO_PHONE = '<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>'

def head(title, desc, url, og_type="website", extra=""):
    return """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(t)s</title>
<meta name="description" content="%(d)s">
<link rel="canonical" href="%(u)s">
<meta name="theme-color" content="#F7F2EC">
<meta property="og:type" content="%(ot)s">
<meta property="og:title" content="%(t)s">
<meta property="og:description" content="%(d)s">
<meta property="og:url" content="%(u)s">
<meta property="og:image" content="%(site)s/assets/img/og.jpg">
<meta property="og:locale" content="ru_RU">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>
%(x)s</head>
""" % dict(t=esc(title), d=esc(desc), u=url, ot=og_type, site=SITE, x=extra)


def nav():
    return """<header class="nav is-stuck" id="nav">
  <a class="nav__logo" href="/" aria-label="На главную">
    <span class="nav__mark">Александр</span>
    <span class="nav__sub">разработка сайтов</span>
  </a>
  <nav class="nav__links" aria-label="Разделы">
    <a href="/#tarify">Тарифы</a>
    <a href="/#primery">Примеры</a>
    <a href="/seo">SEO и AI</a>
    <a href="/blog" aria-current="page">Блог</a>
    <a href="/#faq">Вопросы</a>
  </nav>
  <a class="btn btn--sm nav__call" href="tel:%s">
    %s
    <span>%s</span>
  </a>
</header>
""" % (TEL, ICO_PHONE, PHONE)


def tail():
    return """<footer class="foot">
  <div class="wrap foot__in">
    <span class="foot__mark">Александр</span>
    <span class="foot__mid">Разработка сайтов под ключ</span>
    <a class="foot__tel" href="tel:%(tel)s">%(ph)s</a>
  </div>
</footer>

<a class="callbar" href="tel:%(tel)s">
  %(ico)s
  Позвонить: %(ph)s
</a>

<script src="/assets/js/main.js"></script>
</body>
</html>
""" % dict(tel=TEL, ph=PHONE, ico=ICO_PHONE)


def card(a, cls="post-card"):
    return """<a class="%s reveal" href="/blog/%s" data-tag="%s">
  <span class="post-card__tag">%s</span>
  <h3>%s</h3>
  <p>%s</p>
  <span class="post-card__meta">%d мин чтения</span>
</a>""" % (cls, a["slug"], esc(a["tag"]), esc(a["tag"]), esc(a["title"]), esc(a["description"]), a["mins"])


def cta():
    return """<aside class="post-cta">
  <p class="eyebrow">Нужен сайт</p>
  <h2>Расскажите задачу своими словами</h2>
  <p>Лендинг от 20 000 рублей, сайт с веб-приложением от 30 000, сайт высшего уровня с SEO и AI-продвижением от 50 000. Предоплаты нет.</p>
  <a class="phone phone--sm" href="tel:%(tel)s">%(ph)s</a>
  <div class="post-cta__btns">
    <a class="btn" href="tel:%(tel)s">Позвонить</a>
    <a class="btn btn--ghost" href="sms:%(tel)s">Написать SMS</a>
    <a class="btn btn--ghost" href="/#raschet">Рассчитать стоимость</a>
  </div>
  <p class="post-cta__small">Связь по телефону. Если не дозвонились, напишите SMS на этот номер, перезвоню в тот же день.</p>
</aside>""" % dict(tel=TEL, ph=PHONE)


# ---------- сборка ----------
def main():
    posts = [parse(p) for p in sorted(glob.glob(os.path.join(ROOT, "_blog", "*.md")))
             if not os.path.basename(p)[:-3].isupper() and not os.path.basename(p).startswith("_")]
    posts = [p for p in posts if p.get("slug")]
    order = {t: i for i, t in enumerate(TAG_ORDER)}
    posts.sort(key=lambda a: (a["date"], -order.get(a["tag"], 9)), reverse=True)
    for p in posts:
        bad = [c for c in "—" if c in p["html"]]
        if bad: print("ВНИМАНИЕ: длинное тире в", p["slug"])

    # убираем страницы удалённых статей
    keep = set(p["slug"] + ".html" for p in posts) | {"index.html"}
    for f in glob.glob(os.path.join(ROOT, "blog", "*.html")):
        if os.path.basename(f) not in keep: os.remove(f)

    # статьи
    for a in posts:
        url = "%s/blog/%s" % (SITE, a["slug"])
        ld = [{
            "@context": "https://schema.org", "@type": "BlogPosting",
            "headline": a["title"], "description": a["description"],
            "datePublished": a["date"], "dateModified": a["date"],
            "inLanguage": "ru", "mainEntityOfPage": url, "wordCount": a["words"],
            "author": {"@type": "Person", "name": "Александр", "url": SITE + "/"},
            "publisher": {"@type": "Organization", "name": "Александр, разработка сайтов", "url": SITE + "/",
                          "logo": {"@type": "ImageObject", "url": SITE + "/assets/img/og.jpg"}},
            "image": SITE + "/assets/img/og.jpg"
        }, {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Блог", "item": SITE + "/blog"},
                {"@type": "ListItem", "position": 3, "name": a["title"], "item": url}]
        }]
        extra = '<meta property="article:published_time" content="%s">\n<script type="application/ld+json">%s</script>\n' % (
            a["date"], json.dumps(ld, ensure_ascii=False))
        same = [b for b in posts if b is not a and b["tag"] == a["tag"]]
        other = [b for b in posts if b is not a and b["tag"] != a["tag"]]
        rel = (same + other)[:3]
        toc = "".join('<li><a href="#%s">%s</a></li>' % (h, inline(t)) for h, t in a["toc"]
                      if t.lower() not in ("если нужна помощь",))
        page = head(a["title"] + " - блог Александра", a["description"], url, "article", extra)
        page += '<body class="page-post">\n\n' + nav() + """
<main>
<article class="post">
  <div class="wrap post__wrap">
    <nav class="crumbs" aria-label="Навигация"><a href="/">Главная</a><span>/</span><a href="/blog">Блог</a></nav>
    <header class="post__head">
      <span class="post-card__tag">%(tag)s</span>
      <h1>%(title)s</h1>
      <p class="post__meta">%(date)s &middot; %(mins)d мин чтения &middot; Александр</p>
    </header>
    <div class="post__grid">
      <aside class="post__toc" aria-label="Содержание">
        <p>Содержание</p>
        <ol>%(toc)s</ol>
      </aside>
      <div class="prose">
%(body)s
      </div>
    </div>
    %(cta)s
  </div>
</article>

<section class="section section--tint">
  <div class="wrap">
    <header class="shead reveal"><p class="eyebrow">Читайте также</p><h2 class="h2">Ещё по теме</h2></header>
    <div class="post-grid">
%(rel)s
    </div>
  </div>
</section>
</main>

""" % dict(tag=esc(a["tag"]), title=esc(a["title"]), date=ru_date(a["date"]), mins=a["mins"], toc=toc,
           body=a["html"], cta=cta(), rel="\n".join(card(b) for b in rel))
        page += tail()
        wr(os.path.join(ROOT, "blog", a["slug"] + ".html"), page)

    # список статей
    tags = [t for t in TAG_ORDER if any(p["tag"] == t for p in posts)]
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Блог Александра о сайтах, SEO и AI-поиске",
          "url": SITE + "/blog", "inLanguage": "ru",
          "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": "%s/blog/%s" % (SITE, p["slug"]),
                        "datePublished": p["date"]} for p in posts]}
    page = head("Блог о сайтах, SEO и продвижении в нейросетях - Александр",
                "Простым языком о сайтах для малого бизнеса: сколько стоит сайт, как выбрать домен и хостинг, SEO без рекламы, как попасть в ответы ChatGPT и Алисы.",
                SITE + "/blog", "website",
                '<script type="application/ld+json">%s</script>\n' % json.dumps(ld, ensure_ascii=False))
    page += '<body class="page-blog">\n\n' + nav() + """
<main>
<section class="seo-hero blog-hero">
  <div class="wrap">
    <p class="eyebrow"><span class="dot"></span> Блог</p>
    <h1 class="seo-h1">Про сайты<br>без сложных слов</h1>
    <p class="seo-lead">Сколько стоит сайт, где его разместить, как получать клиентов из поиска и нейросетей без рекламы. Пишу то, что обычно объясняю на первом звонке.</p>
    <div class="blog-tags" id="blogTags" role="group" aria-label="Темы">
      <button type="button" class="on" data-tag="">Все</button>
%(tagbtns)s
    </div>
  </div>
</section>
<section class="section blog-list">
  <div class="wrap">
    <div class="post-grid" id="postGrid">
%(cards)s
    </div>
  </div>
</section>
</main>
<script>
(function(){var b=document.getElementById("blogTags"),g=document.getElementById("postGrid");if(!b)return;
b.addEventListener("click",function(e){var t=e.target.closest("button");if(!t)return;
[].forEach.call(b.children,function(x){x.classList.toggle("on",x===t)});var v=t.getAttribute("data-tag");
[].forEach.call(g.children,function(c){c.style.display=!v||c.getAttribute("data-tag")===v?"":"none"})})})();
</script>

""" % dict(tagbtns="\n".join('      <button type="button" data-tag="%s">%s</button>' % (esc(t), esc(t)) for t in tags),
           cards="\n".join(card(p) for p in posts))
    page += tail()
    wr(os.path.join(ROOT, "blog", "index.html"), page)

    # блок "Из блога" на главной
    ip = os.path.join(ROOT, "index.html")
    s = rd(ip)
    block = """<!-- BLOG:START (собирается _tools/build_blog.py) -->
<section class="section" id="blog">
  <div class="wrap">
    <header class="shead reveal">
      <p class="eyebrow">Блог</p>
      <h2 class="h2">Пишу про сайты<br>простым языком</h2>
      <p class="shead__note">Сколько стоит сайт, как выбрать домен и хостинг, как получать клиентов из поиска и нейросетей без рекламы.</p>
    </header>
    <div class="post-grid">
%s
    </div>
    <a class="btn btn--ghost blog-all" href="/blog">Все статьи блога</a>
  </div>
</section>
<!-- BLOG:END -->""" % "\n".join(card(p) for p in pick_home(posts))
    s = re.sub(r"<!-- BLOG:START.*?<!-- BLOG:END -->", lambda m: block, s, flags=re.S)
    wr(ip, s)

    # sitemap, robots, llms
    urls = [(SITE + "/", "1.0"), (SITE + "/seo", "0.8"), (SITE + "/blog", "0.8")] + \
           [("%s/blog/%s" % (SITE, p["slug"]), "0.6") for p in posts]
    today = datetime.date.today().isoformat()
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
         "".join("  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>\n" % (u, today, pr) for u, pr in urls) + \
         "</urlset>\n"
    wr(os.path.join(ROOT, "sitemap.xml"), sm)
    wr(os.path.join(ROOT, "robots.txt"), """User-agent: *
Allow: /

# нейросети и AI-поиск: сайт открыт для цитирования
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: YandexBot
Allow: /

User-agent: YandexAdditional
Allow: /

Sitemap: %s/sitemap.xml
""" % SITE)
    llms = """# Александр, разработка сайтов

> Частный веб-разработчик Александр делает сайты под ключ для малого бизнеса: лендинги, сайты с веб-приложением, проекты с 3D, SEO и продвижение в ответах нейросетей. Работает сам, без агентства. Предоплаты нет: оплата, когда сайт готов примерно на 80 процентов.

## Услуги и цены
- Лендинг: 20 000 - 30 000 рублей, срок 5-7 дней, поддержка 2 000 рублей в месяц.
- Сайт и веб-приложение (каталог, калькулятор, онлайн-запись, личный кабинет, админка, интеграции): 30 000 - 40 000 рублей, срок 10-14 дней, поддержка 3 000 рублей в месяц.
- Сайт высшего уровня (3D, анимации по прокрутке, SEO под Яндекс и Google, AI SEO под ChatGPT, Gemini, Claude, DeepSeek и Алису): 50 000 - 60 000 рублей, срок 14-21 день, поддержка 4 000 рублей в месяц. Первые клиенты из поиска и нейросетей без оплаты рекламы обычно приходят в течение двух месяцев.
- Домен оформляется на клиента, хостинг и домен клиент оплачивает напрямую провайдеру.

## Контакты
- Телефон: %(ph)s. Если не дозвонились, напишите SMS на этот номер.
- WhatsApp и Telegram по тому же номеру.

## Страницы
- [Главная: тарифы, примеры, вопросы](%(site)s/)
- [SEO и AI-поиск: живые цифры проекта](%(site)s/seo)
- [Блог](%(site)s/blog)

## Статьи блога
%(posts)s
""" % dict(ph=PHONE, site=SITE, posts="\n".join("- [%s](%s/blog/%s): %s" % (p["title"], SITE, p["slug"], p["description"]) for p in posts))
    wr(os.path.join(ROOT, "llms.txt"), llms)
    print("статей:", len(posts), "| слов:", sum(p["words"] for p in posts))
    for p in posts: print("  %-40s %-10s %4d слов" % (p["slug"], p["tag"], p["words"]))


def pick_home(posts):
    """на главную: по одной статье из разных тем, максимум 3"""
    want = ["kak-popast-v-otvety-nejrosetej", "skolko-stoit-sajt", "seo-dlya-malogo-biznesa"]
    got = [p for s in want for p in posts if p["slug"] == s]
    for p in posts:
        if len(got) >= 3: break
        if p not in got: got.append(p)
    return got[:3]


if __name__ == "__main__":
    main()
