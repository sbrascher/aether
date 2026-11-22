const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db.cjs');

const SUPPORTED_EXTS = new Set(['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac']);

function collectAudioFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectAudioFiles(full, out);
    } else if (entry.isFile() && SUPPORTED_EXTS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function computeTrackUid(filePath, size) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(Math.min(65536, size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    const hex = crypto.createHash('sha1').update(String(size)).update(buf).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  } finally {
    fs.closeSync(fd);
  }
}

function inferFromFilename(filePath) {
  const stem = path.basename(filePath, path.extname(filePath)).replace(/^\d+\s*[-._)]\s*/, '').trim();
  const parts = stem.split(' - ').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { artist: parts[0], title: parts.slice(1).join(' - ') };
  }
  return { artist: 'Artista Desconhecido', title: stem || 'Faixa Sem Título' };
}

function saveCover(picture, coversDir, trackUid) {
  if (!picture?.data?.length) return null;
  const ext = (picture.format || '').toLowerCase().includes('png') ? '.png' : '.jpg';
  const rel = `covers/${trackUid}${ext}`;
  const dest = path.join(coversDir, `${trackUid}${ext}`);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, picture.data);
  }
  return rel;
}

async function importFolder(sourceDir, dataDir, onProgress) {
  const mm = await import('music-metadata');
  const tracksDir = path.join(dataDir, 'tracks');
  const coversDir = path.join(dataDir, 'covers');
  fs.mkdirSync(tracksDir, { recursive: true });
  fs.mkdirSync(coversDir, { recursive: true });

  const files = collectAudioFiles(sourceDir);
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const filename = path.basename(filePath);
    try {
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        skipped++;
        continue;
      }
      const trackUid = computeTrackUid(filePath, stat.size);
      if (db.trackExists(trackUid)) {
        skipped++;
      } else {
        const ext = path.extname(filePath).toLowerCase();
        const destFile = path.join(tracksDir, `${trackUid}${ext}`);
        fs.copyFileSync(filePath, destFile);

        let common = {};
        let format = {};
        try {
          const parsed = await mm.parseFile(filePath, { duration: true });
          common = parsed.common || {};
          format = parsed.format || {};
        } catch {
          // Fallback to filename inference if tags are unreadable
        }

        const inferred = inferFromFilename(filePath);
        const coverPath = saveCover(common.picture?.[0], coversDir, trackUid);

        db.insertTrack({
          track_uid: trackUid,
          file_path: `tracks/${trackUid}${ext}`,
          cover_path: coverPath,
          title: (common.title || '').trim() || inferred.title,
          artist: (common.artist || '').trim() || inferred.artist,
          album: (common.album || '').trim() || path.basename(path.dirname(filePath)) || 'Singles & Avulsas',
          genre: (common.genre?.[0] || '').trim() || 'Outros',
          year: common.year ? String(common.year) : null,
          track_number: common.track?.no ?? null,
          duration_sec: format.duration ? Number(format.duration.toFixed(2)) : null,
          bitrate: format.bitrate ? Math.round(format.bitrate) : null,
          sample_rate: format.sampleRate ?? null,
          ext,
          size_bytes: stat.size,
          lyrics: common.lyrics?.[0] ? String(common.lyrics[0]).trim() : null,
          original_rel_path: path.relative(sourceDir, filePath),
        });
        imported++;
      }
    } catch {
      skipped++;
    }

    onProgress?.({ current: i + 1, total: files.length, imported, skipped, filename });
  }

  db.rebuildFts();
  return { canceled: false, totalFound: files.length, imported, skipped };
}

module.exports = { importFolder };
