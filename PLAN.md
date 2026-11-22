# Plano do Projeto — Player de Música Privado e Offline (Electron)

## 1. Estrutura de Diretórios (`D:\Musicas`)

```text
D:\Musicas\
├── PLAN.md                     # Este plano de arquitetura e implementação
├── data\                       # Dados da biblioteca (autocontidos)
│   ├── library.db              # Banco SQLite (4.527 faixas + FTS5 + playlists)
│   ├── tracks\                 # Arquivos de áudio (<track_uid>.mp3/.m4a/.ogg)
│   └── covers\                 # Capas de álbuns e faixas (.jpg/.png)
├── src\                        # Código-fonte da aplicação Electron
│   ├── main\                   # Processo principal (janela, IPC, SQLite, protocolo local)
│   ├── preload\                # Bridge segura (contextBridge)
│   └── renderer\               # Interface (UI, player, busca, playlists, letras)
└── Outros_Arquivos_e_Videos\   # Arquivos não-áudio preservados do acervo original
```

> **Nota:** Os caminhos `file_path` (`tracks/...`) e `cover_path` (`covers/...`) no `library.db` são relativos à pasta `data\`, mantendo os dados portáveis.

---

## 2. Banco de Dados Já Preparado (`data/library.db`)

- **`tracks`**: `track_uid` (PK), `file_path`, `cover_path`, `title`, `artist`, `album`, `genre`, `year`, `track_number`, `duration_sec`, `bitrate`, `sample_rate`, `ext`, `size_bytes`, `lyrics`, `synced_lyrics`, `play_count`, `is_favorite`, `original_rel_path`, `created_at`.
- **`tracks_fts` (FTS5)**: busca full-text instantânea por `title`, `artist`, `album`, `genre` e `lyrics`.
- **`playlists`** e **`playlist_tracks`**: estrutura pronta para playlists personalizadas com ordenação.

---

## 3. Identidade Visual ("Project Aethereal") & Arquitetura Técnica

- **Design System (Aethereal Blueprint):**
  - Fundo blueprint escuro (`#0B161C` / `#102029`) com grade técnica sutil (`rgba(92, 225, 230, 0.04)`).
  - Superfícies translúcidas (`rgba(16, 33, 42, 0.88)`) com bordas finas de 1px (`#264855`) e cantos suaves (`8px` / `12px`).
  - Acento primário ciano luminoso (`#5CE1E6`) com brilho suave (*glow*) para estados ativos, barra de progresso e chips selecionados.
  - Acento secundário latão/terracota (`#C88D6B`) para ações secundárias, badges e destaques.
  - Ícones: **Google Material Symbols Outlined** (empacotado offline via `material-symbols`).
- **Stack:** **Electron + Angular 19 (Standalone + Signals) + SQLite (`better-sqlite3`)**, com métodos curtos, serviços focados e componentes pequenos e reutilizáveis.

1. **Main Process (`src/main/`)**
   - Gerenciamento da janela principal (`BrowserWindow`) e integração com barra de tarefas/mídia do Windows.
   - Acesso ao SQLite (`better-sqlite3`) para consultas rápidas, contagem de `play_count`, favoritos e CRUD de playlists.
   - Protocolo customizado (`media://` ou `local-audio://`) com suporte a **HTTP Range Requests** para streaming local de áudio (permitindo *seek* instantâneo na barra de progresso) e carregamento seguro das capas em `data/covers/`.
2. **Preload (`src/preload/`)**
   - Exposição de API tipada e restrita via `contextBridge` (`window.musicApi`), sem expor Node.js diretamente no Renderer.
3. **Renderer (`src/renderer/`)**
   - Interface desktop moderna (a definir com base na **referência visual** fornecida pelo usuário).
   - Engine de reprodução HTML5 `<audio>` + Web Audio API (volume, seek, próximo/anterior, shuffle, repeat, crossfade opcional) + `navigator.mediaSession` (controles multimídia do teclado/Windows).

---

## 4. Funcionalidades Planejadas

### Fase 1 — Estrutura & Visual Base (após referência visual)
- Inicializar projeto Electron + bundler/UI em `src/` (com `package.json` na raiz ou em `src/` conforme estrutura final).
- Aplicar paleta, tipografia, layout (sidebar, área principal, barra de player fixa no rodapé, painel lateral de fila/letra) seguindo a referência visual.

### Fase 2 — Biblioteca & Navegação
- **Início / Descobrir:** músicas mais tocadas, adicionadas recentemente, mix por gênero.
- **Músicas / Artistas / Álbuns / Gêneros:** listagens com capa, contagem e ordenação.
- **Busca Instantânea (`FTS5`):** busca em tempo real por música, artista, álbum, gênero ou trecho da letra.

### Fase 3 — Player, Fila & Letras
- Reprodução contínua com **Fila de Reprodução** (adicionar à fila, tocar a seguir, reordenar), **Aleatório (Shuffle)** e **Repetir (Off / Lista / Faixa)**.
- **Painel de Letras:**
  - Exibição de letra sincronizada (`synced_lyrics` LRC) destacando a linha atual em tempo real e permitindo clicar na linha para pular para aquele trecho.
  - Fallback automático para letra simples (`lyrics`) quando não houver versão sincronizada.

### Fase 4 — Playlists, Favoritas & Empacotamento
- Criar/editar/excluir playlists e adicionar/remover faixas.
- Curtir/descurtir músicas (`is_favorite`) com página dedicada de **Músicas Curtidas**.
- Registro de `play_count` ao reproduzir faixas.
- Script de build/empacotamento (`electron-builder`) para gerar executável Windows offline.

---

## 5. Próximo Passo
- Aguardando a **referência visual** para definir o Design System (cores, layout, componentes) e iniciar a implementação em `src\`.
