const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db.cjs');

const PROVIDERS = {
  agy: {
    bin: 'agy',
    buildArgs: (prompt) => ['-p', prompt, '--output-format', 'json'],
  },
  claude: {
    bin: 'claude',
    buildArgs: (prompt) => ['-p', prompt, '--output-format', 'json', '--bare'],
  },
  codex: {
    bin: 'codex',
    buildArgs: (prompt) => ['exec', '--json', '-s', 'read-only', prompt],
  },
  copilot: {
    bin: 'copilot',
    buildArgs: (prompt) => ['-p', prompt, '-s', '--no-ask-user'],
  },
};

function runCommand(bin, args, timeoutMs = 45000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const child = spawn(bin, args, {
      shell: process.platform === 'win32',
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        resolve({ ok: false, error: 'Tempo limite excedido ao executar a CLI.' });
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      }
    });
    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (code === 0 || stdout.trim()) {
          resolve({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          resolve({ ok: false, error: stderr.trim() || `CLI retornou código ${code}` });
        }
      }
    });
  });
}

function resolveInvocation(provider, customCmd, prompt) {
  if (provider === 'custom') {
    const parts = (customCmd || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    return { bin: parts[0], args: [...parts.slice(1), prompt] };
  }
  const spec = PROVIDERS[provider];
  if (!spec) return null;
  return { bin: spec.bin, args: spec.buildArgs(prompt) };
}

async function testCli(provider, customCmd) {
  const bin = provider === 'custom' ? (customCmd || '').trim().split(/\s+/)[0] : PROVIDERS[provider]?.bin;
  if (!bin) return { ok: false, error: 'Comando não informado.' };
  const res = await runCommand(bin, ['--version'], 10000);
  if (res.ok) {
    return { ok: true, version: (res.stdout || 'CLI disponível').split(/\r?\n/)[0] };
  }
  return { ok: false, error: res.error || `Não foi possível executar "${bin}".` };
}

function extractJsonFromOutput(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();

  // Unwrap outer CLI JSON envelopes (e.g. Claude / Antigravity)
  try {
    const envelope = JSON.parse(text);
    if (envelope && typeof envelope === 'object') {
      if (typeof envelope.result === 'string') text = envelope.result;
      else if (typeof envelope.response === 'string') text = envelope.response;
      else if (envelope.structured_output) return envelope.structured_output;
      else if (envelope.title || envelope.artist || envelope.lyrics) return envelope;
    }
  } catch {
    // Not a single outer JSON envelope; search inside text/JSONL
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function fetchCoverFromDeezer(artist, title, album, coversDir, trackUid) {
  const q = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
  const resp = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
  if (!resp.ok) return null;
  const data = await resp.json();
  const item = data?.data?.[0];
  const coverUrl = item?.album?.cover_big || item?.album?.cover_medium;
  if (!coverUrl) return null;

  const imgResp = await fetch(coverUrl);
  if (!imgResp.ok) return null;
  const buf = Buffer.from(await imgResp.arrayBuffer());
  if (buf.length < 200) return null;

  fs.mkdirSync(coversDir, { recursive: true });
  const albKey = item.album?.id ? `alb_${item.album.id}` : trackUid;
  const dest = path.join(coversDir, `${albKey}.jpg`);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf);
  return `covers/${albKey}.jpg`;
}

function buildPrompt(track, task) {
  const context = JSON.stringify({
    title: track.title,
    artist: track.artist,
    album: track.album,
    genre: track.genre,
    year: track.year,
    duration_sec: track.duration_sec,
    original_rel_path: track.original_rel_path,
    file_path: track.file_path,
  });

  if (task === 'identify') {
    return (
      `Identifique esta música com base nos metadados e caminho original abaixo. ` +
      `Responda APENAS com um JSON válido no formato ` +
      `{"title": "...", "artist": "...", "album": "...", "genre": "...", "year": "YYYY"} ` +
      `(use null nos campos incertos).\nDados: ${context}`
    );
  }
  if (task === 'lyrics') {
    return (
      `Forneça a letra completa desta música. Se você tiver acesso ao arquivo de áudio em "${track.file_path}" ou souber a música pelos metadados, responda APENAS com um JSON válido: ` +
      `{"lyrics": "texto da letra...", "synced_lyrics": "[00:12.00] linha... (ou null)"}.\nDados: ${context}`
    );
  }
  return (
    `Identifique o artista, música e álbum exatos para buscarmos a capa oficial. ` +
    `Responda APENAS com JSON: {"title": "...", "artist": "...", "album": "..."}.\nDados: ${context}`
  );
}

async function runAiTask({ trackUid, task, dataDir, aiConfig }) {
  if (!aiConfig?.enabled) {
    return { ok: false, error: 'Assistente de IA está desativado nas Configurações.' };
  }
  const track = db.getTrackByUid(trackUid);
  if (!track) return { ok: false, error: 'Faixa não encontrada.' };

  const prompt = buildPrompt(track, task);
  const inv = resolveInvocation(aiConfig.provider, aiConfig.customCmd, prompt);
  if (!inv) return { ok: false, error: 'Provedor de IA inválido.' };

  const res = await runCommand(inv.bin, inv.args, 60000);
  if (!res.ok) return { ok: false, error: res.error };

  const parsed = extractJsonFromOutput(res.stdout);
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'A CLI respondeu, mas não retornou JSON estruturado.' };
  }

  const updates = {};
  if (task === 'identify') {
    if (parsed.title) updates.title = String(parsed.title).trim();
    if (parsed.artist) updates.artist = String(parsed.artist).trim();
    if (parsed.album) updates.album = String(parsed.album).trim();
    if (parsed.genre) updates.genre = String(parsed.genre).trim();
    if (parsed.year) updates.year = String(parsed.year).trim();
  } else if (task === 'lyrics') {
    if (parsed.lyrics) updates.lyrics = String(parsed.lyrics).trim();
    if (parsed.synced_lyrics) updates.synced_lyrics = String(parsed.synced_lyrics).trim();
  } else if (task === 'cover') {
    const artist = parsed.artist || track.artist;
    const title = parsed.title || track.title;
    const album = parsed.album || track.album;
    const coverPath = await fetchCoverFromDeezer(artist, title, album, path.join(dataDir, 'covers'), trackUid);
    if (!coverPath) {
      return { ok: false, error: 'Nenhuma capa encontrada para esta faixa.' };
    }
    updates.cover_path = coverPath;
  }

  if (!Object.keys(updates).length) {
    return { ok: false, error: 'Nenhuma informação nova retornada pela IA.' };
  }

  const updatedTrack = db.updateTrackFields(trackUid, updates);
  return { ok: true, track: updatedTrack };
}

module.exports = { testCli, runAiTask };
