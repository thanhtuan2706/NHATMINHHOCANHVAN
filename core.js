/* Lõi: lưu trữ, lấy nội dung từ mạng, phát âm, nhận giọng nói, chấm điểm */
(function (g) {
'use strict';
var D = g.BHDATA || (typeof require !== 'undefined' ? require('./data.js') : null);
var B = {};

/* ---------- Lưu trữ ---------- */
var P = 'bhta:';
B.LS = {
  get: function (k, d) { try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del: function (k) { try { localStorage.removeItem(P + k); } catch (e) {} },
  clearCache: function () {
    try {
      var ks = [];
      for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
      ks.forEach(function (k) { if (k.indexOf(P + 'tw_') === 0 || k.indexOf(P + 'w_') === 0 || k === P + 'wi') localStorage.removeItem(k); });
    } catch (e) {}
  }
};

/* ---------- Tiện ích ---------- */
B.dkey = function (off) {
  var t = new Date(); t.setDate(t.getDate() + (off || 0));
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
};
B.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
B.pick = function (a, n) { return B.shuffle(a).slice(0, n); };
B.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

B.art = function (w) {
  w = String(w).toLowerCase();
  if (/^(hour|honest|heir|honor)/.test(w)) return 'an';
  if (/^(uni|use|usu|eu|one|once)/.test(w)) return 'a';
  return /^[aeiou]/.test(w) ? 'an' : 'a';
};
B.countable = function (w) { return !D.UNCOUNT[w] && !/(ing|ness|ship|ment|tion)$/.test(w); };
B.plural = function (w) {
  if (D.PLURAL_IRR[w]) return D.PLURAL_IRR[w];
  if (/(s|x|z|ch|sh)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(f|fe)$/.test(w)) return null;
  if (/^(potato|tomato|hero|echo)$/.test(w)) return w + 'es';
  return w + 's';
};

/* ---------- Gọi mạng ---------- */
function fetchJSON(url, ms) {
  var c = new AbortController();
  var t = setTimeout(function () { c.abort(); }, ms || 7000);
  return fetch(url, { signal: c.signal }).then(function (r) {
    clearTimeout(t);
    if (r.status === 404) { var e = new Error('404'); e.notFound = true; throw e; }
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }, function (err) { clearTimeout(t); throw err; });
}

var BAD_DEF = /\b(sex|sexual|genital|penis|vagina|kill|murder|drug|alcohol|weapon|violent|erotic|intoxicat|porn)/i;
var BAD_WIKI = /(singer|band|actor|actress|film|album|company|footballer|politician|novel|song|television|rapper|musician|businessman|born )/i;

function dictInfo(w) {
  return fetchJSON('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w), 7000).then(function (j) {
    var e = Array.isArray(j) ? j[0] : null;
    if (!e) return null;
    var audio = '', ipa = e.phonetic || '';
    (e.phonetics || []).forEach(function (p) {
      if (p.text && !ipa) ipa = p.text;
      if (p.audio && (!audio || /-us\./.test(p.audio))) audio = p.audio;
    });
    var def = '', ex = '';
    (e.meanings || []).forEach(function (m) {
      (m.definitions || []).forEach(function (d) {
        if (!def && d.definition) def = d.definition;
        if (!ex && d.example && d.example.split(/\s+/).length <= 9) ex = d.example;
      });
    });
    if (audio.indexOf('//') === 0) audio = 'https:' + audio;
    if (BAD_DEF.test(def) || BAD_DEF.test(ex)) return { bad: true };
    return { audio: audio, ipa: ipa, def: def, ex: ex };
  });
}
function translateVi(w) {
  if (B.LS.get('mm_off', '') === B.dkey()) return Promise.resolve('');
  return fetchJSON('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(w) + '&langpair=en|vi', 6000).then(function (j) {
    var t = (j && j.responseData && j.responseData.translatedText) || '';
    if (/MYMEMORY WARNING|QUERY LENGTH/i.test(t) || String(j && j.responseStatus) === '429') { B.LS.set('mm_off', B.dkey()); return ''; }
    t = String(t).trim().toLowerCase();
    return (!t || t === w) ? '' : t;
  });
}
function wikiImg(w) {
  return fetchJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(w), 6000).then(function (j) {
    if (!j || j.type !== 'standard' || !j.thumbnail || !j.thumbnail.source) return '';
    if (BAD_WIKI.test(j.extract || '')) return '';
    var s = j.thumbnail.source;
    return /^https:\/\/upload\.wikimedia\.org\//.test(s) ? s : '';
  });
}

