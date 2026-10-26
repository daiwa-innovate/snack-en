/* =========================================================
 * 管理者：経費の入力／Excelの書き出し／顧客の整理
 * ======================================================= */
(function () {
  var E = { month: null, recurOpen: false };
  var C = { q: '', pick: [] };

  var CSS = '' +
    '.ex-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end}' +
    '.ex-form .field label{font-size:12px;color:var(--sub);font-weight:500}' +
    '.ex-tags{display:flex;flex-wrap:wrap;gap:8px}' +
    '.ex-tag{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:13px;display:flex;flex-direction:column;gap:2px;min-width:110px}' +
    '.ex-tag b{font-size:16px}' +
    '.ex-k{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;margin-left:4px}' +
    '.ex-k.k1{background:#EADBDD;color:var(--accent-dark)}.ex-k.k2{background:#DDE9F0;color:#1F4A63}.ex-k.k3{background:#F3E3B5;color:#6B4710}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function today() { var d = new Date(Date.now() - 6 * 3600000 + 9 * 3600000); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function kindCls(k) { return k === '固定' ? 'k1' : k === '変動' ? 'k2' : 'k3'; }
  function opt(list, cur, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + list.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); }

  /* =========================================================
   * 経費の入力
   * ======================================================= */
  window.adminExp = function (main) {
    call('apiAdminExpList', state.token, E.month).then(function (d) {
      if (!d) return;
      E.month = d.month;
      var catNames = d.cats.map(function (c) { return c.name; });
      var h = '<div class="row" style="flex-wrap:wrap"><h1>経費</h1><button class="btn ghost small" id="ex-cats">科目を管理</button></div>';
      h += '<div class="row" style="justify-content:flex-start;gap:10px;flex-wrap:wrap"><label for="ex-m" class="muted">表示する月</label>' +
        '<select class="input" id="ex-m" style="width:auto;min-height:44px">' + d.months.map(function (m) { return '<option value="' + m + '"' + (m === d.month ? ' selected' : '') + '>' + monthLabel(m) + '</option>'; }).join('') + '</select></div>';
      if (!d.posStartDate) h += '<div class="msg warn" style="font-size:13px;line-height:1.7">「伝票・売上」で<b>伝票の使用開始日</b>を設定するまでは、月次収支は、これまでどおり売上管理.xlsx の経費を使います。ここで入れた経費は、開始日の月から月次収支に使われます（先に入れておいて大丈夫です）。</div>';
      h += '<section class="card stack"><h2>経費を入れる</h2><form id="ex-f" class="stack"><div class="ex-form">' +
        '<div class="field"><label for="ef-d">日付</label><input class="input" id="ef-d" type="date" value="' + esc(d.month === today().slice(0, 7) ? today() : d.month + '-01') + '" required></div>' +
        '<div class="field"><label for="ef-a">金額（円）</label><input class="input" id="ef-a" type="number" inputmode="numeric" placeholder="例：3000" required></div>' +
        '<div class="field"><label for="ef-c">科目</label><select class="input" id="ef-c">' + opt(catNames, '') + '</select></div>' +
        '<div class="field"><label for="ef-p">支払先</label><input class="input" id="ef-p" placeholder="例：幸田" maxlength="40"></div>' +
        '<div class="field"><label for="ef-b">立て替えた人（任意）</label><select class="input" id="ef-b">' + opt(d.staff, '', 'なし') + '</select></div>' +
        '<div class="field"><label for="ef-m2">メモ（任意）</label><input class="input" id="ef-m2" maxlength="100"></div></div>' +
        '<label class="check"><input type="checkbox" id="ef-r">毎月くり返す経費にする（家賃など。毎月、この日に自動で入ります）</label><div id="ex-m2"></div>' +
        '<div><button class="btn" id="ef-go">追加する</button></div></form></section>';
      h += '<div class="kpis">' + kpi(monthLabel(d.month) + 'の経費', yen(d.total), d.rows.length + '件') + '</div>';
      if (d.byCat.length) h += '<div class="ex-tags">' + d.byCat.map(function (c) { return '<div class="ex-tag"><span>' + esc(c.cat) + '<span class="ex-k ' + kindCls(c.kind) + '">' + esc(c.kind) + '</span></span><b>' + yen(c.amount) + '</b></div>'; }).join('') + '</div>';
      h += '<section class="card stack"><h2>' + monthLabel(d.month) + 'の経費の一覧</h2>' + (d.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>日付</th><th>科目</th><th>支払先</th><th>立替</th><th class="r">金額</th><th>メモ</th><th>精算済み</th><th></th></tr></thead><tbody>' +
        d.rows.map(function (r) {
          return '<tr><td>' + esc(r.date.slice(5).replace('-', '/')) + '</td><td>' + esc(r.cat) + (r.recurId ? ' <span class="badge norm">毎月</span>' : '') + '</td><td>' + esc(r.payee) + '</td><td>' + esc(r.buyer) + '</td><td class="r"><b>' + yen(r.amount) + '</b></td><td style="white-space:normal">' + esc(r.memo) + '</td>' +
            '<td>' + (r.buyer ? '<input type="checkbox" data-settle="' + esc(r.id) + '"' + (r.settled ? ' checked' : '') + ' aria-label="精算済み" style="width:22px;height:22px;accent-color:var(--accent)">' : '') + '</td>' +
            '<td class="r"><button class="btn ghost small" data-edit="' + esc(r.id) + '">編集</button> <button class="btn danger small" data-del="' + esc(r.id) + '">削除</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted" style="margin:0">この月の経費は、まだありません。</p>') + '</section>';
      h += '<section class="card stack"><div class="row"><h2>毎月くり返す経費</h2></div>' + (d.recur.length ? d.recur.map(function (r) {
        return '<div class="user"><div style="min-width:0"><div style="font-weight:700">' + esc(r.payee || r.cat) + '　' + yen(r.amount) + (r.active ? '' : ' <span class="badge off">停止中</span>') + '</div>' +
          '<div class="tiny">毎月' + r.day + '日・' + esc(r.cat) + '・' + esc(r.from) + ' から' + (r.to ? ' ' + esc(r.to) + ' まで' : '') + '</div></div>' +
          '<div class="acts"><button class="btn ghost small" data-redit="' + esc(r.id) + '">編集</button><button class="btn danger small" data-rdel="' + esc(r.id) + '">やめる</button></div></div>';
      }).join('') : '<p class="muted" style="margin:0">登録はありません。上の入力で「毎月くり返す」にチェックして追加できます。</p>') +
        '<p class="tiny" style="margin:0;line-height:1.7">登録すると、その月を開いたときに自動で入ります。あとから金額を変えても、すでに入った月は変わりません。</p></section>';
      main.innerHTML = h;
      var byId = {}; d.rows.forEach(function (r) { byId[r.id] = r; });
      var recById = {}; d.recur.forEach(function (r) { recById[r.id] = r; });
      $('#ex-m').onchange = function () { E.month = this.value; adminTab(); };
      $('#ex-cats').onclick = function () { catsModal(d.cats); };
      $('#ex-f').onsubmit = function (e) {
        e.preventDefault();
        var data = { date: $('#ef-d').value, amount: $('#ef-a').value, cat: $('#ef-c').value, payee: $('#ef-p').value, buyer: $('#ef-b').value, memo: $('#ef-m2').value };
        var btn = $('#ef-go'); busy(btn, true);
        var done = function (r) { busy(btn, false); if (!r) return; if (!r.ok) { showMsg($('#ex-m2'), r.error); return; } toast('追加しました'); adminTab(); };
        if ($('#ef-r').checked) {
          call('apiAdminRecurSave', state.token, { payee: data.payee, amount: data.amount, cat: data.cat, buyer: data.buyer, memo: data.memo, day: Math.min(28, +data.date.slice(8)), from: data.date.slice(0, 7), to: '' }).then(done).catch(function (err) { busy(btn, false); showMsg($('#ex-m2'), err.message); });
        } else call('apiAdminExpSave', state.token, data).then(done).catch(function (err) { busy(btn, false); showMsg($('#ex-m2'), err.message); });
      };
      Array.prototype.forEach.call(main.querySelectorAll('[data-settle]'), function (c) {
        c.onchange = function () { call('apiAdminExpSettle', state.token, c.dataset.settle, c.checked).then(function () { toast(c.checked ? '精算済みにしました' : '精算済みを外しました'); }).catch(function (err) { toast(err.message); }); };
      });
      Array.prototype.forEach.call(main.querySelectorAll('[data-edit]'), function (b) { b.onclick = function () { editModal(byId[b.dataset.edit], d); }; });
      Array.prototype.forEach.call(main.querySelectorAll('[data-del]'), function (b) {
        b.onclick = function () {
          var r = byId[b.dataset.del];
          confirmBox('経費を削除', r.date + ' ' + r.cat + ' ' + yen(r.amount) + '（' + (r.payee || '支払先なし') + '）を削除します。元に戻せません。', '削除する').then(function (ok) {
            if (!ok) return;
            call('apiAdminExpDelete', state.token, r.id).then(function () { toast('削除しました'); adminTab(); }).catch(function (err) { toast(err.message); });
          });
        };
      });
      Array.prototype.forEach.call(main.querySelectorAll('[data-redit]'), function (b) { b.onclick = function () { recurModal(recById[b.dataset.redit], d); }; });
      Array.prototype.forEach.call(main.querySelectorAll('[data-rdel]'), function (b) {
        b.onclick = function () {
          var r = recById[b.dataset.rdel];
          confirmBox('毎月の経費をやめる', '「' + (r.payee || r.cat) + '」の毎月の登録をやめます。すでに入っている月の経費は残ります。', 'やめる').then(function (ok) {
            if (!ok) return;
            call('apiAdminRecurDelete', state.token, r.id).then(function () { toast('やめました'); adminTab(); }).catch(function (err) { toast(err.message); });
          });
        };
      });
    }).catch(function (err) { main.innerHTML = failBox(err); });
  };

  function editModal(r, d) {
    var m = openModal('<h3>経費の編集</h3><form id="ee" class="stack"><div id="em"></div>' +
      '<div class="field"><label for="ee-d">日付</label><input class="input" id="ee-d" type="date" value="' + esc(r.date) + '" required></div>' +
      '<div class="field"><label for="ee-a">金額（円）</label><input class="input" id="ee-a" type="number" value="' + r.amount + '" required></div>' +
      '<div class="field"><label for="ee-c">科目</label><select class="input" id="ee-c">' + opt(d.cats.map(function (c) { return c.name; }).concat(d.cats.some(function (c) { return c.name === r.cat; }) ? [] : [r.cat]), r.cat) + '</select></div>' +
      '<div class="field"><label for="ee-p">支払先</label><input class="input" id="ee-p" value="' + esc(r.payee) + '"></div>' +
      '<div class="field"><label for="ee-b">立て替えた人</label><select class="input" id="ee-b">' + opt(d.staff, r.buyer, 'なし') + '</select></div>' +
      '<div class="field"><label for="ee-n">メモ</label><input class="input" id="ee-n" value="' + esc(r.memo) + '"></div>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost small" id="ee-x">やめる</button><button class="btn small" id="ee-ok">保存</button></div></form>');
    $('#ee-x', m).onclick = closeModal;
    $('#ee', m).onsubmit = function (e) {
      e.preventDefault();
      call('apiAdminExpSave', state.token, { id: r.id, date: $('#ee-d', m).value, amount: $('#ee-a', m).value, cat: $('#ee-c', m).value, payee: $('#ee-p', m).value, buyer: $('#ee-b', m).value, memo: $('#ee-n', m).value, settled: r.settled }).then(function (x) {
        if (!x || !x.ok) { showMsg($('#em', m), (x && x.error) || '保存できませんでした'); return; }
        closeModal(); toast('保存しました'); adminTab();
      }).catch(function (err) { showMsg($('#em', m), err.message); });
    };
  }

  function recurModal(r, d) {
    var m = openModal('<h3>毎月の経費の編集</h3><form id="re" class="stack"><div id="rm"></div>' +
      '<div class="field"><label for="re-p">支払先</label><input class="input" id="re-p" value="' + esc(r.payee) + '"></div>' +
      '<div class="field"><label for="re-a">金額（円）</label><input class="input" id="re-a" type="number" value="' + r.amount + '" required></div>' +
      '<div class="field"><label for="re-c">科目</label><select class="input" id="re-c">' + opt(d.cats.map(function (c) { return c.name; }), r.cat) + '</select></div>' +
      '<div class="field"><label for="re-d">毎月の日（1〜28）</label><input class="input" id="re-d" type="number" min="1" max="28" value="' + r.day + '" required></div>' +
      '<div class="field"><label for="re-t">終わりの月（空欄＝ずっと）</label><input class="input" id="re-t" type="month" value="' + esc(r.to) + '"></div>' +
      '<label class="check"><input type="checkbox" id="re-on"' + (r.active ? ' checked' : '') + '>この登録を使う</label>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost small" id="re-x">やめる</button><button class="btn small">保存</button></div></form>');
    $('#re-x', m).onclick = closeModal;
    $('#re', m).onsubmit = function (e) {
      e.preventDefault();
      call('apiAdminRecurSave', state.token, { id: r.id, payee: $('#re-p', m).value, amount: $('#re-a', m).value, cat: $('#re-c', m).value, buyer: r.buyer, memo: r.memo, day: $('#re-d', m).value, from: r.from, to: $('#re-t', m).value, active: $('#re-on', m).checked }).then(function (x) {
        if (!x || !x.ok) { showMsg($('#rm', m), (x && x.error) || '保存できませんでした'); return; }
        closeModal(); toast('保存しました'); adminTab();
      }).catch(function (err) { showMsg($('#rm', m), err.message); });
    };
  }

  function catsModal(cats) {
    var rows = cats.map(function (c) { return { name: c.name, kind: c.kind }; });
    function body() {
      return '<h3>科目の管理</h3><p class="muted" style="margin:-8px 0 0;line-height:1.7">区分は、月次収支の集計に使います。固定費＝毎月ほぼ同じ／変動費＝売上や月で変わる／返済＝借入返済（経費に含めず、利益から引きます）。</p>' +
        '<div class="stack" style="gap:8px">' + rows.map(function (r, i) {
          return '<div class="row" style="gap:8px"><input class="input" data-i="' + i + '" data-k="name" value="' + esc(r.name) + '" aria-label="科目の名前" style="min-height:44px">' +
            '<select class="input" data-i="' + i + '" data-k="kind" style="width:96px;min-height:44px">' + opt(['固定', '変動', '返済'], r.kind) + '</select>' +
            '<button class="icon-btn" data-rm="' + i + '" aria-label="この科目を消す">✕</button></div>';
        }).join('') + '</div><div><button class="btn ghost small" id="ct-add">＋ 科目を追加</button></div><div id="ctm"></div>' +
        '<p class="tiny" style="margin:0;line-height:1.7">すでに入力した経費の科目名は、そのまま残ります（名前を変えても、過去の経費は変わりません）。</p>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" id="ct-x">やめる</button><button class="btn small" id="ct-ok">保存</button></div>';
    }
    var m = openModal(body());
    function bind() {
      $('#ct-x', m).onclick = closeModal;
      $('#ct-add', m).onclick = function () { rows.push({ name: '', kind: '変動' }); m.innerHTML = body(); bind(); };
      Array.prototype.forEach.call(m.querySelectorAll('[data-i]'), function (el) { el.oninput = el.onchange = function () { rows[+el.dataset.i][el.dataset.k] = el.value; }; });
      Array.prototype.forEach.call(m.querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { rows.splice(+b.dataset.rm, 1); m.innerHTML = body(); bind(); }; });
      $('#ct-ok', m).onclick = function () {
        call('apiAdminExpCats', state.token, rows).then(function (r) {
          if (!r || !r.ok) { showMsg($('#ctm', m), (r && r.error) || '保存できませんでした'); return; }
          closeModal(); toast('科目を保存しました'); adminTab();
        }).catch(function (err) { showMsg($('#ctm', m), err.message); });
      };
    }
    bind();
  }

  /* =========================================================
   * Excel の書き出し
   * ======================================================= */
  var KINDS = [['sales', '日別の売上'], ['tickets', '伝票の明細'], ['bonus', '歩合'], ['expenses', '経費'], ['pl', '月次の収支'], ['credits', '未収']];
  var xlsxLoading = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoading) return xlsxLoading;
    xlsxLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { resolve(window.XLSX); };
      s.onerror = function () { xlsxLoading = null; reject(new Error('Excel を作る部品を読み込めませんでした')); };
      document.head.appendChild(s);
    });
    return xlsxLoading;
  }
  function csvOf(sheet) {
    var esc2 = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [sheet.head].concat(sheet.rows).map(function (r) { return r.map(esc2).join(','); }).join('\r\n');
  }
  function saveBlob(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  /** sheets：[{title, head, rows}]。Excel（.xlsx）で保存する。部品が読み込めないときは、CSV（Excelで開ける）にする。 */
  function download(sheets, base) {
    return loadXlsx().then(function (X) {
      var wb = X.utils.book_new();
      sheets.forEach(function (s) {
        var ws = X.utils.aoa_to_sheet([s.head].concat(s.rows));
        ws['!cols'] = s.head.map(function (h, i) { var w = String(h).length * 2 + 2; s.rows.slice(0, 50).forEach(function (r) { w = Math.max(w, String(r[i] == null ? '' : r[i]).length * 1.6 + 2); }); return { wch: Math.min(40, w) }; });
        X.utils.book_append_sheet(wb, ws, s.title.slice(0, 31));
      });
      X.writeFile(wb, base + '.xlsx');
      return 'xlsx';
    }, function () {
      sheets.forEach(function (s) { saveBlob(new Blob([csvOf(s)], { type: 'text/csv;charset=utf-8' }), base + '_' + s.title + '.csv'); });
      return 'csv';
    });
  }

  window.adminExport = function (main) {
    var t = today(), first = t.slice(0, 8) + '01';
    var h = '<h1>Excelの書き出し</h1><section class="card stack"><h2>期間を選ぶ</h2>' +
      '<div class="row" style="justify-content:flex-start;gap:10px;flex-wrap:wrap"><input class="input" id="xf" type="date" value="' + first + '" style="width:auto;min-height:48px" aria-label="開始日"><span>〜</span><input class="input" id="xt" type="date" value="' + t + '" style="width:auto;min-height:48px" aria-label="終了日"></div>' +
      '<div class="chips"><button class="chip" data-r="month">今月</button><button class="chip" data-r="prev">先月</button><button class="chip" data-r="period">今の歩合の締め期間（21日〜）</button><button class="chip" data-r="all">すべて</button></div></section>' +
      '<section class="card stack"><h2>書き出す内容</h2><p class="muted" style="margin:0;line-height:1.7">押すと、Excel（.xlsx）がダウンロードされます。「月次の収支」は、期間に関係なく全期間です。</p>' +
      '<div class="chips">' + KINDS.map(function (k) { return '<button class="btn ghost small" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<div><button class="btn" id="xall">全部まとめて1つのExcelに</button></div><div id="xm"></div></section>' +
      '<p class="tiny" style="line-height:1.8">書き出した Excel には、売上・顧客名・歩合・経費が入ります。保存した場所や、メール・LINEで送る相手にご注意ください。</p>';
    main.innerHTML = h;
    var range = function (k) {
      var d = new Date(Date.now() - 6 * 3600000 + 9 * 3600000), y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, dd = d.getUTCDate(), f, to;
      if (k === 'month') { f = y + '-' + pad2(mo) + '-01'; to = today(); }
      else if (k === 'prev') { var py = mo === 1 ? y - 1 : y, pm = mo === 1 ? 12 : mo - 1; f = py + '-' + pad2(pm) + '-01'; to = py + '-' + pad2(pm) + '-' + pad2(new Date(Date.UTC(py, pm, 0)).getUTCDate()); }
      else if (k === 'period') { var sm = dd >= 21 ? mo : (mo === 1 ? 12 : mo - 1), sy = dd >= 21 ? y : (mo === 1 ? y - 1 : y); f = sy + '-' + pad2(sm) + '-21'; to = today(); }
      else { f = '2025-01-01'; to = today(); }
      $('#xf').value = f; $('#xt').value = to;
    };
    Array.prototype.forEach.call(main.querySelectorAll('[data-r]'), function (b) { b.onclick = function () { range(b.dataset.r); }; });
    var fetchKind = function (k) { return call('apiAdminExport', state.token, k, $('#xf').value, $('#xt').value); };
    var stamp = function () { return $('#xf').value.replace(/-/g, '') + '-' + $('#xt').value.replace(/-/g, ''); };
    var report = function (how, rows) { showMsg($('#xm'), how === 'xlsx' ? 'ダウンロードしました（' + rows + '行）。' : 'Excelを作る部品が読み込めなかったので、CSVでダウンロードしました（Excelで開けます）。', true); };
    Array.prototype.forEach.call(main.querySelectorAll('[data-k]'), function (b) {
      b.onclick = function () {
        busy(b, true, '作成中…');
        fetchKind(b.dataset.k).then(function (r) {
          if (!r || !r.ok) { busy(b, false); showMsg($('#xm'), (r && r.error) || '書き出せませんでした'); return; }
          return download([r], 'スナックEN_' + r.title + '_' + stamp()).then(function (how) { busy(b, false); report(how, r.rows.length); });
        }).catch(function (err) { busy(b, false); showMsg($('#xm'), err.message); });
      };
    });
    $('#xall').onclick = function () {
      var btn = $('#xall'); busy(btn, true, '作成中…（少しかかります）');
      Promise.all(KINDS.map(function (k) { return fetchKind(k[0]); })).then(function (all) {
        if (all.some(function (r) { return !r; })) { busy(btn, false); return; }
        var bad = all.filter(function (r) { return !r.ok; })[0];
        if (bad) { busy(btn, false); showMsg($('#xm'), bad.error); return; }
        return download(all, 'スナックEN_まとめ_' + stamp()).then(function (how) { busy(btn, false); report(how, all.reduce(function (a, r) { return a + r.rows.length; }, 0)); });
      }).catch(function (err) { busy(btn, false); showMsg($('#xm'), err.message); });
    };
  };

  /* =========================================================
   * 顧客の整理
   * ======================================================= */
  window.adminCustomers = function (main) {
    call('apiAdminCustAll', state.token).then(function (d) {
      if (!d) return;
      var q = C.q.trim().toLowerCase();
      var list = d.customers.filter(function (c) { return !q || (c.name + ' ' + c.nickname).toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return a.lastVisit < b.lastVisit ? 1 : a.lastVisit > b.lastVisit ? -1 : (a.name < b.name ? -1 : 1); });
      var h = '<div class="row" style="flex-wrap:wrap"><h1>顧客管理</h1><button class="btn ghost small" id="cu-imp">過去の来店明細から顧客を作る</button></div>' +
        '<p class="muted" style="margin:0;line-height:1.7">同じ人が別の名前で入っているとき（「宮崎さん」「宮崎様」など）は、2人にチェックを入れて「まとめる」を押します。来店履歴とボトルが、1人にまとまります。</p>' +
        '<div class="row" style="gap:10px;flex-wrap:wrap"><input class="input" id="cu-q" type="search" placeholder="名前で探す" value="' + esc(C.q) + '" style="flex:1;min-width:180px" aria-label="顧客を探す">' +
        '<button class="btn small" id="cu-merge"' + (C.pick.length === 2 ? '' : ' disabled') + '>選んだ2人をまとめる</button></div>' +
        '<div class="tiny">' + d.customers.length + '人' + (C.pick.length ? '　チェック中：' + C.pick.length + '人（まとめる2人を選びます）' : '') + '</div>';
      h += '<section class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>名前</th><th>呼び名</th><th class="r">来店</th><th>前回</th><th class="r">合計金額</th><th>担当</th><th>電話</th><th></th></tr></thead><tbody>' +
        list.slice(0, 200).map(function (c) {
          return '<tr><td><input type="checkbox" data-pick="' + esc(c.id) + '"' + (C.pick.indexOf(c.id) >= 0 ? ' checked' : '') + ' aria-label="まとめる相手に選ぶ" style="width:22px;height:22px;accent-color:var(--accent)"></td><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.nickname) + '</td><td class="r">' + c.visits + '</td><td>' + esc(c.lastVisit.slice(5).replace('-', '/')) + '</td><td class="r">' + yen(c.total) + '</td><td>' + esc(c.staffId) + '</td><td>' + esc(c.phone) + '</td>' +
            '<td class="r"><button class="btn ghost small" data-edit="' + esc(c.id) + '">編集</button></td></tr>';
        }).join('') + '</tbody></table></div>' + (list.length > 200 ? '<div class="tiny">ほか ' + (list.length - 200) + '人（名前で絞り込めます）</div>' : '') + '</section>';
      main.innerHTML = h;
      var byId = {}; d.customers.forEach(function (c) { byId[c.id] = c; });
      var inp = $('#cu-q');
      inp.oninput = function () { C.q = inp.value; var pos = inp.selectionStart; adminCustomers(main); setTimeout(function () { var n = $('#cu-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 400); };
      Array.prototype.forEach.call(main.querySelectorAll('[data-pick]'), function (c) {
        c.onchange = function () {
          var i = C.pick.indexOf(c.dataset.pick);
          if (c.checked && i < 0) { if (C.pick.length >= 2) { c.checked = false; toast('まとめるのは2人ずつです'); return; } C.pick.push(c.dataset.pick); }
          else if (!c.checked && i >= 0) C.pick.splice(i, 1);
          $('#cu-merge').disabled = C.pick.length !== 2;
        };
      });
      $('#cu-merge').onclick = function () {
        var a = byId[C.pick[0]], b = byId[C.pick[1]];
        if (!a || !b) return;
        var m = openModal('<h3>2人をまとめる</h3><p class="muted" style="margin:0;line-height:1.7">どちらの名前を残しますか？ もう一方の来店履歴とボトルは、残す人に移ります。元に戻せません。</p>' +
          '<button class="btn block" data-keep="' + esc(a.id) + '" data-from="' + esc(b.id) + '">「' + esc(a.name) + '」を残す（' + a.visits + '回）</button>' +
          '<button class="btn block" data-keep="' + esc(b.id) + '" data-from="' + esc(a.id) + '">「' + esc(b.name) + '」を残す（' + b.visits + '回）</button><button class="link" id="mg-x">やめる</button>');
        $('#mg-x', m).onclick = closeModal;
        Array.prototype.forEach.call(m.querySelectorAll('[data-keep]'), function (bt) {
          bt.onclick = function () {
            call('apiAdminCustMerge', state.token, bt.dataset.from, bt.dataset.keep).then(function (r) {
              if (!r || !r.ok) { toast((r && r.error) || 'まとめられませんでした'); return; }
              C.pick = []; closeModal(); toast('まとめました（来店 ' + r.moved + '件を移しました）'); adminTab();
            }).catch(function (err) { toast(err.message); });
          };
        });
      };
      $('#cu-imp').onclick = function () {
        confirmBox('過去の来店明細から顧客を作る', '売上管理.xlsx の「○月度」シート（全期間）を読み、まだいないお客様を作って、来店履歴を足します。今ある顧客は変えません。1〜2分かかります。', '作る').then(function (ok) {
          if (!ok) return;
          var b = $('#cu-imp'); busy(b, true, '作成中…（1〜2分）');
          call('apiAdminCustImport', state.token).then(function (r) {
            busy(b, false);
            if (!r || !r.ok) { toast((r && r.error) || '作れませんでした'); return; }
            toast('顧客 ' + r.customers + '人・来店 ' + r.visits + '件を足しました'); adminTab();
          }).catch(function (err) { busy(b, false); toast(err.message); });
        });
      };
      Array.prototype.forEach.call(main.querySelectorAll('[data-edit]'), function (b) { b.onclick = function () { custEdit(byId[b.dataset.edit]); }; });
    }).catch(function (err) { main.innerHTML = failBox(err); });
  };

  function custEdit(c) {
    call('apiAdminMasterGet', state.token, 'staff').then(function (s) {
      var staff = s && s.ok ? s.rows.filter(function (x) { return !x.retired; }) : [];
      var m = openModal('<h3>お客様の編集</h3><form id="ce" class="stack"><div id="cem"></div>' +
        '<div class="field"><label for="ce-n">名前</label><input class="input" id="ce-n" value="' + esc(c.name) + '" required></div>' +
        '<div class="field"><label for="ce-k">呼び名</label><input class="input" id="ce-k" value="' + esc(c.nickname) + '"></div>' +
        '<div class="field"><label for="ce-p">電話番号</label><input class="input" id="ce-p" type="tel" value="' + esc(c.phone) + '"></div>' +
        '<div class="field"><label for="ce-s">担当（参考）</label><select class="input" id="ce-s"><option value="">なし</option>' + staff.map(function (x) { return '<option value="' + esc(x.id) + '"' + (c.staffId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="ce-m">メモ</label><textarea class="input" id="ce-m">' + esc(c.memo) + '</textarea></div>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost small" id="ce-x">やめる</button><button class="btn small">保存</button></div></form>');
      $('#ce-x', m).onclick = closeModal;
      $('#ce', m).onsubmit = function (e) {
        e.preventDefault();
        call('apiCustSave', state.token, { id: c.id, name: $('#ce-n', m).value, nickname: $('#ce-k', m).value, birthday: c.birthday, company: c.company, likes: c.likes, memo: $('#ce-m', m).value, phone: $('#ce-p', m).value, staffId: $('#ce-s', m).value, force: true }).then(function (r) {
          if (!r || !r.ok) { showMsg($('#cem', m), (r && r.error) || '保存できませんでした'); return; }
          closeModal(); toast('保存しました'); adminTab();
        }).catch(function (err) { showMsg($('#cem', m), err.message); });
      };
    }).catch(function (err) { toast(err.message); });
  }
})();
