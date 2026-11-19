/* ==========================================================
   MathLume — cabeçalho igual em todas as telas
   Monta a barra de cima (fundo com ondas, menu, Login, ⚙️) e o painel
   de Configurações (Sobre nós, Som, Curvatura).

   Como usar numa página:
     <nav class="navbar" id="cabecalho" data-pagina="ranking"></nav>
     <script src="../JS/cabecalho.js"></script>
   e, no fim do <body>, ../JS/sons.js e ../JS/curvatura.js.
   data-pagina: inicio | ranking | carreira | loja | personalizacao | jogar | admin
   Elementos dentro do <nav> com data-manter (ex.: saldo de Lumes) são
   mantidos e vão para o lado direito da barra.
   ========================================================== */
(function () {
  var nav = document.getElementById('cabecalho');
  if (!nav) return;

  var pagina = nav.getAttribute('data-pagina') || '';
  var ehInicio = pagina === 'inicio';
  var manter = Array.prototype.slice.call(nav.querySelectorAll('[data-manter]'));
  var IC = '../assets/icones/';

  function som() { if (typeof somBotao === 'function') somBotao(); }
  function usuarioSalvo() {
    try { return JSON.parse(localStorage.getItem('mathlume_usuario') || 'null'); } catch (e) { return null; }
  }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---------- barra de cima ---------- */
  var LINKS = [
    { id: 'inicio', href: ehInicio ? '#inicio' : 'tela-princ.html', ic: 'icone-nav.svg', largo: true, txt: 'Início' },
    { id: 'ranking', href: 'TelaDeRank.html', ic: 'icone-ranking.svg', txt: 'Ranking' },
    { id: 'carreira', href: 'TelaDeCarreira.html', ic: 'icone-carreira.svg', txt: 'Carreira' },
    { id: 'loja', href: 'loja.html', ic: 'icone-loja.svg', txt: 'Loja' },
    { id: 'jogar', href: 'minigamemat.html', jogar: true, txt: 'Jogar' },
    { id: 'personalizacao', href: 'personalizacao.html', ic: 'icone-personalizacao.svg', txt: 'Personalização' },
    // só aparece para administradores (ver atualizarAdmin)
    { id: 'admin', href: 'admin.html', emoji: '🛡️', txt: 'Admin', soAdmin: true }
  ];
  var menuHtml = LINKS.map(function (l) {
    if (l.jogar) return '<a href="' + l.href + '" class="nav-jogar"><span class="ic" aria-hidden="true">▶</span>' + l.txt + '</a>';
    var ativo = l.id === pagina;
    var icone = l.emoji
      ? '<span class="nav-ic nav-ic-emoji" aria-hidden="true">' + l.emoji + '</span>'
      : '<img class="nav-ic' + (l.largo ? ' nav-ic-largo' : '') + '" src="' + IC + l.ic + '" alt="" aria-hidden="true">';
    // o texto fica num <span>: em telas médias só o ícone aparece (o title mostra o nome)
    return '<a href="' + l.href + '" class="nav-link' + (ativo ? ' ativo' : '') + (l.soAdmin ? ' nav-admin' : '') + '" title="' + l.txt + '"' +
      (l.soAdmin ? ' id="navAdmin" hidden' : '') + (ativo ? ' aria-current="page"' : '') + '>' + icone + '<span class="nav-txt">' + l.txt + '</span></a>';
  }).join('');

  var REGUA = ['π/2', 'π', '3π/2', '2π', '5π/2', '3π', '7π/2', '4π', '9π/2', '5π', '11π/2', '6π', '13π/2', '7π'];
  var ONDA = 'M0 35 C110 6 290 6 400 35 S690 64 800 35 S1090 6 1200 35 S1490 64 1600 35 S1890 6 2000 35 S2290 64 2400 35 S2690 6 2800 35 S3090 64 3200 35';

  nav.innerHTML =
    '<div class="nav-fundo" aria-hidden="true">' +
      '<svg class="nav-onda" viewBox="0 0 3200 70" preserveAspectRatio="none">' +
        '<defs><linearGradient id="ondaCor" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0" spreadMethod="repeat">' +
          '<stop offset="0" stop-color="#ffb02e"/><stop offset=".2" stop-color="#ff6ac1"/>' +
          '<stop offset=".5" stop-color="#a855f7"/><stop offset=".8" stop-color="#5ee7ff"/><stop offset="1" stop-color="#ffb02e"/>' +
        '</linearGradient></defs>' +
        '<path class="onda-sombra" d="' + ONDA + '"/>' +
        '<path class="onda-pontilhada" d="' + ONDA + '"/>' +
        '<path class="onda-principal" d="' + ONDA + '"/>' +
      '</svg>' +
      '<span class="nav-formula" style="left:3%;top:16%">e<sup>iπ</sup> + 1 = 0</span>' +
      '<span class="nav-formula" style="left:33%;top:58%">a² + b² = c²</span>' +
      '<span class="nav-formula" style="left:59%;top:12%">Σ 1/n² = π²/6</span>' +
      '<span class="nav-formula" style="left:84%;top:56%">φ = (1+√5)/2</span>' +
      '<span class="nav-estrela" style="left:20%;top:22%;color:#5ee7ff">✦</span>' +
      '<span class="nav-estrela" style="left:28.5%;top:14%;color:#ffe27a">✦</span>' +
      '<span class="nav-estrela" style="left:57%;top:16%;color:#ffe27a">✦</span>' +
      '<span class="nav-estrela" style="left:85.5%;top:14%;color:#ffe27a">✦</span>' +
      '<span class="nav-ponto" style="left:14.2%;top:66%"></span>' +
      '<span class="nav-ponto" style="left:42.8%;top:66%"></span>' +
      '<span class="nav-ponto" style="left:71.4%;top:66%"></span>' +
      '<div class="nav-regua">' + REGUA.map(function (r) { return '<span>' + r + '</span>'; }).join('') + '</div>' +
    '</div>' +
    '<div class="container">' +
      '<a href="' + (ehInicio ? '#inicio' : 'tela-princ.html') + '" class="logo logo-nav"><img src="' + IC + 'icone-nav.svg" alt="" aria-hidden="true">Math<span>Lume</span></a>' +
      '<div class="menu" id="menu">' + menuHtml + '</div>' +
      '<div class="nav-right">' +
        '<button class="btn-login btn-brilho" id="btnLogin" type="button">Login</button>' +
        '<button class="gear" id="btnGear" type="button" aria-label="Configurações" aria-expanded="false" aria-controls="panel"><img src="' + IC + 'icone-config.svg" alt="" aria-hidden="true"></button>' +
        '<button class="burger" id="burger" type="button" aria-label="Menu" aria-expanded="false">☰</button>' +
      '</div>' +
    '</div>';

  var navRight = nav.querySelector('.nav-right');
  manter.forEach(function (el) { navRight.insertBefore(el, navRight.firstChild); });

  /* ---------- painel de Configurações ---------- */
  var EQUIPE = [
    ['Y', 'Yasser Segati', 'Gerente de projeto'],
    ['M', 'Maria Eduarda', 'Cientista de dados'],
    ['A', 'André Araújo', 'Desenvolvedor back-end'],
    ['C', 'Carlos Eduardo', 'Designer'],
    ['J', 'Joel Bezerra', 'Desenvolvedor front-end'],
    ['A', 'Alexandre', 'Desenvolvedor back-end'],
    ['G', 'Giovanni Banks', 'Q.A.']
  ];
  /* para adicionar uma configuração nova: um item aqui + um <div class="tab-body" id="tab-NOME"> abaixo */
  var ITENS = [
    ['sobre', 'icone-sobre.svg', 'Sobre nós', 'Conheça a equipe do projeto'],
    ['som', 'icone-som.svg', 'Som', 'Volume, música e cliques em todas as telas'],
    ['curva', 'icone-curvatura.svg', 'Curvatura', 'Escolha a função do fundo do cabeçalho']
  ];

  /* formas geométricas "voando" no fundo do topo do painel e de cada item.
     Cada forma: [tipo, esquerda %, topo %, tamanho px, cor, ângulo do voo, giro da forma] */
  var SVG_FORMA = {
    tri: '<polygon points="12,3 21,20 3,20"/>',
    quad: '<rect x="4" y="4" width="16" height="16" rx="2.5"/>',
    circ: '<circle cx="12" cy="12" r="8"/>'
  };
  var FORMAS_TOPO = [
    ['tri', 6, 60, 14, '#ffb02e', -18, 10],
    ['circ', 30, 66, 9, '#5ee7ff', -10, 0],
    ['quad', 50, 18, 11, '#ff6ac1', -25, 15],
    ['tri', 62, 64, 10, '#c084fc', -12, -20],
    ['circ', 74, 22, 7, '#ffe27a', -20, 0],
    ['quad', 86, 52, 9, '#5ee7ff', -8, 25]
  ];
  var FORMAS_ITENS = [
    [['tri', 60, 16, 10, '#ffb02e', -15, 0], ['circ', 73, 62, 7, '#5ee7ff', -10, 0], ['quad', 85, 20, 9, '#ff6ac1', -20, 12]],
    [['circ', 58, 62, 8, '#ffe27a', -12, 0], ['quad', 71, 16, 9, '#c084fc', -18, -10], ['tri', 85, 60, 10, '#5ee7ff', -8, 20]],
    [['quad', 59, 18, 9, '#5ee7ff', -22, 8], ['tri', 72, 60, 10, '#ff6ac1', -12, -15], ['circ', 86, 22, 8, '#ffb02e', -16, 0]]
  ];
  function formas(lista) {
    return '<span class="formas" aria-hidden="true">' + lista.map(function (f, i) {
      // cada forma boia num ritmo diferente (duração, atraso e distância variam), para não andarem juntas
      var k = f[1] + f[2] + i * 7;
      var boia = ';--dur:' + (6 + k % 5) + 's;--atraso:-' + (k % 9) + 's;--ax:' + (10 + k % 9) + 'px;--ay:' + (4 + k % 5) + 'px';
      return '<span class="forma" style="left:' + f[1] + '%;top:' + f[2] + '%;--s:' + Math.round(f[3] * 1.6) + 'px;--cor:' + f[4] + ';--voo:' + f[5] + 'deg;--giro:' + f[6] + 'deg' + boia + '">' +
        '<svg viewBox="0 0 24 24">' + SVG_FORMA[f[0]] + '</svg></span>';
    }).join('') + '</span>';
  }

  var panel = document.createElement('aside');
  panel.className = 'panel';
  panel.id = 'panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML =
    /* topo do painel = um pedaço do cabeçalho: grade, curva andando, estrelas e régua de π */
    /* fundo com formas geométricas "voando"; ao passar o mouse elas avançam e giram */
    '<div class="panel-topo">' +
      formas(FORMAS_TOPO) +
      '<div class="panel-head">' +
        '<div class="cfg-head-esq">' +
          '<button class="cfg-voltar" id="cfgVoltar" type="button" aria-label="Voltar para a lista" hidden>‹</button>' +
          '<strong class="cfg-titulo"><img id="cfgTituloIc" src="' + IC + 'icone-config.svg" alt="" aria-hidden="true"><span id="cfgTitulo">Configurações</span></strong>' +
        '</div>' +
        '<button class="close" data-close="panel" type="button" aria-label="Fechar">✕</button>' +
      '</div>' +
      '<span class="panel-fx" aria-hidden="true">f(x) = <b data-curva-rotulo>sen(x)</b></span>' +
    '</div>' +
    '<nav class="cfg-menu active" id="cfgMenu" aria-label="Configuração geral">' +
      '<span class="cfg-label">Configuração geral</span>' +
      ITENS.map(function (i, n) {
        return '<button class="cfg-item" type="button" data-secao="' + i[0] + '">' + formas(FORMAS_ITENS[n % FORMAS_ITENS.length]) + '<span class="cfg-ic" aria-hidden="true"><img src="' + IC + i[1] + '" alt=""></span>' +
          '<span class="cfg-txt"><strong>' + i[2] + '</strong><small>' + i[3] + '</small></span><span class="cfg-seta" aria-hidden="true">›</span></button>';
      }).join('') +
    '</nav>' +

    '<div class="tab-body" id="tab-sobre" data-titulo="Sobre nós" data-icone="icone-sobre.svg">' +
      '<p class="muted" style="margin-bottom:16px;font-size:.9rem">A MathLume nasceu para tornar o aprendizado mais divertido e acessível. Conheça quem participa do projeto:</p>' +
      EQUIPE.map(function (p) {
        return '<div class="member"><div class="avatar">' + p[0] + '</div><div><strong>' + p[1] + '</strong><span>' + p[2] + '</span></div></div>';
      }).join('') +
      '<a href="admin.html" class="admin-btn" id="linkAdmin" hidden><span aria-hidden="true">🛡️</span><span><strong>Painel Admin</strong><small>Área restrita a administradores</small></span><span class="seta" aria-hidden="true">›</span></a>' +
    '</div>' +

    '<div class="tab-body" id="tab-som" data-titulo="Som" data-icone="icone-som.svg">' +
      '<p class="muted" style="margin-bottom:6px;font-size:.85rem">Estas opções valem para todas as telas do MathLume, inclusive o mini-game.</p>' +
      '<div class="opt col">' +
        '<div class="vol-topo"><strong>🔊 Volume geral</strong><b id="volumeValor">70%</b></div>' +
        '<div class="vol-linha">' +
          '<button class="vol-btn" id="volMenos" type="button" aria-label="Diminuir volume">−</button>' +
          '<input type="range" id="volume" min="0" max="100" step="5" value="70" aria-label="Volume geral">' +
          '<button class="vol-btn" id="volMais" type="button" aria-label="Aumentar volume">+</button>' +
        '</div>' +
      '</div>' +
      '<div class="opt"><div><strong>🎵 Música de fundo</strong><span>Melodia ambiente suave</span></div>' +
        '<label class="switch"><input type="checkbox" id="musicToggle"><i></i></label></div>' +
      '<div class="opt"><div><strong>🔔 Sons de clique</strong><span>Efeito ao apertar botões</span></div>' +
        '<label class="switch"><input type="checkbox" id="sfxToggle" checked><i></i></label></div>' +
    '</div>' +

    '<div class="tab-body" id="tab-curva" data-titulo="Curvatura" data-icone="icone-curvatura.svg">' +
      '<div class="opt col curva-topo"><div><strong>📈 Escolha a sua função</strong><span>A curva do fundo do cabeçalho passa a ser o gráfico que você escolher.</span></div></div>' +
      '<div class="curva-previa grafico" id="curvaPrevia" data-vb="320x58" data-p="2" aria-hidden="true">' +
        '<svg preserveAspectRatio="none"></svg>' +
        '<div class="curva-previa-regua"><span>π/2</span><span>π</span><span>3π/2</span><span>2π</span></div>' +
      '</div>' +
      '<div class="curvas" id="curvasGrade" role="group" aria-label="Funções para a curva do cabeçalho"></div>' +
      '<p class="curva-atual" aria-live="polite">f(x) = <b id="curvaAtual">sen(x)</b></p>' +
    '</div>';
  nav.parentNode.insertBefore(panel, nav.nextSibling);

  var $ = function (id) { return document.getElementById(id); };
  var menu = $('menu'), burger = $('burger'), gear = $('btnGear'), btnLogin = $('btnLogin');
  var cfgMenu = $('cfgMenu'), cfgVoltar = $('cfgVoltar'), cfgTitulo = $('cfgTitulo');

  /* menu do celular */
  burger.addEventListener('click', function (e) {
    e.stopPropagation(); som();
    var aberto = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(aberto));
  });
  menu.addEventListener('click', function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); });

  /* seções do painel: lista visível; clicar abre a seção, "‹" volta */
  function abrirSecao(nome) {
    var secao = nome ? $('tab-' + nome) : null;
    panel.querySelectorAll('.tab-body').forEach(function (el) { el.classList.toggle('active', el === secao); });
    cfgMenu.classList.toggle('active', !secao);
    cfgVoltar.hidden = !secao;
    // o ícone do título é o mesmo que abre aquela parte: a engrenagem na lista, o ícone do item dentro da seção
    cfgTitulo.textContent = secao ? secao.getAttribute('data-titulo') : 'Configurações';
    $('cfgTituloIc').src = IC + (secao ? secao.getAttribute('data-icone') : 'icone-config.svg');
    panel.scrollTop = 0;
  }
  panel.querySelectorAll('.cfg-item').forEach(function (b) {
    b.addEventListener('click', function () { som(); abrirSecao(b.getAttribute('data-secao')); });
  });
  cfgVoltar.addEventListener('click', function () { som(); abrirSecao(null); });

  /* abrir / fechar o painel */
  function painelAberto() { return panel.classList.contains('open'); }
  function definirPainel(abrir) {
    if (abrir && !painelAberto()) abrirSecao(null); // sempre abre na lista
    panel.classList.toggle('open', abrir);
    panel.setAttribute('aria-hidden', String(!abrir));
    gear.setAttribute('aria-expanded', String(abrir));
    document.dispatchEvent(new CustomEvent('cabecalho:painel', { detail: { aberto: abrir } }));
  }
  gear.addEventListener('click', function (e) { e.stopPropagation(); som(); definirPainel(!painelAberto()); });
  panel.querySelector('[data-close="panel"]').addEventListener('click', function () { som(); definirPainel(false); });
  document.addEventListener('click', function (e) {
    if (painelAberto() && !panel.contains(e.target) && !gear.contains(e.target)) definirPainel(false);
    if (!menu.contains(e.target) && e.target !== burger) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && painelAberto()) definirPainel(false); });

  /* Login: na tela inicial quem cuida é a própria página (janela de login/cadastro).
     Nas outras telas mostra o nome de quem está logado e leva para a tela inicial. */
  // Mostra o acesso ao painel Admin (na barra e no ⚙️ Sobre nós) só para administradores.
  // Quem decide de verdade é o servidor: as rotas /api/admin recusam quem não é ADM.
  function atualizarAdmin() {
    var u = usuarioSalvo(), adm = !!(u && u.papel === 'admin');
    try { if (!localStorage.getItem('mathlume_token')) adm = false; } catch (e) { /* sem armazenamento */ }
    $('linkAdmin').hidden = !adm;
    $('navAdmin').hidden = !adm;
  }
  atualizarAdmin();
  function mostrarUsuario(u) {
    var nome = u && u.usuario;
    btnLogin.textContent = nome || 'Login';
    btnLogin.classList.toggle('com-nome', !!nome);
    btnLogin.title = nome ? nome + ' · ir para o início' : 'Entrar ou criar conta';
    atualizarAdmin();
  }
  if (!ehInicio) {
    var temToken = false;
    try { temToken = !!localStorage.getItem('mathlume_token'); } catch (e) { /* sem armazenamento */ }
    mostrarUsuario(temToken ? usuarioSalvo() : null);
    btnLogin.addEventListener('click', function () { som(); location.href = 'tela-princ.html'; });
  }

  /* controles de som (JS/sons.js é carregado no fim da página) */
  function ligarSom() {
    if (!window.MathLumeSom) return;
    var S = window.MathLumeSom;
    var vol = $('volume'), valor = $('volumeValor'), musica = $('musicToggle'), sfx = $('sfxToggle');
    function mostrar(s) {
      vol.value = s.volume;
      valor.textContent = s.volume === 0 ? 'Mudo' : s.volume + '%';
      musica.checked = s.musica;
      sfx.checked = s.sfx;
    }
    vol.addEventListener('input', function () { S.definirVolume(vol.value); });
    vol.addEventListener('change', som); // ao soltar, um clique para ouvir o novo volume
    $('volMenos').addEventListener('click', function () { S.definirVolume(S.estado().volume - 10); som(); });
    $('volMais').addEventListener('click', function () { S.definirVolume(S.estado().volume + 10); som(); });
    musica.addEventListener('change', function () { S.definirMusica(musica.checked); });
    sfx.addEventListener('change', function () { S.definirSfx(sfx.checked); som(); });
    S.aoMudar(mostrar);
    mostrar(S.estado());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarSom);
  else ligarSom();

  window.MathLumeCabecalho = {
    abrirPainel: function () { definirPainel(true); },
    fecharPainel: function () { definirPainel(false); },
    painelAberto: painelAberto,
    atualizarAdmin: atualizarAdmin,
    mostrarUsuario: mostrarUsuario // telas que não são o início: atualiza o nome no botão Login
  };
})();
