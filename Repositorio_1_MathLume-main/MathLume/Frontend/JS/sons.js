/* ---- Som geral do MathLume ----
   As preferências de som ficam salvas no navegador e valem para TODAS as telas:
     mathlume_volume  -> 0 a 100 (o mesmo usado pelo mini-game)
     mathlume_sfx     -> "1" liga / "0" desliga os sons de clique
     mathlume_musica  -> "1" liga / "0" desliga a música ambiente
   Qualquer tela pode mudar o som com MathLumeSom.definirVolume(...), etc.
   Se o volume for alterado em outra aba, esta aba também se ajusta. */
var MathLumeSom = (function () {
  var VOLUME_PADRAO = 70;
  // volume "base" de cada áudio (o volume geral multiplica este valor)
  var BASE = { temaGame: 0.3 };

  function ler(chave, padrao) {
    try { var v = localStorage.getItem(chave); return v === null ? padrao : v; } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, String(valor)); } catch (e) { /* sem armazenamento: vale só nesta tela */ }
  }

  var estado = { volume: VOLUME_PADRAO, sfx: true, musica: false };
  var ouvintes = [];

  function carregar() {
    var v = Number(ler('mathlume_volume', VOLUME_PADRAO));
    estado.volume = isNaN(v) ? VOLUME_PADRAO : Math.max(0, Math.min(100, v));
    estado.sfx = ler('mathlume_sfx', '1') !== '0';
    estado.musica = ler('mathlume_musica', '0') === '1';
  }

  /* aplica o volume geral em todos os <audio> da página */
  function aplicarVolume() {
    var fator = estado.volume / 100;
    document.querySelectorAll('audio').forEach(function (a) {
      var base = BASE[a.id] != null ? BASE[a.id] : 1;
      a.volume = Math.max(0, Math.min(1, base * fator));
    });
    if (master && ctx) master.gain.setTargetAtTime(fator * 0.25, ctx.currentTime, 0.02);
  }

  /* ---- música ambiente (gerada no navegador). Só toca em telas que não têm música própria ---- */
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, musicaTimer = null;
  var NOTAS = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];

  function temMusicaPropria() { return !!document.getElementById('lobby') || !!document.getElementById('temaGame'); }
  function iniciarAudio() {
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = estado.volume / 100 * 0.25;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function tom(freq, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function tocarMusica() {
    if (musicaTimer || temMusicaPropria() || !iniciarAudio()) return;
    var i = 0;
    musicaTimer = setInterval(function () {
      var n = NOTAS[Math.floor(Math.random() * NOTAS.length)];
      tom(n, 1.8, 0.5);
      if (i++ % 4 === 0) tom(n / 2, 3, 0.4);
    }, 700);
  }
  function pararMusica() { clearInterval(musicaTimer); musicaTimer = null; }
  function atualizarMusica() { if (estado.musica) tocarMusica(); else pararMusica(); }

  // o navegador só deixa tocar som depois que a pessoa interage com a página
  function primeiraInteracao() {
    document.removeEventListener('pointerdown', primeiraInteracao);
    document.removeEventListener('keydown', primeiraInteracao);
    atualizarMusica();
  }

  function avisar() { aplicarVolume(); ouvintes.forEach(function (fn) { fn(estado); }); }

  carregar();
  document.addEventListener('pointerdown', primeiraInteracao);
  document.addEventListener('keydown', primeiraInteracao);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicarVolume);
  else aplicarVolume();

  // mudou em outra aba/tela aberta: acompanha
  window.addEventListener('storage', function (e) {
    if (['mathlume_volume', 'mathlume_sfx', 'mathlume_musica'].indexOf(e.key) < 0) return;
    carregar(); atualizarMusica(); avisar();
  });

  return {
    estado: function () { return { volume: estado.volume, sfx: estado.sfx, musica: estado.musica }; },
    definirVolume: function (v) {
      v = Math.max(0, Math.min(100, Number(v) || 0));
      estado.volume = v; gravar('mathlume_volume', v); avisar();
    },
    definirSfx: function (ligado) { estado.sfx = !!ligado; gravar('mathlume_sfx', ligado ? '1' : '0'); avisar(); },
    definirMusica: function (ligada) { estado.musica = !!ligada; gravar('mathlume_musica', ligada ? '1' : '0'); atualizarMusica(); avisar(); },
    temMusicaPropria: temMusicaPropria,
    aplicarVolume: aplicarVolume,
    aoMudar: function (fn) { ouvintes.push(fn); }
  };
})();

//Reproduz o efeito sonoro dos cliques no site.
function somBotao() {
    let audio = document.getElementById("botoes");
    if (!audio || !MathLumeSom.estado().sfx || MathLumeSom.estado().volume <= 0) return;
    MathLumeSom.aplicarVolume();
    audio.currentTime = 0.20;
    audio.play().catch(function () {});
}
//Executa a contagem regressiva antes do início do minigame.
function contagemR() {
    stopLob();
    let audio = document.getElementById("contagem");
    MathLumeSom.aplicarVolume();
    audio.currentTime = 0.05;
    audio.play();
    setTimeout(() => {
        audio.pause()
        audio.currentTime = 0;
        temaGamer();
    }, 2500);
}
//Inicia a música de fundo do lobby em loop.
function musicaLobby(){
    let audio = document.getElementById("lobby");
    MathLumeSom.aplicarVolume();
    audio.currentTime = 0.1;
    audio.play();
    audio.loop = true;
}
//Pausa a música de fundo do lobby.
function stopLob(){
    let audio = document.getElementById("lobby");
    audio.pause();
}
//Inicia a música de fundo durante o minigame.
function temaGamer(){
    setTimeout(() => {
       let audio2 = document.getElementById("temaGame");
        audio2.currentTime = 0;
        MathLumeSom.aplicarVolume(); // volume base 0,3 x volume geral
        audio2.play();
        audio2.loop = true;
    }, 2500);
}
//Pausa a música de fundo do minigame.
function stopGame(){
    let audio = document.getElementById("temaGame");
    audio.pause();
}
