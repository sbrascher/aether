import { LrcLine } from '../models/music.model';

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTotalHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function mediaUrl(relPath: string | null | undefined): string | null {
  if (!relPath) return null;
  const clean = relPath.replace(/^\/+/, '');
  return `aethereal://media/${clean}`;
}

export function parseLrc(synced: string | null | undefined): LrcLine[] {
  if (!synced) return [];
  const lines: LrcLine[] = [];
  const tagRe = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const raw of synced.split(/\r?\n/)) {
    const matches = [...raw.matchAll(tagRe)];
    if (!matches.length) continue;
    const text = raw.replace(tagRe, '').trim();
    if (!text) continue;
    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) / 1000 : 0;
      lines.push({ timeSec: mins * 60 + secs + frac, text });
    }
  }
  return lines.sort((a, b) => a.timeSec - b.timeSec);
}