/* ---------- Bộ nhớ đệm từ ---------- */
function track(w) {
  var idx = B.LS.get('wi', []);
  idx = idx.filter(function (x) { return x !== w; }); idx.push(w);
  if (idx.length > 1200) { idx.splice(0, 200).forEach(function (x) { B.LS.del('w_' + x); }); }
  B.LS.set('wi', idx);
}
function enrich(w) {
  var c = B.LS.get('w_' + w, null);
  if (c) return Promise.resolve(c.bad ? null : c);
  var failed = false;
  return dictInfo(w).then(function (d) { return d; }, function (e) { if (e && e.notFound) return null; failed = true; return {}; }).then(function (d) {
    if (d === null || d.bad) { B.LS.set('w_' + w, { bad: 1 }); track(w); return null; }
    return Promise.all([translateVi(w).catch(function () { return ''; }), wikiImg(w).catch(function () { return ''; })]).then(function (r) {
      /* Từ điển không trả lời (mất mạng hoặc quá tải) và không có gì khác: bỏ qua, không lưu */
      if (failed && !r[0] && !r[1]) return null;
      var item = { en: w, vi: r[0] || '', img: r[1] || '', audio: d.audio || '', ipa: d.ipa || '', def: d.def || '', ex: d.ex || '' };
      if (!failed) { B.LS.set('w_' + w, item); track(w); }
      return item;
    });
  });
}

/* ---------- Chủ đề và danh sách từ ---------- */
B.topic = function (k) { return D.TOPICS.filter(function (t) { return t.key === k; })[0]; };
function levelOf(f, len) { if (f >= 25 && len <= 6) return 1; if (f >= 8) return 2; if (f >= 3) return 3; return 4; }

function loadTopicWords(t) {
  var key = 'tw_' + t.key, c = B.LS.get(key, null);
  if (c && Date.now() - c.t < 14 * 864e5 && c.w && c.w.length) return Promise.resolve(c.w);
  var urls = [];
  t.kw.forEach(function (k) {
    urls.push('https://api.datamuse.com/words?rel_trg=' + encodeURIComponent(k) + '&md=fp&max=250');
    urls.push('https://api.datamuse.com/words?topics=' + encodeURIComponent(k) + '&md=fp&max=250');
  });
  return Promise.all(urls.map(function (u) { return fetchJSON(u, 8000).catch(function () { return []; }); })).then(function (all) {
    var seen = {}, out = [];
    all.forEach(function (raw) {
      (raw || []).forEach(function (r) {
        var w = r.word, tags = r.tags || [];
        if (!/^[a-z]{3,9}$/.test(w) || D.BLOCK[w] || seen[w] || tags[0] !== 'n') return;
        var fq = tags.filter(function (x) { return x.indexOf('f:') === 0; })[0];
        var f = fq ? parseFloat(fq.slice(2)) : 0;
        if (!(f >= 1.5)) return;
        seen[w] = 1; out.push({ w: w, f: f });
      });
    });
    out.sort(function (a, b) { return b.f - a.f; });
    if (out.length) B.LS.set(key, { t: Date.now(), w: out });
    else if (c && c.w) return c.w;
    return out;
  });
}

function seedItem(t, s) { var lv = s[0].length <= 5 ? 1 : 2; return { en: s[0], vi: s[1], sym: s[2], topic: t.key, lv: lv }; }
B.seedAll = function () { var o = []; D.TOPICS.forEach(function (t) { (t.seed || []).forEach(function (s) { o.push(seedItem(t, s)); }); }); return o; };
B.itemFor = function (w) {
  var s = B.seedAll().filter(function (x) { return x.en === w; })[0];
  if (s) return s;
  var c = B.LS.get('w_' + w, null);
  return c && !c.bad ? c : null;
};

