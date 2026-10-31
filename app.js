/* Giao diện và luồng học */
(function () {
'use strict';
var B = window.BH, D = window.BHDATA, esc = B.esc, shuffle = B.shuffle, pick = B.pick;
var app = document.getElementById('app'), toastEl = document.getElementById('toast'), fx = document.getElementById('fx');

/* ---------- Trạng thái ---------- */
function defSt() { return { stars: 0, streak: 0, last: '', today: { d: '', n: 0 }, level: 1, topic: 'all', sound: true, praise: true, examFb: true, examTimer: false, examN: 20, hidden: [], stats: {}, history: [], best: 0, learned: {} }; }
var S = Object.assign(defSt(), B.LS.get('st', {}));
B.muted = !S.sound;
function save() { B.LS.set('st', S); }
function one(a) { return a[Math.floor(Math.random() * a.length)]; }

var LV = ['Hạt mầm', 'Chồi non', 'Nụ hoa', 'Đóa hoa', 'Cây xanh', 'Ngôi sao'];
var LVN = ['Dễ', 'Vừa', 'Khó', 'Thử thách'];
var SKN = { listen: 'Nghe', vocab: 'Từ vựng', write: 'Viết', grammar: 'Ngữ pháp', speak: 'Nói', read: 'Đọc' };

/* ---------- Âm báo, khen, hiệu ứng ---------- */
var ac = null;
function tone(f, d, t) {
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    var o = ac.createOscillator(), gn = ac.createGain(); o.type = 'sine'; o.frequency.value = f; gn.gain.value = 0.08;
    o.connect(gn); gn.connect(ac.destination); var s = ac.currentTime + (t || 0); o.start(s);
    gn.gain.setTargetAtTime(0.0001, s + d * 0.6, 0.03); o.stop(s + d + 0.1);
  } catch (e) {}
}
function good() { tone(660, .12, 0); tone(880, .16, .11); }
function bad() { tone(220, .22, 0); }

var combo = 0, toastTimer = null;
function showToast(msg, sub) {
  toastEl.innerHTML = esc(msg) + '<small>' + esc(sub) + '</small>';
  toastEl.hidden = false; toastEl.style.animation = 'none'; void toastEl.offsetWidth; toastEl.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 1800);
}
function burst(n) {
  var N = n || 10;
  for (var i = 0; i < N; i++) {
    var s = document.createElement('i'); s.textContent = '★';
    var a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 120;
    s.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px');
    s.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg'); fx.appendChild(s);
    (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000); })(s);
  }
}
function praise() {
  combo++;
  var vi = one(D.PRAISE_VI), en = one(D.PRAISE_EN);
  var msg = (combo >= 3 && combo % 3 === 0) ? combo + ' câu đúng liên tiếp! ' + vi : vi;
  showToast(msg, en); burst(); good();
  if (S.praise && S.sound) B.say(en, 0.9, true);
}
function addStars(n) {
  S.stars += n; save();
  var els = document.querySelectorAll('[data-star]');
  for (var i = 0; i < els.length; i++) els[i].textContent = '★ ' + S.stars;
}
function touchDay() {
  var d = B.dkey();
  if (S.last !== d) { S.streak = (S.last === B.dkey(-1)) ? S.streak + 1 : 1; S.last = d; }
  if (S.today.d !== d) S.today = { d: d, n: 0 };
  S.today.n++; save();
}

