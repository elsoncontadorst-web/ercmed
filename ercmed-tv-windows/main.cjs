const { app, BrowserWindow, ipcMain, Menu, Tray, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let overlayWindow;
let tray;
let lastCommand;
const edgeDebugPort = 9228;

const findCommand = argv => argv.find(value => value.startsWith('ercmedtv://'));

const parseCommand = value => {
  const command = new URL(value);
  const panelUrl = command.searchParams.get('panelUrl');
  const tvUrl = command.searchParams.get('tvUrl');
  const mode = command.searchParams.get('mode') === 'integrated' ? 'integrated' : 'overlay';
  if (!panelUrl || !tvUrl) throw new Error('Comando incompleto do ERCMed TV.');
  if (!panelUrl.startsWith('https://ercmed.com.br/')) throw new Error('Endereço do painel não autorizado.');
  const source = new URL(tvUrl);
  const allowedTv = source.protocol === 'https:' && ['globoplay.globo.com', 'youtube.com', 'www.youtube.com', 'youtu.be'].includes(source.hostname);
  if (!allowedTv) throw new Error('Endereço da TV não autorizado.');
  return { panelUrl, tvUrl, mode };
};

const getTvDisplay = () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().find(display => display.id !== primary.id) || primary;
};

const openEdge = ({ tvUrl }, bounds) => {
  const candidates = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  const edge = candidates.find(candidate => candidate && fs.existsSync(candidate)) || 'msedge.exe';
  const edgeProfile = path.join(app.getPath('userData'), 'edge-tv-profile');
  const args = [
    `--user-data-dir=${edgeProfile}`,
    '--no-first-run',
    '--disable-features=msEdgeSidebarV2',
    `--remote-debugging-port=${edgeDebugPort}`,
    `--window-position=${bounds.x},${bounds.y}`,
    `--window-size=${bounds.width},${bounds.height}`,
    `--app=${tvUrl}`,
  ];
  const child = spawn(edge, args, { detached: true, stdio: 'ignore' });
  child.on('error', error => console.error('Não foi possível abrir o Microsoft Edge:', error));
  child.unref();
};

const sendDevToolsCommand = async (webSocketUrl, method, params = {}) => new Promise((resolve, reject) => {
  const socket = new WebSocket(webSocketUrl);
  const id = Date.now();
  const timeout = setTimeout(() => { socket.close(); reject(new Error('Tempo esgotado ao controlar o áudio da TV.')); }, 2500);
  socket.addEventListener('open', () => socket.send(JSON.stringify({ id, method, params })));
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id !== id) return;
    clearTimeout(timeout);
    socket.close();
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  });
  socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Não foi possível controlar o áudio da TV.')); });
});

const setTvMuted = async muted => {
  const expression = `(() => { document.querySelectorAll('video, audio').forEach(media => { if (${muted}) { if (!media.hasAttribute('data-ercmed-muted')) media.setAttribute('data-ercmed-muted', media.muted ? '1' : '0'); media.muted = true; } else { const previous = media.getAttribute('data-ercmed-muted'); if (previous !== null) { media.muted = previous === '1'; media.removeAttribute('data-ercmed-muted'); } } }); })()`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${edgeDebugPort}/json/list`);
      const targets = await response.json();
      const tvTargets = targets.filter(target => target.webSocketDebuggerUrl && (target.url?.includes('globoplay.globo.com') || target.url?.includes('youtube.com') || target.type === 'iframe'));
      await Promise.all(tvTargets.map(target => sendDevToolsCommand(target.webSocketDebuggerUrl, 'Runtime.evaluate', { expression })));
      if (tvTargets.length) return;
    } catch (error) { if (attempt === 4) console.error(error); }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

ipcMain.on('ercmed-tv:set-muted', (_event, muted) => setTvMuted(Boolean(muted)).catch(console.error));

const showOverlay = async commandValue => {
  lastCommand = commandValue;
  const command = parseCommand(commandValue);
  const bounds = getTvDisplay().bounds;
  if (command.mode === 'overlay') openEdge(command, bounds);
  const panelWidth = command.mode === 'integrated' ? bounds.width : Math.max(320, Math.round(bounds.width * 0.28));
  const panelBounds = {
    x: command.mode === 'integrated' ? bounds.x : bounds.x + bounds.width - panelWidth,
    y: bounds.y,
    width: panelWidth,
    height: bounds.height,
  };

  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy();
  overlayWindow = new BrowserWindow({
    x: panelBounds.x,
    y: panelBounds.y,
    width: panelBounds.width,
    height: panelBounds.height,
    frame: false,
    transparent: false,
    backgroundColor: '#0b252e',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: command.mode === 'integrated',
    hasShadow: false,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setIgnoreMouseEvents(command.mode === 'overlay', { forward: true });
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  await overlayWindow.loadURL(command.panelUrl);
  overlayWindow.showInactive();
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', (_event, argv) => {
    const command = findCommand(argv);
    if (command) showOverlay(command).catch(console.error);
  });

  app.whenReady().then(() => {
    app.setAsDefaultProtocolClient('ercmedtv');
    tray = new Tray(process.execPath);
    tray.setToolTip('ERCMed TV');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Reabrir ERCMed TV', click: () => lastCommand && showOverlay(lastCommand).catch(console.error) },
      { type: 'separator' },
      { label: 'Encerrar ERCMed TV', click: () => app.quit() },
    ]));
    const command = findCommand(process.argv);
    if (command) showOverlay(command).catch(console.error);
  });
}

app.on('window-all-closed', event => event.preventDefault());
