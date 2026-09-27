/* =========================================================
   figures.js — 문제에 붙는 그림을 「숫자로 그려」 주는 그림 공장
   · 손으로 그린 그림이 아니라, 문제에 적힌 숫자(o)로 SVG 를 만든다.
     → 문제 글·정답·그림이 같은 숫자에서 나오므로 서로 어긋나지 않는다.
   · 검증용으로 좌표·개수를 data- 속성과 class 로 남긴다(verify 화면에서 다시 읽어 정답과 대조).
   · 사용 : RG.fig({ k: "graph", o: { … } })  → <svg> 요소
   ========================================================= */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var INK = "#334155", FAINT = "#94a3b8";
  var uid = 0;

  function S(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function T(p, x, y, str, o) {
    o = o || {};
    var t = S("text", { x: x, y: y, "text-anchor": o.anchor || "start", "font-size": o.size || 14, fill: o.fill || INK, "font-weight": o.weight || 400 }, p, str);
    if (o.rot) t.setAttribute("transform", "rotate(" + o.rot + " " + x + " " + y + ")");
    if (o.cls) t.setAttribute("class", o.cls);
    return t;
  }
  function root(w, h) {
    var s = S("svg", { viewBox: "0 0 " + w + " " + h, "class": "fig", role: "img" });
    s.setAttribute("data-w", w); s.setAttribute("data-h", h);
    S("rect", { x: 0.5, y: 0.5, width: w - 1, height: h - 1, rx: 12, fill: "#fff", stroke: "#e2e8f0" }, s);
    return s;
  }
  function num(v) { return String(Math.round(v * 100) / 100); }
  function arrowDefs(s, color) {
    var id = "ar" + (++uid);
    var d = S("defs", {}, s);
    var m = S("marker", { id: id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerUnits: "userSpaceOnUse", markerWidth: 9, markerHeight: 9, orient: "auto-start-reverse" }, d);
    S("path", { d: "M0,0 L10,5 L0,10 z", fill: color || INK }, m);
    return id;
  }

  /* ---------- 1. 그래프 ---------- */
  function graph(o) {
    var w = o.w || 480, h = o.h || 300, m = { l: 64, r: 26, t: 26, b: 54 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b, X = o.x, Y = o.y;
    var s = root(w, h);
    function px(v) { return m.l + (v - X[0]) / (X[1] - X[0]) * pw; }
    function py(v) { var f = (v - Y[0]) / (Y[1] - Y[0]); return o.yrev ? m.t + f * ph : m.t + ph - f * ph; }
    s.setAttribute("data-plot", [m.l, m.t, pw, ph].join(","));
    s.setAttribute("data-x", X.join(",")); s.setAttribute("data-y", Y.join(",")); s.setAttribute("data-yrev", o.yrev ? 1 : 0);
    var v;
    for (v = X[0]; v <= X[1] + 1e-9; v += X[2]) {
      S("line", { x1: px(v), y1: m.t, x2: px(v), y2: m.t + ph, stroke: "#eef2f7" }, s);
      T(s, px(v), m.t + ph + 18, num(v), { anchor: "middle", size: 14 });
    }
    for (v = Y[0]; v <= Y[1] + 1e-9; v += Y[2]) {
      S("line", { x1: m.l, y1: py(v), x2: m.l + pw, y2: py(v), stroke: "#eef2f7" }, s);
      T(s, m.l - 8, py(v) + 5, num(v), { anchor: "end", size: 14 });
    }
    S("line", { x1: m.l, y1: m.t, x2: m.l, y2: m.t + ph, stroke: INK, "stroke-width": 2 }, s);
    S("line", { x1: m.l, y1: m.t + ph, x2: m.l + pw, y2: m.t + ph, stroke: INK, "stroke-width": 2 }, s);
    T(s, m.l + pw / 2, h - 10, o.xl || "", { anchor: "middle", size: 15, weight: 700 });
    T(s, 16, m.t + ph / 2, o.yl || "", { anchor: "middle", size: 15, weight: 700, rot: -90 });
    (o.guides || []).forEach(function (g) {
      if (g.x != null) S("line", { x1: px(g.x), y1: m.t + ph, x2: px(g.x), y2: m.t, stroke: FAINT, "stroke-dasharray": "5 4", "stroke-width": 1.5, "data-guide-x": g.x }, s);
      if (g.y != null) S("line", { x1: m.l, y1: py(g.y), x2: m.l + pw, y2: py(g.y), stroke: FAINT, "stroke-dasharray": "5 4", "stroke-width": 1.5, "data-guide-y": g.y }, s);
    });
    (o.series || []).forEach(function (sr, i) {
      var pts = sr.pts.map(function (p) { return px(p[0]).toFixed(2) + "," + py(p[1]).toFixed(2); }).join(" ");
      var pl = S("polyline", { points: pts, fill: "none", stroke: sr.c || "#2563eb", "stroke-width": 3.2, "stroke-linejoin": "round", "class": "ser", "data-i": i }, s);
      pl.setAttribute("data-vals", JSON.stringify(sr.pts));
      if (sr.dots) sr.pts.forEach(function (p) { S("circle", { cx: px(p[0]), cy: py(p[1]), r: 3.5, fill: sr.c || "#2563eb" }, s); });
      if (sr.l) {
        var last = sr.pts[sr.pts.length - 1];
        T(s, px(last[0]) + (sr.lx || 6), py(last[1]) + (sr.ly || 4), sr.l, { size: 16, weight: 700, fill: sr.c || "#2563eb" });
      }
    });
    (o.marks || []).forEach(function (mk) {
      var c = S("circle", { cx: px(mk.x), cy: py(mk.y), r: 6, fill: mk.c || "#ef4444", stroke: "#fff", "stroke-width": 2, "class": "mark", "data-x": mk.x, "data-y": mk.y, "data-t": mk.t || "" }, s);
      if (mk.t) T(s, px(mk.x) + (mk.dx == null ? 9 : mk.dx), py(mk.y) + (mk.dy == null ? -9 : mk.dy), mk.t, { size: 17, weight: 800, fill: mk.c || "#ef4444" });
      return c;
    });
    (o.labels || []).forEach(function (lb) {
      T(s, px(lb.x), py(lb.y), lb.t, { anchor: "middle", size: lb.size || 18, weight: 800, fill: lb.c || "#7c3aed" });
    });
    return s;
  }

  /* ---------- 2. 입자 모형 상자 ---------- */
  function placeParticles(x, y, w, h, n, mode, r, rnd) {
    var pts = [], i, tries, cx, cy, ok, k;
    if (mode === "solid") {
      var cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), step = 2 * r + 1;
      var x0 = x + (w - cols * step) / 2 + r, y0 = y + h - 5 - (rows - 1) * step - r;
      for (i = 0; i < n; i++) pts.push([x0 + (i % cols) * step, y0 + Math.floor(i / cols) * step]);
      return pts;
    }
    if (mode === "liquid") {
      // 액체 : 바닥 쪽에 가깝게 모여 있되 규칙 없이(빈 칸을 무작위로, 위치를 조금씩 흔들어) 배치한다. 서로 겹치지 않는다.
      var sp = 2 * r + 4, cols2 = Math.max(1, Math.floor((w - 8) / sp)), rows2 = Math.ceil(n / cols2 * 1.35), cells = [];
      for (i = 0; i < rows2 * cols2; i++) cells.push(i);
      cells = cells.sort(function () { return rnd() - 0.5; }).slice(0, n);
      var x0 = x + (w - cols2 * sp) / 2 + sp / 2, yb = y + h - 4 - r;
      cells.forEach(function (c) {
        pts.push([x0 + (c % cols2) * sp + (rnd() - 0.5) * 3, yb - Math.floor(c / cols2) * (sp - 1) + (rnd() - 0.5) * 3]);
      });
      return pts;
    }
    var minD = 2 * r + Math.max(10, r * 1.6);
    var top = y + 4, bottom = y + h - 4;
    for (i = 0; i < n; i++) {
      ok = false;
      var md = minD;                       // 자리가 모자라면 간격 기준을 조금씩 줄이되, 입자 지름(2r)보다 가깝게는 절대 두지 않는다
      while (!ok && md >= 2 * r + 0.5) {
        for (tries = 0; tries < 400 && !ok; tries++) {
          cx = x + r + 3 + rnd() * (w - 2 * r - 6); cy = top + r + rnd() * (bottom - top - 2 * r);
          ok = true;
          for (k = 0; k < pts.length; k++) if (Math.hypot(pts[k][0] - cx, pts[k][1] - cy) < md) { ok = false; break; }
        }
        md -= 2;
      }
      pts.push([cx, cy]);
    }
    return pts;
  }
  function particles(o) {
    var boxes = o.boxes, gap = o.gap || 34, W = 30, H = 0, i;
    boxes.forEach(function (b) { W += b.w + gap; H = Math.max(H, b.h); });
    var s = root(W - gap + 30, H + 78), x = 30, aid = arrowDefs(s, "#0f172a");
    boxes.forEach(function (b, bi) {
      var g = S("g", { "class": "pbox", "data-n": b.n, "data-label": b.l || "", "data-w": b.w, "data-h": b.h }, s);
      S("rect", { x: x, y: 18, width: b.w, height: b.h, rx: 6, fill: "#f8fafc", stroke: INK, "stroke-width": 2.5 }, g);
      var rnd = RG.mulberry32(b.seed || (bi + 1) * 97), r = b.r || 8;
      var pts = placeParticles(x, 18, b.w, b.h, b.n, b.mode || "gas", r, rnd);
      pts.forEach(function (p) {
        S("circle", { cx: p[0], cy: p[1], r: r, fill: b.c || "#60a5fa", stroke: "#1d4ed8", "stroke-width": 1.2, "class": "part" }, g);
        if (b.speed) {
          var L = b.speed, a = rnd() * Math.PI * 2, tt = 0;
          while (tt++ < 40 && (p[0] + Math.cos(a) * L < x + 3 || p[0] + Math.cos(a) * L > x + b.w - 3 || p[1] + Math.sin(a) * L < 21 || p[1] + Math.sin(a) * L > 15 + b.h)) a = rnd() * Math.PI * 2;
          S("line", { x1: p[0], y1: p[1], x2: p[0] + Math.cos(a) * L, y2: p[1] + Math.sin(a) * L, stroke: "#0f172a", "stroke-width": 2, "marker-end": "url(#" + aid + ")", "class": "vel", "data-len": L }, g);
        }
      });
      if (b.l) T(s, x + b.w / 2, 18 + b.h + 30, b.l, { anchor: "middle", size: 22, weight: 800 });
      x += b.w + gap;
    });
    return s;
  }

  /* ---------- 3. 화학 반응 모형 ---------- */
  var ATOM = { H: { r: 7, f: "#fff", s: "#334155" }, O: { r: 11, f: "#ef4444", s: "#991b1b" }, N: { r: 10, f: "#3b82f6", s: "#1e3a8a" } };
  var MOL = {
    H2: [["H", -7, 0], ["H", 7, 0]], O2: [["O", -11, 0], ["O", 11, 0]], N2: [["N", -10, 0], ["N", 10, 0]],
    H2O: [["O", 0, -6], ["H", -13, 9], ["H", 13, 9]], NH3: [["N", 0, -8], ["H", -14, 9], ["H", 14, 9], ["H", 0, 15]]
  };
  function reaction(o) {
    var CELL = 50, PER = 3, terms = [], x = 20, maxRows = 1, s;
    function lay(list) {
      list.forEach(function (t, i) {
        var n = t.n === "?" ? 2 : t.n, cols = Math.min(n, PER), rows = Math.ceil(n / PER);
        maxRows = Math.max(maxRows, rows);
        terms.push({ t: t, x: x, cols: cols, rows: rows, w: cols * CELL });
        x += cols * CELL;
        if (i < list.length - 1) { terms.push({ plus: true, x: x }); x += 26; }
      });
    }
    lay(o.left); terms.push({ arrow: true, x: x + 6 }); x += 52; lay(o.right);
    var W = x + 20, H = maxRows * CELL + 70;
    s = root(W, H);
    var mid = 22 + (maxRows * CELL) / 2;
    terms.forEach(function (tm) {
      if (tm.plus) { T(s, tm.x + 13, mid + 9, "+", { anchor: "middle", size: 28, weight: 700 }); return; }
      if (tm.arrow) { T(s, tm.x + 20, mid + 9, "→", { anchor: "middle", size: 34, weight: 700 }); return; }
      var t = tm.t, g = S("g", { "class": "term", "data-m": t.m, "data-n": t.n }, s), i;
      if (t.n === "?") {
        S("rect", { x: tm.x + 4, y: 22 + 4, width: tm.w - 8, height: tm.rows * CELL - 8, rx: 8, fill: "#faf5ff", stroke: "#7c3aed", "stroke-dasharray": "5 4", "stroke-width": 2 }, g);
        T(g, tm.x + tm.w / 2, mid + 12, "?", { anchor: "middle", size: 34, weight: 800, fill: "#7c3aed" });
        return;
      }
      for (i = 0; i < t.n; i++) {
        var cx = tm.x + (i % PER) * CELL + CELL / 2, cy = 22 + Math.floor(i / PER) * CELL + CELL / 2;
        MOL[t.m].forEach(function (a) {
          S("circle", { cx: cx + a[1], cy: cy + a[2], r: ATOM[a[0]].r, fill: ATOM[a[0]].f, stroke: ATOM[a[0]].s, "stroke-width": 2, "class": "atom", "data-el": a[0] }, g);
        });
      }
    });
    var ly = H - 22, lx = 20;
    [["H", "수소 원자"], ["O", "산소 원자"], ["N", "질소 원자"]].forEach(function (a) {
      if (!o.legend || o.legend.indexOf(a[0]) < 0) return;
      S("circle", { cx: lx + 8, cy: ly, r: 8, fill: ATOM[a[0]].f, stroke: ATOM[a[0]].s, "stroke-width": 2 }, s);
      T(s, lx + 22, ly + 5, a[1], { size: 14 }); lx += 116;
    });
    return s;
  }

  /* ---------- 4. 원자·이온 모형 ---------- */
  function atom(o) {
    var s = root(230, 230), cx = 115, cy = 115, radii = [32, 58, 84], caps = [2, 8, 8], left = o.e, i, j;
    radii.forEach(function (r) { S("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "#cbd5e1", "stroke-width": 1.5 }, s); });
    S("circle", { cx: cx, cy: cy, r: 20, fill: "#fca5a5", stroke: "#b91c1c", "stroke-width": 2, "class": "nucleus", "data-p": o.p }, s);
    T(s, cx, cy + 5, o.p + "+", { anchor: "middle", size: 15, weight: 800, fill: "#7f1d1d" });
    for (i = 0; i < 3 && left > 0; i++) {
      var k = Math.min(caps[i], left); left -= k;
      for (j = 0; j < k; j++) {
        var a = (Math.PI * 2 * j) / k + i * 0.5 - Math.PI / 2;
        S("circle", { cx: cx + radii[i] * Math.cos(a), cy: cy + radii[i] * Math.sin(a), r: 6, fill: "#3b82f6", stroke: "#1e3a8a", "stroke-width": 1.5, "class": "el" }, s);
      }
    }
    if (o.sym) T(s, 14, 26, o.sym, { size: 20, weight: 800 });
    T(s, 216, 214, "● 전자", { anchor: "end", size: 13, fill: "#1d4ed8" });
    return s;
  }

  /* ---------- 5. 흐름도(암석의 순환 등) ---------- */
  function flow(o) {
    var s = root(o.w || 560, o.h || 310), aid = arrowDefs(s, INK);
    (o.arrows || []).forEach(function (a) {
      S("line", { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: INK, "stroke-width": 2.5, "marker-end": "url(#" + aid + ")" }, s);
      if (a.t) T(s, a.tx, a.ty, a.t, { anchor: "middle", size: a.blank ? 22 : 16, weight: a.blank ? 800 : 500, fill: a.blank ? "#7c3aed" : INK });
    });
    (o.nodes || []).forEach(function (n) {
      S("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, fill: n.c || "#eff6ff", stroke: INK, "stroke-width": 2 }, s);
      T(s, n.x + n.w / 2, n.y + n.h / 2 + 6, n.t, { anchor: "middle", size: 17, weight: 800 });
    });
    return s;
  }

  /* ---------- 6. 막대 그래프(쌓은 막대) ---------- */
  function bars(o) {
    var w = o.w || 480, h = o.h || 300, m = { l: 60, r: 20, t: 40, b: 54 }, pw = w - m.l - m.r, ph = h - m.t - m.b, Y = o.y;
    var s = root(w, h);
    function py(v) { return m.t + ph - (v - Y[0]) / (Y[1] - Y[0]) * ph; }
    s.setAttribute("data-plot", [m.l, m.t, pw, ph].join(",")); s.setAttribute("data-y", Y.join(","));
    for (var v = Y[0]; v <= Y[1] + 1e-9; v += Y[2]) {
      S("line", { x1: m.l, y1: py(v), x2: m.l + pw, y2: py(v), stroke: "#eef2f7" }, s);
      T(s, m.l - 8, py(v) + 5, num(v), { anchor: "end", size: 14 });
    }
    S("line", { x1: m.l, y1: m.t, x2: m.l, y2: m.t + ph, stroke: INK, "stroke-width": 2 }, s);
    S("line", { x1: m.l, y1: m.t + ph, x2: m.l + pw, y2: m.t + ph, stroke: INK, "stroke-width": 2 }, s);
    T(s, 16, m.t + ph / 2, o.yl || "", { anchor: "middle", size: 15, weight: 700, rot: -90 });
    var n = o.cats.length, slot = pw / n, bw = Math.min(70, slot * 0.6);
    o.cats.forEach(function (c, i) {
      var x = m.l + slot * i + (slot - bw) / 2, base = 0;
      c.parts.forEach(function (p) {
        var top = py(base + p.v), bot = py(base), hh = bot - top;
        var r = S("rect", { x: x, y: top, width: bw, height: Math.max(0, hh), fill: p.q ? "#f3e8ff" : p.c, stroke: p.q ? "#7c3aed" : "#fff", "stroke-width": p.q ? 2 : 1.5, "stroke-dasharray": p.q ? "5 4" : null, "class": "bpart", "data-v": p.v, "data-n": p.n, "data-cat": c.l }, s);
        if (hh >= 16) T(s, x + bw / 2, (top + bot) / 2 + 5, p.q ? "?" : num(p.v), { anchor: "middle", size: p.q ? 20 : 15, weight: 800, fill: p.q ? "#7c3aed" : "#fff" });
        base += p.v; return r;
      });
      T(s, x + bw / 2, m.t + ph + 20, c.l, { anchor: "middle", size: 16, weight: 800 });
      if (c.sub) T(s, x + bw / 2, m.t + ph + 38, c.sub, { anchor: "middle", size: 13 });
    });
    (o.legend || []).forEach(function (g, i) {
      S("rect", { x: m.l + i * 130, y: 10, width: 16, height: 16, rx: 3, fill: g.c }, s);
      T(s, m.l + i * 130 + 22, 23, g.n, { size: 14 });
    });
    return s;
  }

  /* ---------- 7. 천체 배치 ---------- */
  var BODY = { S: { r: 34, c: "#f59e0b", t: "태양" }, E: { r: 17, c: "#3b82f6", t: "지구" }, M: { r: 9, c: "#94a3b8", t: "달" } };
  function orbitLine(o) {
    var s = root(520, 190), n = o.order.length, gap = 500 / (n + 0.4), i;
    S("line", { x1: 30, y1: 88, x2: 490, y2: 88, stroke: FAINT, "stroke-dasharray": "5 5" }, s);
    o.order.forEach(function (k, i) {
      var b = BODY[k], x = 60 + i * (gap * 0.95) + (i ? 20 * i : 0);
      x = 90 + i * 170;
      S("circle", { cx: x, cy: 88, r: b.r, fill: b.c, stroke: "#475569", "stroke-width": 2, "class": "body", "data-b": k, "data-x": x }, s);
      T(s, x, 88 + 34 + 24, b.t, { anchor: "middle", size: 20, weight: 800 });
    });
    T(s, 260, 20, "(크기와 거리는 실제와 달라요)", { anchor: "middle", size: 13, fill: FAINT });
    return s;
  }
  function orbitRing(o) {
    var s = root(520, 300), cx = 300, cy = 150, R0 = 100, aid = arrowDefs(s, "#f59e0b");
    S("circle", { cx: cx, cy: cy, r: R0, fill: "none", stroke: FAINT, "stroke-dasharray": "6 5", "stroke-width": 2 }, s);
    S("circle", { cx: 60, cy: cy, r: 36, fill: "#f59e0b", stroke: "#b45309", "stroke-width": 2 }, s);
    T(s, 60, cy + 6, "태양", { anchor: "middle", size: 18, weight: 800, fill: "#78350f" });
    [-42, 0, 42].forEach(function (dy) {
      S("line", { x1: 108, y1: cy + dy, x2: 178, y2: cy + dy, stroke: "#f59e0b", "stroke-width": 3, "marker-end": "url(#" + aid + ")" }, s);
    });
    S("circle", { cx: cx, cy: cy, r: 20, fill: "#3b82f6", stroke: "#1e3a8a", "stroke-width": 2 }, s);
    T(s, cx, cy + 5, "지구", { anchor: "middle", size: 14, weight: 800, fill: "#fff" });
    var pos = { A: [cx - R0, cy], B: [cx, cy + R0], C: [cx + R0, cy], D: [cx, cy - R0] };
    Object.keys(pos).forEach(function (k) {
      S("circle", { cx: pos[k][0], cy: pos[k][1], r: 10, fill: "#94a3b8", stroke: "#334155", "stroke-width": 2, "class": "moonpos", "data-k": k, "data-dx": pos[k][0] - cx, "data-dy": pos[k][1] - cy }, s);
    });
    T(s, pos.A[0], pos.A[1] - 18, "A", { anchor: "middle", size: 22, weight: 800, fill: "#7c3aed" });
    T(s, pos.B[0] + 22, pos.B[1] + 8, "B", { anchor: "middle", size: 22, weight: 800, fill: "#7c3aed" });
    T(s, pos.C[0] + 26, pos.C[1] + 8, "C", { anchor: "middle", size: 22, weight: 800, fill: "#7c3aed" });
    T(s, pos.D[0] + 22, pos.D[1] + 4, "D", { anchor: "middle", size: 22, weight: 800, fill: "#7c3aed" });
    T(s, 60, cy + 62, "태양 빛 →", { anchor: "middle", size: 14, fill: "#b45309" });
    T(s, 260, 22, "(달이 지구 둘레를 도는 모습, 위에서 본 그림)", { anchor: "middle", size: 13, fill: FAINT });
    return s;
  }

  /* ---------- 8. 지구 내부 ---------- */
  function earth(o) {
    var s = root(520, 300), cx = 150, cy = 150, R0 = 118;
    var L = [["지각", 6340, 6370, "#a16207"], ["맨틀", 3480, 6340, "#f97316"], ["외핵", 1220, 3480, "#facc15"], ["내핵", 0, 1220, "#fde68a"]];
    var k = R0 / 6370;
    L.forEach(function (l) {
      S("circle", { cx: cx, cy: cy, r: Math.max(l[2] * k, 0), fill: l[3], stroke: "#7c2d12", "stroke-width": 1.5, "class": "layer", "data-layer": l[0], "data-r": l[2] }, s);
    });
    // 안쪽 층이 위에 오도록 큰 원부터 그렸다. 지각은 얇아서 바깥 테두리만 보인다.
    var ang = -Math.PI / 7, ly = [58, 108, 158, 208];
    L.forEach(function (l, i) {
      var rm = ((l[1] + l[2]) / 2) * k; if (l[0] === "지각") rm = R0 - 1.5;
      var x1 = cx + rm * Math.cos(ang), y1 = cy + rm * Math.sin(ang), x2 = 330, y2 = ly[i];
      S("line", { x1: x1, y1: y1, x2: x2 - 24, y2: y2, stroke: INK, "stroke-width": 1.6 }, s);
      S("circle", { cx: x1, cy: y1, r: 3, fill: INK }, s);
      S("circle", { cx: x2, cy: y2, r: 19, fill: "#fff", stroke: "#7c3aed", "stroke-width": 2.5 }, s);
      T(s, x2, y2 + 7, o.letters[l[0]], { anchor: "middle", size: 22, weight: 800, fill: "#7c3aed", cls: "lt" }).setAttribute("data-layer", l[0]);
    });
    T(s, 420, 160, "지구 내부의 층", { anchor: "middle", size: 15, fill: FAINT });
    return s;
  }

  /* ---------- 9. 파형 ---------- */
  function waves(o) {
    var rows = o.items.length, w = 500, rowH = 96, h = rows * rowH + 62, mL = 56, pw = w - mL - 24, unit = 16;
    var s = root(w, h);
    o.items.forEach(function (it, i) {
      var y0 = 30 + i * rowH + rowH / 2 - 8, pts = [], N = 240, j;
      for (j = 0; j <= N; j++) {
        var t = j / N;
        pts.push((mL + t * pw).toFixed(2) + "," + (y0 - it.amp * unit * Math.sin(2 * Math.PI * it.cyc * t)).toFixed(2));
      }
      S("line", { x1: mL, y1: y0, x2: mL + pw, y2: y0, stroke: FAINT, "stroke-dasharray": "4 4" }, s);
      S("polyline", { points: pts.join(" "), fill: "none", stroke: it.c || "#2563eb", "stroke-width": 3, "class": "wave", "data-l": it.l, "data-amp": it.amp, "data-cyc": it.cyc, "data-unit": unit }, s);
      T(s, 28, y0 + 8, it.l, { anchor: "middle", size: 24, weight: 800, fill: it.c || "#2563eb" });
    });
    var yb = 30 + rows * rowH - 4;
    S("line", { x1: mL, y1: yb, x2: mL + pw, y2: yb, stroke: INK, "stroke-width": 2 }, s);
    T(s, mL + pw / 2, yb + 24, o.span || "같은 시간 동안 측정한 파형", { anchor: "middle", size: 15, weight: 700 });
    return s;
  }

  /* ---------- 10. 유전 교배 표 ---------- */
  function punnett(o) {
    var d = document.createElement("div"); d.className = "fig punn";
    var t = document.createElement("table"); t.className = "punnett"; d.appendChild(t);
    function gt(a, b) { return (a === a.toUpperCase() ? a + b : b === b.toUpperCase() ? b + a : a + b); }
    var tr = document.createElement("tr"), th = document.createElement("th");
    th.textContent = o.title || ""; th.className = "corner"; tr.appendChild(th);
    o.p2.forEach(function (a) { var c = document.createElement("th"); c.textContent = a; tr.appendChild(c); });
    t.appendChild(tr);
    o.p1.forEach(function (a) {
      var r = document.createElement("tr"), h = document.createElement("th"); h.textContent = a; r.appendChild(h);
      o.p2.forEach(function (b) {
        var c = document.createElement("td"); c.className = "gt"; c.setAttribute("data-gt", gt(a, b));
        c.textContent = o.hide ? "?" : gt(a, b); r.appendChild(c);
      });
      t.appendChild(r);
    });
    return d;
  }

  /* ---------- 11. 세포 속 염색체 ---------- */
  function cells(o) {
    var mom = o.mother, kids = o.kids, W = 520, H = kids.length > 2 ? 250 : 180, s = root(W, H), aid = arrowDefs(s, INK);
    function cell(cx, cy, r, n, label) {
      var g = S("g", { "class": "cell", "data-n": n, "data-l": label || "" }, s);
      S("circle", { cx: cx, cy: cy, r: r, fill: "#fdf2f8", stroke: "#be185d", "stroke-width": 2.5 }, g);
      var cols = Math.min(n, 4), rows = Math.ceil(n / cols), i;
      for (i = 0; i < n; i++) {
        var x = cx + (i % cols - (cols - 1) / 2) * 15, y = cy + (Math.floor(i / cols) - (rows - 1) / 2) * 30;
        S("rect", { x: x - 3.5, y: y - 12, width: 7, height: 24, rx: 3.5, fill: i % 2 ? "#2563eb" : "#dc2626", "class": "rod" }, g);
      }
      if (label) T(s, cx, cy + r + 22, label, { anchor: "middle", size: 16, weight: 700 });
    }
    cell(90, H / 2 - 8, 52, mom.n, mom.l);
    S("line", { x1: 165, y1: H / 2 - 8, x2: 235, y2: H / 2 - 8, stroke: INK, "stroke-width": 3, "marker-end": "url(#" + aid + ")" }, s);
    T(s, 200, H / 2 - 22, o.arrow || "", { anchor: "middle", size: 15, weight: 700 });
    var kr = kids.length > 2 ? 40 : 46;
    kids.forEach(function (k, i) {
      var col = kids.length > 2 ? i % 2 : i, row = kids.length > 2 ? Math.floor(i / 2) : 0;
      var cx = kids.length > 2 ? 310 + col * 110 : 310 + col * 130, cy = kids.length > 2 ? 60 + row * 120 : H / 2 - 8;
      cell(cx, cy, kr, k.n, k.l);
    });
    return s;
  }

  /* ---------- 12. 회로도(직렬·병렬) ---------- */
  function circuit(o) {
    var W = 520, H = 230, s = root(W, H), n = o.R.length, top = 62, bot = 176, xl = 100, xr = 480, i;
    function wire(x1, y1, x2, y2) { S("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: INK, "stroke-width": 2.5 }, s); }
    function res(cx, cy, r) {
      S("rect", { x: cx - 38, y: cy - 17, width: 76, height: 34, rx: 5, fill: "#fef3c7", stroke: "#92400e", "stroke-width": 2.5, "class": "res", "data-r": r }, s);
      T(s, cx, cy + 6, r + " Ω", { anchor: "middle", size: 17, weight: 800 });
    }
    if (o.type === "series") {
      wire(xl, top, xr, top); wire(xr, top, xr, bot); wire(xl, bot, xr, bot);
      for (i = 0; i < n; i++) res(xl + (xr - xl) * (i + 1) / (n + 1), top, o.R[i]);
    } else {
      var bxs = [];
      for (i = 0; i < n; i++) bxs.push(xl + (xr - 40 - xl) * (i + 1) / (n + 1));
      var end = bxs[n - 1];
      wire(xl, top, end, top); wire(xl, bot, end, bot);
      for (i = 0; i < n; i++) { wire(bxs[i], top, bxs[i], bot); res(bxs[i], (top + bot) / 2, o.R[i]); }
    }
    wire(xl, top, xl, 104); wire(xl, 122, xl, bot);
    S("line", { x1: xl - 20, y1: 104, x2: xl + 20, y2: 104, stroke: INK, "stroke-width": 3.5 }, s);
    S("line", { x1: xl - 10, y1: 122, x2: xl + 10, y2: 122, stroke: INK, "stroke-width": 6 }, s);
    T(s, xl + 28, 108, "+", { size: 18, weight: 800, fill: "#b91c1c" });
    T(s, xl + 28, 134, "−", { size: 18, weight: 800 });
    var v = T(s, xl - 30, 118, o.V + " V", { anchor: "end", size: 19, weight: 800, fill: "#b91c1c", cls: "volt" });
    v.setAttribute("data-v", o.V);
    T(s, W / 2, H - 14, o.type === "series" ? "직렬 연결" : "병렬 연결", { anchor: "middle", size: 14, fill: FAINT });
    return s;
  }

  var G = { circuit: circuit, graph: graph, particles: particles, reaction: reaction, atom: atom, flow: flow, bars: bars, orbitLine: orbitLine, orbitRing: orbitRing, earth: earth, waves: waves, punnett: punnett, cells: cells };
  RG.fig = function (f) {
    var fn = G[f.k];
    if (!fn) throw new Error("모르는 그림 종류: " + f.k);
    return fn(f.o);
  };
})();
