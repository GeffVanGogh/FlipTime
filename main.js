const { app, BrowserWindow, ipcMain, powerMonitor, screen } = require('electron');
const path = require('path');

let win;
let idleTimer;
let screensaverActive = false;
let manualPreview = false;
let preSaverBounds = null;
let idleAfter = 300;
let prePanelBounds = null;
let pinned = false;

function clampToWorkArea(bounds, display = screen.getDisplayMatching(bounds)) {
  const area = display.workArea;
  return {
    ...bounds,
    x: Math.round(Math.max(area.x, Math.min(area.x + Math.max(0, area.width - bounds.width), bounds.x))),
    y: Math.round(Math.max(area.y, Math.min(area.y + Math.max(0, area.height - bounds.height), bounds.y)))
  };
}

function createWindow() {
  win = new BrowserWindow({
    width: 640, height: 430, minWidth: 400, minHeight: 255, resizable: false, center: true,
    frame: false, transparent: true, hasShadow: false,
    backgroundColor: '#00000000', title: 'FlipTime',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.setBounds(clampToWorkArea(win.getBounds(), screen.getPrimaryDisplay()));
  win.setAlwaysOnTop(true, 'floating');
  win.loadFile('index.html');
  win.on('closed', () => { win = null; });
  win.on('blur', () => win?.webContents.send('window:blurred'));
}

function screensaverBounds() {
  const displays = screen.getAllDisplays();
  const minX = Math.min(...displays.map(d => d.bounds.x));
  const minY = Math.min(...displays.map(d => d.bounds.y));
  const maxX = Math.max(...displays.map(d => d.bounds.x + d.bounds.width));
  const maxY = Math.max(...displays.map(d => d.bounds.y + d.bounds.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function enterScreensaver(manual = false) {
  if (!win || screensaverActive) return;
  screensaverActive = true;
  if (manual) manualPreview = true;
  preSaverBounds = win.getBounds();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setBounds(screensaverBounds(), false);
  win.webContents.send('screensaver:state', true);
}
function exitScreensaver() {
  if (!win || !screensaverActive) return;
  screensaverActive = false;
  manualPreview = false;
  if (preSaverBounds) {
    win.setBounds(preSaverBounds, false);
    preSaverBounds = null;
  }
  win.setAlwaysOnTop(true, 'floating');
  win.webContents.send('screensaver:state', false);
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.on('screensaver:settings', (_event, settings) => {
    idleAfter = Math.max(60, Number(settings.seconds) || 300);
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(() => {
      if (!win || manualPreview) return;
      if (!settings.enabled) { if (screensaverActive) exitScreensaver(); return; }
      const idle = powerMonitor.getSystemIdleTime();
      if (idle >= idleAfter) enterScreensaver();
      else if (screensaverActive) exitScreensaver();
    }, 1000);
  });
  ipcMain.on('screensaver:preview', () => enterScreensaver(true));
  ipcMain.on('screensaver:exit', () => exitScreensaver());
  ipcMain.on('window:close', () => win?.close());
  ipcMain.on('window:toggle-pin', () => {
    if (!win) return;
    pinned = !pinned;
    win.setAlwaysOnTop(true, 'floating');
    win.webContents.send('window:pinned-state', pinned);
  });
  ipcMain.on('window:minimize', () => win?.minimize());
  ipcMain.on('window:resize-to', (_event, requestedSize) => {
    if (!win || screensaverActive) return;
    const width = Number(requestedSize?.width), height = Number(requestedSize?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return;
    const display = screen.getDisplayMatching(win.getBounds()), area = display.workArea;
    const scale = Math.min(1, area.width / width, area.height / height);
    const bounds = clampToWorkArea({ ...win.getBounds(), width: Math.max(400, Math.round(width * scale)), height: Math.max(255, Math.round(height * scale)) }, display);
    win.setBounds(bounds, false);
  });
  ipcMain.on('window:move-by', (_event, delta) => {
    if (!win || screensaverActive || pinned) return;
    const dx = Number(delta?.x), dy = Number(delta?.y);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const bounds = win.getBounds(), x = bounds.x + Math.round(dx), y = bounds.y + Math.round(dy);
    const display = screen.getDisplayNearestPoint({ x: x + bounds.width / 2, y: y + bounds.height / 2 });
    win.setBounds(clampToWorkArea({ ...bounds, x, y }, display), false);
  });
  ipcMain.on('window:side-panel', (_event, request) => {
    if (!win || screensaverActive) return;
    const open = typeof request === 'object' ? !!request.open : !!request;
    const panelType = typeof request === 'object' ? request.type : 'settings';
    if (open) {
      if (!prePanelBounds) prePanelBounds = win.getBounds();
      const display = screen.getDisplayMatching(prePanelBounds), area = display.workArea;
      // Keep the user's clock window geometry intact; only add the narrow tool pane.
      const desiredPanelWidth = panelType === 'menu' ? 280 : panelType === 'tool' ? 360 : 430;
      const expandedWidth = Math.min(area.width, prePanelBounds.width + desiredPanelWidth);
      const expanded = clampToWorkArea({ ...prePanelBounds, width: expandedWidth }, display);
      win.setBounds(expanded, false);
      win.webContents.send('window:side-panel-state', {
        open: true,
        clockWidth: prePanelBounds.width,
        clockHeight: prePanelBounds.height,
        panelWidth: Math.max(0, expanded.width - prePanelBounds.width)
      });
    } else if (!open && prePanelBounds) {
      const display = screen.getDisplayMatching(win.getBounds());
      const restored = clampToWorkArea({ ...prePanelBounds }, display);
      prePanelBounds = null;
      win.setBounds(restored, false);
      win.webContents.send('window:side-panel-state', { open: false });
    }
  });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
