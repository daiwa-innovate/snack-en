/* =========================================================
 * シフトの画面
 *   スタッフ・店頭用：公開された週だけ。「あなたの次の出勤」→ 1週間の日付ボタン → その日の出勤者を時間の帯（横棒）で。
 *   管理者：週ごとの表（スタッフ×曜日）で、希望とシフトを入れる。週ごとに公開する。
 * ======================================================= */
(function () {
  var OPEN = 19 * 60 + 30, LAST = 25 * 60, SPAN = LAST - OPEN;
  var DOW = ['日', '月', '火', '水', '木', '金', '土'];
  var S = { ws: null, date: null, view: 'day', home: null, week: null };
  var A = { ws: null, week: null };

  var CSS = '' +
    '.sh-next{background:var(--accent);color:#fff;border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;gap:2px}' +
    '.sh-next .l{font-size:13px;opacity:.85}.sh-next .d{font-size:26px;font-weight:700;line-height:1.3}.sh-next .t{font-size:20px;font-weight:700}.sh-next .s{font-size:13px;opacity:.9;margin-top:4px}' +
    '.sh-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}' +
    '.sh-d{position:relative;border:1px solid #D6CEC5;background:#fff;border-radius:12px;min-height:76px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;font:inherit;color:inherit}' +
    '.sh-d .w{font-size:12px;color:var(--sub)}.sh-d .n{font-size:18px;font-weight:700}.sh-d .c{font-size:12px;color:var(--sub)}' +
    '.sh-d.sat .w{color:#2D5B8A}.sh-d.sun .w{color:#9B2C2C}' +
    '.sh-d.on{background:var(--ink);border-color:var(--ink);color:#fff}.sh-d.on .w,.sh-d.on .c{color:#E9E3DC}' +
    '.sh-d.today{outline:2px solid var(--accent);outline-offset:1px}' +
    '.sh-d.off{background:#EFEFEF;color:#767676}' +
    '.sh-d .me{position:absolute;top:3px;right:5px;font-size:12px;color:var(--accent)}.sh-d.on .me{color:#F3E3B5}' +
    '.sh-axis{display:grid;grid-template-columns:64px 1fr;gap:8px;font-size:11px;color:var(--sub)}' +
    '.sh-axis .ax{position:relative;height:16px}.sh-axis .ax span{position:absolute;transform:translateX(-50%);white-space:nowrap}' +
    '.sh-row{display:grid;grid-template-columns:64px 1fr;gap:8px;align-items:center;min-height:44px}' +
    '.sh-row .nm{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.sh-row.me .nm{color:var(--accent)}' +
    '.sh-track{position:relative;height:32px;background:#F1ECE6;border-radius:8px}' +
    '.sh-seg{position:absolute;top:3px;bottom:3px;border-radius:6px;background:#CFC4B8;color:var(--ink);font-size:11px;font-weight:700;display:flex;align-items:center;padding:0 6px;white-space:nowrap;overflow:hidden}' +
    '.sh-row.me .sh-seg{background:var(--accent);color:#fff}' +
    '.sh-grid-line{position:absolute;top:0;bottom:0;width:1px;background:rgba(0,0,0,.07)}' +
    '.sh-wk{background:#fff;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}' +
    '.sh-wk .hd{display:flex;justify-content:space-between;align-items:baseline}' +
    '.sh-wk .hd b{font-size:16px}.sh-wk .mb{display:flex;flex-wrap:wrap;gap:6px}' +
    '.sh-pill{border-radius:14px;padding:4px 10px;font-size:13px;background:#EFEAE4}.sh-pill.me{background:var(--accent);color:#fff;font-weight:700}' +
    '.sh-pill small{opacity:.8;margin-left:4px;font-size:11px}' +
    '.sh-ev{display:inline-block;background:#F3E3B5;color:#6B4710;border-radius:8px;padding:2px 9px;font-size:12px;font-weight:700}' +
    /* 管理者の週の表 */
    '.sa-tbl{border-collapse:separate;border-spacing:0;width:100%;min-width:780px;font-size:13px}' +
    '.sa-tbl th,.sa-tbl td{border-bottom:1px solid var(--line2);padding:4px;vertical-align:top;text-align:center}' +
    '.sa-tbl th{background:#fff;position:sticky;top:0;z-index:2}' +
    '.sa-tbl td.nm,.sa-tbl th.nm{position:sticky;left:0;background:#fff;text-align:left;min-width:92px;z-index:1;cursor:pointer}' +
    '.sa-tbl th.cl,.sa-tbl td.cl{background:#EFEFEF}' +
    '.sa-c{width:100%;min-height:56px;border:1px solid transparent;border-radius:10px;background:transparent;padding:4px 2px;cursor:pointer;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;font:inherit;color:inherit}' +
    '.sa-c:hover{border-color:#BFB4A9}' +
    '.sa-w{font-size:12px;font-weight:700;border-radius:6px;padding:1px 6px}' +
    '.sa-w.ok{border:1.5px solid #3B8F6B;color:#2F5D50}.sa-w.dohan{background:#F3E3B5;color:#6B4710}.sa-w.ng{color:#9B2C2C}.sa-w.maybe{color:#8A5A12;border:1px dashed #8A5A12}' +
    '.sa-p{font-size:12px;font-weight:700;border-radius:6px;padding:2px 6px;white-space:nowrap}' +
    '.sa-warn{color:#9B2C2C;font-size:11px}' +
    '.sa-low{color:#9B2C2C;font-weight:700}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ---------- 部品 ---------- */
  function tm(s) { if (s === 'LAST') return LAST; var m = String(s || '').match(/^(\d{2}):(\d{2})$/); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  function fmtT(s) {
    if (s === 'LAST') return 'LAST';
    var m = String(s || '').match(/^(\d{2}):(\d{2})$/); if (!m) return '';
    var h = +m[1]; if (h > 24) h -= 24;
    return h + ':' + m[2];
  }
  function range(a, b) { return fmtT(a) + '〜' + (b === 'LAST' ? 'LAST' : fmtT(b)); }
  function dLabel(d) { var p = d.split('-'); return (+p[1]) + '/' + (+p[2]); }
  function wLabel(ws) { var e = addD(ws, 6); return dLabel(ws) + '〜' + dLabel(e); }
  function addD(d, n) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function dowOf(d) { return new Date(d + 'T00:00:00Z').getUTCDay(); }
  function colorOf(start) {
    var m = tm(start);
    return m <= OPEN ? '#F3E3B5' : m <= 20 * 60 + 30 ? '#DDE9F0' : m <= 21 * 60 ? '#E3EFEA' : '#EADBDD';
  }
  var STARTS = ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'];
  var ENDS = ['21:00', '22:00', '23:00', '23:30', '24:00', '24:30', '25:00', 'LAST'];
  function opts(list, cur, blank) {
    return (blank ? '<option value="">' + blank + '</option>' : '') + list.map(function (t) { return '<option value="' + t + '"' + (t === cur ? ' selected' : '') + '>' + fmtT(t) + '</option>'; }).join('');
  }

  /* =========================================================
   * スタッフ・店頭用
   * ======================================================= */
  window.shiftScreen = function (main) {
    main.innerHTML = '<div class="loading">読み込み中…</div>';
    call('apiShiftHome', state.token).then(function (h) {
      if (!h) return;
      S.home = h;
      if (!S.ws) S.ws = h.weeks.filter(function (w) { return w.current; })[0].weekStart;
      loadWeek(main);
    }).catch(function (err) { main.innerHTML = failBox(err); });
  };
  function loadWeek(main) {
    call('apiShiftWeek', state.token, S.ws).then(function (w) {
      if (!w) return;
      S.week = w;
      var dates = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addD(S.ws, i); });
      if (!S.date || dates.indexOf(S.date) < 0) S.date = dates.indexOf(w.today) >= 0 ? w.today : dates[1];
      drawShift(main);
    }).catch(function (err) { main.innerHTML = failBox(err); });
  }

  function drawShift(main) {
    var h = S.home, w = S.week;
    var html = '<h1 style="margin:4px 0 0;font-size:22px">シフト</h1>';
    // あなたの次の出勤
    if (h.me) {
      if (h.next) {
        var nd = h.next, dd = nd.date.split('-');
        html += '<section class="sh-next"><span class="l">あなたの次の出勤</span><span class="d">' + (+dd[1]) + '/' + (+dd[2]) + '（' + DOW[dowOf(nd.date)] + '）</span><span class="t">' + esc(range(nd.start, nd.end)) + '</span>' +
          '<span class="s">' + (nd.daysLeft === 0 ? '今日です' : 'あと ' + nd.daysLeft + '日') + '　今週 ' + h.thisWeek + '日</span></section>';
      } else html += '<section class="card"><div class="muted">あなたの次の出勤</div><p style="margin:6px 0 0;font-size:15px;line-height:1.7">公開されているシフトに、あなたの出勤はまだありません。</p></section>';
    }
    // 週の切り替え
    var idx = h.weeks.map(function (x) { return x.weekStart; }).indexOf(S.ws);
    var cur = h.weeks[idx] || { label: wLabel(S.ws), published: w.published };
    html += '<div class="daybar"><button class="icon-btn" id="sw-prev" aria-label="前の週"' + (idx > 0 ? '' : ' disabled') + '>' + ICON.left + '</button>' +
      '<span class="day">' + esc(cur.label || wLabel(S.ws)) + (cur.current ? '（今週）' : '') + '</span>' +
      '<button class="icon-btn" id="sw-next" aria-label="次の週"' + (idx >= 0 && idx < h.weeks.length - 1 ? '' : ' disabled') + '>' + ICON.right + '</button></div>';
    if (!w.published) {
      html += '<div class="card"><p class="muted" style="margin:0;line-height:1.8"><b>この週は準備中です。</b>公開されると、ここに出ます。</p></div>';
      main.innerHTML = html; bindShift(main); return;
    }
    // 表示の切り替え
    html += '<div class="chips"><button class="chip' + (S.view === 'day' ? ' on' : '') + '" data-v="day">日ごと</button>' +
      (h.me ? '<button class="chip' + (S.view === 'mine' ? ' on' : '') + '" data-v="mine">自分のシフト一覧</button>' : '') +
      '<button class="chip' + (S.view === 'week' ? ' on' : '') + '" data-v="week">週の一覧</button></div>';

    if (S.view === 'mine') {
      html += '<section class="card stack"><h2>あなたの出勤（公開済み）</h2>' + (h.mine.length ? h.mine.map(function (m) {
        return '<div class="visit"><div class="nm">' + esc(dayLabel(m.date)) + '</div><div class="amt">' + esc(range(m.start, m.end)) + '</div></div>';
      }).join('') : '<p class="muted" style="margin:0">公開されている出勤はありません。</p>') + '</section>';
    } else if (S.view === 'week') {
      html += w.days.map(function (d) {
        return '<section class="sh-wk"><div class="hd"><b>' + esc(dayLabel(d.date)) + (d.event ? ' <span class="sh-ev">' + esc(d.event) + '</span>' : '') + '</b><span class="tiny">' + (d.closed ? '定休日' : d.members.length + '人') + '</span></div>' +
          (d.closed ? '' : '<div class="mb">' + (d.members.length ? d.members.map(function (m) {
            return '<span class="sh-pill' + (m.staffId === w.meId ? ' me' : '') + '">' + esc(m.name) + '<small>' + esc(fmtT(m.start)) + '〜</small></span>';
          }).join('') : '<span class="tiny">出勤の予定はありません</span>') + '</div>') + '</section>';
      }).join('');
    } else {
      html += '<div class="sh-days" id="sh-days">' + w.days.map(function (d) {
        var mine = h.me && d.members.some(function (m) { return m.staffId === w.meId; });
        var dw = d.dow;
        return '<button class="sh-d' + (d.date === S.date ? ' on' : '') + (d.date === w.today ? ' today' : '') + (d.closed ? ' off' : '') + (dw === 6 ? ' sat' : dw === 0 ? ' sun' : '') + '" data-d="' + d.date + '">' +
          '<span class="w">' + DOW[dw] + '</span><span class="n">' + (+d.date.slice(8)) + '</span><span class="c">' + (d.closed ? '休' : d.members.length + '人') + '</span>' + (mine ? '<span class="me">●</span>' : '') + '</button>';
      }).join('') + '</div>';
      var day = w.days.filter(function (d) { return d.date === S.date; })[0];
      html += '<section class="card stack" id="sh-day"><div class="row"><h2>' + esc(dayLabel(day.date)) + (day.event ? '　<span class="sh-ev">' + esc(day.event) + '</span>' : '') + '</h2><span class="tiny">' + (day.closed ? '定休日' : day.members.length + '人') + '</span></div>';
      if (day.memo) html += '<div class="tiny" style="line-height:1.7">' + esc(day.memo) + '</div>';
      if (day.closed) html += '<p class="muted" style="margin:0">この日は定休日です。</p>';
      else if (!day.members.length) html += '<p class="muted" style="margin:0">この日の出勤の予定は、まだありません。</p>';
      else {
        var ticks = [[OPEN, '19:30'], [21 * 60, '21'], [22 * 60, '22'], [23 * 60, '23'], [24 * 60, '24'], [LAST, '1']];
        html += '<div class="sh-axis"><span></span><div class="ax">' + ticks.map(function (t) { return '<span style="left:' + ((t[0] - OPEN) / SPAN * 100) + '%">' + t[1] + '</span>'; }).join('') + '</div></div>';
        html += day.members.map(function (m) {
          var a = Math.max(OPEN, tm(m.start)), b = Math.min(LAST, tm(m.end));
          return '<div class="sh-row' + (m.staffId === w.meId ? ' me' : '') + '"><span class="nm">' + esc(m.name) + '</span><div class="sh-track">' +
            ticks.slice(1, -1).map(function (t) { return '<i class="sh-grid-line" style="left:' + ((t[0] - OPEN) / SPAN * 100) + '%"></i>'; }).join('') +
            '<div class="sh-seg" style="left:' + ((a - OPEN) / SPAN * 100) + '%;width:' + (Math.max(b - a, 30) / SPAN * 100) + '%">' + esc(range(m.start, m.end)) + '</div></div></div>';
        }).join('');
        html += '<div class="tiny">濃い色があなたです。左右にスワイプすると、前後の日に動きます。</div>';
      }
      html += '</section>';
    }
    main.innerHTML = html; bindShift(main);
  }

  function bindShift(main) {
    var h = S.home;
    var idx = h.weeks.map(function (x) { return x.weekStart; }).indexOf(S.ws);
    var go = function (ws, date) { S.ws = ws; S.date = date || null; loadWeek(main); window.scrollTo(0, 0); };
    var p = $('#sw-prev'), n = $('#sw-next');
    if (p) p.onclick = function () { if (idx > 0) go(h.weeks[idx - 1].weekStart); };
    if (n) n.onclick = function () { if (idx < h.weeks.length - 1) go(h.weeks[idx + 1].weekStart); };
    Array.prototype.forEach.call(main.querySelectorAll('[data-v]'), function (b) { b.onclick = function () { S.view = b.dataset.v; drawShift(main); }; });
    Array.prototype.forEach.call(main.querySelectorAll('[data-d]'), function (b) { b.onclick = function () { S.date = b.dataset.d; drawShift(main); }; });
    // 左右にスワイプして前後の日へ（週をまたぐときは前後の週へ）
    var box = $('#sh-day'), x0 = null, y0 = null;
    if (box) {
      box.ontouchstart = function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; };
      box.ontouchend = function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        var next = addD(S.date, dx < 0 ? 1 : -1), ws2 = weekStart(next);
        if (ws2 === S.ws) { S.date = next; drawShift(main); }
        else {
          var j = h.weeks.map(function (x) { return x.weekStart; }).indexOf(ws2);
          if (j >= 0) go(ws2, next);
        }
      };
    }
  }
  function weekStart(d) { var w = dowOf(d); return addD(d, w === 0 ? -6 : 1 - w); }

  /* =========================================================
   * 管理者
   * ======================================================= */
  window.adminShift = function (main) {
    call('apiAdminShiftWeek', state.token, A.ws).then(function (w) {
      if (!w) return;
      A.ws = w.weekStart; A.week = w;
      drawAdmin(main, w);
    }).catch(function (err) { main.innerHTML = failBox(err); });
  };

  function condText(c) {
    var t = [];
    if (c.maxWeek) t.push('週' + (c.minWeek && c.minWeek !== c.maxWeek ? c.minWeek + '〜' : '') + c.maxWeek);
    if (c.ngDow.length) t.push(c.ngDow.map(function (n) { return DOW[n]; }).join('') + '×');
    if (c.base) t.push(fmtT(c.base) + '〜');
    return t.join('・');
  }

  function drawAdmin(main, w) {
    var cell = {}; w.cells.forEach(function (c) { cell[c.date + '|' + c.staffId] = c; });
    var warnBy = {}; w.warnings.forEach(function (x) { (warnBy[x.staffId] = warnBy[x.staffId] || []).push(x); });
    var month = w.dates[0].slice(0, 7);
    var subBy = {}; w.subs.filter(function (s) { return s.month === month; }).forEach(function (s) { subBy[s.staffId] = s; });
    var unsub = w.staff.filter(function (s) { return !s.retired && !subBy[s.id]; }).map(function (s) { return s.name; });
    var html = '<div class="row" style="flex-wrap:wrap"><h1>シフト</h1><div class="row" style="gap:8px"><button class="btn ghost small" id="sa-cfg">設定</button>' +
      '<button class="btn ghost small" id="sa-bulk">希望をまとめて入れる</button>' +
      '<button class="btn small" id="sa-pub">' + (w.published ? '公開中（押すと非公開に）' : 'この週を公開する') + '</button></div></div>' +
      '<div class="bn-switch" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><button class="icon-btn" id="sa-prev" style="border:1px solid #E0D9D1;background:#fff" aria-label="前の週">' + ICON.left + '</button>' +
      '<div style="font-size:17px;font-weight:700;text-align:center;flex:1">' + esc(wLabel(w.weekStart)) + '　' + (w.published ? '<span class="badge ok">公開中</span>' : '<span class="badge norm">未公開</span>') + '</div>' +
      '<button class="icon-btn" id="sa-next" style="border:1px solid #E0D9D1;background:#fff" aria-label="次の週">' + ICON.right + '</button></div>';
    html += '<div class="msg ' + (unsub.length ? 'warn' : 'ok') + '" style="font-size:13px">' + (month.slice(5).replace(/^0/, '')) + '月分の希望：' + (unsub.length ? '<b>未提出</b> ' + esc(unsub.join('、')) : 'みんな提出済み') + '</div>';
    if (w.warnings.length) html += '<div class="msg err" style="font-size:13px"><b>確認してください</b><br>' + w.warnings.map(function (x) { return esc((x.date ? dLabel(x.date) + ' ' : '') + x.text); }).join('<br>') + '</div>';

    html += '<section class="card"><div class="tbl-wrap" style="max-height:72vh"><table class="sa-tbl"><thead><tr><th class="nm">名前（条件）</th>' + w.dates.map(function (d) {
      var s = w.stats[d], dw = dowOf(d), ev = w.events[d];
      return '<th class="' + (s.closed ? 'cl' : '') + '" data-day="' + d + '" style="cursor:pointer"><div>' + DOW[dw] + ' ' + dLabel(d) + '</div>' +
        (ev && ev.event ? '<div><span class="sh-ev">' + esc(ev.event) + '</span></div>' : '') +
        '<div class="tiny' + (s.low ? ' sa-low' : '') + '">' + (s.closed ? '定休日' : (s.low ? '▲ ' : '') + '出勤' + s.work + '人') + '</div><div class="tiny">○' + s.ok + (s.dohan ? '（同' + s.dohan + '）' : '') + (s.ng ? ' ×' + s.ng : '') + '</div></th>';
    }).join('') + '</tr></thead><tbody>' + w.staff.map(function (s) {
      var sub = subBy[s.id];
      return '<tr><td class="nm" data-staff="' + s.id + '"><b>' + esc(s.name) + '</b>' + (s.retired ? ' <span class="badge off">退職</span>' : '') +
        '<div class="tiny">' + esc(condText(s.cond) || '条件なし') + '</div>' + (sub && sub.memo ? '<div class="tiny">' + esc(sub.memo) + '</div>' : '') +
        ((warnBy[s.id] || []).length ? '<div class="sa-warn">⚠ ' + (warnBy[s.id].length) + '件</div>' : '') + '</td>' +
        w.dates.map(function (d) {
          var c = cell[d + '|' + s.id] || {}, closed = w.stats[d].closed;
          var wish = c.wish ? '<span class="sa-w ' + c.wish + '">' + ({ ok: '○', dohan: '○同', ng: '×', maybe: '△' })[c.wish] + (c.wStart ? ' ' + esc(fmtT(c.wStart)) + '〜' : '') + '</span>' : '';
          var plan = c.plan === 'work' ? '<span class="sa-p" style="background:' + colorOf(c.pStart) + '">' + esc(range(c.pStart, c.pEnd)) + '</span>' : '';
          return '<td class="' + (closed ? 'cl' : '') + '"><button class="sa-c" data-cell="' + d + '|' + s.id + '" aria-label="' + esc(s.name + ' ' + d) + '">' + wish + plan + '</button></td>';
        }).join('') + '</tr>';
    }).join('') + '</tbody></table></div><div class="tiny" style="margin-top:8px;line-height:1.8">マスを押すと、希望（○・○同・×・△）とシフト（時間）を入れられます。名前を押すと、その人の条件（出られない曜日・週の日数など）。日付を押すと、イベント・メモ。色：金＝19:30〜、青＝20:30〜、緑＝21:00〜、赤紫＝22:00〜。</div></section>';
    main.innerHTML = html;

    var go = function (n) { A.ws = addD(w.weekStart, n * 7); adminTab(); };
    $('#sa-prev').onclick = function () { go(-1); };
    $('#sa-next').onclick = function () { go(1); };
    $('#sa-pub').onclick = function () {
      var next = !w.published;
      confirmBox(next ? 'この週を公開する' : '公開をやめる', next ? wLabel(w.weekStart) + ' のシフトを、スタッフと店頭用に公開します。' : 'この週は、スタッフに見えなくなります。', next ? '公開する' : 'やめる').then(function (ok) {
        if (!ok) return;
        call('apiAdminShiftPublish', state.token, w.weekStart, next).then(function () { toast(next ? '公開しました' : '公開をやめました'); adminTab(); }).catch(function (err) { toast(err.message); });
      });
    };
    $('#sa-cfg').onclick = function () { cfgModal(w); };
    $('#sa-bulk').onclick = function () { bulkModal(w, subBy); };
    Array.prototype.forEach.call(main.querySelectorAll('[data-cell]'), function (b) {
      b.onclick = function () { var p = b.dataset.cell.split('|'); cellModal(w, p[0], p[1], cell[b.dataset.cell] || {}); };
    });
    Array.prototype.forEach.call(main.querySelectorAll('[data-staff]'), function (b) { b.onclick = function () { condModal(w, b.dataset.staff); }; });
    Array.prototype.forEach.call(main.querySelectorAll('[data-day]'), function (b) { b.onclick = function () { dayModal(w, b.dataset.day); }; });
  }

  function cellModal(w, date, staffId, c) {
    var s = w.staff.filter(function (x) { return x.id === staffId; })[0];
    var wish = c.wish || '', plan = c.plan === 'work';
    function body() {
      return '<h3>' + esc(s.name) + '　' + esc(dayLabel(date)) + '</h3>' +
        '<div class="sec-t">希望</div><div class="chips">' + [['', 'なし'], ['ok', '○'], ['dohan', '○同'], ['ng', '×'], ['maybe', '△']].map(function (x) { return '<button class="chip' + (wish === x[0] ? ' on' : '') + '" data-m="wish" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        (wish && wish !== 'ng' ? '<div class="row" style="gap:8px"><select class="input" id="ws" style="min-height:44px">' + opts(STARTS, c.wStart, '時間なし') + '</select><span>〜</span><select class="input" id="we" style="min-height:44px">' + opts(ENDS, c.wEnd, '') + '</select></div>' : '') +
        (wish ? '<div class="field"><input class="input" id="wn" placeholder="希望のメモ（任意）" value="' + esc(c.wNote || '') + '"></div>' : '') +
        '<div class="sec-t">シフト</div><div class="chips"><button class="chip' + (!plan ? ' on' : '') + '" data-m="plan" data-v="">休み・未定</button><button class="chip' + (plan ? ' on' : '') + '" data-m="plan" data-v="work">出勤</button></div>' +
        (plan ? '<div class="row" style="gap:8px"><select class="input" id="ps" style="min-height:44px">' + opts(STARTS, c.pStart || '21:00') + '</select><span>〜</span><select class="input" id="pe" style="min-height:44px">' + opts(ENDS, c.pEnd || 'LAST') + '</select></div>' +
          '<div class="field"><input class="input" id="pn" placeholder="シフトのメモ（任意）" value="' + esc(c.pNote || '') + '"></div>' : '') +
        '<div id="cm"></div><div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">保存</button></div>';
    }
    var m = openModal(body());
    function keep() {   // 入力途中の欄を覚えて、描き直しても消えないようにする
      var g = function (id) { var e = m.querySelector('#' + id); return e ? e.value : undefined; };
      c = Object.assign({}, c, { wStart: g('ws') != null ? g('ws') : c.wStart, wEnd: g('we') != null ? g('we') : c.wEnd, wNote: g('wn') != null ? g('wn') : c.wNote, pStart: g('ps') != null ? g('ps') : c.pStart, pEnd: g('pe') != null ? g('pe') : c.pEnd, pNote: g('pn') != null ? g('pn') : c.pNote });
    }
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var a = b.dataset.m;
      if (a === 'close') closeModal();
      else if (a === 'wish') { keep(); wish = b.dataset.v; if (wish === 'dohan' && !c.wStart) c.wStart = '21:00'; m.innerHTML = body(); }
      else if (a === 'plan') { keep(); plan = b.dataset.v === 'work'; m.innerHTML = body(); }
      else if (a === 'ok') {
        keep();
        var patch = { wish: wish, wStart: wish && wish !== 'ng' ? (c.wStart || '') : '', wEnd: wish && wish !== 'ng' ? (c.wStart ? (c.wEnd || 'LAST') : '') : '', wNote: wish ? c.wNote || '' : '', plan: plan ? 'work' : '', pStart: plan ? c.pStart || '21:00' : '', pEnd: plan ? c.pEnd || 'LAST' : '', pNote: plan ? c.pNote || '' : '' };
        call('apiAdminShiftSetCell', state.token, date, staffId, patch).then(function (r) {
          if (!r) return;
          if (!r.ok) { showMsg($('#cm', m), r.error); return; }
          closeModal(); if (r.warnings && r.warnings.length) toast('⚠ ' + r.warnings[0].text); adminTab();
        }).catch(function (err) { showMsg($('#cm', m), err.message); });
      }
    });
  }

  function condModal(w, staffId) {
    var s = w.staff.filter(function (x) { return x.id === staffId; })[0], c = s.cond, ng = c.ngDow.slice();
    function body() {
      return '<h3>' + esc(s.name) + 'さんの条件</h3><p class="muted" style="margin:-8px 0 0;line-height:1.7">シフトの表に表示し、条件に合わない入れ方をしたときに知らせます。</p>' +
        '<div class="sec-t">出られない曜日</div><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map(function (n) { return '<button class="chip' + (ng.indexOf(n) >= 0 ? ' on' : '') + '" data-m="dow" data-v="' + n + '">' + DOW[n] + '</button>'; }).join('') + '</div>' +
        '<div class="row" style="gap:8px;justify-content:flex-start;flex-wrap:wrap"><label class="muted" for="cmin">週の日数</label><select class="input" id="cmin" style="width:auto;min-height:44px">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + (c.minWeek === n ? ' selected' : '') + '>' + (n ? n + '日' : '指定なし') + '</option>'; }).join('') + '</select><span>〜</span>' +
        '<select class="input" id="cmax" style="width:auto;min-height:44px">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + (c.maxWeek === n ? ' selected' : '') + '>' + (n ? n + '日' : '指定なし') + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="cbase">基本の入り時刻</label><select class="input" id="cbase">' + opts(STARTS, c.base, '指定なし') + '</select></div>' +
        '<div class="field"><label for="cnote">メモ（例：×以外OK）</label><input class="input" id="cnote" value="' + esc(c.note) + '"></div><div id="cm"></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">保存</button></div>';
    }
    var m = openModal(body());
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'close') closeModal();
      else if (b.dataset.m === 'dow') {
        c = Object.assign({}, c, { minWeek: +m.querySelector('#cmin').value, maxWeek: +m.querySelector('#cmax').value, base: m.querySelector('#cbase').value, note: m.querySelector('#cnote').value });
        var n = +b.dataset.v, i = ng.indexOf(n); if (i >= 0) ng.splice(i, 1); else ng.push(n); m.innerHTML = body();
      } else if (b.dataset.m === 'ok') {
        call('apiAdminShiftConditions', state.token, staffId, { ngDow: ng, minWeek: +m.querySelector('#cmin').value, maxWeek: +m.querySelector('#cmax').value, base: m.querySelector('#cbase').value, note: m.querySelector('#cnote').value }).then(function (r) {
          if (!r || !r.ok) { showMsg($('#cm', m), (r && r.error) || '保存できませんでした'); return; }
          closeModal(); toast('条件を保存しました'); adminTab();
        }).catch(function (err) { showMsg($('#cm', m), err.message); });
      }
    });
  }

  function dayModal(w, date) {
    var ev = w.events[date] || { event: '', memo: '' };
    var m = openModal('<h3>' + esc(dayLabel(date)) + '</h3><div class="field"><label for="de">イベント（例：誕生日・ハロウィン）</label><input class="input" id="de" value="' + esc(ev.event) + '"></div>' +
      '<div class="field"><label for="dm">メモ</label><input class="input" id="dm" value="' + esc(ev.memo) + '"></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" id="dx">やめる</button><button class="btn small" id="dok">保存</button></div>');
    $('#dx', m).onclick = closeModal;
    $('#dok', m).onclick = function () {
      call('apiAdminShiftDay', state.token, date, $('#de', m).value, $('#dm', m).value).then(function () { closeModal(); toast('保存しました'); adminTab(); }).catch(function (err) { toast(err.message); });
    };
  }

  function cfgModal(w) {
    var closed = w.config.closedDow.slice();
    function body() {
      return '<h3>シフトの設定</h3><div class="sec-t">定休日</div><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map(function (n) { return '<button class="chip' + (closed.indexOf(n) >= 0 ? ' on' : '') + '" data-m="dow" data-v="' + n + '">' + DOW[n] + '</button>'; }).join('') + '</div>' +
        '<div class="field"><label for="cm-min">出勤が この人数より少ない日に「▲」を付ける</label><select class="input" id="cm-min">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '"' + (w.config.min === n ? ' selected' : '') + '>' + n + '人未満</option>'; }).join('') + '</select></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">保存</button></div>';
    }
    var m = openModal(body());
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'close') closeModal();
      else if (b.dataset.m === 'dow') { w.config.min = +m.querySelector('#cm-min').value; var n = +b.dataset.v, i = closed.indexOf(n); if (i >= 0) closed.splice(i, 1); else closed.push(n); m.innerHTML = body(); }
      else if (b.dataset.m === 'ok') {
        call('apiAdminShiftConfig', state.token, { min: +m.querySelector('#cm-min').value, closedDow: closed }).then(function () { closeModal(); toast('保存しました'); adminTab(); }).catch(function (err) { toast(err.message); });
      }
    });
  }

  /** 希望をまとめて入れる。LINEの文章をAIで読み取る機能は、Claude API の準備ができたら、ここから使えるようにする。 */
  function bulkModal(w, subBy) {
    var month = w.dates[0].slice(0, 7);
    var m = openModal('<h3>希望をまとめて入れる</h3>' +
      '<div class="msg warn" style="font-size:13px;line-height:1.7"><b>LINEの文章をAIで読み取る機能は、準備中です。</b>Claude API のアカウントを作ったあと、ここに文章を貼り付けて「読み取る」を押せるようになります。それまでは、表のマスを押して1日ずつ入れてください。</div>' +
      '<div class="field"><label for="bk-s">提出済みの印とメモをつける人</label><select class="input" id="bk-s">' + w.staff.filter(function (s) { return !s.retired; }).map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + (subBy[s.id] ? '（提出済み）' : '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="bk-m">希望のメモ（例：週３〜4日希望）</label><input class="input" id="bk-m" placeholder="任意"></div><div id="cm"></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" id="bk-x">閉じる</button><button class="btn small" id="bk-ok">提出済みにする</button></div>');
    $('#bk-x', m).onclick = closeModal;
    $('#bk-ok', m).onclick = function () {
      call('apiAdminShiftSub', state.token, month, $('#bk-s', m).value, true, $('#bk-m', m).value).then(function (r) {
        if (!r || !r.ok) { showMsg($('#cm', m), (r && r.error) || '保存できませんでした'); return; }
        closeModal(); toast('提出済みにしました'); adminTab();
      }).catch(function (err) { showMsg($('#cm', m), err.message); });
    };
  }
})();
