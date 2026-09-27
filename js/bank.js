/* bank.js — 문제 은행 보기 (정답·해설 포함, 글 문제 + 그림·그래프 문제) */
(function () {
  "use strict";
  var R = RG;
  var $ = function (id) { return document.getElementById(id); };
  var ALL = (window.QB || []).concat(window.QF || []);

  function fillUnits() {
    var g = parseInt($("fG").value, 10), sel = $("fU"), prev = sel.value;
    sel.textContent = "";
    var all = R.el("option", null, "전체"); all.value = 0; sel.appendChild(all);
    Object.keys(R.UNITS).forEach(function (u) {
      if (g && R.UNITS[u].g !== g) return;
      var o = R.el("option", null, u + ". " + R.UNITS[u].n); o.value = u; sel.appendChild(o);
    });
    if ([].some.call(sel.options, function (o) { return o.value === prev; })) sel.value = prev;
  }
  function drawBank() {
    var g = parseInt($("fG").value, 10), u = parseInt($("fU").value, 10) || 0, lv = parseInt($("fL").value, 10), kind = $("fS").value;
    var out = $("bankOut"); out.textContent = "";
    var list = ALL.filter(function (q) {
      return (!g || R.UNITS[q.u].g === g) && (!u || q.u === u) && (!lv || q.lv === lv) &&
        (!kind || (kind === "fig") === (q.set === "fig"));
    });
    $("cnt").textContent = "총 " + list.length + "문항 (전체 " + ALL.length + "문항)";
    list.forEach(function (q) {
      var c = R.el("div", "qb");
      var h = R.el("h4");
      h.appendChild(document.createTextNode(R.UNITS[q.u].i + " " + q.u + ". " + R.UNITS[q.u].n + "  "));
      h.appendChild(R.el("span", "pill lvl" + q.lv, R.LV[q.lv]));
      if (q.set === "fig") h.appendChild(R.el("span", "pill figpill", "그림"));
      h.appendChild(R.el("span", "note", "  · " + (q.i === 0 ? "첫 도전/탈출 본문제" : "뺏기 도전/마지막 방") + " · " + q.id));
      c.appendChild(h);
      c.appendChild(R.el("div", null, q.q));
      if (q.fig) c.appendChild(R.fig(q.fig));
      var ol = R.el("ol");
      q.c.forEach(function (t, i) {
        var li = R.el("li", i === q.a ? "ans" : null, "①②③④".charAt(i) + " " + t + (i === q.a ? "  ✔ 정답" : ""));
        ol.appendChild(li);
      });
      c.appendChild(ol);
      c.appendChild(R.el("div", "note", "💡 " + q.e));
      out.appendChild(c);
    });
  }
  $("fG").addEventListener("change", function () { fillUnits(); drawBank(); });
  $("fU").addEventListener("change", drawBank);
  $("fL").addEventListener("change", drawBank);
  $("fS").addEventListener("change", drawBank);
  fillUnits();
  drawBank();
})();
