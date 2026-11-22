import { Injectable, computed, inject, signal } from '@angular/core';
import { LrcLine, RepeatMode, Track } from '../models/music.model';
import { mediaUrl, parseLrc } from '../utils/format.util';
import { LibraryService } from './library.service';

const STORAGE_KEY = 'aethereal_player_state_v1';

interface SavedPlayerState {
  currentTrackUid: string | null;
  currentTime: number;
  queueUids: string[];
  queueIndex: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly library = inject(LibraryService);
  private readonly audio = new Audio();
  private playRecordedForUid: string | null = null;
  private lastSavedAt = 0;

  readonly currentTrack = signal<Track | null>(null);
  readonly queue = signal<Track[]>([]);
  readonly queueIndex = signal(-1);
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(0.8);
  readonly isMuted = signal(false);
  readonly shuffle = signal(false);
  readonly repeat = signal<RepeatMode>('off');

  readonly parsedLyrics = computed<LrcLine[]>(() => parseLrc(this.currentTrack()?.synced_lyrics));

  readonly activeLyricIndex = computed(() => {
    const lines = this.parsedLyrics();
    const now = this.currentTime();
    if (!lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timeSec <= now + 0.15) idx = i;
      else break;
    }
    return idx;
  });

  constructor() {
    this.audio.volume = this.volume();
    this.bindAudioEvents();
    this.bindMediaSession();
  }

  async restoreState(): Promise<void> {
    const api = window.musicApi;
    if (!api) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: SavedPlayerState = JSON.parse(raw);
      if (typeof saved.volume === 'number') this.setVolume(saved.volume);
      if (typeof saved.shuffle === 'boolean') this.shuffle.set(saved.shuffle);
      if (saved.repeat) this.repeat.set(saved.repeat);

      const uids = saved.queueUids?.slice(0, 200) || [];
      if (!uids.length && saved.currentTrackUid) uids.push(saved.currentTrackUid);
      if (!uids.length) return;

      const tracks = await api.getTracksByUids(uids);
      if (!tracks.length) return;

      this.queue.set(tracks);
      const idx = tracks.findIndex((t) => t.track_uid === saved.currentTrackUid);
      const targetIdx = idx >= 0 ? idx : Math.min(saved.queueIndex || 0, tracks.length - 1);
      const track = tracks[targetIdx];
      this.queueIndex.set(targetIdx);
      this.currentTrack.set(track);
      const url = mediaUrl(track.file_path);
      if (url) {
        this.audio.src = url;
        this.audio.load();
        if (saved.currentTime > 0) {
          this.audio.currentTime = saved.currentTime;
          this.currentTime.set(saved.currentTime);
        }
        this.duration.set(track.duration_sec || 0);
        this.updateMediaSession(track);
      }
    } catch {
      // Ignore corrupt saved state
    }
  }

  playTrack(track: Track, contextList?: Track[]): void {
    if (contextList?.length) {
      this.queue.set(contextList);
      const idx = contextList.findIndex((t) => t.track_uid === track.track_uid);
      this.queueIndex.set(idx >= 0 ? idx : 0);
    } else if (!this.queue().some((t) => t.track_uid === track.track_uid)) {
      this.queue.set([track]);
      this.queueIndex.set(0);
    } else {
      this.queueIndex.set(this.queue().findIndex((t) => t.track_uid === track.track_uid));
    }
    this.loadAndPlay(track);
  }

  togglePlay(): void {
    if (!this.currentTrack()) return;
    if (this.isPlaying()) {
      this.audio.pause();
    } else {
      void this.audio.play();
    }
  }

  next(): void {
    const list = this.queue();
    if (!list.length) return;
    if (this.repeat() === 'one') {
      this.seek(0);
      void this.audio.play();
      return;
    }
    let nextIdx: number;
    if (this.shuffle() && list.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * list.length);
      } while (nextIdx === this.queueIndex());
    } else {
      nextIdx = this.queueIndex() + 1;
      if (nextIdx >= list.length) {
        if (this.repeat() === 'all') nextIdx = 0;
        else {
          this.isPlaying.set(false);
          return;
        }
      }
    }
    this.queueIndex.set(nextIdx);
    this.loadAndPlay(list[nextIdx]);
  }

  previous(): void {
    if (this.currentTime() > 3) {
      this.seek(0);
      return;
    }
    const list = this.queue();
    if (!list.length) return;
    const prevIdx = this.queueIndex() - 1;
    const target = prevIdx >= 0 ? prevIdx : this.repeat() === 'all' ? list.length - 1 : 0;
    this.queueIndex.set(target);
    this.loadAndPlay(list[target]);
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    this.audio.currentTime = Math.max(0, seconds);
    this.currentTime.set(this.audio.currentTime);
  }

  setVolume(val: number): void {
    const clamped = Math.max(0, Math.min(1, val));
    this.volume.set(clamped);
    this.audio.volume = clamped;
    if (clamped > 0 && this.isMuted()) {
      this.isMuted.set(false);
      this.audio.muted = false;
    }
    this.saveState(true);
  }

  toggleMute(): void {
    const next = !this.isMuted();
    this.isMuted.set(next);
    this.audio.muted = next;
  }

  toggleShuffle(): void {
    this.shuffle.update((v) => !v);
    this.saveState(true);
  }

  cycleRepeat(): void {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const idx = (order.indexOf(this.repeat()) + 1) % order.length;
    this.repeat.set(order[idx]);
    this.saveState(true);
  }

  addToQueue(track: Track): void {
    this.queue.update((list) => [...list, track]);
    this.saveState(true);
  }

  private loadAndPlay(track: Track): void {
    const url = mediaUrl(track.file_path);
    if (!url) return;
    this.currentTrack.set(track);
    this.playRecordedForUid = null;
    this.audio.src = url;
    this.audio.load();
    void this.audio.play();
    this.updateMediaSession(track);
    this.saveState(true);
  }

  private bindAudioEvents(): void {
    this.audio.addEventListener('play', () => this.isPlaying.set(true));
    this.audio.addEventListener('pause', () => {
      this.isPlaying.set(false);
      this.saveState(true);
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration || this.currentTrack()?.duration_sec || 0);
    });
    this.audio.addEventListener('timeupdate', () => {
      const t = this.audio.currentTime;
      this.currentTime.set(t);
      this.saveState(false);
      const track = this.currentTrack();
      if (track && t >= 10 && this.playRecordedForUid !== track.track_uid) {
        this.playRecordedForUid = track.track_uid;
        void this.library.recordPlay(track.track_uid);
      }
    });
    this.audio.addEventListener('ended', () => this.next());
  }

  private saveState(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastSavedAt < 3000) return;
    this.lastSavedAt = now;
    try {
      const state: SavedPlayerState = {
        currentTrackUid: this.currentTrack()?.track_uid ?? null,
        currentTime: this.currentTime(),
        queueUids: this.queue().slice(0, 200).map((t) => t.track_uid),
        queueIndex: this.queueIndex(),
        volume: this.volume(),
        shuffle: this.shuffle(),
        repeat: this.repeat(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }

  private bindMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
  }

  private updateMediaSession(track: Track): void {
    if (!('mediaSession' in navigator)) return;
    const artworkUrl = mediaUrl(track.cover_path);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: artworkUrl ? [{ src: artworkUrl, sizes: '500x500', type: 'image/jpeg' }] : [],
    });
  }
}
