import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LibraryService } from '../../core/services/library.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-wrap">
      <header class="view-header">
        <div class="breadcrumb">SISTEMA // CONFIGURAÇÕES</div>
        <h1>Pasta de Dados & Biblioteca</h1>
      </header>

      <section class="card">
        <div class="card-info">
          <div class="card-title">DIRETÓRIO ATUAL DOS DADOS</div>
          <p class="card-desc">
            Pasta que contém <code>library.db</code>, <code>tracks\</code> e <code>covers\</code>.
          </p>
          <div class="path-box">{{ library.dataDir() || 'Carregando...' }}</div>

          @if (statusMsg()) {
            <div class="status-msg" [class.error]="isError()">
              {{ statusMsg() }}
            </div>
          }
        </div>

        <button class="action-btn" (click)="pickFolder()">
          <app-icon name="folder_open" [size]="18" />
          <span>Alterar pasta...</span>
        </button>
      </section>
      <section class="card">
        <div class="card-info">
          <div class="card-title">IMPORTAR MÚSICAS PARA A BIBLIOTECA</div>
          <p class="card-desc">
            Selecione uma pasta com seus arquivos (<code>.mp3</code>, <code>.m4a</code>, <code>.ogg</code>, <code>.wav</code>, <code>.flac</code>).
            O Aether copia as faixas para <code>data\tracks\</code>, extrai capas e indexa tudo no SQLite.
          </p>

          @if (library.importing() && library.importProgress(); as p) {
            <div class="progress-wrap">
              <div class="progress-meta">
                <span>{{ p.filename }}</span>
                <span>{{ p.current }} / {{ p.total }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="(p.current / (p.total || 1)) * 100"></div>
              </div>
            </div>
          }

          @if (importMsg()) {
            <div class="status-msg">{{ importMsg() }}</div>
          }
        </div>

        <button class="action-btn brass" [disabled]="library.importing()" (click)="runImport()">
          <app-icon name="library_add" [size]="18" />
          <span>{{ library.importing() ? 'Importando...' : 'Importar pasta...' }}</span>
        </button>
      </section>
    </div>
  `,
  styles: [`
    .settings-wrap {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 780px;
    }
    .view-header {
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
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }
    .card-info {
      flex: 1;
      min-width: 0;
    }
    .card-title {
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 0.08em;
      color: var(--accent-cyan);
      margin-bottom: 6px;
    }
    .card-desc {
      margin: 0 0 12px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    code {
      font-family: var(--font-mono);
      color: var(--accent-brass);
    }
    .path-box {
      font-family: var(--font-mono);
      font-size: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: rgba(9, 19, 24, 0.75);
      color: var(--text-primary);
      word-break: break-all;
    }
    .status-msg {
      margin-top: 10px;
      font-size: 12px;
      color: var(--accent-cyan);
    }
    .status-msg.error {
      color: #e06c75;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-active);
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .action-btn.brass {
      border-color: var(--border-brass);
      background: var(--accent-brass-dim);
      color: var(--accent-brass);
      box-shadow: none;
    }
    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .progress-wrap {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .progress-meta {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      gap: 12px;
    }
    .progress-meta span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .progress-bar {
      height: 6px;
      border-radius: var(--radius-pill);
      background: rgba(9, 19, 24, 0.9);
      border: 1px solid var(--border-subtle);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
      transition: width 0.12s;
    }
  `],
})
export class SettingsComponent {
  readonly library = inject(LibraryService);
  readonly statusMsg = signal('');
  readonly importMsg = signal('');
  readonly isError = signal(false);

  async pickFolder(): Promise<void> {
    this.statusMsg.set('');
    const res = await this.library.changeDataDir();
    if (res.error) {
      this.isError.set(true);
      this.statusMsg.set(res.error);
    } else if (res.changed) {
      this.isError.set(false);
      this.statusMsg.set('Pasta de dados atualizada e biblioteca recarregada!');
    }
  }

  async runImport(): Promise<void> {
    this.importMsg.set('');
    const res = await this.library.importFolder();
    if (!res.canceled) {
      this.importMsg.set(
        `Concluído: ${res.imported} faixa(s) importada(s), ${res.skipped} ignorada(s)/já existente(s).`,
      );
    }
  }
}
