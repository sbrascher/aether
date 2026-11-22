import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LibraryService } from '../../core/services/library.service';
import { PlayerService } from '../../core/services/player.service';
import { formatDuration } from '../../core/utils/format.util';
import { CoverArtComponent } from '../../shared/components/cover-art/cover-art.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CoverArtComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="player-bar">
      <div class="now-playing">
        @if (player.currentTrack(); as tr) {
          <app-cover-art [coverPath]="tr.cover_path" [alt]="tr.title" [size]="52" />
          <div class="np-meta">
            <div class="np-title">{{ tr.title }}</div>
            <div class="np-artist">{{ tr.artist }}</div>
          </div>
          <button
            class="ctrl-btn"
            [class.brass-active]="tr.is_favorite === 1"
            (click)="library.toggleFavorite(tr)"
            title="Curtir"
          >
            <app-icon name="favorite" [size]="18" [filled]="tr.is_favorite === 1" />
          </button>
        } @else {
          <div class="np-idle">Nenhuma faixa selecionada</div>
        }
      </div>

      <div class="center-controls">
        <div class="buttons">
          <button
            class="ctrl-btn"
            [class.active]="player.shuffle()"
            (click)="player.toggleShuffle()"
            title="Aleatório"
          >
            <app-icon name="shuffle" [size]="18" />
          </button>
          <button class="ctrl-btn" (click)="player.previous()" title="Anterior">
            <app-icon name="skip_previous" [size]="24" [filled]="true" />
          </button>
          <button class="play-btn" (click)="player.togglePlay()" title="Play / Pausar">
            <app-icon
              [name]="player.isPlaying() ? 'pause' : 'play_arrow'"
              [size]="26"
              [filled]="true"
            />
          </button>
          <button class="ctrl-btn" (click)="player.next()" title="Próxima">
            <app-icon name="skip_next" [size]="24" [filled]="true" />
          </button>
          <button
            class="ctrl-btn"
            [class.active]="player.repeat() !== 'off'"
            (click)="player.cycleRepeat()"
            title="Repetir"
          >
            <app-icon
              [name]="player.repeat() === 'one' ? 'repeat_one' : 'repeat'"
              [size]="18"
            />
          </button>
        </div>

        <div class="progress-row">
          <span class="time">{{ fmt(player.currentTime()) }}</span>
          <input
            type="range"
            class="seek-slider"
            [min]="0"
            [max]="player.duration() || 100"
            [value]="player.currentTime()"
            (input)="onSeek($event)"
          />
          <span class="time">{{ fmt(player.duration()) }}</span>
        </div>
      </div>

      <div class="right-controls">
        <button class="ctrl-btn" (click)="togglePanel.emit('lyrics')" title="Letra">
          <app-icon name="lyrics" [size]="20" />
        </button>
        <button class="ctrl-btn" (click)="togglePanel.emit('queue')" title="Fila">
          <app-icon name="queue_music" [size]="20" />
        </button>
        <button class="ctrl-btn" (click)="player.toggleMute()" title="Mudo">
          <app-icon
            [name]="player.isMuted() || player.volume() === 0 ? 'volume_off' : 'volume_up'"
            [size]="20"
          />
        </button>
        <input
          type="range"
          class="vol-slider"
          min="0"
          max="1"
          step="0.02"
          [value]="player.isMuted() ? 0 : player.volume()"
          (input)="onVolume($event)"
        />
      </div>
    </footer>
  `,
  styles: [`
    .player-bar {
      height: 82px;
      background: var(--bg-elevated);
      border-top: 1px solid var(--border-subtle);
      padding: 0 18px;
      display: grid;
      grid-template-columns: minmax(220px, 1.2fr) minmax(320px, 1.8fr) minmax(200px, 1fr);
      align-items: center;
      gap: 16px;
    }
    .now-playing {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .np-meta {
      min-width: 0;
      flex: 1;
    }
    .np-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .np-artist {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .np-idle {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
    }
    .center-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ctrl-btn {
      background: none;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
      display: inline-flex;
      transition: color 0.15s, border-color 0.15s;
    }
    .ctrl-btn:hover {
      color: var(--accent-cyan);
    }
    .ctrl-btn.active {
      color: var(--accent-cyan);
      border-color: var(--border-active);
      background: var(--accent-cyan-dim);
    }
    .ctrl-btn.brass-active {
      color: var(--accent-brass);
    }
    .play-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--border-active);
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.12s;
    }
    .play-btn:hover {
      transform: scale(1.06);
    }
    .progress-row {
      width: 100%;
      max-width: 540px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .time {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      min-width: 36px;
      text-align: center;
    }
    .seek-slider,
    .vol-slider {
      accent-color: var(--accent-cyan);
      cursor: pointer;
      height: 4px;
    }
    .seek-slider {
      flex: 1;
    }
    .right-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
    .vol-slider {
      width: 88px;
    }
  `],
})
export class PlayerBarComponent {
  readonly player = inject(PlayerService);
  readonly library = inject(LibraryService);
  readonly togglePanel = output<'lyrics' | 'queue'>();

  fmt(sec: number): string {
    return formatDuration(sec);
  }

  onSeek(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.player.seek(val);
  }

  onVolume(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.player.setVolume(val);
  }
}
