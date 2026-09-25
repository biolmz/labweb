/* ============================================================
   麦糟高值化课题组 · 课题网站 共用脚本
   每个页面都会引入本文件；所有绑定都做存在性判断，
   因此同一份脚本可安全地跑在首页与各内页上。
   依赖：search-index.js（站内索引，可选；缺失时仅检索本页）
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  /* 当前页面文件名，用于判断「本页」 */
  var CUR = (location.pathname.split('/').pop() || 'index.html');
  if (!/\.html?$/i.test(CUR)) CUR = 'index.html';

  /* ================= 1. 焦点图切换（仅首页有） ================= */
  (function () {
    var big = $('bigPic'), cap = $('bigCap');
    var btns = all('#thumbs button');
    if (!big || !btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (b.dataset.src) big.src = b.dataset.src;
        big.alt = b.dataset.alt || '';
        if (cap) cap.textContent = b.dataset.cap || '';
      });
    });
  })();

  /* ================= 2. 站内检索（跨栏目命中 + 本页高亮） ================= */
  var qInput = $('q'), pop = $('srchPop'), form = $('searchForm');
  var mainEl = document.querySelector('.col-main');
  var lastKw = '';

  function clearHits() {
    if (!mainEl) return;
    all('mark.hit', mainEl).forEach(function (m) {
      var p = m.parentNode;
      p.replaceChild(document.createTextNode(m.textContent), m);
      p.normalize();
    });
  }

  /* 在 root 内把所有匹配的文本节点包成 <mark class="hit">，返回命中数 */
  function markText(root, kw) {
    if (!root || !kw) return 0;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (!p || /^(SCRIPT|STYLE|MARK)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.toLowerCase().indexOf(kw) >= 0
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var targets = [], n;
    while ((n = walker.nextNode())) targets.push(n);
    var count = 0;
    targets.forEach(function (node) {
      var text = node.nodeValue, low = text.toLowerCase(), frag = document.createDocumentFragment();
      var pos = 0, at;
      while ((at = low.indexOf(kw, pos)) >= 0) {
        if (at > pos) frag.appendChild(document.createTextNode(text.slice(pos, at)));
        var mk = document.createElement('mark');
        mk.className = 'hit';
        mk.textContent = text.slice(at, at + kw.length);
        frag.appendChild(mk);
        count++;
        pos = at + kw.length;
      }
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
    return count;
  }

  /* 纯文本里数出现次数 */
  function countOcc(text, kw) {
    if (!text || !kw) return 0;
    var n = 0, at = 0;
    while ((at = text.indexOf(kw, at)) >= 0) { n++; at += kw.length; }
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function hidePop() {
    if (!pop) return;
    pop.className = 'srch-pop';
    pop.innerHTML = '';
  }

  function resetSearch() {
    clearHits();
    if (qInput) qInput.value = '';
    lastKw = '';
    hidePop();
  }

  function doSearch(e) {
    if (e) e.preventDefault();
    var kwRaw = (qInput && qInput.value || '').trim();
    clearHits();
    if (!kwRaw) { lastKw = ''; hidePop(); return; }
    var kw = kwRaw.toLowerCase();

    /* 本页：真实高亮并计数 */
    var localN = mainEl ? markText(mainEl, kw) : 0;
    lastKw = kwRaw;

    /* 其他栏目：查索引，只报命中数与入口 */
    var idx = window.SITE_INDEX || [];
    var others = [], sum = 0;
    for (var i = 0; i < idx.length; i++) {
      var it = idx[i];
      if (!it || !it.page || it.page === CUR) continue;
      var c = countOcc(String(it.text || '').toLowerCase(), kw);
      if (c > 0) { others.push({ page: it.page, title: it.title || it.page, n: c }); sum += c; }
    }
    others.sort(function (a, b) { return b.n - a.n; });

    var html = '<b>「' + esc(kwRaw) + '」</b> 本站共命中 <span class="n">' + (localN + sum) + '</span> 处';
    html += '<ul>';
    html += '<li>本页：' + (localN
      ? '命中 <span class="n">' + localN + '</span> 处，已高亮'
      : '未找到匹配内容') + '</li>';
    if (others.length) {
      var top = others.slice(0, 7);
      top.forEach(function (o) {
        html += '<li><a href="' + o.page + '">' + esc(o.title) + '</a>：'
              + '<span class="n">' + o.n + '</span> 处</li>';
      });
      if (others.length > top.length) {
        html += '<li class="grey">另有 ' + (others.length - top.length) + ' 个栏目亦有命中</li>';
      }
    } else if (!idx.length) {
      html += '<li class="grey">（未加载站内索引，仅检索本页）</li>';
    } else {
      html += '<li class="grey">其他栏目无命中</li>';
    }
    html += '</ul><a href="#" class="cls" id="srchClr">清除标记</a>';

    if (pop) { pop.innerHTML = html; pop.className = 'srch-pop on'; }

    var first = mainEl ? mainEl.querySelector('mark.hit') : null;
    if (first) window.scrollTo(0, first.getBoundingClientRect().top + window.pageYOffset - 90);
  }

  if (qInput) {
    if (form) form.addEventListener('submit', doSearch);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === 'srchClr') { e.preventDefault(); resetSearch(); return; }
      if (pop && pop.contains(t)) return;
      if (form && form.contains(t)) return;
      hidePop();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lastKw) resetSearch();
    });
  }

  /* ================= 3. 友情链接下拉（真实页面跳转） ================= */
  function bindGo(selId, btnId) {
    var sel = $(selId), btn = $(btnId);
    if (!sel || !btn) return;
    function go() {
      var v = sel.value;
      if (!v) return;
      location.href = v;
    }
    btn.addEventListener('click', go);
    sel.addEventListener('change', go);
  }
  bindGo('friendSel', 'friendGo');
  bindGo('ftSel', 'ftGo');

  /* ================= 4. 打印本页 ================= */
  var pr = $('printBtn');
  if (pr) pr.addEventListener('click', function (e) { e.preventDefault(); window.print(); });

  /* ================= 5. 返回顶部 ================= */
  var tt = $('toTop');
  if (tt) tt.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo(0, 0);
  });

  /* ================= 6. 访问统计 + 运行天数（纯本机计数，不做任何上报） ================= */
  var visitEl = $('visitNum');
  if (visitEl) {
    try {
      var KEY = 'bsg-web-visits';
      var n = parseInt(window.localStorage.getItem(KEY) || '0', 10);
      if (isNaN(n) || n < 0) n = 0;
      n += 1;
      window.localStorage.setItem(KEY, String(n));
      visitEl.textContent = String(n).padStart(8, '0');
    } catch (err) {
      visitEl.textContent = '00000001';
      var note = $('visitNote');
      if (note) note.textContent = '（浏览器禁用了本地存储，无法计数）';
    }
  }
  var runEl = $('runDays');
  if (runEl) {
    var start = new Date(2026, 7, 1);           /* 立项日 2026-08-01 */
    var days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    if (days < 0) days = 0;
    runEl.textContent = '课题组主页自 2026-08-01 立项日起已运行 ' + days + ' 天';
  }
})();
