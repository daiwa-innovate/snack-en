/* =========================================================
 * 伝票・会計・顧客（スタッフ・店頭用の画面）
 * 画面は「先に反映して、裏で保存」する。操作は順番に送り、通信が切れたら自動で再送する。
 * 金額の合計は、サーバーが最終的に計算し直した値が正（この画面の計算は先に見せるためのもの）。
 * ======================================================= */
(function () {
  var POS = {
    init: null, offset: 0, list: [], day: null, view: 'list', id: null, tk: null,
    q: {}, sending: {}, status: 'ok', tab: '', castFor: '', alerts: [], alerted: {}, sound: false, audio: null,
    poll: null, pollN: 0, custs: null, custAt: 0, keep: {}, openClosed: false, sheet: false, main: null, payBusy: false
  };
  window.POS = POS;

  var CSS = '' +
    '.staff.wide{max-width:1240px}' +
    '.staff.tk-open .s-nav{display:none}' +
    '@media (min-width:900px){.staff.tk-open .s-nav{display:block}}' +
    '.pos-wrap{display:block}' +
    '.pos-wrap.view-list .pos-center,.pos-wrap.view-list .pos-panel,.pos-wrap.view-list .tk-bar{display:none}' +
    '.pos-wrap.view-ticket .pos-list{display:none}' +
    '@media (min-width:900px){.pos-wrap{display:grid;grid-template-columns:280px minmax(0,1fr) 360px;gap:14px;align-items:start}' +
    '.pos-wrap.view-list{grid-template-columns:minmax(0,520px)}' +
    '.pos-wrap.view-list .pos-list{display:flex}' +
    '.pos-wrap.view-ticket .pos-list{display:flex}' +
    '.tk-bar{display:none!important}.pos-panel{position:static!important;transform:none!important;max-height:none!important;box-shadow:none!important}' +
    '.sheet-x{display:none!important}}' +
    '.pos-list{display:flex;flex-direction:column;gap:12px;min-width:0}' +
    '.pos-center{display:flex;flex-direction:column;gap:12px;min-width:0;padding-bottom:96px}' +
    '@media (min-width:900px){.pos-center{padding-bottom:0}}' +
    '.sum-card{display:flex;flex-direction:column;gap:6px}' +
    '.sum-card .big{font-size:30px}' +
    '.tk-card{width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;cursor:pointer;font:inherit;color:inherit;min-height:64px}' +
    '.tk-card.on{border:2px solid var(--accent)}' +
    '.tk-card .r1{display:flex;justify-content:space-between;gap:8px;align-items:baseline}' +
    '.tk-card .nm{font-size:17px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.tk-card .am{font-size:17px;font-weight:700;flex-shrink:0}' +
    '.tk-card .r2{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--sub)}' +
    '.rem{display:inline-block;border-radius:8px;padding:3px 9px;font-size:13px;font-weight:700;background:#EFEAE4;color:var(--ink)}' +
    '.rem.soon{background:#F8EDD8;color:#6B4710}.rem.end{background:#9B2C2C;color:#fff}' +
    '.tk-head{background:#fff;border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;position:sticky;top:0;z-index:5;box-shadow:0 1px 0 var(--line)}' +
    '.tk-head .top{display:flex;align-items:center;gap:8px}' +
    '.tk-head .tname{flex:1;min-width:0;text-align:left;background:none;border:none;font-size:20px;font-weight:700;padding:6px 4px;min-height:44px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.chip{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid #D6CEC5;background:#fff;font-size:15px;cursor:pointer;font-family:inherit;color:var(--ink)}' +
    '.chip.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}' +
    '.chip.gold{background:#F3E3B5;border-color:#D4B25A}' +
    '.chip.warn{border-color:var(--warn);color:var(--warn);font-weight:700}' +
    '.stepper{display:inline-flex;align-items:center;border:1px solid #D6CEC5;border-radius:22px;background:#fff;overflow:hidden}' +
    '.stepper button{width:44px;height:44px;border:none;background:none;font-size:22px;cursor:pointer;color:var(--ink)}' +
    '.stepper b{min-width:56px;text-align:center;font-size:16px}' +
    '.tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}' +
    '.tabs::-webkit-scrollbar{display:none}' +
    '.tabs button{flex:0 0 auto;min-height:44px;padding:0 16px;border-radius:22px;border:1px solid #D6CEC5;background:#fff;font-size:14px;cursor:pointer;color:var(--ink)}' +
    '.tabs button.on{background:var(--ink);border-color:var(--ink);color:#fff;font-weight:700}' +
    '.grid-m{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
    '@media (min-width:600px){.grid-m{grid-template-columns:repeat(3,minmax(0,1fr))}}' +
    '.mi{position:relative;min-height:74px;border:1px solid #D6CEC5;background:#fff;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer;font-family:inherit;color:var(--ink);touch-action:manipulation;user-select:none;-webkit-user-select:none}' +
    '.mi:active{background:var(--chip)}' +
    '.mi .n{font-size:15px;font-weight:700;line-height:1.35;word-break:break-word}' +
    '.mi .p{font-size:14px;color:var(--sub)}' +
    '.mi.on{border:2px solid var(--accent);background:#FBF3F4}' +
    '.mi .bd{position:absolute;top:6px;right:8px;background:var(--accent);color:#fff;border-radius:12px;min-width:30px;height:26px;padding:0 8px;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center}' +
    '.mi .mn{position:absolute;bottom:6px;right:6px;width:44px;height:44px;border-radius:22px;border:1px solid #D6CEC5;background:#fff;font-size:22px;display:flex;align-items:center;justify-content:center}' +
    '.sub-h{font-size:13px;color:var(--sub);margin:6px 2px 0;font-weight:700}' +
    '.sys-card{border:1px solid #D6CEC5;background:#fff;border-radius:14px;padding:12px 14px;text-align:left;cursor:pointer;font-family:inherit;color:var(--ink);display:flex;flex-direction:column;gap:2px;min-height:72px}' +
    '.sys-card.on{border:2px solid var(--accent);background:#FBF3F4}' +
    '.sys-card b{font-size:16px}.sys-card span{font-size:13px;color:var(--sub);line-height:1.5}' +
    '.tk-bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:8px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:center;z-index:20}' +
    '.tk-bar .tot{flex:1;min-width:0;background:var(--chip);border:none;border-radius:12px;min-height:52px;padding:0 14px;text-align:left;cursor:pointer;display:flex;flex-direction:column;justify-content:center;font-family:inherit;color:var(--ink)}' +
    '.tk-bar .tot span{font-size:12px;color:var(--sub)}.tk-bar .tot b{font-size:22px}' +
    '.tk-bar .btn{min-height:52px;font-size:17px;padding:0 22px}' +
    '.pos-panel{position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;border-radius:18px 18px 0 0;max-height:80vh;overflow:auto;padding:14px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.18);transform:translateY(105%);transition:transform .2s;display:flex;flex-direction:column;gap:10px}' +
    '.pos-panel.open{transform:none}' +
    '@media (min-width:900px){.pos-panel{border-radius:16px;border:1px solid var(--line)}}' +
    '.pn-head{display:flex;justify-content:space-between;align-items:center}' +
    '.ln{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px 10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line2)}' +
    '.ln .nm{font-size:15px;font-weight:700;word-break:break-word}.ln .nm small{font-weight:400;color:var(--sub);margin-left:4px}' +
    '.ln .pr{font-size:15px;font-weight:700;text-align:right}' +
    '.ln .qt{display:inline-flex;align-items:center;gap:4px}' +
    '.ln .qt button,.ln .xb{width:44px;height:44px;border:1px solid #D6CEC5;border-radius:10px;background:#fff;font-size:18px;cursor:pointer;color:var(--ink)}' +
    '.ln .qt b{min-width:26px;text-align:center}' +
    '.ln.sys .nm{color:var(--sub);font-weight:500}' +
    '.tot-row{display:flex;justify-content:space-between;align-items:baseline;padding-top:6px}' +
    '.tot-row b{font-size:26px}' +
    '.acts{display:flex;flex-wrap:wrap;gap:8px}' +
    '.sync{font-size:12px;display:inline-flex;align-items:center;gap:5px;color:var(--sub);white-space:nowrap}' +
    '.sync i{width:10px;height:10px;border-radius:5px;background:#3B8F6B;display:inline-block}' +
    '.sync.saving i{background:#D79A2B}.sync.off i{background:#B33A3A}' +
    '.alerts{position:fixed;left:8px;right:8px;top:8px;z-index:80;display:flex;flex-direction:column;gap:8px;max-width:520px;margin:0 auto}' +
    '.alert{background:#7A2633;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:8px}' +
    '.alert.soon{background:#8A5A12}' +
    '.alert b{font-size:17px}.alert .acts .btn{background:#fff;color:var(--ink);min-height:44px}' +
    '.alert .acts .btn.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)}' +
    '.pay-row{display:grid;grid-template-columns:minmax(0,1fr) 130px 44px;gap:8px;align-items:center}' +
    '.pay-row .input{min-height:48px}' +
    '.cust{width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;cursor:pointer;font:inherit;color:inherit;min-height:64px}' +
    '.cust .nm{font-size:17px;font-weight:700}.cust .sb{font-size:12px;color:var(--sub);line-height:1.6}' +
    '.fab{position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));min-height:56px;border-radius:28px;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:15}' +
    '.sec-t{font-size:15px;font-weight:700;margin:4px 0 0}' +
    '.empty{padding:28px 10px;text-align:center;color:var(--sub);font-size:14px;line-height:1.8}' +
    /* デモ（練習）の赤い警告 */
    '#demo-bar{position:fixed;left:0;right:0;top:0;z-index:95;background:#C62828;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;box-shadow:0 2px 12px rgba(0,0,0,.35)}' +
    '#demo-bar .tx{display:flex;flex-direction:column;gap:1px;min-width:0;font-size:12px;line-height:1.5}#demo-bar .tx b{font-size:16px;letter-spacing:.04em}' +
    '#demo-bar .btn{background:#fff;color:#C62828;min-height:42px;flex-shrink:0;padding:0 14px}' +
    '#demo-frame{position:fixed;inset:0;border:6px solid #C62828;pointer-events:none;z-index:94}' +
    '#demo-frame::after{content:"デモ";position:absolute;left:50%;top:52%;transform:translate(-50%,-50%) rotate(-16deg);font-size:min(36vw,280px);font-weight:700;color:rgba(198,40,40,.07);white-space:nowrap}' +
    'body.demo-on .staff{padding-top:66px}body.demo-on .alerts{top:74px}body.demo-on .tk-head{top:66px}' +
    '.chip.demo{background:#C62828;border-color:#C62828;color:#fff;font-weight:700}.chip.demo-l{border-color:#C62828;color:#C62828}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ---------- 小さな部品 ---------- */
  function rid(n) {
    var s = '', c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var arr = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(n)) : null;
    for (var i = 0; i < n; i++) s += c[(arr ? arr[i] : Math.floor(Math.random() * 256)) % 36];
    return s;
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function jst(ms) { var d = new Date(ms + 9 * 3600000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() }; }
  function hhmm(ms) { var j = jst(ms); return pad2(j.h) + ':' + pad2(j.mi); }
  function sNow() { return Date.now() + POS.offset; }
  function bizKey() { var j = jst(sNow() - 6 * 3600000); return j.y + '-' + pad2(j.m) + '-' + pad2(j.d); }
  function bizLabel() { var j = jst(sNow() - 6 * 3600000); return j.m + '/' + j.d + '（' + WD[j.wd] + '）'; }
  function newId() { return POS.demo ? 'TDEMO-' + rid(8) : 'T' + bizKey().replace(/-/g, '') + '-' + rid(6); }
  function staffName(id) { var s = POS.init.staff.filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; }
  function sysById(id) { return POS.init.systems.filter(function (x) { return x.id === id; })[0]; }
  function menuById(id) { return POS.init.menu.filter(function (x) { return x.id === id; })[0]; }
  function isAdmin() { return state.user && state.user.role === 'admin'; }
  function remText(ends) {
    var r = Math.ceil((ends - sNow()) / 60000);
    if (r <= 0) return { t: '終了', c: 'end', r: r };
    return { t: '残り' + r + '分', c: r <= 5 ? 'soon' : '', r: r };
  }

  /* ---------- 金額の先読み計算（サーバーと同じ式） ---------- */
  function calc(t) {
    var people = 0, byId = {};
    t.parties.forEach(function (p) { people += p.count; byId[p.id] = p; });
    var sys = t.sys ? t.sys.price * people : 0;
    var lines = 0; t.lines.forEach(function (l) { if (!l.void) lines += l.price * l.qty; });
    var ext = 0; t.exts.forEach(function (e) { if (!e.void) ext += e.price * (byId[e.partyId] ? byId[e.partyId].count : 0); });
    var disc = 0; t.discounts.forEach(function (d) { if (!d.void) disc += d.amount; });
    t.people = people; t.sysTotal = Math.round(sys); t.lineTotal = Math.round(lines); t.extTotal = Math.round(ext); t.discTotal = Math.round(disc);
    t.total = Math.max(0, Math.round(sys + lines + ext - disc));
    var ends = 0;
    if (t.sys && t.sys.minutes > 0) {
      t.parties.forEach(function (p) {
        var em = 0; t.exts.forEach(function (e) { if (!e.void && e.partyId === p.id) em += e.min; });
        p.endsAt = p.at + (t.sys.minutes + em) * 60000;
        if (!ends || p.endsAt < ends) ends = p.endsAt;
      });
    }
    t.endsAt = ends;
    return t;
  }
  function blank(id) {
    var now = sNow();
    return calc({ id: id, date: bizKey(), status: 'open', name: '', isNew: true, customerId: '', seat: '', memo: '', mob: [], dohan: false, sys: null,
      parties: [{ id: 'p1', count: 1, at: now }], lines: [], exts: [], discounts: [], pays: [], credit: null, openedAt: now, version: 0 });
  }
  function applyLocal(t, op) {
    var now = sNow(), i;
    switch (op.op) {
      case 'set': t[op.k] = op.v; if (op.k === 'name') t.name = String(op.v || ''); break;
      case 'system':
        var s = sysById(op.id), c = null;
        if (op.campaignId) c = POS.init.campaigns.filter(function (x) { return x.id === op.campaignId; })[0];
        if (!s) return;
        t.sys = { id: s.id, code: s.code, name: s.name + (c ? '（' + c.name + '）' : ''), price: c ? c.price : s.price, minutes: s.minutes,
          ext: [{ min: s.ext1Min, price: s.ext1Price }, { min: s.ext2Min, price: s.ext2Price }].filter(function (e) { return e.min > 0; }), campaign: c ? c.name : '' };
        break;
      case 'people': t.parties[0].count = Math.max(1, Math.min(40, op.v)); break;
      case 'entryAt': t.parties.forEach(function (p) { if (p.id === (op.party || 'p1')) p.at = op.v; }); break;
      case 'join': t.parties.push({ id: 'p' + (t.parties.length + 1) + 'x', count: op.count, at: op.at || now }); break;
      case 'add':
        var mi = op.menuId ? menuById(op.menuId) : null;
        t.lines.push({ id: op.lineId, menuId: op.menuId || '', name: mi ? mi.name : op.name, price: (mi && !(mi.adjustable && isFinite(op.price))) ? mi.price : op.price,
          qty: op.qty || 1, castFor: op.castFor || '', kind: mi ? 'item' : 'manual', bottle: mi ? !!mi.bottle : false, mtype: op.mtype || '', payTo: op.payTo || '' });
        break;
      case 'qty':
        for (i = 0; i < t.lines.length; i++) if (t.lines[i].id === op.id) { if (op.qty <= 0) t.lines[i].void = true; else t.lines[i].qty = op.qty; }
        break;
      case 'void': t.lines.forEach(function (l) { if (l.id === op.id) l.void = true; }); break;
      case 'ext': t.exts.push({ id: op.extId, partyId: op.party || t.parties[0].id, min: op.min, price: (t.sys.ext.filter(function (e) { return e.min === op.min; })[0] || { price: 0 }).price }); break;
      case 'extvoid': t.exts.forEach(function (e) { if (e.id === op.id) e.void = true; }); break;
      case 'disc': t.discounts.push({ id: op.discId, amount: op.amount, note: op.note || '' }); break;
      case 'undisc': t.discounts.forEach(function (d) { if (d.id === op.id) d.void = true; }); break;
    }
    calc(t);
  }

  /* =========================================================
   * デモ（練習）モード
   * 実際のデータには一切書き込まない。伝票・顧客・会計は、この画面の中（この端末のメモリ）だけで動かし、
   * 画面を再読み込みするか「デモを終わる」を押すと、すべて消える。メニュー・料金・スタッフ名だけは、実際の設定を読み取って使う。
   * ======================================================= */
  var DEMO = null;
  function isDemoId(id) { return String(id).indexOf('TDEMO-') === 0; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function demoSeed() {
    var d = bizKey();
    DEMO = {
      tickets: {}, attend: [],
      custs: [{ id: 'dc1', name: 'デモ太郎さん', nickname: 'たろう', birthday: '', company: '', likes: '芋', memo: '練習用のお客様です' },
              { id: 'dc2', name: 'デモ花子さん', nickname: '', birthday: '', company: '', likes: '', memo: '練習用のお客様です' }],
      visits: [{ customerId: 'dc1', date: d, people: 2, amount: 12000, bottle: '', ticketId: 'seed' }],
      bottles: [{ id: 'db1', customerId: 'dc1', name: 'いいちこ', date: d, status: 'keep', ticketId: '' }]
    };
  }
  function demoSummary(t) { var s = summaryOf(t); s.credit = t.credit ? t.credit.amount : 0; return s; }
  var DEMO_API = {
    apiPosOps: function (id, ops) {
      var t = DEMO.tickets[id];
      if (!t) { t = blank(id); t.version = 0; DEMO.tickets[id] = t; }
      if (t.status !== 'open') return { ok: false, closed: true, error: 'この伝票はすでに会計済み（または取り消し）です。', ticket: clone(t) };
      var err = '';
      for (var i = 0; i < ops.length; i++) { try { applyLocal(t, ops[i]); } catch (e) { err = '操作ができませんでした。'; break; } }
      t.version++;
      return { ok: !err, error: err || undefined, now: sNow(), ticket: clone(t) };
    },
    apiPosList: function () {
      var rows = Object.keys(DEMO.tickets).map(function (k) { return DEMO.tickets[k]; }).sort(function (a, b) { return a.openedAt - b.openedAt; });
      var day = { total: 0, groups: 0, visits: 0, newCount: 0, regularCount: 0, open: 0, openTotal: 0 };
      rows.forEach(function (t) {
        if (t.status === 'open') { day.open++; day.openTotal += t.total; }
        else if (t.status === 'closed') { day.total += t.total; day.groups++; day.visits += t.people; if (t.isNew) day.newCount += t.people; else day.regularCount += t.people; }
      });
      return { now: sNow(), date: bizKey(), tickets: rows.filter(function (t) { return t.status !== 'void'; }).map(demoSummary), day: day };
    },
    apiPosTicket: function (id) { var t = DEMO.tickets[id]; return t ? { ok: true, now: sNow(), ticket: clone(t) } : { ok: false, error: '伝票が見つかりません。' }; },
    apiPosPay: function (id, pays, credit) {
      var t = DEMO.tickets[id];
      if (!t) return { ok: false, error: '伝票が見つかりません。' };
      if (t.status !== 'open') return { ok: false, closed: true, error: 'この伝票はすでに会計済みです。', ticket: clone(t) };
      calc(t);
      if (!t.sys) return { ok: false, error: '先に料金システムを選んでください。' };
      var list = [], sum = 0;
      for (var i = 0; i < (pays || []).length; i++) {
        var p = pays[i], pm = POS.init.paymethods.filter(function (x) { return x.id === p.method; })[0], amount = Math.round(Number(p.amount));
        if (!pm || !(amount > 0)) return { ok: false, error: '支払いの内容を確認してください。' };
        var item = { method: pm.id, name: pm.name, amount: amount, fee: Math.round(amount * (pm.rate || 0)) };
        if (pm.id === 'cash') item.received = Math.max(amount, Math.round(Number(p.received)) || amount);
        list.push(item); sum += amount;
      }
      var cr = Math.round(Number(credit)) || 0;
      if (cr < 0 || sum + cr !== t.total) return { ok: false, error: '支払いの合計（' + (sum + cr) + '円）が伝票の合計（' + t.total + '円）と合いません。' };
      t.pays = list; t.credit = cr > 0 ? { amount: cr, id: 'KDEMO' } : null; t.status = 'closed'; t.closedAt = sNow(); t.closedBy = 'デモ'; t.version++;
      if (t.customerId) {
        DEMO.visits.push({ customerId: t.customerId, date: t.date, people: t.people, amount: t.total, bottle: '', ticketId: t.id });
        t.lines.forEach(function (l) { if (!l.void && l.bottle) DEMO.bottles.push({ id: 'DB' + t.id + l.id, customerId: t.customerId, name: l.name, date: t.date, status: 'keep', ticketId: t.id }); });
      }
      return { ok: true, ticket: clone(t) };
    },
    apiPosVoid: function (id) { var t = DEMO.tickets[id]; if (!t) return { ok: false, error: '伝票が見つかりません。' }; t.status = 'void'; t.version++; return { ok: true, ticket: clone(t) }; },
    apiPosReopen: function (id) {
      var t = DEMO.tickets[id];
      if (!t || t.status !== 'closed') return { ok: false, error: 'この伝票は会計済みではありません。' };
      DEMO.visits = DEMO.visits.filter(function (v) { return v.ticketId !== id; });
      DEMO.bottles = DEMO.bottles.filter(function (b) { return b.ticketId !== id; });
      t.status = 'open'; t.pays = []; t.credit = null; t.version++;
      return { ok: true, ticket: clone(t) };
    },
    apiPosAttend: function (date) { return { date: date, staffIds: DEMO.attend.slice() }; },
    apiPosSetAttend: function (date, ids) { DEMO.attend = (ids || []).slice(); return { ok: true, date: date, staffIds: DEMO.attend }; },
    apiCustList: function () {
      return { ok: true, customers: DEMO.custs.map(function (c) {
        var v = DEMO.visits.filter(function (x) { return x.customerId === c.id; });
        return Object.assign(clone(c), { visits: v.length, lastVisit: v.reduce(function (a, x) { return x.date > a ? x.date : a; }, ''), bottles: DEMO.bottles.filter(function (b) { return b.customerId === c.id && b.status === 'keep'; }).length });
      }) };
    },
    apiCustGet: function (id) {
      var c = DEMO.custs.filter(function (x) { return x.id === id; })[0];
      if (!c) return { ok: false, error: 'お客様が見つかりません。' };
      return { ok: true, customer: clone(c),
        visits: DEMO.visits.filter(function (x) { return x.customerId === id; }).map(function (x) { return { date: x.date, name: c.name, people: x.people, amount: x.amount, bottle: x.bottle }; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }),
        bottles: DEMO.bottles.filter(function (b) { return b.customerId === id && b.status === 'keep'; }).map(function (b) { return { id: b.id, name: b.name, date: b.date }; }) };
    },
    apiCustSave: function (data) {
      data = data || {};
      var name = String(data.name || '').trim();
      if (!name) return { ok: false, error: '名前を入力してください。' };
      var dup = DEMO.custs.filter(function (c) { return c.name === name && c.id !== data.id; })[0];
      if (dup && !data.force) return { ok: false, duplicate: true, id: dup.id, error: '同じ名前のお客様がすでにいます。' };
      var rec = { name: name, nickname: String(data.nickname || ''), birthday: String(data.birthday || ''), company: String(data.company || ''), likes: String(data.likes || ''), memo: String(data.memo || '') };
      var c = data.id ? DEMO.custs.filter(function (x) { return x.id === data.id; })[0] : null;
      if (c) { Object.keys(rec).forEach(function (k) { c[k] = rec[k]; }); return { ok: true, id: c.id }; }
      rec.id = 'dc' + (DEMO.custs.length + 1) + rid(3); DEMO.custs.push(rec);
      return { ok: true, id: rec.id };
    },
    apiCustBottleEmpty: function (id) { DEMO.bottles.forEach(function (b) { if (b.id === id) b.status = '空'; }); return { ok: true }; }
  };

  /** 画面から使う通信の入り口。デモの伝票・デモ中の操作は、サーバーに送らず、画面の中で処理する。 */
  function api(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    var first = args[0];
    var demo = (typeof first === 'string' && first.charAt(0) === 'T' && /^T(DEMO-|\d{8}-)/.test(first)) ? isDemoId(first) : !!POS.demo;
    if (demo) {
      var f = DEMO && DEMO_API[fn];
      if (!f) return Promise.reject(new Error('デモ中は、この操作はできません。'));
      return new Promise(function (resolve) { setTimeout(function () { resolve(f.apply(null, args)); }, 50); });
    }
    return call.apply(null, [fn, state.token].concat(args));
  }

  function demoChrome(on) {
    document.body.classList.toggle('demo-on', !!on);
    var bar = document.getElementById('demo-bar'), frame = document.getElementById('demo-frame');
    if (!on) { if (bar) bar.remove(); if (frame) frame.remove(); return; }
    if (!frame) { frame = document.createElement('div'); frame.id = 'demo-frame'; frame.setAttribute('aria-hidden', 'true'); document.body.appendChild(frame); }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'demo-bar'; bar.setAttribute('role', 'alert');
      bar.innerHTML = '<div class="tx"><b>⚠ デモ操作中（練習用）</b><span>ここで入れた伝票・会計は、実際の売上・歩合・顧客には入りません。</span></div><button class="btn small" data-demo="end">デモを終わる</button>';
      bar.onclick = function (e) { if (e.target.closest('[data-demo="end"]')) endDemo(); };
      document.body.appendChild(bar);
    }
  }
  function startDemo() {
    confirmBox('レジの練習（デモ）を始める', 'お店の売上や顧客には入らない、練習用の画面です。入れた内容は、終わると消えます。始めますか？', '練習を始める').then(function (ok) {
      if (!ok) return;
      POS.real = { list: POS.list, day: POS.day, tk: POS.tk, view: POS.view, tab: POS.tab, sheet: POS.sheet };
      POS.realList = POS.list;
      POS.demo = true; demoSeed();
      POS.list = []; POS.day = null; POS.tk = null; POS.view = 'list'; POS.sheet = false; POS.tab = 'セット・延長';
      POS.custs = null; POS.custAt = 0; POS.keep = {}; POS.castFor = '';
      demoChrome(true);
      toast('デモを始めました。これは練習用です');
      if (state.staffTab === 'pos') draw(); else goTab('pos');
    });
  }
  function endDemo(silent) {
    if (!POS.demo) return;
    POS.demo = false; DEMO = null;
    var r = POS.real || {};
    POS.list = r.list || []; POS.day = r.day || null; POS.tk = r.tk || null; POS.view = r.view || 'list'; POS.tab = r.tab || 'セット・延長'; POS.sheet = false;
    POS.real = null; POS.realList = null; POS.custs = null; POS.custAt = 0; POS.keep = {};
    demoChrome(false);
    if (!silent) toast('デモを終わりました。実際の画面に戻ります');
    if (POS.main && state.staffTab === 'pos') { refreshList(function () { draw(); }).catch(function () { draw(); }); draw(); }
    else if (window.staffTab && state.user && state.user.role !== 'admin' && $('#s-main')) staffTab();
  }
  window.posDemoOff = function () { endDemo(true); };
  /** デモ中に、ほかの画面（実際のデータ）へ移ろうとしたら、デモを終わるか確かめる。 */
  window.posDemoGuard = function (tab) {
    if (!POS.demo || tab === 'pos' || tab === 'cust') return true;
    confirmBox('デモを終わりますか？', 'ほかの画面は、実際のデータです。デモの内容は消えます。', 'デモを終わる').then(function (ok) {
      if (ok) { endDemo(true); staffTab(); } else { state.staffTab = 'pos'; staffTab(); }
    });
    return false;
  };

  /* ---------- 保存（順番に送る・再送する） ---------- */
  function setStatus(s) {
    POS.status = s;
    var el = document.getElementById('pos-sync');
    if (el) { el.className = 'sync ' + (s === 'ok' ? '' : s === 'saving' ? 'saving' : 'off'); el.innerHTML = '<i></i>' + (s === 'ok' ? (POS.demo ? '練習中' : '保存済み') : s === 'saving' ? '保存中…' : '通信できません（自動で再送します）'); }
  }
  function summaryOf(t) {
    return { id: t.id, date: t.date, status: t.status, name: t.name, isNew: t.isNew, people: t.people, total: t.total, version: t.version, openedAt: t.openedAt,
      endsAt: t.endsAt || 0, sysName: t.sys ? t.sys.name : '', sysId: t.sys ? t.sys.id : '', seat: t.seat, customerId: t.customerId, credit: 0 };
  }
  function touchList(t) {
    if (isDemoId(t.id) !== !!POS.demo) return;   // デモの伝票と実際の伝票を、混ぜない
    var found = false;
    POS.list = POS.list.map(function (x) { if (x.id === t.id) { found = true; var v = summaryOf(t); v.version = x.version; return v; } return x; });
    if (!found) POS.list.push(summaryOf(t));
  }
  function send(id, op) {
    op.oid = rid(12);
    if (POS.tk && POS.tk.id === id) { applyLocal(POS.tk, op); touchList(POS.tk); }
    (POS.q[id] = POS.q[id] || []).push(op);
    setStatus('saving');
    redraw();
    flush(id);
  }
  function flush(id) {
    if (POS.sending[id]) return;
    var batch = (POS.q[id] || []).slice(0, 30);
    if (!batch.length) { if (!Object.keys(POS.sending).some(function (k) { return POS.sending[k]; })) setStatus('ok'); return; }
    POS.sending[id] = true;
    api('apiPosOps', id, batch).then(function (r) {
      POS.sending[id] = false;
      if (!r) return;
      if (r.ok) {
        POS.q[id] = (POS.q[id] || []).slice(batch.length);
        if (!POS.q[id].length) { adopt(r.ticket); setStatus('ok'); } else flush(id);
        return;
      }
      // サーバーが受け付けなかった：この伝票の未送信の操作をやめ、サーバーの状態に合わせる
      POS.q[id] = [];
      if (r.ticket) adopt(r.ticket); else resync(id);
      toast(r.error || '保存できませんでした');
      setStatus('ok');
    }).catch(function () {
      POS.sending[id] = false;
      setStatus('off');
      setTimeout(function () { flush(id); }, 4000);
    });
  }
  function adopt(t) {
    if (!t) return;
    if (isDemoId(t.id) !== !!POS.demo) return;
    if (POS.tk && POS.tk.id === t.id && !(POS.q[t.id] && POS.q[t.id].length)) {
      POS.tk = t;
      if (t.sys === undefined) t.sys = null;
      calc(t);
    }
    touchList(t);
    redraw();
  }
  function resync(id) {
    api('apiPosTicket', id).then(function (r) { if (r && r.ok) adopt(r.ticket); }).catch(function () {});
  }
  function redraw() { if (POS.main && state.staffTab === 'pos' && !POS.holdDraw) draw(); }

  /* ---------- 定期の読み込み・時間のお知らせ ---------- */
  function refreshList(cb) {
    return api('apiPosList', null).then(function (d) {
      if (!d) return;
      if (!POS.demo) { POS.offset = d.now - Date.now(); POS.realList = d.tickets; }
      POS.list = d.tickets; POS.day = d.day;
      // 自分が開いている伝票が、ほかの端末で変わっていたら読み直す
      if (POS.tk && !(POS.q[POS.tk.id] && POS.q[POS.tk.id].length) && !POS.sending[POS.tk.id]) {
        var s = d.tickets.filter(function (x) { return x.id === POS.tk.id; })[0];
        if (s && s.version !== POS.tk.version && !document.querySelector('#modal-root .modal')) resync(POS.tk.id);
      }
      if (cb) cb();
    });
  }
  /** 時間のお知らせの対象：実際の伝票（デモ中も出す）と、デモ中はデモの伝票。 */
  function alertLists() {
    return POS.demo ? [{ list: POS.list, demo: true }, { list: POS.realList || [], demo: false }] : [{ list: POS.list, demo: false }];
  }
  /** デモ中に、実際の伝票の一覧だけを読む（時間のお知らせのため）。 */
  function refreshReal(cb) {
    return call('apiPosList', state.token, null).then(function (d) {
      if (!d) return;
      POS.offset = d.now - Date.now(); POS.realList = d.tickets;
      if (cb) cb();
    });
  }
  function checkAlerts() {
    var changed = false;
    alertLists().forEach(function (src) {
      src.list.forEach(function (t) {
        if (t.status !== 'open' || !t.endsAt) return;
        var rem = t.endsAt - sNow();
        var kind = rem <= 0 ? 'end' : rem <= 5 * 60000 ? 'soon' : '';
        if (!kind) return;
        var key = t.id + ':' + t.endsAt + ':' + kind;
        if (POS.alerted[key]) return;
        POS.alerted[key] = true;
        POS.alerts = POS.alerts.filter(function (a) { return !(a.id === t.id); });
        POS.alerts.push({ id: t.id, kind: kind, key: key, demo: src.demo });
        changed = true;
        beep(kind);
      });
    });
    // 閉じた伝票・延長して終了時刻が変わった伝票のお知らせは消す
    var before = POS.alerts.length;
    POS.alerts = POS.alerts.filter(function (a) {
      var lists = alertLists().filter(function (s) { return s.demo === !!a.demo; });
      var t = lists.length ? lists[0].list.filter(function (x) { return x.id === a.id; })[0] : null;
      return t && t.status === 'open' && a.key.indexOf(':' + t.endsAt + ':') > 0;
    });
    if (before !== POS.alerts.length) changed = true;
    if (changed) drawAlerts();
    updateClocks();
  }
  function beep(kind) {
    try { if (navigator.vibrate) navigator.vibrate(kind === 'end' ? [300, 150, 300, 150, 300] : [250, 120, 250]); } catch (e) { /* 振動できない端末 */ }
    if (!POS.sound) return;
    try {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      POS.audio = POS.audio || new A();
      var n = kind === 'end' ? 3 : 2;
      for (var i = 0; i < n; i++) {
        var o = POS.audio.createOscillator(), g = POS.audio.createGain();
        o.type = 'sine'; o.frequency.value = kind === 'end' ? 988 : 784;
        o.connect(g); g.connect(POS.audio.destination);
        var t0 = POS.audio.currentTime + i * 0.5;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
        o.start(t0); o.stop(t0 + 0.42);
      }
    } catch (e) { /* 音が出せない端末 */ }
  }
  function drawAlerts() {
    var el = document.getElementById('pos-alerts');
    if (!el) { el = document.createElement('div'); el.id = 'pos-alerts'; el.className = 'alerts'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
    el.innerHTML = POS.alerts.map(function (a) {
      var src = alertLists().filter(function (s) { return s.demo === !!a.demo; })[0];
      var t = src ? src.list.filter(function (x) { return x.id === a.id; })[0] : null;
      if (!t) return '';
      var s = POS.init ? sysById(t.sysId) : null;
      var exts = s ? [{ min: s.ext1Min, price: s.ext1Price }, { min: s.ext2Min, price: s.ext2Price }].filter(function (e) { return e.min > 0; }) : [];
      return '<div class="alert ' + a.kind + '"><b>' + (a.demo ? '［デモ］' : '') + esc(t.name || '新規') + '（' + num(t.people) + '名）' + (a.kind === 'end' ? ' の時間になりました' : ' 終了5分前です') + '</b>' +
        '<div class="acts">' + exts.map(function (e) { return '<button class="btn small" data-a="al-ext" data-id="' + esc(t.id) + '" data-min="' + e.min + '">延長' + e.min + '分（' + yen(e.price) + '/人）</button>'; }).join('') +
        '<button class="btn small ghost" data-a="al-open" data-id="' + esc(t.id) + '">伝票を開く</button><button class="btn small ghost" data-a="al-x" data-key="' + esc(a.key) + '">閉じる</button></div></div>';
    }).join('');
    el.onclick = function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var act = b.dataset.a;
      if (act === 'al-x') { POS.alerts = POS.alerts.filter(function (a) { return a.key !== b.dataset.key; }); drawAlerts(); }
      else if (act === 'al-open') {
        POS.alerts = POS.alerts.filter(function (a) { return a.id !== b.dataset.id; }); drawAlerts();
        if (POS.demo && !isDemoId(b.dataset.id)) endDemo(true);     // 実際の伝票のお知らせは、デモを終わって開く
        goTab('pos'); openTicket(b.dataset.id);
      }
      else if (act === 'al-ext') { extendById(b.dataset.id, Number(b.dataset.min)); }
    };
  }
  function extendById(id, min) {
    if (POS.tk && POS.tk.id === id) { send(id, { op: 'ext', extId: rid(8), min: min, party: earliestParty(POS.tk) }); POS.alerts = POS.alerts.filter(function (a) { return a.id !== id; }); drawAlerts(); toast('延長しました'); return; }
    api('apiPosTicket', id).then(function (r) {
      if (!r || !r.ok) return;
      return api('apiPosOps', id, [{ oid: rid(12), op: 'ext', extId: rid(8), min: min, party: earliestParty(r.ticket) }]).then(function (r2) {
        if (r2 && r2.ok) { toast('延長しました'); (isDemoId(id) ? refreshList : refreshReal)(function () { checkAlerts(); redraw(); }); } else toast((r2 && r2.error) || '延長できませんでした');
      });
    }).catch(function (err) { toast(err.message); });
  }
  function earliestParty(t) {
    var best = t.parties[0];
    t.parties.forEach(function (p) { if (p.endsAt && (!best.endsAt || p.endsAt < best.endsAt)) best = p; });
    return best.id;
  }
  function updateClocks() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ends]'), function (el) {
      var ends = Number(el.dataset.ends); if (!ends) return;
      var r = remText(ends);
      el.textContent = r.t; el.className = (el.dataset.cls || 'rem') + ' ' + r.c;
    });
  }
  function startBackground() {
    if (POS.poll) return;
    try { POS.sound = load('en_sound') === '1'; } catch (e) { POS.sound = false; }
    POS.poll = setInterval(function () {
      if (!state.user || !state.token) { stopBackground(); return; }
      if (document.hidden || !POS.init) return;
      POS.pollN++;
      var onPos = state.staffTab === 'pos' && POS.main;
      // デモ中も、実際の伝票の時間のお知らせは出す（実際の一覧だけを読み、デモの画面は触らない）
      if (POS.demo) { refreshReal(function () { checkAlerts(); }).catch(function () {}); return; }
      // 伝票の画面を開いているときは約6秒おき、ほかの画面では約18秒おき
      if (!onPos && POS.pollN % 3 !== 0) { checkAlerts(); return; }
      refreshList(function () { checkAlerts(); if (onPos) redraw(); }).catch(function () {});
    }, 6000);
    setInterval(function () { if (POS.init) updateClocks(); }, 15000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && POS.init && state.user) refreshList(function () { checkAlerts(); redraw(); }).catch(function () {}); });
    window.addEventListener('resize', function () { if (state.staffTab === 'pos') { var w = window.innerWidth >= 900; if (w !== POS.wide) redraw(); } });
  }
  function stopBackground() { if (POS.poll) { clearInterval(POS.poll); POS.poll = null; } POS.init = null; POS.tk = null; POS.q = {}; POS.alerts = []; POS.demo = false; DEMO = null; POS.real = null; POS.realList = null; demoChrome(false); var el = document.getElementById('pos-alerts'); if (el) el.remove(); }
  window.posStop = stopBackground;
  window.posBackground = function () { ensureInit(function () { refreshList(function () { checkAlerts(); }).catch(function () {}); startBackground(); }); };

  function ensureInit(cb) {
    if (POS.init) return cb();
    call('apiPosInit', state.token).then(function (d) {
      if (!d) return;
      POS.init = d; POS.offset = d.now - Date.now();
      if (!POS.tab) POS.tab = 'セット・延長';
      cb();
    }).catch(function (err) { if (POS.main) POS.main.innerHTML = failBox(err); });
  }
  function goTab(t) { state.staffTab = t; if (window.staffTab) staffTab(); }

  /* =========================================================
   * 伝票の画面
   * ======================================================= */
  window.posScreen = function (main) {
    POS.main = main;
    main.innerHTML = '<div class="loading">読み込み中…</div>';
    ensureInit(function () {
      refreshList(function () { startBackground(); setupEvents(main); draw(); }).catch(function (err) { main.innerHTML = failBox(err); });
    });
  };
  function setupEvents(main) {
    main.onclick = onClick;
    main.onpointerdown = onDown; main.onpointerup = onUp; main.onpointercancel = onUp; main.onpointerleave = onUp;
    main.oncontextmenu = function (e) { if (e.target.closest('.mi')) e.preventDefault(); };
  }
  var hold = null;
  function onDown(e) {
    var b = e.target.closest('.mi[data-menu]'); if (!b || e.target.closest('.mn')) return;
    hold = { el: b, done: false };
    hold.t = setTimeout(function () { hold.done = true; decItem(b.dataset.menu); }, 650);
  }
  function onUp() { if (hold) { clearTimeout(hold.t); } }

  function draw() {
    var main = POS.main; if (!main || state.staffTab !== 'pos') return;
    POS.wide = window.innerWidth >= 900;
    var staffEl = document.querySelector('.staff');
    var inTicket = POS.view === 'ticket' && POS.tk;
    if (staffEl) { staffEl.classList.toggle('wide', POS.wide); staffEl.classList.toggle('tk-open', !!inTicket && !POS.wide); }
    var keepScroll = window.scrollY;
    var h = '<div class="pos-wrap view-' + (inTicket ? 'ticket' : 'list') + '">' + listHTML();
    if (inTicket) h += centerHTML(POS.tk) + panelHTML(POS.tk) + barHTML(POS.tk);
    h += '</div>';
    var open = POS.sheet;
    main.innerHTML = h;
    var p = document.getElementById('tk-panel'); if (p && open) p.classList.add('open');
    setStatus(POS.status);
    updateClocks();
    if (inTicket) window.scrollTo(0, keepScroll);
  }

  function listHTML() {
    var d = POS.day || { total: 0, groups: 0, visits: 0, open: 0 };
    var open = POS.list.filter(function (t) { return t.status === 'open'; });
    var closed = POS.list.filter(function (t) { return t.status === 'closed'; });
    var h = '<aside class="pos-list"><section class="card sum-card"' + (POS.demo ? ' style="border:2px solid #C62828"' : '') + '><div class="row"><div class="muted">' +
      (POS.demo ? '<b style="color:#C62828;font-size:15px">デモ（練習）の画面です</b>' : '今日 ' + bizLabel() + ' の営業') + '</div>' +
      '<span id="pos-sync" class="sync"><i></i>保存済み</span></div>' +
      '<div class="big">' + yen(d.total) + '</div><div class="tiny">会計済み ' + num(d.groups) + '組・' + num(d.visits) + '名　開いている伝票 ' + num(open.length) + '</div>' +
      '<div class="chips" style="margin-top:4px"><button class="chip" data-a="attend">出勤</button><button class="chip' + (POS.sound ? ' on' : '') + '" data-a="sound">' + (POS.sound ? '🔔 音あり' : '🔕 音なし') + '</button>' +
      (POS.demo ? '<button class="chip demo" data-a="demo-end">デモを終わる</button>' : '<button class="chip demo-l" data-a="demo-start">レジの練習（デモ）</button>') + '</div>' +
      (POS.demo ? '<div class="tiny" style="color:#C62828;line-height:1.7">ここで入れた伝票・お客様・会計は、実際には残りません。メニューと料金だけ、実際の設定を使っています。</div>' : '') + '</section>' +
      '<button class="btn block" data-a="new" style="min-height:56px;font-size:17px">＋ 新しい伝票</button>';
    if (!open.length) h += '<div class="empty">開いている伝票はありません。<br>「新しい伝票」を押して始めます。</div>';
    open.forEach(function (t) {
      var r = t.endsAt ? remText(t.endsAt) : null;
      h += '<button class="tk-card' + (POS.tk && POS.tk.id === t.id ? ' on' : '') + '" data-a="open" data-id="' + esc(t.id) + '">' +
        '<div class="r1"><span class="nm">' + esc(t.name || '新規') + '</span><span class="am">' + yen(t.total) + '</span></div>' +
        '<div class="r2"><span>' + num(t.people) + '名</span><span>' + esc(t.sysName || '料金システム未選択') + '</span><span>' + hhmm(t.openedAt) + '〜</span>' +
        (r ? '<span class="' + 'rem ' + r.c + '" data-ends="' + t.endsAt + '">' + r.t + '</span>' : '') + '</div></button>';
    });
    if (closed.length) {
      h += '<details' + (POS.openClosed ? ' open' : '') + ' data-a-toggle="1"><summary class="link" style="cursor:pointer">会計済みの伝票（' + closed.length + '）</summary>' +
        closed.slice().reverse().map(function (t) {
          return '<button class="tk-card" data-a="open" data-id="' + esc(t.id) + '" style="margin-top:8px"><div class="r1"><span class="nm">' + esc(t.name || '新規') + '</span><span class="am">' + yen(t.total) + '</span></div>' +
            '<div class="r2"><span>' + num(t.people) + '名</span><span>' + esc(t.sysName) + '</span>' + (t.credit ? '<span class="rem soon">未収 ' + yen(t.credit) + '</span>' : '') + '</div></button>';
        }).join('') + '</details>';
    }
    return h + '</aside>';
  }

  function headHTML(t) {
    var s = t.sys;
    var r = t.endsAt ? remText(t.endsAt) : null;
    var h = '<div class="tk-head"><div class="top">' +
      '<button class="icon-btn sheet-x" data-a="back" aria-label="一覧へ戻る">' + ICON.left + '</button>' +
      '<button class="tname" data-a="name">' + esc(t.name || '新規のお客様') + ' <span class="tiny">✎</span></button>' +
      (POS.demo ? '<span class="badge" style="background:#C62828;color:#fff;font-size:13px;padding:5px 9px">デモ</span>' : '') +
      '<span id="pos-sync" class="sync"><i></i>' + (POS.demo ? '練習中' : '保存済み') + '</span></div><div class="chips">' +
      '<span class="stepper"><button data-a="pp-" aria-label="人数を減らす">−</button><b>' + t.people + '名</b><button data-a="pp+" aria-label="人数を増やす">＋</button></span>' +
      '<button class="chip' + (s ? ' on' : ' warn') + '" data-a="system">' + (s ? esc(s.name) + '　' + yen(s.price) : '料金システムを選ぶ') + '</button>' +
      '<button class="chip' + (t.mob.length ? ' on' : '') + '" data-a="mob">担当：' + (t.mob.length ? esc(t.mob.map(staffName).join('・')) : '未選択') + '</button>' +
      '<button class="chip' + (t.isNew ? '' : ' on') + '" data-a="isnew">' + (t.isNew ? '新規' : '顧客') + '</button>' +
      '<button class="chip' + (t.dohan ? ' gold' : '') + '" data-a="dohan">同伴' + (t.dohan ? 'あり' : '') + '</button>' +
      (r ? '<span class="rem ' + r.c + '" data-ends="' + t.endsAt + '" style="font-size:15px;padding:6px 12px">' + r.t + '</span>' : (s && !s.minutes ? '<span class="rem">時間無制限</span>' : '')) +
      (t.seat ? '<span class="tiny">席：' + esc(t.seat) + '</span>' : '') + '</div>' +
      (keepOf(t) ? '<div class="tiny">キープ中：' + esc(keepOf(t)) + '</div>' : '') + '</div>';
    return h;
  }
  function keepOf(t) {
    var k = POS.keep[t.customerId];
    return k && k.length ? k.map(function (b) { return b.name; }).join('、') : '';
  }

  var TABS = ['セット・延長', 'キャストドリンク', 'ショット', 'ボトル（焼酎・ウイスキー）', 'シャンパン・ワイン', 'ビール', '割物・その他'];
  function centerHTML(t) {
    var h = '<section class="pos-center">' + headHTML(t) + '<div class="tabs" role="tablist">' +
      TABS.map(function (x) { return '<button role="tab" data-a="tab" data-t="' + esc(x) + '" class="' + (POS.tab === x ? 'on' : '') + '">' + esc(x.replace('（焼酎・ウイスキー）', '')) + '</button>'; }).join('') + '</div>';
    if (POS.tab === 'セット・延長') h += setHTML(t);
    else if (POS.tab === 'キャストドリンク') h += castHTML(t);
    else h += itemsHTML(t, POS.tab);
    return h + '</section>';
  }
  function setHTML(t) {
    var h = '<div class="sub-h">料金システム（全員同じシステムです）</div><div class="grid-m" style="grid-template-columns:1fr">';
    POS.init.systems.forEach(function (s) {
      h += '<button class="sys-card' + (t.sys && t.sys.id === s.id && !t.sys.campaign ? ' on' : '') + '" data-a="sys" data-id="' + esc(s.id) + '"><b>' + esc(s.code + '. ' + s.name) + '　' + yen(s.price) + '</b><span>' + esc(s.note) + '</span></button>';
      POS.init.campaigns.filter(function (c) { return c.systemId === s.id; }).forEach(function (c) {
        h += '<button class="sys-card' + (t.sys && t.sys.campaign === c.name && t.sys.id === s.id ? ' on' : '') + '" data-a="sys" data-id="' + esc(s.id) + '" data-c="' + esc(c.id) + '"><b>' + esc(s.code + '. ' + s.name + '　' + c.name) + '　' + yen(c.price) + '</b><span>' + esc(c.note) + (c.to ? '（' + c.to.slice(5).replace('-', '/') + 'まで）' : '') + '</span></button>';
      });
    });
    h += '</div>';
    if (t.sys && t.sys.minutes > 0) {
      h += '<div class="sub-h">延長（1人あたり）</div><div class="chips">' + t.sys.ext.map(function (e) { return '<button class="chip" data-a="ext" data-min="' + e.min + '">延長 ' + e.min + '分　' + yen(e.price) + '</button>'; }).join('') + '</div>';
    }
    h += '<div class="sub-h">人の追加</div><div class="chips"><button class="chip" data-a="join">途中から入った人を追加</button></div>';
    return h;
  }
  function countOf(t, menuId, castFor) {
    var n = 0; t.lines.forEach(function (l) { if (!l.void && l.menuId === menuId && (l.castFor || '') === (castFor || '')) n += l.qty; });
    return n;
  }
  function tile(t, m, castFor) {
    var n = countOf(t, m.id, castFor);
    return '<button class="mi' + (n ? ' on' : '') + '" data-menu="' + esc(m.id) + '" data-a="item"><span class="n">' + esc(m.name) + '</span><span class="p">' + yen(m.price) + (m.adjustable ? '〜' : '') + '</span>' +
      (n ? '<span class="bd">×' + n + '</span><span class="mn" role="button" data-a="mn" aria-label="1つ減らす">−</span>' : '') + '</button>';
  }
  function itemsHTML(t, tab) {
    var items = POS.init.menu.filter(function (m) { return m.tab === tab; });
    var h = '';
    var cats = [];
    items.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat); });
    cats.forEach(function (c) {
      if (cats.length > 1) h += '<div class="sub-h">' + esc(c) + '</div>';
      h += '<div class="grid-m">' + items.filter(function (m) { return m.cat === c; }).map(function (m) { return tile(t, m, ''); }).join('') + '</div>';
    });
    if (tab === '割物・その他') {
      h += '<div class="sub-h">定価のないもの</div><div class="chips"><button class="chip" data-a="manual">＋ 金額を手入力（同伴料・指名料など）</button></div>';
    }
    if (!items.length && tab !== '割物・その他') h += '<div class="empty">この分類のメニューはまだありません。</div>';
    return h;
  }
  function castHTML(t) {
    var h = '<div class="sub-h">① だれのドリンクか選ぶ</div><div class="chips">' +
      POS.init.staff.map(function (s) { return '<button class="chip' + (POS.castFor === s.id ? ' on' : '') + '" data-a="castfor" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>'; }).join('') + '</div>';
    if (!POS.castFor) return h + '<div class="empty">先に、ドリンクをもらう人を選んでください。<br>選んだ人のドリンクバックになります。</div>';
    var items = POS.init.menu.filter(function (m) { return m.castable; });
    h += '<div class="sub-h">② ' + esc(staffName(POS.castFor)) + ' のドリンクを押す</div><div class="grid-m">' + items.map(function (m) { return tile(t, m, POS.castFor); }).join('') + '</div>';
    return h;
  }
  function barHTML(t) {
    return '<div class="tk-bar"><button class="tot" data-a="sheet"><span>合計（タップで明細）</span><b>' + yen(t.total) + '</b></button>' +
      '<button class="btn" data-a="pay"' + (t.sys ? '' : ' disabled') + '>会計へ</button></div>';
  }
  function panelHTML(t) {
    var h = '<aside class="pos-panel" id="tk-panel"><div class="pn-head"><b style="font-size:17px">' + esc(t.name || '新規') + ' の明細</b><button class="icon-btn sheet-x" data-a="sheet-close" aria-label="閉じる">✕</button></div>';
    if (t.status !== 'open') h += '<div class="msg ok">この伝票は' + (t.status === 'closed' ? '会計済み' : '取り消し済み') + 'です。</div>';
    if (t.sys) h += '<div class="ln sys"><div class="nm">' + esc(t.sys.name) + '<small>' + yen(t.sys.price) + ' × ' + t.people + '名</small></div><div></div><div class="pr">' + yen(t.sysTotal) + '</div></div>';
    t.exts.forEach(function (e) {
      if (e.void) return;
      var p = t.parties.filter(function (x) { return x.id === e.partyId; })[0];
      h += '<div class="ln sys"><div class="nm">延長 ' + e.min + '分<small>' + yen(e.price) + ' × ' + (p ? p.count : 0) + '名</small></div>' +
        (t.status === 'open' ? '<button class="xb" data-a="ext-x" data-id="' + esc(e.id) + '" aria-label="延長を取り消す">×</button>' : '<div></div>') + '<div class="pr">' + yen(e.price * (p ? p.count : 0)) + '</div></div>';
    });
    t.lines.forEach(function (l) {
      if (l.void) return;
      h += '<div class="ln"><div class="nm">' + esc(l.name) + (l.castFor ? '<small>（' + esc(staffName(l.castFor)) + 'のドリンク）</small>' : '') + (l.mtype ? '<small>' + esc(l.mtype) + '</small>' : '') + '</div>' +
        (t.status === 'open' ? '<div class="qt"><button data-a="ln-" data-id="' + esc(l.id) + '" aria-label="1つ減らす">−</button><b>' + l.qty + '</b><button data-a="ln+" data-id="' + esc(l.id) + '" aria-label="1つ増やす">＋</button></div>' : '<div><b>×' + l.qty + '</b></div>') +
        '<div class="pr">' + yen(l.price * l.qty) + '</div></div>';
    });
    t.discounts.forEach(function (d) {
      if (d.void) return;
      h += '<div class="ln"><div class="nm" style="color:var(--accent)">値引き<small>' + esc(d.note || '') + '</small></div>' +
        (t.status === 'open' ? '<button class="xb" data-a="undisc" data-id="' + esc(d.id) + '" aria-label="値引きを取り消す">×</button>' : '<div></div>') + '<div class="pr" style="color:var(--accent)">−' + yen(d.amount) + '</div></div>';
    });
    if (!t.sys && !t.lines.some(function (l) { return !l.void; })) h += '<div class="empty">まだ明細がありません。</div>';
    h += '<div class="tot-row"><span class="muted">合計（税込）</span><b>' + yen(t.total) + '</b></div>';
    if (t.status === 'open') {
      h += '<div class="acts"><button class="chip" data-a="disc">値引き</button><button class="chip" data-a="manual">金額を手入力</button><button class="chip" data-a="memo">席・メモ</button><button class="chip" data-a="entry">入店時刻</button>' +
        (t.sys && t.sys.minutes > 0 ? t.sys.ext.map(function (e) { return '<button class="chip" data-a="ext" data-min="' + e.min + '">延長' + e.min + '分</button>'; }).join('') : '') + '</div>' +
        '<div class="acts"><button class="btn" data-a="pay"' + (t.sys ? '' : ' disabled') + ' style="flex:1">会計へ</button><button class="btn danger small" data-a="void-tk">伝票を取り消す</button></div>';
    } else if (isAdmin() && t.status === 'closed') {
      h += '<div class="acts"><button class="btn ghost small" data-a="reopen">会計を取り消して開き直す（管理者）</button></div>';
    }
    if (t.memo) h += '<div class="tiny" style="line-height:1.7">メモ：' + esc(t.memo) + '</div>';
    if (isAdmin() && t.log && t.log.length) {
      h += '<div class="sub-h">取り消し・値引きの履歴（管理者だけ）</div>' + t.log.map(function (l) { return '<div class="tiny">' + hhmm(l.at) + ' ' + esc(l.by) + '：' + esc(l.kind) + ' ' + esc(l.detail) + ' ' + yen(l.amount) + '</div>'; }).join('');
    }
    return h + '</aside>';
  }

  /* ---------- 操作 ---------- */
  function openTicket(id) {
    POS.view = 'ticket'; POS.sheet = false;
    var s = POS.list.filter(function (x) { return x.id === id; })[0];
    POS.main.innerHTML = '<div class="loading">伝票を開いています…</div>';
    api('apiPosTicket', id).then(function (r) {
      if (!r) return;
      if (!r.ok) { toast(r.error); POS.view = 'list'; draw(); return; }
      POS.tk = r.ticket; calc(POS.tk);
      if (POS.tk.status === 'open' && !POS.tk.sys) POS.tab = 'セット・延長';
      loadKeep(POS.tk);
      draw();
    }).catch(function (err) { toast(err.message); POS.view = 'list'; draw(); });
  }
  function loadKeep(t) {
    if (!t.customerId || POS.keep[t.customerId]) return;
    api('apiCustGet', t.customerId).then(function (r) { if (r && r.ok) { POS.keep[t.customerId] = r.bottles; redraw(); } }).catch(function () {});
  }
  function newTicket() {
    var id = newId();
    POS.tk = blank(id); POS.view = 'ticket'; POS.tab = 'セット・延長'; POS.sheet = false;
    touchList(POS.tk);
    send(id, { op: 'set', k: 'isNew', v: true });
    draw();
    systemModal(true);
  }
  function addItem(menuId, price) {
    var t = POS.tk; if (!t || t.status !== 'open') return;
    var m = menuById(menuId); if (!m) return;
    var cast = POS.tab === 'キャストドリンク' ? POS.castFor : '';
    if (POS.tab === 'キャストドリンク' && !cast) { toast('先に、だれのドリンクか選んでください'); return; }
    if (m.adjustable && price == null) { priceModal(m, cast); return; }
    var ex = null;
    t.lines.forEach(function (l) { if (!l.void && l.menuId === menuId && (l.castFor || '') === cast && l.price === (price != null ? price : m.price)) ex = l; });
    if (ex && ex.qty < 99) send(t.id, { op: 'qty', id: ex.id, qty: ex.qty + 1 });
    else send(t.id, { op: 'add', lineId: rid(8), menuId: menuId, qty: 1, castFor: cast, price: price != null ? price : undefined });
  }
  function decItem(menuId) {
    var t = POS.tk; if (!t || t.status !== 'open') return;
    var cast = POS.tab === 'キャストドリンク' ? POS.castFor : '';
    var ex = null;
    t.lines.forEach(function (l) { if (!l.void && l.menuId === menuId && (l.castFor || '') === cast) ex = l; });
    if (!ex) return;
    send(t.id, { op: 'qty', id: ex.id, qty: ex.qty - 1 });
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) { /* 振動できない端末 */ }
  }
  function lineById(id) { var r = null; POS.tk.lines.forEach(function (l) { if (l.id === id) r = l; }); return r; }

  function onClick(e) {
    if (hold && hold.done) { hold = null; return; }
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.dataset.a, t = POS.tk;
    if (a === 'mn') { decItem(b.closest('.mi').dataset.menu); return; }
    switch (a) {
      case 'new': newTicket(); break;
      case 'open': openTicket(b.dataset.id); break;
      case 'back': POS.view = 'list'; POS.sheet = false; refreshList(function () { draw(); }).catch(function () { draw(); }); draw(); break;
      case 'sound':
        POS.sound = !POS.sound; store('en_sound', POS.sound ? '1' : '0');
        if (POS.sound) beep('soon');
        draw(); break;
      case 'attend': attendModal(); break;
      case 'demo-start': startDemo(); break;
      case 'demo-end': endDemo(); break;
      case 'tab': POS.tab = b.dataset.t; draw(); break;
      case 'castfor': POS.castFor = b.dataset.id; draw(); break;
      case 'item': addItem(b.dataset.menu); break;
      case 'sheet': POS.sheet = true; var p1 = document.getElementById('tk-panel'); if (p1) p1.classList.add('open'); break;
      case 'sheet-close': POS.sheet = false; var p2 = document.getElementById('tk-panel'); if (p2) p2.classList.remove('open'); break;
      case 'name': nameModal(); break;
      case 'pp-': if (t.status === 'open' && t.parties[0].count > 1) send(t.id, { op: 'people', v: t.parties[0].count - 1 }); break;
      case 'pp+': if (t.status === 'open') send(t.id, { op: 'people', v: t.parties[0].count + 1 }); break;
      case 'system': systemModal(false); break;
      case 'sys': send(t.id, b.dataset.c ? { op: 'system', id: b.dataset.id, campaignId: b.dataset.c } : { op: 'system', id: b.dataset.id }); toast('料金システムを選びました'); break;
      case 'mob': mobModal(); break;
      case 'isnew': if (t.status === 'open') send(t.id, { op: 'set', k: 'isNew', v: !t.isNew }); break;
      case 'dohan': if (t.status === 'open') send(t.id, { op: 'set', k: 'dohan', v: !t.dohan }); break;
      case 'ext': extModal(Number(b.dataset.min)); break;
      case 'ext-x': send(t.id, { op: 'extvoid', id: b.dataset.id }); break;
      case 'join': joinModal(); break;
      case 'ln+': var l1 = lineById(b.dataset.id); if (l1 && l1.qty < 99) send(t.id, { op: 'qty', id: l1.id, qty: l1.qty + 1 }); break;
      case 'ln-': var l2 = lineById(b.dataset.id); if (l2) send(t.id, { op: 'qty', id: l2.id, qty: l2.qty - 1 }); break;
      case 'disc': discModal(); break;
      case 'undisc': send(t.id, { op: 'undisc', id: b.dataset.id }); break;
      case 'manual': manualModal(); break;
      case 'memo': memoModal(); break;
      case 'entry': entryModal(); break;
      case 'pay': payModal(); break;
      case 'void-tk': voidTicket(); break;
      case 'reopen': reopenTicket(); break;
    }
  }
  // 「会計済みの伝票」の開閉を覚えておく
  document.addEventListener('toggle', function (e) { if (e.target && e.target.dataset && e.target.dataset.aToggle) POS.openClosed = e.target.open; }, true);

  /* ---------- ダイアログ ---------- */
  function mHead(title) { return '<h3>' + esc(title) + '</h3>'; }
  function closeBtn(label) { return '<button class="link" data-m="close">' + (label || '閉じる') + '</button>'; }
  function modal(html, onclick) {
    POS.holdDraw = true;
    var m = openModal(html);
    var done = function () { POS.holdDraw = false; closeModal(); redraw(); };
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'close') { done(); return; }
      onclick(b, done, m);
    });
    var bg = document.querySelector('#modal-root .modal-bg');
    if (bg) bg.addEventListener('click', function (e) { if (e.target === bg) { POS.holdDraw = false; redraw(); } });
    return { el: m, done: done };
  }

  function systemModal(first) {
    var t = POS.tk;
    var h = mHead('料金システムを選ぶ') + '<p class="muted" style="margin:-8px 0 0">グループの全員が同じシステムです。</p><div class="stack" style="gap:10px">';
    POS.init.systems.forEach(function (s) {
      h += '<button class="sys-card" data-m="sys" data-id="' + esc(s.id) + '"><b>' + esc(s.code + '. ' + s.name) + '　' + yen(s.price) + '</b><span>' + esc(s.note) + '</span></button>';
      POS.init.campaigns.filter(function (c) { return c.systemId === s.id; }).forEach(function (c) {
        h += '<button class="sys-card" data-m="sys" data-id="' + esc(s.id) + '" data-c="' + esc(c.id) + '"><b>' + esc(s.code + '. ' + s.name + '　' + c.name) + '　' + yen(c.price) + '</b><span>' + esc(c.note) + '</span></button>';
      });
    });
    h += '</div>' + closeBtn(first ? 'あとで選ぶ' : 'やめる');
    modal(h, function (b, done) { send(t.id, b.dataset.c ? { op: 'system', id: b.dataset.id, campaignId: b.dataset.c } : { op: 'system', id: b.dataset.id }); done(); });
  }
  function mobModal() {
    var t = POS.tk, sel = t.mob.slice();
    function body() {
      return mHead('担当（動員）') + '<p class="muted" style="margin:-8px 0 0;line-height:1.6">お客様を呼んだ人・主につく人を選びます。2人なら歩合は折半です。</p><div class="chips">' +
        POS.init.staff.map(function (s) { return '<button class="chip' + (sel.indexOf(s.id) >= 0 ? ' on' : '') + '" data-m="tg" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>'; }).join('') + '</div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">決定</button></div>';
    }
    var mm = modal(body(), function (b, done, el) {
      if (b.dataset.m === 'tg') { var i = sel.indexOf(b.dataset.id); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.id); el.innerHTML = body(); }
      else if (b.dataset.m === 'ok') { send(t.id, { op: 'set', k: 'mob', v: sel }); done(); }
    });
  }
  function attendModal() {
    api('apiPosAttend', bizKey()).then(function (r) {
      if (!r) return;
      var sel = r.staffIds.slice();
      function body() {
        return mHead('今日の出勤') + '<p class="muted" style="margin:-8px 0 0">今日出勤している人を選びます（売上の画面の「出勤」に出ます）。</p><div class="chips">' +
          POS.init.staff.map(function (s) { return '<button class="chip' + (sel.indexOf(s.id) >= 0 ? ' on' : '') + '" data-m="tg" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>'; }).join('') + '</div>' +
          '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">保存</button></div>';
      }
      modal(body(), function (b, done, el) {
        if (b.dataset.m === 'tg') { var i = sel.indexOf(b.dataset.id); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.id); el.innerHTML = body(); }
        else if (b.dataset.m === 'ok') { api('apiPosSetAttend', bizKey(), sel).then(function () { toast('出勤を保存しました'); }).catch(function (err) { toast(err.message); }); done(); }
      });
    }).catch(function (err) { toast(err.message); });
  }
  function priceModal(m, cast) {
    var mm = modal(mHead(m.name) + '<p class="muted" style="margin:-8px 0 0">金額を確認して、必要なら直してください。</p>' +
      '<div class="field"><label for="pm-p">金額（税込）</label><input class="input" id="pm-p" type="number" inputmode="numeric" value="' + m.price + '"></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">追加</button></div>',
      function (b, done, el) {
        var v = Math.round(Number(el.querySelector('#pm-p').value));
        if (!isFinite(v) || v < 0) { toast('金額を入力してください'); return; }
        var t = POS.tk;
        send(t.id, { op: 'add', lineId: rid(8), menuId: m.id, qty: 1, castFor: cast, price: v });
        done();
      });
  }
  function manualModal() {
    var t = POS.tk;
    modal(mHead('金額を手入力') + '<div class="field"><label for="mn-t">種類</label><select class="input" id="mn-t"><option>同伴料</option><option>指名料</option><option>その他</option></select></div>' +
      '<div class="field"><label for="mn-n">名前（任意）</label><input class="input" id="mn-n" placeholder="例：同伴料"></div>' +
      '<div class="field"><label for="mn-p">金額（税込）</label><input class="input" id="mn-p" type="number" inputmode="numeric" placeholder="例：3000"></div>' +
      '<div class="field"><label for="mn-s">同伴料を渡す人（同伴料のとき）</label><select class="input" id="mn-s"><option value="">選ばない</option>' +
      POS.init.staff.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">追加</button></div>',
      function (b, done, el) {
        var type = el.querySelector('#mn-t').value, name = el.querySelector('#mn-n').value.trim() || type;
        var v = Math.round(Number(el.querySelector('#mn-p').value));
        if (!isFinite(v) || v <= 0) { toast('金額を入力してください'); return; }
        send(t.id, { op: 'add', lineId: rid(8), name: name, price: v, qty: 1, mtype: type, payTo: type === '同伴料' ? el.querySelector('#mn-s').value : '' });
        done();
      });
  }
  function discModal() {
    var t = POS.tk;
    modal(mHead('値引き') + '<p class="muted" style="margin:-8px 0 0">値引きの履歴は、管理者が見られます。</p>' +
      '<div class="field"><label for="dc-p">値引きの金額（円）</label><input class="input" id="dc-p" type="number" inputmode="numeric" placeholder="例：500"></div>' +
      '<div class="field"><label for="dc-n">理由（任意）</label><input class="input" id="dc-n" placeholder="例：キャンペーン"></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">値引きする</button></div>',
      function (b, done, el) {
        var v = Math.round(Number(el.querySelector('#dc-p').value));
        if (!isFinite(v) || v <= 0) { toast('金額を入力してください'); return; }
        send(t.id, { op: 'disc', discId: rid(8), amount: v, note: el.querySelector('#dc-n').value.trim() });
        done();
      });
  }
  function memoModal() {
    var t = POS.tk;
    modal(mHead('席・メモ') + '<div class="field"><label for="mm-s">席（例：カウンター3、ボックスA）</label><input class="input" id="mm-s" value="' + esc(t.seat) + '"></div>' +
      '<div class="field"><label for="mm-m">メモ</label><textarea class="input" id="mm-m">' + esc(t.memo) + '</textarea></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">保存</button></div>',
      function (b, done, el) {
        send(t.id, { op: 'set', k: 'seat', v: el.querySelector('#mm-s').value }); send(t.id, { op: 'set', k: 'memo', v: el.querySelector('#mm-m').value }); done();
      });
  }
  function entryModal() {
    var t = POS.tk, p = t.parties[0];
    modal(mHead('入店時刻を直す') + '<p class="muted" style="margin:-8px 0 0">時間のお知らせは、この時刻から数えます。</p>' +
      '<div class="field"><label for="en-t">入店時刻</label><input class="input" id="en-t" type="time" value="' + hhmm(p.at) + '"></div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">保存</button></div>',
      function (b, done, el) {
        var v = el.querySelector('#en-t').value.split(':'); if (v.length < 2) return;
        var j = jst(sNow()); var hh = +v[0], mi = +v[1];
        // 朝6時までは前日の営業なので、0〜5時の入力は今日の日付、それ以外は営業日の日付として時刻を決める
        var base = Date.UTC(j.y, j.m - 1, j.d, hh, mi) - 9 * 3600000;
        if (base > sNow() + 3600000) base -= 86400000;
        send(t.id, { op: 'entryAt', party: p.id, v: base }); done();
      });
  }
  function extModal(min) {
    var t = POS.tk;
    var opt = t.sys && t.sys.ext.filter(function (e) { return e.min === min; })[0];
    if (!opt) return;
    var multi = t.parties.length > 1;
    modal(mHead('延長 ' + min + '分') + '<p class="muted" style="margin:-8px 0 0;line-height:1.7">1人 ' + yen(opt.price) + '。押したときだけ追加されます。</p>' +
      (multi ? '<div class="field"><label for="ex-p">だれの延長？</label><select class="input" id="ex-p">' + t.parties.map(function (p, i) { return '<option value="' + p.id + '">' + (i === 0 ? '最初のグループ' : hhmm(p.at) + ' に入った人') + '（' + p.count + '名）</option>'; }).join('') + '</select></div>' : '') +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">延長する</button></div>',
      function (b, done, el) {
        var pid = multi ? el.querySelector('#ex-p').value : t.parties[0].id;
        send(t.id, { op: 'ext', extId: rid(8), min: min, party: pid }); done();
      });
  }
  function joinModal() {
    var t = POS.tk, n = 1;
    function body() {
      return mHead('途中から入った人を追加') + '<p class="muted" style="margin:-8px 0 0;line-height:1.7">今の時刻を入店時刻として、別に時間を数えます。</p>' +
        '<div style="text-align:center"><span class="stepper"><button data-m="n-">−</button><b>' + n + '名</b><button data-m="n+">＋</button></span></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">やめる</button><button class="btn small" data-m="ok">追加</button></div>';
    }
    modal(body(), function (b, done, el) {
      if (b.dataset.m === 'n-') { n = Math.max(1, n - 1); el.innerHTML = body(); }
      else if (b.dataset.m === 'n+') { n = Math.min(20, n + 1); el.innerHTML = body(); }
      else if (b.dataset.m === 'ok') { send(t.id, { op: 'join', count: n, at: sNow() }); done(); }
    });
  }

  /* ---------- お客様を選ぶ・名前 ---------- */
  function loadCusts(cb) {
    if (POS.custs && Date.now() - POS.custAt < 60000) return cb(POS.custs);
    api('apiCustList').then(function (r) { if (!r) return; POS.custs = r.customers; POS.custAt = Date.now(); cb(POS.custs); }).catch(function (err) { toast(err.message); });
  }
  function matches(c, q) { q = q.trim().toLowerCase(); if (!q) return true; return (c.name + ' ' + c.nickname).toLowerCase().indexOf(q) >= 0; }
  function nameModal() {
    var t = POS.tk;
    loadCusts(function (list) {
      function body(q) {
        var rows = list.filter(function (c) { return matches(c, q); }).slice(0, 30);
        return mHead('お客様') + '<div class="field"><label for="nm-q">名前（探す／新しく入れる）</label><input class="input" id="nm-q" value="' + esc(q) + '" placeholder="例：宮崎" autocomplete="off"></div>' +
          '<div class="stack" style="gap:8px;max-height:42vh;overflow:auto">' +
          rows.map(function (c) { return '<button class="cust" data-m="pick" data-id="' + esc(c.id) + '"><div><div class="nm">' + esc(c.name) + '</div><div class="sb">' + esc(c.nickname) + (c.visits ? '　来店' + c.visits + '回' : '') + (c.bottles ? '　キープ' + c.bottles + '本' : '') + '</div></div></button>'; }).join('') +
          (!rows.length ? '<div class="tiny">一致するお客様はいません。</div>' : '') + '</div>' +
          (q.trim() ? '<button class="btn block" data-m="reg">「' + esc(q.trim()) + '」さんをお客様として登録して使う</button><button class="btn ghost block" data-m="free">登録せず、この名前だけ伝票に書く</button>' : '') +
          '<button class="btn ghost block" data-m="new">名前が分からない（新規）</button>' + closeBtn('やめる');
      }
      var q = '';
      var mm = modal(body(q), function (b, done, el) {
        var a = b.dataset.m, val = (el.querySelector('#nm-q') || {}).value || '';
        if (a === 'pick') {
          var c = list.filter(function (x) { return x.id === b.dataset.id; })[0];
          send(t.id, { op: 'set', k: 'customerId', v: c.id }); send(t.id, { op: 'set', k: 'name', v: c.name }); send(t.id, { op: 'set', k: 'isNew', v: false });
          api('apiCustGet', c.id).then(function (r) { if (r && r.ok) { POS.keep[c.id] = r.bottles; redraw(); } }).catch(function () {});
          done();
        } else if (a === 'reg') {
          api('apiCustSave', { name: val.trim() }).then(function (r) {
            if (!r) return;
            if (!r.ok && r.duplicate) { toast('同じ名前のお客様がいます。一覧から選んでください'); return; }
            if (!r.ok) { toast(r.error); return; }
            POS.custAt = 0;
            send(t.id, { op: 'set', k: 'customerId', v: r.id }); send(t.id, { op: 'set', k: 'name', v: val.trim() }); send(t.id, { op: 'set', k: 'isNew', v: false });
            done();
          }).catch(function (err) { toast(err.message); });
        } else if (a === 'free') { send(t.id, { op: 'set', k: 'name', v: val.trim() }); send(t.id, { op: 'set', k: 'customerId', v: '' }); done(); }
        else if (a === 'new') { send(t.id, { op: 'set', k: 'name', v: '新規' }); send(t.id, { op: 'set', k: 'customerId', v: '' }); send(t.id, { op: 'set', k: 'isNew', v: true }); done(); }
      });
      function bindInput() {
        var inp = mm.el.querySelector('#nm-q');
        inp.addEventListener('input', function () {
          q = inp.value;
          var pos = inp.selectionStart;
          mm.el.innerHTML = body(q);
          var n2 = mm.el.querySelector('#nm-q'); n2.focus(); n2.setSelectionRange(pos, pos);
          bindInput();
        });
      }
      bindInput();
    });
  }

  /* ---------- 会計 ---------- */
  function payModal() {
    var t = POS.tk;
    if (!t || t.status !== 'open') return;
    if (!t.sys) { toast('先に料金システムを選んでください'); return; }
    // 保存中の操作が終わってから、金額を確定する
    if ((POS.q[t.id] && POS.q[t.id].length) || POS.sending[t.id]) { toast('保存しています。少し待ってからもう一度押してください'); return; }
    var rows = [{ method: 'cash', amount: t.total, received: '' }], credit = 0;
    var methods = POS.init.paymethods;
    function sum() { return rows.reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0) + credit; }
    function mname(id) { var m = methods.filter(function (x) { return x.id === id; })[0]; return m ? m.name : id; }
    function body() {
      var diff = t.total - sum();
      var h = mHead(POS.demo ? 'デモの会計' : '会計') + (POS.demo ? '<div class="msg err" style="font-weight:700;line-height:1.6">⚠ デモです。実際の会計ではありません。売上にも、レジにも入りません。</div>' : '') + '<div class="row"><span class="muted">' + esc(t.name || '新規') + '　' + t.people + '名</span><b style="font-size:30px">' + yen(t.total) + '</b></div>';
      rows.forEach(function (r, i) {
        h += '<div class="stack" style="gap:6px"><div class="pay-row"><select class="input" data-m-in="method" data-i="' + i + '">' + methods.map(function (m) { return '<option value="' + m.id + '"' + (m.id === r.method ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select>' +
          '<input class="input" type="number" inputmode="numeric" data-m-in="amount" data-i="' + i + '" value="' + (r.amount === '' ? '' : r.amount) + '" aria-label="金額">' +
          (rows.length > 1 ? '<button class="icon-btn" data-m="rm" data-i="' + i + '" aria-label="この行を消す">✕</button>' : '<span></span>') + '</div>';
        if (r.method === 'cash') {
          h += '<div class="pay-row"><span class="muted">お預かり</span><input class="input" type="number" inputmode="numeric" data-m-in="received" data-i="' + i + '" value="' + (r.received === '' ? '' : r.received) + '" placeholder="任意"><span></span></div>';
          var recv = Number(r.received) || 0;
          if (recv && recv >= (Number(r.amount) || 0)) h += '<div class="pay-row"><span class="muted">おつり</span><b style="font-size:22px">' + yen(recv - (Number(r.amount) || 0)) + '</b><span></span></div>';
        }
        h += '</div>';
      });
      h += '<div class="chips"><button class="chip" data-m="add">＋ 支払い方法を追加（分けて払う）</button><button class="chip' + (credit ? ' warn' : '') + '" data-m="credit">未収（ツケ）' + (credit ? '：' + yen(credit) : '') + '</button></div>';
      h += '<div class="msg ' + (diff === 0 ? 'ok' : 'err') + '" style="font-size:15px">' + (diff === 0 ? '金額が合っています' : diff > 0 ? 'あと ' + yen(diff) + ' 足りません' : yen(-diff) + ' 多すぎます') + '</div>';
      h += '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="close">戻る</button><button class="btn" data-m="ok"' + (diff === 0 && !POS.payBusy ? '' : ' disabled') + ' style="min-width:150px' + (POS.demo ? ';background:#C62828' : '') + '">' + (POS.demo ? 'デモの会計を確定する' : '会計を確定する') + '</button></div>';
      return h;
    }
    var mm = modal(body(), function (b, done, el) {
      var a = b.dataset.m;
      if (a === 'add') { var rest = Math.max(0, t.total - sum()); rows.push({ method: methods.filter(function (m) { return m.id !== 'cash'; })[0].id, amount: rest, received: '' }); el.innerHTML = body(); }
      else if (a === 'rm') { rows.splice(Number(b.dataset.i), 1); el.innerHTML = body(); }
      else if (a === 'credit') {
        if (credit) credit = 0;
        else {
          var paid = rows.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
          if (paid >= t.total) { rows = [{ method: 'cash', amount: 0, received: '' }]; credit = t.total; }   // 全額を未収にする
          else credit = t.total - paid;                                                                      // 足りない分を未収にする
        }
        el.innerHTML = body();
      }
      else if (a === 'ok') {
        if (POS.payBusy) return;
        POS.payBusy = true;
        var pays = rows.filter(function (r) { return Number(r.amount) > 0; }).map(function (r) { return { method: r.method, amount: Math.round(Number(r.amount)), received: Number(r.received) || undefined }; });
        b.disabled = true; b.textContent = '確定しています…';
        api('apiPosPay', t.id, pays, credit).then(function (r) {
          POS.payBusy = false;
          if (!r) return;
          if (!r.ok) { toast(r.error || '会計できませんでした'); if (r.ticket) { POS.tk = r.ticket; calc(POS.tk); } el.innerHTML = body(); return; }
          POS.tk = r.ticket; calc(POS.tk); touchList(POS.tk);
          toast('会計しました（' + yen(r.ticket.total) + '）');
          POS.view = 'list'; POS.sheet = false;
          done();
          refreshList(function () { draw(); }).catch(function () { draw(); });
        }).catch(function (err) { POS.payBusy = false; toast(err.message); el.innerHTML = body(); });
      }
    });
    mm.el.addEventListener('input', function (e) {
      var inp = e.target.closest('[data-m-in]'); if (!inp) return;
      var r = rows[Number(inp.dataset.i)], k = inp.dataset.mIn;
      r[k] = inp.value;
      if (k === 'method') { mm.el.innerHTML = body(); return; }
      // 入力のたびに下の「合っています／足りません」だけを更新する（入力中の欄は触らない）
      var d = t.total - sum();
      var msg = mm.el.querySelector('.msg'); if (msg) { msg.className = 'msg ' + (d === 0 ? 'ok' : 'err'); msg.textContent = d === 0 ? '金額が合っています' : d > 0 ? 'あと ' + yen(d) + ' 足りません' : yen(-d) + ' 多すぎます'; }
      var ok = mm.el.querySelector('[data-m="ok"]'); if (ok) ok.disabled = d !== 0;
    });
    mm.el.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.mIn === 'received') mm.el.innerHTML = body(); });
  }
  function voidTicket() {
    var t = POS.tk;
    confirmBox('伝票を取り消す', '「' + (t.name || '新規') + '」の伝票を取り消します。取り消した記録は管理者が見られます。よろしいですか？', '取り消す').then(function (ok) {
      if (!ok) return;
      POS.q[t.id] = [];
      api('apiPosVoid', t.id, '').then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || '取り消せませんでした'); return; }
        toast('伝票を取り消しました'); POS.view = 'list'; POS.tk = null; refreshList(function () { draw(); }).catch(function () { draw(); });
      }).catch(function (err) { toast(err.message); });
    });
  }
  function reopenTicket() {
    var t = POS.tk;
    confirmBox('会計を取り消して開き直す', 'この伝票の会計を取り消し、修正できる状態に戻します。その日の売上・顧客の来店履歴も戻ります。', '開き直す').then(function (ok) {
      if (!ok) return;
      api('apiPosReopen', t.id, '').then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || '開き直せませんでした'); return; }
        POS.tk = r.ticket; calc(POS.tk); refreshList(function () { draw(); }).catch(function () { draw(); });
      }).catch(function (err) { toast(err.message); });
    });
  }

  /* =========================================================
   * 顧客の画面
   * ======================================================= */
  var C = { q: '' };
  window.custScreen = function (main) {
    main.onclick = null; main.onpointerdown = null; main.onpointerup = null; main.onpointercancel = null; main.onpointerleave = null;
    main.innerHTML = '<div class="loading">読み込み中…</div>';
    ensureInit(function () { loadCusts(function () { drawCust(main); }); });
  };
  function drawCust(main) {
    var list = (POS.custs || []).filter(function (c) { return matches(c, C.q); });
    list.sort(function (a, b) { return a.lastVisit < b.lastVisit ? 1 : a.lastVisit > b.lastVisit ? -1 : (a.name < b.name ? -1 : 1); });
    var h = '<h1 style="margin:4px 0 0;font-size:22px">顧客</h1>' +
      '<div class="field"><input class="input" id="c-q" type="search" placeholder="名前・呼び名で探す" value="' + esc(C.q) + '" autocomplete="off" aria-label="顧客を探す"></div>';
    if (!list.length) h += '<div class="empty">' + (C.q ? '一致するお客様はいません。' : 'お客様がまだ登録されていません。') + '</div>';
    h += '<div class="stack" style="gap:8px" id="c-list">' + list.slice(0, 60).map(function (c) {
      return '<button class="cust" data-c="' + esc(c.id) + '"><div><div class="nm">' + esc(c.name) + (c.nickname ? '<span class="tiny">　' + esc(c.nickname) + '</span>' : '') + '</div>' +
        '<div class="sb">' + (c.visits ? '来店' + c.visits + '回' : 'まだ来店なし') + (c.lastVisit ? '　前回 ' + esc(c.lastVisit.slice(5).replace('-', '/')) : '') + (c.bottles ? '　キープ' + c.bottles + '本' : '') + '</div></div><span class="tiny">›</span></button>';
    }).join('') + (list.length > 60 ? '<div class="tiny" style="text-align:center">ほか ' + (list.length - 60) + '名（名前で絞り込めます）</div>' : '') + '</div>' +
      '<button class="btn fab" id="c-new">＋ お客様を登録</button>';
    main.innerHTML = h;
    var inp = $('#c-q');
    inp.oninput = function () {
      C.q = inp.value;
      var pos = inp.selectionStart;
      drawCust(main);
      var n = $('#c-q'); n.focus(); n.setSelectionRange(pos, pos);
    };
    $('#c-new').onclick = function () { custForm(null, function () { POS.custAt = 0; loadCusts(function () { drawCust(main); }); }); };
    Array.prototype.forEach.call(main.querySelectorAll('[data-c]'), function (b) { b.onclick = function () { custDetail(b.dataset.c, main); }; });
  }
  function custDetail(id, main) {
    api('apiCustGet', id).then(function (r) {
      if (!r) return;
      if (!r.ok) { toast(r.error); return; }
      var c = r.customer;
      var h = '<h3>' + esc(c.name) + (c.nickname ? '<span class="tiny">　' + esc(c.nickname) + '</span>' : '') + '</h3>' +
        '<div class="tiny" style="line-height:1.8;margin-top:-8px">' + [c.company && '会社：' + esc(c.company), c.birthday && '誕生日：' + esc(c.birthday), c.likes && '好きなお酒：' + esc(c.likes)].filter(Boolean).join('　') +
        (isAdmin() ? (c.phone ? '<br>電話：' + esc(c.phone) : '') + (c.staffId ? '　担当：' + esc(staffName(c.staffId)) : '') : '') + '</div>' +
        (c.memo ? '<div class="copybox" style="user-select:text">' + esc(c.memo) + '</div>' : '') +
        '<div class="sec-t">キープ中のボトル</div>' +
        (r.bottles.length ? r.bottles.map(function (b) { return '<div class="visit"><div class="nm">' + esc(b.name) + '<small>' + esc(b.date.slice(5).replace('-', '/')) + '</small></div><button class="btn ghost small" data-m="empty" data-id="' + esc(b.id) + '">空にする</button></div>'; }).join('') : '<div class="tiny">なし</div>') +
        '<div class="sec-t">来店履歴（' + r.visits.length + '回）</div>' +
        (r.visits.length ? r.visits.slice(0, 20).map(function (v) { return '<div class="visit"><div class="nm">' + esc(dayLabel(v.date)) + '<small>' + v.people + '名' + (v.bottle ? '・' + esc(v.bottle) : '') + '</small></div><div class="amt">' + yen(v.amount) + '</div></div>'; }).join('') : '<div class="tiny">まだありません</div>') +
        '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-m="edit">編集</button><button class="btn small" data-m="close">閉じる</button></div>';
      var mm = openModal(h);
      mm.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        if (b.dataset.m === 'close') closeModal();
        else if (b.dataset.m === 'edit') { closeModal(); custForm(c, function () { POS.custAt = 0; loadCusts(function () { drawCust(main); }); }); }
        else if (b.dataset.m === 'empty') {
          api('apiCustBottleEmpty', b.dataset.id).then(function () { toast('空にしました'); POS.custAt = 0; POS.keep = {}; closeModal(); custDetail(id, main); }).catch(function (err) { toast(err.message); });
        }
      });
    }).catch(function (err) { toast(err.message); });
  }
  function custForm(c, done) {
    var h = '<h3>' + (c ? 'お客様の編集' : 'お客様を登録') + '</h3><form id="cf" class="stack"><div id="cm"></div>' +
      '<div class="field"><label for="cn">名前</label><input class="input" id="cn" value="' + esc(c ? c.name : '') + '" required></div>' +
      '<div class="field"><label for="ck">呼び名</label><input class="input" id="ck" value="' + esc(c ? c.nickname : '') + '"></div>' +
      '<div class="field"><label for="cb">誕生日（例：3-15）</label><input class="input" id="cb" value="' + esc(c ? c.birthday : '') + '"></div>' +
      '<div class="field"><label for="cc">会社名</label><input class="input" id="cc" value="' + esc(c ? c.company : '') + '"></div>' +
      '<div class="field"><label for="cl">好きなお酒</label><input class="input" id="cl" value="' + esc(c ? c.likes : '') + '"></div>' +
      (isAdmin() ? '<div class="field"><label for="cp">電話番号（管理者だけ）</label><input class="input" id="cp" type="tel" value="' + esc(c ? c.phone : '') + '"></div>' +
        '<div class="field"><label for="cs">担当（管理者だけ）</label><select class="input" id="cs"><option value="">なし</option>' + POS.init.staff.map(function (s) { return '<option value="' + esc(s.id) + '"' + (c && c.staffId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="field"><label for="cmm">メモ</label><textarea class="input" id="cmm">' + esc(c ? c.memo : '') + '</textarea></div>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost small" id="cx">やめる</button><button class="btn small" id="cs2">保存</button></div></form>';
    var m = openModal(h);
    $('#cx', m).onclick = closeModal;
    $('#cf', m).onsubmit = function (e) {
      e.preventDefault();
      var data = { id: c ? c.id : '', name: $('#cn', m).value, nickname: $('#ck', m).value, birthday: $('#cb', m).value, company: $('#cc', m).value, likes: $('#cl', m).value, memo: $('#cmm', m).value };
      if (isAdmin()) { data.phone = $('#cp', m).value; data.staffId = $('#cs', m).value; }
      var btn = $('#cs2', m); busy(btn, true);
      api('apiCustSave', data).then(function (r) {
        busy(btn, false);
        if (!r) return;
        if (!r.ok && r.duplicate) {
          confirmBox('同じ名前のお客様がいます', 'それでも別のお客様として登録しますか？（同じ人なら、一覧から選んでください）', '登録する').then(function (yes) {
            if (!yes) return;
            data.force = true; api('apiCustSave', data).then(function () { closeModal(); toast('保存しました'); done(); });
          });
          return;
        }
        if (!r.ok) { showMsg($('#cm', m), r.error); return; }
        closeModal(); toast('保存しました'); done();
      }).catch(function (err) { busy(btn, false); showMsg($('#cm', m), err.message); });
    };
  }
})();
