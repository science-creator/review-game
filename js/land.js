/* =========================================================
   land.js — 땅따먹기 (교사 화면 1대 + 모둠 화이트보드)
   규칙
   · 차례 모둠이 칸(단원 × 난이도)을 고른다. 모든 모둠이 화이트보드에 답을 쓴다.
   · 정답 공개 후 맞힌 모둠을 모두 누른다.
   · 차례 모둠이 맞히면 그 칸을 차지한다(이미 남의 땅이면 뺏는다 — 이때는 다른 문제).
   · 차례가 아닌데 맞힌 모둠은 찬스 점수 +1.
   · 점수 = 지금 가진 칸의 점수(하 1·중 2·상 3, ⭐는 2배) + 한 단원 세 칸 정복 +2 + 찬스 점수
   ========================================================= */
(function () {
  "use strict";
  var R = RG;
  var S = parseInt(R.param("s"), 10);
  if (!R.SESSIONS[S] || R.SESSIONS[S].type !== "land") S = 1;
  var CFG = R.SESSIONS[S];
  var KEY = "rg-land-" + S;

  var COLORS = [
    { bg: "#ef4444", fg: "#fff" }, { bg: "#f97316", fg: "#431407" }, { bg: "#facc15", fg: "#422006" },
    { bg: "#22c55e", fg: "#052e16" }, { bg: "#06b6d4", fg: "#083344" }, { bg: "#3b82f6", fg: "#fff" },
    { bg: "#a855f7", fg: "#fff" }, { bg: "#ec4899", fg: "#fff" }
  ];
  var QSEC = 30;                                   // 문제 하나당 생각 시간(초)

  var st = null;                                   // 게임 상태
  var tickTimer = null;
  var $ = function (id) { return document.getElementById(id); };
  var root = $("dlgRoot");

  document.title = CFG.label + " · " + CFG.title;
  $("badge").textContent = CFG.label + " · " + CFG.title;

  /* ---------- 상태 ---------- */
  function newState(n, names, minutes) {
    var keys = [];
    CFG.units.forEach(function (u) { [1, 2, 3].forEach(function (lv) { keys.push(u + "-" + lv); }); });
    var stars = R.shuffled(keys, Math.random).slice(0, Math.max(2, Math.round(keys.length / 8)));
    var stats = {};
    CFG.units.forEach(function (u) { stats[u] = { k: 0, n: 0, asked: 0 }; });
    return {
      n: n, names: names, owner: {}, tries: {}, stars: stars, bonus: names.map(function () { return 0; }),
      turn: 0, stats: stats, hist: [], running: true, endAt: Date.now() + minutes * 60000, remainMs: 0, minutes: minutes
    };
  }
  function persist() { R.save(KEY, st); }

  function pts(key) {
    var lv = parseInt(key.split("-")[1], 10);
    return lv * (st.stars.indexOf(key) >= 0 ? 2 : 1);
  }
  function conquered(g) {
    return CFG.units.filter(function (u) {
      return [1, 2, 3].every(function (lv) { return st.owner[u + "-" + lv] === g; });
    });
  }
  function tileCount(g) {
    return Object.keys(st.owner).filter(function (k) { return st.owner[k] === g; }).length;
  }
  function score(g) {
    var s = st.bonus[g] + conquered(g).length * 2;
    Object.keys(st.owner).forEach(function (k) { if (st.owner[k] === g) s += pts(k); });
    return s;
  }

  /* ---------- 시계 ---------- */
  function remainSec() {
    return st.running ? (st.endAt - Date.now()) / 1000 : st.remainMs / 1000;
  }
  function tick() {
    if (!st) return;
    var r = remainSec();
    var c = $("clock");
    c.textContent = (r < 0 ? "+" : "") + R.fmt(Math.abs(r));
    c.classList.toggle("low", r <= 180);
    $("bPause").textContent = st.running ? "⏸ 멈춤" : "▶ 이어서";
  }
  function togglePause() {
    if (!st) return;
    if (st.running) { st.remainMs = st.endAt - Date.now(); st.running = false; }
    else { st.endAt = Date.now() + st.remainMs; st.running = true; }
    persist(); tick();
  }

  /* ---------- 그리기 ---------- */
  function paint() {
    if (!st) return;
    drawBoard(); drawSide(); tick();
  }
  function drawBoard() {
    var b = $("board");
    b.textContent = "";
    var head = R.el("div", "brow head");
    head.appendChild(R.el("div", null, "단원"));
    [1, 2, 3].forEach(function (lv) { head.appendChild(R.el("div", null, "난이도 " + R.LV[lv] + " (" + lv + "점)")); });
    b.appendChild(head);
    CFG.units.forEach(function (u) {
      var row = R.el("div", "brow");
      var first = st.owner[u + "-1"];
      var whole = first != null && [1, 2, 3].every(function (lv) { return st.owner[u + "-" + lv] === first; });
      var lab = R.el("div", "ulabel" + (whole ? " won" : ""));
      lab.appendChild(R.el("span", "ic", R.UNITS[u].i));
      var t = R.el("div");
      t.appendChild(R.el("small", null, "중" + R.UNITS[u].g + " · 단원 " + u + (whole ? " · 🚩정복!" : "")));
      t.appendChild(document.createTextNode(R.UNITS[u].n));
      lab.appendChild(t);
      row.appendChild(lab);
      [1, 2, 3].forEach(function (lv) {
        var key = u + "-" + lv, own = st.owner[key];
        var btn = R.el("button", "tile" + (own != null ? " owned" : ""));
        btn.type = "button";
        btn.dataset.key = key;
        if (own != null) {
          btn.style.background = COLORS[own].bg; btn.style.color = COLORS[own].fg;
          btn.appendChild(R.el("span", "who", st.names[own]));
          btn.appendChild(R.el("span", null, pts(key) + "점"));
        } else {
          btn.textContent = R.LV[lv] + " · " + pts(key) + "점";
        }
        if (st.stars.indexOf(key) >= 0) btn.appendChild(R.el("span", "star", "⭐×2"));
        btn.addEventListener("click", function () { openQuestion(u, lv); });
        row.appendChild(btn);
      });
      b.appendChild(row);
    });
  }
  function drawSide() {
    var box = $("score");
    box.textContent = "";
    var order = st.names.map(function (_, i) { return i; });
    order.forEach(function (g) {
      var r = R.el("div", "gr" + (g === st.turn ? " turn" : ""));
      var dot = R.el("div", "dot"); dot.style.background = COLORS[g].bg;
      var nm = R.el("div", "nm", st.names[g]);
      nm.title = "누르면 모둠 이름을 바꿀 수 있어요";
      nm.appendChild(R.el("small", null, tileCount(g) + "칸" + (conquered(g).length ? " · 정복 " + conquered(g).length : "") + (st.bonus[g] ? " · 찬스 +" + st.bonus[g] : "")));
      nm.addEventListener("click", function () {
        var v = window.prompt("모둠 이름", st.names[g]);
        if (v && v.trim()) { st.names[g] = v.trim().slice(0, 8); persist(); paint(); }
      });
      r.appendChild(dot); r.appendChild(nm); r.appendChild(R.el("div", "sc", String(score(g))));
      box.appendChild(r);
    });
    var tb = $("turnbox");
    tb.textContent = "🎯 " + st.names[st.turn] + " 차례";
    tb.style.background = COLORS[st.turn].bg; tb.style.color = COLORS[st.turn].fg;
  }
  function toast(msg) {
    var t = R.el("div", null, msg);
    t.style.cssText = "position:fixed;left:50%;bottom:34px;transform:translateX(-50%);background:#111827;color:#fff;padding:12px 26px;border-radius:14px;font-size:24px;font-weight:800;z-index:40;box-shadow:0 6px 24px rgba(0,0,0,.35)";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2400);
  }

  /* ---------- 창 ---------- */
  function closeDlg() { root.textContent = ""; }
  function dialog(small) {
    var dim = R.el("div", "dim");
    var d = R.el("div", "dlg" + (small ? " small" : ""));
    dim.appendChild(d); root.textContent = ""; root.appendChild(dim);
    return d;
  }

  function setupDialog() {
    var d = dialog(true);
    d.appendChild(R.el("h2", null, "🗺️ " + CFG.title));
    d.appendChild(R.el("p", "note", "모둠 수와 이름을 정하고 시작하세요. (모둠 이름은 게임 중에도 점수판에서 누르면 바꿀 수 있어요)"));
    var row = R.el("div", "actions");
    row.appendChild(R.el("span", null, "모둠 수"));
    var sel = R.el("select");
    for (var i = 2; i <= 8; i++) { var o = R.el("option", null, i + "모둠"); o.value = i; if (i === 7) o.selected = true; sel.appendChild(o); }
    row.appendChild(sel);
    row.appendChild(R.el("span", null, "  시간(분)"));
    var mi = R.el("input"); mi.type = "number"; mi.min = 5; mi.max = 90; mi.value = CFG.minutes; mi.style.cssText = "width:80px;font:inherit;padding:6px;border-radius:8px;border:2px solid #d1d5db";
    row.appendChild(mi);
    d.appendChild(row);
    var names = R.el("div", "who-row");
    d.appendChild(names);
    function drawNames() {
      var n = parseInt(sel.value, 10), old = [].map.call(names.querySelectorAll("input"), function (x) { return x.value; });
      names.textContent = "";
      for (var g = 0; g < n; g++) {
        var inp = R.el("input"); inp.value = old[g] || (g + 1) + "모둠"; inp.maxLength = 8;
        inp.style.cssText = "width:120px;font:inherit;padding:6px 10px;border-radius:10px;border:3px solid " + COLORS[g].bg;
        names.appendChild(inp);
      }
    }
    sel.addEventListener("change", drawNames); drawNames();
    d.appendChild(rulesBlock());
    var go = R.el("button", "btn", "▶ 게임 시작");
    go.style.marginTop = "12px";
    go.addEventListener("click", function () {
      var n = parseInt(sel.value, 10);
      var nm = [].map.call(names.querySelectorAll("input"), function (x, i) { return x.value.trim() || (i + 1) + "모둠"; });
      var min = Math.min(90, Math.max(5, parseInt(mi.value, 10) || CFG.minutes));
      st = newState(n, nm, min); persist(); closeDlg(); paint();
    });
    d.appendChild(go);
  }
  function rulesBlock() {
    var b = R.el("div", "panel");
    b.style.boxShadow = "none"; b.style.background = "#f8fafc"; b.style.marginTop = "14px";
    b.appendChild(R.el("h3", null, "📖 규칙"));
    var ul = R.el("ul");
    [
      "차례 모둠이 칸(단원 × 난이도)을 고른다. 이미 차지한 칸을 뺏으려면 다시 고르면 된다(다른 문제가 나온다).",
      "문제가 나오면 모든 모둠이 화이트보드에 답(①~④)을 쓰고, 선생님의 신호에 동시에 든다.",
      "차례 모둠이 맞히면 그 칸을 차지한다. 점수는 하 1점 · 중 2점 · 상 3점, ⭐ 칸은 2배.",
      "차례가 아닌 모둠도 맞히면 찬스 점수 +1.",
      "한 단원의 세 칸을 모두 차지하면 정복 보너스 +2. 점수는 지금 가진 땅으로 계산하니 언제든 뒤집힌다!"
    ].forEach(function (t) { ul.appendChild(R.el("li", null, t)); });
    b.appendChild(ul);
    return b;
  }
  function rulesDialog() {
    var d = dialog(true);
    d.appendChild(rulesBlock());
    var c = R.el("button", "btn", "닫기"); c.style.marginTop = "12px";
    c.addEventListener("click", closeDlg); d.appendChild(c);
  }

  /* ---------- 문제 ---------- */
  function openQuestion(u, lv) {
    if (!st) return;
    var key = u + "-" + lv, own = st.owner[key];
    if (own === st.turn) { toast("이미 " + st.names[st.turn] + " 땅이에요. 다른 칸을 골라요!"); return; }
    var tries = st.tries[key] || 0;
    var q = R.getQ(u, lv, tries, CFG.bank);
    if (!q) { toast("이 칸의 문제가 없어요."); return; }
    var pr = R.prepare(q, Math.random);
    var turn = st.turn;

    var d = dialog();
    var qh = R.el("div", "qh");
    var p1 = R.el("span", "pill", st.names[turn] + " 차례"); p1.style.background = COLORS[turn].bg; p1.style.color = COLORS[turn].fg;
    qh.appendChild(p1);
    qh.appendChild(R.el("span", "pill", R.UNITS[u].i + " " + R.UNITS[u].n));
    qh.appendChild(R.el("span", "pill lvl" + lv, "난이도 " + R.LV[lv] + " · " + pts(key) + "점" + (st.stars.indexOf(key) >= 0 ? " ⭐" : "")));
    if (own != null) qh.appendChild(R.el("span", "pill", "⚔️ " + st.names[own] + " 땅 뺏기 도전!"));
    var qt = R.el("span", "qtimer", "⏱ " + QSEC); qh.appendChild(qt);
    d.appendChild(qh);
    d.appendChild(R.el("div", "qtext", q.q));
    var body = d;                                    // 그림이 있으면 그림(왼쪽)과 보기(오른쪽)를 나란히 놓는다
    if (q.fig) { body = R.el("div", "qbody"); body.appendChild(R.fig(q.fig)); d.appendChild(body); d.classList.add("hasfig"); }

    var ch = R.el("div", "choices"), items = [];
    pr.order.forEach(function (orig, i) {
      var c = R.el("div", "ch");
      c.appendChild(R.el("span", "ltr", "①②③④".charAt(i)));
      c.appendChild(R.el("span", null, q.c[orig]));
      ch.appendChild(c); items.push(c);
    });
    body.appendChild(ch);

    var extra = R.el("div"); d.appendChild(extra);
    var act = R.el("div", "actions"); d.appendChild(act);

    var sec = QSEC, iv = null;
    function stopTimer() { if (iv) { clearInterval(iv); iv = null; } }
    var bT = R.el("button", "btn ghost", "⏱ " + QSEC + "초 시작");
    bT.addEventListener("click", function () {
      stopTimer(); sec = QSEC; qt.textContent = "⏱ " + sec; qt.classList.remove("low");
      iv = setInterval(function () {
        sec--; qt.textContent = "⏱ " + Math.max(0, sec); qt.classList.toggle("low", sec <= 5);
        if (sec <= 0) { stopTimer(); qt.textContent = "⏰ 끝!"; }
      }, 1000);
    });
    var bR = R.el("button", "btn warn", "✅ 정답 공개");
    var bX = R.el("button", "btn ghost", "칸 다시 고르기");
    bX.addEventListener("click", function () { stopTimer(); closeDlg(); });
    act.appendChild(bT); act.appendChild(bR); act.appendChild(bX);

    bR.addEventListener("click", function () {
      stopTimer(); qt.textContent = "";
      items[pr.correct].classList.add("right");
      extra.appendChild(R.el("div", "exp", "💡 " + q.e));
      act.textContent = "";
      var who = R.el("div");
      who.appendChild(R.el("p", null, "정답을 맞힌 모둠을 모두 눌러 주세요."));
      var wr = R.el("div", "who-row"), on = {};
      st.names.forEach(function (nm, g) {
        var b = R.el("button", "who-btn", nm); b.type = "button";
        b.addEventListener("click", function () {
          on[g] = !on[g]; b.classList.toggle("on", !!on[g]);
          b.style.background = on[g] ? COLORS[g].bg : "#fff"; b.style.color = on[g] ? COLORS[g].fg : "";
        });
        wr.appendChild(b);
      });
      who.appendChild(wr); extra.appendChild(who);
      var ok = R.el("button", "btn ok", "확정하고 다음 차례로");
      ok.addEventListener("click", function () {
        var right = Object.keys(on).filter(function (g) { return on[g]; }).map(Number);
        closeDlg(); resolve(u, lv, key, turn, right);
      });
      act.appendChild(ok);
      var back = R.el("button", "btn ghost", "칸 다시 고르기");
      back.addEventListener("click", closeDlg); act.appendChild(back);
    });
  }

  function resolve(u, lv, key, turn, right) {
    st.hist.push(JSON.stringify({ owner: st.owner, tries: st.tries, bonus: st.bonus, turn: st.turn, stats: st.stats }));
    if (st.hist.length > 60) st.hist.shift();
    var before = st.owner[key];
    var turnRight = right.indexOf(turn) >= 0;
    right.forEach(function (g) { if (g !== turn) st.bonus[g] += 1; });
    if (turnRight) st.owner[key] = turn;
    st.tries[key] = (st.tries[key] || 0) + 1;
    var s = st.stats[u]; s.k += right.length; s.n += st.n; s.asked += 1;
    st.turn = (st.turn + 1) % st.n;
    persist(); paint();
    var tile = document.querySelector('.tile[data-key="' + key + '"]');
    if (tile) { tile.classList.add("flash"); }
    if (turnRight) toast("🎉 " + st.names[turn] + (before != null ? " 땅 뺏기 성공!" : " 점령!"));
    else toast("😢 " + st.names[turn] + " 아쉬워요. 다음 모둠 차례!");
  }

  function undo() {
    if (!st || !st.hist.length) { toast("되돌릴 기록이 없어요."); return; }
    var prev = JSON.parse(st.hist.pop());
    st.owner = prev.owner; st.tries = prev.tries; st.bonus = prev.bonus; st.turn = prev.turn; st.stats = prev.stats;
    persist(); paint(); toast("↩ 한 번 되돌렸어요.");
  }

  /* ---------- 결과 ---------- */
  function resultDialog() {
    var d = dialog();
    d.appendChild(R.el("h2", null, "🏁 결과 · " + CFG.title));
    var order = st.names.map(function (_, i) { return i; }).sort(function (a, b) { return score(b) - score(a) || tileCount(b) - tileCount(a); });
    var medal = ["🥇", "🥈", "🥉"];
    order.forEach(function (g, i) {
      var r = R.el("div", "rank");
      r.style.borderLeft = "12px solid " + COLORS[g].bg;
      r.appendChild(R.el("div", "n", medal[i] || String(i + 1)));
      r.appendChild(R.el("div", null, st.names[g]));
      r.appendChild(R.el("div", "note", tileCount(g) + "칸 · 정복 " + conquered(g).length + " · 찬스 +" + st.bonus[g]));
      r.appendChild(R.el("div", "sc", score(g) + "점"));
      d.appendChild(r);
    });
    d.appendChild(R.el("h3", null, "📊 단원별 정답률 — 낮은 단원은 한 번 더 짚어 주세요"));
    var rows = CFG.units.filter(function (u) { return st.stats[u].asked > 0; })
      .map(function (u) { return { u: u, rate: st.stats[u].k / st.stats[u].n }; })
      .sort(function (a, b) { return a.rate - b.rate; });
    if (!rows.length) d.appendChild(R.el("p", "note", "아직 푼 문제가 없어요."));
    rows.forEach(function (x) {
      var w = R.el("div", "wk");
      w.appendChild(R.el("div", null, R.UNITS[x.u].i + " " + R.UNITS[x.u].n));
      var bar = R.el("div", "bar" + (x.rate < 0.5 ? " weak" : "")); var i = R.el("i"); i.style.width = Math.round(x.rate * 100) + "%"; bar.appendChild(i);
      w.appendChild(bar); w.appendChild(R.el("div", null, Math.round(x.rate * 100) + "%"));
      d.appendChild(w);
    });
    var act = R.el("div", "actions");
    var c = R.el("button", "btn", "계속하기"); c.addEventListener("click", closeDlg);
    var rs = R.el("button", "btn no", "처음부터 다시"); rs.addEventListener("click", function () {
      if (window.confirm("점수와 땅이 모두 지워집니다. 처음부터 다시 할까요?")) { R.drop(KEY); st = null; setupDialog(); }
    });
    act.appendChild(c); act.appendChild(rs); d.appendChild(act);
  }

  /* ---------- 시작 ---------- */
  $("bPause").addEventListener("click", togglePause);
  $("bUndo").addEventListener("click", undo);
  $("bRule").addEventListener("click", rulesDialog);
  $("bEnd").addEventListener("click", function () { if (st) resultDialog(); });

  var saved = R.load(KEY);
  if (saved && saved.n && saved.owner) { st = saved; paint(); toast("이어서 진행합니다 (이전 기록)"); }
  else { setupDialog(); }
  tickTimer = setInterval(tick, 500);
})();
