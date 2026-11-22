import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LibraryService } from '../../core/services/library.service';
import { PlayerService } from '../../core/services/player.service';
import { CoverArtComponent } from '../../shared/components/cover-art/cover-art.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TrackTableComponent } from '../../shared/components/track-table/track-table.component';

@Component({
  selector: 'app-library-view',
  standalone: true,
  imports: [CoverArtComponent, IconComponent, TrackTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="view-wrap">
      <header class="view-header">
        <div>
          <div class="breadcrumb">BIBLIOTECA // {{ headerTag() }}</div>
          <h1>{{ headerTitle() }}</h1>
        </div>

        @if (isTrackList() && library.tracks().length) {
          <button class="play-all-btn" (click)="playAll()">
            <app-icon name="play_arrow" [size]="20" [filled]="true" />
            <span>Tocar tudo</span>
          </button>
        }
      </header>

      @if (library.activeView() === 'artists') {
        <div class="grid-cards">
          @for (a of library.artists(); track a.name) {
            <button class="grid-card" (click)="library.navigate('tracks', { artist: a.name })">
              <app-cover-art [coverPath]="a.coverPath" [alt]="a.name" [size]="136" />
              <div class="g-title">{{ a.name }}</div>
              <div class="g-sub">{{ a.trackCount }} faixas · {{ a.albumCount }} álbuns</div>
            </button>
          }
        </div>
      } @else if (library.activeView() === 'albums') {
        <div class="grid-cards">
          @for (alb of library.albums(); track alb.name + alb.artist) {
            <button class="grid-card" (click)="library.navigate('tracks', { album: alb.name, artist: alb.artist })">
              <app-cover-art [coverPath]="alb.coverPath" [alt]="alb.name" [size]="136" />
              <div class="g-title">{{ alb.name }}</div>
              <div class="g-sub">{{ alb.artist }} {{ alb.year ? '· ' + alb.year : '' }}</div>
            </button>
          }
        </div>
      } @else if (library.activeView() === 'genres') {
        <div class="grid-cards">
          @for (g of library.genres(); track g.name) {
            <button class="grid-card" (click)="library.navigate('tracks', { genre: g.name })">
              <app-cover-art [coverPath]="g.coverPath" [alt]="g.name" [size]="136" />
              <div class="g-title">{{ g.name }}</div>
              <div class="g-sub">{{ g.trackCount }} faixas</div>
            </button>
          }
        </div>
      } @else {
        @if (library.tracks().length) {
          <app-track-table
            [tracks]="library.tracks()"
            [playlistMode]="library.activeView() === 'playlist'"
          />
          @if (library.tracks().length < library.totalTracks()) {
            <div class="load-more-wrap">
              <button class="load-more-btn" (click)="library.loadMoreTracks()">
                Carregar mais ({{ library.tracks().length }} / {{ library.totalTracks() }})
              </button>
            </div>
          }
        } @else if (!library.loading()) {
          <div class="empty-state">
            <app-icon name="folder_off" [size]="42" />
            <p>Nenhuma faixa encontrada para este filtro.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .view-wrap {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .view-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .breadcrumb {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      color: var(--accent-cyan);
      margin-bottom: 4px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }
    .play-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-active);
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(162px, 1fr));
      gap: 14px;
    }
    .grid-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.15s;
    }
    .grid-card:hover {
      border-color: var(--border-active);
      box-shadow: var(--accent-cyan-glow);
      transform: translateY(-2px);
    }
    .g-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .g-sub {
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 12px 0;
    }
    .load-more-btn {
      padding: 8px 18px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-brass);
      background: var(--accent-brass-dim);
      color: var(--accent-brass);
      font-family: var(--font-mono);
      font-size: 12px;
      cursor: pointer;
    }
    .empty-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-md);
    }
  `],
})
export class LibraryViewComponent {
  readonly library = inject(LibraryService);
  readonly player = inject(PlayerService);

  readonly isTrackList = computed(() =>
    ['tracks', 'favorites', 'history', 'playlist'].includes(this.library.activeView()),
  );

  readonly headerTag = computed(() => {
    const f = this.library.activeFilter();
    if (f.artist) return `ARTISTA`;
    if (f.album) return `ÁLBUM`;
    if (f.genre) return `GÊNERO`;
    return this.library.activeView().toUpperCase();
  });

  readonly headerTitle = computed(() => {
    const f = this.library.activeFilter();
    if (f.album) return f.album;
    if (f.artist) return f.artist;
    if (f.genre) return f.genre;
    const pl = this.library.activePlaylist();
    if (pl) return pl.name;
    const map: Record<string, string> = {
      tracks: 'Todas as Músicas',
      artists: 'Artistas',
      albums: 'Álbuns',
      genres: 'Gêneros Musicais',
      favorites: 'Músicas Curtidas',
      history: 'Histórico de Reprodução',
    };
    return map[this.library.activeView()] || 'Biblioteca';
  });

  playAll(): void {
    const list = this.library.tracks();
    if (list.length) this.player.playTrack(list[0], list);
  }
}
