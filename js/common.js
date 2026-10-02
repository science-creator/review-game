/* =========================================================
   common.js — 세 화면(땅따먹기·탈출·교사용)이 함께 쓰는 코드
   · 단원 표, 차시 표, 문제 은행 색인
   · 보기 섞기(모둠 번호로 고정된 난수) · 시간 표시 · 세션 저장
   ES 모듈·fetch·localStorage 를 쓰지 않는다 → 파일을 더블클릭해도 동작한다.
   ========================================================= */
(function () {
  "use strict";

  /* ---- 단원 (성취기준 [9과NN-..] 의 NN) ---- */
  var UNITS = {
    1: { n: "지권의 변화", g: 1, i: "🌋" },
    2: { n: "여러 가지 힘", g: 1, i: "🧲" },
    3: { n: "생물의 다양성", g: 1, i: "🦋" },
    4: { n: "기체의 성질", g: 1, i: "🎈" },
    5: { n: "물질의 상태 변화", g: 1, i: "🧊" },
    6: { n: "빛과 파동", g: 1, i: "🌈" },
    7: { n: "과학과 나의 미래", g: 1, i: "🚀" },
    8: { n: "물질의 구성", g: 2, i: "⚛️" },
    9: { n: "전기와 자기", g: 2, i: "⚡" },
    10: { n: "태양계", g: 2, i: "🪐" },
    11: { n: "식물과 에너지", g: 2, i: "🌱" },
    12: { n: "동물과 에너지", g: 2, i: "🫀" },
    13: { n: "물질의 특성", g: 2, i: "🧪" },
    14: { n: "수권과 해수의 순환", g: 2, i: "🌊" },
    15: { n: "열과 우리 생활", g: 2, i: "🔥" },
    16: { n: "재해·재난과 안전", g: 2, i: "🚨" },
    17: { n: "화학 반응의 규칙", g: 3, i: "💥" },
    18: { n: "기권과 날씨", g: 3, i: "⛅" },
    19: { n: "운동과 에너지", g: 3, i: "🎢" },
    20: { n: "자극과 반응", g: 3, i: "🧠" },
    21: { n: "생식과 유전", g: 3, i: "🧬" },
    22: { n: "에너지 전환과 보존", g: 3, i: "🔋" },
    23: { n: "별과 우주", g: 3, i: "🔭" },
    24: { n: "과학기술과 인류 문명", g: 3, i: "🤖" }
  };

  var LV = { 1: "하", 2: "중", 3: "상" };

  /* ---- 4개 차시 ----
     땅따먹기 : units(칸이 되는 단원)
     탈출     : rooms(방 = 단원 하나, 문제 3개 = 하·중·상 각 1문항) + final(마지막 방의 문제 4개)
                final 의 [단원, 난이도, 몇 번째 문항] */
  /* 탈출 게임(3·4·6차시)은 2026-09-27부터 이 저장소에 없다. 학생이 URL 을 바꾸거나 개발자 도구로
     들여다봐도 다른 차시 문제가 보이지 않도록, 각 탈출 차시를 별도 저장소(review-escape-3/4/6)로
     분리했다 — 그 저장소에는 그날 문제만 들어 있다. 이 저장소(review-game)는 땅따먹기(교사가 화면
     하나로 진행, 학생에게 개별 링크를 주지 않음)와 문제 은행(교사 전용)만 남긴다. */
  var SESSIONS = {
    1: { type: "land", label: "1차시", title: "땅따먹기 ① 중학교 1학년 편", units: [1, 2, 3, 4, 5, 6, 7], minutes: 35 },
    2: { type: "land", label: "2차시", title: "땅따먹기 ② 중학교 2학년 편", units: [8, 9, 10, 11, 12, 13, 14, 15, 16], minutes: 35 },
    /* 5차시는 그림·그래프 문제 은행(bank:"fig")을 쓴다. 6차시(탈출, 같은 단원 섞음)와 섞이지 않게
       questions_fig.js 에는 이 단원들만 남겨 두었다 — 1·10·14·21(6차시 전용)은 review-escape-6 로 옮겼다. */
    5: { type: "land", label: "5차시", title: "땅따먹기 ③ 그림·그래프 편", units: [4, 5, 6, 8, 9, 13, 17, 19], minutes: 35, bank: "fig" }
  };

  /* ---- 문제 은행 색인 : (묶음, 단원, 난이도) 마다 앞 문항이 0번, 뒤 문항이 1번 ----
     묶음 : 글 문제(q.set 없음) / 그림·그래프 문제(q.set === "fig") */
  var byKey = {};
  function keyOf(set, u, lv) { return (set || "") + ":" + u + "-" + lv; }
  function indexBank() {
    byKey = {};
    (window.QB || []).concat(window.QF || []).forEach(function (q) {
      var k = keyOf(q.set, q.u, q.lv);
      var list = byKey[k] || (byKey[k] = []);
      q.i = list.length;
      q.id = (q.set ? q.set + "-" : "") + q.u + "-" + q.lv + "-" + q.i;
      list.push(q);
    });
  }
  indexBank();

  function getQ(u, lv, i, set) {
    var list = byKey[keyOf(set, u, lv)] || [];
    return list.length ? list[i % list.length] : null;
  }

  /* ---- 고정 난수(같은 모둠 번호 = 같은 보기 순서) ---- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffled(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 문제 하나의 보기를 섞어 { q, order(화면 번호 → 원래 번호), correct(화면에서의 정답 번호) } 로 돌려준다 */
  function prepare(q, rand) {
    var order = shuffled([0, 1, 2, 3], rand);
    return { q: q, order: order, correct: order.indexOf(q.a) };
  }

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ---- sessionStorage (막혀 있어도 게임은 돌아간다) ---- */
  function save(key, obj) { try { sessionStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* 저장 없이 진행 */ } }
  function load(key) { try { var t = sessionStorage.getItem(key); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
  function drop(key) { try { sessionStorage.removeItem(key); } catch (e) { /* 무시 */ } }

  /* ---- 탈출 기록 인증 코드 : 서버 없이 모둠 기기의 기록을 교사 화면으로 옮기는 방법 ----
     RG + 차시(1) + 모둠(1) + 통과한 방(1) + 오답(1) + 힌트(1) + 시간초(3, 36진수) + 검사문자(1) */
  function b36(n, len) {
    var s = Math.max(0, Math.min(Math.round(n), Math.pow(36, len) - 1)).toString(36).toUpperCase();
    while (s.length < len) s = "0" + s;
    return s;
  }
  function checkChar(body) {
    var h = 0;
    for (var i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) % 36;
    return h.toString(36).toUpperCase();
  }
  function makeCode(r) {
    var body = "RG" + r.s + r.g + r.rooms + b36(r.wrong, 1) + b36(r.hints, 1) + b36(r.sec, 3);
    var full = body + checkChar(body);
    return full.slice(0, 4) + "-" + full.slice(4, 8) + "-" + full.slice(8);
  }
  function parseCode(text) {
    var t = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (t.length !== 11 || t.slice(0, 2) !== "RG") return null;
    if (checkChar(t.slice(0, 10)) !== t.charAt(10)) return null;
    return {
      s: parseInt(t.charAt(2), 10), g: parseInt(t.charAt(3), 10), rooms: parseInt(t.charAt(4), 10),
      wrong: parseInt(t.charAt(5), 36), hints: parseInt(t.charAt(6), 36), sec: parseInt(t.slice(7, 10), 36)
    };
  }

  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  window.RG = {
    UNITS: UNITS, LV: LV, SESSIONS: SESSIONS,
    getQ: getQ, pool: function (u, lv, set) { return byKey[keyOf(set, u, lv)] || []; }, reindex: indexBank,
    mulberry32: mulberry32, hashStr: hashStr, shuffled: shuffled, prepare: prepare,
    makeCode: makeCode, parseCode: parseCode,
    fmt: fmt, save: save, load: load, drop: drop, param: param, el: el
  };
})();
