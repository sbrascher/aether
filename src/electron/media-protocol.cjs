const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { protocol } = require('electron');

const MIME_MAP = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'aethereal',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
      },
    },
  ]);
}

let resolvedRoot = '';

function setMediaDataDir(dataDir) {
  resolvedRoot = path.resolve(dataDir);
}

function registerMediaHandler(dataDir) {
  setMediaDataDir(dataDir);

  protocol.handle('aethereal', (request) => {
    const parsed = new URL(request.url);
    const rawRel = parsed.hostname === 'media' ? parsed.pathname : `${parsed.hostname}${parsed.pathname}`;
    const relPath = decodeURIComponent(rawRel).replace(/^\/+/, '');
    const filePath = path.resolve(resolvedRoot, relPath);

    if (!filePath.startsWith(resolvedRoot) || !fs.existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
        return new Response(stream, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
          },
        });
      }
    }

    const stream = Readable.toWeb(fs.createReadStream(filePath));
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(stat.size),
      },
    });
  });
}

module.exports = { registerMediaScheme, registerMediaHandler, setMediaDataDir };
