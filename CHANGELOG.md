# Versões do MathLume

Site: https://mathlume.vercel.app/HTML/tela-princ.html

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
