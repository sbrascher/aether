export interface Track {
  track_uid: string;
  file_path: string;
  cover_path: string | null;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string | null;
  track_number: number | null;
  duration_sec: number | null;
  bitrate: number | null;
  sample_rate: number | null;
  ext: string;
  size_bytes: number;
  lyrics: string | null;
  synced_lyrics: string | null;
  play_count: number;
  is_favorite: number;
}

export interface LibraryStats {
  totalTracks: number;
  totalArtists: number;
  totalAlbums: number;
  totalGenres: number;
  totalFavorites: number;
  totalDurationSec: number;
}

export interface ArtistSummary {
  name: string;
  trackCount: number;
  albumCount: number;
  coverPath: string | null;
}

export interface AlbumSummary {
  name: string;
  artist: string;
  year: string | null;
  trackCount: number;
  coverPath: string | null;
}

export interface GenreSummary {
  name: string;
  trackCount: number;
  coverPath: string | null;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  trackCount: number;
  created_at: string;
}

export interface LrcLine {
  timeSec: number;
  text: string;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type NavView = 'home' | 'tracks' | 'artists' | 'albums' | 'genres' | 'favorites' | 'history' | 'playlist' | 'settings' | 'about';

export interface TrackQueryOpts {
  search?: string;
  genre?: string;
  artist?: string;
  album?: string;
  favoritesOnly?: boolean;
  sort?: 'artist' | 'title' | 'album' | 'plays' | 'recent';
  limit?: number;
  offset?: number;
}

export interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  skipped: number;
  filename: string;
}

export interface ImportResult {
  canceled: boolean;
  totalFound: number;
  imported: number;
  skipped: number;
}

export type AiProvider = 'agy' | 'claude' | 'codex' | 'copilot' | 'custom';
export type AiTaskType = 'identify' | 'lyrics' | 'cover';

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider;
  customCmd: string;
}

export interface AiTaskResult {
  ok: boolean;
  track?: Track;
  error?: string;
}

export interface MusicApi {
  getDataDir(): Promise<string>;
  selectDataDir(): Promise<{ changed: boolean; dataDir?: string; error?: string }>;
  importFolder(): Promise<ImportResult>;
  onImportProgress(cb: (progress: ImportProgress) => void): () => void;
  getAiConfig(): Promise<AiConfig>;
  saveAiConfig(cfg: Partial<AiConfig>): Promise<AiConfig>;
  testAiCli(provider: AiProvider, customCmd?: string): Promise<{ ok: boolean; version?: string; error?: string }>;
  runAiTask(trackUid: string, task: AiTaskType): Promise<AiTaskResult>;
  getStats(): Promise<LibraryStats>;
  queryTracks(opts: TrackQueryOpts): Promise<{ items: Track[]; total: number }>;
  getArtists(): Promise<ArtistSummary[]>;
  getAlbums(): Promise<AlbumSummary[]>;
  getGenres(): Promise<GenreSummary[]>;
  getTopPlayed(limit?: number): Promise<Track[]>;
  toggleFavorite(trackUid: string): Promise<{ track_uid: string; is_favorite: number }>;
  incrementPlayCount(trackUid: string): Promise<{ track_uid: string; play_count: number }>;
  getHistory(limit?: number): Promise<Track[]>;
  getTracksByUids(uids: string[]): Promise<Track[]>;
  getPlaylists(): Promise<Playlist[]>;
  createPlaylist(name: string, description?: string): Promise<Playlist>;
  deletePlaylist(id: number): Promise<{ deleted: boolean }>;
  getPlaylistTracks(id: number): Promise<Track[]>;
  addTrackToPlaylist(playlistId: number, trackUid: string): Promise<{ added: boolean }>;
  removeTrackFromPlaylist(playlistId: number, trackUid: string): Promise<{ removed: boolean }>;
}

declare global {
  interface Window {
    musicApi?: MusicApi;
  }
}
