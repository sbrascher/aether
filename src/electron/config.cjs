const fs = require('node:fs');
const path = require('node:path');

function getConfigPath(userDataDir) {
  return path.join(userDataDir, 'config.json');
}

function loadConfig(userDataDir, defaultDataDir) {
  const cfgPath = getConfigPath(userDataDir);
  try {
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (parsed.dataDir && fs.existsSync(path.join(parsed.dataDir, 'library.db'))) {
        return { dataDir: parsed.dataDir };
      }
    }
  } catch {
    // Fallback to default on invalid config
  }
  return { dataDir: defaultDataDir };
}

function saveConfig(userDataDir, data) {
  const cfgPath = getConfigPath(userDataDir);
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { loadConfig, saveConfig };
