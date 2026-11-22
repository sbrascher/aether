# Aether

Player de música desktop **privado e 100% offline**, construído com **Electron**, **Angular 19** e **SQLite (`node:sqlite` + FTS5)**, com identidade visual blueprint escura (*Project Aethereal*) e ícones **Google Material Symbols** empacotados localmente.

Desenvolvido por **Sérgio Brascher**.

---

## Recursos

- **Reprodução 100% offline:** streaming local via protocolo customizado (`aethereal://`) com suporte a *HTTP Range Requests* (`206 Partial Content`) para *seek* instantâneo em `.mp3`, `.m4a` e `.ogg`.
- **Busca instantânea (`FTS5`):** pesquisa em tempo real por título, artista, álbum, gênero ou trecho da letra.
- **Letras & Modo Sincronizado (`LRC`):** exibição de letras simples e letras sincronizadas acompanhando o tempo da faixa (clicáveis para pular para o trecho).
- **Playlists, Favoritos & Fila:** criação/edição de playlists no SQLite, músicas curtidas, fila de reprodução, *shuffle*, *repeat* e suporte a teclas multimídia (`MediaSession API`).
- **Histórico & Retomada Automática:** registra o histórico de reprodução (`play_history`) e restaura a última faixa, posição do áudio, fila e volume ao fechar e reabrir o app.
- **Pasta de Dados Configurável:** altere o diretório da biblioteca (`library.db`, `tracks/`, `covers/`) diretamente na aba **Configurações**.

---

## Estrutura do Projeto

```text
├── README.md
├── PLAN.md                      # Plano de arquitetura e organização
├── Aether.bat                   # Atalho rápido para abrir o app compilado
├── Build Windows Release.bat    # Atalho para gerar instalador e portátil (.exe)
└── src/                         # Código-fonte (Angular + Electron)
    ├── electron/                # Main process, Preload, SQLite (node:sqlite) e protocolo de mídia
    ├── public/                  # Favicon
    ├── src/                     # Aplicação Angular 19 (Standalone + Signals)
    └── package.json             # Scripts e configuração do electron-builder
```

> **Nota sobre `data/`:** A pasta `data/` (contendo `library.db`, `tracks/` e `covers/`) é intencionalmente ignorada no `.gitignore` para não versionar arquivos de áudio pessoais.

---

## Estrutura Esperada da Pasta de Dados (`data/`)

Ao apontar uma pasta nas **Configurações** (ou colocá-la em `data/` na raiz do projeto), o Aether espera:

- `library.db` — banco SQLite com as tabelas `tracks`, `tracks_fts`, `playlists` e `playlist_tracks` (a tabela `play_history` é criada automaticamente).
- `tracks/` — arquivos de áudio referenciados por `tracks.file_path` (ex.: `tracks/<track_uid>.mp3`).
- `covers/` — imagens de capa referenciadas por `tracks.cover_path` (ex.: `covers/alb_123.jpg`).

---

## Como Executar (Desenvolvimento)

**Pré-requisitos:** Node.js 22+ e npm.

```bash
cd src
npm install
```

- **Modo desenvolvimento** (Angular com hot-reload + Electron):
  ```bash
  npm run electron:dev
  ```
- **Modo produção local** (compila o Angular e abre no Electron):
  ```bash
  npm run electron:start
  ```
- Ou dê um duplo clique em `Aether.bat` na raiz do repositório (após compilar).

---

## Gerar Distribuição para Windows

```bash
cd src
npm run dist:win
```

*(Ou execute `Build Windows Release.bat` na raiz.)*

Os executáveis serão gerados em `release/`:
- Instalador Windows (NSIS)
- Executável portátil (`.exe` único)

---

## Licença

Distribuído sob a licença **MIT**. Sinta-se à vontade para usar, estudar e adaptar.
