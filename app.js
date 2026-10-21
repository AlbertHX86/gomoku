(function () {
  'use strict';

  var TEXT = {
    en: {
      title: 'Gomoku',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      pvp: '2 Players',
      turn: 'Turn',
      you: 'You',
      computer: 'Computer',
      black: 'Black',
      white: 'White',
      time: 'Time',
      scoreAi: 'You – Computer',
      scorePvp: 'Black – White',
      hintAi: 'You play black and move first. Five in a row wins.',
      hintPvp: 'Black moves first. Take turns; five in a row wins.',
      thinking: 'Computer is thinking…',
      youWin: 'You win in {m} moves!',
      aiWin: 'The computer wins. Try again?',
      blackWin: 'Black wins in {m} moves!',
      whiteWin: 'White wins in {m} moves!',
      draw: 'Draw: the board is full.',
      reset: 'Reset',
      undo: 'Undo ({n})',
      undos: '{n} undo',
      undosPl: '{n} undos',
      records: 'Records',
      clear: 'Clear',
      empty: 'No games in this mode yet.',
      local: 'Records are saved only in this browser.',
      confirmClear: 'Clear all {mode} records?',
      light: 'Light',
      dark: 'Dark',
      rWin: 'Win',
      rLoss: 'Loss',
      rDraw: 'Draw',
      rBlack: 'Black wins',
      rWhite: 'White wins',
      moves: '{m} moves',
      copyright: '© 2026 Albert Huang. Released under the MIT License.',
      schulte: 'Schulte Grid',
      sudoku: 'Sudoku',
      lit: 'Research: Gomoku, board games and the prefrontal cortex',
      refs: 'References'
    },
    zh: {
      title: '五子棋',
      easy: '简单',
      medium: '中等',
      hard: '困难',
      pvp: '双人',
      turn: '轮到',
      you: '你',
      computer: '电脑',
      black: '黑',
      white: '白',
      time: '用时',
      scoreAi: '你 – 电脑',
      scorePvp: '黑 – 白',
      hintAi: '你执黑先行，先连成五子者获胜。',
      hintPvp: '黑方先行，轮流落子，先连成五子者获胜。',
      thinking: '电脑思考中…',
      youWin: '你赢了，共 {m} 手！',
      aiWin: '电脑赢了，再来一局？',
      blackWin: '黑方获胜，共 {m} 手！',
      whiteWin: '白方获胜，共 {m} 手！',
      draw: '平局：棋盘已满。',
      reset: '重置',
      undo: '悔棋（{n}）',
      undos: '悔棋 {n} 次',
      undosPl: '悔棋 {n} 次',
      records: '记录',
      clear: '清空',
      empty: '这个模式还没有对局记录。',
      local: '记录只保存在当前浏览器中。',
      confirmClear: '清空“{mode}”的所有记录？',
      light: '亮色',
      dark: '暗色',
      rWin: '胜',
      rLoss: '负',
      rDraw: '平',
      rBlack: '黑胜',
      rWhite: '白胜',
      moves: '{m} 手',
      copyright: '© 2026 Albert Huang. 以 MIT 许可证开源。',
      schulte: '舒尔特方格',
      sudoku: '数独',
      lit: '文献：五子棋、棋类游戏与前额叶',
      refs: '参考文献'
    }
  };

  var N = 15;
  var BLACK = 1, WHITE = 2;
  var MODES = ['easy', 'medium', 'hard', 'pvp'];
  var STARS = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  var KEEP = 10; // records shown per mode
  var UNDOS = 3;  // undos allowed per game

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board');
  var turnEl = $('turn');
  var timeEl = $('time');
  var scoreEl = $('score');
  var scoreLabelEl = $('score-label');
  var hintEl = $('hint');
  var historyEl = $('history');
  var emptyEl = $('empty');

  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem('gomoku.' + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('gomoku.' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var lang = store.get('lang', (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en');
  var mode = store.get('mode', 'medium');
  if (MODES.indexOf(mode) < 0) mode = 'medium';

  var grid, points, turn, moves, last, startAt, timer, finished, busy, endKey, aiTimeout, played, undosLeft;

  function t(key, vars) {
    var s = TEXT[lang][key];
    for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    return m + ':' + ('0' + (s % 60)).slice(-2);
  }

  function at(r, c) {
    return r < 0 || c < 0 || r >= N || c >= N ? -1 : grid[r * N + c];
  }

  // ---- Computer player ---------------------------------------------------

  // Shapes on a 9-point line through the candidate point, written from the
  // mover's side: 1 = own stone, 0 = empty, 2 = opponent stone or edge.
  var SHAPES = [
    ['11111', 1e7, 'five'],
    ['011110', 1e5, 'four'],
    ['011112', 1e4, 'four'], ['211110', 1e4, 'four'],
    ['10111', 1e4, 'four'], ['11011', 1e4, 'four'], ['11101', 1e4, 'four'],
    ['001110', 1500, 'three'], ['011100', 1500, 'three'],
    ['010110', 1200, 'three'], ['011010', 1200, 'three'],
    ['00111', 150, ''], ['11100', 150, ''], ['01011', 120, ''], ['11010', 120, ''],
    ['10011', 100, ''], ['11001', 100, ''], ['10101', 100, ''],
    ['001100', 120, ''], ['01010', 80, ''], ['010010', 60, ''],
    ['00011', 15, ''], ['11000', 15, ''], ['00110', 20, ''], ['01100', 20, '']
  ];

  function lineAt(r, c, dr, dc, who) {
    var s = '';
    for (var k = -4; k <= 4; k++) {
      if (k === 0) { s += '1'; continue; }
      var v = at(r + dr * k, c + dc * k);
      s += v === 0 ? '0' : v === who ? '1' : '2';
    }
    return s;
  }

  // How good it is for `who` to play at (r, c).
  function shapeScore(r, c, who) {
    var total = 0, fours = 0, threes = 0;
    for (var d = 0; d < 4; d++) {
      var line = lineAt(r, c, DIRS[d][0], DIRS[d][1], who);
      var best = 0, kind = '';
      for (var i = 0; i < SHAPES.length; i++) {
        var p = SHAPES[i][0];
        // Only count matches that include the candidate point (index 4).
        for (var start = Math.max(0, 5 - p.length); start <= 4 && start + p.length <= 9; start++) {
          if (line.substr(start, p.length) === p && SHAPES[i][1] > best) {
            best = SHAPES[i][1]; kind = SHAPES[i][2];
          }
        }
      }
      total += best;
      if (kind === 'four') fours++;
      if (kind === 'three') threes++;
    }
    // Double threats are close to a win.
    if (fours >= 2 || (fours && threes)) total += 5e4;
    else if (threes >= 2) total += 2e4;
    return total;
  }

  function candidates() {
    var list = [];
    for (var i = 0; i < N * N; i++) {
      if (grid[i]) continue;
      var r = Math.floor(i / N), c = i % N, near = false;
      for (var dr = -2; dr <= 2 && !near; dr++) {
        for (var dc = -2; dc <= 2; dc++) {
          if (at(r + dr, c + dc) > 0) { near = true; break; }
        }
      }
      if (near) list.push(i);
    }
    return list;
  }

  function ranked(me, defense) {
    var foe = me === BLACK ? WHITE : BLACK;
    return candidates().map(function (i) {
      var r = Math.floor(i / N), c = i % N;
      var a = shapeScore(r, c, me), d = shapeScore(r, c, foe);
      // Winning beats blocking; blocking a five beats everything else.
      var s = a >= 1e7 ? 1e9 : d >= 1e7 ? 5e8 : a * 1.1 + d * defense;
      return { i: i, s: s, a: a, d: d };
    }).sort(function (x, y) { return y.s - x.s; });
  }

  function aiMove(me) {
    if (!moves) return 7 * N + 7;
    var foe = me === BLACK ? WHITE : BLACK;
    if (mode === 'easy') {
      var list = ranked(me, 0.55);
      if (list[0].s >= 5e8) return list[0].i;
      var pick = list.slice(0, 3);
      return pick[Math.floor(Math.random() * pick.length)].i;
    }
    var top = ranked(me, 0.95);
    if (mode === 'medium' || top[0].s >= 5e8) return top[0].i;
    // Hard: look one reply ahead for the best few candidates.
    var best = top[0].i, bestVal = -Infinity;
    top.slice(0, 10).forEach(function (m) {
      grid[m.i] = me;
      var reply = ranked(foe, 0.95)[0];
      grid[m.i] = 0;
      var threat = reply ? reply.a : 0;
      var val = m.s - 0.9 * threat;
      if (val > bestVal) { bestVal = val; best = m.i; }
    });
    return best;
  }

  // ---- Game --------------------------------------------------------------

  function records() { return store.get('records.' + mode, []); }

  function stopTimer() {
    if (timer) cancelAnimationFrame(timer);
    timer = null;
  }

  function tick() {
    timeEl.textContent = fmt(performance.now() - startAt);
    timer = requestAnimationFrame(tick);
  }

  function newGame() {
    stopTimer();
    clearTimeout(aiTimeout);
    grid = new Array(N * N).fill(0);
    turn = BLACK;
    moves = 0;
    last = -1;
    startAt = null;
    finished = false;
    busy = false;
    endKey = null;
    played = [];
    undosLeft = UNDOS;

    boardEl.className = 'goban';
    boardEl.innerHTML = '';
    points = [];
    for (var i = 0; i < N * N; i++) {
      var r = Math.floor(i / N), c = i % N;
      var p = document.createElement('button');
      p.type = 'button';
      p.className = 'pt free' + (c === 0 ? ' l' : '') + (c === N - 1 ? ' r' : '') +
        (r === 0 ? ' t' : '') + (r === N - 1 ? ' b' : '');
      p.dataset.i = i;
      if (STARS.some(function (s) { return s[0] === r && s[1] === c; })) {
        p.classList.add('star');
        var dot = document.createElement('span');
        dot.className = 'dot';
        p.appendChild(dot);
      }
      var ghost = document.createElement('span');
      ghost.className = 'ghost';
      p.appendChild(ghost);
      boardEl.appendChild(p);
      points.push(p);
    }

    timeEl.textContent = fmt(0);
    hintEl.className = 'hint';
    renderTurn();
    renderText();
    renderRecords();
  }

  function renderUndo() {
    var b = $('undo');
    b.textContent = t('undo', { n: undosLeft });
    // Against the computer an undo takes back your stone and its reply.
    var need = mode === 'pvp' ? 1 : 2;
    b.disabled = finished || busy || !undosLeft || played.length < need;
  }

  function unplace() {
    var i = played.pop();
    grid[i] = 0;
    moves--;
    var p = points[i];
    p.querySelector('.stone').remove();
    p.classList.add('free');
    var ghost = document.createElement('span');
    ghost.className = 'ghost';
    p.appendChild(ghost);
    last = played.length ? played[played.length - 1] : -1;
    if (last >= 0) points[last].querySelector('.stone').classList.add('last');
    turn = turn === BLACK ? WHITE : BLACK;
  }

  function undo() {
    if ($('undo').disabled) return;
    unplace();
    if (mode !== 'pvp') unplace();
    undosLeft--;
    renderTurn();
    renderUndo();
  }

  function renderTurn() {
    turnEl.className = 'turn-stone ' + (turn === BLACK ? 'black' : 'white');
    $('turn-text').textContent = mode === 'pvp' ? t(turn === BLACK ? 'black' : 'white') : t(turn === BLACK ? 'you' : 'computer');
    var color = turn === BLACK ? 'var(--black)' : 'var(--white)';
    points.forEach(function (p) {
      var g = p.querySelector('.ghost');
      if (g) g.style.background = color;
    });
  }

  function place(i) {
    var who = turn;
    grid[i] = who;
    moves++;
    if (startAt === null) { startAt = performance.now(); tick(); }

    var p = points[i];
    p.classList.remove('free');
    var g = p.querySelector('.ghost');
    if (g) g.remove();
    var s = document.createElement('span');
    s.className = 'stone ' + (who === BLACK ? 'black' : 'white');
    p.appendChild(s);
    if (last >= 0) {
      var prev = points[last].querySelector('.stone');
      if (prev) prev.classList.remove('last');
    }
    s.classList.add('last');
    last = i;
    played.push(i);

    var line = fiveThrough(i, who);
    if (line) return finish(who, line);
    if (moves === N * N) return finish(0, null);
    turn = who === BLACK ? WHITE : BLACK;
    renderTurn();
    renderUndo();
  }

  function fiveThrough(i, who) {
    var r = Math.floor(i / N), c = i % N;
    for (var d = 0; d < 4; d++) {
      var line = [i];
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        for (var k = 1; k < 5; k++) {
          var rr = r + DIRS[d][0] * k * sgn, cc = c + DIRS[d][1] * k * sgn;
          if (at(rr, cc) !== who) break;
          line.push(rr * N + cc);
        }
      }
      if (line.length >= 5) return line;
    }
    return null;
  }

  function finish(winner, line) {
    stopTimer();
    finished = true;
    busy = false;
    var ms = performance.now() - startAt;
    timeEl.textContent = fmt(ms);
    boardEl.classList.add('finished');
    boardEl.classList.remove('busy');
    if (line) line.forEach(function (i) { points[i].querySelector('.stone').classList.add('win'); });

    var result;
    if (mode === 'pvp') result = winner === BLACK ? 'black' : winner === WHITE ? 'white' : 'draw';
    else result = winner === BLACK ? 'win' : winner === WHITE ? 'loss' : 'draw';
    endKey = { win: 'youWin', loss: 'aiWin', black: 'blackWin', white: 'whiteWin', draw: 'draw' }[result];

    var list = records();
    list.push({ result: result, moves: moves, ms: Math.round(ms), at: Date.now(), undos: UNDOS - undosLeft });
    store.set('records.' + mode, list);

    hintEl.className = 'hint' + (result === 'loss' || result === 'draw' ? '' : ' win');
    hintEl.textContent = t(endKey, { m: moves });
    renderRecords();
    renderUndo();
  }

  boardEl.addEventListener('click', function (e) {
    var p = e.target.closest('.pt');
    if (!p || finished || busy) return;
    var i = +p.dataset.i;
    if (grid[i]) return;
    place(i);
    if (finished || mode === 'pvp') return;

    busy = true;
    boardEl.classList.add('busy');
    renderUndo();
    hintEl.textContent = t('thinking');
    aiTimeout = setTimeout(function () {
      var m = aiMove(WHITE);
      busy = false;
      boardEl.classList.remove('busy');
      place(m);
      if (!finished) hintEl.textContent = t('hintAi');
    }, 250);
  });

  function renderRecords() {
    var list = records();
    var a = 0, b = 0;
    list.forEach(function (r) {
      if (r.result === 'win' || r.result === 'black') a++;
      if (r.result === 'loss' || r.result === 'white') b++;
    });
    scoreEl.textContent = a + ' – ' + b;

    var shown = list.slice(-KEEP).reverse();
    var locale = lang === 'zh' ? 'zh-CN' : 'en-US';
    var names = { win: 'rWin', loss: 'rLoss', draw: 'rDraw', black: 'rBlack', white: 'rWhite' };
    historyEl.innerHTML = '';
    shown.forEach(function (r) {
      var li = document.createElement('li');
      if (r.result === 'win') li.className = 'win-row';
      var when = document.createElement('span');
      when.className = 'when';
      when.textContent = new Date(r.at).toLocaleString(locale, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      var right = document.createElement('span');
      var res = document.createElement('span');
      res.className = 't';
      res.textContent = t(names[r.result]);
      var m = document.createElement('span');
      m.className = 'm muted';
      m.textContent = ' · ' + t('moves', { m: r.moves }) + ' · ' + fmt(r.ms) +
        (r.undos ? ' · ' + t(r.undos === 1 ? 'undos' : 'undosPl', { n: r.undos }) : '');
      right.appendChild(res);
      right.appendChild(m);
      li.appendChild(when);
      li.appendChild(right);
      historyEl.appendChild(li);
    });
    emptyEl.hidden = list.length > 0;
  }

  function currentTheme() {
    var set = document.documentElement.dataset.theme;
    if (set) return set;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function renderText() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
    // The menu always reads "语言 / Language"; the current choice gets a check mark.
    var sel = $('lang');
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value) o.textContent = (o.value === lang ? '✓ ' : ' ') + (o.value === 'zh' ? '中文' : 'English');
    });
    sel.selectedIndex = 0;
    // The button names the theme you switch to.
    $('theme').textContent = currentTheme() === 'dark' ? t('light') : t('dark');
    scoreLabelEl.textContent = t(mode === 'pvp' ? 'scorePvp' : 'scoreAi');
    if (points) { renderTurn(); renderUndo(); }
    if (finished) hintEl.textContent = t(endKey, { m: moves });
    else if (busy) hintEl.textContent = t('thinking');
    else hintEl.textContent = t(mode === 'pvp' ? 'hintPvp' : 'hintAi');
  }

  function renderModes() {
    document.querySelectorAll('.sizes button').forEach(function (b) {
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(b.dataset.mode === mode));
    });
  }

  document.querySelector('.sizes').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    mode = b.dataset.mode;
    store.set('mode', mode);
    renderModes();
    newGame();
  });

  $('reset').addEventListener('click', newGame);
  $('undo').addEventListener('click', undo);

  $('clear').addEventListener('click', function () {
    if (!records().length) return;
    if (!confirm(t('confirmClear', { mode: t(mode) }))) return;
    store.set('records.' + mode, []);
    renderRecords();
  });

  $('lang').addEventListener('change', function (e) {
    lang = e.target.value === 'zh' ? 'zh' : 'en';
    store.set('lang', lang);
    renderText();
    renderRecords();
  });

  $('theme').addEventListener('click', function () {
    var to = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = to;
    try { localStorage.setItem('gomoku.theme', to); } catch (e) {}
    renderText();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderText);

  renderModes();
  newGame();
})();
