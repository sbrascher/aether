import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LibraryService } from '../../core/services/library.service';

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="about-wrap">
      <header class="view-header">
        <div class="breadcrumb">SISTEMA // SOBRE</div>
        <h1>Aether Music Player</h1>
      </header>

      <section class="hero">
        <div class="badge">AE</div>
        <div>
          <h2>Aether <span class="ver">v1.0.0</span></h2>
          <p class="tagline">Player de música privado e offline, com biblioteca indexada localmente.</p>
          <div class="author-chip">Desenvolvido para &amp; por <strong>Sérgio Brascher</strong></div>
        </div>
      </section>

      <section class="info-grid">
        <div class="card">
          <div class="card-lbl">PROPRIETÁRIO</div>
          <div class="card-val">Sérgio Brascher</div>
        </div>
        <div class="card">
          <div class="card-lbl">MOTOR &amp; INTERFACE</div>
          <div class="card-val">Electron + Angular 19</div>
        </div>
        <div class="card">
          <div class="card-lbl">BANCO DE DADOS</div>
          <div class="card-val">SQLite + FTS5</div>
        </div>
        <div class="card">
          <div class="card-lbl">ACERVO INDEXADO</div>
          <div class="card-val">{{ library.stats()?.totalTracks ?? 0 }} faixas</div>
        </div>
      </section>

      <section class="features-card">
        <div class="card-lbl">RECURSOS INTEGRADOS</div>
        <ul>
          <li>Reprodução 100% offline com streaming local e seek instantâneo</li>
          <li>Busca full-text (FTS5) por título, artista, álbum, gênero ou trecho da letra</li>
          <li>Letras simples e sincronizadas (LRC) acompanhando o tempo da música</li>
          <li>Playlists personalizadas, músicas curtidas e histórico persistente</li>
          <li>Pasta de dados configurável para manter acervo e banco portáveis</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .about-wrap {
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
    .hero {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 22px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .badge {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-active);
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      box-shadow: var(--accent-cyan-glow);
      font-family: var(--font-mono);
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 700;
    }
    .ver {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--accent-cyan);
      font-weight: 500;
    }
    .tagline {
      margin: 0 0 10px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .author-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-brass);
      background: var(--accent-brass-dim);
      color: var(--accent-brass);
      font-size: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .card,
    .features-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
    }
    .card-lbl {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .card-val {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    ul {
      margin: 8px 0 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
      color: var(--text-secondary);
    }
  `],
})
export class AboutComponent {
  readonly library = inject(LibraryService);
}
