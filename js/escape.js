/* =========================================================
   escape.js — 탈출 게임 (모둠 기기 1대씩)
   · 방마다 문제 3개(하·중·상). 답을 고르고 「문 열기」를 누른다.
   · 몇 문제가 틀렸는지는 알려 주지 않는다. 틀리면 잠금 대기(20초 → 40초 … 최대 120초).
   · 「힌트」는 문제 하나의 오답 보기 2개를 지워 주고 시계에 60초를 더한다.
   · 방을 통과하면 풀이 노트(정답과 해설)를 보여 준다. 마지막 방은 문제 4개.
   · 끝나면 기록 카드와 인증 코드가 나온다 → teacher.html 에 붙여 넣으면 순위가 된다.
   같은 모둠 번호면 보기 순서가 같고, 다른 모둠이면 달라서 옆 모둠 답을 베낄 수 없다.
   ========================================================= */
(function () {
  "use strict";
  var R = RG;
  var S = parseInt(R.param("s"), 10);
  if (!R.SESSIONS[S] || R.SESSIONS[S].type !== "escape") S = 3;
  var CFG = R.SESSIONS[S];
  var KEY = "rg-escape-" + S;
  var HINT_SEC = 60;
  var LIMIT = CFG.minutes * 60;

  /* 방 목록 : 단원 방 4개 + 마지막 방 */
  var ROOMS = CFG.rooms.map(function (r) {
    return { name: r.name, story: r.story, unit: r.u, qs: [[r.u, 1, 0], [r.u, 2, 0], [r.u, 3, 0]] };
  });
  ROOMS.push({ name: CFG.final.name, story: CFG.final.story, unit: 0, qs: CFG.final.qs });
  var THEME = ["🧪", "⛅", "🎢", "🧠", "🚪"];
  if (S === 4) THEME = ["🧬", "🔋", "🔭", "🤖", "🎓"];
  if (S === 6) THEME = ["🌍", "🌙", "🌊", "🧬", "🎓"];

  var st = null;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage");
  document.title = CFG.label + " · " + CFG.title;
  $("badge").textContent = CFG.label + " · " + CFG.title;

  function persist() { R.save(KEY, st); }
  function endTime() { return st.finishAt || Date.now(); }
  function elapsed() { return (endTime() - st.startAt) / 1000 + st.pen; }

  /* 이 모둠 기기에서의 문제(보기 순서 고정) */
  function prep(ref) {
    var q = R.getQ(ref[0], ref[1], ref[2], CFG.bank);
    var pr = R.prepare(q, R.mulberry32(R.hashStr(st.g + "|" + q.id)));
    pr.hide = [];
    if (st.hint[q.id]) {
      var others = [0, 1, 2, 3].filter(function (i) { return i !== pr.correct; });
      pr.hide = R.shuffled(others, R.mulberry32(R.hashStr("h|" + st.g + "|" + q.id))).slice(0, 2);
    }
    return pr;
  }

  /* ---------- 화면 : 시작 ---------- */
  function introScreen() {
    $("clock").hidden = true; $("bEnd").hidden = true;
    stage.textContent = "";
    var h = R.el("div", "hero-e");
    h.appendChild(R.el("h2", null, "🚨 연구소 봉쇄! 탈출하라!"));
    h.appendChild(R.el("p", null, "실험 중 사고가 나서 연구소의 모든 문이 잠겼습니다. 방마다 걸린 잠금장치를 풀어야 다음 방으로 갈 수 있습니다."));
    h.appendChild(R.el("p", null, "· 방마다 문제 3개(마지막 방은 4개). 모두 맞혀야 문이 열립니다."));
    h.appendChild(R.el("p", null, "· 몇 개가 틀렸는지는 알려 주지 않습니다. 틀리면 잠깐 기다려야 하니, 모둠 친구들과 의논해서 답하세요."));
    h.appendChild(R.el("p", null, "· 힌트는 오답 2개를 지워 주지만 시계가 " + HINT_SEC + "초 빨리 갑니다."));
    h.appendChild(R.el("p", null, "· 제한 시간 " + CFG.minutes + "분. 방을 더 많이 통과하고, 더 빨리 나오는 모둠이 이깁니다."));
    stage.appendChild(h);

    var box = R.el("div", "panel");
    box.appendChild(R.el("h3", null, "우리 모둠은 몇 모둠인가요?"));
    var pick = R.el("div", "gpick"), chosen = 0;
    var go = R.el("button", "btn", "🔓 탈출 시작!");
    go.disabled = true;
    for (var g = 1; g <= 7; g++) (function (g) {
      var b = R.el("button", null, g + "모둠"); b.type = "button";
      b.addEventListener("click", function () {
        chosen = g; go.disabled = false;
        [].forEach.call(pick.children, function (x, i) { x.classList.toggle("on", i === g - 1); });
      });
      pick.appendChild(b);
    })(g);
    box.appendChild(pick);
    box.appendChild(R.el("p", "note", "※ 모둠 번호에 따라 보기 순서가 달라집니다. 반드시 우리 모둠 번호를 골라 주세요."));
    go.addEventListener("click", function () {
      st = { s: S, g: chosen, startAt: Date.now(), pen: 0, wrong: 0, hints: 0, room: 0, sel: {}, hint: {}, roomWrong: 0, lockUntil: 0, cleared: [], phase: "room", finishAt: 0 };
      persist(); render();
    });
    box.appendChild(go);
    stage.appendChild(box);
  }

  /* ---------- 화면 : 방 ---------- */
  var lockBtn = null, lockMsg = null, allPicked = false;

  function roomScreen() {
    var room = ROOMS[st.room];
    var preps = room.qs.map(prep);
    $("clock").hidden = false; $("bEnd").hidden = false;
    stage.textContent = "";

    var head = R.el("div", "roomhead");
    var dots = R.el("div", "dots");
    ROOMS.forEach(function (_, i) { dots.appendChild(R.el("i", i < st.room ? "done" : i === st.room ? "now" : "")); });
    head.appendChild(dots);
    head.appendChild(R.el("h2", null, THEME[st.room] + " " + (st.room + 1) + "번 방 · " + room.name));
    head.appendChild(R.el("span", "badge", "🗝️ 힌트 " + st.hints + "회 · ❌ 오답 " + st.wrong + "회"));
    head.lastChild.style.cssText = "background:#eef2ff;color:#4338ca";
    stage.appendChild(head);
    stage.appendChild(R.el("div", "story", room.story));

    preps.forEach(function (pr, n) {
      var q = pr.q;
      var card = R.el("div", "qcard");
      var top = R.el("div", "qtop");
      top.appendChild(R.el("span", "pill", "문제 " + (n + 1)));
      var hb = R.el("button", "btn mini ghost", st.hint[q.id] ? "💡 힌트 사용함" : "💡 힌트 (+" + HINT_SEC + "초)");
      hb.type = "button"; hb.disabled = !!st.hint[q.id];
      hb.addEventListener("click", function () {
        if (!window.confirm("힌트를 쓰면 시계가 " + HINT_SEC + "초 빨라집니다. 쓸까요?")) return;
        st.hint[q.id] = true; st.hints++; st.pen += HINT_SEC;
        var pr2 = prep(room.qs[n]);
        if (pr2.hide.indexOf(st.sel[q.id]) >= 0) delete st.sel[q.id];
        persist(); render();
      });
      top.appendChild(hb);
      card.appendChild(top);
      card.appendChild(R.el("div", "qtext", q.q));
      if (q.fig) card.appendChild(R.fig(q.fig));
      var ch = R.el("div", "choices");
      pr.order.forEach(function (orig, i) {
        var c = R.el("button", "ch" + (pr.hide.indexOf(i) >= 0 ? " gone" : "") + (st.sel[q.id] === i ? " sel" : ""));
        c.type = "button"; c.disabled = pr.hide.indexOf(i) >= 0;
        c.appendChild(R.el("span", "ltr", "①②③④".charAt(i)));
        c.appendChild(R.el("span", null, q.c[orig]));
        c.addEventListener("click", function () {
          st.sel[q.id] = i; persist();
          [].forEach.call(ch.children, function (x, k) { x.classList.toggle("sel", k === i); });
          refreshLock();
        });
        ch.appendChild(c);
      });
      card.appendChild(ch);
      stage.appendChild(card);
    });

    var zone = R.el("div", "center");
    lockMsg = R.el("div", "lockmsg");
    lockBtn = R.el("button", "btn", "🔓 문 열기");
    lockBtn.style.fontSize = "26px"; lockBtn.style.minHeight = "64px"; lockBtn.style.padding = "10px 44px";
    lockBtn.addEventListener("click", function () { submit(room, preps); });
    zone.appendChild(lockMsg); zone.appendChild(lockBtn);
    stage.appendChild(zone);
    stage._preps = preps;
    refreshLock();
  }

  function refreshLock() {
    if (!lockBtn || st.phase !== "room") return;
    var room = ROOMS[st.room];
    allPicked = room.qs.every(function (ref) { return st.sel[R.getQ(ref[0], ref[1], ref[2], CFG.bank).id] != null; });
    var left = Math.ceil((st.lockUntil - Date.now()) / 1000);
    if (left > 0) {
      lockBtn.disabled = true; lockBtn.textContent = "🔒 " + left + "초 뒤에 다시 시도";
    } else {
      lockBtn.disabled = !allPicked; lockBtn.textContent = "🔓 문 열기";
      if (lockMsg && lockMsg.dataset.bad === "1" && left <= 0) { lockMsg.classList.remove("bad"); lockMsg.textContent = "다시 의논해서 답을 고쳐 보세요."; lockMsg.dataset.bad = "0"; }
      else if (lockMsg && !lockMsg.textContent) lockMsg.textContent = allPicked ? "" : "모든 문제의 답을 골라야 문을 열 수 있어요.";
    }
  }

  function submit(room, preps) {
    var ok = preps.every(function (pr) { return st.sel[pr.q.id] === pr.correct; });
    if (ok) {
      st.cleared.push(Math.round(elapsed()));
      st.phase = "clear"; st.roomWrong = 0; st.lockUntil = 0;
      persist(); render();
    } else {
      st.wrong++; st.roomWrong++;
      var wait = Math.min(20 * st.roomWrong, 120);
      st.lockUntil = Date.now() + wait * 1000;
      persist();
      lockMsg.classList.add("bad"); lockMsg.dataset.bad = "1";
      lockMsg.textContent = "❌ 잠금 해제 실패! 어느 문제가 틀렸는지는 알려 줄 수 없어요.";
      refreshLock();
      var b = document.querySelector(".roomhead .badge"); if (b) b.textContent = "🗝️ 힌트 " + st.hints + "회 · ❌ 오답 " + st.wrong + "회";
    }
  }

  /* ---------- 화면 : 방 통과 + 풀이 노트 ---------- */
  function clearScreen() {
    var room = ROOMS[st.room], last = st.room === ROOMS.length - 1;
    stage.textContent = "";
    var h = R.el("div", "hero-e");
    h.appendChild(R.el("h2", null, last ? "🎉 마지막 문이 열렸다!" : "🎉 " + room.name + " 통과!"));
    h.appendChild(R.el("p", null, "풀이 노트를 읽고 확인한 뒤 " + (last ? "기록 카드를 보세요." : "다음 방으로 가세요.")));
    stage.appendChild(h);
    room.qs.forEach(function (ref, n) {
      var pr = prep(ref), q = pr.q;
      var card = R.el("div", "qcard");
      card.appendChild(R.el("span", "pill", "문제 " + (n + 1)));
      card.appendChild(R.el("div", "qtext", q.q));
      if (q.fig) card.appendChild(R.fig(q.fig));
      card.appendChild(R.el("div", "ch right", "①②③④".charAt(pr.correct) + "  " + q.c[q.a]));
      card.lastChild.style.fontSize = "21px";
      card.appendChild(R.el("div", "exp", "💡 " + q.e));
      stage.appendChild(card);
    });
    var b = R.el("button", "btn", last ? "🏁 기록 카드 보기" : "🚪 다음 방으로");
    b.style.cssText += ";font-size:24px;min-height:60px;padding:8px 40px";
    b.addEventListener("click", function () {
      if (last) { finish(); return; }
      st.room++; st.phase = "room"; persist(); render(); window.scrollTo(0, 0);
    });
    var z = R.el("div", "center"); z.appendChild(b); stage.appendChild(z);
    window.scrollTo(0, 0);
  }

  /* ---------- 화면 : 기록 카드 ---------- */
  function finish() {
    if (!st.finishAt) st.finishAt = Date.now();
    st.phase = "done"; persist(); render();
  }
  function doneScreen() {
    $("clock").hidden = true; $("bEnd").hidden = true;
    var rooms = st.cleared.length, all = rooms === ROOMS.length, sec = Math.round(elapsed());
    stage.textContent = "";
    var rc = R.el("div", "record");
    rc.appendChild(R.el("div", "big", all ? "🏆 탈출 성공!" : "🚧 여기까지 왔어요!"));
    var t = R.el("table");
    [
      ["모둠", st.g + "모둠"],
      ["통과한 방", rooms + " / " + ROOMS.length],
      ["걸린 시간(힌트 벌점 포함)", R.fmt(sec)],
      ["틀린 횟수", st.wrong + "회"],
      ["힌트 사용", st.hints + "회"]
    ].forEach(function (r) {
      var tr = R.el("tr"); tr.appendChild(R.el("td", null, r[0])); tr.appendChild(R.el("td", null, r[1])); t.appendChild(tr);
    });
    rc.appendChild(t);
    rc.appendChild(R.el("p", null, "이 인증 코드를 선생님께 보여 주세요."));
    rc.appendChild(R.el("div", "code", R.makeCode({ s: st.s, g: st.g, rooms: rooms, wrong: st.wrong, hints: st.hints, sec: sec })));
    rc.appendChild(R.el("p", "note", sec > LIMIT ? "제한 시간 " + CFG.minutes + "분을 넘겼어요. 그래도 끝까지 해냈어요!" : "제한 시간 안에 마쳤어요."));
    stage.appendChild(rc);
    var z = R.el("div", "center"); z.style.marginTop = "18px";
    var r2 = R.el("button", "btn ghost mini", "🔁 처음부터 다시(기록이 지워져요)");
    r2.addEventListener("click", function () {
      if (window.confirm("기록이 지워지고 처음 화면으로 돌아갑니다. 선생님께 코드를 보여 드렸나요?")) { R.drop(KEY); st = null; render(); }
    });
    z.appendChild(r2); stage.appendChild(z);
  }

  /* ---------- 진행 ---------- */
  function render() {
    lockBtn = null; lockMsg = null;
    if (!st) { introScreen(); return; }
    if (st.phase === "room") roomScreen();
    else if (st.phase === "clear") clearScreen();
    else doneScreen();
    tick();
  }
  function tick() {
    if (!st || st.phase === "done") return;
    var left = LIMIT - elapsed(), c = $("clock");
    c.textContent = (left < 0 ? "+" : "") + R.fmt(Math.abs(left));
    c.classList.toggle("low", left <= 180);
    refreshLock();
  }

  $("bEnd").addEventListener("click", function () {
    if (window.confirm("여기까지의 기록으로 마칠까요? (통과한 방 " + st.cleared.length + "개)")) finish();
  });
  st = R.load(KEY);
  if (st && st.s !== S) st = null;
  render();
  setInterval(tick, 500);
})();
