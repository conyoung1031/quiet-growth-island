/* =============================================================
   安静成长岛 · 原型交互
   —— 每个儿童端页面只有一个明显主按钮；
   —— 流程奖励「过程行为」，不记录分数与连续；
   —— 休息 / 计时等待已加速，便于演示。
   ============================================================= */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---------- 屏幕注册 ---------- */
  var SCREENS = [
    { id: 'welcome',   en: 'LAUNCH' },
    { id: 'home',      en: 'TODAY' },
    { id: 'body',      en: 'BODY CHECK-IN' },
    { id: 'calm',      en: 'CALM 5-4-3-2-1' },
    { id: 'breath',    en: 'SHELL BREATH 3' },
    { id: 'move',      en: 'MOVE 30S' },
    { id: 'step',      en: 'FIRST STEP 2MIN' },
    { id: 'rest',      en: 'REST' },
    { id: 'restclose', en: 'LANDING' },
    { id: 'growth',    en: 'GROWTH TREE' },
    { id: 'clues',     en: 'CLUE ROPE' },
    { id: 'parent',    en: 'PARENT GATE' }
  ];

  var RING_C = 163.36;
  var ACCEL = 6; /* 演示加速倍率 */

  var S = {
    records: {},
    name: '',
    settings: { suggest: 0, rest: 5 },
    sessionDone: 0,
    bodyPick: null,
    calm: { i: 0, done: false },
    move: { running: false, sec: 0, done: false },
    step: { running: false, sec: 0, done: false, task: 0 },
    rest: { running: false, pct: 0 }
  };

  var timers = {};
  function every(name, ms, fn) { stop(name); timers[name] = setInterval(fn, ms); }
  function stop(name) { if (timers[name]) { clearInterval(timers[name]); delete timers[name]; } }
  function stopAll() { Object.keys(timers).forEach(stop); }

  /* ---------- 成长记录（过程行为） ---------- */
  var RECS = {
    started:  { text: '我开始了',        dot: 'var(--gold-pale)',  color: 'var(--gold-deep)',  icon: 'i-sun' },
    said:     { text: '我说出来了',      dot: 'var(--mist-pale)',  color: 'var(--mist-deep)',  icon: 'i-cloud' },
    paused:   { text: '我停了一下',      dot: 'var(--sage-pale)',  color: 'var(--green)',      icon: 'i-check' },
    tried:    { text: '我试了一步',      dot: '#E4EDDF',           color: 'var(--green)',      icon: 'i-feet' },
    returned: { text: '我休息后回来了',  dot: 'rgba(39,96,97,.14)',color: 'var(--teal)',       icon: 'i-waves' },
    checked:  { text: '我自己检查了一遍',dot: '#EFE7D2',           color: '#8A7A52',           icon: 'i-searchcheck' }
  };
  var REC_ORDER = ['checked', 'returned', 'tried', 'paused', 'said', 'started'];

  function loadRecords() {
    try {
      var raw = JSON.parse(localStorage.getItem('qgi-records') || '{}') || {};
      S.records = raw.r || {};
      if (raw.body) S.lastBody = raw.body;
      if (raw.name) S.name = raw.name;
    } catch (e) { S.records = {}; }
  }
  function saveRecords() {
    try { localStorage.setItem('qgi-records', JSON.stringify({ r: S.records, body: S.lastBody, name: S.name })); } catch (e) {}
  }
  var MUTE = false;
  function record(key, silent) {
    if (!RECS[key]) return;
    var isNew = !S.records[key];
    S.records[key] = true;
    saveRecords();
    renderGrowth();
    renderMem();
    if (isNew) {
      S.sessionDone++;
      renderHome(); /* 会话收尾机制：完成 3 件事后，首页节奏带会温和劝停 */
    }
    if (!silent && !MUTE) toast('小岛记下了：' + RECS[key].text);
  }
  function toggleRecord(key) {
    if (!RECS[key]) return;
    if (S.records[key]) { delete S.records[key]; toast('先放回小口袋里'); }
    else { S.records[key] = true; toast('小岛记下了：' + RECS[key].text); }
    saveRecords();
    renderGrowth();
    renderMem();
  }

  function renderGrowth() {
    $$('#scr-growth .check-row').forEach(function (row) {
      var on = !!S.records[row.getAttribute('data-rec')];
      row.classList.toggle('done', on);
    });
  }

  function renderMem() {
    var list = $('#memList');
    if (!list) return;
    var keys = REC_ORDER.filter(function (k) { return S.records[k]; }).slice(-2).reverse();
    if (!keys.length) return;
    var html = keys.map(function (k) {
      var r = RECS[k];
      return '<div class="mem-row">' +
        '<span class="mem-dot" style="background:' + r.dot + ';color:' + r.color + '">' +
        '<svg class="ic"><use href="#' + r.icon + '"/></svg></span>' +
        '<span class="body-sm" style="font-weight:600">' + r.text + '</span></div>';
    }).join('');
    list.innerHTML = html;
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(text) {
    var el = $('#toast');
    $('#toastText').textContent = text;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }

  /* ---------- 导航 ---------- */
  function goto(id) {
    if (!SCREENS.some(function (s) { return s.id === id; })) id = 'welcome';
    stopAll();
    document.body.setAttribute('data-screen', id);
    $$('.screen').forEach(function (sec) {
      sec.classList.toggle('active', sec.id === 'scr-' + id);
    });
    $$('.tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-goto') === id);
    });
    $$('.rail-item').forEach(function (item) {
      item.classList.toggle('active', item.getAttribute('data-goto') === id);
    });
    var vp = $('#viewport');
    if (vp) vp.scrollTop = 0;

    if (id === 'calm') resetCalm();
    if (id === 'breath') resetBreath();
    if (id === 'welcome') applyName();
    if (id === 'move') resetMove();
    if (id === 'step') resetStep();
    if (id === 'rest') resetRest();
    if (id === 'restclose') startWaves();
  }

  /* 原型侧栏 */
  function buildRail() {
    var list = $('#railList');
    list.innerHTML = SCREENS.map(function (s, i) {
      var name = $('#scr-' + s.id).getAttribute('data-name');
      return '<button class="rail-item" data-goto="' + s.id + '">' +
        '<span class="rail-num">' + String(i + 1).padStart(2, '0') + '</span>' + name + '</button>';
    }).join('');
  }

  /* 全局点击代理 */
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g) { goto(g.getAttribute('data-goto')); return; }
    var row = e.target.closest('.check-row[data-rec]');
    if (row) {
      var turningOn = !S.records[row.getAttribute('data-rec')];
      toggleRecord(row.getAttribute('data-rec'));
      if (turningOn) { burstAt(row, 12); floatHeart(row); }
      return;
    }
  });

  /* ---------- 首页：8 种建议池 + 本地决策引擎（纯规则，零模型零后台） ----------
     决策优先级：会话收尾兜底 > 孩子刚选的身体状态 > 时段安全线 > 家长预设 > 按时间 */
  var SUGGESTIONS = {
    observe:   { label: '先安静一下',   title: '先让脑袋安静一下', desc: '不用想作业。跟着提示找 5 个看到的东西，做完就算回来了。',       time: '约 2 分钟', goto: 'calm',  btn: '我准备好了' },
    breath:    { label: '贝壳呼吸',     title: '跟贝壳呼吸 3 次', desc: '心里发紧、发热的时候，用这个。3 次呼吸，大约 1 分钟。',         time: '约 1 分钟', goto: 'breath', btn: '我准备好了' },
    move:      { label: '先动一动',     title: '先来 30 秒动一动', desc: '身体想动的话，先帮它放放电，再慢慢回来。',                     time: '约 1 分钟', goto: 'move',  btn: '我准备好了' },
    step:      { label: '先做一小步',   title: '先做 2 分钟小步', desc: '只开始一件事。打开就可以停一下，中断不算失败。',               time: '约 2 分钟', goto: 'step',  btn: '我准备好了' },
    waves:     { label: '听海浪',       title: '可以休息 5 分钟', desc: '听一段慢慢海浪。声音会慢慢变小，结束回下一小步。',             time: '约 5 分钟', goto: 'rest',  btn: '我想休息' },
    story:     { label: '听慢故事',     title: '听一个慢故事',   desc: '慢慢听。讲不完可以明天继续。',                                 time: '约 5 分钟', goto: 'rest',  btn: '我想听' },
    idle:      { label: '待一会儿',     title: '那就待一会儿',   desc: '什么都不用做。跟着泡泡呼吸，想动了再说。',                       time: '不着急',   goto: '_breatheCard', btn: '陪我待一会儿' },
    doneToday: { label: '今天已经够啦', title: '今天已经够啦',   desc: '小岛也要休息啦。明天它还在这儿等你。',                           time: '今天到此',  goto: '_bye',  btn: '明天见' }
  };
  function decideSuggestion() {
    if (S.sessionDone >= 3) return { id: 'doneToday', why: '小岛陪你收尾' };
    if (S.declinedOnce)     return { id: 'idle',      why: '你说想歇一会儿' };
    var bodyMap = { cloud: 'observe', fire: 'breath', spring: 'move', battery: 'waves', green: 'step' };
    if (S.lastBody && bodyMap[S.lastBody]) return { id: bodyMap[S.lastBody], why: '跟着你选的身体状态' };
    var h = S.qaHour != null ? S.qaHour : new Date().getHours();
    if (h >= 20 || h < 6) return { id: 'story', why: '现在晚了，安排轻一点的' };   /* 睡前安全线：夜间只推轻内容 */
    if (h >= 18 && h < 20) return { id: 'step', why: '按现在的时间安排' };         /* 作业前 */
    var mode = PARENT_MODES[S.settings.suggest] || PARENT_MODES[0];
    if (mode.mode !== 'auto') return { id: mode.mode, why: '家长今天预设的' };
    if (h >= 15 && h < 18) return { id: 'observe', why: '按现在的时间安排' };      /* 放学后 */
    return { id: 'move', why: '按现在的时间安排' };
  }
  function renderHome() {
    var d = decideSuggestion();
    var m = SUGGESTIONS[d.id];
    S.curSug = d.id;
    S.homeAction = m.goto;
    $('#homeEyebrow').textContent = d.id === 'doneToday' ? '小岛轻轻说' : '现在只做一件事';
    $('#homeWhy').textContent = d.why;
    $('#homeTitle').textContent = m.title;
    $('#homeDesc').textContent = m.desc;
    $('#homeTime').textContent = m.time;
    $('#homeBtn').textContent = m.btn;
    $('#restLink').hidden = (d.id === 'idle');
    if (d.id !== 'idle') $('#breatheCard').hidden = true;
    var anchor = $('#anchorStrip');
    if (anchor) {
      if (d.id === 'doneToday') {
        anchor.innerHTML = '<svg class="ic"><use href="#i-heart"/></svg>' +
          '<span>小岛轻轻说：<b>今天已经做得很够啦，去玩一会儿吧。</b></span>';
      } else {
        anchor.innerHTML = '<svg class="ic"><use href="#i-leaf"/></svg>' +
          '<span>现在 · <b>' + m.label + '</b></span>' +
          '<span class="next">接下来 · 休息 ' + S.settings.rest + ' 分</span>';
      }
    }
  }
  $('#homeBtn').addEventListener('click', function () {
    burstAt(this, 10);
    var g = S.homeAction;
    if (g === '_breatheCard') {
      $('#breatheCard').hidden = false;
      $('#restLink').hidden = true;
      toast('好，就待一会儿');
      return;
    }
    if (g === '_bye') { toast('明天见 🌿'); return; }
    goto(g);
    if (S.curSug === 'story') { /* 慢故事预设：进入休息页后切换内容 */
      $('#restTitle').textContent = '听一个慢故事';
      $('#restDesc').textContent = '慢慢听，讲不完可以明天继续。声音轻轻的。';
      $('#restStart').textContent = '开始听';
    }
  });
  $('#restLink').addEventListener('click', function () {
    $('#breatheCard').hidden = false;
    this.hidden = true;
  });
  $('#breatheBack').addEventListener('click', function () {
    $('#breatheCard').hidden = true;
    $('#restLink').hidden = false;
  });

  /* ---------- 身体充电站（内感受提示，点一次给一个很短的行动） ---------- */
  var CHARGE = {
    '渴了': '喝一小口水，慢慢咽。',
    '饿了': '找一点点心，坐下来吃。',
    '累了': '靠一会儿，慢慢数 10 次呼吸。',
    '想上厕所': '先去一下，回来更有力气。'
  };
  $('#chargeChips').addEventListener('click', function (e) {
    var chip = e.target.closest('.achip');
    if (!chip) return;
    var wasOn = chip.classList.contains('on');
    $$('#chargeChips .achip').forEach(function (c) { c.classList.remove('on'); });
    var hint = $('#chargeHint');
    if (wasOn) { hint.hidden = true; return; }
    chip.classList.add('on');
    var k = chip.getAttribute('data-charge');
    hint.textContent = k + ' → ' + CHARGE[k];
    hint.hidden = false;
  });

  /* ---------- 小步图书馆 ---------- */
  var TASKS = [
    { t: '把数学本打开到今天那页', d: '打开就可以停一下。中断不是失败，小岛会帮你回到这一页。', short: '打开本子',   hint: '3 个小小动作',                 chips: ['拿出来', '翻到页', '做一题'] },
    { t: '写下第一行',             d: '只写一行就好。写完就可以停下来。',                                     short: '写下第一行', hint: '一行就好，写完就停',           chips: ['翻开本子', '拿起笔', '写一行'] },
    { t: '整理桌面一个角落',       d: '只整理一个角落，不用全部收拾。',                                       short: '整理一角',   hint: '只整理一小块',                 chips: ['清出一块', '东西归位', '擦一擦'] }
  ];
  function buildLib() {
    $('#libStrip').innerHTML = TASKS.map(function (t, i) {
      return '<button class="lcard' + (i === S.step.task ? ' sel' : '') + '" data-task="' + i + '">' +
        (i === 0 ? '<span class="ltag">今天的小步</span>' : '') +
        '<b>' + t.t + '</b><span>' + t.hint + '</span></button>';
    }).join('');
  }
  function applyStepTask(fromUser) {
    var t = TASKS[S.step.task] || TASKS[0];
    $('#stepTaskTitle').textContent = t.t;
    $('#stepTaskDesc').textContent = t.d;
    $('#stepChips').innerHTML = t.chips.map(function (c) {
      return '<button class="schip"><span class="sdot"></span>' + c + '</button>';
    }).join('');
    $$('#libStrip .lcard').forEach(function (c, i) {
      c.classList.toggle('sel', i === S.step.task);
    });
    if (fromUser) toast('换好了：' + t.short);
  }
  $('#libStrip').addEventListener('click', function (e) {
    var card = e.target.closest('.lcard');
    if (!card) return;
    var i = parseInt(card.getAttribute('data-task'), 10);
    if (i === S.step.task) return;
    S.step.task = i;
    applyStepTask(true);
  });

  /* ---------- 点读（只由孩子主动触发，语速温和） ---------- */
  function bindSpeak(btnId, getText) {
    var btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!('speechSynthesis' in window)) { btn.style.display = 'none'; return; }
      if (btn.classList.contains('on')) {
        speechSynthesis.cancel();
        btn.classList.remove('on');
        return;
      }
      $$('.speak-btn').forEach(function (b) { b.classList.remove('on'); });
      var u = new SpeechSynthesisUtterance(getText());
      u.lang = 'zh-CN';
      u.rate = 0.95;
      u.pitch = 1.05;
      u.onend = function () { btn.classList.remove('on'); };
      u.onerror = u.onend;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      btn.classList.add('on');
    });
  }
  bindSpeak('#speakHome', function () { return $('#homeTitle').textContent + '。' + $('#homeDesc').textContent; });
  bindSpeak('#speakCalm', function () { return $('#calmTitle').textContent + '。' + $('#calmDesc').textContent; });
  bindSpeak('#speakMove', function () { return $('#moveTitle').textContent + '。' + $('#moveDesc').textContent; });
  bindSpeak('#speakStep', function () { return $('#stepTaskTitle').textContent + '。' + $('#stepTaskDesc').textContent; });
  bindSpeak('#speakRest', function () { return $('#restTitle').textContent + '。' + $('#restDesc').textContent; });

  /* ---------- 身体状态选择 ---------- */
  var BODY_MAP = {
    cloud:   { label: '就它了，去吹吹云',   goto: 'calm' },
    spring:  { label: '就它了，去放电',     goto: 'move' },
    fire:    { label: '就它了，去凉凉火',   goto: 'breath' },
    battery: { label: '就它了，去充电',     goto: 'rest' },
    green:   { label: '就它了，去迈一小步', goto: 'step' }
  };
  $$('.bcard').forEach(function (card) {
    card.addEventListener('click', function () {
      var pick = card.getAttribute('data-pick');
      $$('.bcard').forEach(function (c) { c.classList.remove('sel'); });
      card.classList.add('sel');
      S.bodyPick = pick;
      $('#bodyBtn').textContent = BODY_MAP[pick].label;
    });
  });
  $('#bodyBtn').addEventListener('click', function () {
    var pick = S.bodyPick || 'cloud';
    var m = BODY_MAP[pick];
    S.lastBody = pick;           /* 记住身体状态：首页建议会跟着它走 */
    saveRecords();
    goto(m.goto);
  });

  /* ---------- 贝壳呼吸（3 次，吸 4 秒呼 4 秒，随时可停） ---------- */
  var breath = { running: false, done: false, t: 0 };
  function resetBreath() {
    stop('breath');
    breath = { running: false, done: false, t: 0 };
    $('#breathPlay').hidden = false;
    $('#breathDone').hidden = true;
    var b = $('#breathBubble');
    b.classList.remove('in');
    b.classList.add('out');
    $('#breathPhase').textContent = '准备好了吗';
    $$('#breathDots .wdot').forEach(function (d) { d.classList.remove('on'); });
    $('#breathBtn').textContent = '开始呼吸';
  }
  function breathTick() {
    breath.t += 0.1 * ACCEL; /* 8 秒一个循环（吸 4 呼 4），演示加速 */
    var cycle = Math.floor(breath.t / 8);
    var ph = breath.t % 8;
    var b = $('#breathBubble');
    if (ph < 4) {
      if (!b.classList.contains('in')) {
        b.classList.remove('out'); b.classList.add('in');
        $('#breathPhase').textContent = '吸气…';
      }
    } else {
      if (!b.classList.contains('out')) {
        b.classList.remove('in'); b.classList.add('out');
        $('#breathPhase').textContent = '呼气…';
      }
    }
    $$('#breathDots .wdot').forEach(function (d, i) {
      d.classList.toggle('on', i < cycle);
    });
    if (cycle >= 3) breathFinish();
  }
  function breathFinish() {
    stop('breath');
    breath.running = false;
    breath.done = true;
    $('#breathPlay').hidden = true;
    $('#breathDone').hidden = false;
    $('#breathBtn').textContent = '回到小岛';
    magicDone($('#breathBtn'), '呼吸真好');
    record('paused');
  }
  $('#breathBtn').addEventListener('click', function () {
    if (breath.done) { goto('home'); return; }
    if (breath.running) { breathFinish(); return; }
    breath.running = true;
    $('#breathBtn').textContent = '我停一下，也好';
    every('breath', 100, breathTick);
  });
  bindSpeak('#speakBreath', function () { return '跟贝壳呼吸 3 次。慢慢吸，慢慢呼。想停就停。'; });

  /* ---------- 安顿 5-4-3-2-1 ---------- */
  var SENSES = [
    { n: 5, t: '找 5 个你看见的东西', d: '可以是铅笔、窗帘、贝壳贴纸。找到一个，就点亮一颗小石头。' },
    { n: 4, t: '摸 4 个你碰得到的东西', d: '桌子、外套、水杯……轻轻碰一下就好。' },
    { n: 3, t: '听 3 个小声音', d: '钟表、窗外、你自己的呼吸，都可以算。' },
    { n: 2, t: '闻 2 个味道', d: '闻不到也没关系，想一想也算数。' },
    { n: 1, t: '喝 1 口慢慢的气', d: '慢慢吸，慢慢呼，像给小船装上帆。' }
  ];
  function resetCalm() {
    S.calm = { i: 0, done: false };
    $('#calmPlay').hidden = false;
    $('#calmDone').hidden = true;
    $$('#calmStones .stone').forEach(function (s) { s.classList.remove('on'); });
    applySense(0);
    var btn = $('#calmBtn');
    btn.textContent = '我找到一个了';
    btn.removeAttribute('data-goto');
    $('#calmSkip').hidden = false;
  }
  function applySense(i) {
    var s = SENSES[i];
    var num = $('#calmNum');
    num.textContent = s.n;
    num.classList.remove('pulse');
    void num.offsetWidth;
    num.classList.add('pulse');
    $('#calmTitle').textContent = s.t;
    $('#calmDesc').textContent = s.d;
    /* 五感路线图：读得懂的孩子应始终看到整张地图（当前步高亮，已完成划掉） */
    $$('#senseMap .srow').forEach(function (row, k) {
      row.classList.toggle('done', k < i);
      row.classList.toggle('now', k === i);
    });
  }
  function calmAdvance() {
    if (S.calm.done) { goto('home'); return; }
    var stones = $$('#calmStones .stone');
    stones[S.calm.i].classList.add('on');
    burstAt(stones[S.calm.i], 4);
    S.calm.i++;
    if (S.calm.i >= 5) {
      S.calm.done = true;
      $('#calmPlay').hidden = true;
      $('#calmDone').hidden = false;
      $('#calmSkip').hidden = true;
      $$('#senseMap .srow').forEach(function (row) {
        row.classList.add('done');
        row.classList.remove('now');
      });
      var btn = $('#calmBtn');
      btn.textContent = '回到小岛';
      magicDone(btn, '云散开了');
      record('paused');
      return;
    }
    applySense(S.calm.i);
  }
  $('#calmBtn').addEventListener('click', calmAdvance);
  $('#calmSkip').addEventListener('click', calmAdvance);

  /* ---------- 动一动 ---------- */
  var ACTIONS = [
    { t: '脚跟轻轻点地', d: '坐着站着都行，脚跟轻轻点。动作很小，没人会注意。停下也算完成。' },
    { t: '甩甩手', d: '手腕放松，甩 30 秒。像把烦躁甩掉。' },
    { t: '踩踩地', d: '感受地板在托着你，左脚右脚换一换。' },
    { t: '伸个懒腰', d: '慢慢伸展，到最舒服的位置停 3 秒。' }
  ];
  function setMoveAction(i) {
    $$('#moveChips .achip').forEach(function (c, k) { c.classList.toggle('on', k === i); });
    $('#moveTitle').textContent = ACTIONS[i].t;
    $('#moveDesc').textContent = ACTIONS[i].d;
  }
  $$('#moveChips .achip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setMoveAction(parseInt(chip.getAttribute('data-action'), 10));
    });
  });
  function resetMove() {
    S.move = { running: false, sec: 0, done: false };
    stop('move');
    $('#moveCard').hidden = false;
    $('#moveDone').hidden = true;
    $('#moveHero').classList.remove('pulse');
    $('#moveRing').style.strokeDashoffset = RING_C;
    $('#moveSec').textContent = '0 秒';
    var btn = $('#moveBtn');
    btn.textContent = '开始动一动';
    $('#moveHome').hidden = true;
  }
  function moveTick() {
    S.move.sec += 0.25 * ACCEL;
    if (S.move.sec >= 30) { S.move.sec = 30; moveFinish(); return; }
    $('#moveSec').textContent = Math.floor(S.move.sec) + ' 秒';
    $('#moveRing').style.strokeDashoffset = RING_C * (1 - S.move.sec / 30);
  }
  function moveFinish() {
    stop('move');
    S.move.done = true;
    S.move.running = false;
    $('#moveHero').classList.remove('pulse');
    $('#moveSec').textContent = '30 秒';
    $('#moveRing').style.strokeDashoffset = 0;
    $('#moveCard').hidden = true;
    $('#moveDone').hidden = false;
    var btn = $('#moveBtn');
    btn.textContent = '回到小岛';
    magicDone(btn, '放电完成');
    record('paused');
  }
  $('#moveBtn').addEventListener('click', function () {
    if (S.move.done) { goto('home'); return; }
    if (!S.move.running) {
      S.move.running = true;
      $('#moveHero').classList.add('pulse');
      $('#moveBtn').textContent = '我动够了，慢慢停';
      every('move', 250, moveTick);
    } else {
      moveFinish();
    }
  });

  /* ---------- 小步启动 ---------- */
  function resetStep() {
    S.step = { running: false, sec: 0, done: false, task: S.step.task || 0 };
    stop('step');
    $('#stepPlay').hidden = false;
    $('#stepDone').hidden = true;
    $('#distractCard').hidden = true;
    $('#stepDistract').hidden = false;
    $('#stepRing').style.strokeDashoffset = RING_C;
    $('#stepSec').textContent = '慢慢来';
    applyStepTask(false);
    var btn = $('#stepBtn');
    btn.textContent = '我先打开本子';
    $('#stepHome').hidden = true;
  }
  /* 小步 chips 用事件委托：任务切换后重建的 chips 依然可用 */
  $('#stepChips').addEventListener('click', function (e) {
    var chip = e.target.closest('.schip');
    if (!chip) return;
    chip.classList.add('done');
    if ($$('#stepChips .schip.done').length === 3 && !S.records.tried) record('tried');
  });
  function stepTick() {
    S.step.sec += 0.4 * ACCEL;
    if (S.step.sec >= 120) { S.step.sec = 120; }
    var m = Math.floor(S.step.sec / 60), s = Math.floor(S.step.sec % 60);
    $('#stepSec').textContent = m + ':' + String(s).padStart(2, '0');
    $('#stepRing').style.strokeDashoffset = RING_C * (1 - S.step.sec / 120);
    if (S.step.sec >= 120) stepFinish();
  }
  function stepFinish() {
    stop('step');
    S.step.done = true;
    S.step.running = false;
    $('#stepPlay').hidden = true;
    $('#stepDone').hidden = false;
    $('#stepDistract').hidden = true;
    $('#distractCard').hidden = true;
    var btn = $('#stepBtn');
    btn.textContent = '回到小岛';
    $('#stepHome').hidden = true;
    $('#stepDoneLine').textContent = TASKS[S.step.task].short + '，就是今天的第一小步。';
    var art = document.querySelector('#stepCard .lh-art');
    if (art) {
      art.classList.remove('sweep');
      void art.offsetWidth;
      art.classList.add('sweep');
      setTimeout(function () { art.classList.remove('sweep'); }, 2600);
    }
    magicDone(btn, '开始了');
    record('started');
  }
  $('#stepBtn').addEventListener('click', function () {
    if (S.step.done) { goto('home'); return; }
    if (!S.step.running) {
      S.step.running = true;
      $('#stepBtn').textContent = '我做完了这一小步';
      every('step', 400, stepTick);
    } else {
      stepFinish();
    }
  });
  $('#stepDistract').addEventListener('click', function () {
    $('#distractCard').hidden = false;
    $('#stepDistract').hidden = true;
  });
  $('#distractReset').addEventListener('click', function () {
    stop('step');
    S.step.running = false;
    S.step.sec = 0;
    $$('#stepChips .schip').forEach(function (c) { c.classList.remove('done'); });
    $('#stepRing').style.strokeDashoffset = RING_C;
    $('#stepSec').textContent = '慢慢来';
    $('#distractCard').hidden = true;
    $('#stepBtn').textContent = '我先打开本子';
    toast('好，回到第一小步');
  });

  /* ---------- 健康休息 ---------- */
  function resetRest() {
    S.rest = { running: false, pct: 0 };
    stop('rest');
    $('#restH1').textContent = '休息 ' + S.settings.rest + ' 分钟';
    $('#restHero').classList.remove('rest-running');
    $('#tideFill').style.width = '0%';
    $('#restTitle').textContent = '听一段慢慢海浪';
    $('#restDesc').textContent = '只有这一项推荐。声音会慢慢变小，结束后回到下一小步。';
    $('#restStart').textContent = '开始休息';
    $('#restNow').textContent = '在播放 · 慢慢海浪';
  }
  $$('#restAlts .tile').forEach(function (tile) {
    tile.addEventListener('click', function () {
      $('#restTitle').textContent = tile.getAttribute('data-title');
      $('#restDesc').textContent = tile.getAttribute('data-desc');
      if (S.rest.running) $('#restNow').textContent = '已换成 · ' + tile.getAttribute('data-title');
      toast('已换成低刺激小休息');
    });
  });
  $('#restStart').addEventListener('click', function () {
    if (!S.rest.running) {
      S.rest.running = true;
      $('#restHero').classList.add('rest-running');
      $('#restDesc').textContent = '慢慢听，想停就停。小岛会陪你到靠岸。';
      $('#restNow').textContent = '在播放 · ' + $('#restTitle').textContent;
      $('#restStart').textContent = '提前收尾';
      every('rest', 100, function () {
        S.rest.pct += 100 / 60;
        if (S.rest.pct >= 100) {
          stop('rest');
          goto('restclose');
          return;
        }
        $('#tideFill').style.width = S.rest.pct + '%';
      });
    } else {
      goto('restclose');
    }
  });

  /* ---------- 休息收尾 ---------- */
  function startWaves() {
    if (NOANIM) return;
    var dots = $$('#waveSteps .wdot');
    dots.forEach(function (d) { d.classList.remove('on'); });
    var i = 0;
    every('waves', 850, function () {
      if (i >= dots.length) { stop('waves'); return; }
      dots[i].classList.add('on');
      i++;
    });
  }
  $$('#scr-restclose .nrow').forEach(function (row) {
    row.addEventListener('click', function () { row.classList.toggle('done'); });
  });
  $('#closeBtn').addEventListener('click', function () {
    magicDone(this, '回来啦');
    record('returned');
    toast('小岛帮你收好尾了');
    goto('home');
  });

  /* ---------- 找线索 ---------- */
  $('#clueStart').addEventListener('click', function () {
    $('#clueInputCard').hidden = true;
    setClueActive(1);
    toast('好，一步一步来');
  });
  function setClueActive(n) {
    $$('#clueStepsCard .clue-step').forEach(function (row) {
      var k = parseInt(row.getAttribute('data-step'), 10);
      row.classList.toggle('active', k === n && !row.classList.contains('done'));
    });
  }
  $$('#clueStepsCard .clue-step').forEach(function (row) {
    row.addEventListener('click', function () {
      if (row.classList.contains('done')) return;
      row.classList.add('done');
      row.classList.remove('active');
      burstAt(row, 10);
      var next = parseInt(row.getAttribute('data-step'), 10) + 1;
      if (next <= 4) { setClueActive(next); toast('这一步做好了'); }
      else { record('checked'); }
    });
  });
  var HINTS = {
    draw:    { t: '画图提示', d: '画 8 个小圆表示 8 块饼干，再划掉 3 个，看看还剩几个。' },
    similar: { t: '类似小题', d: '先做一道更小的：5 − 2 = ？做完再回来试原来的题。' },
    next:    { t: '下一小步', d: '下一步只做一件事：把要合起来的两个数字圈在一起。' },
    why:     { t: '错因提醒', d: '刚才那一步，是不是把「拿走一部分」当成了「合起来」？再看一眼题目里的词。' }
  };
  $$('#hintChips .hchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var on = chip.classList.contains('on');
      $$('#hintChips .hchip').forEach(function (c) { c.classList.remove('on'); });
      if (on) { $('#hintBubble').hidden = true; return; }
      chip.classList.add('on');
      var h = HINTS[chip.getAttribute('data-hint')];
      var bubble = $('#hintBubble');
      bubble.innerHTML = '<b><svg class="ic"><use href="#i-searchcheck"/></svg>' + h.t + ' · 不给答案</b>' + h.d;
      bubble.hidden = false;
    });
  });

  /* ---------- 找线索 · 纯规则题目解析（零模型；「不给答案」由代码强制执行） ---------- */
  function parseClue(str) {
    var m = String(str).replace(/[？?=＝]/g, ' ').match(/(\d+)\s*([+\-＋－×xX*÷／])\s*(\d+)/);
    if (!m) return null;
    var opRaw = m[2];
    var op = (opRaw === '+' || opRaw === '＋') ? 'plus'
           : (opRaw === '×' || opRaw === 'x' || opRaw === 'X' || opRaw === '*') ? 'mul'
           : (opRaw === '÷' || opRaw === '／') ? 'div' : 'minus';
    return { a: parseInt(m[1], 10), op: op, b: parseInt(m[3], 10) };
  }
  function clueHints(p) {
    var draw, sim, next, why;
    if (p.op === 'minus') {
      draw = p.a >= 20
        ? '画 ' + p.a + ' 个小点（10 个一排更好数），划掉 ' + p.b + ' 个，数数剩下几个。'
        : '画 ' + p.a + ' 个小圆，划掉 ' + p.b + ' 个，数数剩下几个。';
      sim  = (p.a - 1 >= p.b)
        ? '先做一道更小的：' + (p.a - 1) + ' − ' + p.b + ' = ？做完再回来。'
        : '这题减不开，先检查一下数字有没有抄反。';
      next = '下一步只做一件事：把 ' + p.a + ' 个小点画出来。';
      why  = '如果数出来变多了，看看是不是把「拿走一部分」看成了「合起来」。';
    } else if (p.op === 'plus') {
      draw = '先画 ' + p.a + ' 个小点，再画 ' + p.b + ' 个，数数一共几个。';
      sim  = (p.a >= 20)
        ? '先拆整十：' + (Math.floor(p.a / 10) * 10) + ' + ' + (p.a % 10) + ' + ' + p.b + ' = ？做完再回来。'
        : '先做一道更小的：' + p.a + ' + ' + Math.max(1, p.b - 1) + ' = ？做完再回来。';
      next = '下一步只做一件事：把两部分圈在一起。';
      why  = '如果数出来变少了，看看是不是把「合起来」看成了「拿走」。';
    } else if (p.op === 'mul') {
      draw = '每堆摆 ' + p.a + ' 个，摆 ' + p.b + ' 堆，数数一共几个。';
      sim  = '先做一道更小的：2 × ' + p.b + ' = ？做完再回来。';
      next = '下一步只做一件事：摆好第一堆。';
      why  = '乘法是「几个几」，看看题目问的是几个几。';
    } else {
      draw = '把 ' + p.a + ' 个小圆平均分一分，看看每堆几个。';
      sim  = '先做一道更小的：' + (p.b * 2) + ' ÷ ' + p.b + ' = ？做完再回来。';
      next = '下一步只做一件事：先分第一堆。';
      why  = '除法是「平均分」，看看是分东西还是分组。';
    }
    return [
      ['找一找', '题目里的数字是 ' + p.a + ' 和 ' + p.b + '，先圈出来。'],
      ['想一想', why],
      ['画图提示', draw],
      ['类似小题', sim],
      ['下一小步', next]
    ];
  }
  $('#clueTryBtn').addEventListener('click', function () {
    var out = $('#clueTryOut');
    var p = parseClue($('#clueTryInput').value);
    if (!p) {
      out.hidden = false;
      out.innerHTML = '<div class="parse-item"><b>试一试</b><span>小岛还没学会这种题。没关系，用下面四步来：先找一找数字和词。</span></div>';
      return;
    }
    out.hidden = false;
    out.innerHTML = clueHints(p).map(function (h) {
      return '<div class="parse-item"><b>' + h[0] + '</b><span>' + h[1] + '</span></div>';
    }).join('');
    burstAt($('#clueTryBtn'), 12);
    toast('题目拆好了，不给答案');
  });

  /* ---------- 家长小门 ---------- */
  var PARENT_MODES = [
    { mode: 'auto',    label: '小岛自动' },
    { mode: 'observe', label: '先安静一下' },
    { mode: 'move',    label: '先动一动' },
    { mode: 'step',    label: '先做一小步' },
    { mode: 'waves',   label: '可以休息' }
  ];
  var SUGGEST_CHILD = {
    auto:    '儿童端看到：小岛自己安排（按时间和状态）',
    observe: '儿童端看到：先让脑袋安静一下',
    move:    '儿童端看到：先来 30 秒动一动',
    step:    '儿童端看到：先做 2 分钟小步',
    waves:   '儿童端看到：可以休息 5 分钟'
  };
  function applyParentUI() {
    var mode = PARENT_MODES[S.settings.suggest] || PARENT_MODES[0];
    $('#pSuggest').textContent = mode.label;
    $('#pChildView').textContent = SUGGEST_CHILD[mode.mode];
    $$('#pRestSeg .seg').forEach(function (s) {
      s.classList.toggle('on', parseInt(s.getAttribute('data-min'), 10) === S.settings.rest);
    });
  }
  $('#pSuggest').addEventListener('click', function () {
    S.settings.suggest = (S.settings.suggest + 1) % PARENT_MODES.length;
    applyParentUI();
    renderHome();
    toast('孩子端的建议已更新');
  });
  $$('#pRestSeg .seg').forEach(function (seg) {
    seg.addEventListener('click', function () {
      S.settings.rest = parseInt(seg.getAttribute('data-min'), 10);
      applyParentUI();
      renderHome();
      if (document.body.getAttribute('data-screen') === 'rest') {
        $('#restH1').textContent = '休息 ' + S.settings.rest + ' 分钟';
      }
    });
  });
  $('#pNoAnswer').addEventListener('click', function () {
    var on = this.classList.toggle('on');
    this.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  $('#pPraise').addEventListener('input', function () {
    var v = this.value.trim() || '你能回来，就已经很好。';
    $('#scr-growth .encourage p').textContent = '“' + v + '”';
  });

  /* ---------- 名字与小岛宠物 ---------- */
  function applyName() {
    var n = (S.name || '').trim();
    var hn = $('#homeName');
    if (hn) hn.textContent = n ? n + '的今日岛' : '我的今日岛';
    $$('.island-pet .pet-name').forEach(function (ml) {
      ml.textContent = n ? n + '的小岛' : '我的小岛';
    });
    var g = $('#welcomeGreet');
    if (g) {
      g.textContent = n ? '欢迎回来，' + n : '';
      g.hidden = !n;
    }
    var card = $('#nameCard');
    if (card) card.hidden = !!n;
    var p = $('#pName');
    if (p && document.activeElement !== p) p.value = n;
  }
  function setName(v, silent) {
    S.name = (v || '').trim().slice(0, 8);
    saveRecords();
    applyName();
    if (!silent) toast(S.name ? S.name + '的小岛，是你的了' : '好，先不告诉它');
  }
  $('#nameBtn').addEventListener('click', function () {
    var v = ($('#nameInput').value || '').trim();
    if (!v) { toast('写一个名字吧，一个字也可以'); return; }
    setName(v);
    burstAt(this, 12);
    goto('home');
  });
  $('#nameSkip').addEventListener('click', function () {
    setName('');
    goto('home');
  });
  $('#pName').addEventListener('input', function () { setName(this.value, true); });
  var MASCOT_SAY = ['小岛在呢', '慢慢来', '我陪着你', '今天也慢慢来'];
  /* 每页空白处的小岛场景：沙岛 + 椰子树 + 蹲着的孩子 + 四周的海 */
  function petSVG() {
    return '<svg viewBox="0 0 140 100" fill="none">' +
      '<ellipse cx="70" cy="82" rx="58" ry="12" fill="#C7DCDF"/>' +
      '<path class="sea" d="M8 84c6-3.6 11-3.6 17 0" stroke="#9EC3CD" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path class="sea" d="M118 84c6-3.6 11-3.6 17 0" stroke="#9EC3CD" stroke-width="2.5" stroke-linecap="round"/>' +
      '<ellipse cx="70" cy="76" rx="50" ry="13" fill="#E8DCBE"/>' +
      '<path d="M94 74c1.5-10 1-18-1.5-26" stroke="#A9714B" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M92.5 48C84 43.5 75.5 43 69 47 75.5 50 86 50 92.5 48Z" fill="#6E9070"/>' +
      '<path d="M92.5 48C101 43.5 109.5 43 116 47 110 50 99 50 92.5 48Z" fill="#7FA97F"/>' +
      '<path d="M92.5 48C88 40 81.5 35.5 74 35 79 41.5 87 46 92.5 48Z" fill="#7FA97F"/>' +
      '<path d="M92.5 48C97 40 103.5 35.5 111 35 106 41.5 98 46 92.5 48Z" fill="#6E9070"/>' +
      '<circle cx="90" cy="51" r="2.4" fill="#8A5A3B"/>' +
      '<circle cx="95" cy="52" r="2.4" fill="#8A5A3B"/>' +
      '<g class="kid">' +
      '<circle cx="45.5" cy="56" r="4.2" fill="#3C5D50"/>' +
      '<path d="M40 67.5c.3-4.6 2.7-7.2 5.5-7.2 2.5 0 4.3 1.7 5.3 4l1 3.2h-11.8z" fill="#3C5D50"/>' +
      '</g>' +
      '<text class="pet-name" x="58" y="84" text-anchor="middle">我的小岛</text>' +
      '</svg>';
  }
  var PET_SCREENS = ['home', 'body', 'calm', 'breath', 'move', 'step', 'rest', 'restclose', 'growth', 'clues', 'parent'];
  function buildIslandPets() {
    var label = (S.name ? S.name : '我') + '的小岛';
    PET_SCREENS.forEach(function (id) {
      var content = document.querySelector('#scr-' + id + ' .content');
      if (!content || content.querySelector('.island-pet')) return;
      var corner = true; /* 所有页面统一：小岛安放在右上角空位 */
      var pet = document.createElement('div');
      pet.className = 'island-pet' + (corner ? ' pet-tr' : '');
      pet.setAttribute('role', 'button');
      pet.setAttribute('aria-label', label);
      pet.innerHTML = petSVG();
      if (corner) {
        content.insertBefore(pet, content.firstChild);
      } else {
        /* 只插到 .content 的直接子元素（flex-sp / 主按钮）前；找不到就放末尾 */
        var spot = null;
        var cand = content.querySelectorAll('.flex-sp, .btn');
        for (var k = 0; k < cand.length; k++) {
          if (cand[k].parentElement === content) { spot = cand[k]; break; }
        }
        if (spot) content.insertBefore(pet, spot); else content.appendChild(pet);
      }
      pet.addEventListener('click', function () {
        pet.classList.remove('boing');
        void pet.offsetWidth;
        pet.classList.add('boing');
        floatHeart(pet);
        toast(MASCOT_SAY[Math.floor(Math.random() * MASCOT_SAY.length)]);
      });
    });
    applyName();
  }

  /* ---------- 启动 ---------- */
  /* ---------- 弹性触感系统：按压 Q 弹 + 成功粒子 + 水波纹 ----------
     底线：prefers-reduced-motion 与截图模式（noanim）下全部自动关闭 */
  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function motionOK() {
    return !document.body.classList.contains('noanim') && !reducedMotion();
  }
  function burstAt(el, n) {
    if (!el || !motionOK()) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var colors = ['#7FA988', '#E9C87F', '#E6A16F', '#9EC3CD', '#E2A795'];
    var total = n || 12;
    for (var i = 0; i < total; i++) {
      var s = document.createElement('span');
      s.className = 'pt';
      var ang = (Math.PI * 2 * i) / total + Math.random() * 0.5;
      var dist = 44 + Math.random() * 48;
      var size = 6 + Math.random() * 7;
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.background = colors[i % colors.length];
      if (i % 3 === 2) s.classList.add('star');
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', (Math.sin(ang) * dist + 30) + 'px');
      s.style.setProperty('--rot', Math.round(Math.random() * 260 - 130) + 'deg');
      document.body.appendChild(s);
      (function (el2) { setTimeout(function () { el2.remove(); }, 850); })(s);
    }
  }
  function warmHalo(el) {
    if (!el || !motionOK()) return;
    var r = el.getBoundingClientRect();
    var h = document.createElement('span');
    h.className = 'warm-halo';
    h.style.left = (r.left + r.width / 2) + 'px';
    h.style.top = (r.top + r.height / 2) + 'px';
    h.style.width = '260px';
    h.style.height = '260px';
    document.body.appendChild(h);
    setTimeout(function () { h.remove(); }, 1100);
  }
  function warmFlash() {
    if (!motionOK()) return;
    var f = document.createElement('span');
    f.className = 'warm-flash';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 1100);
  }
  function meteors(n) {
    if (!motionOK()) return;
    for (var i = 0; i < n; i++) {
      (function (k) {
        setTimeout(function () {
          var m = document.createElement('span');
          m.className = 'meteor';
          m.style.left = (40 + Math.random() * 240) + 'px';
          m.style.top = (50 + Math.random() * 130) + 'px';
          document.body.appendChild(m);
          setTimeout(function () { m.remove(); }, 1250);
        }, k * 260);
      })(i);
    }
  }
  function floatHeart(el) {
    if (!el || !motionOK()) return;
    var r = el.getBoundingClientRect();
    var h = document.createElement('span');
    h.className = 'float-heart';
    h.textContent = '♥';
    h.style.left = (r.left + 16 + Math.random() * Math.max(20, r.width - 32)) + 'px';
    h.style.top = (r.top + 8) + 'px';
    document.body.appendChild(h);
    setTimeout(function () { h.remove(); }, 1450);
  }
  function floatWord(el, text) {
    if (!el || !motionOK()) return;
    var r = el.getBoundingClientRect();
    var w = document.createElement('span');
    w.className = 'float-word';
    w.textContent = text;
    w.style.left = (r.left + r.width / 2) + 'px';
    w.style.top = (r.top - 6) + 'px';
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, 1600);
  }
  /* 大完成时刻：星光喷泉 + 暖光晕 + 全屏暖光闪 + 流星 + 暖话漂浮 */
  function magicDone(el, word) {
    if (!el || !motionOK()) return;
    burstAt(el, 20);
    warmHalo(el);
    warmFlash();
    meteors(3);
    if (word) floatWord(el, word);
  }
  /* 环境魔法：小岛上的萤火虫（暖金色，缓慢漂移） */
  function spawnFireflies() {
    if (!motionOK()) return;
    var host = document.querySelector('.device-screen');
    if (!host) return;
    var layer = document.createElement('div');
    layer.className = 'fireflies';
    for (var i = 0; i < 7; i++) {
      var f = document.createElement('span');
      f.className = 'ff';
      f.style.left = (5 + Math.random() * 88) + '%';
      f.style.top = (8 + Math.random() * 80) + '%';
      f.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px');
      f.style.setProperty('--dy', (Math.random() * 60 - 30) + 'px');
      f.style.setProperty('--fd', (9 + Math.random() * 8) + 's');
      f.style.setProperty('--fg', (3 + Math.random() * 3) + 's');
      f.style.animationDelay = (-Math.random() * 9) + 's';
      layer.appendChild(f);
    }
    host.appendChild(layer);
  }
  var PRESSY = '.btn,.tile,.achip,.schip,.hchip,.bcard,.lcard,.tab,.speak-btn,.back-btn,.seg,.switch,.check-row,.nrow,.clue-step,.ccard,.island-pet';
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest(PRESSY);
    if (!el || !motionOK()) return;
    el.classList.remove('boing');
    void el.offsetWidth;
    el.classList.add('boing');
  }, true);
  document.addEventListener('animationend', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('boing')) {
      e.target.classList.remove('boing');
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.btn');
    if (!b || !motionOK()) return;
    var r = b.getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'ripple';
    s.style.left = (e.clientX - r.left) + 'px';
    s.style.top = (e.clientY - r.top) + 'px';
    s.style.width = '24px';
    s.style.height = '24px';
    s.style.marginLeft = '-12px';
    s.style.marginTop = '-12px';
    b.appendChild(s);
    setTimeout(function () { s.remove(); }, 650);
  }, true);

  var params = new URLSearchParams(location.search);
  var NOANIM = params.get('noanim') === '1';
  if (NOANIM) document.body.classList.add('noanim');
  loadRecords();
  var sug = parseInt(params.get('sug'), 10);
  if (!isNaN(sug) && sug >= 0 && sug <= 4) S.settings.suggest = sug;
  var rst = parseInt(params.get('rst'), 10);
  if ([3, 5, 10].indexOf(rst) >= 0) S.settings.rest = rst;
  var bodyP = params.get('body');
  if (bodyP && ['cloud', 'spring', 'fire', 'battery', 'green'].indexOf(bodyP) >= 0) S.lastBody = bodyP;
  var hh = parseInt(params.get('hour'), 10);
  if (!isNaN(hh) && hh >= 0 && hh <= 23) S.qaHour = hh;
  if (params.get('decline') === '1') S.declinedOnce = true;
  var sessN = parseInt(params.get('session'), 10);
  if (!isNaN(sessN)) S.sessionDone = sessN;
  var nm = params.get('name');
  if (nm) S.name = nm.slice(0, 8);
  buildRail();
  renderHome();
  buildLib();
  applyStepTask(false);
  applyParentUI();
  renderGrowth();
  renderMem();
  spawnFireflies();
  buildIslandPets();
  applyName();

  if (params.get('debug') === '1') {
    var sb = document.querySelector('.statusbar span');
    if (sb) sb.textContent = 'w' + window.innerWidth + '×' + window.innerHeight + ' dpr' + window.devicePixelRatio;
  }
  if (params.get('bare') === '1') document.body.classList.add('bare');
  if (params.get('flat') === '1') {
    document.body.classList.add('flat');
    var vp = $('#viewport');
    Array.prototype.forEach.call(vp.querySelectorAll('.screen'), function (sec, i) {
      var label = document.createElement('div');
      label.className = 'divider-label';
      var s = SCREENS[i];
      label.innerHTML = String(i + 1).padStart(2, '0') + ' · ' + sec.getAttribute('data-name') +
        '<small>' + s.en + '</small>';
      vp.insertBefore(label, sec);
      sec.classList.add('flat-show');
    });
  } else {
    goto(params.get('screen') || 'welcome');
  }

  /* ---------- 演示态（?demo=…，配合 noanim=1 用于截图评审） ---------- */
  if (params.get('demo')) {
    MUTE = true;
    var d = params.get('demo');
    if (d === 'calmdone') { goto('calm'); for (var k = 0; k < 5; k++) calmAdvance(); }
    if (d === 'movedone') { goto('move'); moveFinish(); }
    if (d === 'stepdone') { goto('step'); stepFinish(); }
    if (d === 'restrun') {
      goto('rest');
      S.rest.running = true;
      $('#restHero').classList.add('rest-running');
      $('#restDesc').textContent = '慢慢听，想停就停。小岛会陪你到靠岸。';
      $('#restNow').textContent = '在播放 · 慢慢海浪';
      $('#restStart').textContent = '提前收尾';
      $('#tideFill').style.width = '46%';
    }
    if (d === 'cluesmid') {
      goto('clues');
      $('#clueStart').click();
      $('.clue-step[data-step="1"]').click();
      $('.clue-step[data-step="2"]').click();
      $('.hchip[data-hint="draw"]').click();
    }
    if (d === 'parse') {
      goto('clues');
      $('#clueTryInput').value = '25 + 37 = ？';
      $('#clueTryBtn').click();
    }
    if (d === 'breathdone') {
      goto('breath');
      breath.t = 24;
      breath.running = true;
      breathTick();
      breathFinish();
    }
    if (d === 'records') {
      ['started', 'said', 'paused', 'returned'].forEach(function (k) { S.records[k] = true; });
      S.sessionDone = 3;
      saveRecords();
      renderGrowth();
      renderMem();
      renderHome();
    }
    MUTE = false;
  }
})();