function candidates(topicKey, lvl, hidden) {
  var keys = topicKey === 'all' ? D.TOPICS.map(function (t) { return t.key; }) : [topicKey];
  var list = [];
  D.TOPICS.forEach(function (t) {
    if (keys.indexOf(t.key) >= 0 && t.seed) t.seed.forEach(function (s) { var it = seedItem(t, s); list.push({ w: it.en, lv: it.lv, seed: it }); });
  });
  var online = navigator.onLine !== false;
  var onl = keys.filter(function (k) { var t = B.topic(k); return t && t.kw; });
  if (topicKey === 'all') onl = B.pick(onl, 3);
  var jobs = onl.map(function (k) {
    if (!online) { var c = B.LS.get('tw_' + k, null); return Promise.resolve(c && c.w ? c.w : []); }
    return loadTopicWords(B.topic(k)).catch(function () { var c = B.LS.get('tw_' + k, null); return c && c.w ? c.w : []; });
  });
  return Promise.all(jobs).then(function (res) {
    res.forEach(function (ws) { ws.forEach(function (r) {
      if (!online && !B.LS.get('w_' + r.w, null)) return;
      list.push({ w: r.w, lv: levelOf(r.f, r.w.length), f: r.f });
    }); });
    var seen = {}, uniq = [];
    list.forEach(function (c) { if (hidden[c.w] || seen[c.w]) return; seen[c.w] = 1; uniq.push(c); });
    var lo = Math.max(1, lvl - 1);
    var band = uniq.filter(function (c) { return c.lv >= lo && c.lv <= lvl; });
    if (band.length < 12) band = uniq.filter(function (c) { return c.lv <= Math.min(4, lvl + 1); });
    if (band.length < 8) band = uniq;
    return band;
  });
}

B.stat = function (S, w, ok) {
  var s = S.stats[w] || (S.stats[w] = { c: 0, w: 0 });
  if (ok) s.c++; else s.w++;
};

/* o: {n, topic, level, hidden:[], stats:{}, weak:bool} */
B.getWords = function (o) {
  var hidden = {}; (o.hidden || []).forEach(function (w) { hidden[w] = 1; });
  var stats = o.stats || {};
  var p;
  if (o.weak) {
    var ws = Object.keys(stats).filter(function (w) { return stats[w].w > stats[w].c && !hidden[w]; });
    var items = ws.map(B.itemFor).filter(Boolean);
    return Promise.resolve(B.pick(items, o.n));
  }
  p = candidates(o.topic || 'all', o.level || 1, hidden);
  return p.then(function (cands) {
    cands = cands.map(function (c) {
      var s = stats[c.w], sc = Math.random() * (c.seed ? 0.6 : 1);
      if (s && s.w > s.c) sc += 0.8;
      if (s && s.c >= 3 && s.w === 0) sc -= 0.5;
      return { c: c, sc: sc };
    }).sort(function (a, b) { return b.sc - a.sc; }).map(function (x) { return x.c; });
    var out = [], idx = 0;
    function step() {
      if (out.length >= o.n || idx >= cands.length) return Promise.resolve(out);
      var batch = cands.slice(idx, idx + Math.min(6, o.n - out.length + 2)); idx += batch.length;
      return Promise.all(batch.map(function (c) { return c.seed ? Promise.resolve(c.seed) : enrich(c.w).catch(function () { return null; }); })).then(function (res) {
        res.forEach(function (r) { if (r && out.length < o.n && !out.some(function (x) { return x.en === r.en; })) out.push(r); });
        return step();
      });
    }
    return step();
  });
};

