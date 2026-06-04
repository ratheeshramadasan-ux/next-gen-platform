const { app, Tray, Menu, nativeImage, shell, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let tray = null;
let activationWindow = null;
let portalWindow = null; // Hidden portal session for localStorage sync

// ── Config helpers ────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'agent-config.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function writeConfig(data) {
  const existing = readConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...data }, null, 2));
}

// ── Portal localStorage access ────────────────────────────────────────────────
// We keep a hidden BrowserWindow pointing at the portal to bridge localStorage.
function getOrCreatePortalBridge() {
  if (portalWindow && !portalWindow.isDestroyed()) return portalWindow;

  const config = readConfig();
  const portalUrl = (config.orchestratorUrl || 'http://localhost:4000')
    .replace(/\/api\/.*$/, '');

  portalWindow = new BrowserWindow({
    show: false,
    width: 1,
    height: 1,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  portalWindow.loadURL(portalUrl).catch(() => {
    // Portal not reachable – that's fine
  });

  portalWindow.on('closed', () => {
    portalWindow = null;
  });

  return portalWindow;
}

async function getPortalTheme() {
  try {
    const win = getOrCreatePortalBridge();
    // Wait briefly for page to load if it's freshly created
    await new Promise(r => setTimeout(r, 500));
    const theme = await win.webContents.executeJavaScript(
      `localStorage.getItem('nextgen_theme')`, true
    );
    return theme;
  } catch (e) {
    return null;
  }
}

async function setPortalTheme(themeName) {
  try {
    const win = getOrCreatePortalBridge();
    await new Promise(r => setTimeout(r, 300));
    await win.webContents.executeJavaScript(
      `localStorage.setItem('nextgen_theme', ${JSON.stringify(themeName)})`, true
    );
  } catch (e) { /* ignore */ }
}

// ── Activation Window ─────────────────────────────────────────────────────────
function openActivationWindow() {
  if (activationWindow) {
    activationWindow.focus();
    return;
  }

  activationWindow = new BrowserWindow({
    width: 460,
    height: 520,
    resizable: false,
    title: 'Alo Agent Setup',
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Share localStorage with the portal on localhost
      partition: 'persist:portal'
    }
  });

  activationWindow.loadFile('index.html');
  activationWindow.setMenu(null);

  activationWindow.on('closed', () => {
    activationWindow = null;
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

// Save portal URL + token and restart service
ipcMain.handle('save-activation-config', async (event, { url, token }) => {
  try {
    writeConfig({ orchestratorUrl: url + '/api/orchestrator', activationToken: token });

    return new Promise((resolve) => {
      exec(
        'launchctl unload /Library/LaunchDaemons/com.nextgen.botrunner.plist && launchctl load /Library/LaunchDaemons/com.nextgen.botrunner.plist',
        () => {
          resolve({ success: true });
        }
      );
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Return saved config to the renderer
ipcMain.handle('get-agent-config', async () => {
  return readConfig();
});

// Get theme from portal localStorage
ipcMain.handle('get-portal-theme', async () => {
  // First try reading from localStorage directly via the shared partition
  // (works because activationWindow uses persist:portal which matches the portal's session)
  try {
    if (activationWindow && !activationWindow.isDestroyed()) {
      const theme = await activationWindow.webContents.executeJavaScript(
        `localStorage.getItem('nextgen_theme')`, true
      );
      if (theme) return theme;
    }
  } catch (e) { /* ignore */ }

  // Fallback: read from config file
  const config = readConfig();
  return config.agentTheme || null;
});

// Persist theme to localStorage + config
ipcMain.handle('set-portal-theme', async (event, themeName) => {
  try {
    writeConfig({ agentTheme: themeName });
    // Also write to the portal localStorage via hidden bridge
    await setPortalTheme(themeName);
  } catch (e) { /* ignore */ }
  return { success: true };
});

// Close the activation window
ipcMain.on('close-activation-window', () => {
  if (activationWindow) activationWindow.close();
});

// ── App Bootstrap ─────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (activationWindow) activationWindow.focus();
  });

  app.on('ready', () => {
    // Tray icon
    const iconPath = path.join(__dirname, 'assets', 'tray-iconTemplate.png');
    let icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);

    const config = readConfig();
    const portalUrl = (config.orchestratorUrl || 'http://localhost:4000')
      .replace(/\/api\/.*$/, '');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Alo Agent  v0.2.0', enabled: false },
      { type: 'separator' },
      {
        label: 'Activation Setup',
        click: () => openActivationWindow()
      },
      {
        label: 'Open Bot Agent Cockpit',
        click: () => shell.openExternal(portalUrl + '/dashboard/bot-agents')
      },
      {
        label: 'Open Downloads',
        click: () => shell.openExternal(portalUrl + '/dashboard/downloads')
      },
      { type: 'separator' },
      {
        label: 'Check Service Status',
        click: () => {
          exec('launchctl list com.nextgen.botrunner', (error, stdout) => {
            const status = error ? 'Service not running.' : stdout.trim();
            console.log('[AloAgent] Status:', status);
          });
        }
      },
      {
        label: 'Restart Agent Service',
        click: () => {
          exec('launchctl unload /Library/LaunchDaemons/com.nextgen.botrunner.plist && launchctl load /Library/LaunchDaemons/com.nextgen.botrunner.plist');
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);

    tray.setToolTip('NextGen Alo Agent – Connected');
    tray.setContextMenu(contextMenu);

    console.log('[AloAgent] Tray active. Portal:', portalUrl);
  });
}

// macOS: hide dock icon
if (process.platform === 'darwin') {
  app.dock?.hide();
}

// Keep running when all windows are closed
app.on('window-all-closed', () => {
  // Intentionally empty – tray app stays alive
});
