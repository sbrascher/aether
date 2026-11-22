import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AiTaskType, Playlist, Track } from '../../../core/models/music.model';
import { LibraryService } from '../../../core/services/library.service';
import { PlayerService } from '../../../core/services/player.service';
import { formatDuration } from '../../../core/utils/format.util';
import { CoverArtComponent } from '../cover-art/cover-art.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-track-table',
  standalone: true,
  imports: [CoverArtComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <div class="table-head">
        <span>#</span>
        <span>FAIXA</span>
        <span>ÁLBUM</span>
        <span>GÊNERO</span>
        <span class="right">DURAÇÃO</span>
        <span></span>
      </div>

      @for (track of tracks(); track track.track_uid; let i = $index) {
        <div
          class="track-row"
          [class.active]="player.currentTrack()?.track_uid === track.track_uid"
          (dblclick)="play(track)"
        >
          <button class="idx-btn" (click)="play(track)" title="Tocar">
            @if (player.currentTrack()?.track_uid === track.track_uid && player.isPlaying()) {
              <app-icon name="graphic_eq" [size]="18" />
            } @else {
              <span class="idx-num">{{ i + 1 }}</span>
              <app-icon class="play-hover" name="play_arrow" [size]="18" [filled]="true" />
            }
          </button>

          <div class="track-main">
            <app-cover-art [coverPath]="track.cover_path" [alt]="track.title" [size]="40" />
            <div class="meta">
              <div class="title">{{ track.title }}</div>
              <div class="artist">{{ track.artist }}</div>
            </div>
          </div>

          <div class="album" [title]="track.album">{{ track.album }}</div>

          <div>
            <span class="genre-chip">{{ track.genre }}</span>
          </div>

          <div class="duration">{{ fmt(track.duration_sec) }}</div>

          <div class="actions">
            <button
              class="icon-btn"
              [class.fav]="track.is_favorite === 1"
              (click)="library.toggleFavorite(track)"
              title="Curtir"
            >
              <app-icon name="favorite" [size]="18" [filled]="track.is_favorite === 1" />
            </button>

            <button class="icon-btn" (click)="player.addToQueue(track)" title="Adicionar à fila">
              <app-icon name="queue_music" [size]="18" />
            </button>

            @if (library.aiConfig().enabled) {
              <div class="pl-menu-wrap">
                <button
                  class="icon-btn"
                  [disabled]="library.aiBusyTrackUid() === track.track_uid"
                  (click)="toggleAiMenu(track.track_uid)"
                  title="Assistente de IA"
                >
                  <app-icon name="auto_awesome" [size]="18" />
                </button>
                @if (openAiFor() === track.track_uid) {
                  <div class="pl-dropdown">
                    <button (click)="runAi(track.track_uid, 'identify')">Identificar faixa</button>
                    <button (click)="runAi(track.track_uid, 'lyrics')">Gerar letra</button>
                    <button (click)="runAi(track.track_uid, 'cover')">Buscar capa</button>
                  </div>
                }
              </div>
            }

            @if (playlistMode()) {
              <button
                class="icon-btn warn"
                (click)="library.removeFromActivePlaylist(track.track_uid)"
                title="Remover da playlist"
              >
                <app-icon name="playlist_remove" [size]="18" />
              </button>
            } @else if (playlists().length) {
              <div class="pl-menu-wrap">
                <button class="icon-btn" (click)="toggleMenu(track.track_uid)" title="Adicionar à playlist">
                  <app-icon name="playlist_add" [size]="18" />
                </button>
                @if (openMenuFor() === track.track_uid) {
                  <div class="pl-dropdown">
                    @for (pl of playlists(); track pl.id) {
                      <button (click)="addToPlaylist(pl, track.track_uid)">
                        {{ pl.name }}
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .table-head,
    .track-row {
      display: grid;
      grid-template-columns: 44px minmax(220px, 2.2fr) minmax(140px, 1.4fr) 130px 72px 116px;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
    }
    .table-head {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 10px;
      margin-bottom: 4px;
    }
    .track-row {
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      transition: background 0.15s, border-color 0.15s;
    }
    .track-row:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-subtle);
    }
    .track-row.active {
      background: var(--accent-cyan-dim);
      border-color: var(--border-active);
    }
    .idx-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .play-hover {
      display: none;
      color: var(--accent-cyan);
    }
    .track-row:hover .idx-num { display: none; }
    .track-row:hover .play-hover { display: inline-flex; }
    .track-row.active .idx-btn { color: var(--accent-cyan); }

    .track-main {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .meta {
      min-width: 0;
    }
    .title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track-row.active .title {
      color: var(--accent-cyan);
    }
    .artist,
    .album {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .genre-chip {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      background: rgba(9, 19, 24, 0.55);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .duration,
    .right {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-secondary);
      text-align: right;
    }
    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      position: relative;
    }
    .icon-btn {
      background: none;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      display: inline-flex;
      transition: color 0.15s, border-color 0.15s;
    }
    .icon-btn:hover {
      color: var(--accent-cyan);
      border-color: var(--border-subtle);
    }
    .icon-btn.fav {
      color: var(--accent-brass);
    }
    .icon-btn.warn:hover {
      color: #e06c75;
    }
    .pl-menu-wrap {
      position: relative;
    }
    .pl-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 30;
      min-width: 160px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-sm);
      box-shadow: var(--accent-cyan-glow);
      padding: 4px;
      display: flex;
      flex-direction: column;
    }
    .pl-dropdown button {
      background: none;
      border: none;
      color: var(--text-primary);
      text-align: left;
      padding: 6px 10px;
      font-size: 12px;
      font-family: var(--font-sans);
      cursor: pointer;
      border-radius: 4px;
    }
    .pl-dropdown button:hover {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
    }
  `],
})
export class TrackTableComponent {
  readonly player = inject(PlayerService);
  readonly library = inject(LibraryService);

  readonly tracks = input.required<Track[]>();
  readonly playlistMode = input<boolean>(false);
  readonly playlists = this.library.playlists;
  readonly openMenuFor = signal<string | null>(null);
  readonly openAiFor = signal<string | null>(null);

  fmt(sec: number | null): string {
    return formatDuration(sec);
  }

  play(track: Track): void {
    this.player.playTrack(track, this.tracks());
  }

  toggleMenu(uid: string): void {
    this.openAiFor.set(null);
    this.openMenuFor.update((cur) => (cur === uid ? null : uid));
  }

  toggleAiMenu(uid: string): void {
    this.openMenuFor.set(null);
    this.openAiFor.update((cur) => (cur === uid ? null : uid));
  }

  async runAi(uid: string, task: AiTaskType): Promise<void> {
    this.openAiFor.set(null);
    await this.library.runAiTask(uid, task);
  }

  async addToPlaylist(pl: Playlist, uid: string): Promise<void> {
    this.openMenuFor.set(null);
    await this.library.addToPlaylist(pl.id, uid);
  }
}
