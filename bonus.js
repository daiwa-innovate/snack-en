/* =========================================================
 * 歩合の画面
 *   スタッフ：本人の分だけ（合計・内訳・日ごとの「どのお客様の分か」）
 *   管理者　：全員分（日付×スタッフ。今の歩合シートと同じ形）
 * ======================================================= */
(function () {
  var B = { period: null, adminPeriod: null, adminAll: false };

  var CSS = '' +
    '.bn-switch{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.bn-switch .lb{font-size:17px;font-weight:700;text-align:center;flex:1}' +
    '.bn-switch .icon-btn{border:1px solid #E0D9D1;background:#fff}' +
    '.bn-switch .icon-btn:disabled{opacity:.35}' +
    '.bn-total{font-size:44px;font-weight:700;color:var(--accent);line-height:1.15}' +
    '.bn-day{background:#fff;border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}' +
    '.bn-day .hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px}' +
    '.bn-day .hd b{font-size:17px}.bn-day .hd span{font-size:17px;font-weight:700}' +
    '.bn-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line2);font-size:15px}' +
    '.bn-item .k{flex-shrink:0;border-radius:8px;padding:3px 9px;font-size:12px;font-weight:700;background:#EFEAE4}' +
    '.bn-item .k.m{background:#EADBDD;color:var(--accent-dark)}.bn-item .k.d{background:#DDE9F0;color:#1F4A63}.bn-item .k.h{background:#F3E3B5;color:#6B4710}' +
    '.bn-item .c{flex:1;min-width:0;word-break:break-word}' +
    '.bn-item .a{font-weight:700;flex-shrink:0}' +
    '.bn-grid th,.bn-grid td{vertical-align:top;white-space:normal;min-width:96px}' +
    '.bn-grid td small,.bn-grid th small{display:block;color:var(--sub);font-size:11px;font-weight:400;line-height:1.5;margin-top:1px}' +
    '.bn-grid tr.tot td{font-weight:700;background:var(--chip);position:sticky;bottom:0}' +
    '.bn-grid td.dt,.bn-grid th.dt{position:sticky;left:0;background:#fff;min-width:64px;z-index:1}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function periodSwitch(periods, cur, attr) {
    var i = periods.map(function (p) { return p.key; }).indexOf(cur.key);
    return '<div class="bn-switch"><button class="icon-btn" ' + attr + '="' + (periods[i + 1] ? periods[i + 1].key : '') + '"' + (periods[i + 1] ? '' : ' disabled') + ' aria-label="前の期間">' + ICON.left + '</button>' +
      '<div class="lb">' + esc(cur.label) + '<div class="tiny" style="font-weight:400">' + (i === 0 ? '今の期間' : '締め期間') + '</div></div>' +
      '<button class="icon-btn" ' + attr + '="' + (i > 0 ? periods[i - 1].key : '') + '"' + (i > 0 ? '' : ' disabled') + ' aria-label="次の期間">' + ICON.right + '</button></div>';
  }
  function kindClass(k) { return k === '動員' ? 'm' : k === 'ドリンク' ? 'd' : 'h'; }
  function kindLabel(k) { return k === '動員' ? '動員・同伴' : k; }

  /* ---------- スタッフ本人 ---------- */
  window.bonusScreen = function (main) {
    main.innerHTML = '<div class="loading">読み込み中…</div>';
    call('apiBonusMine', state.token, B.period).then(function (d) {
      if (!d) return;
      if (!d.ok) {
        main.innerHTML = '<h1 style="margin:4px 0 0;font-size:22px">歩合</h1><div class="card"><p class="muted" style="margin:0;line-height:1.8">' + esc(d.error) + '</p></div>';
        return;
      }
      B.period = d.period.key;
      var t = d.totals;
      var h = '<h1 style="margin:4px 0 0;font-size:22px">歩合</h1>' + periodSwitch(d.periods, d.period, 'data-p') +
        '<section class="card"><div class="muted">' + esc(d.staff.name) + ' さんの歩合（' + esc(d.period.label) + '）</div><div class="bn-total">' + yen(t.total) + '</div>' +
        '<div class="tiny" style="margin-top:2px">会計のあと、すぐに反映されます。</div>' +
        '<div class="tiles"><div class="tile"><span>動員・同伴</span><span>' + yen(t['動員']) + '</span></div><div class="tile"><span>ドリンク</span><span>' + yen(t['ドリンク']) + '</span></div><div class="tile"><span>同伴料</span><span>' + yen(t['同伴料']) + '</span></div></div>' +
        '<div class="tiny" style="margin-top:10px;line-height:1.7">あなたの割合：動員・同伴 ' + Math.round(d.staff.rateMob * 1000) / 10 + '％（2人なら折半）・ドリンク ' + Math.round(d.staff.rateDrink * 1000) / 10 + '％</div></section>';
      if (!d.days.length) h += '<div class="card"><p class="muted" style="margin:0;line-height:1.8">この期間の歩合は、まだありません。</p></div>';
      d.days.forEach(function (day) {
        h += '<section class="bn-day"><div class="hd"><b>' + esc(dayLabel(day.date)) + (day.date === d.today ? ' <span class="badge ok" style="font-size:11px">今日</span>' : '') + '</b><span>' + yen(day.total) + '</span></div>' +
          day.items.map(function (i) {
            return '<div class="bn-item"><span class="k ' + kindClass(i.kind) + '">' + esc(kindLabel(i.kind)) + '</span><span class="c">' + esc(i.customer) + '</span><span class="a">' + yen(i.amount) + '</span></div>';
          }).join('') + '</section>';
      });
      main.innerHTML = h;
      Array.prototype.forEach.call(main.querySelectorAll('[data-p]'), function (b) {
        b.onclick = function () { if (!b.dataset.p) return; B.period = b.dataset.p; bonusScreen(main); window.scrollTo(0, 0); };
      });
    }).catch(function (err) { main.innerHTML = failBox(err); });
  };

  /* ---------- 管理者：全員分 ---------- */
  window.adminBonus = function (main) {
    call('apiAdminBonus', state.token, B.adminPeriod).then(function (d) {
      if (!d) return;
      B.adminPeriod = d.period.key;
      var byCell = {};
      d.cells.forEach(function (c) { byCell[c.date + '|' + c.staffId] = c; });
      var dayHas = {};
      d.cells.forEach(function (c) { dayHas[c.date] = true; });
      var dates = d.dates.filter(function (x) { return B.adminAll || dayHas[x]; });
      var h = '<div class="row" style="flex-wrap:wrap"><h1>歩合</h1></div>' + periodSwitch(d.periods, d.period, 'data-ap') +
        '<p class="muted" style="margin:0;line-height:1.7">今の歩合シートと同じ形（日付×スタッフ）です。金額の下は、どのお客様の分か。割合・時給は「マスタ設定 → スタッフ」で人ごとに変えられます（会計のときの割合が、その伝票に残ります）。</p>' +
        '<label class="check"><input type="checkbox" id="bn-all"' + (B.adminAll ? ' checked' : '') + '>歩合のない日も表示する</label>';
      if (!d.cells.length) h += '<div class="card"><p class="muted" style="margin:0">この期間の歩合は、まだありません。</p></div>';
      else {
        h += '<section class="card"><div class="tbl-wrap" style="max-height:70vh"><table class="tbl bn-grid" style="min-width:' + (110 + d.staff.length * 110) + 'px"><thead><tr><th class="dt">日付</th>' +
          d.staff.map(function (s) { return '<th>' + esc(s.name) + (s.retired ? '<small>退職</small>' : '') + '<small>動員' + Math.round(s.rateMob * 1000) / 10 + '％・ド' + Math.round(s.rateDrink * 1000) / 10 + '％</small></th>'; }).join('') + '</tr></thead><tbody>' +
          dates.map(function (dt) {
            return '<tr><td class="dt"><b>' + esc(dayLabel(dt)) + '</b></td>' + d.staff.map(function (s) {
              var c = byCell[dt + '|' + s.id];
              if (!c) return '<td></td>';
              var x = '';
              if (c.mob) x += '<div><b>' + yen(c.mob) + '</b><small>' + esc(c.mobCust.join('、')) + '</small></div>';
              if (c.drink) x += '<div style="margin-top:4px"><span class="badge" style="background:#DDE9F0;color:#1F4A63">ドリンク</span> <b>' + yen(c.drink) + '</b><small>' + esc(c.drinkCust.join('、')) + '</small></div>';
              if (c.dohan) x += '<div style="margin-top:4px"><span class="badge" style="background:#F3E3B5;color:#6B4710">同伴料</span> <b>' + yen(c.dohan) + '</b></div>';
              return '<td>' + x + '</td>';
            }).join('') + '</tr>';
          }).join('') +
          '<tr class="tot"><td class="dt">合計</td>' + d.staff.map(function (s) {
            var t = d.totals[s.id];
            return '<td>' + (t ? yen(t.total) + '<small>動員 ' + yen(t.mob) + '・ド ' + yen(t.drink) + (t.dohan ? '・同伴料 ' + yen(t.dohan) : '') + '</small>' : '') + '</td>';
          }).join('') + '</tr></tbody></table></div></section>';
        var all = 0; Object.keys(d.totals).forEach(function (k) { all += d.totals[k].total; });
        h += '<div class="kpis">' + kpi('この期間の歩合の合計', yen(all), '全員分') + '</div>';
      }
      main.innerHTML = h;
      Array.prototype.forEach.call(main.querySelectorAll('[data-ap]'), function (b) {
        b.onclick = function () { if (!b.dataset.ap) return; B.adminPeriod = b.dataset.ap; adminTab(); };
      });
      var all2 = $('#bn-all'); if (all2) all2.onchange = function () { B.adminAll = this.checked; adminTab(); };
    }).catch(function (err) { main.innerHTML = failBox(err); });
  };
})();
