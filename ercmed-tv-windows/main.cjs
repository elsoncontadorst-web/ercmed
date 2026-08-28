const { app, BrowserWindow, Menu, Tray, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let overlayWindow;
let tray;
let lastCommand;

const findCommand = argv => argv.find(value => value.startsWith('ercmedtv://'));

const parseCommand = value => {
  const command = new URL(value);
  const panelUrl = command.searchParams.get('panelUrl');
  const tvUrl = command.searchParams.get('tvUrl');
  if (!panelUrl || !tvUrl) throw new Error('Comando incompleto do ERCMed TV.');
  if (!panelUrl.startsWith('https://ercmed.com.br/')) throw new Error('Endereço do painel não autorizado.');
  if (!tvUrl.startsWith('https://globoplay.globo.com/')) throw new Error('Endereço da TV não autorizado.');
  return { panelUrl, tvUrl };
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
  const args = [
    '--new-window',
    `--window-position=${bounds.x},${bounds.y}`,
    `--window-size=${bounds.width},${bounds.height}`,
    '--start-fullscreen',
    tvUrl,
  ];
  const child = spawn(edge, args, { detached: true, stdio: 'ignore' });
  child.on('error', error => console.error('Não foi possível abrir o Microsoft Edge:', error));
  child.unref();
};

const showOverlay = async commandValue => {
  lastCommand = commandValue;
  const command = parseCommand(commandValue);
  const bounds = getTvDisplay().bounds;
  openEdge(command, bounds);

  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy();
  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
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
