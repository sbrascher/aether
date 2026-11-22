import { Injectable, signal } from '@angular/core';
import {
  AiConfig,
  AiProvider,
  AiTaskResult,
  AiTaskType,
  AlbumSummary,
  ArtistSummary,
  GenreSummary,
  ImportProgress,
  ImportResult,
  LibraryStats,
  NavView,
  Playlist,
  Track,
  TrackQueryOpts,
} from '../models/music.model';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly stats = signal<LibraryStats | null>(null);
  readonly tracks = signal<Track[]>([]);
  readonly totalTracks = signal(0);
  readonly topPlayed = signal<Track[]>([]);
  readonly artists = signal<ArtistSummary[]>([]);
  readonly albums = signal<AlbumSummary[]>([]);
  readonly genres = signal<GenreSummary[]>([]);
  readonly playlists = signal<Playlist[]>([]);

  readonly activeView = signal<NavView>('home');
  readonly activePlaylist = signal<Playlist | null>(null);
  readonly searchQuery = signal('');
  readonly activeFilter = signal<{ artist?: string; album?: string; genre?: string }>({});
  readonly dataDir = signal('');
  readonly aiConfig = signal<AiConfig>({ enabled: false, provider: 'agy', customCmd: '' });
  readonly loading = signal(false);
  readonly importing = signal(false);
  readonly importProgress = signal<ImportProgress | null>(null);
  readonly aiBusyTrackUid = signal<string | null>(null);

  private get api() {
    return window.musicApi;
  }

  async init(): Promise<void> {
    if (!this.api) return;
    const [dataDir, aiCfg, stats, playlists, topPlayed, genres] = await Promise.all([
      this.api.getDataDir(),
      this.api.getAiConfig(),
      this.api.getStats(),
      this.api.getPlaylists(),
      this.api.getTopPlayed(12),
      this.api.getGenres(),
    ]);
    this.dataDir.set(dataDir);
    this.aiConfig.set(aiCfg);
    this.stats.set(stats);
    this.playlists.set(playlists);
    this.topPlayed.set(topPlayed);
    this.genres.set(genres);
  }

  async changeDataDir(): Promise<{ changed: boolean; error?: string }> {
    if (!this.api) return { changed: false };
    const res = await this.api.selectDataDir();
    if (res.changed && res.dataDir) {
      this.dataDir.set(res.dataDir);
      await this.init();
    }
    return res;
  }

  async importFolder(): Promise<ImportResult> {
    if (!this.api || this.importing()) {
      return { canceled: true, totalFound: 0, imported: 0, skipped: 0 };
    }
    this.importing.set(true);
    this.importProgress.set(null);
    const unsubscribe = this.api.onImportProgress((p) => this.importProgress.set(p));
    try {
      const res = await this.api.importFolder();
      if (!res.canceled) {
        await this.init();
      }
      return res;
    } finally {
      unsubscribe();
      this.importing.set(false);
    }
  }

  async saveAiConfig(cfg: Partial<AiConfig>): Promise<void> {
    if (!this.api) return;
    const saved = await this.api.saveAiConfig(cfg);
    this.aiConfig.set(saved);
  }

  async testAiCli(provider: AiProvider, customCmd: string): Promise<{ ok: boolean; version?: string; error?: string }> {
    if (!this.api) return { ok: false, error: 'API indisponível.' };
    return this.api.testAiCli(provider, customCmd);
  }

  async runAiTask(trackUid: string, task: AiTaskType): Promise<AiTaskResult> {
    if (!this.api) return { ok: false, error: 'API indisponível.' };
    this.aiBusyTrackUid.set(trackUid);
    try {
      const res = await this.api.runAiTask(trackUid, task);
      if (res.ok && res.track) {
        const updated = res.track;
        const patch = (list: Track[]) =>
          list.map((t) => (t.track_uid === trackUid ? updated : t));
        this.tracks.update(patch);
        this.topPlayed.update(patch);
      }
      return res;
    } finally {
      this.aiBusyTrackUid.set(null);
    }
  }

  async navigate(view: NavView, filter: { artist?: string; album?: string; genre?: string } = {}): Promise<void> {
    this.activeView.set(view);
    this.activePlaylist.set(null);
    this.activeFilter.set(filter);

    if (view === 'home') {
      await this.refreshHome();
    } else if (view === 'artists') {
      await this.loadArtists();
    } else if (view === 'albums') {
      await this.loadAlbums();
    } else if (view === 'genres') {
      await this.loadGenres();
    } else if (view === 'history') {
      await this.loadHistory();
    } else if (view === 'tracks' || view === 'favorites') {
      await this.loadTracks({
        favoritesOnly: view === 'favorites',
        ...filter,
      });
    }
  }

  async openPlaylist(playlist: Playlist): Promise<void> {
    if (!this.api) return;
    this.activeView.set('playlist');
    this.activePlaylist.set(playlist);
    this.activeFilter.set({});
    this.loading.set(true);
    try {
      const items = await this.api.getPlaylistTracks(playlist.id);
      this.tracks.set(items);
      this.totalTracks.set(items.length);
    } finally {
      this.loading.set(false);
    }
  }

  async search(query: string): Promise<void> {
    this.searchQuery.set(query);
    if (this.activeView() === 'home' && query.trim()) {
      this.activeView.set('tracks');
    }
    if (['tracks', 'favorites'].includes(this.activeView())) {
      await this.loadTracks({
        search: query,
        favoritesOnly: this.activeView() === 'favorites',
        ...this.activeFilter(),
      });
    }
  }

  async loadTracks(opts: TrackQueryOpts = {}): Promise<void> {
    if (!this.api) return;
    this.loading.set(true);
    try {
      const res = await this.api.queryTracks({
        search: this.searchQuery(),
        limit: 300,
        offset: 0,
        ...opts,
      });
      this.tracks.set(res.items);
      this.totalTracks.set(res.total);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMoreTracks(): Promise<void> {
    if (!this.api || this.loading()) return;
    const current = this.tracks();
    if (current.length >= this.totalTracks()) return;
    const res = await this.api.queryTracks({
      search: this.searchQuery(),
      favoritesOnly: this.activeView() === 'favorites',
      ...this.activeFilter(),
      limit: 300,
      offset: current.length,
    });
    this.tracks.set([...current, ...res.items]);
  }

  async toggleFavorite(track: Track): Promise<void> {
    if (!this.api) return;
    const updated = await this.api.toggleFavorite(track.track_uid);
    const patch = (list: Track[]) =>
      list.map((t) => (t.track_uid === track.track_uid ? { ...t, is_favorite: updated.is_favorite } : t));
    this.tracks.update(patch);
    this.topPlayed.update(patch);
    this.stats.set(await this.api.getStats());
  }

  async recordPlay(trackUid: string): Promise<void> {
    if (!this.api) return;
    const updated = await this.api.incrementPlayCount(trackUid);
    const patch = (list: Track[]) =>
      list.map((t) => (t.track_uid === trackUid ? { ...t, play_count: updated.play_count } : t));
    this.tracks.update(patch);
    this.topPlayed.update(patch);
  }

  async createPlaylist(name: string): Promise<void> {
    if (!this.api || !name.trim()) return;
    await this.api.createPlaylist(name.trim());
    this.playlists.set(await this.api.getPlaylists());
  }

  async deletePlaylist(id: number): Promise<void> {
    if (!this.api) return;
    await this.api.deletePlaylist(id);
    this.playlists.set(await this.api.getPlaylists());
    if (this.activePlaylist()?.id === id) {
      await this.navigate('home');
    }
  }

  async addToPlaylist(playlistId: number, trackUid: string): Promise<void> {
    if (!this.api) return;
    await this.api.addTrackToPlaylist(playlistId, trackUid);
    this.playlists.set(await this.api.getPlaylists());
  }

  async removeFromActivePlaylist(trackUid: string): Promise<void> {
    const pl = this.activePlaylist();
    if (!this.api || !pl) return;
    await this.api.removeTrackFromPlaylist(pl.id, trackUid);
    this.tracks.update((list) => list.filter((t) => t.track_uid !== trackUid));
    this.playlists.set(await this.api.getPlaylists());
  }

  private async refreshHome(): Promise<void> {
    if (!this.api) return;
    const [stats, top, genres] = await Promise.all([
      this.api.getStats(),
      this.api.getTopPlayed(12),
      this.api.getGenres(),
    ]);
    this.stats.set(stats);
    this.topPlayed.set(top);
    this.genres.set(genres);
  }

  private async loadArtists(): Promise<void> {
    if (!this.api) return;
    this.loading.set(true);
    try {
      this.artists.set(await this.api.getArtists());
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAlbums(): Promise<void> {
    if (!this.api) return;
    this.loading.set(true);
    try {
      this.albums.set(await this.api.getAlbums());
    } finally {
      this.loading.set(false);
    }
  }

  private async loadGenres(): Promise<void> {
    if (!this.api) return;
    this.loading.set(true);
    try {
      this.genres.set(await this.api.getGenres());
    } finally {
      this.loading.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    if (!this.api) return;
    this.loading.set(true);
    try {
      const items = await this.api.getHistory(150);
      this.tracks.set(items);
      this.totalTracks.set(items.length);
    } finally {
      this.loading.set(false);
    }
  }
}
