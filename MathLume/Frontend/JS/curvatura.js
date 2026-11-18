/* ---- Alterar curvatura: o jogador escolhe a função desenhada no fundo do cabeçalho ----
   O SVG do topo tem 3200 de largura e anda -50% (1600) em loop, então toda curva
   precisa se repetir a cada 1600. Usamos u = x / 800 (período 1 = 800) e, para as
   funções que não são periódicas (x², |x|, ...), repetimos o gráfico em trechos de
   400 com t indo de -1 a 1. Todas devolvem valores entre -1 e 1.

   Gráficos do painel ⚙️ (elementos .grafico): ficam PARADOS. Ao passar o mouse
   (ou focar pelo teclado) a função é "plotada" de novo: a linha se desenha da
   esquerda para a direita e um pontinho de luz percorre a curva. */
(function () {
  var CHAVE = 'mathlume-curva';
  var LARGURA = 3200, MEIO = 35, AMPLITUDE = 26, PASSO = 8;
  var SVGNS = 'http://www.w3.org/2000/svg';

  // posição dentro do trecho atual, de -1 a 1
  function trecho(u) { var p = u * 2; return 2 * (p - Math.floor(p)) - 1; }

  var CURVAS = [
    { id: 'sen',       nome: 'sen(x)',        f: function (u) { return Math.sin(2 * Math.PI * u); } },
    { id: 'cos',       nome: 'cos(x)',        f: function (u) { return Math.cos(2 * Math.PI * u); } },
    { id: 'tg',        nome: 'tg(x)',         f: function (u) { return Math.tan(trecho(u) * 1.35) / Math.tan(1.35); } },
    { id: 'parabola',  nome: 'x²',            f: function (u) { var t = trecho(u); return 2 * t * t - 1; } },
    { id: 'modulo',    nome: '|x|',           f: function (u) { return 2 * Math.abs(trecho(u)) - 1; } },
    { id: 'gauss',     nome: 'e^(−x²)', html: 'e<sup>−x²</sup>', f: function (u) { var t = trecho(u) * 2.6; return 2 * Math.exp(-t * t) - 1; } },
    { id: 'harmonica', nome: 'sen x + ⅓ sen 3x', html: 'sen x+⅓sen 3x', f: function (u) { var a = 2 * Math.PI * u; return (Math.sin(a) + Math.sin(3 * a) / 3) / 0.943; } },
    { id: 'serra',     nome: 'x − ⌊x⌋',       f: function (u) { return trecho(u); } },
    { id: 'quadrada',  nome: 'sinal(sen x)',  f: function (u) { return trecho(u) < 0 ? 1 : -1; } }
  ];
  function curvaPorId(id) { return CURVAS.filter(function (k) { return k.id === id; })[0] || CURVAS[0]; }

  // "d" do path do cabeçalho (mesma quantidade de pontos sempre: a troca de curva é animada)
  function desenhar(f, largura, meio, amplitude, escalaU, passo, inverter) {
    var d = '';
    for (var x = 0; x <= largura; x += passo) {
      var y = meio - (inverter ? -1 : 1) * amplitude * f(x * escalaU);
      d += (x === 0 ? 'M' : ' L') + x + ' ' + y.toFixed(1);
    }
    return d;
  }
  // "d" de um gráfico pequeno: largura w, altura h, mostrando p períodos
  function amostrar(f, w, h, p, inverter) {
    var n = 160, meio = h / 2, amp = h * 0.36, d = '';
    for (var i = 0; i <= n; i++) {
      var y = meio - (inverter ? -1 : 1) * amp * f(p * i / n);
      d += (i ? ' L' : 'M') + (w * i / n).toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  var principal = document.querySelector('.onda-principal'); // a do cabeçalho (primeira da página)
  var sombra = document.querySelector('.onda-sombra');
  var pontilhada = document.querySelector('.onda-pontilhada');
  var grade = document.getElementById('curvasGrade');
  if (!principal || !grade) return;

  // degradê do cabeçalho para os gráficos do painel (fica no <body>: dentro de algo escondido não funcionaria)
  var defs = document.createElementNS(SVGNS, 'svg');
  defs.setAttribute('class', 'curva-defs');
  defs.setAttribute('aria-hidden', 'true');
  defs.innerHTML =
    '<defs><linearGradient id="curvaCorMini" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#ffb02e"/><stop offset=".25" stop-color="#ff6ac1"/>' +
      '<stop offset=".55" stop-color="#a855f7"/><stop offset=".85" stop-color="#5ee7ff"/><stop offset="1" stop-color="#ffb02e"/>' +
    '</linearGradient></defs>';
  document.body.appendChild(defs);

  /* desenha um .grafico: eixo (opcional), brilho, pontilhada espelhada, linha principal
     e o pontinho que percorre a curva quando ela é plotada */
  function desenharGrafico(el, c) {
    var svg = el.querySelector('svg');
    if (!svg) return;
    var vb = (el.getAttribute('data-vb') || '320x20').split('x').map(Number), w = vb[0], h = vb[1];
    var p = Number(el.getAttribute('data-p') || 2);
    var d = amostrar(c.f, w, h, p, false);
    var r = Math.min(3.2, h * 0.07 + 1.3);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML =
      (el.hasAttribute('data-eixo') ? '<line class="eixo" x1="0" y1="' + h / 2 + '" x2="' + w + '" y2="' + h / 2 + '"/>' : '') +
      '<path class="onda-sombra" pathLength="1" d="' + d + '"/>' +
      '<path class="onda-pontilhada" d="' + amostrar(c.f, w, h, p, true) + '"/>' +
      '<path class="onda-principal" pathLength="1" d="' + d + '"/>' +
      '<circle class="grafico-ponto" r="' + r.toFixed(1) + '">' +
        '<animateMotion dur="0.9s" begin="indefinite" fill="freeze" calcMode="paced" path="' + d + '"/>' +
      '</circle>';
  }

  var semMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // micro-animação: replota a função (linha se desenhando + ponto de luz correndo)
  function plotar(el) {
    if (semMovimento || !el) return;
    el.classList.remove('plotando');
    void el.getBoundingClientRect(); // reinicia a animação CSS
    el.classList.add('plotando');
    var a = el.querySelector('animateMotion');
    if (a && a.beginElement) { try { a.beginElement(); } catch (e) { /* navegador sem SMIL: só a linha anima */ } }
  }
  // quem dispara: o item/faixa inteiro, não só a linha
  function ligarHover(el) {
    var alvo = el.closest('.cfg-item, .panel-topo, .curva-btn, .curva-previa') || el;
    if (alvo.__plotar) return;
    alvo.__plotar = true;
    alvo.addEventListener('mouseenter', function () { plotar(el); });
    alvo.addEventListener('focusin', function () { plotar(el); });
  }

  /* botões de cada função (aba Curvatura) */
  var botoes = {};
  CURVAS.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'curva-btn';
    b.title = 'f(x) = ' + c.nome;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML =
      '<span class="curva-mini grafico" data-vb="100x40" data-p="1.5" data-eixo data-funcao="' + c.id + '">' +
        '<svg preserveAspectRatio="none" aria-hidden="true"></svg>' +
        '<span class="curva-regua" aria-hidden="true"><i>π</i><i>2π</i><i>3π</i></span>' +
      '</span><span class="curva-nome">' + (c.html || c.nome) + '</span>';
    b.addEventListener('click', function () {
      if (typeof somBotao === 'function') somBotao();
      aplicar(c.id, true);
      plotar(b.querySelector('.grafico'));
    });
    grade.appendChild(b);
    botoes[c.id] = b;
  });

  var graficos = Array.prototype.slice.call(document.querySelectorAll('.grafico'));
  graficos.forEach(ligarHover);

  function aplicar(id, salvar) {
    var c = curvaPorId(id);
    // cabeçalho (continua andando)
    var d = desenhar(c.f, LARGURA, MEIO, AMPLITUDE, 1 / 800, PASSO, false);
    principal.setAttribute('d', d);
    sombra.setAttribute('d', d);
    pontilhada.setAttribute('d', desenhar(c.f, LARGURA, MEIO, AMPLITUDE, 1 / 800, PASSO, true));
    // gráficos do painel: cada miniatura mostra a sua função; os outros, a escolhida
    graficos.forEach(function (el) {
      var propria = el.getAttribute('data-funcao');
      desenharGrafico(el, propria ? curvaPorId(propria) : c);
    });
    Object.keys(botoes).forEach(function (k) {
      botoes[k].classList.toggle('ativa', k === c.id);
      botoes[k].setAttribute('aria-pressed', String(k === c.id));
    });
    document.querySelectorAll('#curvaAtual, [data-curva-rotulo]').forEach(function (el) { el.innerHTML = c.html || c.nome; });
    if (salvar) {
      try { localStorage.setItem(CHAVE, c.id); } catch (e) { /* sem armazenamento: só não lembra */ }
      // escolheu outra função: a prévia e o topo do painel plotam a nova
      plotar(document.getElementById('curvaPrevia'));
      plotar(document.querySelector('.panel-grafico'));
    }
  }

  var salva = null;
  try { salva = localStorage.getItem(CHAVE); } catch (e) { /* ignora */ }
  aplicar(salva || 'sen', false);
})();