/* ---------- Phát âm ---------- */
var hasTTS = typeof speechSynthesis !== 'undefined';
var voice = null, curAudio = null;
function pickVoice() {
  try {
    var vs = speechSynthesis.getVoices();
    voice = vs.filter(function (v) { return /en[-_]US/i.test(v.lang) && /female|samantha|google us|zira|aria|jenny/i.test(v.name); })[0] ||
            vs.filter(function (v) { return /en[-_]US/i.test(v.lang); })[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  } catch (e) {}
}
if (hasTTS) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
B.hasTTS = hasTTS;
B.muted = false;
B.say = function (t, rate, queue) {
  if (!hasTTS || B.muted) return;
  try {
    if (!queue) speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; if (voice) u.voice = voice;
    u.rate = rate || 0.8; u.pitch = 1.1; speechSynthesis.speak(u);
  } catch (e) {}
};
B.stopSound = function () {
  if (hasTTS) { try { speechSynthesis.cancel(); } catch (e) {} }
  if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
};
B.playWord = function (it, rate) {
  B.stopSound();
  if (!it) return;
  if (it.audio && !B.muted && !rate) {
    try {
      var a = new Audio(it.audio); curAudio = a;
      a.onerror = function () { B.say(it.en); };
      var p = a.play(); if (p && p.catch) p.catch(function () { B.say(it.en); });
      return;
    } catch (e) {}
  }
  B.say(it.en, rate);
};

/* ---------- Nhận giọng nói ---------- */
var SR = g.SpeechRecognition || g.webkitSpeechRecognition;
B.srOK = !!SR;
var curRec = null;
B.stopListen = function () { if (curRec) { try { curRec.abort(); } catch (e) {} curRec = null; } };
B.listenOnce = function (ms) {
  return new Promise(function (res) {
    if (!SR) return res({ err: 'unsupported', alts: [] });
    B.stopListen(); B.stopSound();
    var r = new SR(), done = false, alts = [], err = '', tm;
    curRec = r;
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    function fin() { if (done) return; done = true; clearTimeout(tm); if (curRec === r) curRec = null; res({ err: err, alts: alts }); }
    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) { var R = e.results[i]; for (var k = 0; k < R.length; k++) alts.push({ t: R[k].transcript, c: R[k].confidence }); }
    };
    r.onerror = function (e) { err = e.error || 'error'; };
    r.onend = fin;
    tm = setTimeout(function () { try { r.stop(); } catch (e) {} }, ms || 8000);
    try { r.start(); } catch (e) { err = 'start'; fin(); }
  });
};

/* ---------- Chấm phát âm ---------- */
var NUMW = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
function norm(s) {
  return String(s || '').toLowerCase().replace(/\b(\d{1,2})\b/g, function (m, d) { return NUMW[+d] || m; })
    .replace(/['’]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b(i am|it is|what is|let us|that is|he is|she is|where is|who is)\b/g, function (m) { return m === 'let us' ? 'lets' : m.replace(' ', ''); });
}
function lev(a, b) {
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; }
  for (j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function wordEq(a, b) { return a === b || (Math.min(a.length, b.length) >= 4 && lev(a, b) <= 1); }

B.scoreWord = function (target, alts) {
  var t = norm(target), best = 0, heard = '';
  (alts || []).forEach(function (a) {
    var h = norm(a.t != null ? a.t : a); if (!h) return;
    var s;
    if (h === t) s = 100;
    else if (h.split(' ').indexOf(t) >= 0) s = 92;
    else {
      s = Math.round((1 - lev(t, h.replace(/ /g, '')) / Math.max(t.length, h.replace(/ /g, '').length)) * 100);
      if (t.length <= 3) s = Math.min(s, 59);
    }
    if (s > best || !heard) { if (s >= best) { best = s; heard = h; } }
  });
  return { score: best, heard: heard };
};
B.scoreSentence = function (target, alts) {
  var tw = norm(target).split(' '), best = { score: 0, flags: tw.map(function () { return false; }), heard: '' };
  (alts || []).forEach(function (a) {
    var h = norm(a.t != null ? a.t : a); if (!h) return;
    var hw = h.split(' '), m = tw.length, n = hw.length, L = [], i, j;
    for (i = 0; i <= m; i++) { L[i] = []; for (j = 0; j <= n; j++) L[i][j] = 0; }
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      L[i][j] = wordEq(tw[i - 1], hw[j - 1]) ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    var flags = tw.map(function () { return false; });
    i = m; j = n;
    while (i > 0 && j > 0) {
      if (wordEq(tw[i - 1], hw[j - 1]) && L[i][j] === L[i - 1][j - 1] + 1) { flags[i - 1] = true; i--; j--; }
      else if (L[i - 1][j] >= L[i][j - 1]) i--; else j--;
    }
    var sc = Math.round(L[m][n] / m * 100);
    if (sc > best.score || !best.heard) { if (sc >= best.score) best = { score: sc, flags: flags, heard: h }; }
  });
  best.words = tw;
  return best;
};
B.verdict = function (score, sentence) {
  var pass = sentence ? 75 : 85, close = sentence ? 50 : 60;
  return score >= pass ? 'pass' : (score >= close ? 'close' : 'fail');
};

B.norm = norm; B.lev = lev;
g.BH = B;
if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
