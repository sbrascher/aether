const fs = require('node:fs');
const path = require('node:path');

function getConfigPath(userDataDir) {
  return path.join(userDataDir, 'config.json');
}

const DEFAULT_AI_CONFIG = {
  enabled: false,
  provider: 'agy',
  customCmd: '',
};

function loadConfig(userDataDir, defaultDataDir) {
  const cfgPath = getConfigPath(userDataDir);
  let dataDir = defaultDataDir;
  let ai = { ...DEFAULT_AI_CONFIG };
  try {
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (parsed.dataDir && fs.existsSync(path.join(parsed.dataDir, 'library.db'))) {
        dataDir = parsed.dataDir;
      }
      if (parsed.ai && typeof parsed.ai === 'object') {
        ai = { ...DEFAULT_AI_CONFIG, ...parsed.ai };
      }
    }
  } catch {
    // Fallback to default on invalid config
  }
  return { dataDir, ai };
}

function saveConfig(userDataDir, data) {
  const cfgPath = getConfigPath(userDataDir);
  fs.mkdirSync(userDataDir, { recursive: true });
  let existing = {};
  try {
    if (fs.existsSync(cfgPath)) {
      existing = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    }
  } catch {
    existing = {};
  }
  fs.writeFileSync(cfgPath, JSON.stringify({ ...existing, ...data }, null, 2), 'utf-8');
}

module.exports = { loadConfig, saveConfig };