/* ---------- Thành phần giao diện ---------- */
function setApp(h) { app.innerHTML = h; window.scrollTo(0, 0); }
function top(title) { return '<div class="bar"><button class="back" data-act="home">‹ Về trang chính</button><b>' + esc(title) + '</b><span class="chip star" data-star>★ ' + S.stars + '</span></div>'; }
function prog(i, n) { return '<div class="prog"><i style="width:' + Math.round(i / n * 100) + '%"></i></div><p class="count">' + Math.min(i + 1, n) + '/' + n + '</p>'; }
function loading(msg) { setApp('<div class="res"><div class="spin" role="status"></div><h2>' + esc(msg) + '</h2><p class="sub">Từ mới đang được lấy từ mạng. Nếu mạng chậm, ứng dụng sẽ dùng từ có sẵn.</p></div>'); }
function okImg(u) { return u && /^https:\/\/upload\.wikimedia\.org\//.test(u); }
function hasVis(it) { return !!(it.sym || okImg(it.img)); }
function visHtml(it) {
  if (it.sym) return '<div class="pic">' + esc(it.sym) + '</div>';
  if (okImg(it.img)) return '<img class="pimg" src="' + esc(it.img) + '" alt="" referrerpolicy="no-referrer">';
  return '';
}
function optVis(it) {
  if (it.sym) return '<span class="sym">' + esc(it.sym) + '</span>';
  return '<img class="oimg" src="' + esc(it.img) + '" alt="" referrerpolicy="no-referrer">';
}
document.addEventListener('error', function (e) {
  var t = e.target;
  if (t && t.tagName === 'IMG' && (t.classList.contains('pimg') || t.classList.contains('oimg'))) t.style.visibility = 'hidden';
}, true);

/* ---------- Điều hướng ---------- */
var tok = 0, inSub = false, R = null, C = null;
var tInt = null;
function stopTimer() { if (tInt) { clearInterval(tInt); tInt = null; } }
function stopAll() { stopTimer(); B.stopSound(); B.stopListen(); tok++; R = null; }
function nav(fn) { stopAll(); if (!inSub) { try { history.pushState({ s: 1 }, ''); } catch (e) {} inSub = true; } fn(); }
function goHome() { stopAll(); if (inSub) { inSub = false; try { history.back(); return; } catch (e) {} } home(); }
window.addEventListener('popstate', function () { inSub = false; stopAll(); home(); });
window.addEventListener('online', function () { if (!inSub) home(); });
window.addEventListener('offline', function () { if (!inSub) home(); });

/* ---------- Trang chính ---------- */
var SK = [
  { v: 'vocab', t: 'Từ vựng', s: 'Học từ mới, xem hình và nghe người bản xứ đọc', b: 'cat', c: 'c2' },
  { v: 'listen', t: 'Nghe', s: 'Nghe từ rồi chọn đáp án đúng', b: '♪', c: 'c3' },
  { v: 'speak', t: 'Nói', s: 'Bé nói, máy nghe và chấm điểm', b: 'Hi!', c: 'c4' },
  { v: 'read', t: 'Đọc', s: 'Đọc to câu, máy chấm từng từ', b: 'abc', c: 'c5' },
  { v: 'write', t: 'Viết', s: 'Xếp chữ hoặc gõ chính tả', b: '✎', c: 'c6' },
  { v: 'grammar', t: 'Ngữ pháp', s: 'a/an, số nhiều, is/are, have/has', b: 'is·are', c: 'c7' }
];
function topicName(k) { if (k === 'all') return 'Tất cả chủ đề'; var t = B.topic(k); return t ? t.vi : 'Tất cả chủ đề'; }
function home() {
  var n = S.today.d === B.dkey() ? S.today.n : 0, goal = 3;
  var lv = Math.floor(S.stars / 30), within = S.stars % 30, nm = LV[Math.min(lv, LV.length - 1)];
  var dots = ''; for (var i = 0; i < goal; i++) dots += '<b class="' + (i < n ? 'on' : '') + '">' + (i < n ? '✓' : '') + '</b>';
  var online = navigator.onLine !== false;
  var seg = [1, 2, 3, 4].map(function (l) { return '<button data-act="lvl" data-v="' + l + '" aria-pressed="' + (S.level === l) + '">Mức ' + l + '<small>' + LVN[l - 1] + '</small></button>'; }).join('');
  var chips = '<button data-act="topic" data-v="all" aria-pressed="' + (S.topic === 'all') + '">Tất cả</button>' + D.TOPICS.map(function (t) { return '<button data-act="topic" data-v="' + t.key + '" aria-pressed="' + (S.topic === t.key) + '">' + esc(t.icon) + ' ' + esc(t.vi) + '</button>'; }).join('');
  var tiles = SK.map(function (k) { return '<button class="tile-s ' + k.c + '" data-act="skill" data-v="' + k.v + '"><span class="badge">' + k.b + '</span><span class="tl">' + k.t + '</span><span class="ts">' + k.s + '</span></button>'; }).join('');
  inSub = false;
  setApp('<header class="hd"><div><h1>Bé Học Tiếng Anh</h1><span class="net ' + (online ? 'on' : 'off') + '">' + (online ? 'Đang online: từ mới lấy từ mạng' : 'Đang offline: dùng từ có sẵn') + '</span></div></header>'
    + '<section class="status"><div class="lvrow"><span class="lvname">Cấp ' + (lv + 1) + ' · ' + nm + '</span><span class="chip star" data-star>★ ' + S.stars + '</span></div>'
    + '<div class="bar2" aria-label="Tiến độ lên cấp"><i style="width:' + Math.round(within / 30 * 100) + '%"></i></div>'
    + '<div class="goal"><span>Hôm nay: ' + Math.min(n, goal) + '/' + goal + ' bài</span><span class="dots">' + dots + '</span><span>· Chuỗi ' + S.streak + ' ngày</span></div></section>'
    + '<div class="lab">Mức độ</div><div class="seg">' + seg + '</div>'
    + '<div class="lab">Chủ đề</div><div class="chips">' + chips + '</div>'
    + '<div class="tiles">' + tiles + '</div>'
    + '<button class="exam" data-act="exam"><span><b>Phòng thi</b><span>Đề mới mỗi lần, chấm điểm trên 100</span></span><span aria-hidden="true">›</span></button>'
    + '<div class="links"><button class="btn" data-act="hist">Bảng điểm</button><button class="btn" data-act="settings">Cài đặt</button></div>'
    + '<p class="foot">Tiến độ được lưu trên chính điện thoại này.</p>');
}

/* ---------- Lấy từ ---------- */
function fallbackItems(c) { return pick(B.seedAll().filter(function (x) { return S.hidden.indexOf(x.en) < 0; }), c); }
function getItems(count) {
  return new Promise(function (res) {
    var done = false;
    var to = setTimeout(function () { if (done) return; done = true; res(fallbackItems(count)); }, 14000);
    B.getWords({ n: count, topic: S.topic, level: S.level, hidden: S.hidden, stats: S.stats }).then(function (it) {
      if (done) return; done = true; clearTimeout(to); res(it.length >= 4 ? it : fallbackItems(count));
    }, function () { if (done) return; done = true; clearTimeout(to); res(fallbackItems(count)); });
  });
}
function validSpell(x) { return x.en.indexOf(' ') < 0 && x.en.length >= 3 && x.en.length <= 10; }

/* ---------- Câu hỏi ---------- */
function others(it, pool, k, pred) {
  var c = pool.filter(function (x) { return x.en !== it.en && (!pred || pred(x)); });
  if (c.length < k) c = c.concat(B.seedAll().filter(function (x) { return x.en !== it.en && (!pred || pred(x)) && !c.some(function (y) { return y.en === x.en; }); }));
  return pick(c, k);
}
function tipFor(it) { return esc(it.en) + (it.vi ? ' nghĩa là ' + esc(it.vi) + '.' : '.'); }

function qListen(it, pool) {
  var pics = false, ds = [];
  if (hasVis(it)) { ds = others(it, pool, 3, hasVis); pics = ds.length >= 3; }
  if (!pics) ds = others(it, pool, 3);
  var opts = shuffle([it].concat(ds)).map(function (x) { return { k: x.en, html: pics ? optVis(x) : esc(x.en) }; });
  return { kind: 'choice', skill: 'listen', word: it.en, label: 'Nghe từ “' + it.en + '”', answerText: it.en, pics: pics, opts: opts, ans: it.en, speak: it, tip: tipFor(it),
    promptHtml: '<p class="qtext">Nghe và chọn đáp án đúng</p><button class="play" data-act="play">▶ Nghe lại</button>' };
}
function qSee(it, pool) {
  var ds = others(it, pool, 3);
  var ph;
  if (hasVis(it)) ph = visHtml(it) + '<p class="qtext">Đây là gì bằng tiếng Anh?</p>';
  else if (it.vi) ph = '<p class="qtext">Từ tiếng Anh nào nghĩa là “' + esc(it.vi) + '”?</p>';
  else ph = '<p class="qtext">Từ nào có nghĩa như sau?</p><p class="mini">' + esc(it.def || '') + '</p>';
  return { kind: 'choice', skill: 'vocab', word: it.en, label: 'Từ nghĩa là “' + (it.vi || it.def || it.en) + '”', answerText: it.en, opts: shuffle([it].concat(ds)).map(function (x) { return { k: x.en, html: esc(x.en) }; }), ans: it.en, tip: tipFor(it), speakRight: it.en, promptHtml: ph };
}
function qMeaning(it, pool) {
  if (!it.vi) return qSee(it, pool);
  var ds = others(it, pool, 3, function (x) { return x.vi && x.vi !== it.vi; });
  if (ds.length < 3) return qSee(it, pool);
  return { kind: 'choice', skill: 'vocab', word: it.en, label: 'Nghĩa của “' + it.en + '”', answerText: it.vi, opts: shuffle([it].concat(ds)).map(function (x) { return { k: x.vi, html: esc(x.vi) }; }), ans: it.vi, tip: tipFor(it), speakRight: it.en, speak: it,
    promptHtml: '<p class="qtext">“' + esc(it.en) + '” nghĩa là gì?</p><button class="play" data-act="play">▶ Nghe</button>' };
}
function qFill(it, pool) {
  if (it.en.indexOf(' ') >= 0) return qSee(it, pool);
  var t = one(['I see the ___.', 'Look at the ___!', 'Where is the ___?', 'I like the ___.']);
  var ds = others(it, pool, 3, function (x) { return x.en.indexOf(' ') < 0; });
  return { kind: 'choice', skill: 'vocab', word: it.en, label: t.replace('___', '…'), answerText: it.en, opts: shuffle([it].concat(ds)).map(function (x) { return { k: x.en, html: esc(x.en) }; }), ans: it.en, tip: esc(t.replace('___', it.en)), speakRight: t.replace('___', it.en),
    promptHtml: '<p class="qtext">Chọn từ điền vào chỗ trống</p><p class="sent">' + esc(t).replace('___', '<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span>') + '</p>' + (hasVis(it) ? '' : '') };
}
function qVocab(it, pool) { var f = [qSee, qFill]; if (it.vi) f.push(qMeaning); return one(f)(it, pool); }
function qSpell(it) {
  var kind = it.en.length <= 7 ? 'spell' : 'type';
  return { kind: kind, skill: 'write', word: it.en, label: 'Viết từ “' + (it.vi || it.en) + '”', answerText: it.en, tip: tipFor(it), speak: it, speakRight: it.en,
    promptHtml: visHtml(it) + '<p class="qtext">' + (kind === 'spell' ? 'Xếp các chữ cái thành từ' : 'Nghe và gõ từ này') + '</p>' + (it.vi ? '<p class="vi">' + esc(it.vi) + '</p>' : '') + '<button class="play" data-act="play">▶ Nghe</button>' };
}
function qSay(it) {
  return { kind: 'say', skill: 'speak', word: it.en, label: 'Nói “' + it.en + '”', answerText: it.en, target: it.en, sentence: false, speak: it, tip: tipFor(it),
    promptHtml: visHtml(it) + '<div class="bigword">' + esc(it.en) + '</div>' + (it.ipa ? '<p class="ipa">' + esc(it.ipa) + '</p>' : '') + (it.vi ? '<p class="vi">' + esc(it.vi) + '</p>' : '') };
}
function sentFor(it) {
  var w = it.en, c = B.countable(w) && w.indexOf(' ') < 0;
  var t = ['I see the ' + w + '.', 'Look at the ' + w + '!', 'Where is the ' + w + '?', 'I like the ' + w + '.'];
  if (c) t.push('This is ' + B.art(w) + ' ' + w + '.');
  return one(t);
}
function qRead(text, vi) {
  var words = text.split(' ').map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(' ');
  return { kind: 'say', skill: 'speak', word: null, label: 'Đọc câu: ' + text, answerText: text, target: text, sentence: true,
    tip: vi ? esc(vi) : '', promptHtml: '<p class="sent" id="sent">' + words + '</p>' + (vi ? '<p class="vi">' + esc(vi) + '</p>' : '') };
}
function qGram(x) {
  return { kind: 'choice', skill: 'grammar', word: null, label: x.q.replace('___', '…'), answerText: x.a, ans: x.a, tip: esc(x.tip || ''), speakRight: x.q.replace('___', x.a).replace(/\s*\(.*\)/, ''),
    opts: shuffle(x.o).map(function (o) { return { k: o, html: esc(o) }; }),
    promptHtml: '<p class="qtext">' + esc(x.q).replace('___', '<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span>') + '</p>' };
}
function genGram(it) {
  var w = it.en;
  if (w.indexOf(' ') >= 0 || !B.countable(w)) return null;
  var t = Math.floor(Math.random() * 3), pl = B.plural(w);
  if (t === 0) { var a = B.art(w); return { q: 'This is ___ ' + w + '.', a: a, o: ['a', 'an'], tip: 'Trước "' + w + '" dùng "' + a + '" vì từ này bắt đầu bằng ' + (a === 'an' ? 'nguyên âm.' : 'phụ âm.') }; }
  if (!pl) return null;
  if (t === 1) {
    var cand = [w, w + 's', w + 'es', w.replace(/y$/, 'ies')].filter(function (x, i, arr) { return x !== pl && arr.indexOf(x) === i; });
    return { q: 'I see two ___. (' + w + ')', a: pl, o: [pl].concat(pick(cand, 2)), tip: 'Nhiều hơn một thì đổi thành "' + pl + '".' };
  }
  return Math.random() < 0.5 ? { q: 'The ' + w + ' ___ big.', a: 'is', o: ['is', 'are'], tip: 'Chỉ một ' + w + ' (số ít) nên dùng "is".' }
    : { q: 'The ' + pl + ' ___ big.', a: 'are', o: ['is', 'are'], tip: 'Nhiều ' + pl + ' (số nhiều) nên dùng "are".' };
}
function grammarList(n, items) {
  var bank = shuffle(D.GR), out = [], tries = 0;
  for (var i = 0; i < n; i++) {
    var x = null;
    if (i % 2 === 0 && items && items.length) { while (!x && tries < 30) { x = genGram(items[tries % items.length]); tries++; } }
    if (!x) x = bank.pop() || D.GR[0];
    out.push(qGram(x));
  }
  return out;
}
function readList(n, items) {
  var out = [], sb = shuffle(D.SENT), k = Math.ceil(n / 2);
  for (var i = 0; i < k && i < items.length; i++) {
    var it = items[i], ex = it.ex && it.ex.split(/\s+/).length <= 8 && S.level >= 3 && Math.random() < 0.5 ? it.ex : null;
    out.push(qRead(ex ? (/[.!?]$/.test(ex) ? ex : ex + '.') : sentFor(it), ''));
  }
  while (out.length < n) { var s = sb.pop(); out.push(qRead(s[0], s[1])); }
  return shuffle(out);
}

/* ---------- Bộ chạy câu hỏi ---------- */
function startRun(cfg) {
  R = { title: cfg.title, list: cfg.list, i: 0, credit: 0, mode: cfg.mode || 'lesson', timer: cfg.timer || 0, results: [], again: cfg.again, t0: Date.now(), stars0: S.stars, locked: false, tries: 0, listening: false };
  combo = 0; renderQ();
}
var MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
function sayBody(q) {
  var main = B.srOK
    ? '<button id="mic" class="mic" data-act="mic" aria-label="Bấm và nói">' + MIC + '<span>Bấm và nói</span></button>'
    : '<p class="warn">Trình duyệt này chưa nhận được giọng nói. Hãy mở bằng Chrome trên điện thoại Android hoặc máy tính. Bây giờ bé đọc to rồi nhờ người lớn nghe nhé.</p><button class="btn primary big" data-act="selfdone">Bé đã đọc xong</button>';
  return '<div class="micwrap"><div class="row2" style="width:100%"><button class="btn sun" data-act="hear">▶ Nghe mẫu</button><button class="btn alt" data-act="hearslow">▶ Nghe chậm</button></div>' + main + '<div id="heard" class="heard" aria-live="polite"></div><button class="ghost" data-act="skip">Bỏ qua câu này</button></div>';
}
function spellBody(q) {
  var L = q.word.split(''), tiles = shuffle(L);
  R.sp = { built: [], used: [], tiles: tiles, word: q.word };
  return '<section class="spell"><div class="slots" id="slots">' + L.map(function () { return '<span class="slot"></span>'; }).join('') + '</div><div class="tilebox">' + tiles.map(function (c, i) { return '<button class="tile" data-act="tile" data-i="' + i + '">' + esc(c) + '</button>'; }).join('') + '</div><button class="btn alt" data-act="spellclear">Xóa, xếp lại</button></section>';
}
function renderQ() {
  stopTimer(); B.stopSound(); B.stopListen();
  var q = R.list[R.i]; R.tries = 0; R.locked = false; R.listening = false;
  var body = '';
  if (q.kind === 'choice') body = '<div class="opts ' + (q.pics ? 'pics' : '') + '">' + q.opts.map(function (o) { return '<button class="opt" data-act="pick" data-k="' + esc(o.k) + '">' + o.html + '</button>'; }).join('') + '</div>';
  else if (q.kind === 'spell') body = spellBody(q);
  else if (q.kind === 'type') body = '<div class="typebox"><input id="ans" class="inp" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Gõ đáp án"><button class="btn primary" data-act="typeok">Kiểm tra</button></div>';
  else if (q.kind === 'say') body = sayBody(q);
  var sec = q.section ? '<p class="sec">' + esc(q.section) + '</p>' : '';
  setApp(top(R.title) + prog(R.i, R.list.length) + (R.timer ? '<div class="tbar"><i id="tb"></i></div>' : '') + sec + '<section class="qcard">' + q.promptHtml + '</section>' + body + '<div id="fb" class="fb" hidden aria-live="polite"></div>');
  if (q.speak && q.kind !== 'say') { var sp = q.speak; setTimeout(function () { if (R && R.list[R.i] === q) B.playWord(sp); }, 250); }
  else if (q.kind === 'say') setTimeout(function () { if (R && R.list[R.i] === q) { if (q.sentence) B.say(q.target, 0.8); else B.playWord(q.speak); } }, 250);
  startTimer(q);
  var inp = document.getElementById('ans'); if (inp) setTimeout(function () { try { inp.focus(); } catch (e) {} }, 400);
}
function startTimer(q) {
  stopTimer(); if (!R || !R.timer) return;
  var ms = (q.kind === 'say' ? 45 : R.timer) * 1000, end = Date.now() + ms, el = document.getElementById('tb');
  tInt = setInterval(function () {
    var left = end - Date.now(); if (el) el.style.width = Math.max(0, left / ms * 100) + '%';
    if (left <= 0) { stopTimer(); if (R && !R.locked) { B.stopListen(); R.listening = false; answered(0, false, '(hết giờ)'); } }
  }, 200);
}
function showFb(credit, ok, q) {
  var f = document.getElementById('fb'); if (!f) return;
  var exam = R.mode === 'exam', last = R.i === R.list.length - 1;
  var cls = credit >= 1 ? 'ok' : (credit > 0 ? 'half' : (ok ? 'ok' : 'no'));
  var title = credit >= 1 ? ('Đúng rồi!' + (!exam ? ' +1 sao' : '')) : (credit > 0 ? 'Gần đúng rồi!' : (ok ? 'Đúng rồi!' : 'Chưa đúng'));
  f.hidden = false; f.className = 'fb ' + cls;
  f.innerHTML = '<p class="fbt">' + title + '</p>' + (ok && credit >= 1 ? '' : '<p>Đáp án: <b>' + esc(q.answerText) + '</b></p>') + (q.tip ? '<p>' + q.tip + '</p>' : '') +
    '<button class="btn primary big" data-act="next">' + (last ? 'Xem kết quả' : 'Câu tiếp theo') + '</button>';
  try { f.scrollIntoView({ block: 'nearest' }); } catch (e) {}
}
function softFb(msg) {
  var f = document.getElementById('fb'); if (!f) return;
  f.hidden = false; f.className = 'fb no'; f.innerHTML = '<p class="fbt">' + esc(msg) + '</p>';
}
function answered(credit, ok, given) {
  if (!R || R.locked) return;
  var q = R.list[R.i]; R.locked = true; stopTimer(); B.stopListen(); R.listening = false;
  R.credit += credit;
  R.results.push({ skill: q.skill, credit: credit, ok: ok, label: q.label, answer: q.answerText, given: given || '' });
  if (q.word) B.stat(S, q.word, credit >= 1);
  var exam = R.mode === 'exam';
  if (!exam && credit >= 1) addStars(1);
  save();
  var show = !exam || S.examFb;
  if (!show) { setTimeout(function () { if (R) nextQ(); }, 300); return; }
  if (ok && q.speakRight) B.say(q.speakRight);
  if (ok) praise(); else { combo = 0; bad(); }
  showFb(credit, ok, q);
}
function revealOpts(q, chosen) {
  var bs = document.querySelectorAll('.opt');
  for (var i = 0; i < bs.length; i++) {
    bs[i].disabled = true;
    if (bs[i].dataset.k === String(q.ans)) bs[i].classList.add('right');
    else if (bs[i].dataset.k === chosen) bs[i].classList.add('wrong');
  }
}
function pickAns(btn) {
  if (!R || R.locked) return;
  var q = R.list[R.i]; if (q.kind !== 'choice') return;
  var k = btn.dataset.k, exam = R.mode === 'exam';
  if (k === String(q.ans)) {
    if (!exam || S.examFb) revealOpts(q, k); else lockOpts(btn);
    answered(R.tries === 0 ? 1 : 0, true, k);
  } else if (exam) {
    if (S.examFb) revealOpts(q, k); else lockOpts(btn);
    answered(0, false, k);
  } else {
    R.tries++; btn.classList.add('wrong'); btn.disabled = true; bad(); combo = 0; softFb('Chưa đúng, bé thử lại nhé.');
  }
}
function lockOpts(chosen) {
  var bs = document.querySelectorAll('.opt');
  for (var i = 0; i < bs.length; i++) bs[i].disabled = true;
  if (chosen) chosen.style.borderColor = 'var(--primary)';
}
function nextQ() { if (!R) return; R.i++; if (R.i >= R.list.length) finishRun(); else renderQ(); }

/* Xếp chữ và gõ chính tả */
function paintSlots() { var s = document.querySelectorAll('#slots .slot'); for (var i = 0; i < s.length; i++) s[i].textContent = (R.sp.built[i] || ''); }
function clearSpell() {
  if (!R || !R.sp || R.locked) return;
  R.sp.built = []; R.sp.used = [];
  var t = document.querySelectorAll('.tile'); for (var i = 0; i < t.length; i++) t[i].disabled = false;
  var s = document.getElementById('slots'); if (s) s.classList.remove('shake'); paintSlots();
  var f = document.getElementById('fb'); if (f && !R.locked) f.hidden = true;
}
function tileTap(b) {
  if (!R || R.locked || !R.sp) return;
  var sp = R.sp, i = +b.dataset.i; if (sp.used.indexOf(i) >= 0) return;
  sp.used.push(i); sp.built.push(sp.tiles[i]); b.disabled = true; paintSlots();
  if (sp.built.length === sp.word.length) {
    var ok = sp.built.join('') === sp.word;
    if (ok) answered(R.tries === 0 ? 1 : 0, true, sp.built.join(''));
    else if (R.mode === 'exam') answered(0, false, sp.built.join(''));
    else { R.tries++; bad(); combo = 0; var s = document.getElementById('slots'); s.classList.add('shake'); softFb('Chưa đúng, bé xếp lại nhé.'); setTimeout(clearSpell, 800); }
  }
}
function typeOk() {
  if (!R || R.locked) return;
  var q = R.list[R.i]; if (q.kind !== 'type') return;
  var inp = document.getElementById('ans'), v = inp ? inp.value.trim().toLowerCase() : '';
  if (!v) return;
  if (v === q.word) answered(R.tries === 0 ? 1 : 0, true, v);
  else if (R.mode === 'exam') answered(0, false, v);
  else { R.tries++; bad(); combo = 0; softFb(R.tries >= 2 ? 'Chưa đúng. Gợi ý: từ này bắt đầu bằng chữ “' + q.word.charAt(0) + '”.' : 'Chưa đúng, bé thử lại nhé.'); }
}

/* Nhận giọng nói */
var ERR = {
  'not-allowed': 'Trình duyệt đang chặn micro. Hãy bấm vào biểu tượng ổ khóa cạnh địa chỉ trang, cho phép Micro, rồi thử lại.',
  'service-not-allowed': 'Trình duyệt đang chặn micro. Hãy bấm vào biểu tượng ổ khóa cạnh địa chỉ trang, cho phép Micro, rồi thử lại.',
  'no-speech': 'Mình chưa nghe thấy tiếng. Bé nói to hơn một chút nhé.',
  'audio-capture': 'Không tìm thấy micro trên thiết bị này.',
  'network': 'Không kết nối được dịch vụ nhận giọng nói. Hãy kiểm tra mạng rồi thử lại.',
  'aborted': ''
};
function setMic(on) {
  var m = document.getElementById('mic'); if (!m) return;
  m.classList.toggle('on', on); m.querySelector('span').textContent = on ? 'Đang nghe…' : 'Bấm và nói';
}
function showHeard(q, sc) {
  var h = document.getElementById('heard'); if (!h) return;
  var stars = sc.score >= (q.sentence ? 75 : 85) ? 3 : (sc.score >= (q.sentence ? 50 : 60) ? 2 : (sc.score >= 25 ? 1 : 0));
  h.innerHTML = 'Mình nghe được: “' + esc(sc.heard || '…') + '”<br><span class="rate">' + '★'.repeat(stars) + '☆'.repeat(3 - stars) + '</span><br>' + sc.score + ' điểm';
  if (q.sentence) {
    var el = document.getElementById('sent');
    if (el) el.innerHTML = sc.words.map(function (w, i) { return '<span class="' + (sc.flags[i] ? 'ok' : 'miss') + '">' + esc(q.target.split(' ')[i] || w) + '</span>'; }).join(' ');
  }
}
async function micTap() {
  if (!R || R.locked || R.listening) return;
  var q = R.list[R.i]; if (q.kind !== 'say') return;
  R.listening = true; setMic(true);
  var r = await B.listenOnce(8000);
  if (!R || R.list[R.i] !== q || R.locked) return;
  R.listening = false; setMic(false);
  if (!r.alts.length) {
    var msg = r.err && ERR.hasOwnProperty(r.err) ? ERR[r.err] : 'Chưa nghe được. Bé bấm nút và thử lại nhé.';
    var h = document.getElementById('heard'); if (h && msg) h.textContent = msg;
    return;
  }
  var sc = q.sentence ? B.scoreSentence(q.target, r.alts) : B.scoreWord(q.target, r.alts);
  showHeard(q, sc);
  var v = B.verdict(sc.score, q.sentence), exam = R.mode === 'exam';
  R.tries++;
  if (v === 'pass') { answered(R.tries <= 2 ? 1 : 0.5, true, sc.heard); return; }
  if (exam) { answered(v === 'close' ? 0.5 : 0, v === 'close', sc.heard); return; }
  if (R.tries >= 3) { answered(0, false, sc.heard); return; }
  bad(); combo = 0;
  var h2 = document.getElementById('heard');
  if (h2) h2.innerHTML += '<br>' + (v === 'close' ? 'Gần đúng rồi! Bé nghe mẫu rồi nói lại nhé.' : 'Chưa đúng. Bé nghe mẫu rồi nói lại nhé.');
}

/* ---------- Kết thúc ---------- */
function finishRun() {
  stopTimer(); touchDay();
  if (R.mode === 'exam') examResult(); else lessonResult();
}
function lessonResult() {
  var total = R.list.length, first = R.results.filter(function (x) { return x.credit >= 1; }).length, pct = Math.round(first / total * 100), bonus = 0;
  if (pct >= 80) { bonus = 3; addStars(3); }
  var gain = S.stars - R.stars0;
  var msg = pct >= 80 ? 'Xuất sắc! Bé làm rất tốt.' : (pct >= 50 ? 'Khá lắm! Bé luyện thêm một lần nữa nhé.' : 'Không sao, bé thử lại nhé. Lần sau sẽ tốt hơn.');
  var again = R.again;
  setApp(top(R.title) + '<section class="res"><div class="bigstar">★</div><h2>' + first + '/' + total + ' câu đúng ngay lần đầu</h2><p>' + msg + '</p><p class="gain">+' + gain + ' sao' + (bonus ? ' (có ' + bonus + ' sao thưởng)' : '') + '</p></section>'
    + '<button class="btn primary big" data-act="again">Học tiếp bài mới</button><button class="btn big" data-act="home">Về trang chính</button>');
  R.againFn = again; lastAgain = again;
  if (pct >= 50) { burst(16); good(); if (S.praise && S.sound) B.say(pct >= 80 ? 'Excellent work!' : 'Good job!', 0.9, true); }
}
var lastAgain = null;
function examResult() {
  var n = R.list.length, score = Math.round(R.credit / n * 100), secs = Math.round((Date.now() - R.t0) / 1000);
  var rank = score >= 90 ? 'Xuất sắc' : (score >= 75 ? 'Giỏi' : (score >= 50 ? 'Khá' : 'Cần cố gắng thêm'));
  S.history.push({ t: Date.now(), score: score, n: n, level: S.level, topic: S.topic, secs: secs });
  if (S.history.length > 50) S.history.shift();
  var newBest = score > S.best; if (newBest) S.best = score;
  if (score >= 50) addStars(Math.round(score / 20));
  save();
  var by = {}; R.results.forEach(function (x) { var b = by[x.skill] || (by[x.skill] = { c: 0, n: 0 }); b.c += x.credit; b.n++; });
  var bars = Object.keys(by).map(function (k) { var p = Math.round(by[k].c / by[k].n * 100); return '<div class="brow"><span>' + SKN[k] + '</span><div class="bar2"><i style="width:' + p + '%"></i></div><span>' + p + '%</span></div>'; }).join('');
  var wrong = R.results.filter(function (x) { return x.credit < 1; });
  var rev = wrong.length ? '<h2>Các câu cần ôn lại</h2><div class="rev">' + wrong.map(function (x) { return '<div><b>' + esc(x.label) + '</b><br>Đáp án: ' + esc(x.answer) + (x.given ? '<br>Bé trả lời: ' + esc(x.given) : '') + '</div>'; }).join('') + '</div>' : '<p class="gain">Bé trả lời đúng tất cả các câu!</p>';
  setApp(top('Kết quả bài thi') + '<section class="res"><div class="bigscore">' + score + '</div><p class="sub">trên 100 điểm</p><h2>' + rank + '</h2>' + (newBest ? '<p class="gain">Điểm cao nhất mới!</p>' : '<p class="sub">Điểm cao nhất: ' + S.best + '</p>') + '<p class="sub">Thời gian làm bài: ' + Math.floor(secs / 60) + ' phút ' + (secs % 60) + ' giây</p><div class="bars">' + bars + '</div></section>'
    + '<section class="res" style="text-align:left;justify-items:stretch">' + rev + '</section>'
    + '<button class="btn primary big" data-act="exam">Thi lại với đề mới</button><button class="btn big" data-act="home">Về trang chính</button>');
  if (score >= 50) { burst(score >= 75 ? 24 : 12); good(); if (S.praise && S.sound) B.say(score >= 90 ? 'Excellent! You are a star!' : (score >= 75 ? 'Great job!' : 'Well done!'), 0.9, true); }
}

/* ---------- Các kỹ năng ---------- */
function startSkill(skill) {
  if (skill === 'vocab') return startVocab();
  var my = ++tok, counts = { listen: 10, write: 8, speak: 8, read: 6, grammar: 8 }, n = counts[skill] || 8;
  loading('Đang chuẩn bị bài mới…');
  getItems(n + 8).then(function (items) {
    if (my !== tok) return;
    var targets = items.slice(0, n), list;
    if (skill === 'listen') list = targets.map(function (it) { return qListen(it, items); });
    else if (skill === 'write') { var w = items.filter(validSpell); if (w.length < n) w = w.concat(fallbackItems(n).filter(validSpell)); list = w.slice(0, n).map(qSpell); }
    else if (skill === 'speak') list = targets.map(qSay);
    else if (skill === 'read') list = readList(n, items);
    else list = grammarList(n, items);
    var titles = { listen: 'Luyện nghe', write: 'Luyện viết', speak: 'Luyện nói', read: 'Luyện đọc', grammar: 'Ngữ pháp' };
    lastAgain = function () { nav(function () { startSkill(skill); }); };
    startRun({ title: titles[skill], list: list, again: lastAgain });
  });
}
function startVocab() {
  var my = ++tok;
  loading('Đang lấy từ mới…');
  getItems(16).then(function (items) {
    if (my !== tok) return;
    C = { items: items.slice(0, 8), pool: items, i: 0 };
    drawCard(true);
  });
}
function drawCard(speak) {
  var it = C.items[C.i], known = !!S.learned[it.en], last = C.i === C.items.length - 1;
  setApp(top('Học từ mới') + prog(C.i, C.items.length)
    + '<section class="qcard"><div class="cardw">' + visHtml(it) + '<div class="bigword">' + esc(it.en) + '</div>' + (it.ipa ? '<p class="ipa">' + esc(it.ipa) + '</p>' : '')
    + (it.vi ? '<p class="qtext">' + esc(it.vi) + '</p>' : '') + (it.def && !it.vi ? '<p class="defn">' + esc(it.def) + '</p>' : '') + (it.ex ? '<p class="defn">Ví dụ: ' + esc(it.ex) + '</p>' : '')
    + '<button class="play" data-act="cplay">▶ Nghe</button></div></section>'
    + '<div class="row3"><button class="btn" data-act="cprev">‹ Trước</button><button class="btn ' + (known ? 'sun' : 'alt') + '" data-act="cknow">' + (known ? 'Đã nhớ ✓' : 'Mình nhớ từ này') + '</button><button class="btn primary" data-act="cnext">Sau ›</button></div>'
    + '<button class="btn ' + (last ? 'primary ' : '') + 'big" data-act="cquiz">Làm bài kiểm tra 8 từ này</button>'
    + '<div class="row2"><button class="btn" data-act="cmore">Học 8 từ mới</button><button class="btn danger" data-act="chide">Ẩn từ này</button></div>');
  if (speak) setTimeout(function () { B.playWord(it); }, 200);
}
function cardQuiz() {
  var pool = C.pool, items = C.items;
  lastAgain = function () { nav(function () { startVocab(); }); };
  startRun({ title: 'Kiểm tra từ', list: items.map(function (it) { return qVocab(it, pool); }), again: lastAgain });
}

/* ---------- Phòng thi ---------- */
function examSetup() {
  var mic = B.srOK ? '' : '<p class="warn">Trình duyệt này không nhận giọng nói nên đề thi sẽ không có phần Nói. Hãy mở bằng Chrome trên Android để thi đủ 5 phần.</p>';
  var cnt = [10, 20, 30].map(function (c) { return '<button data-act="examn" data-v="' + c + '" aria-pressed="' + (S.examN === c) + '">' + c + ' câu<small>' + (c === 10 ? 'Ngắn' : c === 20 ? 'Vừa' : 'Đầy đủ') + '</small></button>'; }).join('');
  setApp(top('Phòng thi')
    + '<section class="status"><h2>Bài thi tiếng Anh</h2><p>Mức ' + S.level + ' (' + LVN[S.level - 1] + ') · ' + esc(topicName(S.topic)) + '</p><p class="sub">Đổi mức độ và chủ đề ở trang chính. Đề được tạo mới từ kho từ trên mạng, mỗi lần thi một đề khác.</p></section>'
    + '<div class="lab">Số câu</div><div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + cnt + '</div>'
    + '<button class="tog" data-act="examtimer" aria-pressed="' + S.examTimer + '">Giới hạn thời gian 30 giây mỗi câu<span class="s">' + (S.examTimer ? 'Bật' : 'Tắt') + '</span></button>'
    + '<button class="tog" data-act="examfb" aria-pressed="' + S.examFb + '">Báo đúng sai và khen sau mỗi câu<span class="s">' + (S.examFb ? 'Bật' : 'Tắt') + '</span></button>'
    + mic + '<p class="note">Điểm tính trên thang 100. Phần Nói chấm từng mức: đúng, gần đúng, chưa đúng.</p>'
    + '<button class="btn primary big" data-act="examgo">Bắt đầu thi</button>');
}
function buildExam(n, items) {
  var plan = B.srOK ? [['listen', .2], ['vocab', .25], ['write', .15], ['grammar', .2], ['speak', .2]] : [['listen', .3], ['vocab', .3], ['write', .2], ['grammar', .2]];
  var cnt = plan.map(function (p) { return Math.max(1, Math.round(p[1] * n)); });
  var diff = n - cnt.reduce(function (a, b) { return a + b; }, 0); cnt[1] += diff; if (cnt[1] < 1) cnt[1] = 1;
  var names = { listen: 'Phần Nghe', vocab: 'Phần Từ vựng', write: 'Phần Viết', grammar: 'Phần Ngữ pháp', speak: 'Phần Nói' };
  var list = [], t = 0, spellable = items.filter(validSpell);
  function nx() { return items[t++ % items.length]; }
  plan.forEach(function (p, pi) {
    var k = p[0], c = cnt[pi], part = [], i;
    if (k === 'listen') for (i = 0; i < c; i++) part.push(qListen(nx(), items));
    else if (k === 'vocab') for (i = 0; i < c; i++) part.push(qVocab(nx(), items));
    else if (k === 'write') for (i = 0; i < c; i++) part.push(qSpell((spellable.length ? spellable : fallbackItems(8).filter(validSpell))[i % Math.max(1, spellable.length || 1)]));
    else if (k === 'grammar') part = grammarList(c, items);
    else { for (i = 0; i < c - (c >= 3 ? 1 : 0); i++) part.push(qSay(nx())); if (c >= 3) { var s = one(D.SENT); part.push(qRead(s[0], s[1])); } }
    part.forEach(function (q) { q.section = names[k]; });
    list = list.concat(part);
  });
  return list.slice(0, Math.max(n, 1));
}
function startExam() {
  var my = ++tok, n = S.examN;
  loading('Đang ra đề thi…');
  getItems(n + 10).then(function (items) {
    if (my !== tok) return;
    startRun({ title: 'Bài thi', mode: 'exam', timer: S.examTimer ? 30 : 0, list: buildExam(n, items), again: null });
  });
}

/* ---------- Bảng điểm ---------- */
function history() {
  var h = S.history.slice(-10), best = S.best;
  var chart = h.length ? '<div class="hist" aria-label="Điểm 10 lần thi gần nhất">' + h.map(function (x) { return '<i style="height:' + Math.max(4, x.score) + '%"><b>' + x.score + '</b></i>'; }).join('') + '</div>' : '<p class="sub">Chưa có bài thi nào. Bé vào Phòng thi để làm bài đầu tiên nhé.</p>';
  var rows = S.history.slice(-15).reverse().map(function (x) {
    var d = new Date(x.t); var rk = x.score >= 90 ? 'Xuất sắc' : (x.score >= 75 ? 'Giỏi' : (x.score >= 50 ? 'Khá' : 'Cần cố gắng'));
    return '<tr><td>' + d.toLocaleDateString('vi-VN') + '</td><td>' + x.n + ' câu · Mức ' + x.level + '</td><td>' + x.score + ' · ' + rk + '</td></tr>';
  }).join('');
  var weak = Object.keys(S.stats).filter(function (w) { return S.stats[w].w > S.stats[w].c; }).sort(function (a, b) { return (S.stats[b].w - S.stats[b].c) - (S.stats[a].w - S.stats[a].c); }).slice(0, 12);
  setApp(top('Bảng điểm')
    + '<section class="res" style="justify-items:stretch"><h2>Điểm thi</h2><p class="sub">Điểm cao nhất: <b>' + best + '</b> · Số bài thi: ' + S.history.length + '</p>' + chart + '</section>'
    + (rows ? '<section class="res" style="justify-items:stretch"><table class="tbl"><thead><tr><th>Ngày</th><th>Đề</th><th>Điểm</th></tr></thead><tbody>' + rows + '</tbody></table></section>' : '')
    + '<section class="res" style="justify-items:stretch;text-align:left"><h2>Từ bé hay sai</h2>' + (weak.length ? '<p>' + weak.map(esc).join(', ') + '</p><button class="btn primary big" data-act="weak">Ôn các từ này</button>' : '<p class="sub">Chưa có từ nào cần ôn. Bé cứ học tiếp nhé.</p>') + '</section>');
}
function startWeak() {
  var my = ++tok; loading('Đang chuẩn bị bài ôn…');
  B.getWords({ n: 10, weak: true, hidden: S.hidden, stats: S.stats }).then(function (items) {
    if (my !== tok) return;
    if (items.length < 3) { history(); return; }
    var pool = items.concat(fallbackItems(8));
    lastAgain = function () { nav(startWeak); };
    startRun({ title: 'Ôn từ hay sai', list: items.map(function (it) { return qVocab(it, pool); }), again: lastAgain });
  });
}

/* ---------- Cài đặt ---------- */
function settings() {
  function tog(act, label, on) { return '<button class="tog" data-act="' + act + '" aria-pressed="' + on + '">' + label + '<span class="s">' + (on ? 'Bật' : 'Tắt') + '</span></button>'; }
  setApp(top('Cài đặt')
    + tog('tsound', 'Âm thanh', S.sound) + tog('tpraise', 'Giọng khen bằng tiếng Anh', S.praise)
    + '<section class="res" style="justify-items:stretch;text-align:left"><h2>Kiểm tra micro</h2><p class="sub">' + (B.srOK ? 'Bấm nút, nói một câu tiếng Anh, xem máy nghe được gì.' : 'Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy dùng Chrome trên Android hoặc máy tính.') + '</p>'
    + (B.srOK ? '<button class="btn alt" data-act="mictest">Thử nói</button><p id="mtres" class="heard"></p>' : '') + '</section>'
    + '<section class="res" style="justify-items:stretch;text-align:left"><h2>Từ đã ẩn: ' + S.hidden.length + '</h2><p class="sub">Từ bố mẹ thấy chưa phù hợp có thể ẩn ngay trong màn hình học từ.</p>' + (S.hidden.length ? '<p>' + S.hidden.map(esc).join(', ') + '</p><button class="btn" data-act="unhide">Bỏ ẩn tất cả</button>' : '') + '</section>'
    + '<section class="res" style="justify-items:stretch;text-align:left"><h2>Dữ liệu</h2><button class="btn" data-act="clearcache">Xóa từ đã tải về máy</button><button class="btn danger" data-act="resetask">Xóa toàn bộ tiến độ và điểm thi</button><div id="resetbox"></div></section>'
    + '<p class="foot">Giọng của bé được trình duyệt gửi tới dịch vụ nhận giọng nói của Google (trên Chrome) để chuyển thành chữ. Ứng dụng này không lưu âm thanh.</p>');
}

/* ---------- Sự kiện ---------- */
var ACT = {
  home: goHome,
  lvl: function (b) { S.level = +b.dataset.v; save(); home(); },
  topic: function (b) { S.topic = b.dataset.v; save(); home(); },
  skill: function (b) { var v = b.dataset.v; nav(function () { startSkill(v); }); },
  exam: function () { nav(examSetup); },
  examn: function (b) { S.examN = +b.dataset.v; save(); examSetup(); },
  examtimer: function () { S.examTimer = !S.examTimer; save(); examSetup(); },
  examfb: function () { S.examFb = !S.examFb; save(); examSetup(); },
  examgo: startExam,
  hist: function () { nav(history); },
  weak: function () { nav(startWeak); },
  settings: function () { nav(settings); },
  tsound: function () { S.sound = !S.sound; B.muted = !S.sound; save(); settings(); },
  tpraise: function () { S.praise = !S.praise; save(); settings(); },
  unhide: function () { S.hidden = []; save(); settings(); },
  clearcache: function (b) { B.LS.clearCache(); b.textContent = 'Đã xóa từ đã tải'; },
  resetask: function () { document.getElementById('resetbox').innerHTML = '<p>Bé sẽ mất toàn bộ sao, điểm thi và từ đã học. Bố mẹ chắc chắn chứ?</p><button class="btn danger" data-act="resetyes">Xóa hết</button>'; },
  resetyes: function () { var ks = []; for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); ks.forEach(function (k) { if (k.indexOf('bhta:') === 0 && k.indexOf('bhta:w_') !== 0 && k.indexOf('bhta:tw_') !== 0) localStorage.removeItem(k); }); S = defSt(); B.muted = false; save(); home(); },
  mictest: async function () {
    var el = document.getElementById('mtres'); el.textContent = 'Đang nghe… bé nói đi nhé.';
    var r = await B.listenOnce(6000);
    el.textContent = r.alts.length ? 'Mình nghe được: “' + r.alts[0].t + '”' : (ERR[r.err] || 'Chưa nghe được gì. Hãy kiểm tra quyền micro và thử lại.');
  },
  play: function () { if (R) { var q = R.list[R.i]; if (q.speak) B.playWord(q.speak); } },
  hear: function () { if (R) { var q = R.list[R.i]; if (q.sentence) B.say(q.target, 0.8); else B.playWord(q.speak); } },
  hearslow: function () { if (R) { var q = R.list[R.i]; if (q.sentence) B.say(q.target, 0.55); else B.playWord(q.speak, 0.55); } },
  pick: pickAns, next: nextQ, tile: tileTap, spellclear: clearSpell, typeok: typeOk, mic: micTap,
  skip: function () { if (R && !R.locked) { var q = R.list[R.i]; answered(0, false, '(bỏ qua)'); } },
  selfdone: function () { if (R && !R.locked) answered(R.mode === 'exam' ? 0 : 1, R.mode !== 'exam', '(bé tự đọc)'); },
  again: function () { if (lastAgain) lastAgain(); else goHome(); },
  cplay: function () { B.playWord(C.items[C.i]); },
  cprev: function () { C.i = (C.i + C.items.length - 1) % C.items.length; drawCard(true); },
  cnext: function () { C.i = (C.i + 1) % C.items.length; drawCard(true); },
  cknow: function () { var w = C.items[C.i].en; if (!S.learned[w]) { S.learned[w] = 1; addStars(1); good(); } else { delete S.learned[w]; save(); } drawCard(false); },
  cquiz: function () { cardQuiz(); },
  cmore: function () { startVocab(); },
  chide: function () { var w = C.items[C.i].en; if (S.hidden.indexOf(w) < 0) S.hidden.push(w); save(); C.items.splice(C.i, 1); if (!C.items.length) { goHome(); return; } C.i = C.i % C.items.length; showToast('Đã ẩn từ này', 'Hidden'); drawCard(false); }
};
app.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  var f = ACT[b.dataset.act]; if (f) f(b, e);
});
app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'ans') { e.preventDefault(); typeOk(); } });

home();
})();
