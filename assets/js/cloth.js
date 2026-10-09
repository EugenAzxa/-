/* =========================================================
   Тарифы на ткани.
   Карточка при появлении падает как полотно, подвешенное за верхний край,
   качается и успокаивается; мышка, проведённая по карточке, пускает волны.
   Ткань рисуется в WebGL по снимку карточки. Снимок рисуем сами на canvas
   по живой вёрстке (фон, рамки, текст, иконки), поэтому эффект работает
   в любом браузере, а не только там, где есть html-in-canvas.
   Когда ткань успокоилась, снова показывается настоящая карточка.
   ========================================================= */
(function () {
  var cards = [].slice.call(document.querySelectorAll("#tarify .tier"));
  if (!cards.length || !window.IntersectionObserver) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var probe = document.createElement("canvas").getContext("webgl");
  if (!probe) return;
  var lose = probe.getExtension("WEBGL_lose_context"); lose && lose.loseContext();

  var PAD = 72;                                   /* поле вокруг карточки в снимке: тень и плашка «Чаще всего берут» */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var COLS = 24;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var host = cards[0].parentNode;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  /* ---------- снимок карточки ---------- */
  function px(v) { return parseFloat(v) || 0; }
  function visibleColor(c) { return c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c); }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function radiusOf(cs, b) {
    var v = cs.borderTopLeftRadius;
    return /%$/.test(v) ? px(v) / 100 * Math.min(b.width, b.height) : px(v);
  }

  function splitTop(s) {                          /* делит по запятым вне скобок */
    var out = [], depth = 0, cur = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function gradient(ctx, img, b) {
    var m = /linear-gradient\((.*)\)\s*$/.exec(img);
    if (!m) return null;
    var parts = splitTop(m[1]), ang = 180;
    if (/deg$/.test(parts[0])) ang = px(parts.shift());
    var a = ang * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    var len = Math.abs(b.width * dx) + Math.abs(b.height * dy);
    var cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    var g = ctx.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
    parts.forEach(function (p, i) {
      var mm = /^(.*\))\s*([\d.]+)%$/.exec(p) || /^(\S+)\s+([\d.]+)%$/.exec(p);
      var col = mm ? mm[1] : p, pos = mm ? px(mm[2]) / 100 : i / Math.max(1, parts.length - 1);
      g.addColorStop(Math.min(1, Math.max(0, pos)), col);
    });
    return g;
  }

  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  function paint(card) {
    var r = card.getBoundingClientRect();
    var W = r.width, H = r.height;
    var cv = document.createElement("canvas");
    cv.width = Math.round((W + PAD * 2) * DPR);
    cv.height = Math.round((H + PAD * 2) * DPR);
    var ctx = cv.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, (PAD - r.left) * DPR, (PAD - r.top) * DPR);
    var later = [];
    var canLS = "letterSpacing" in ctx;

    function box(el, cs, b) {
      var rad = radiusOf(cs, b);
      var sh = /(rgba?\([^)]*\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/.exec(cs.boxShadow || "");
      var bg = cs.backgroundImage && cs.backgroundImage !== "none" ? gradient(ctx, cs.backgroundImage, b) : null;
      var fill = bg || (visibleColor(cs.backgroundColor) ? cs.backgroundColor : null);
      if (sh && !/inset/.test(cs.boxShadow)) {
        ctx.save();
        ctx.shadowColor = sh[1];
        ctx.shadowOffsetX = px(sh[2]) * DPR;
        ctx.shadowOffsetY = px(sh[3]) * DPR;
        ctx.shadowBlur = px(sh[4]) * DPR;
        ctx.fillStyle = fill || "#fff";
        roundRect(ctx, b.left, b.top, b.width, b.height, rad);
        ctx.fill();
        ctx.restore();
      }
      if (fill) {
        ctx.fillStyle = fill;
        roundRect(ctx, b.left, b.top, b.width, b.height, rad);
        ctx.fill();
      }
      var sides = [["Top", 0], ["Right", 1], ["Bottom", 2], ["Left", 3]].map(function (s) {
        var w = cs["border" + s[0] + "Style"] === "none" ? 0 : px(cs["border" + s[0] + "Width"]);
        return { w: w, c: cs["border" + s[0] + "Color"] };
      });
      var same = sides.every(function (s) { return s.w === sides[0].w && s.c === sides[0].c; });
      if (same && sides[0].w > 0 && visibleColor(sides[0].c)) {
        var w = sides[0].w;
        ctx.strokeStyle = sides[0].c;
        ctx.lineWidth = w;
        roundRect(ctx, b.left + w / 2, b.top + w / 2, b.width - w, b.height - w, Math.max(0, rad - w / 2));
        ctx.stroke();
      } else {
        sides.forEach(function (s, i) {
          if (!s.w || !visibleColor(s.c)) return;
          ctx.fillStyle = s.c;
          if (i === 0) ctx.fillRect(b.left, b.top, b.width, s.w);
          if (i === 1) ctx.fillRect(b.right - s.w, b.top, s.w, b.height);
          if (i === 2) ctx.fillRect(b.left, b.bottom - s.w, b.width, s.w);
          if (i === 3) ctx.fillRect(b.left, b.top, s.w, b.height);
        });
      }
    }

    function pseudo(el, cs) {
      var p = getComputedStyle(el, "::before");
      if (!p || p.content === "none" || p.content === "normal" || p.position !== "absolute") return;
      var e = el.getBoundingClientRect();
      var b = { left: e.left + px(cs.borderLeftWidth) + px(p.left), top: e.top + px(cs.borderTopWidth) + px(p.top), width: px(p.width), height: px(p.height) };
      b.right = b.left + b.width; b.bottom = b.top + b.height;
      box(el, p, b);
      var m = /url\("?(data:image\/svg\+xml[^"]*?)"?\)/.exec(p.backgroundImage || "");
      if (!m) return;
      var src = m[1].replace(/\\"/g, '"');
      var head = /^data:image\/svg\+xml;utf8,/;
      if (head.test(src)) {
        var body = src.replace(head, "");
        try { body = decodeURIComponent(body); } catch (e) {}
        src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(body);
      }
      var size = px(p.backgroundSize) || b.width;
      later.push(loadImg(src).then(function (im) {
        im && ctx.drawImage(im, b.left + (b.width - size) / 2, b.top + (b.height - size) / 2, size, size);
      }));
    }

    function svg(el, cs) {
      var b = el.getBoundingClientRect();
      var c = el.cloneNode(true);
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      c.setAttribute("width", Math.round(b.width * DPR));
      c.setAttribute("height", Math.round(b.height * DPR));
      c.setAttribute("style", "fill:" + cs.fill + ";stroke:" + cs.stroke + ";stroke-width:" + cs.strokeWidth +
        ";stroke-linecap:" + cs.strokeLinecap + ";stroke-linejoin:" + cs.strokeLinejoin);
      var src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(c));
      later.push(loadImg(src).then(function (im) { im && ctx.drawImage(im, b.left, b.top, b.width, b.height); }));
    }

    function text(node, cs) {
      var s = node.data;
      if (!/\S/.test(s)) return;
      ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      ctx.fillStyle = cs.color;
      var ls = cs.letterSpacing === "normal" ? 0 : px(cs.letterSpacing);
      if (canLS) ctx.letterSpacing = ls + "px";
      var up = cs.textTransform === "uppercase";
      var mt = ctx.measureText("Hg");
      var asc = mt.fontBoundingBoxAscent || px(cs.fontSize) * 0.95;
      var desc = mt.fontBoundingBoxDescent || px(cs.fontSize) * 0.25;
      var range = document.createRange();
      function put(a, z) {
        range.setStart(node, a); range.setEnd(node, z);
        var rs = range.getClientRects();
        if (!rs.length) return;
        if (rs.length > 1 || (ls && !canLS)) {     /* слово с переносом или без поддержки letterSpacing: по буквам */
          if (z - a > 1) { for (var k = a; k < z; k++) put(k, k + 1); return; }
        }
        var q = rs[0], t = s.slice(a, z);
        ctx.fillText(up ? t.toUpperCase() : t, q.left, q.top + (q.height - asc - desc) / 2 + asc);
      }
      var re = /\S+/g, m;
      while ((m = re.exec(s))) put(m.index, m.index + m[0].length);
      if (canLS) ctx.letterSpacing = "0px";
    }

    function walk(el) {
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { text(n, getComputedStyle(el)); continue; }
        if (n.nodeType !== 1) continue;
        var cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden" || px(cs.opacity) === 0 && cs.opacity !== "") continue;
        if (n.tagName.toLowerCase() === "svg") { svg(n, cs); continue; }
        box(n, cs, n.getBoundingClientRect());
        pseudo(n, cs);
        walk(n);
      }
    }

    box(card, getComputedStyle(card), r);
    walk(card);
    return Promise.all(later).then(function () { return { canvas: cv, w: W, h: H }; });
  }

  /* ---------- WebGL ---------- */
  var VS = "attribute vec2 aPos;attribute vec2 aUv;attribute vec2 aLit;uniform vec2 uRes;varying vec2 vUv;varying vec2 vLit;" +
    "void main(){vUv=aUv;vLit=aLit;vec2 p=aPos/uRes*2.0-1.0;gl_Position=vec4(p.x,-p.y,0.0,1.0);}";
  var FS = "precision mediump float;uniform sampler2D uTex;uniform float uAlpha;varying vec2 vUv;varying vec2 vLit;" +
    /* тень складки затемняет, свет только чуть осветляет: текст не теряет контраст */
    "void main(){vec4 c=texture2D(uTex,vUv);float l=vLit.x;c.rgb=c.rgb*(1.0+min(l,0.0)*0.55)+vec3(max(l,0.0)*0.22+vLit.y)*c.a;gl_FragColor=c*uAlpha;}";

  /* свет сверху слева; для плоской ткани поправка ровно ноль, цвета карточки не меняются */
  var L = [-0.35, -0.55, 0.76], Ln = Math.hypot(L[0], L[1], L[2]);
  L = L.map(function (v) { return v / Ln; });
  var Hh = [L[0], L[1], L[2] + 1], Hn = Math.hypot(Hh[0], Hh[1], Hh[2]);
  Hh = Hh.map(function (v) { return v / Hn; });
  var SPEC0 = Math.pow(Hh[2], 30);

  function Cloth(card, index) {
    this.card = card;
    this.index = index;
    this.cv = document.createElement("canvas");
    this.cv.className = "cloth";
    this.cv.setAttribute("aria-hidden", "true");
    this.cv.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:3;display:none;opacity:1;transition:opacity .14s linear";
    host.appendChild(this.cv);
    var gl = this.gl = this.cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) throw new Error("no webgl");
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = this.pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link");
    this.uRes = gl.getUniformLocation(pr, "uRes");
    this.uAlpha = gl.getUniformLocation(pr, "uAlpha");
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    this.tex = gl.createTexture();
    this.snap = null;
    this.active = false;
    this.entry = -1;                               /* время начала падения, -1 = не идёт */
    this.lastMove = 0;
    var self = this;
    this.cv.addEventListener("webglcontextlost", function () { self.dead = true; self.stop(); });
  }

  Cloth.prototype.setSnap = function (snap) {
    var gl = this.gl;
    this.snap = snap;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snap.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var W = snap.w, H = snap.h;
    var C = COLS, R = Math.max(30, Math.min(64, Math.round(COLS * H / W)));
    this.C = C; this.R = R;
    var n = (C + 1) * (R + 1);
    this.h0 = new Float32Array(n); this.h1 = new Float32Array(n); this.h2 = new Float32Array(n);
    this.pos = new Float32Array(n * 3);
    this.vdata = new Float32Array(n * 6);
    var idx = new Uint16Array(C * R * 6), k = 0;
    for (var j = 0; j < R; j++) for (var i = 0; i < C; i++) {
      var a = j * (C + 1) + i, b = a + 1, c = a + C + 1, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.count = idx.length;
    /* запас холста по бокам и снизу: ткань раздувается к зрителю. По бокам не шире экрана, иначе появится прокрутка вбок */
    var r = this.card.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    this.bx = Math.max(0, Math.min(Math.max(90, W * 0.3), r.left, vw - r.right));
    this.swing = this.bx < W * 0.15 ? 0.42 : 0.72;   /* на узком экране качаем мягче: ткани некуда раздуваться */
    this.byT = 90;
    this.byB = Math.max(140, H * 0.2);
  };

  Cloth.prototype.place = function () {
    var r = this.card.getBoundingClientRect(), p = host.getBoundingClientRect();
    var w = this.snap.w + this.bx * 2, h = this.snap.h + this.byT + this.byB;
    var x = r.left - p.left - this.bx, y = r.top - p.top - this.byT;
    var cv = this.cv;
    if (this.cw !== w || this.ch !== h) {
      this.cw = w; this.ch = h;
      cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
      cv.style.width = w + "px"; cv.style.height = h + "px";
    }
    cv.style.transform = "translate(" + x + "px," + y + "px)";
    return r;
  };

  Cloth.prototype.start = function () {
    if (this.dead || !this.snap) return;
    this.place();
    if (!this.active) {
      this.active = true;
      this.cv.style.display = "block";
      this.cv.style.opacity = "1";
      var card = this.card;
      requestAnimationFrame(function () { card.style.opacity = "0"; });
    }
    kick();
  };

  Cloth.prototype.stop = function () {
    this.active = false;
    this.entry = -1;
    this.card.style.opacity = "";
    var cv = this.cv;
    cv.style.opacity = "0";
    setTimeout(function () { if (cv.style.opacity === "0") cv.style.display = "none"; }, 180);
  };

  Cloth.prototype.brush = function (e) {
    if (!this.snap) return;
    var r = this.card.getBoundingClientRect();
    var gx = (e.clientX - r.left) / r.width * this.C, gy = (e.clientY - r.top) / r.height * this.R;
    var sp = this.prev ? Math.hypot(e.clientX - this.prev[0], e.clientY - this.prev[1]) : 0;
    this.prev = [e.clientX, e.clientY];
    if (sp < 1) return;
    var amt = Math.min(sp, 50) / 50 * 3.6, C = this.C, R = this.R;
    for (var j = Math.max(0, Math.floor(gy - 3)); j <= Math.min(R, Math.ceil(gy + 3)); j++)
      for (var i = Math.max(0, Math.floor(gx - 3)); i <= Math.min(C, Math.ceil(gx + 3)); i++) {
        var d2 = (i - gx) * (i - gx) + (j - gy) * (j - gy);
        this.h1[j * (C + 1) + i] += amt * Math.exp(-d2 / 2.2);
      }
    this.lastMove = performance.now();
    this.start();
  };

  /* волны от мышки: волновое уравнение на сетке, верхний край закреплён */
  Cloth.prototype.waves = function () {
    var C = this.C, R = this.R, a = this.h0, b = this.h1, c = this.h2, W = C + 1, max = 0;
    for (var j = 0; j <= R; j++) for (var i = 0; i <= C; i++) {
      var k = j * W + i;
      var l = b[k - (i > 0 ? 1 : 0)], r = b[k + (i < C ? 1 : 0)], u = b[k - (j > 0 ? W : 0)], d = b[k + (j < R ? W : 0)];
      var v = (2 * b[k] - a[k] + 0.24 * (l + r + u + d - 4 * b[k])) * 0.985;
      if (j === 0) v = 0;
      if (v > 9) v = 9; else if (v < -9) v = -9;
      c[k] = v;
      if (Math.abs(v) > max) max = Math.abs(v);
    }
    this.h0 = b; this.h1 = c; this.h2 = a;
    return max;
  };

  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  Cloth.prototype.frame = function (now) {
    var s = this.snap, W = s.w, H = s.h, C = this.C, R = this.R;
    var T = 2.4, t = this.entry >= 0 ? (now - this.entry) / 1000 : T;
    if (t < 0) { this.draw(0); return true; }     /* ждёт своей очереди */
    var fade = 1 - smooth(T - 0.7, T, t);
    var phi = this.swing * Math.exp(-t / 0.55) * Math.cos(2 * Math.PI * t / 1.1) * fade;
    var A = 28 * Math.exp(-t / 0.9) * fade;
    var energy = 0;
    for (var st = 0; st < 2; st++) energy = this.waves();
    var bscale = 9;                                /* единица волны в пикселях */

    var f = Math.max(1500, H * 2.4), cx = PAD + W / 2, cy = PAD + H / 2;
    var cosP = Math.cos(phi), sinP = Math.sin(phi), pos = this.pos, h = this.h1;
    for (var j = 0; j <= R; j++) {
      var v = j / R, dy = v * (H + PAD * 2) - PAD;     /* расстояние от линии подвеса */
      var g = Math.pow(Math.max(0, dy) / H, 1.25), gb = smooth(0, H * 0.12, dy);
      for (var i = 0; i <= C; i++) {
        var u = i / C, k = j * (C + 1) + i;
        var cu = (u * (W + PAD * 2) - PAD) / W, cv = dy / H;
        var zw = A * g * (0.6 * Math.sin(2 * Math.PI * (1.1 * cu + 0.9 * cv) - 2.4 * t * 2.6) +
                          0.4 * Math.sin(2 * Math.PI * (0.6 * cu - 1.4 * cv) - 1.9 * t * 2.6 + 1.3));
        var z = dy * sinP + zw + h[k] * bscale * gb;
        pos[k * 3] = u * (W + PAD * 2) + A * 0.3 * g * Math.sin(2 * Math.PI * 0.5 * cv - 4 * t);
        pos[k * 3 + 1] = PAD + dy * cosP;
        pos[k * 3 + 2] = z;
      }
    }
    var vd = this.vdata, ox = this.bx - PAD, oy = this.byT - PAD;
    for (j = 0; j <= R; j++) for (i = 0; i <= C; i++) {
      k = j * (C + 1) + i;
      var kl = j * (C + 1) + Math.max(0, i - 1), kr = j * (C + 1) + Math.min(C, i + 1);
      var ku = Math.max(0, j - 1) * (C + 1) + i, kd = Math.min(R, j + 1) * (C + 1) + i;
      var ax = pos[kr * 3] - pos[kl * 3], ay = pos[kr * 3 + 1] - pos[kl * 3 + 1], az = pos[kr * 3 + 2] - pos[kl * 3 + 2];
      var bx = pos[kd * 3] - pos[ku * 3], by = pos[kd * 3 + 1] - pos[ku * 3 + 1], bz = pos[kd * 3 + 2] - pos[ku * 3 + 2];
      /* нормаль к зрителю (ось z на нас, y вниз) */
      var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      var lit = (nx * L[0] + ny * L[1] + nz * L[2]) - L[2];
      var sp = Math.max(0, Math.pow(Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]), 30) - SPEC0) * 0.08;
      var x = pos[k * 3], y = pos[k * 3 + 1], zz = pos[k * 3 + 2];
      var sc = f / Math.max(f * 0.35, f - zz);
      var o = k * 6;
      vd[o] = cx + (x - cx) * sc + ox;
      vd[o + 1] = cy + (y - cy) * sc + oy;
      vd[o + 2] = i / C;
      vd[o + 3] = j / R;
      vd[o + 4] = lit * 0.75;
      vd[o + 5] = sp;
    }
    this.draw(this.entry >= 0 ? Math.min(1, t / 0.16) : 1);

    var entryDone = t >= T;
    if (entryDone) this.entry = -1;
    var still = energy < 0.02 && performance.now() - this.lastMove > 250;
    if (entryDone && still) { this.h0.fill(0); this.h1.fill(0); this.h2.fill(0); return false; }
    return true;
  };

  Cloth.prototype.draw = function (alpha) {
    var gl = this.gl;
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!alpha) return;
    gl.useProgram(this.pr);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vdata, gl.DYNAMIC_DRAW);
    var locs = ["aPos", "aUv", "aLit"].map(function (n) { return gl.getAttribLocation(this.pr, n); }, this);
    locs.forEach(function (l, i) {
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 24, i * 8);
    });
    gl.uniform2f(this.uRes, this.cw, this.ch);
    gl.uniform1f(this.uAlpha, alpha);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  };

  /* ---------- общий цикл ---------- */
  var cloths = [], running = false;
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function loop(now) {
    var any = false;
    cloths.forEach(function (c) {
      if (!c.active || c.dead) return;
      try {
        c.place();
        if (c.frame(now)) any = true; else c.stop();
      } catch (e) { c.dead = true; c.stop(); }
    });
    running = any;
    if (any) requestAnimationFrame(loop);
  }

  function snapOf(c) {
    var r = c.card.getBoundingClientRect();
    if (c.snap && Math.abs(c.snap.w - r.width) < 1 && Math.abs(c.snap.h - r.height) < 1) return Promise.resolve();
    if (c.painting) return c.painting;
    c.painting = paint(c.card).then(function (s) { c.setSnap(s); c.painting = null; });
    return c.painting;
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var queue = 0;

  cards.forEach(function (card, i) {
    var c;
    try { c = new Cloth(card, i); } catch (e) { return; }
    cloths.push(c);
    card.classList.remove("reveal");              /* обычное появление заменяет падение ткани */
    card.style.opacity = "0";
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var delay = (queue++) * 140;
      setTimeout(function () { queue = Math.max(0, queue - 1); }, 400);
      fontsReady.then(function () { return snapOf(c); }).then(function () {
        c.entry = performance.now() + delay;
        c.start();
      }).catch(function () { c.dead = true; card.style.opacity = ""; });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    io.observe(card);

    if (finePointer) {
      card.addEventListener("pointerenter", function (e) { c.prev = [e.clientX, e.clientY]; });
      card.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse" || c.dead || card.style.opacity === "0" && !c.active) return;
        if (c.snap && Math.abs(c.snap.w - card.offsetWidth) < 2) c.brush(e);
        else snapOf(c);
      });
    }
  });

  window.addEventListener("resize", function () { cloths.forEach(function (c) { if (!c.active) c.snap = c.snap && null; }); });
})();
