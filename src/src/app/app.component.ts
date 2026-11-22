import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LibraryService } from './core/services/library.service';
import { PlayerService } from './core/services/player.service';
import { AboutComponent } from './features/about/about.component';
import { HomeComponent } from './features/home/home.component';
import { LibraryViewComponent } from './features/library-view/library-view.component';
import { PlayerBarComponent } from './features/player-bar/player-bar.component';
import { RightPanelComponent } from './features/right-panel/right-panel.component';
import { SettingsComponent } from './features/settings/settings.component';
import { SidebarComponent } from './features/sidebar/sidebar.component';
import { IconComponent } from './shared/components/icon/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,
    SidebarComponent,
    HomeComponent,
    LibraryViewComponent,
    PlayerBarComponent,
    RightPanelComponent,
    SettingsComponent,
    AboutComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <div class="titlebar">
        <div class="search-box">
          <app-icon name="search" [size]="18" />
          <input
            type="text"
            [ngModel]="library.searchQuery()"
            (ngModelChange)="onSearch($event)"
            placeholder="Buscar música, artista, álbum, gênero ou trecho da letra..."
          />
          @if (library.searchQuery()) {
            <button class="clear-btn" (click)="onSearch('')">
              <app-icon name="close" [size]="16" />
            </button>
          }
        </div>
      </div>

      <div class="workspace">
        <app-sidebar />

        <main class="content">
          @if (library.activeView() === 'home') {
            <app-home />
          } @else if (library.activeView() === 'settings') {
            <app-settings />
          } @else if (library.activeView() === 'about') {
            <app-about />
          } @else {
            <app-library-view />
          }
        </main>

        @if (panelOpen()) {
          <app-right-panel
            [tab]="panelTab()"
            (tabChange)="panelTab.set($event)"
            (close)="panelOpen.set(false)"
          />
        }
      </div>

      <app-player-bar (togglePanel)="onTogglePanel($event)" />
    </div>
  `,
  styles: [`
    .shell {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .titlebar {
      height: 44px;
      background: rgba(9, 19, 24, 0.92);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 150px 0 16px;
      -webkit-app-region: drag;
    }
    .search-box {
      -webkit-app-region: no-drag;
      width: 100%;
      max-width: 480px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-subtle);
      background: rgba(16, 35, 44, 0.85);
      color: var(--text-muted);
    }
    .search-box:focus-within {
      border-color: var(--border-active);
      box-shadow: var(--accent-cyan-glow);
      color: var(--accent-cyan);
    }
    .search-box input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 13px;
    }
    .clear-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      display: inline-flex;
    }
    .workspace {
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .content {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 22px 26px;
    }
  `],
})
export class AppComponent implements OnInit {
  readonly library = inject(LibraryService);
  private readonly player = inject(PlayerService);
  readonly panelOpen = signal(false);
  readonly panelTab = signal<'lyrics' | 'queue'>('lyrics');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.library.init();
    await this.player.restoreState();
  }

  onSearch(query: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      void this.library.search(query);
    }, 180);
  }

  onTogglePanel(tab: 'lyrics' | 'queue'): void {
    if (this.panelOpen() && this.panelTab() === tab) {
      this.panelOpen.set(false);
    } else {
      this.panelTab.set(tab);
      this.panelOpen.set(true);
    }
  }
}
