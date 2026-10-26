/* =========================================================
 * 管理者：伝票・売上／マスタ設定／端末登録
 * ======================================================= */
(function () {
  function yn(b) { return b ? '○' : ''; }
  function ysign2(n) { return (n < 0 ? '−' : '') + yen(Math.abs(n)); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(ms) { var d = new Date(ms + 9 * 3600000); return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()); }
  function todayKey() { var d = new Date(Date.now() - 6 * 3600000 + 9 * 3600000); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function chipRow(items, cur, attr) {
    return '<div class="chips">' + items.map(function (x) { return '<button class="chip' + (cur === x[0] ? ' on' : '') + '" data-' + attr + '="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
  }
  function bindChips(main, attr, fn) {
    Array.prototype.forEach.call(main.querySelectorAll('[data-' + attr + ']'), function (b) { b.onclick = function () { fn(b.dataset[attr]); }; });
  }

  /* =========================================================
   * 伝票・売上
   * ======================================================= */
  var P = { sub: 'today', date: null };
  window.adminPos = function (main) {
    loadStaffNames();
    var subs = [['today', '今日・履歴'], ['credit', '未収'], ['log', '取り消し・値引きの履歴']];
    var head = '<h1>伝票・売上</h1>' + chipRow(subs, P.sub, 'sub');
    var go = function (fn) { fn(function (h, after) { main.innerHTML = head + h; bindChips(main, 'sub', function (s) { P.sub = s; adminTab(); }); if (after) after(); }); };
    if (P.sub === 'credit') go(viewCredit);
    else if (P.sub === 'log') go(viewLog);
    else go(viewToday);
  };

  function viewToday(done) {
    var date = P.date || todayKey();
    Promise.all([call('apiAdminPosToday', state.token), call('apiAdminTickets', state.token, date), call('apiAdminSettings', state.token)]).then(function (res) {
      var t = res[0], hist = res[1], st = res[2];
      if (!t || !hist) return;
      var d = hist.day;
      var h = '<section class="card stack"><h2>伝票の使用開始日</h2>' +
        '<p class="muted" style="margin:0;line-height:1.7">この日以降は、売上のもとデータが「売上管理.xlsx」から「このアプリの伝票」に切り替わります。空欄の間は、これまでどおり売上管理.xlsx です。紙の伝票と並行して試すあいだは、空欄のままにしてください。</p>' +
        '<div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><input class="input" id="ps" type="date" value="' + esc(st.posStartDate || '') + '" style="width:auto;min-height:48px" aria-label="伝票の使用開始日">' +
        '<button class="btn small" id="ps-save">保存</button>' + (st.posStartDate ? '<button class="btn ghost small" id="ps-clear">空欄に戻す</button>' : '') + '</div>' +
        '<div class="tiny">' + (st.posStartDate ? esc(st.posStartDate) + ' から伝票が元データです。' : '今は売上管理.xlsx が元データです。') + '</div><div id="ps-m"></div></section>';
      h += '<div class="row" style="justify-content:flex-start;gap:10px;flex-wrap:wrap"><label for="hd" class="muted">日付</label>' +
        '<input class="input" id="hd" type="date" value="' + esc(date) + '" style="width:auto;min-height:44px"><span class="tiny">営業日（朝6時までは前日）</span></div>';
      h += '<div class="kpis">' + kpi('売上（税込）', yen(d.total), d.groups + '組・' + d.visits + '名') + kpi('現金', yen(d.cash), '') + kpi('カード等', yen(d.card), '手数料 ' + yen(d.fee)) +
        kpi('未収', yen(d.credit), '全体の未回収 ' + yen(t.unpaidTotal) + '（' + t.unpaidCredits + '件）') + '</div>';
      if (d.open) h += '<div class="msg warn">開いたままの伝票が ' + d.open + ' 枚あります（合計 ' + yen(d.openTotal) + '）。会計して閉じてください。</div>';
      h += '<section class="card stack"><h2>伝票の一覧</h2>' + (hist.tickets.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>入店</th><th>お客様</th><th class="r">人数</th><th>システム</th><th class="r">合計</th><th>支払い</th><th>状態</th></tr></thead><tbody>' +
        hist.tickets.map(function (x) {
          return '<tr data-id="' + esc(x.id) + '" style="cursor:pointer"><td>' + hhmm(x.openedAt) + '</td><td>' + esc(x.name || '新規') + '</td><td class="r">' + x.people + '</td><td>' + esc(x.sysName) + '</td><td class="r"><b>' + yen(x.total) + '</b></td>' +
            '<td>' + esc(x.pays.map(function (p) { return p.name + ' ' + num(p.amount); }).join('・') + (x.credit ? ' 未収 ' + num(x.credit) : '')) + '</td>' +
            '<td>' + (x.status === 'open' ? '<span class="badge norm">開いている</span>' : x.status === 'void' ? '<span class="badge off">取消</span>' : '<span class="badge ok">会計済み</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div><div class="tiny">行を押すと、明細を見られます。</div>' : '<p class="muted" style="margin:0">この日の伝票はありません。</p>') + '</section>';
      done(h, function () {
        $('#hd').onchange = function () { P.date = this.value || null; adminTab(); };
        var save = function (v) {
          call('apiAdminSaveSettings', state.token, { posStartDate: v }).then(function (r) {
            if (!r || !r.ok) { showMsg($('#ps-m'), (r && r.error) || '保存できませんでした'); return; }
            toast(v ? '伝票の使用開始日を保存しました' : '空欄に戻しました'); adminTab();
          }).catch(function (err) { showMsg($('#ps-m'), err.message); });
        };
        $('#ps-save').onclick = function () { var v = $('#ps').value; if (!v) { toast('日付を選んでください'); return; } confirmBox('伝票の使用開始日', v + ' 以降の売上を、伝票から集計します。よろしいですか？（あとで空欄に戻せます）', '保存する').then(function (ok) { if (ok) save(v); }); };
        var clr = $('#ps-clear'); if (clr) clr.onclick = function () { save(''); };
        Array.prototype.forEach.call(document.querySelectorAll('tr[data-id]'), function (tr) { tr.onclick = function () { ticketDetail(tr.dataset.id); }; });
      });
    }).catch(function (err) { done(failBox(err)); });
  }

  function ticketDetail(id) {
    call('apiPosTicket', state.token, id).then(function (r) {
      if (!r || !r.ok) { toast((r && r.error) || '開けませんでした'); return; }
      var t = r.ticket;
      var h = '<h3>' + esc(t.name || '新規') + '　' + t.people + '名</h3><div class="tiny" style="margin-top:-8px">' + esc(t.date) + ' ' + hhmm(t.openedAt) + ' 入店' + (t.sys ? '　' + esc(t.sys.name) : '') + '　' +
        (t.status === 'open' ? '開いている' : t.status === 'closed' ? '会計済み（' + esc(t.closedBy || '') + '）' : '取消') + (t.seat ? '　席：' + esc(t.seat) : '') + '</div>';
      if (t.sys) h += '<div class="visit"><div class="nm">' + esc(t.sys.name) + '<small>' + yen(t.sys.price) + ' × ' + t.people + '</small></div><div class="amt">' + yen(t.sysTotal) + '</div></div>';
      t.exts.forEach(function (e) { h += '<div class="visit" style="' + (e.void ? 'opacity:.5;text-decoration:line-through' : '') + '"><div class="nm">延長 ' + e.min + '分</div><div class="amt">' + yen(e.price) + '/人</div></div>'; });
      t.lines.forEach(function (l) {
        h += '<div class="visit" style="' + (l.void ? 'opacity:.5;text-decoration:line-through' : '') + '"><div class="nm">' + esc(l.name) + '<small>×' + l.qty + (l.castFor ? '・' + esc(staffLabel(l.castFor)) + 'のドリンク' : '') + (l.mtype ? '・' + esc(l.mtype) : '') + '</small></div><div class="amt">' + yen(l.price * l.qty) + '</div></div>';
      });
      t.discounts.forEach(function (d) { h += '<div class="visit" style="' + (d.void ? 'opacity:.5;text-decoration:line-through' : '') + '"><div class="nm">値引き<small>' + esc(d.note || '') + '</small></div><div class="amt">−' + yen(d.amount) + '</div></div>'; });
      h += '<div class="row"><b>合計</b><b style="font-size:22px">' + yen(t.total) + '</b></div>';
      if (t.pays && t.pays.length) h += '<div class="tiny">' + t.pays.map(function (p) { return esc(p.name) + ' ' + yen(p.amount) + (p.fee ? '（手数料 ' + yen(p.fee) + '）' : ''); }).join('　') + (t.credit ? '　未収 ' + yen(t.credit.amount) : '') + '</div>';
      if (t.log && t.log.length) h += '<div class="sec-t">取り消し・値引きの履歴</div>' + t.log.map(function (l) { return '<div class="tiny">' + hhmm(l.at) + ' ' + esc(l.by) + '：' + esc(l.kind) + ' ' + esc(l.detail) + ' ' + yen(l.amount) + '</div>'; }).join('');
      h += '<div class="acts" style="margin-top:6px">' + (t.status === 'closed' ? '<button class="btn ghost small" data-m="reopen">会計を取り消して開き直す</button>' : '') +
        (t.status !== 'void' ? '<button class="btn danger small" data-m="void">伝票を取り消す</button>' : '') + '<button class="btn small" data-m="close">閉じる</button></div>';
      var m = openModal(h);
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        var a = b.dataset.m;
        if (a === 'close') closeModal();
        else if (a === 'reopen' || a === 'void') {
          confirmBox(a === 'reopen' ? '会計を取り消す' : '伝票を取り消す', a === 'reopen' ? '会計を取り消して、修正できる状態に戻します。その日の売上と顧客の来店履歴も戻ります。' : 'この伝票を取り消します。その日の売上から外れます。', 'はい').then(function (ok) {
            if (!ok) return;
            call(a === 'reopen' ? 'apiPosReopen' : 'apiPosVoid', state.token, id, '管理者による取り消し').then(function (x) {
              if (!x || !x.ok) { toast((x && x.error) || 'できませんでした'); return; }
              closeModal(); toast('取り消しました'); adminTab();
            }).catch(function (err) { toast(err.message); });
          });
        }
      });
    }).catch(function (err) { toast(err.message); });
  }
  var staffNames = {};
  function staffLabel(id) { return staffNames[id] || id; }
  // スタッフ名の対応表（取り消し・明細の表示用）
  function loadStaffNames() {
    if (Object.keys(staffNames).length) return;
    call('apiAdminMasterGet', state.token, 'staff').then(function (r) { if (r && r.ok) r.rows.forEach(function (s) { staffNames[s.id] = s.name; }); }).catch(function () {});
  }

  function viewCredit(done) {
    call('apiAdminCredits', state.token).then(function (r) {
      if (!r) return;
      var open = r.credits.filter(function (c) { return !c.paidMethod; }), paid = r.credits.filter(function (c) { return c.paidMethod; });
      var h = '<section class="card stack"><h2>未収（ツケ）の一覧</h2><p class="muted" style="margin:0">未回収：<b>' + yen(open.reduce(function (a, c) { return a + c.amount; }, 0)) + '</b>（' + open.length + '件）</p>' +
        (open.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>日付</th><th>お客様</th><th class="r">金額</th><th></th></tr></thead><tbody>' + open.map(function (c) {
          return '<tr><td>' + esc(c.date) + '</td><td>' + esc(c.name) + '</td><td class="r"><b>' + yen(c.amount) + '</b></td><td class="r"><button class="btn ghost small" data-pay="' + esc(c.id) + '">回収した</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted" style="margin:0">未回収の未収はありません。</p>') + '</section>';
      if (paid.length) h += '<section class="card stack"><h2>回収済み</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>日付</th><th>お客様</th><th class="r">金額</th><th>回収日</th><th>方法</th></tr></thead><tbody>' +
        paid.slice(0, 100).map(function (c) { return '<tr><td>' + esc(c.date) + '</td><td>' + esc(c.name) + '</td><td class="r">' + yen(c.amount) + '</td><td>' + esc(c.paidAt) + '</td><td>' + esc(c.paidMethod) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
      done(h, function () {
        Array.prototype.forEach.call(document.querySelectorAll('[data-pay]'), function (b) {
          b.onclick = function () {
            var m = openModal('<h3>回収を記録</h3><div class="field"><label for="cp-d">回収した日</label><input class="input" id="cp-d" type="date" value="' + todayKey() + '"></div>' +
              '<div class="field"><label for="cp-m">方法</label><select class="input" id="cp-m"><option>現金</option><option>振込</option><option>カード</option><option>その他</option></select></div>' +
              '<div class="field"><label for="cp-n">メモ（任意）</label><input class="input" id="cp-n"></div>' +
              '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" id="cp-x">やめる</button><button class="btn small" id="cp-ok">記録する</button></div>');
            $('#cp-x', m).onclick = closeModal;
            $('#cp-ok', m).onclick = function () {
              call('apiAdminCreditPaid', state.token, b.dataset.pay, $('#cp-d', m).value, $('#cp-m', m).value, $('#cp-n', m).value).then(function (x) {
                if (!x || !x.ok) { toast((x && x.error) || '記録できませんでした'); return; }
                closeModal(); toast('記録しました'); adminTab();
              }).catch(function (err) { toast(err.message); });
            };
          };
        });
      });
    }).catch(function (err) { done(failBox(err)); });
  }

  function viewLog(done) {
    call('apiAdminVoidLog', state.token).then(function (r) {
      if (!r) return;
      var h = '<section class="card stack"><h2>取り消し・値引きの履歴</h2><p class="muted" style="margin:0;line-height:1.7">だれが・いつ・何を取り消した／値引いたかの記録です。スタッフには見えません（直近500件）。</p>' +
        (r.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>日時</th><th>営業日</th><th>操作した人</th><th>種類</th><th>内容</th><th class="r">金額</th></tr></thead><tbody>' +
          r.rows.map(function (x) { return '<tr><td>' + esc(x.at.slice(5, 16)) + '</td><td>' + esc(x.date.slice(5)) + '</td><td>' + esc(x.by) + '</td><td><span class="badge norm">' + esc(x.kind) + '</span></td><td style="white-space:normal">' + esc(x.detail) + '</td><td class="r">' + yen(x.amount) + '</td></tr>'; }).join('') +
          '</tbody></table></div>' : '<p class="muted" style="margin:0">まだ記録はありません。</p>') + '</section>';
      done(h);
    }).catch(function (err) { done(failBox(err)); });
  }

  /* =========================================================
   * マスタ設定
   * ======================================================= */
  var TABNAMES = ['セット・延長', 'ショット', 'ボトル（焼酎・ウイスキー）', 'シャンパン・ワイン', 'ビール', '割物・その他'];
  var DEFS = {
    menu: {
      label: 'メニュー', note: '価格は税込です。「〜」は伝票で金額を直せる品目、「※」は、資料の並びから読み取った価格や、スタッフが伝票の画面から「その他」で登録した銘柄です。内容を確認したら、チェックを外してください。「キープ」はボトルを注文すると顧客のキープに入る品目、「キャスト」はキャストドリンクとして出る品目です。仕入値は管理者だけが見えます（任意）。',
      cols: [['tab', '分類', 'sel', TABNAMES], ['cat', '小分類', 'text'], ['name', '品名', 'text', 160], ['price', '価格', 'num'], ['cost', '仕入値', 'num'], ['bottle', 'キープ', 'bool'], ['adjustable', '〜', 'bool'], ['castable', 'キャスト', 'bool'], ['check', '※', 'bool'], ['active', '使う', 'bool'], ['sort', '順', 'num']],
      blank: { tab: 'ショット', cat: '', name: '', price: 0, cost: '', bottle: false, adjustable: false, castable: false, check: false, active: true, sort: 999 }
    },
    systems: {
      label: '料金システム', note: '料金は1人あたり・税込です。時間が0分のシステムは時間無制限（時間のお知らせなし）。延長は2種類まで。',
      cols: [['code', '記号', 'text'], ['name', '名前', 'text', 120], ['price', '料金', 'num'], ['minutes', '時間（分）', 'num'], ['ext1Min', '延長1（分）', 'num'], ['ext1Price', '延長1の料金', 'num'], ['ext2Min', '延長2（分）', 'num'], ['ext2Price', '延長2の料金', 'num'], ['note', '説明', 'text', 220], ['active', '使う', 'bool'], ['sort', '順', 'num']],
      blank: { code: '', name: '', price: 0, minutes: 0, ext1Min: 0, ext1Price: 0, ext2Min: 0, ext2Price: 0, note: '', active: true, sort: 99 }
    },
    campaigns: {
      label: 'キャンペーン料金', note: '期間内だけ、伝票の料金システムの選択肢に出ます。終了日を過ぎると自動で消えます（早割は火〜木の21時までが対象ですが、選ぶのはスタッフです）。',
      cols: [['systemId', '対象のシステム', 'system'], ['name', '名前', 'text'], ['price', '料金', 'num'], ['from', '開始日', 'date'], ['to', '終了日', 'date'], ['note', '説明', 'text', 220], ['active', '使う', 'bool']],
      blank: { systemId: 'A', name: '', price: 0, from: '', to: '', note: '', active: true }
    },
    paymethods: {
      label: '支払い方法', note: '手数料率は、売上管理.xlsx の手数料一覧のとおりです。変わったらここで直してください（%で入力）。「現金」は消せません。',
      cols: [['name', '名前', 'text'], ['rate', '手数料率（%）', 'pct'], ['active', '使う', 'bool'], ['sort', '順', 'num']],
      blank: { name: '', rate: 0, active: true, sort: 99 }
    },
    staff: {
      label: 'スタッフ', note: '歩合の割合（動員・ドリンク）と時給は、ここで人ごとに設定します（%で入力）。辞めた人は削除せず「退職」にチェックしてください（過去の伝票と歩合に使うため）。「ログインID」は、その人のアカウント（スタッフ管理で作ったID）を結びつけます。',
      cols: [['name', '名前', 'text'], ['alias', '別名（過去の表記）', 'text'], ['loginId', 'ログインID', 'text'], ['kind', '区分', 'sel', ['キャスト', 'チーママ', '元ママ', 'その他']], ['wage', '時給', 'num'], ['rateMob', '動員・同伴（%）', 'pct'], ['rateDrink', 'ドリンク（%）', 'pct'], ['active', '在籍', 'bool'], ['retired', '退職', 'bool'], ['sort', '順', 'num']],
      blank: { name: '', alias: '', loginId: '', kind: 'キャスト', wage: 0, rateMob: 0.1, rateDrink: 0.1, active: true, retired: false, sort: 99 }
    }
  };
  var M = { sub: 'menu' };
  window.adminMaster = function (main) {
    var subs = [['menu', 'メニュー'], ['systems', '料金システム'], ['campaigns', 'キャンペーン'], ['paymethods', '支払い方法'], ['staff', 'スタッフ'], ['devices', '店頭用の端末']];
    var head = '<h1>マスタ設定</h1>' + chipRow(subs, M.sub, 'sub');
    var after = function (h, fn) { main.innerHTML = head + h; bindChips(main, 'sub', function (s) { M.sub = s; adminTab(); }); if (fn) fn(); };
    if (M.sub === 'devices') { viewDevices(after); return; }
    editor(M.sub, after);
  };

  function editor(kind, after) {
    var def = DEFS[kind];
    call('apiAdminMasterGet', state.token, kind).then(function (r) {
      if (!r) return;
      if (!r.ok) { after('<div class="msg err">' + esc(r.error) + '</div>'); return; }
      var rows = r.rows;
      var systems = [];
      var go = function () {
        var h = '<section class="card stack"><h2>' + esc(def.label) + '</h2><p class="muted" style="margin:0;line-height:1.7">' + esc(def.note) + '</p>' +
          '<div class="tbl-wrap"><table class="tbl" style="min-width:' + (def.cols.length * 96) + 'px"><thead><tr>' + def.cols.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '<th></th></tr></thead><tbody id="ed-body"></tbody></table></div>' +
          '<div class="row" style="justify-content:flex-start;gap:10px"><button class="btn ghost small" id="ed-add">＋ 行を追加</button><button class="btn small" id="ed-save">保存する</button></div><div id="ed-m"></div></section>';
        after(h, function () { drawRows(); $('#ed-add').onclick = function () { rows.push(Object.assign({ id: '' }, def.blank)); drawRows(); var last = document.querySelector('#ed-body tr:last-child input'); if (last) last.focus(); }; $('#ed-save').onclick = save; });
      };
      function cell(c, row, i) {
        var k = c[0], v = row[k], t = c[2];
        var common = ' data-i="' + i + '" data-k="' + k + '" aria-label="' + esc(c[1]) + '"';
        if (t === 'bool') return '<input type="checkbox"' + common + (v ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--accent)">';
        if (t === 'sel') return '<select class="input"' + common + ' style="min-height:40px;padding:0 8px">' + c[3].map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
        if (t === 'system') return '<select class="input"' + common + ' style="min-height:40px;padding:0 8px">' + systems.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === v ? ' selected' : '') + '>' + esc(s.code + '. ' + s.name) + '</option>'; }).join('') + '</select>';
        if (t === 'date') return '<input class="input"' + common + ' type="date" value="' + esc(v || '') + '" style="min-height:40px;width:150px">';
        if (t === 'pct') return '<input class="input"' + common + ' type="number" step="0.001" value="' + (v === '' || v == null ? '' : Math.round(v * 100000) / 1000) + '" style="min-height:40px;width:90px">';
        if (t === 'num') return '<input class="input"' + common + ' type="number" value="' + (v === '' || v == null ? '' : v) + '" style="min-height:40px;width:' + (k === 'sort' ? 64 : 96) + 'px">';
        return '<input class="input"' + common + ' value="' + esc(v == null ? '' : v) + '" style="min-height:40px;width:' + (c[3] || 110) + 'px">';
      }
      function drawRows() {
        var body = $('#ed-body');
        body.innerHTML = rows.map(function (row, i) {
          return '<tr' + (row.check ? ' style="background:#FBF6E8"' : '') + '>' + def.cols.map(function (c) { return '<td>' + cell(c, row, i) + '</td>'; }).join('') +
            '<td>' + ((kind === 'staff' || row.id === 'cash') ? '' : '<button class="icon-btn" data-del="' + i + '" aria-label="この行を消す">✕</button>') + '</td></tr>';
        }).join('');
        body.oninput = body.onchange = function (e) {
          var el = e.target.closest('[data-k]'); if (!el) return;
          var c = def.cols.filter(function (x) { return x[0] === el.dataset.k; })[0], row = rows[Number(el.dataset.i)];
          if (c[2] === 'bool') row[c[0]] = el.checked;
          else if (c[2] === 'num') row[c[0]] = el.value === '' ? '' : Number(el.value);
          else if (c[2] === 'pct') row[c[0]] = el.value === '' ? 0 : Number(el.value) / 100;
          else row[c[0]] = el.value;
        };
        body.onclick = function (e) {
          var b = e.target.closest('[data-del]'); if (!b) return;
          rows.splice(Number(b.dataset.del), 1); drawRows();
        };
      }
      function save() {
        var btn = $('#ed-save'); busy(btn, true, '保存中…');
        call('apiAdminMasterSave', state.token, kind, rows).then(function (x) {
          busy(btn, false);
          if (!x) return;
          if (!x.ok) { showMsg($('#ed-m'), x.error); return; }
          rows = x.rows; drawRows(); toast('保存しました（伝票の画面にすぐ反映されます）'); showMsg($('#ed-m'), '');
        }).catch(function (err) { busy(btn, false); showMsg($('#ed-m'), err.message); });
      }
      if (kind === 'campaigns') call('apiAdminMasterGet', state.token, 'systems').then(function (s) { systems = s.rows; go(); }); else go();
    }).catch(function (err) { after(failBox(err)); });
  }

  function viewDevices(after) {
    Promise.all([call('apiAdminDevices', state.token), call('apiAdminUsers', state.token)]).then(function (res) {
      var devs = res[0], users = res[1];
      if (!devs || !users) return;
      var stores = users.filter(function (u) { return u.role === 'store'; });
      var h = '<section class="card stack"><h2>店頭用の端末</h2><p class="muted" style="margin:0;line-height:1.8">店頭用アカウント（スタッフ管理で、権限を「店頭用」にして作ります）は、ここに登録した端末でしかログインできません。新しい端末を使うときは、「登録コードを作る」を押し、その端末のログイン画面に出る「端末の登録コード」欄にコードを入れてもらいます（10分間・1回だけ有効）。</p>';
      if (!stores.length) h += '<div class="msg warn">店頭用のアカウントがまだありません。「スタッフ管理」→「アカウントを作る」で、権限を「店頭用」にして作ってください。</div>';
      stores.forEach(function (u) {
        h += '<div class="row" style="flex-wrap:wrap"><div><b>' + esc(u.name) + '</b> <span class="tiny">ID：' + esc(u.loginId) + '</span></div><button class="btn small" data-code="' + esc(u.loginId) + '">登録コードを作る</button></div>';
      });
      h += '</section><section class="card stack"><h2>登録済みの端末（' + devs.length + '）</h2>' + (devs.length ? devs.map(function (d) {
        return '<div class="user"><div><div style="font-weight:700">' + esc(d.label) + '</div><div class="tiny">アカウント：' + esc(d.loginId) + '　登録：' + esc(d.registeredAt) + '</div></div><div class="acts"><button class="btn danger small" data-rel="' + esc(d.deviceId) + '">解除</button></div></div>';
      }).join('') : '<p class="muted" style="margin:0">登録済みの端末はありません。</p>') + '</section>';
      after(h, function () {
        Array.prototype.forEach.call(document.querySelectorAll('[data-code]'), function (b) {
          b.onclick = function () {
            call('apiAdminDeviceCode', state.token, b.dataset.code).then(function (r) {
              if (!r || !r.ok) { toast((r && r.error) || '作れませんでした'); return; }
              var m = openModal('<h3>端末の登録コード</h3><div class="copybox" style="font-size:34px;text-align:center;letter-spacing:.2em;font-weight:700">' + esc(r.code) + '</div>' +
                '<p class="muted" style="margin:0;line-height:1.7">' + r.minutes + '分間・1回だけ使えます。登録する端末で、ID・パスワードを入れて、このコードを「端末の登録コード」欄に入力してもらってください。</p><button class="btn block" id="cd-x">閉じる</button>');
              $('#cd-x', m).onclick = closeModal;
            }).catch(function (err) { toast(err.message); });
          };
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-rel]'), function (b) {
          b.onclick = function () {
            confirmBox('端末の登録を解除', 'この端末は、店頭用アカウントでログインできなくなります。同じアカウントでログイン中の端末は、いったんログアウトされます（登録済みの端末は、すぐ入り直せます）。', '解除する').then(function (ok) {
              if (!ok) return;
              call('apiAdminDeviceRelease', state.token, b.dataset.rel).then(function () { toast('解除しました'); adminTab(); }).catch(function (err) { toast(err.message); });
            });
          };
        });
      });
    }).catch(function (err) { after(failBox(err)); });
  }

})();
