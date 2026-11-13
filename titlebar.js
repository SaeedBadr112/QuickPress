/* QuickPress — titlebar.js
   شريط عنوان مخصص داكن متناسق مع هوية التطبيق، يُحقن في كل صفحة
   عند التشغيل داخل إلكترون فقط (main.js يقرأ هذا الملف وينفّذه).
   لا يعمل في المتصفح العادي لأن window.qpWindow يأتي من preload.js. */
(function () {
  'use strict';
  if (document.getElementById('qp-titlebar')) return;

  var TB_H = 38; /* ارتفاع الشريط بالبكسل */

  /* الأنماط: نفس لون خلفية التطبيق #0b1326 مع حدود داكنة خفيفة،
     سحب النافذة من الشريط (drag) والأزرار مستثناة (no-drag)،
     ودفع الترويسة الثابتة والمحتوى أسفل الشريط، وإخفاؤه عند الطباعة. */
  var css = [
    '#qp-titlebar{position:fixed;top:0;left:0;right:0;height:' + TB_H + 'px;z-index:9999;',
    '  display:flex;align-items:stretch;direction:rtl;user-select:none;',
    '  -webkit-app-region:drag;app-region:drag;',
    '  background:#0b1326;border-bottom:1px solid rgba(148,163,203,.16);',
    '  font-family:"Cairo","Segoe UI",Tahoma,Arial,sans-serif;}',
    '#qp-titlebar *{box-sizing:border-box;margin:0;}',
    '#qp-titlebar .qp-tb-brand{display:flex;align-items:center;gap:8px;',
    '  padding-inline-start:14px;color:#dae2fd;font-size:13px;font-weight:700;letter-spacing:.2px;}',
    '#qp-titlebar .qp-tb-brand img{width:19px;height:19px;display:block;border-radius:4px;}',
    '#qp-titlebar .qp-tb-ver{font-size:10px;font-weight:600;color:#93a5c9;line-height:1.5;',
    '  background:rgba(148,163,203,.13);border:1px solid rgba(148,163,203,.22);',
    '  padding:0 7px;border-radius:99px;}',
    '#qp-titlebar .qp-tb-controls{display:flex;align-items:stretch;flex:none;',
    '  -webkit-app-region:no-drag;app-region:no-drag;margin-inline-start:auto;}',
    '#qp-titlebar .qp-tb-controls button{width:46px;height:100%;border:0;padding:0;',
    '  background:transparent;color:#aebad6;cursor:default;',
    '  display:flex;align-items:center;justify-content:center;}',
    '#qp-titlebar .qp-tb-controls button:hover{background:rgba(148,163,203,.16);color:#fff;}',
    '#qp-titlebar .qp-tb-controls button:active{background:rgba(148,163,203,.26);color:#fff;}',
    '#qp-titlebar #qp-tb-close:hover{background:#e81123;color:#fff;}',
    '#qp-titlebar #qp-tb-close:active{background:#f1707a;color:#fff;}',
    /* أيقونات مرسومة بـ CSS بدل الخطوط: تصغير، تكبير، استعادة، إغلاق */
    '.qp-tb-ico{display:block;position:relative;width:10px;height:10px;}',
    '.qp-tb-ico-min{width:10px;height:1px;background:currentColor;}',
    '.qp-tb-ico-max{border:1px solid currentColor;background:transparent;}',
    '.qp-tb-ico-restore{border:1px solid currentColor;background:transparent;}',
    '.qp-tb-ico-restore::before{content:"";position:absolute;top:-4px;right:-4px;',
    '  width:8px;height:8px;border:1px solid currentColor;background:#0b1326;}',
    '.qp-tb-ico-close{width:11px;height:11px;background:transparent;}',
    '.qp-tb-ico-close::before,.qp-tb-ico-close::after{content:"";position:absolute;',
    '  left:50%;top:50%;width:12px;height:1.4px;background:currentColor;}',
    '.qp-tb-ico-close::before{transform:translate(-50%,-50%) rotate(45deg);}',
    '.qp-tb-ico-close::after{transform:translate(-50%,-50%) rotate(-45deg);}',
    /* دفع محتوى الصفحة والترويسة الثابتة أسفل الشريط */
    'body{padding-top:' + TB_H + 'px !important;}',
    'header.fixed.top-0{top:' + TB_H + 'px !important;}',
    /* عند الطباعة: الشريط يختفي ويعود التخطيط كما كان */
    '@media print{#qp-titlebar{display:none !important;}body{padding-top:0 !important;}',
    '  header.fixed.top-0{top:0 !important;}}'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'qp-titlebar-style';
  style.textContent = css;
  document.head.appendChild(style);

  /* بناء الشريط: الشعار والاسم والإصدار يميناً، وأزرار التحكم يساراً
     (ترتيب ويندوز العربي المعكوس: الإغلاق في أقصى اليسار) */
  var bar = document.createElement('div');
  bar.id = 'qp-titlebar';
  bar.innerHTML =
    '<div class="qp-tb-brand">' +
      '<img src="assets/img/logo.png" alt="QuickPress">' +
      '<span>QuickPress</span>' +
      '<span class="qp-tb-ver">v1.0.0</span>' +
    '</div>' +
    '<div class="qp-tb-controls">' +
      '<button id="qp-tb-min" title="تصغير" aria-label="تصغير"><span class="qp-tb-ico qp-tb-ico-min"></span></button>' +
      '<button id="qp-tb-max" title="تكبير" aria-label="تكبير"><span class="qp-tb-ico qp-tb-ico-max"></span></button>' +
      '<button id="qp-tb-close" title="إغلاق" aria-label="إغلاق"><span class="qp-tb-ico qp-tb-ico-close"></span></button>' +
    '</div>';
  document.body.insertBefore(bar, document.body.firstChild);

  /* ربط الأزرار بأحداث IPC عبر الجسر الآمن من preload.js */
  var api = window.qpWindow;
  if (!api) return; /* احتياط: بدون الجسر لا تعمل الأزرار */

  var maxBtn = document.getElementById('qp-tb-max');
  document.getElementById('qp-tb-min').addEventListener('click', function () { api.minimize(); });
  maxBtn.addEventListener('click', function () { api.toggleMaximize(); });
  document.getElementById('qp-tb-close').addEventListener('click', function () { api.close(); });

  /* تبديل أيقونة الزر بين التكبير والاستعادة حسب حالة النافذة */
  function setMax(v) {
    maxBtn.innerHTML = v
      ? '<span class="qp-tb-ico qp-tb-ico-restore"></span>'
      : '<span class="qp-tb-ico qp-tb-ico-max"></span>';
    maxBtn.title = v ? 'استعادة الحجم' : 'تكبير';
  }
  api.onMaximizeChange(setMax);
  api.isMaximized().then(setMax);
})();
