const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopClock', {
  setScreensaver: settings => ipcRenderer.send('screensaver:settings', settings),
  previewScreensaver: () => ipcRenderer.send('screensaver:preview'),
  exitScreensaver: () => ipcRenderer.send('screensaver:exit'),
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  setAlwaysOnTop: enabled => ipcRenderer.send('window:set-always-on-top', enabled),
  togglePin: () => ipcRenderer.send('window:toggle-pin'),
  setClickThrough: enabled => ipcRenderer.send('window:set-click-through', enabled),
  resizeWindow: size => ipcRenderer.send('window:resize-to', size),
  moveWindowBy: delta => ipcRenderer.send('window:move-by', delta),
  setSidePanel: request => ipcRenderer.send('window:side-panel', request),
  onScreensaverState: callback => ipcRenderer.on('screensaver:state', (_event, value) => callback(value)),
  onWindowBlur: callback => ipcRenderer.on('window:blurred', callback),
  onSidePanelState: callback => ipcRenderer.on('window:side-panel-state', (_event, state) => callback(state)),
  onPinnedState: callback => ipcRenderer.on('window:pinned-state', (_event, pinned) => callback(pinned))
});
