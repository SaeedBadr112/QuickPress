/* QuickPress — preload.js
   جسر الاتصال الآمن بين الصفحة وعملية الإلكترون الرئيسية.
   يعمل مع contextIsolation:true — لا يكشف أي شيء من Node مباشرة،
   بل دوال محددة فقط للتحكم بالنافذة يستخدمها شريط العنوان المخصص. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qpWindow', {
  /* تصغير النافذة */
  minimize: () => ipcRenderer.invoke('window:minimize'),
  /* تبديل بين التكبير والاستعادة */
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  /* إغلاق التطبيق */
  close: () => ipcRenderer.invoke('window:close'),
  /* قراءة حالة التكبير الحالية */
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  /* الاشتراك بتغيّر حالة التكبير (لتبدّل الأيقونة) */
  onMaximizeChange: (fn) => ipcRenderer.on('window:maximized-changed', (_e, v) => fn(v))
});
