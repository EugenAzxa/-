/* =========================================================
   Сдвиг клетками. Картинка делится на сетку; когда она появляется
   на экране, клетки разлетаются и собираются на место, а курсор,
   проведённый по ней, сдвигает клетки с цветной кромкой.
   Работает по самой картинке (без html-in-canvas), поэтому везде.
   Когда клетки улеглись, снова видна обычная картинка.
   ========================================================= */
(function () {
  var imgs = [].slice.call(document.querySelectorAll(".contact__man, .still img, [data-displace]"));
  if (!imgs.length || !window.IntersectionObserver) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var probe = document.createElement("canvas").getContext("webgl");
  if (!probe) return;
  var lose = probe.getExtension("WEBGL_lose_context"); lose && lose.loseContext();

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var K = 3;                                       /* единиц поля на шаг байта в текстуре сдвигов */

  var VS = "attribute vec2 aPos;varying vec2 vUv;void main(){vUv=vec2(aPos.x*0.5+0.5,0.5-aPos.y*0.5);gl_Position=vec4(aPos,0.0,1.0);}";
  var FS = [
    "precision highp float;varying vec2 vUv;",
    "uniform sampler2D uContent;uniform sampler2D uField;uniform vec2 uRes;uniform float uTick;",
    "float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*0.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}",
    "void main(){",
    "  vec2 off=(texture2D(uField,vUv).rg*255.0-128.0)/" + K.toFixed(1) + ";",
    "  vec2 push=off*0.02;float ab=0.12;vec2 lo=vec2(0.001),hi=vec2(0.999);",
    "  vec4 cr=texture2D(uContent,clamp(vUv-push*(1.0+ab),lo,hi));",
    "  vec4 cg=texture2D(uContent,clamp(vUv-push,lo,hi));",
    "  vec4 cb=texture2D(uContent,clamp(vUv-push*(1.0-ab),lo,hi));",
    "  float a=(cr.a+cg.a+cb.a)/3.0;",
    "  vec3 col=min(vec3(cr.r*cr.a,cg.g*cg.a,cb.b*cb.a),vec3(a));",
    "  float gate=smoothstep(1.5,18.0,length(push*uRes));",
    "  float gn=hash(floor(gl_FragCoord.xy)+vec2(uTick*0.37,uTick*0.113));",
    "  col+=(gn-0.5)*0.03*gate*a;",
    "  gl_FragColor=vec4(clamp(col,vec3(0.0),vec3(a)),a);",
    "}"].join("\n");

  function pos(v, free) {                          /* object-position: проценты или ключевые слова */
    if (/%$/.test(v)) return parseFloat(v) / 100;
    if (v === "left" || v === "top") return 0;
    if (v === "right" || v === "bottom") return 1;
    if (/px$/.test(v)) return free ? parseFloat(v) / free : 0;
    return 0.5;
  }

  function Disp(img) {
    this.img = img;
    var cv = this.cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;pointer-events:none;display:none;z-index:1";
    var cs = getComputedStyle(img);
    if (cs.filter && cs.filter !== "none") cv.style.filter = cs.filter;
    /* холст сразу после картинки: подписи поверх него остаются видны; координаты от того же offsetParent */
    img.parentNode.insertBefore(cv, img.nextSibling);
    var gl = this.gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) throw new Error("webgl");
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = this.pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link");
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.uRes = gl.getUniformLocation(pr, "uRes");
    this.uTick = gl.getUniformLocation(pr, "uTick");
    gl.uniform1i(gl.getUniformLocation(pr, "uContent"), 0);
    gl.uniform1i(gl.getUniformLocation(pr, "uField"), 1);
    this.tex = gl.createTexture();
    this.ftex = gl.createTexture();
    [this.tex, this.ftex].forEach(function (t, i) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      var f = i ? gl.NEAREST : gl.LINEAR;           /* поле без сглаживания: клетки с чёткими краями */
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    });
    this.active = false;
    this.mouse = { on: false };
    var self = this;
    cv.addEventListener("webglcontextlost", function () { self.dead = true; self.stop(); });
  }

  /* снимок картинки ровно так, как она лежит на странице (object-fit: cover и позиция) */
  Disp.prototype.prepare = function () {
    var img = this.img, w = img.clientWidth, h = img.clientHeight;
    if (!w || !h || !img.naturalWidth) return false;
    if (this.w === w && this.h === h) return true;
    this.w = w; this.h = h;
    var c = document.createElement("canvas");
    c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
    var ctx = c.getContext("2d"), cs = getComputedStyle(img);
    var nw = img.naturalWidth, nh = img.naturalHeight;
    if (cs.objectFit === "cover") {
      var s = Math.max(w / nw, h / nh), dw = nw * s, dh = nh * s;
      var p = (cs.objectPosition || "50% 50%").split(" ");
      ctx.drawImage(img, (w - dw) * pos(p[0], w - dw) * DPR, (h - dh) * pos(p[1] || "50%", h - dh) * DPR, dw * DPR, dh * DPR);
    } else ctx.drawImage(img, 0, 0, c.width, c.height);
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);

    this.cols = 34;
    this.rows = Math.max(2, Math.min(120, Math.round(this.cols * h / w)));
    this.rowScale = (h * this.cols) / (w * this.rows);
    this.field = new Float32Array(this.cols * this.rows * 2);
    this.bytes = new Uint8Array(this.cols * this.rows * 4).fill(128);
    this.cv.width = c.width; this.cv.height = c.height;
    return true;
  };

  Disp.prototype.place = function () {
    var img = this.img, cv = this.cv;
    cv.style.left = img.offsetLeft + "px";
    cv.style.top = img.offsetTop + "px";
    cv.style.width = img.clientWidth + "px";
    cv.style.height = img.clientHeight + "px";
  };

  Disp.prototype.start = function () {
    if (this.dead || !this.prepare()) return;
    this.place();
    if (!this.active) {
      this.active = true;
      this.cv.style.display = "block";
      var img = this.img;
      this.step(0);
      this.render(0);
      requestAnimationFrame(function () { img.style.opacity = "0"; });
    }
    kick();
  };

  Disp.prototype.stop = function () {
    this.active = false;
    this.img.style.opacity = "";
    var cv = this.cv;
    requestAnimationFrame(function () { cv.style.display = "none"; });
  };

  Disp.prototype.scramble = function (amp) {
    for (var i = 0; i < this.field.length; i++) this.field[i] = (Math.random() * 2 - 1) * amp;
  };

  Disp.prototype.step = function (dt) {
    var f = this.field, m = this.mouse, max = 0;
    var decay = Math.pow(0.9, dt * 60);
    for (var i = 0; i < f.length; i++) { f[i] *= decay; var a = Math.abs(f[i]); if (a > max) max = a; }
    var inj = m.on && (m.vx || m.vy);
    if (inj) {
      var cols = this.cols, rows = this.rows, gx = m.x * cols, gy = m.y * rows;
      var md = cols * 0.12, md2 = md * md, gain = 12 * m.gate;
      for (var j = 0; j < rows; j++) {
        var dy = (gy - j) * this.rowScale;
        for (var k = 0; k < cols; k++) {
          var dx = gx - k, d2 = dx * dx + dy * dy;
          if (d2 < md2) {
            var pw = Math.min(md / Math.sqrt(d2), 10), idx = 2 * (k + cols * j);
            f[idx] += gain * m.vx * pw;
            f[idx + 1] += gain * m.vy * pw;
          }
        }
      }
    }
    var vd = Math.pow(0.9, dt * 60);
    m.vx *= vd; m.vy *= vd;
    if (Math.abs(m.vx) < 0.0001) m.vx = 0;
    if (Math.abs(m.vy) < 0.0001) m.vy = 0;
    var b = this.bytes;
    for (i = 0; i < f.length / 2; i++) {
      var x = f[2 * i] * K, y = f[2 * i + 1] * K;
      b[4 * i] = 128 + (x > 127 ? 127 : x < -127 ? -127 : x);
      b[4 * i + 1] = 128 + (y > 127 ? 127 : y < -127 ? -127 : y);
    }
    return inj || m.vx || m.vy || max > 0.05;
  };

  Disp.prototype.render = function (tick) {
    var gl = this.gl;
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pr);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ftex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.cols, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.bytes);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform2f(this.uRes, this.cv.width, this.cv.height);
    gl.uniform1f(this.uTick, tick);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  var list = [], running = false, last = 0, tick = 0;
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; tick++;
    var any = false;
    list.forEach(function (d) {
      if (!d.active || d.dead) return;
      try {
        d.place();
        var alive = d.step(dt);
        d.render(tick);
        if (alive) any = true; else { d.field.fill(0); d.stop(); }
      } catch (e) { d.dead = true; d.stop(); }
    });
    running = any;
    if (any) requestAnimationFrame(loop);
  }

  function ready(img) {
    return img.complete && img.naturalWidth ? Promise.resolve() :
      new Promise(function (res) { img.addEventListener("load", res, { once: true }); });
  }

  imgs.forEach(function (img) {
    var d;
    try { d = new Disp(img); } catch (e) { return; }
    list.push(d);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      ready(img).then(function () {
        if (!d.prepare()) return;
        d.scramble(12);                            /* при появлении клетки разлетаются и собираются */
        d.start();
      });
    }, { threshold: 0.35 });
    io.observe(img);

    if (!fine) return;
    var area = img.parentNode, m = d.mouse;
    area.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || d.dead) return;
      var r = img.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { m.on = false; return; }
      var now = performance.now();
      if (!m.on) { m.on = true; m.px = x; m.py = y; m.t = now; m.speed = 0; }
      m.vx = x - m.px; m.vy = y - m.py;
      var dt = Math.max((now - m.t) / 1000, 0.001), dist = Math.hypot(m.vx * r.width, m.vy * r.height);
      m.speed += (dist / dt - m.speed) * Math.min(dt * 25, 1);
      var g = Math.min(Math.max((m.speed - 500) / 500, 0), 1);
      m.gate = g * g * (3 - 2 * g);
      m.px = x; m.py = y; m.t = now; m.x = x; m.y = y;
      if (m.gate > 0 && d.field) d.start();
    }, { passive: true });
    area.addEventListener("pointerleave", function () { m.on = false; m.vx = m.vy = 0; });
  });

  window.addEventListener("resize", function () { list.forEach(function (d) { if (!d.active) d.w = 0; }); });
})();
