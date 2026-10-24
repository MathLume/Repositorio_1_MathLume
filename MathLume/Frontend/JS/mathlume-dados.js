/* ==========================================================
   MathLume — dados compartilhados (catálogo + estado do jogador + temas)
   Usado por: loja.html, personalizacao.html e minigamemat.html

   ⚠ PLACEHOLDER DE BANCO DE DADOS
   Hoje o estado (Lumes, itens comprados/equipados, boosters) fica no
   localStorage do navegador, só para demonstração. Quando houver
   backend: troque carregar()/salvar() por chamadas à API e valide
   compras, saldo e pagamentos no SERVIDOR (nunca só no navegador).
   ========================================================== */
(function () {
  'use strict';

  var CHAVE = 'mathlume_estado_v1';
  var SALDO_INICIAL_DEMO = 1000; // ← use 0 em produção

  /* ---------- CATÁLOGO ----------
     Preços dos itens são PROVISÓRIOS (ainda serão decididos):
     basta mudar o campo "preco" de cada item. */
  var CATALOGO = {
    fundos: [
      { id: 'espaco',   nome: 'Espaço',       emoji: '🌌', preco: 0,   preview: 'linear-gradient(160deg,#2c1450,#070611)', desc: 'O céu estrelado clássico do MathLume.' },
      { id: 'cidade',   nome: 'Cidade',       emoji: '🏙️', preco: 300, preview: 'linear-gradient(180deg,#0b1437,#2e2a6b 55%,#d9622b)', desc: 'Prédios e aviões no céu. Cada vida perdida destrói mais a cidade — e cada acerto ajuda a reconstruí-la!' },
      { id: 'floresta', nome: 'Floresta',     emoji: '🌲', preco: 250, preview: 'linear-gradient(180deg,#07241c,#14532d 60%,#365314)', desc: 'Uma floresta com aves sobrevoando. Errar queima as árvores; acertar faz a mata se recuperar.' },
      { id: 'oceano',   nome: 'Fundo do Mar', emoji: '🐠', preco: 300, preview: 'linear-gradient(180deg,#082f49,#0c4a6e 55%,#164e63)', desc: 'Algas, corais e peixes nadando. Os erros escurecem e danificam o recife; os acertos o restauram.' }
    ],
    blocos: [
      { id: 'meteoro',  nome: 'Meteoro',         emoji: '☄️', preco: 0,   desc: 'O bloco de cálculo clássico.' },
      { id: 'basquete', nome: 'Bola de Basquete', emoji: '🏀', preco: 150, desc: 'As contas caem como bolas de basquete.' },
      { id: 'volei',    nome: 'Bola de Vôlei',    emoji: '🏐', preco: 150, desc: 'Cada conta vem numa bola de vôlei.' },
      { id: 'futebol',  nome: 'Bola de Futebol',  emoji: '⚽', preco: 150, desc: 'Contas em forma de bola de futebol.' },
      { id: 'tenis',    nome: 'Bola de Tênis',    emoji: '🎾', preco: 150, desc: 'Rápidas e amarelinhas: bolas de tênis.' },
      { id: 'beisebol', nome: 'Bola de Beisebol', emoji: '⚾', preco: 150, desc: 'Home run! Contas como bolas de beisebol.' }
    ],
    explosoes: [
      { id: 'confete',   nome: 'Confete',          emoji: '🎉', preco: 0,   desc: 'O bloco explode em confetes coloridos.' },
      { id: 'ketchup',   nome: 'Ketchup',          emoji: '🍅', preco: 200, desc: 'Splash! O bloco explode em respingos de ketchup.' },
      { id: 'fantasmas', nome: 'Mini Fantasmas',   emoji: '👻', preco: 250, desc: 'Ao explodir, saem mini fantasmas flutuando.' },
      { id: 'naves',     nome: 'Naves Alienígenas', emoji: '🛸', preco: 300, desc: 'Ao explodir, naves alienígenas saem voando.' },
      { id: 'moedas',    nome: 'Chuva de Moedas',  emoji: '🪙', preco: 200, desc: 'O bloco explode e solta moedas douradas.' }
    ],
    boosters: [
      { id: 'vidas',  nome: 'Comece com mais vidas', emoji: '❤️', preco: 120, desc: 'Comece a partida com o dobro de vidas (6 em vez de 3).' },
      { id: 'pontos', nome: 'Double Point',          emoji: '✨', preco: 150, desc: 'Pontos em dobro durante os primeiros 60 segundos da partida.' },
      { id: 'chance', nome: 'Segunda Chance',        emoji: '🛟', preco: 200, desc: 'Se suas vidas chegarem a zero, você ganha mais uma chance e volta com 2 vidas.' }
    ],
    pacotes: [
      { id: 'p100',  lumes: 100,  preco: 10,    icone: '🪙' },
      { id: 'p150',  lumes: 150,  preco: 13.5,  icone: '💰' },
      { id: 'p250',  lumes: 250,  preco: 20,    icone: '💰' },
      { id: 'p500',  lumes: 500,  preco: 35,    icone: '💎' },
      { id: 'p750',  lumes: 750,  preco: 50,    icone: '💎' },
      { id: 'p1500', lumes: 1500, preco: 125,   icone: '👑' }
    ]
  };

  var CATEGORIAS = ['fundos', 'blocos', 'explosoes'];

  /* ---------- ESTADO ---------- */
  function padrao() {
    return {
      lumes: SALDO_INICIAL_DEMO,
      possui:   { fundos: ['espaco'], blocos: ['meteoro'], explosoes: ['confete'] },
      equipado: { fundos: 'espaco',   blocos: 'meteoro',   explosoes: 'confete' },
      boosters: { vidas: 0, pontos: 0, chance: 0 }
    };
  }

  // TODO(banco de dados): carregar o estado do usuário logado a partir da API
  function carregar() {
    var base = padrao();
    try {
      var salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (!salvo) return base;
      if (typeof salvo.lumes === 'number' && salvo.lumes >= 0) base.lumes = salvo.lumes;
      CATEGORIAS.forEach(function (c) {
        if (salvo.possui && Array.isArray(salvo.possui[c])) {
          salvo.possui[c].forEach(function (id) {
            if (item(c, id) && base.possui[c].indexOf(id) < 0) base.possui[c].push(id);
          });
        }
        var eq = salvo.equipado && salvo.equipado[c];
        if (eq && base.possui[c].indexOf(eq) > -1) base.equipado[c] = eq;
      });
      Object.keys(base.boosters).forEach(function (b) {
        var n = salvo.boosters && salvo.boosters[b];
        if (typeof n === 'number' && n > 0) base.boosters[b] = Math.floor(n);
      });
    } catch (e) { /* localStorage indisponível: segue com o padrão */ }
    return base;
  }

  // TODO(banco de dados): persistir via API em vez do localStorage
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {}
  }

  function item(cat, id) {
    var lista = CATALOGO[cat] || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  var estado = carregar();

  /* ---------- AÇÕES ---------- */
  function possui(cat, id) { return estado.possui[cat].indexOf(id) > -1; }

  function comprar(cat, id) {
    var it = item(cat, id);
    if (!it) return { ok: false, erro: 'Item não encontrado.' };
    if (possui(cat, id)) return { ok: false, erro: 'Você já tem este item.' };
    if (estado.lumes < it.preco) return { ok: false, erro: 'semlumes' };
    estado.lumes -= it.preco;
    estado.possui[cat].push(id);
    salvar();
    return { ok: true, item: it };
  }

  function equipar(cat, id) {
    if (!possui(cat, id)) return false;
    estado.equipado[cat] = id;
    salvar();
    return true;
  }

  function equipado(cat) { return item(cat, estado.equipado[cat]); }

  function comprarBooster(id) {
    var it = item('boosters', id);
    if (!it) return { ok: false, erro: 'Booster não encontrado.' };
    if (estado.lumes < it.preco) return { ok: false, erro: 'semlumes' };
    estado.lumes -= it.preco;
    estado.boosters[id] = (estado.boosters[id] || 0) + 1;
    salvar();
    return { ok: true, item: it };
  }

  function consumirBoosters(ids) {
    ids.forEach(function (id) { if (estado.boosters[id] > 0) estado.boosters[id]--; });
    salvar();
  }

  function adicionarLumes(n) { estado.lumes += n; salvar(); }

  /* ---------- PAGAMENTO (gateway) ----------
     Brecha para o gateway (Stripe, Mercado Pago, Pagar.me, Pix...).
     Substitua MathLume.pagamento.iniciar por uma função que:
       1) peça ao SEU backend para criar a cobrança do pacote;
       2) leve o usuário ao checkout do gateway;
       3) devolva { ok: true } só quando o pagamento for confirmado.
     Em produção, quem credita os Lumes deve ser o backend (via webhook
     do gateway) — nunca o navegador. */
  var pagamento = {
    conectado: false,
    iniciar: function (pacote) {
      return Promise.resolve({ ok: false, pendente: true });
    }
  };

  /* ---------- FORMATAÇÃO ---------- */
  function fmt(n) { return Number(n).toLocaleString('pt-BR'); }
  function brl(n) { return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }


  /* =====================================================
     MathLume — Temas do mini-game (Integrado)
     ===================================================== */
  var KEY_TEMAS = 'mathlume_temas';
  var PADRAO_TEMAS = 'espaco';

  var CATALOGO_TEMAS = [
    {
      id: 'espaco',
      nome: 'Espaço',
      emoji: '☄️',
      preco: 0,
      desc: 'O visual clássico: meteoros caindo num céu roxo cheio de estrelas. Já vem liberado.',
      preview: 'radial-gradient(ellipse at 50% 35%,#2c1450 0%,#150b2c 48%,#070611 100%)',
      css: '../CSS/minigamemat.css'
    },
    {
      id: 'oceano',
      nome: 'Oceano',
      emoji: '🐠',
      preco: 250, // <- ajuste o preço (em Lumes) aqui
      desc: 'Menu, HUD e tela de jogo no fundo do mar: bolhas, algas, peixes e zona de perigo.',
      preview: 'linear-gradient(180deg,#0c1b6b 0%,#0369a1 55%,#164e63 100%)',
      css: '../CSS/minigamemat-oceano.css'
    },
    {
      id: 'halloween',
      nome: 'Halloween',
      emoji: '🎃',
      preco: 250, // <- ajuste o preço (em Lumes) aqui
      desc: 'Noite de lua cheia: abóboras caindo sobre um milharal, vidas em morcegos e um bando de morcegos voando a cada acerto.',
      preview: 'linear-gradient(180deg,#0d0508 0%,#2a0a00 58%,#6b2a00 100%)',
      css: '../CSS/minigamemat-halloween.css'
    },
    {
      id: 'floresta',
      nome: 'Floresta',
      emoji: '🌲',
      preco: 250, // <- ajuste o preço (em Lumes) aqui
      desc: 'Proteja a floresta das chamas: cada erro ou chama que passa incendeia uma árvore, e cada acerto faz chover e apaga o fogo.',
      preview: 'linear-gradient(180deg,#0d1a0d 0%,#0f2a14 55%,#1f6a2a 100%)',
      css: '../CSS/minigamemat-floresta.css'
    },
    {
      id: 'cidade',
      nome: 'Cidade',
      emoji: '🏙️',
      preco: 250, // <- ajuste o preço (em Lumes) aqui
      desc: 'Defenda a cidade dos aliens: slimes caem do céu e deixam os prédios sujos; cada acerto solta faíscas de energia.',
      preview: 'linear-gradient(180deg,#020510 0%,#050a22 55%,#0b3a6b 100%)',
      css: '../CSS/minigamemat-cidade.css'
    }
  ];

  function lerTemas() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY_TEMAS)); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.possui)) s.possui = [];
    if (s.possui.indexOf(PADRAO_TEMAS) < 0) s.possui.unshift(PADRAO_TEMAS);
    if (!s.equipado) s.equipado = PADRAO_TEMAS;
    return s;
  }
  function gravarTemas(s) { try { localStorage.setItem(KEY_TEMAS, JSON.stringify(s)); } catch (e) {} }

  function itemTema(id) {
    for (var i = 0; i < CATALOGO_TEMAS.length; i++) if (CATALOGO_TEMAS[i].id === id) return CATALOGO_TEMAS[i];
    return null;
  }
  function possuiTema(id) { return lerTemas().possui.indexOf(id) >= 0; }

  function atualTema() {
    var s = lerTemas(), t = itemTema(s.equipado);
    if (!t || s.possui.indexOf(t.id) < 0) t = itemTema(PADRAO_TEMAS);
    return t;
  }

  function equiparTema(id) {
    if (!itemTema(id) || !possuiTema(id)) return false;
    var s = lerTemas(); s.equipado = id; gravarTemas(s);
    return true;
  }

  function comprarTema(id) {
    var t = itemTema(id), ML = window.MathLume;
    if (!t) return { ok: false, erro: 'tema' };
    if (possuiTema(id)) return { ok: true, jaTinha: true };
    if (t.preco > 0) {
      if (!window.MathLume || typeof window.MathLume.estado !== 'function' || typeof window.MathLume.adicionarLumes !== 'function') return { ok: false, erro: 'dados' };
      var antes = window.MathLume.estado().lumes;
      if (antes < t.preco) return { ok: false, erro: 'saldo' };
      window.MathLume.adicionarLumes(-t.preco);
      var depois = window.MathLume.estado().lumes;
      if (depois !== antes - t.preco) {
        if (depois !== antes) window.MathLume.adicionarLumes(antes - depois);
        return { ok: false, erro: 'cobranca' };
      }
    }
    var s = lerTemas(); s.possui.push(id); gravarTemas(s);
    return { ok: true };
  }

  function aplicarTema() {
    var t = atualTema();
    document.documentElement.setAttribute('data-tema', t.id);
    document.write('<link rel="stylesheet" href="' + t.css + '">');
    return t;
  }

  window.MathLume = {
    catalogo: CATALOGO,
    estado: function () { return estado; },
    recarregar: function () { estado = carregar(); },
    item: item, possui: possui, comprar: comprar, equipar: equipar, equipado: equipado,
    comprarBooster: comprarBooster, consumirBoosters: consumirBoosters,
    adicionarLumes: adicionarLumes, pagamento: pagamento, fmt: fmt, brl: brl
  };

  window.MathLumeTemas = {
    catalogo: CATALOGO_TEMAS,
    item: itemTema,
    possui: possuiTema,
    atual: atualTema,
    equipar: equiparTema,
    comprar: comprarTema,
    aplicar: aplicarTema
  };
})();