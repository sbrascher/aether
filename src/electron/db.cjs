const { DatabaseSync } = require('node:sqlite');

let db = null;

function initDb(dbPath) {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore close error
    }
  }
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_uid TEXT NOT NULL,
      played_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_play_history_at ON play_history(played_at DESC);
  `);
  return db;
}

function getLibraryStats() {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS totalTracks,
      COUNT(DISTINCT artist) AS totalArtists,
      COUNT(DISTINCT album) AS totalAlbums,
      COUNT(DISTINCT genre) AS totalGenres,
      SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) AS totalFavorites,
      COALESCE(SUM(duration_sec), 0) AS totalDurationSec
    FROM tracks
  `).get();
  return row;
}

function queryTracks(opts = {}) {
  const {
    search = '',
    genre = '',
    artist = '',
    album = '',
    favoritesOnly = false,
    sort = 'artist',
    limit = 200,
    offset = 0,
  } = opts;

  const where = [];
  const params = [];

  if (search && search.trim()) {
    const tokens = search
      .trim()
      .split(/\s+/)
      .map((t) => `"${t.replace(/"/g, '""')}"*`)
      .join(' ');
    where.push('t.track_uid IN (SELECT track_uid FROM tracks_fts WHERE tracks_fts MATCH ?)');
    params.push(tokens);
  }
  if (genre) {
    where.push('t.genre = ?');
    params.push(genre);
  }
  if (artist) {
    where.push('t.artist = ?');
    params.push(artist);
  }
  if (album) {
    where.push('t.album = ?');
    params.push(album);
  }
  if (favoritesOnly) {
    where.push('t.is_favorite = 1');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderMap = {
    artist: 't.artist ASC, t.album ASC, COALESCE(t.track_number, 999) ASC, t.title ASC',
    title: 't.title ASC',
    album: 't.album ASC, COALESCE(t.track_number, 999) ASC, t.title ASC',
    plays: 't.play_count DESC, t.title ASC',
    recent: 't.created_at DESC, t.title ASC',
  };
  const orderSql = orderMap[sort] || orderMap.artist;

  const items = db.prepare(`
    SELECT t.*
    FROM tracks t
    ${whereSql}
    ORDER BY ${orderSql}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const countRow = db.prepare(`SELECT COUNT(*) AS total FROM tracks t ${whereSql}`).get(...params);
  return { items, total: countRow.total };
}

function getArtists() {
  return db.prepare(`
    SELECT
      artist AS name,
      COUNT(*) AS trackCount,
      COUNT(DISTINCT album) AS albumCount,
      MAX(cover_path) AS coverPath
    FROM tracks
    GROUP BY artist
    ORDER BY trackCount DESC, artist ASC
  `).all();
}

function getAlbums() {
  return db.prepare(`
    SELECT
      album AS name,
      MIN(artist) AS artist,
      MAX(year) AS year,
      COUNT(*) AS trackCount,
      MAX(cover_path) AS coverPath
    FROM tracks
    GROUP BY album, artist
    ORDER BY trackCount DESC, album ASC
  `).all();
}

function getGenres() {
  return db.prepare(`
    SELECT
      genre AS name,
      COUNT(*) AS trackCount,
      MAX(cover_path) AS coverPath
    FROM tracks
    GROUP BY genre
    ORDER BY trackCount DESC, genre ASC
  `).all();
}

function getTopPlayed(limit = 20) {
  return db.prepare(`
    SELECT * FROM tracks
    ORDER BY play_count DESC, is_favorite DESC, title ASC
    LIMIT ?
  `).all(limit);
}

function toggleFavorite(trackUid) {
  db.prepare(`
    UPDATE tracks
    SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END
    WHERE track_uid = ?
  `).run(trackUid);
  return db.prepare('SELECT track_uid, is_favorite FROM tracks WHERE track_uid = ?').get(trackUid);
}

function incrementPlayCount(trackUid) {
  db.prepare('UPDATE tracks SET play_count = play_count + 1 WHERE track_uid = ?').run(trackUid);
  db.prepare('INSERT INTO play_history (track_uid) VALUES (?)').run(trackUid);
  return db.prepare('SELECT track_uid, play_count FROM tracks WHERE track_uid = ?').get(trackUid);
}

function getHistory(limit = 150) {
  return db.prepare(`
    SELECT t.*, MAX(h.played_at) AS last_played_at
    FROM play_history h
    JOIN tracks t ON t.track_uid = h.track_uid
    GROUP BY t.track_uid
    ORDER BY last_played_at DESC
    LIMIT ?
  `).all(limit);
}

function getTracksByUids(uids) {
  if (!Array.isArray(uids) || !uids.length) return [];
  const placeholders = uids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM tracks WHERE track_uid IN (${placeholders})`).all(...uids);
  const byUid = new Map(rows.map((r) => [r.track_uid, r]));
  return uids.map((id) => byUid.get(id)).filter(Boolean);
}

function getPlaylists() {
  return db.prepare(`
    SELECT
      p.*,
      COUNT(pt.track_uid) AS trackCount
    FROM playlists p
    LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
}

function createPlaylist(name, description = '') {
  const info = db.prepare('INSERT INTO playlists (name, description) VALUES (?, ?)').run(name.trim(), description.trim());
  return db.prepare('SELECT *, 0 AS trackCount FROM playlists WHERE id = ?').get(info.lastInsertRowid);
}

function deletePlaylist(playlistId) {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);
  return { deleted: true };
}

function getPlaylistTracks(playlistId) {
  return db.prepare(`
    SELECT t.*
    FROM playlist_tracks pt
    JOIN tracks t ON t.track_uid = pt.track_uid
    WHERE pt.playlist_id = ?
    ORDER BY pt.position ASC
  `).all(playlistId);
}

function addTrackToPlaylist(playlistId, trackUid) {
  const maxRow = db.prepare('SELECT COALESCE(MAX(position), 0) AS maxPos FROM playlist_tracks WHERE playlist_id = ?').get(playlistId);
  db.prepare(`
    INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_uid, position)
    VALUES (?, ?, ?)
  `).run(playlistId, trackUid, maxRow.maxPos + 1);
  return { added: true };
}

function removeTrackFromPlaylist(playlistId, trackUid) {
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_uid = ?').run(playlistId, trackUid);
  return { removed: true };
}

module.exports = {
  initDb,
  getLibraryStats,
  queryTracks,
  getArtists,
  getAlbums,
  getGenres,
  getTopPlayed,
  toggleFavorite,
  incrementPlayCount,
  getHistory,
  getTracksByUids,
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
};
