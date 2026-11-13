/* QuickPress — main.js
   ملف التشغيل الرئيسي لإلكترون: نافذة بلا إطار (بلا شريط العنوان الأبيض الافتراضي)
   مع شريط عنوان مخصص يُحقن في كل صفحة، وأزرار تحكم مضبوطة بـ IPC آمن.
   التجربة بدون بناء:  npm start
   بناء ملف exe:       npm run dist   (النتيجة في مجلد dist) */
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;

/* منع فتح نسخة ثانية من التطبيق */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  function createWindow() {
    win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 960,
      minHeight: 600,
      frame: false,                /* بلا إطار ويندوز الافتراضي */
      backgroundColor: '#0b1326',  /* نفس لون خلفية التطبيق: لا وميض أبيض عند الفتح */
      show: false,
      icon: path.join(__dirname, 'assets', 'img', 'logo.ico'),
      webPreferences: {
        contextIsolation: true,    /* اتصال آمن معزول */
        nodeIntegration: false,
        spellcheck: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    win.loadFile(path.join(__dirname, 'index.html'));

    win.once('ready-to-show', () => win.show());

    /* حقن شريط العنوان المخصص في كل صفحة تُحمَّل (index ثم صفحة اللغة) */
    win.webContents.on('dom-ready', () => {
      try {
        const code = fs.readFileSync(path.join(__dirname, 'titlebar.js'), 'utf8');
        win.webContents.executeJavaScript(code, true);
      } catch (e) {
        /* الملف غير موجود: تُكمل النافذة عملها بدون الشريط المخصص */
      }
    });

    /* إبلاغ الصفحة بتغيّر حالة التكبير لتبديل أيقونة الزر */
    const sendMax = (v) => {
      if (win && !win.isDestroyed()) win.webContents.send('window:maximized-changed', v);
    };
    win.on('maximize', () => sendMax(true));
    win.on('unmaximize', () => sendMax(false));

    /* الروابط الخارجية (مثل رابط GitHub في نافذة «حول») تفتح في متصفح النظام */
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event, url) => {
      /* التنقل بين صفحات التطبيق المحلية مسموح، والروابط الخارجية تفتح في المتصفح */
      if (!url.startsWith('file://')) {
        event.preventDefault();
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      }
    });

    /* اختصار للمطورين: Ctrl+Shift+I يفتح أدوات المطور أثناء التجربة */
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.control && input.shift &&
          input.key.toLowerCase() === 'i') {
        win.webContents.toggleDevTools();
      }
    });

    win.on('closed', () => { win = null; });
  }

  app.whenReady().then(() => {
    app.setAppUserModelId('com.saeedbadr.quickpress');

    /* إزالة شريط القوائم الافتراضي */
    Menu.setApplicationMenu(null);

    /* أحداث IPC للتحكم بالنافذة من شريط العنوان المخصص (عبر preload الآمن) */
    ipcMain.handle('window:minimize', () => { if (win) win.minimize(); });
    ipcMain.handle('window:toggle-maximize', () => {
      if (!win) return;
      if (win.isMaximized()) win.unmaximize(); else win.maximize();
    });
    ipcMain.handle('window:close', () => { if (win) win.close(); });
    ipcMain.handle('window:is-maximized', () => (win ? win.isMaximized() : false));

    createWindow();
  });

  /* ماك: إعادة إنشاء النافذة عند النقر على أيقونة الدوك */
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  /* ويندوز ولينكس: إنهاء التطبيق عند إغلاق كل النوافذ */
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
