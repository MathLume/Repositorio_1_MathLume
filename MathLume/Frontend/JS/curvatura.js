/* ---- Alterar curvatura: o jogador escolhe a função desenhada no fundo do cabeçalho ----
   O SVG do topo tem 3200 de largura e anda -50% (1600) em loop, então toda curva
   precisa se repetir a cada 1600. Usamos u = x / 800 (período 1 = 800) e, para as
   funções que não são periódicas (x², |x|, ...), repetimos o gráfico em trechos de
   400 com t indo de -1 a 1. Todas devolvem valores entre -1 e 1. */
(function () {
  var CHAVE = 'mathlume-curva';
  var LARGURA = 3200, MEIO = 35, AMPLITUDE = 26, PASSO = 8;

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

  // monta o "d" do path amostrando a função (mesma quantidade de pontos sempre,
  // assim o navegador consegue animar a troca de uma curva para outra)
  function desenhar(f, largura, meio, amplitude, escalaU, passo, inverter) {
    var d = '';
    for (var x = 0; x <= largura; x += passo) {
      var y = meio - (inverter ? -1 : 1) * amplitude * f(x * escalaU);
      d += (x === 0 ? 'M' : ' L') + x + ' ' + y.toFixed(1);
    }
    return d;
  }

  var principal = document.querySelector('.onda-principal');
  var sombra = document.querySelector('.onda-sombra');
  var pontilhada = document.querySelector('.onda-pontilhada');
  var grade = document.getElementById('curvasGrade');
  var rotulo = document.getElementById('curvaAtual');
  if (!principal || !grade) return;

  // degradê igual ao do cabeçalho, definido uma vez e usado por todos os gráficos do painel
  var defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('class', 'curva-defs');
  defs.setAttribute('aria-hidden', 'true');
  defs.innerHTML =
    '<defs><linearGradient id="curvaCorMini" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#ffb02e"/><stop offset=".25" stop-color="#ff6ac1"/>' +
      '<stop offset=".55" stop-color="#a855f7"/><stop offset=".85" stop-color="#5ee7ff"/><stop offset="1" stop-color="#ffb02e"/>' +
    '</linearGradient></defs>';
  grade.parentNode.insertBefore(defs, grade);

  // as três linhas do cabeçalho: brilho, pontilhada (espelhada) e principal
  function tresLinhas(f, largura, meio, amplitude, escalaU, passo) {
    var d = desenhar(f, largura, meio, amplitude, escalaU, passo, false);
    return '<path class="onda-sombra" d="' + d + '"/>' +
      '<path class="onda-pontilhada" d="' + desenhar(f, largura, meio, amplitude, escalaU, passo, true) + '"/>' +
      '<path class="onda-principal" d="' + d + '"/>';
  }

  // prévia grande: uma faixa igual ao cabeçalho, andando, com a régua de π
  var previa = document.getElementById('curvaPrevia');
  var previaSvg = previa && previa.querySelector('svg');
  function desenharPrevia(c) {
    if (previaSvg) previaSvg.innerHTML = tresLinhas(c.f, 1600, 30, 20, 1 / 800, 8);
  }

  var botoes = {};
  CURVAS.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'curva-btn';
    b.title = 'f(x) = ' + c.nome;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML =
      '<span class="curva-mini">' +
        '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">' +
          '<line class="eixo" x1="0" y1="20" x2="100" y2="20"/>' +
          tresLinhas(c.f, 100, 20, 13, 1.5 / 100, 1) +
        '</svg>' +
        '<span class="curva-regua" aria-hidden="true"><i>π</i><i>2π</i><i>3π</i></span>' +
      '</span><span class="curva-nome">' + (c.html || c.nome) + '</span>';
    b.addEventListener('click', function () {
      if (typeof somBotao === 'function') somBotao();
      aplicar(c.id, true);
    });
    grade.appendChild(b);
    botoes[c.id] = b;
  });

  function aplicar(id, salvar) {
    var c = CURVAS.filter(function (k) { return k.id === id; })[0] || CURVAS[0];
    var d = desenhar(c.f, LARGURA, MEIO, AMPLITUDE, 1 / 800, PASSO, false);
    principal.setAttribute('d', d);
    sombra.setAttribute('d', d);
    pontilhada.setAttribute('d', desenhar(c.f, LARGURA, MEIO, AMPLITUDE, 1 / 800, PASSO, true));
    Object.keys(botoes).forEach(function (k) {
      botoes[k].classList.toggle('ativa', k === c.id);
      botoes[k].setAttribute('aria-pressed', String(k === c.id));
    });
    rotulo.innerHTML = c.html || c.nome;
    desenharPrevia(c);
    if (salvar) { try { localStorage.setItem(CHAVE, c.id); } catch (e) { /* sem armazenamento: só não lembra */ } }
  }

  var salva = null;
  try { salva = localStorage.getItem(CHAVE); } catch (e) { /* ignora */ }
  aplicar(salva || 'sen', false);
})();
