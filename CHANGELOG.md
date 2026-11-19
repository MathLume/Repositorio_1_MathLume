# Versões do MathLume

Site: https://mathlume.vercel.app/HTML/tela-princ.html

## v1.2 — 18/11/2026 · tela de Carreira

**Cabeçalho**
- Novo link **Carreira** na barra de cima (entre Ranking e Loja), com ícone próprio `assets/icones/icone-carreira.svg`.
- A barra se ajusta ao espaço: em telas médias, ou quando está cheia (saldo de Lumes / Admin),
  os links mostram só o ícone (o nome aparece ao passar o mouse); abaixo de 900px vira o menu ☰.
- No menu do usuário da tela inicial: "📊 Minha carreira".

**Tela de Carreira** (`HTML/TelaDeCarreira.html` + `CSS/TelaDeCarreira.css`)
- Design novo com o cabeçalho do site; arquivos renomeados para minúsculas (`.HTML`/`.CSS` não carregavam no Vercel).
- Mostra dados reais do banco: melhor pontuação, liga (Bronze → Diamante), posição no ranking,
  partidas, acertos, erros, tempo total e o histórico das últimas 50 partidas.
- Aba Ranking com o top 3, do 4º ao 10º e a sua posição; `TelaDeCarreira.html#ranking` abre direto nela.

**Backend**
- Rota `GET /api/me/carreira` (precisa de login).
- Tabela `pontuacoes` ganha `erros` e `duracao_seg` (criadas sozinhas ao ligar o servidor;
  partidas antigas mostram "—"). O mini-game passa a enviar os erros e a duração de cada partida.

## v1.1 — 18/11/2026 · organização e telas atualizadas

Novo commit por cima da v1.0. Nenhum commit anterior foi alterado: todo o histórico
(e a autoria de cada colaborador) continua no `git log`.

**Telas que agora aparecem no site**
- ⚙️ Engrenagem com o design novo (Arthur): ícones próprios, formas animadas e gráfico f(x)
  no topo do painel — `JS/cabecalho.js`, `CSS/cabecalho.css`, `JS/curvatura.js`, ícones `som`, `sobre`, `curvatura`.
- 🏙️ Mini-game com o tema Cidade vivo (André): prédios, lojas, carros e sons — `HTML/minigamemat.html` + `JS/cidade.js`.
  Corrige a v1.0, em que o tema Cidade aparecia sem cidade.
- 🛍️ Seção "Loja" da tela principal (Carlos), com itens, preços e saldo reais;
  CSS da seção criado em `CSS/tela-princ.css` (classes `lj-*`).

**Limpeza**
- Removida a cópia inteira `Repositorio_1_MathLume-main/` (o que era novo nela foi juntado em `MathLume/`).
- Removido o submódulo vazio `Repositorio_1_MathLume`.
- `minigamemat (1).html` virou o `minigamemat.html`; `tela-princ.html` da raiz foi para `MathLume/Frontend/HTML/`.
- Áudios mais leves (15 MB → 7 MB): músicas em 128 kbps e efeitos `.wav` convertidos para `.mp3`.

**Estrutura**
```
MathLume/
├── Backend/    servidor, banco (Neon) e scripts
└── Frontend/   HTML/  CSS/  JS/  assets/
api/index.js    função do Vercel (usa o Backend)
vercel.json     publica MathLume/Frontend
```

## v1.0 — 17/11/2026 · versão publicada

Commit `7c76d87` (PR #86). Para ver os arquivos dessa versão: `git checkout v1.0`.
