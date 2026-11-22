import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { PlayerService } from '../../core/services/player.service';
import { formatDuration } from '../../core/utils/format.util';
import { CoverArtComponent } from '../../shared/components/cover-art/cover-art.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CoverArtComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="panel">
      <div class="panel-tabs">
        <button [class.active]="tab() === 'lyrics'" (click)="tabChange.emit('lyrics')">
          LETRA
        </button>
        <button [class.active]="tab() === 'queue'" (click)="tabChange.emit('queue')">
          FILA ({{ player.queue().length }})
        </button>
        <button class="close-btn" (click)="close.emit()" title="Fechar painel">
          <app-icon name="close" [size]="18" />
        </button>
      </div>

      <div class="panel-body">
        @if (tab() === 'lyrics') {
          @if (player.parsedLyrics().length) {
            <div class="lrc-list">
              @for (line of player.parsedLyrics(); track $index) {
                <button
                  class="lrc-line"
                  [class.active]="player.activeLyricIndex() === $index"
                  (click)="player.seek(line.timeSec)"
                >
                  {{ line.text }}
                </button>
              }
            </div>
          } @else if (player.currentTrack()?.lyrics) {
            <pre class="plain-lyrics">{{ player.currentTrack()?.lyrics }}</pre>
          } @else {
            <div class="empty-msg">
              <app-icon name="lyrics" [size]="36" />
              <p>Sem letra disponível para esta faixa.</p>
            </div>
          }
        } @else {
          <div class="queue-list">
            @for (tr of player.queue(); track tr.track_uid + $index; let i = $index) {
              <button
                class="q-item"
                [class.active]="player.queueIndex() === i"
                (click)="player.playTrack(tr, player.queue())"
              >
                <app-cover-art [coverPath]="tr.cover_path" [alt]="tr.title" [size]="36" />
                <div class="q-meta">
                  <div class="q-title">{{ tr.title }}</div>
                  <div class="q-artist">{{ tr.artist }}</div>
                </div>
                <span class="q-dur">{{ fmt(tr.duration_sec) }}</span>
              </button>
            } @empty {
              <div class="empty-msg">Fila vazia.</div>
            }
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .panel {
      width: 320px;
      height: 100%;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
    }
    .panel-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .panel-tabs button:not(.close-btn) {
      flex: 1;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      cursor: pointer;
    }
    .panel-tabs button.active {
      background: var(--accent-cyan-dim);
      border-color: var(--border-active);
      color: var(--accent-cyan);
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      display: inline-flex;
    }
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
    }
    .lrc-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lrc-line {
      background: none;
      border: none;
      text-align: left;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.45;
      cursor: pointer;
      transition: all 0.15s;
    }
    .lrc-line:hover {
      color: var(--text-primary);
      background: var(--bg-surface-hover);
    }
    .lrc-line.active {
      color: var(--accent-cyan);
      font-weight: 600;
      background: var(--accent-cyan-dim);
      box-shadow: var(--accent-cyan-glow);
    }
    .plain-lyrics {
      margin: 0;
      white-space: pre-wrap;
      font-family: var(--font-sans);
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary);
    }
    .queue-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .q-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: left;
    }
    .q-item:hover {
      background: var(--bg-surface-hover);
    }
    .q-item.active {
      background: var(--accent-cyan-dim);
      border-color: var(--border-active);
    }
    .q-meta {
      flex: 1;
      min-width: 0;
    }
    .q-title {
      font-size: 13px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .q-artist {
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .q-dur {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }
    .empty-msg {
      padding: 40px 12px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }
  `],
})
export class RightPanelComponent {
  readonly player = inject(PlayerService);
  readonly tab = input.required<'lyrics' | 'queue'>();
  readonly tabChange = output<'lyrics' | 'queue'>();
  readonly close = output<void>();

  fmt(sec: number | null): string {
    return formatDuration(sec);
  }
}
