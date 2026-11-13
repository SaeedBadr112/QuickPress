/* QuickPress app — renders all eight pages from a single data source.
   Works from file:// with plain scripts only (no import / fetch / modules). */
(function () {
  'use strict';
  var LANG = (document.documentElement.lang === 'en') ? 'en' : 'ar';
  var PAGE = document.body.getAttribute('data-page') || 'windows';
  var T = window.QP_I18N[LANG];
  var DATA = window.QP_DATA || [];
  var FILE_BY_LANG = { windows: 'windows', alt: 'alt', office: 'office', matrix: 'matrix' };

  /* ---------- favorites ---------- */
  var FAV_KEY = 'qp_favorites_v1';
  ['quickpress_favorites', 'quickpress_fav_shortcuts'].forEach(function (k) {
    try { localStorage.removeItem(k); } catch (e) { }
  });
  var favs = [];
  try { favs = JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { favs = []; }
  if (!Array.isArray(favs)) favs = [];
  function saveFavs() { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) { } }
  function isFav(id) { return favs.indexOf(id) > -1; }

  /* ---------- search normalization ---------- */
  var DIAC = /[\u064B-\u0652\u0670\u0640]/g;
  function normAr(s) {
    return String(s || '').replace(DIAC, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function normKeys(s) {
    return String(s || '').toLowerCase()
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '');
  }

  /* ---------- dom helpers ---------- */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var AR_RE = /[\u0600-\u06FF]/;

  /* ---------- key chips ---------- */
  function dispKeys(el) { return (LANG === 'en' && el.keysEn) ? el.keysEn : el.keys; }
  function copyText(el) { return (LANG === 'en' && el.copyEn) ? el.copyEn : el.copy; }
  function keyChips(raw) {
    var out = '';
    var parts = String(raw).split(/(\s*›\s*)/);
    parts.forEach(function (p) {
      if (/^\s*›\s*$/.test(p)) { out += '<span class="text-outline font-semibold text-xs px-0.5">›</span>'; return; }
      if (!p) return;
      // split steps into tokens by ' + ' keeping glue words
      var toks = p.trim().split(/(\s+\+\s+)/);
      toks.forEach(function (tk) {
        if (!tk) return;
        if (/^\s+\+\s+$/.test(tk)) { out += '<span class="text-outline font-semibold text-xs">+</span>'; return; }
        var glue = tk.trim();
        if (AR_RE.test(glue)) {
          out += '<span class="text-on-surface-variant text-body-sm font-body-sm px-1">' + esc(glue) + '</span>';
        } else if (/^[«»()…]+$/.test(glue)) {
          out += '<span class="text-outline text-xs px-0.5">' + esc(glue) + '</span>';
        } else if (glue === 'أو' || glue === 'or') {
          out += '<span class="text-primary text-xs font-semibold px-1">' + esc(glue) + '</span>';
        } else {
          out += '<kbd class="keycap inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded font-keycap-label text-keycap-label text-on-surface bg-gradient-to-b from-surface-container-highest to-surface-container-high shadow-[0_2px_0_0_#060e20,0_3px_5px_rgba(0,0,0,0.5)]">' + esc(glue) + '</kbd>';
        }
      });
    });
    return out;
  }

  /* ---------- toast ---------- */
  var toast, toastMsg, toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-8', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-8', 'pointer-events-none');
    }, 1900);
  }
  function copyShortcut(txt) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(fallback);
    } else fallback();
    showToast(T.copied(txt));
  }

  /* ---------- header ---------- */
  function pageFile(base, lang) { return base + '_' + lang + '.html'; }
  function renderHeader() {
    var h = el('header', 'fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_1px_8px_rgba(0,0,0,0.4)]');
    var wrap = el('div', 'h-14 w-full px-margin flex items-center justify-between gap-space-sm');
    // brand
    var brand = el('div', 'flex items-center gap-space-sm min-w-0');
    brand.innerHTML =
      '<img alt="QuickPress" class="h-9 w-9 object-contain rounded shadow-sm shrink-0" src="assets/img/logo.png" onerror="this.style.display=\'none\'">' +
      '<span class="text-on-surface font-bold text-lg tracking-wide select-none">QuickPress</span>' +
      '<span class="hidden md:inline font-arabic-title text-arabic-title text-on-surface-variant select-none tracking-tight">' + T.brandSub + '</span>' +
      '<span class="font-label-badge text-label-badge px-space-xs py-space-2xs rounded bg-surface-container-high text-primary font-medium select-none">v1.0.0</span>';
    wrap.appendChild(brand);
    // controls
    var ctrl = el('div', 'flex items-center gap-space-sm shrink-0');
    var aboutBtn = el('button', 'flex items-center gap-space-2xs px-space-sm py-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-primary transition-colors text-xs font-medium shadow-sm whitespace-nowrap');
    aboutBtn.id = 'qp-about-btn';
    aboutBtn.type = 'button';
    aboutBtn.setAttribute('aria-label', T.aboutTitleTag);
    aboutBtn.innerHTML = '<span class="material-symbols-outlined text-sm text-primary">info</span><span>' + esc(T.aboutBtn) + '</span>';
    aboutBtn.addEventListener('click', openAbout);
    ctrl.appendChild(aboutBtn);
    var toggle = el('div', 'flex items-center bg-[#131b2e] border border-[#31394d] rounded-lg p-0.5 text-xs font-medium cursor-pointer shadow-sm select-none');
    toggle.id = 'lang-toggle-btn';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', T.langName + ' / ' + T.other);
    toggle.innerHTML =
      '<button type="button" class="px-2.5 py-1 rounded ' + (LANG === 'en' ? 'bg-[#0078d4] text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5 transition-colors') + '">EN</button>' +
      '<button type="button" class="px-2.5 py-1 rounded ' + (LANG === 'ar' ? 'bg-[#0078d4] text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5 transition-colors') + '">العربية</button>';
    toggle.addEventListener('click', function () {
      try { localStorage.setItem('qp_lang', LANG === 'ar' ? 'en' : 'ar'); } catch (e) { }
      window.location.href = pageFile(FILE_BY_LANG[PAGE], LANG === 'ar' ? 'en' : 'ar');
    });
    ctrl.appendChild(toggle);
    // total chip
    var chip = el('div', 'hidden sm:flex items-center gap-space-xs px-space-sm py-0.5 rounded bg-surface-container text-on-surface-variant font-label-badge text-label-badge');
    chip.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-secondary"></span><span>' + T.totalChip(DATA.length) + '</span>';
    ctrl.appendChild(chip);
    wrap.appendChild(ctrl);
    h.appendChild(wrap);
    // nav row
    var navrow = el('div', 'w-full px-margin pb-space-xs');
    var nav = el('nav', 'flex items-center gap-space-xs overflow-x-auto select-none');
    nav.setAttribute('aria-label', 'main');
    var order = ['windows', 'alt', 'office', 'matrix'];
    order.forEach(function (p) {
      var active = (p === PAGE);
      var a = el('a', 'flex items-center px-space-md py-1 rounded-t transition-colors whitespace-nowrap ' +
        (active ? 'bg-surface-container text-primary font-semibold shadow-[inset_0_-2px_0_0_#0078d4]' : 'text-body-sm font-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'));
      a.href = pageFile(p, LANG);
      if (active) a.setAttribute('aria-current', 'page');
      a.textContent = T.tabs[p];
      nav.appendChild(a);
    });
    navrow.appendChild(nav);
    h.appendChild(navrow);
    document.getElementById('qp-header').appendChild(h);
  }

  /* ---------- hero + toolbar ---------- */
  var searchInput, resultsCount, favBadge, activeFilter = 'all', altCat = 'all';
  function heroBlock() {
    var sec = el('section', 'relative w-full px-margin py-space-lg bg-surface-container-low overflow-hidden');
    sec.innerHTML =
      '<div class="absolute -top-24 -start-20 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>' +
      '<div class="absolute -bottom-20 end-1/4 w-80 h-80 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none"></div>';
    var inner = el('div', 'relative flex flex-col md:flex-row md:items-center md:justify-between gap-space-lg w-full');
    var right = el('div', 'flex items-start gap-space-lg');
    var logoBox = el('div', 'relative p-space-sm rounded-xl bg-surface-container shadow-md flex items-center justify-center shrink-0');
    var imgMap = { windows: 'win.png', alt: 'alt.png', office: 'office.png', matrix: 'logo.png' };
    logoBox.innerHTML = '<img alt="' + esc(T.titles[PAGE]) + '" class="w-12 h-12 rounded object-contain" src="assets/img/' + imgMap[PAGE] + '" onerror="this.style.display=\'none\'">' +
      '<div class="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-primary ring-2 ring-surface-container"></div>';
    right.appendChild(logoBox);
    var ttl = el('div', 'flex flex-col');
    ttl.innerHTML =
      '<div class="flex items-center gap-space-sm flex-wrap"><h1 class="font-headline-lg text-headline-lg text-on-surface">' + esc(T.titles[PAGE]) + '</h1>' +
      '<span class="font-label-badge text-label-badge px-space-xs py-0.5 rounded bg-primary-container text-on-primary-container font-semibold tracking-wide uppercase">' + esc(T.badges[PAGE]) + '</span></div>' +
      '<p class="font-arabic-body text-arabic-body text-on-surface-variant mt-space-2xs max-w-2xl">' + esc(T.subtitles[PAGE]) + '</p>';
    right.appendChild(ttl);
    inner.appendChild(right);
    var strip = el('div', 'flex items-center gap-space-md shrink-0 bg-surface-container/60 p-space-sm rounded-xl backdrop-blur-md');
    strip.innerHTML =
      '<div class="flex flex-col items-center px-space-md py-space-xs text-center"><span class="font-headline-md text-headline-md text-primary font-bold" id="metric-count">' + DATA.length + '</span><span class="font-label-badge text-label-badge text-on-surface-variant">' + T.metrics.count + '</span></div>' +
      '<div class="w-px h-8 bg-surface-container-highest"></div>' +
      '<div class="flex flex-col items-center px-space-md py-space-xs text-center"><span class="font-headline-md text-headline-md text-secondary font-bold">' + T.metrics.compatVal + '</span><span class="font-label-badge text-label-badge text-on-surface-variant">' + T.metrics.compat + '</span></div>' +
      '<div class="w-px h-8 bg-surface-container-highest"></div>' +
      '<div class="flex flex-col items-center px-space-md py-space-xs text-center"><span class="font-headline-md text-headline-md text-tertiary-fixed-dim font-bold">' + T.metrics.copyVal + '</span><span class="font-label-badge text-label-badge text-on-surface-variant">' + T.metrics.copy + '</span></div>';
    inner.appendChild(strip);
    sec.appendChild(inner);
    return sec;
  }

  /* ---------- horizontal scroll affordance (blinking edge arrows) ---------- */
  var arrowStyleAdded = false;
  function ensureArrowStyle() {
    if (arrowStyleAdded) return;
    arrowStyleAdded = true;
    var st = document.createElement('style');
    st.id = 'qp-scroll-arrow-style';
    st.textContent =
      '@keyframes qpArrowBlink{0%,100%{opacity:.15}50%{opacity:1}}' +
      '.qp-scroll-arrow{animation:qpArrowBlink 1.4s ease-in-out infinite;}' +
      '.qp-scroll-arrow:hover,.qp-scroll-arrow:focus{animation-play-state:paused;opacity:1;}' +
      '.qp-scroll-fade{transition:opacity .2s ease;}';
    document.head.appendChild(st);
  }
  function addScrollArrows(row, wrap, opts) {
    if (!row || row.getAttribute('data-hscroll') === '1') return;
    row.setAttribute('data-hscroll', '1');
    ensureArrowStyle();
    var isRtl = (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
    var physStart = isRtl ? 'right' : 'left';
    var physEnd = isRtl ? 'left' : 'right';
    function arrowLabel(phys) {
      var ar = { right: 'مرر نحو اليمين', left: 'مرر نحو اليسار' };
      var en = { right: 'Scroll right', left: 'Scroll left' };
      return (LANG === 'ar' ? ar : en)[phys];
    }
    function mkFade(phys) {
      var d = document.createElement('div');
      d.className = 'qp-scroll-fade';
      d.style.cssText = 'position:absolute;top:0;bottom:0;width:30px;pointer-events:none;z-index:1;' + phys + ':0;' +
        'background:linear-gradient(to ' + (phys === 'right' ? 'left' : 'right') + ', #0b1326, rgba(11,19,38,0));';
      return d;
    }
    function mkArrow(towardStart) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qp-scroll-arrow';
      b.style.cssText = 'position:absolute;top:50%;transform:translateY(-50%);width:30px;height:30px;' +
        'border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:2;cursor:pointer;padding:0;' +
        'background:#222a3d;color:#dae2fd;border:1px solid #404752;box-shadow:0 2px 6px rgba(0,0,0,.5);';
      b.setAttribute('aria-label', arrowLabel(towardStart ? physStart : physEnd));
      var ic = document.createElement('span');
      ic.className = 'material-symbols-outlined';
      ic.style.cssText = 'font-size:18px;line-height:1;';
      ic.textContent = towardStart ? (isRtl ? 'chevron_right' : 'chevron_left') : (isRtl ? 'chevron_left' : 'chevron_right');
      b.appendChild(ic);
      b.addEventListener('click', function () {
        var step = Math.max(140, Math.round(row.clientWidth * 0.85));
        var delta = towardStart ? (isRtl ? step : -step) : (isRtl ? -step : step);
        try { row.scrollBy({ left: delta, behavior: 'smooth' }); } catch (e) { row.scrollLeft += delta; }
        update();
      });
      return b;
    }
    var fades = { start: mkFade(physStart), end: mkFade(physEnd) };
    var arrows = { start: mkArrow(true), end: mkArrow(false) };
    arrows.start.style[physStart] = '0px';
    arrows.end.style[physEnd] = '0px';
    wrap.style.position = 'relative';
    wrap.appendChild(row);
    wrap.appendChild(fades.start); wrap.appendChild(fades.end);
    wrap.appendChild(arrows.start); wrap.appendChild(arrows.end);
    function update() {
      var max = row.scrollWidth - row.clientWidth;
      var show = max > 2;
      var sl = show ? row.scrollLeft : 0;
      var atStart = Math.abs(sl) < 2;
      var atEnd = Math.abs(sl) >= max - 2;
      arrows.start.style.display = (show && !atStart) ? 'flex' : 'none';
      arrows.end.style.display = (show && !atEnd) ? 'flex' : 'none';
      fades.start.style.opacity = (show && !atStart) ? '1' : '0';
      fades.end.style.opacity = (show && !atEnd) ? '1' : '0';
    }
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    if (window.ResizeObserver) { try { new ResizeObserver(update).observe(row); } catch (e) { } }
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(update);
    setTimeout(update, 300);
    setTimeout(update, 1000);
    requestAnimationFrame(update);
    // vertical wheel over the row scrolls it horizontally while there is room
    // (opts.noWheel disables it — e.g. the office columns keep the wheel for their inner lists)
    if (!(opts && opts.noWheel)) row.addEventListener('wheel', function (ev) {
      var max = row.scrollWidth - row.clientWidth;
      if (max <= 2) return;
      if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
      var k = ev.deltaMode === 1 ? 33 : (ev.deltaMode === 2 ? row.clientHeight : 1);
      var d = ev.deltaY * k;
      var sl = row.scrollLeft;
      var atStart = Math.abs(sl) < 2;
      var atEnd = Math.abs(sl) >= max - 2;
      if ((d > 0 && atEnd) || (d < 0 && atStart)) return;
      ev.preventDefault();
      row.scrollLeft += isRtl ? -d : d;
      update();
    }, { passive: false });
    update();
  }

  function toolbarBlock(pills, extraCtrl) {
    var box = el('div', 'w-full px-margin pt-space-md pb-space-sm flex flex-col gap-space-md');
    var row = el('div', 'flex flex-col sm:flex-row sm:items-center justify-between gap-space-md');
    var searchWrap = el('div', 'relative flex-1 max-w-2xl');
    searchWrap.innerHTML =
      '<span class="material-symbols-outlined absolute start-space-md top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none">search</span>' +
      '<input id="qp-search" type="text" placeholder="' + esc(T.searchPh) + '" class="w-full bg-surface-container text-on-surface placeholder:text-outline text-body-md font-body-md ps-11 pe-28 py-space-sm rounded-lg focus:outline-none focus:bg-surface-container-highest transition-colors shadow-inner">' +
      '<div class="absolute end-space-sm top-1/2 -translate-y-1/2 flex items-center gap-space-2xs pointer-events-none">' +
      '<span dir="ltr" class="flex items-center gap-space-2xs">' +
      '<kbd class="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-keycap-label text-keycap-label shadow-sm">Ctrl</kbd>' +
      '<span class="text-outline text-xs">+</span>' +
      '<kbd class="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-keycap-label text-keycap-label shadow-sm">K</kbd></span></div>';
    row.appendChild(searchWrap);
    var countWrap = el('div', 'flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container self-start sm:self-auto');
    countWrap.innerHTML = '<span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span><span id="qp-results-count" class="font-label-badge text-label-badge text-on-surface-variant font-medium"></span>';
    row.appendChild(countWrap);
    if (extraCtrl) row.appendChild(extraCtrl);
    box.appendChild(row);
    var pillsRow = el('div', 'flex items-center gap-space-xs overflow-x-auto pb-space-2xs text-on-surface-variant select-none');
    pillsRow.id = 'qp-filters';
    pills.forEach(function (p) { pillsRow.appendChild(p); });
    var pillsWrap = el('div', '');
    pillsWrap.appendChild(pillsRow);
    addScrollArrows(pillsRow, pillsWrap);
    box.appendChild(pillsWrap);
    return box;
  }

  function pill(label, filter, extraCls, extraHtml) {
    var b = el('button', 'filter-pill px-space-md py-1.5 rounded text-body-sm font-body-sm whitespace-nowrap transition-all ' +
      (filter === 'all' ? 'bg-primary-container text-on-primary-container font-semibold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high') + ' ' + (extraCls || ''));
    b.setAttribute('data-filter', filter);
    b.type = 'button';
    b.innerHTML = label + (extraHtml || '');
    return b;
  }
  function exportBtn() {
    var b = el('button', 'px-space-md py-1.5 rounded text-body-sm font-body-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-space-xs shadow-sm hover:text-primary whitespace-nowrap');
    b.id = 'qp-export-btn'; b.type = 'button';
    b.innerHTML = '<span class="material-symbols-outlined text-sm text-primary">ios_share</span><span>' + T.exportFav + '</span>';
    b.addEventListener('click', exportFavoritesCsv);
    return b;
  }
  function printBtn() {
    var b = el('button', 'px-space-md py-1.5 rounded text-body-sm font-body-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-space-xs shadow-sm hover:text-primary whitespace-nowrap');
    b.type = 'button';
    b.innerHTML = '<span class="material-symbols-outlined text-sm text-primary">print</span><span>' + T.print + '</span>';
    b.addEventListener('click', function () { window.print(); });
    return b;
  }
  function favPill() {
    var b = pill('<span class="material-symbols-outlined text-sm text-tertiary-fixed-dim">star</span><span>' + T.filterFav + '</span><span id="qp-fav-badge" class="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-xs font-semibold text-tertiary-fixed-dim">0</span>', 'favorites');
    b.title = T.favBadgeTitle;
    return b;
  }

  /* ---------- cards ---------- */
  function cardEl(e) {
    var card = el('div', 'shortcut-card group flex items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all shadow-sm');
    card.setAttribute('data-id', e.id);
    var txt = el('div', 'flex flex-col min-w-0 flex-1');
    txt.innerHTML = '<span class="font-arabic-title text-arabic-title text-on-surface font-medium truncate">' + esc(LANG === 'en' ? e.en.title : e.ar.title) + '</span>' +
      ((LANG === 'en' ? e.en.desc : e.ar.desc) ? '<span class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">' + esc(LANG === 'en' ? e.en.desc : e.ar.desc) + '</span>' : '');
    card.appendChild(txt);
    var side = el('div', 'flex items-center gap-space-sm shrink-0');
    var keysBox = el('div', 'flex items-center gap-space-xs direction-ltr');
    keysBox.setAttribute('dir', 'ltr');
    keysBox.innerHTML = keyChips(dispKeys(e));
    side.appendChild(keysBox);
    var favB = el('button', 'fav-btn p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-tertiary-fixed-dim transition-colors shrink-0');
    favB.type = 'button';
    favB.setAttribute('aria-label', T.filterFav);
    favB.setAttribute('data-fav', e.id);
    favB.innerHTML = '<span class="material-symbols-outlined text-base">star</span>';
    favB.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleFav(e.id);
    });
    side.appendChild(favB);
    var cpB = el('button', 'copy-btn p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-primary transition-colors shrink-0');
    cpB.type = 'button';
    cpB.setAttribute('aria-label', T.copied(''));
    cpB.setAttribute('data-copy', copyText(e));
    cpB.innerHTML = '<span class="material-symbols-outlined text-base">content_copy</span>';
    cpB.addEventListener('click', function (ev) { ev.stopPropagation(); copyShortcut(copyText(e)); });
    side.appendChild(cpB);
    card.appendChild(side);
    return card;
  }

  function sectionEl(id, labelEn, cards, badgeText) {
    var sec = el('section', 'shortcut-category-group flex flex-col gap-space-md');
    sec.setAttribute('data-category', id);
    sec.setAttribute('data-sec-id', id);
    sec.style.contentVisibility = 'auto';
    sec.style.containIntrinsicSize = 'auto 400px';
    var head = el('div', 'flex items-center justify-between pb-space-2xs flex-wrap gap-space-xs');
    head.innerHTML =
      '<div class="flex items-center gap-space-sm"><span class="p-1.5 rounded bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-base">category</span></span>' +
      '<h2 class="font-headline-md text-headline-md text-on-surface">' + esc(labelEn) + '</h2>' +
      '<span class="font-label-badge text-label-badge text-on-surface-variant px-space-xs py-0.5 rounded bg-surface-container">' + esc(badgeText || '') + '</span></div>' +
      '<span class="font-label-badge text-label-badge text-outline">' + esc(labelEn) + '</span>';
    sec.appendChild(head);
    var grid = el('div', 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md');
    cards.forEach(function (c) { grid.appendChild(c); });
    sec.appendChild(grid);
    return sec;
  }

  function emptyState() {
    var d = el('div', 'hidden flex-col items-center justify-center py-space-2xl text-center');
    d.id = 'favoritesEmptyState';
    d.innerHTML = '<span class="material-symbols-outlined text-5xl text-outline mb-space-sm">star_border</span>' +
      '<p class="font-arabic-title text-arabic-title text-on-surface">' + T.emptyFav + '</p>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">' + T.emptyFavHint + '</p>';
    return d;
  }

  /* ---------- favorites ---------- */
  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i > -1) { favs.splice(i, 1); showToast(T.favRemoved); }
    else { favs.push(id); showToast(T.favAdded); }
    saveFavs();
    updateFavStates();
  }
  function updateFavStates() {
    var badge = document.getElementById('qp-fav-badge');
    if (badge) badge.textContent = favs.length;
    document.querySelectorAll('[data-fav]').forEach(function (b) {
      var on = isFav(b.getAttribute('data-fav'));
      var ic = b.querySelector('.material-symbols-outlined');
      if (on) { b.classList.add('text-tertiary-fixed-dim'); b.classList.remove('text-outline'); if (ic) ic.style.fontVariationSettings = "'FILL' 1, 'wght' 600"; }
      else { b.classList.remove('text-tertiary-fixed-dim'); b.classList.add('text-outline'); if (ic) ic.style.fontVariationSettings = "'FILL' 0, 'wght' 400"; }
    });
    applyFilters();
  }

  /* ---------- filtering ---------- */
  function elMatchesFilters(e) {
    if (activeFilter === 'favorites' && !isFav(e.id)) return false;
    if (PAGE === 'alt' && altCat !== 'all') {
      if (e.section !== 'alt-codes') return false;
      if (e.category !== altCat) return false;
    }
    if (activeFilter !== 'all' && activeFilter !== 'favorites') {
      if (PAGE === 'office') {
        if (e.app !== activeFilter) return false;
      } else if (e.section !== activeFilter) return false;
    }
    return true;
  }
  function elMatchesSearch(e, q) {
    if (!q) return true;
    var nq = normAr(q), kq = normKeys(q);
    if (normAr((LANG === 'en' ? e.en.title : e.ar.title) + ' ' + (LANG === 'en' ? e.en.desc : e.ar.desc)).indexOf(nq) > -1) return true;
    if (normAr(e.ar.title + ' ' + e.ar.desc).indexOf(nq) > -1) return true;
    if (normAr(e.en.title + ' ' + e.en.desc).indexOf(nq) > -1) return true;
    if (kq && normKeys(e.keys + ' ' + (e.keysEn || '') + ' ' + e.copy).indexOf(kq) > -1) return true;
    for (var i = 0; i < (e.tags || []).length; i++) {
      if (normAr(e.tags[i]).indexOf(nq) === 0 && nq.length > 1) return true;
    }
    return false;
  }
  function applyFilters() {
    var q = searchInput ? searchInput.value.trim() : '';
    var shown = 0;
    var groups = document.querySelectorAll('[data-group-els]');
    groups.forEach(function (grp) {
      var ids = JSON.parse(grp.getAttribute('data-group-els'));
      var vis = 0;
      ids.forEach(function (id) {
        var card = grp.querySelector('[data-id="' + id + '"]');
        if (!card) return;
        var e = byId[id];
        var ok = elMatchesFilters(e) && elMatchesSearch(e, q);
        card.classList.toggle('hidden', !ok);
        if (ok) vis++;
      });
      shown += vis;
      var sec = grp.closest('.shortcut-category-group') || grp.closest('[data-col-wrap]') || grp.closest('section');
      if (sec) sec.classList.toggle('hidden', vis === 0 && ids.length > 0);
      var sub = grp.querySelector('[data-sub-head]');
      if (sub) sub.classList.toggle('hidden', vis === 0);
    });
    if (resultsCount) resultsCount.textContent = T.resultsCount(shown, byIdList(PAGE).length);
    var empt = document.getElementById('favoritesEmptyState');
    if (empt) {
      var anyFavShown = (activeFilter === 'favorites' && shown === 0);
      empt.classList.toggle('hidden', !anyFavShown);
      empt.classList.toggle('flex', anyFavShown);
    }
  }

  /* ---------- data maps ---------- */
  var byId = {};
  DATA.forEach(function (e) { byId[e.id] = e; });
  function byIdList(page) {
    return DATA.filter(function (e) { return e.page === page; });
  }

  /* ---------- page: windows ---------- */
  var SECTION_ICONS = { general: 'desktop_windows', 'win-key': 'keyboard_command_key', snap: 'web_asset', taskbar: 'dock', explorer: 'folder_open', dialogs: 'web_asset_off', desktops: 'desktop_access_disabled', cmd: 'terminal', accessibility: 'accessibility_new', win11: 'auto_awesome', 'winx-menu': 'menu', boot: 'power_settings_new', 'alt-system': 'keyboard', 'alt-apps': 'public', 'alt-office': 'work', 'alt-codes': 'dialpad', 'alt-input': 'keyboard_alt' };
  function renderWindows() {
    var main = document.getElementById('qp-main');
    main.appendChild(heroBlock());
    var els = byIdList('windows');
    var pills = [favPill(), exportBtn(), printBtn(), pill(T.filterAll, 'all')];
    var secOrder = ['general', 'win-key', 'snap', 'taskbar', 'explorer', 'dialogs', 'desktops', 'cmd', 'accessibility', 'win11', 'winx-menu', 'boot'];
    secOrder.forEach(function (s) {
      pills.push(pill(T.sections[s], s));
    });
    main.appendChild(toolbarBlock(pills));
    var wrap = el('div', 'w-full px-margin pb-space-2xl flex flex-col gap-space-2xl');
    secOrder.forEach(function (s) {
      var items = els.filter(function (e) { return e.section === s; });
      var sec = el('section', 'shortcut-category-group flex flex-col gap-space-md');
      sec.setAttribute('data-category', s);
      sec.style.contentVisibility = 'auto';
      sec.style.containIntrinsicSize = 'auto 500px';
      var head = el('div', 'flex items-center justify-between pb-space-2xs flex-wrap gap-space-xs');
      head.innerHTML =
        '<div class="flex items-center gap-space-sm"><span class="p-1.5 rounded bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-base">' + (SECTION_ICONS[s] || 'category') + '</span></span>' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + esc(T.sections[s]) + '</h2>' +
        '<span class="font-label-badge text-label-badge text-on-surface-variant px-space-xs py-0.5 rounded bg-surface-container">' + esc(T.shortcutsCount(items.length)) + '</span></div>';
      sec.appendChild(head);
      var grid = el('div', 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md');
      grid.setAttribute('data-group-els', JSON.stringify(items.map(function (x) { return x.id; })));
      items.forEach(function (e) { grid.appendChild(cardEl(e)); });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
    main.appendChild(wrap);
    main.appendChild(emptyState());
  }

  /* ---------- page: alt ---------- */
  function altCodeCard(e) {
    var card = el('div', 'shortcut-card group flex items-center gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-all shadow-sm');
    card.setAttribute('data-id', e.id);
    var sym = el('div', 'w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0');
    sym.innerHTML = '<span class="text-2xl text-primary font-bold">' + esc(e.symbol || '') + '</span>';
    card.appendChild(sym);
    var txt = el('div', 'flex flex-col min-w-0 flex-1');
    txt.innerHTML = '<span class="font-arabic-title text-arabic-title text-on-surface font-medium">' + esc(LANG === 'en' ? e.en.title : e.ar.title) + '</span>' +
      '<span class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">' + esc(e.ar.desc || '') + '</span>';
    card.appendChild(txt);
    var side = el('div', 'flex items-center gap-space-sm shrink-0');
    var keysBox = el('div', 'flex items-center gap-space-xs direction-ltr');
    keysBox.setAttribute('dir', 'ltr');
    keysBox.innerHTML = keyChips(dispKeys(e));
    side.appendChild(keysBox);
    var favB = el('button', 'fav-btn p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-tertiary-fixed-dim transition-colors shrink-0');
    favB.type = 'button'; favB.setAttribute('data-fav', e.id); favB.setAttribute('aria-label', T.filterFav);
    favB.innerHTML = '<span class="material-symbols-outlined text-base">star</span>';
    favB.addEventListener('click', function (ev) { ev.stopPropagation(); toggleFav(e.id); });
    side.appendChild(favB);
    var cpB = el('button', 'copy-btn p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-primary transition-colors shrink-0');
    cpB.type = 'button'; cpB.setAttribute('data-copy', copyText(e)); cpB.setAttribute('aria-label', T.copied(''));
    cpB.innerHTML = '<span class="material-symbols-outlined text-base">content_copy</span>';
    cpB.addEventListener('click', function (ev) { ev.stopPropagation(); copyShortcut(copyText(e)); });
    side.appendChild(cpB);
    card.appendChild(side);
    return card;
  }
  function renderAlt() {
    var main = document.getElementById('qp-main');
    main.appendChild(heroBlock());
    var els = byIdList('alt');
    var pills = [favPill(), exportBtn(), printBtn(), pill(T.filterAll, 'all')];
    ['alt-system', 'alt-apps', 'alt-office', 'alt-codes', 'alt-input'].forEach(function (s) {
      pills.push(pill(T.sections[s], s));
    });
    main.appendChild(toolbarBlock(pills));
    // NumLock notice
    var note = el('div', 'w-full px-margin');
    note.innerHTML =
      '<div class="flex items-start gap-space-sm p-space-md rounded-xl bg-surface-container-low border border-outline-variant/40">' +
      '<span class="material-symbols-outlined text-primary text-lg">info</span>' +
      '<div><p class="font-arabic-title text-arabic-title text-on-surface">' + esc(T.numlockTitle) + '</p>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">' + esc(T.numlock) + '</p></div></div>';
    main.appendChild(note);
    // secondary category filter for alt-codes
    var catRow = el('div', 'w-full px-margin pt-space-sm flex items-center gap-space-xs overflow-x-auto select-none');
    catRow.id = 'qp-alt-cats';
    var allB = el('button', 'px-space-md py-1 rounded text-body-sm font-body-sm bg-primary-container text-on-primary-container font-semibold whitespace-nowrap');
    allB.setAttribute('data-cat', 'all'); allB.type = 'button'; allB.textContent = T.altCatAll;
    catRow.appendChild(allB);
    ['symbols', 'currency', 'legal', 'math', 'fraction', 'punctuation', 'typography'].forEach(function (c) {
      var b = el('button', 'px-space-md py-1 rounded text-body-sm font-body-sm bg-surface-container text-on-surface hover:bg-surface-container-high whitespace-nowrap');
      b.setAttribute('data-cat', c); b.type = 'button';
      b.textContent = T.altCats[c];
      catRow.appendChild(b);
    });
    main.appendChild(catRow);
    var wrap = el('div', 'w-full px-margin pb-space-2xl flex flex-col gap-space-2xl');
    ['alt-system', 'alt-apps', 'alt-office', 'alt-codes', 'alt-input'].forEach(function (s) {
      var items = els.filter(function (e) { return e.section === s; });
      var sec = el('section', 'shortcut-category-group flex flex-col gap-space-md');
      sec.setAttribute('data-category', s);
      sec.style.contentVisibility = 'auto';
      sec.style.containIntrinsicSize = 'auto 500px';
      var head = el('div', 'flex items-center justify-between pb-space-2xs flex-wrap gap-space-xs');
      head.innerHTML =
        '<div class="flex items-center gap-space-sm"><span class="p-1.5 rounded bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-base">' + (SECTION_ICONS[s] || 'category') + '</span></span>' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + esc(T.sections[s]) + '</h2>' +
        '<span class="font-label-badge text-label-badge text-on-surface-variant px-space-xs py-0.5 rounded bg-surface-container">' + esc(T.shortcutsCount(items.length)) + '</span></div>';
      sec.appendChild(head);
      var grid = el('div', s === 'alt-codes' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md' : 'grid grid-cols-1 md:grid-cols-2 gap-space-md');
      grid.setAttribute('data-group-els', JSON.stringify(items.map(function (x) { return x.id; })));
      items.forEach(function (e) { grid.appendChild(s === 'alt-codes' ? altCodeCard(e) : cardEl(e)); });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
    main.appendChild(wrap);
    main.appendChild(emptyState());
    catRow.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-cat]');
      if (!b) return;
      altCat = b.getAttribute('data-cat');
      catRow.querySelectorAll('[data-cat]').forEach(function (x) {
        var on = x.getAttribute('data-cat') === altCat;
        x.className = 'px-space-md py-1 rounded text-body-sm font-body-sm whitespace-nowrap ' + (on ? 'bg-primary-container text-on-primary-container font-semibold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high');
      });
      applyFilters();
    });
  }

  /* ---------- page: office ---------- */
  var OFFICE_APPS = ['word', 'excel', 'powerpoint', 'outlook'];
  /* brand palette per app, matching the reference poster (Word blue / Excel green /
     PowerPoint orange / Outlook blue on dark navy panels) */
  var OFFICE_COLORS = {
    word: { name: '#5aa9ff', glow: 'rgba(38,120,210,.55)', soft: 'rgba(38,120,210,.22)', faint: 'rgba(38,120,210,.07)' },
    excel: { name: '#4ecf82', glow: 'rgba(34,140,74,.55)', soft: 'rgba(34,140,74,.22)', faint: 'rgba(34,140,74,.07)' },
    powerpoint: { name: '#ff9a70', glow: 'rgba(216,90,45,.55)', soft: 'rgba(216,90,45,.22)', faint: 'rgba(216,90,45,.07)' },
    outlook: { name: '#5ab5f5', glow: 'rgba(38,130,205,.55)', soft: 'rgba(38,130,205,.22)', faint: 'rgba(38,130,205,.07)' }
  };
  var officeView = 'grid';
  try {
    var savedOfficeView = localStorage.getItem('qp_office_view');
    if (savedOfficeView === 'cols' || savedOfficeView === 'grid') officeView = savedOfficeView;
  } catch (e) { }

  /* poster-style look for the column view (rows like list lines + brand-colored keycaps) */
  function ensureOfficeViewStyle() {
    if (document.getElementById('qp-office-view-style')) return;
    var st = document.createElement('style');
    st.id = 'qp-office-view-style';
    st.textContent =
      '.qp-col .shortcut-item{background:transparent;border-color:transparent;border-bottom:1px solid rgba(125,145,185,.16);border-radius:0;box-shadow:none;}' +
      '.qp-col .shortcut-item:hover{background:rgba(255,255,255,.05);border-bottom-color:rgba(125,145,185,.32);}' +
      '.qp-col .shortcut-item:last-child{border-bottom-color:transparent;}' +
      /* long titles wrap to a maximum of two lines in column view (no more one-line truncation) */
      '.qp-col .shortcut-item .truncate{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;overflow-wrap:break-word;}' +
      /* brand-colored keycaps — same palette in both views */
      '.qp-col[data-app="word"] .keycap,.qp-grid[data-app="word"] .keycap{background-image:linear-gradient(to bottom,#3287dd,#1c5ba6);background-color:#1c5ba6;color:#fff;border:1px solid rgba(255,255,255,.28);}' +
      '.qp-col[data-app="excel"] .keycap,.qp-grid[data-app="excel"] .keycap{background-image:linear-gradient(to bottom,#2ea45e,#176932);background-color:#176932;color:#fff;border:1px solid rgba(255,255,255,.28);}' +
      '.qp-col[data-app="powerpoint"] .keycap,.qp-grid[data-app="powerpoint"] .keycap{background-image:linear-gradient(to bottom,#ef6c3a,#b23c16);background-color:#b23c16;color:#fff;border:1px solid rgba(255,255,255,.28);}' +
      '.qp-col[data-app="outlook"] .keycap,.qp-grid[data-app="outlook"] .keycap{background-image:linear-gradient(to bottom,#2f9be8,#145d9e);background-color:#145d9e;color:#fff;border:1px solid rgba(255,255,255,.28);}';
    document.head.appendChild(st);
  }

  function officeRow(e) {
    var row = el('div', 'shortcut-item flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/60 hover:bg-surface-container border border-outline-variant/30 hover:border-primary/50 transition-all');
    row.setAttribute('data-id', e.id);
    var t = el('span', 'font-arabic-body text-arabic-body text-on-surface font-medium min-w-0 truncate flex-1');
    t.textContent = LANG === 'en' ? e.en.title : e.ar.title;
    row.appendChild(t);
    var side = el('div', 'flex items-center gap-1.5 shrink-0');
    var kb = el('div', 'inline-flex items-center gap-1 direction-ltr');
    kb.setAttribute('dir', 'ltr');
    kb.innerHTML = keyChips(dispKeys(e));
    side.appendChild(kb);
    var favB = el('button', 'fav-btn p-1 rounded hover:bg-surface-container-highest text-outline hover:text-tertiary-fixed-dim transition-colors');
    favB.type = 'button'; favB.setAttribute('data-fav', e.id); favB.setAttribute('aria-label', T.filterFav);
    favB.innerHTML = '<span class="material-symbols-outlined text-sm">star</span>';
    favB.addEventListener('click', function (ev) { ev.stopPropagation(); toggleFav(e.id); });
    side.appendChild(favB);
    var cpB = el('button', 'copy-btn p-1 rounded hover:bg-surface-container-highest text-outline hover:text-primary transition-colors');
    cpB.type = 'button'; cpB.setAttribute('data-copy', copyText(e)); cpB.setAttribute('aria-label', T.copied(''));
    cpB.innerHTML = '<span class="material-symbols-outlined text-sm">content_copy</span>';
    cpB.addEventListener('click', function (ev) { ev.stopPropagation(); copyShortcut(copyText(e)); });
    side.appendChild(cpB);
    row.appendChild(side);
    return row;
  }

  /* view 1 — grid (same layout and sizes as the original, recolored to the
     column-view palette: navy panels + brand-colored headers and keycaps) */
  function buildOfficeGrid() {
    var els = byIdList('office');
    var wrap = el('div', 'w-full px-margin pb-space-2xl grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-space-lg items-start');
    OFFICE_APPS.forEach(function (app) {
      var items = els.filter(function (e) { return e.app === app; });
      var c = OFFICE_COLORS[app];
      var col = el('section', 'qp-grid rounded-2xl overflow-hidden');
      col.setAttribute('data-app', app);
      col.style.cssText =
        'content-visibility:auto;background:#0f1830;border:1px solid ' + c.glow + ';' +
        'box-shadow:0 0 26px ' + c.soft + ', inset 0 0 46px ' + c.faint + ';';
      var head = el('div', 'flex items-center justify-between p-space-md');
      head.style.cssText =
        'background:linear-gradient(to bottom,' + c.faint + ',rgba(0,0,0,0));border-bottom:1px solid ' + c.soft + ';';
      head.innerHTML =
        '<div class="flex items-center gap-space-sm"><img alt="' + esc(app) + '" class="w-9 h-9 rounded object-contain" src="assets/img/' + app + '.png" onerror="this.style.display=\'none\'">' +
        '<div class="flex flex-col"><span class="font-arabic-title text-arabic-title" style="color:' + c.name + ';">' + esc(T.officeCols[app]) + '</span>' +
        '<span class="text-on-surface-variant font-body-sm text-body-sm">' + esc(T.officeColSub[app]) + '</span></div></div>' +
        '<span class="font-keycap-label text-keycap-label px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,.12);color:' + c.name + ';font-weight:700;">' + esc(T.shortcutsCount(items.length)) + '</span>';
      col.appendChild(head);
      var list = el('div', 'p-space-sm flex flex-col gap-space-xs max-h-[72vh] overflow-y-auto');
      list.setAttribute('data-group-els', JSON.stringify(items.map(function (x) { return x.id; })));
      var curSec = null;
      items.forEach(function (e) {
        if (e.section !== curSec) {
          curSec = e.section;
          var subEl = el('div', 'font-label-badge text-label-badge px-1 pt-space-sm pb-space-1');
          subEl.setAttribute('data-sub-head', '1');
          subEl.style.cssText = 'color:' + c.name + ';font-weight:700;letter-spacing:.4px;';
          subEl.textContent = T.officeSubs[e.section] || e.section;
          list.appendChild(subEl);
        }
        list.appendChild(officeRow(e));
      });
      col.appendChild(list);
      wrap.appendChild(col);
    });
    return wrap;
  }

  /* view 2 — poster-style columns (like the reference image: 4 brand-colored
     vertical panels side by side, icon + app name on top, colored keycaps) */
  function buildOfficeCols() {
    var els = byIdList('office');
    var wrap = el('div', 'w-full px-margin pb-space-2xl');
    var outer = el('div', '');
    var row = el('div', 'flex gap-space-lg overflow-x-auto py-1');
    row.id = 'qp-office-cols';
    OFFICE_APPS.forEach(function (app) {
      var items = els.filter(function (e) { return e.app === app; });
      var c = OFFICE_COLORS[app];
      var col = el('section', 'shortcut-category-group qp-col rounded-2xl overflow-hidden flex flex-col');
      col.setAttribute('data-app', app);
      col.style.cssText =
        'content-visibility:auto;contain-intrinsic-size:auto 700px;' +
        'background:#0f1830;border:1px solid ' + c.glow + ';' +
        'box-shadow:0 0 26px ' + c.soft + ', inset 0 0 46px ' + c.faint + ';' +
        'flex:1 1 290px;min-width:290px;';
      var head = el('div', '');
      head.style.cssText =
        'display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;padding:14px 14px 12px;' +
        'border-bottom:1px solid ' + c.soft + ';background:linear-gradient(to bottom,' + c.faint + ',rgba(0,0,0,0));';
      head.innerHTML =
        '<img alt="' + esc(app) + '" style="width:44px;height:44px;object-fit:contain;border-radius:10px;" src="assets/img/' + app + '.png" onerror="this.style.display=\'none\'">' +
        '<span class="font-arabic-title text-arabic-title font-bold" style="color:' + c.name + ';letter-spacing:.3px;">' + esc(T.officeCols[app]) + '</span>' +
        '<span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(T.officeColSub[app]) + '</span>' +
        '<span class="font-keycap-label text-keycap-label" style="background:rgba(255,255,255,.12);color:' + c.name + ';padding:2px 10px;border-radius:999px;font-weight:700;">' + esc(T.shortcutsCount(items.length)) + '</span>';
      col.appendChild(head);
      var list = el('div', 'p-space-sm flex flex-col gap-space-xs max-h-[72vh] overflow-y-auto');
      list.setAttribute('data-group-els', JSON.stringify(items.map(function (x) { return x.id; })));
      var curSec = null;
      items.forEach(function (e) {
        if (e.section !== curSec) {
          curSec = e.section;
          var subEl = el('div', 'font-label-badge text-label-badge px-1 pt-space-sm pb-space-1');
          subEl.setAttribute('data-sub-head', '1');
          subEl.style.cssText = 'color:' + c.name + ';font-weight:700;letter-spacing:.4px;';
          subEl.textContent = T.officeSubs[e.section] || e.section;
          list.appendChild(subEl);
        }
        list.appendChild(officeRow(e));
      });
      col.appendChild(list);
      row.appendChild(col);
    });
    addScrollArrows(row, outer, { noWheel: true });
    wrap.appendChild(outer);
    return wrap;
  }

  /* toggle button: grid view ⇄ column view (saved in localStorage) */
  function officeViewToggle() {
    var box = el('div', 'no-print');
    box.id = 'qp-office-view-toggle';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', T.viewToggleAria);
    box.style.cssText = 'display:flex;align-items:center;gap:2px;padding:3px;background:#131b2e;border:1px solid #31394d;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.4);align-self:flex-start;';
    function mk(view, icon, label) {
      var b = el('button', '');
      b.type = 'button';
      b.setAttribute('data-view', view);
      b.title = label;
      b.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;border:none;background:transparent;color:#9fb0d0;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background .15s,color .15s;';
      b.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;line-height:1;">' + icon + '</span><span>' + esc(label) + '</span>';
      return b;
    }
    var bGrid = mk('grid', 'grid_view', T.viewGrid);
    var bCols = mk('cols', 'view_column', T.viewCols);
    box.appendChild(bGrid); box.appendChild(bCols);
    function refresh() {
      [[bGrid, 'grid'], [bCols, 'cols']].forEach(function (p) {
        var on = officeView === p[1];
        p[0].style.background = on ? '#0078d4' : 'transparent';
        p[0].style.color = on ? '#ffffff' : '#9fb0d0';
        p[0].style.boxShadow = on ? '0 1px 4px rgba(0,120,212,.45)' : 'none';
        p[0].setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function bindToggle(b, view) {
      b.addEventListener('click', function () {
        if (officeView === view) return;
        officeView = view;
        try { localStorage.setItem('qp_office_view', view); } catch (e) { }
        refresh();
        rebuildOfficeBody();
      });
    }
    bindToggle(bGrid, 'grid');
    bindToggle(bCols, 'cols');
    refresh();
    return box;
  }

  var officeBodyEl = null;
  function rebuildOfficeBody() {
    var main = document.getElementById('qp-main');
    var fresh = (officeView === 'cols') ? buildOfficeCols() : buildOfficeGrid();
    if (officeBodyEl && officeBodyEl.parentNode) officeBodyEl.parentNode.replaceChild(fresh, officeBodyEl);
    else main.appendChild(fresh);
    officeBodyEl = fresh;
    updateFavStates();
  }

  function renderOffice() {
    var main = document.getElementById('qp-main');
    main.appendChild(heroBlock());
    var pills = [favPill(), exportBtn(), printBtn(), pill(T.filterAll, 'all')];
    [['word', T.filterWord], ['excel', T.filterExcel], ['powerpoint', T.filterPpt], ['outlook', T.filterOutlook]].forEach(function (p) {
      pills.push(pill(p[1], p[0]));
    });
    main.appendChild(toolbarBlock(pills, officeViewToggle()));
    ensureOfficeViewStyle();
    rebuildOfficeBody();
    main.appendChild(emptyState());
  }

  /* ---------- page: matrix ---------- */
  function renderMatrix() {
    var main = document.getElementById('qp-main');
    main.appendChild(heroBlock());
    var pills = [favPill(), exportBtn(), printBtn(), pill(T.filterAll, 'all')];
    main.appendChild(toolbarBlock(pills));
    // selects row
    var selRow = el('div', 'w-full px-margin pb-space-md flex flex-wrap items-center gap-space-sm');
    var appSel = el('select', 'bg-surface-container text-on-surface text-body-sm font-body-sm rounded-lg px-space-sm py-space-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary-container');
    appSel.id = 'qp-matrix-app';
    appSel.innerHTML = '<option value="all">' + T.matrixAll + '</option>' +
      ['windows', 'alt', 'word', 'excel', 'powerpoint', 'outlook'].map(function (a) {
        return '<option value="' + a + '">' + T.apps[a] + '</option>';
      }).join('');
    var catSel = el('select', 'bg-surface-container text-on-surface text-body-sm font-body-sm rounded-lg px-space-sm py-space-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary-container');
    catSel.id = 'qp-matrix-cat';
    selRow.appendChild(appSel); selRow.appendChild(catSel);
    main.appendChild(selRow);
    // table
    var wrap = el('div', 'w-full px-margin pb-space-2xl');
    var tableWrap = el('div', 'rounded-2xl border border-outline-variant/30 overflow-hidden bg-surface-container-low');
    tableWrap.id = 'qp-matrix-table';
    var table = el('table', 'w-full text-body-sm font-body-sm');
    table.innerHTML =
      '<thead class="bg-surface-container text-on-surface-variant"><tr>' +
      '<th class="py-space-sm px-space-md text-start font-medium">' + esc(T.matrixApp) + '</th>' +
      '<th class="py-space-sm px-space-md text-start font-medium">' + esc(T.matrixCat) + '</th>' +
      '<th class="py-space-sm px-space-md text-start font-medium">' + esc(T.matrixKeys) + '</th>' +
      '<th class="py-space-sm px-space-md text-start font-medium">' + esc(T.matrixFunc) + '</th>' +
      '<th class="py-space-sm px-space-md text-start font-medium"></th>' +
      '</tr></thead>';
    var tbody = el('tbody');
    DATA.forEach(function (e) {
      var tr = el('tr', 'matrix-row group hover:bg-surface-container transition-colors border-t border-outline-variant/20');
      tr.setAttribute('data-id', e.id);
      var secName = (T.sections[e.section] || T.officeSubs[e.section] || e.section);
      tr.innerHTML =
        '<td class="py-2.5 px-space-md whitespace-nowrap"><span class="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-badge text-label-badge">' + esc(T.apps[e.app] || e.app) + '</span></td>' +
        '<td class="py-2.5 px-space-md whitespace-nowrap text-on-surface-variant">' + esc(secName) + '</td>' +
        '<td class="py-2.5 px-space-md"><div class="inline-flex items-center gap-1 direction-ltr" dir="ltr">' + keyChips(dispKeys(e)) + '</div></td>' +
        '<td class="py-2.5 px-space-md"><div class="flex flex-col min-w-0"><span class="font-medium text-on-surface">' + esc(LANG === 'en' ? e.en.title : e.ar.title) + '</span>' +
        ((LANG === 'en' ? e.en.desc : e.ar.desc) ? '<span class="text-xs text-on-surface-variant">' + esc(LANG === 'en' ? e.en.desc : e.ar.desc) + '</span>' : '') + '</div></td>';
      // actions cell (copy + favorite) — last cell = far left in RTL; same buttons as the other pages,
      // marked no-print so the printed table stays exactly as before
      var act = el('td', 'py-2.5 px-space-md no-print');
      var actWrap = el('div', 'flex items-center gap-1.5 shrink-0');
      var favB = el('button', 'fav-btn p-1 rounded hover:bg-surface-container-highest text-outline hover:text-tertiary-fixed-dim transition-colors shrink-0');
      favB.type = 'button';
      favB.setAttribute('data-fav', e.id);
      favB.setAttribute('aria-label', T.filterFav);
      favB.innerHTML = '<span class="material-symbols-outlined text-sm">star</span>';
      favB.addEventListener('click', function (ev) { ev.stopPropagation(); toggleFav(e.id); });
      actWrap.appendChild(favB);
      var cpB = el('button', 'copy-btn p-1 rounded hover:bg-surface-container-highest text-outline hover:text-primary transition-colors shrink-0');
      cpB.type = 'button';
      cpB.setAttribute('data-copy', copyText(e));
      cpB.setAttribute('aria-label', T.copied(''));
      cpB.innerHTML = '<span class="material-symbols-outlined text-sm">content_copy</span>';
      cpB.addEventListener('click', function (ev) { ev.stopPropagation(); copyShortcut(copyText(e)); });
      actWrap.appendChild(cpB);
      act.appendChild(actWrap);
      tr.appendChild(act);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    main.appendChild(wrap);
    // matrix filtering
    function fillCats() {
      var app = appSel.value;
      var secs = [];
      DATA.forEach(function (e) {
        if (app !== 'all' && e.app !== app) return;
        if (secs.indexOf(e.section) < 0) secs.push(e.section);
      });
      catSel.innerHTML = '<option value="all">' + (LANG === 'en' ? 'All categories' : 'كل الفئات') + '</option>' +
        secs.map(function (s) {
          return '<option value="' + s + '">' + esc(T.sections[s] || T.officeSubs[s] || s) + '</option>';
        }).join('');
    }
    fillCats();
    function applyMatrix() {
      var app = appSel.value, cat = catSel.value;
      var q = searchInput ? searchInput.value.trim() : '';
      var shown = 0;
      DATA.forEach(function (e) {
        var tr = tbody.querySelector('[data-id="' + e.id + '"]');
        if (!tr) return;
        var ok = true;
        if (app !== 'all' && e.app !== app) ok = false;
        if (ok && cat !== 'all' && e.section !== cat) ok = false;
        if (ok && activeFilter === 'favorites' && !isFav(e.id)) ok = false;
        if (ok) ok = elMatchesSearch(e, q);
        tr.classList.toggle('hidden', !ok);
        if (ok) shown++;
      });
      if (resultsCount) resultsCount.textContent = T.resultsCount(shown, DATA.length);
    }
    appSel.addEventListener('change', function () { fillCats(); applyMatrix(); });
    catSel.addEventListener('change', applyMatrix);
    // hook the global applyFilters for matrix
    applyFilters = function () { applyMatrix(); };
    applyMatrix();
  }

  /* ---------- CSV export ---------- */
  function exportFavoritesCsv() {
    var items = DATA.filter(function (e) { return isFav(e.id); });
    if (!items.length) { showToast(T.favIsEmptyExport); return; }
    var headers = (LANG === 'en') ? ['Shortcut', 'Keys', 'Description'] : ['اسم الاختصار', 'المفتاح', 'الوصف'];
    var csv = '\uFEFF' + headers.join(',') + '\n';
    items.forEach(function (e) {
      var title = LANG === 'en' ? e.en.title : e.ar.title;
      var desc = LANG === 'en' ? e.en.desc : e.ar.desc;
      var keys = copyText(e);
      function q(s) { return '"' + String(s || '').replace(/"/g, '""') + '"'; }
      csv += [q(title), q(keys), q(desc)].join(',') + '\n';
    });
    var name = (LANG === 'en') ? 'quickpress_fav_shortcuts_en.csv' : 'quickpress_fav_shortcuts.csv';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(T.exportDone);
  }

  /* ---------- filter events ---------- */
  function bindPills() {
    var row = document.getElementById('qp-filters');
    if (!row) return;
    row.addEventListener('click', function (ev) {
      var b = ev.target.closest('.filter-pill');
      if (!b) return;
      activeFilter = b.getAttribute('data-filter');
      row.querySelectorAll('.filter-pill').forEach(function (x) {
        var on = x === b;
        var f = x.getAttribute('data-filter');
        x.className = 'filter-pill px-space-md py-1.5 rounded text-body-sm font-body-sm whitespace-nowrap transition-all ' +
          (on ? 'bg-primary-container text-on-primary-container font-semibold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high');
      });
      applyFilters();
    });
  }

  /* ---------- ui click sound (offline, Web Audio — no audio files needed) ---------- */
  var audioCtx = null;
  function playClick() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) { } }
      var t = audioCtx.currentTime;
      // soft high blip (the audible "tick")
      var o1 = audioCtx.createOscillator();
      var g1 = audioCtx.createGain();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(1400, t);
      o1.frequency.exponentialRampToValueAtTime(900, t + 0.045);
      g1.gain.setValueAtTime(0.0001, t);
      g1.gain.exponentialRampToValueAtTime(0.09, t + 0.006);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      o1.connect(g1); g1.connect(audioCtx.destination);
      o1.start(t); o1.stop(t + 0.09);
      // warm low layer underneath (makes it feel like a gentle key press)
      var o2 = audioCtx.createOscillator();
      var g2 = audioCtx.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(320, t);
      o2.frequency.exponentialRampToValueAtTime(220, t + 0.04);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      o2.connect(g2); g2.connect(audioCtx.destination);
      o2.start(t); o2.stop(t + 0.07);
    } catch (e) { }
  }
  function bindUiSounds() {
    document.addEventListener('click', function (ev) {
      if (ev.button !== 0) return;
      var tg = ev.target;
      var b = (tg && tg.closest) ? tg.closest('button, [role="button"], a') : null;
      if (!b || b.disabled) return;
      playClick();
    }, true);
  }

  /* ---------- about modal (license / developer / repo) ---------- */
  function closeAbout() {
    var ov = document.getElementById('qp-about-overlay');
    if (ov) { if (ov._qpOnKey) document.removeEventListener('keydown', ov._qpOnKey); ov.remove(); }
  }
  function openAbout() {
    var old = document.getElementById('qp-about-overlay');
    if (old) old.remove();
    var ov = el('div', '');
    ov.id = 'qp-about-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(3,8,20,.78);display:flex;align-items:center;justify-content:center;padding:16px;';
    var card = el('div', '');
    card.id = 'qp-about-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', T.aboutTitleTag);
    card.style.cssText = 'background:#182238;color:#dae2fd;border:1px solid #3a4a6b;border-radius:18px;width:100%;max-width:430px;max-height:86vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.65);padding:26px 24px 22px;position:relative;text-align:center;';
    var closeX = el('button', '');
    closeX.type = 'button';
    closeX.setAttribute('aria-label', T.aboutClose);
    closeX.style.cssText = 'position:absolute;top:10px;' + (LANG === 'ar' ? 'left' : 'right') + ':10px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:#93a4c3;cursor:pointer;padding:0;';
    closeX.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">close</span>';
    closeX.addEventListener('click', closeAbout);
    card.appendChild(closeX);
    card.insertAdjacentHTML('beforeend',
      '<img alt="QuickPress" src="assets/img/logo.png" style="width:56px;height:56px;object-fit:contain;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.45);margin:2px auto 10px;display:block;">' +
      '<h3 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.3px;">QuickPress <span style="display:inline-block;vertical-align:middle;background:#22304e;color:#7fb8ff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-inline-start:6px;">v1.0.0</span></h3>' +
      '<p style="margin:8px auto 0;max-width:330px;font-size:13px;line-height:1.7;color:#a9b7d6;">' + esc(T.aboutTagline) + '</p>' +
      '<div style="height:1px;background:#2c3a58;margin:16px 0;"></div>' +
      '<div style="display:flex;align-items:flex-start;gap:10px;text-align:start;background:#111a2e;border:1px solid #2c3a58;border-radius:12px;padding:12px 14px;margin-bottom:12px;">' +
      '<span class="material-symbols-outlined" style="font-size:20px;color:#7fb8ff;margin-top:1px;">verified_user</span>' +
      '<div><p style="margin:0;font-size:13px;font-weight:700;color:#dae2fd;">' + esc(T.aboutLicenseTitle) + '</p>' +
      '<p style="margin:4px 0 0;font-size:12px;line-height:1.7;color:#a9b7d6;">' + esc(T.aboutLicenseText) + '</p></div></div>' +
      '<div style="display:flex;align-items:center;gap:10px;text-align:start;padding:8px 14px;">' +
      '<span class="material-symbols-outlined" style="font-size:18px;color:#7fb8ff;">person</span>' +
      '<p style="margin:0;font-size:13px;color:#a9b7d6;"><span>' + esc(T.aboutDevLabel) + ': </span><span style="font-weight:700;color:#e6edfd;">' + esc(T.aboutDevValue) + '</span></p></div>' +
      '<div style="display:flex;align-items:center;gap:10px;text-align:start;padding:8px 14px;">' +
      '<span class="material-symbols-outlined" style="font-size:18px;color:#7fb8ff;">mail</span>' +
      '<p style="margin:0;font-size:13px;color:#a9b7d6;"><span>' + esc(T.aboutEmailLabel) + ': </span><a href="mailto:saeedbadr112@hotmail.com" style="color:#4cc2ff;text-decoration:none;direction:ltr;unicode-bidi:embed;">saeedbadr112@hotmail.com</a></p></div>' +
      '<div style="display:flex;align-items:center;gap:10px;text-align:start;padding:8px 14px;margin-bottom:6px;">' +
      '<span class="material-symbols-outlined" style="font-size:18px;color:#7fb8ff;">code</span>' +
      '<p style="margin:0;font-size:13px;color:#a9b7d6;"><span>' + esc(T.aboutRepoLabel) + ': </span><a href="https://github.com/SaeedBadr112/QuickPress" target="_blank" rel="noopener noreferrer" style="color:#4cc2ff;text-decoration:none;direction:ltr;unicode-bidi:embed;">github.com/SaeedBadr112/QuickPress</a></p></div>' +
      '<button type="button" id="qp-about-close" style="margin-top:10px;width:100%;padding:10px 0;border:none;border-radius:10px;background:#0078d4;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">' + esc(T.aboutClose) + '</button>');
    ov.appendChild(card);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeAbout(); });
    document.body.appendChild(ov);
    var c = document.getElementById('qp-about-close');
    if (c) c.addEventListener('click', closeAbout);
    var onKey = function (e) { if (e.key === 'Escape') closeAbout(); };
    document.addEventListener('keydown', onKey);
    ov._qpOnKey = onKey;
  }

  /* ---------- init ---------- */
  function init() {
    renderHeader();
    if (PAGE === 'windows') renderWindows();
    else if (PAGE === 'alt') renderAlt();
    else if (PAGE === 'office') renderOffice();
    else if (PAGE === 'matrix') renderMatrix();
    // toast
    toast = el('div', 'fixed bottom-12 left-1/2 -translate-x-1/2 z-50 transform translate-y-8 opacity-0 pointer-events-none transition-all duration-200 flex items-center gap-space-sm px-space-lg py-space-sm rounded-lg bg-surface-container-highest text-on-surface shadow-2xl');
    toast.id = 'copy-toast';
    toastMsg = el('span', 'font-arabic-body text-arabic-body text-body-sm');
    toastMsg.id = 'copy-toast-msg';
    toast.appendChild(toastMsg);
    document.body.appendChild(toast);
    // search + shortcuts
    searchInput = document.getElementById('qp-search');
    resultsCount = document.getElementById('qp-results-count');
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
      document.addEventListener('keydown', function (ev) {
        if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K')) { ev.preventDefault(); searchInput.focus(); }
        else if (ev.key === '/' && document.activeElement !== searchInput && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
          ev.preventDefault(); searchInput.focus();
        }
      });
    }
    bindPills();
    updateFavStates();
    bindUiSounds();
    // footer
    var footer = el('footer', 'w-full px-margin py-space-lg border-t border-outline-variant/30 text-center');
    footer.innerHTML = '<p class="font-body-sm text-body-sm text-on-surface-variant">© <span id="qp-year"></span> QuickPress — ' + T.footer + '</p>' +
      '<button type="button" id="qp-about-link" style="margin-top:6px;background:transparent;border:none;cursor:pointer;color:#4cc2ff;font-size:12px;font-family:inherit;display:inline-flex;align-items:center;gap:4px;padding:0;">' +
      '<span class="material-symbols-outlined" style="font-size:14px;">info</span><span style="text-decoration:underline;text-underline-offset:3px;">' + esc(T.aboutLinkFooter) + '</span></button>';
    document.getElementById('qp-footer').appendChild(footer);
    document.getElementById('qp-year').textContent = new Date().getFullYear();
    var aboutLink = document.getElementById('qp-about-link');
    if (aboutLink) aboutLink.addEventListener('click', openAbout);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
