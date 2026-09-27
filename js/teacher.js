/* =========================================================
   teacher.js — 선생님용 : 탈출 기록 순위 (정답이 나오지 않는 화면)
   ========================================================= */
(function () {
  "use strict";
  var R = RG;
  var $ = function (id) { return document.getElementById(id); };


  /* ---- 기록 순위 ---- */
  function total(s) { return R.SESSIONS[s] && R.SESSIONS[s].rooms ? R.SESSIONS[s].rooms.length + 1 : 5; }
  $("bRank").addEventListener("click", function () {
    var out = $("rankOut"); out.textContent = "";
    var tokens = $("codes").value.split(/[\s,;]+/).filter(Boolean);
    var good = [], bad = [];
    tokens.forEach(function (t) { var r = R.parseCode(t); (r ? good : bad).push(r || t); });
    if (!tokens.length) { out.appendChild(R.el("p", "note", "코드를 붙여 넣어 주세요.")); return; }
    good.sort(function (a, b) { return b.rooms - a.rooms || a.sec - b.sec; });

    var t = R.el("table", "t");
    var hr = R.el("tr");
    ["순위", "모둠", "차시", "통과한 방", "시간", "오답", "힌트", "결과"].forEach(function (h) { hr.appendChild(R.el("th", null, h)); });
    t.appendChild(hr);
    var seen = {};
    good.forEach(function (r, i) {
      var tr = R.el("tr"), dup = seen[r.s + "-" + r.g]; seen[r.s + "-" + r.g] = true;
      var full = r.rooms >= total(r.s);
      [String(i + 1), r.g + "모둠", r.s + "차시", r.rooms + " / " + total(r.s), R.fmt(r.sec), r.wrong, r.hints,
        (full ? "🏆 탈출" : "🚧 진행") + (dup ? " (같은 모둠 중복)" : "")].forEach(function (v) { tr.appendChild(R.el("td", null, String(v))); });
      t.appendChild(tr);
    });
    bad.forEach(function (b) {
      var tr = R.el("tr", "bad"), td = R.el("td", null, "「" + b + "」 은(는) 올바른 코드가 아닙니다. 한 글자씩 다시 확인해 주세요.");
      td.colSpan = 8; tr.appendChild(td); t.appendChild(tr);
    });
    out.appendChild(t);
  });

})();
