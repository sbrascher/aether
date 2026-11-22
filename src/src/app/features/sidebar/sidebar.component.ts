import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavView } from '../../core/models/music.model';
import { LibraryService } from '../../core/services/library.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface NavItem {
  view: NavView;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-badge">AE</div>
        <div>
          <div class="brand-title">AETHEREAL</div>
          <div class="brand-sub">OFFLINE AUDIO REV 2.4</div>
        </div>
      </div>

      <nav class="nav-group">
        @for (item of navItems; track item.view) {
          <button
            class="nav-btn"
            [class.active]="library.activeView() === item.view"
            (click)="library.navigate(item.view)"
          >
            <app-icon [name]="item.icon" [size]="20" [filled]="library.activeView() === item.view" />
            <span>{{ item.label }}</span>
          </button>
        }
      </nav>

      <div class="section-header">
        <span>PLAYLISTS</span>
        <button class="add-pl-btn" (click)="creating.set(!creating())" title="Nova playlist">
          <app-icon name="add" [size]="18" />
        </button>
      </div>

      @if (creating()) {
        <form class="new-pl-form" (ngSubmit)="submitPlaylist()">
          <input
            type="text"
            [(ngModel)]="newName"
            name="playlistName"
            placeholder="Nome da playlist..."
            autofocus
          />
          <button type="submit">OK</button>
        </form>
      }

      <div class="playlist-list">
        @for (pl of library.playlists(); track pl.id) {
          <div
            class="pl-item"
            [class.active]="library.activeView() === 'playlist' && library.activePlaylist()?.id === pl.id"
          >
            <button class="pl-open" (click)="library.openPlaylist(pl)">
              <app-icon name="queue_music" [size]="18" />
              <span class="pl-name">{{ pl.name }}</span>
              <span class="pl-count">{{ pl.trackCount }}</span>
            </button>
            <button class="pl-del" (click)="library.deletePlaylist(pl.id)" title="Excluir">
              <app-icon name="delete" [size]="16" />
            </button>
          </div>
        } @empty {
          <div class="pl-empty">Nenhuma playlist criada</div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 244px;
      height: 100%;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      padding: 16px 12px;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px 12px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand-badge {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-active);
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
      font-family: var(--font-mono);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-primary);
    }
    .brand-sub {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
    }
    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .nav-btn:hover {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
      border-color: var(--border-subtle);
    }
    .nav-btn.active {
      background: var(--accent-cyan-dim);
      border-color: var(--border-active);
      color: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px 0;
      border-top: 1px solid var(--border-subtle);
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .add-pl-btn {
      background: none;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--accent-cyan);
      cursor: pointer;
      padding: 2px;
      display: inline-flex;
    }
    .add-pl-btn:hover {
      border-color: var(--border-active);
      box-shadow: var(--accent-cyan-glow);
    }
    .new-pl-form {
      display: flex;
      gap: 6px;
    }
    .new-pl-form input {
      flex: 1;
      min-width: 0;
      background: rgba(9, 19, 24, 0.8);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 6px 8px;
      font-size: 12px;
      outline: none;
    }
    .new-pl-form button {
      background: var(--accent-cyan-dim);
      border: 1px solid var(--border-active);
      color: var(--accent-cyan);
      border-radius: var(--radius-sm);
      padding: 0 10px;
      font-family: var(--font-mono);
      font-size: 11px;
      cursor: pointer;
    }
    .playlist-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .pl-item {
      display: flex;
      align-items: center;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
    }
    .pl-item:hover {
      background: var(--bg-surface-hover);
    }
    .pl-item.active {
      background: var(--accent-cyan-dim);
      border-color: var(--border-active);
    }
    .pl-open {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 7px 8px;
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: 13px;
    }
    .pl-item.active .pl-open {
      color: var(--accent-cyan);
    }
    .pl-name {
      flex: 1;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pl-count {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }
    .pl-del {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px 6px;
      opacity: 0;
      transition: opacity 0.15s, color 0.15s;
    }
    .pl-item:hover .pl-del {
      opacity: 1;
    }
    .pl-del:hover {
      color: #e06c75;
    }
    .pl-empty {
      font-size: 12px;
      color: var(--text-muted);
      padding: 8px;
    }
  `],
})
export class SidebarComponent {
  readonly library = inject(LibraryService);
  readonly creating = signal(false);
  newName = '';

  readonly navItems: NavItem[] = [
    { view: 'home', label: 'Início', icon: 'home' },
    { view: 'tracks', label: 'Músicas', icon: 'library_music' },
    { view: 'artists', label: 'Artistas', icon: 'person' },
    { view: 'albums', label: 'Álbuns', icon: 'album' },
    { view: 'genres', label: 'Gêneros', icon: 'category' },
    { view: 'favorites', label: 'Curtidas', icon: 'favorite' },
    { view: 'history', label: 'Histórico', icon: 'history' },
    { view: 'settings', label: 'Configurações', icon: 'settings' },
  ];

  async submitPlaylist(): Promise<void> {
    if (!this.newName.trim()) return;
    await this.library.createPlaylist(this.newName);
    this.newName = '';
    this.creating.set(false);
  }
}
