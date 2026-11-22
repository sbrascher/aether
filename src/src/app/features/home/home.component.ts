import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LibraryService } from '../../core/services/library.service';
import { PlayerService } from '../../core/services/player.service';
import { formatTotalHours } from '../../core/utils/format.util';
import { CoverArtComponent } from '../../shared/components/cover-art/cover-art.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CoverArtComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home-wrap">
      <section class="hero-card">
        <div class="hero-text">
          <div class="eyebrow">SYSTEM TELEMETRY // BIBLIOTECA LOCAL</div>
          <h1>Seu Acervo Musical Offline</h1>
          <p>Indexado em SQLite com busca instantânea FTS5, capas e letras sincronizadas.</p>
        </div>
        @if (library.stats(); as s) {
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-val">{{ s.totalTracks }}</span>
              <span class="stat-lbl">FAIXAS</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">{{ s.totalArtists }}</span>
              <span class="stat-lbl">ARTISTAS</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">{{ s.totalAlbums }}</span>
              <span class="stat-lbl">ÁLBUNS</span>
            </div>
            <div class="stat-box brass">
              <span class="stat-val">{{ fmtHours(s.totalDurationSec) }}</span>
              <span class="stat-lbl">DURAÇÃO</span>
            </div>
          </div>
        }
      </section>

      <section class="block">
        <div class="block-head">
          <h2>Destaques & Mais Tocadas</h2>
          <button class="link-btn" (click)="library.navigate('tracks')">Ver todas</button>
        </div>
        <div class="cards-grid">
          @for (track of library.topPlayed(); track track.track_uid) {
            <button class="media-card" (click)="player.playTrack(track, library.topPlayed())">
              <app-cover-art [coverPath]="track.cover_path" [alt]="track.title" [size]="140" />
              <div class="card-title">{{ track.title }}</div>
              <div class="card-sub">{{ track.artist }}</div>
              <div class="play-badge">
                <app-icon name="play_arrow" [size]="20" [filled]="true" />
              </div>
            </button>
          }
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h2>Explorar por Gênero</h2>
          <button class="link-btn" (click)="library.navigate('genres')">Todos os gêneros</button>
        </div>
        <div class="chips-grid">
          @for (g of library.genres().slice(0, 14); track g.name) {
            <button class="genre-pill" (click)="library.navigate('tracks', { genre: g.name })">
              <span class="g-name">{{ g.name }}</span>
              <span class="g-count">{{ g.trackCount }}</span>
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-wrap {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .hero-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 22px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .eyebrow {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--accent-cyan);
      margin-bottom: 6px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 24px;
      font-weight: 700;
    }
    .hero-text p {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .stats-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .stat-box {
      min-width: 96px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: rgba(9, 19, 24, 0.7);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-box.brass {
      border-color: var(--border-brass);
    }
    .stat-val {
      font-family: var(--font-mono);
      font-size: 18px;
      font-weight: 600;
      color: var(--accent-cyan);
    }
    .stat-box.brass .stat-val {
      color: var(--accent-brass);
    }
    .stat-lbl {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .link-btn {
      background: none;
      border: none;
      color: var(--accent-cyan);
      font-family: var(--font-mono);
      font-size: 12px;
      cursor: pointer;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(164px, 1fr));
      gap: 14px;
    }
    .media-card {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    }
    .media-card:hover {
      border-color: var(--border-active);
      box-shadow: var(--accent-cyan-glow);
      transform: translateY(-2px);
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-sub {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .play-badge {
      position: absolute;
      right: 18px;
      bottom: 58px;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--accent-cyan);
      color: var(--bg-deep);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .media-card:hover .play-badge {
      opacity: 1;
    }
    .chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .genre-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .genre-pill:hover {
      border-color: var(--border-active);
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
    }
    .g-count {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--accent-brass);
    }
  `],
})
export class HomeComponent {
  readonly library = inject(LibraryService);
  readonly player = inject(PlayerService);

  fmtHours(sec: number): string {
    return formatTotalHours(sec);
  }
}
