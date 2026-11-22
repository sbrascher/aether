const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const db = require('./db.cjs');
const { importFolder } = require('./importer.cjs');
const { loadConfig, saveConfig } = require('./config.cjs');
const { registerMediaScheme, registerMediaHandler, setMediaDataDir } = require('./media-protocol.cjs');

registerMediaScheme();

function resolveDefaultDataDir() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'data'),
    path.join(path.dirname(app.getPath('exe')), 'data'),
    'D:\\Musicas\\data',
  ];
  return (
    candidates.find((dir) => fs.existsSync(path.join(dir, 'library.db'))) ||
    path.join(app.getPath('userData'), 'data')
  );
}

const isDev = process.argv.includes('--dev');
let currentDataDir = '';
let mainWindow = null;

function registerIpcHandlers() {
  ipcMain.handle('app:getDataDir', () => currentDataDir);
  ipcMain.handle('app:selectDataDir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar pasta de dados (com library.db)',
      defaultPath: currentDataDir,
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths.length) {
      return { changed: false };
    }
    const chosen = res.filePaths[0];
    const dbFile = path.join(chosen, 'library.db');
    if (!fs.existsSync(dbFile)) {
      return {
        changed: false,
        error: 'A pasta selecionada não contém o arquivo library.db.',
      };
    }
    currentDataDir = chosen;
    saveConfig(app.getPath('userData'), { dataDir: currentDataDir });
    db.initDb(dbFile);
    setMediaDataDir(currentDataDir);
    return { changed: true, dataDir: currentDataDir };
  });

  ipcMain.handle('app:importFolder', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar pasta com músicas para importar',
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths.length) {
      return { canceled: true, totalFound: 0, imported: 0, skipped: 0 };
    }
    return importFolder(res.filePaths[0], currentDataDir, (progress) => {
      mainWindow?.webContents.send('import:progress', progress);
    });
  });

  ipcMain.handle('db:stats', () => db.getLibraryStats());
  ipcMain.handle('db:tracks', (_e, opts) => db.queryTracks(opts));
  ipcMain.handle('db:artists', () => db.getArtists());
  ipcMain.handle('db:albums', () => db.getAlbums());
  ipcMain.handle('db:genres', () => db.getGenres());
  ipcMain.handle('db:topPlayed', (_e, limit) => db.getTopPlayed(limit));
  ipcMain.handle('db:toggleFavorite', (_e, uid) => db.toggleFavorite(uid));
  ipcMain.handle('db:incrementPlay', (_e, uid) => db.incrementPlayCount(uid));
  ipcMain.handle('db:history', (_e, limit) => db.getHistory(limit));
  ipcMain.handle('db:tracksByUids', (_e, uids) => db.getTracksByUids(uids));
  ipcMain.handle('db:playlists', () => db.getPlaylists());
  ipcMain.handle('db:createPlaylist', (_e, name, desc) => db.createPlaylist(name, desc));
  ipcMain.handle('db:deletePlaylist', (_e, id) => db.deletePlaylist(id));
  ipcMain.handle('db:playlistTracks', (_e, id) => db.getPlaylistTracks(id));
  ipcMain.handle('db:addToPlaylist', (_e, pid, uid) => db.addTrackToPlaylist(pid, uid));
  ipcMain.handle('db:removeFromPlaylist', (_e, pid, uid) => db.removeTrackFromPlaylist(pid, uid));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#0B161C',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0B161C',
      symbolColor: '#5CE1E6',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'aethereal-player', 'browser', 'index.html'));
  }
}

app.whenReady().then(() => {
  const cfg = loadConfig(app.getPath('userData'), resolveDefaultDataDir());
  currentDataDir = cfg.dataDir;
  db.initDb(path.join(currentDataDir, 'library.db'));
  registerMediaHandler(currentDataDir);
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
