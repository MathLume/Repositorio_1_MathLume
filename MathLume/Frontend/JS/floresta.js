/* =====================================================
   MathLume — TEMA FLORESTA · camada viva (JS/floresta.js)
   Carregar no FIM do <body>, DEPOIS de sons.js.
   Só age quando o tema "floresta" está equipado.

   - Cenário: céu de entardecer, sol, montanhas, névoa e 3 planos de árvores
     (pinheiro, carvalho, bétula, cipreste, outono, macieira e ipê).
   - Animais: urso, abelhas + colmeia, cervo, coelho, esquilo, borboletas,
     coruja, pássaros, vagalumes e folhas caindo.
   - Som próprio (gerado no navegador): vento, riacho, pássaros, pica-pau,
     coruja, música do lobby e da partida, gota d'água (acerto) e fogo (erro).
   A mecânica do jogo continua no HTML: errou → uma .flo-tree pega fogo;
   acertou → chove e apaga.
   ===================================================== */
(() => {
  if (!window.MathLumeTemas || MathLumeTemas.atual().id !== "floresta") return;

  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const volume = () => {
    let v = 70;
    try { const s = localStorage.getItem("mathlume_volume"); if (s !== null) v = Number(s); } catch (e) {}
    return Math.max(0, Math.min(1, (isNaN(v) ? 70 : v) / 100));
  };
  const reduzMovimento = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =====================================================================
     ÁUDIO (Web Audio)
     ===================================================================== */
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, bus = null, eco = null, ruido = null;
  let modo = null, rodando = false, proximoT = 0, passo = 0, frase = [];
  let timerMusica = null, timerAmb = null, timerJogo = null, camas = [];

  function audio() {
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      bus = ctx.createGain();
      bus.gain.value = volume();
      bus.connect(comp);
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // "eco" de floresta: reverberação feita com ruído que vai sumindo
      eco = ctx.createConvolver();
      const n = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const ch = ir.getChannelData(c);
        for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      }
      eco.buffer = ir;
      const volEco = ctx.createGain(); volEco.gain.value = .4;
      eco.connect(volEco); volEco.connect(bus);
    }
    if (ctx.state === "suspended" && !document.hidden) ctx.resume().catch(() => {});
    return ctx;
  }
  function ajustaVolume() { if (ctx && bus) bus.gain.setTargetAtTime(volume(), ctx.currentTime, .05); }

  // liga um nó na saída (seco + um pouco de eco)
  function saida(no, molhado = .25) {
    no.connect(bus);
    if (molhado > 0) { const s = ctx.createGain(); s.gain.value = molhado; no.connect(s); s.connect(eco); }
  }

  function tom(t, dur, freq, { type = "sine", g = .1, slide = null, a = .01, vib = 0, molhado = .25, filtro = null } = {}) {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    let lfo = null;
    if (vib) {                                   // vibrato (flauta, coruja)
      lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * vib, t + dur * .5);
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .05);
    }
    env.gain.setValueAtTime(.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + a);
    env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let ultimo = env;
    o.connect(env);
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filtro; env.connect(f); ultimo = f; }
    saida(ultimo, molhado);
    o.start(t); o.stop(t + dur + .05);
  }

  function ruidoSom(t, dur, { type = "bandpass", f = 900, f2 = null, q = 1, g = .2, a = null, molhado = .15 } = {}) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + (a ?? Math.min(.03, dur * .3)));
    env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(env); saida(env, molhado);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + .05);
  }

  /* ---- sons da floresta ---- */
  const SFX = {
    piado(t) {                                   // passarinho: 3 a 5 piados rápidos
      const n = 3 + Math.floor(Math.random() * 3), f = rnd(2600, 3400);
      for (let i = 0; i < n; i++) tom(t + i * rnd(.09, .13), .08, f, { g: .028, slide: f * rnd(1.3, 1.6), a: .005, molhado: .5 });
    },
    bemtevi(t) {                                 // "bem-te-vi!"
      tom(t, .12, 1900, { g: .03, slide: 2100, molhado: .5 });
      tom(t + .16, .1, 2500, { g: .028, molhado: .5 });
      tom(t + .3, .26, 2000, { g: .032, slide: 2700, molhado: .5 });
    },
    trinado(t) {                                 // trinado agudo
      for (let i = 0; i < 14; i++) tom(t + i * .045, .04, i % 2 ? 3700 : 3300, { g: .016, a: .004, molhado: .5 });
    },
    sabia(t) {                                   // canto melodioso
      const notas = [1568, 1760, 1976, 1760, 2093];
      notas.forEach((f, i) => { if (Math.random() < .8) tom(t + i * .16, .15, f, { g: .025, slide: f * 1.04, vib: .01, molhado: .55 }); });
    },
    cuco(t) {                                    // "cu-cu" ao longe
      tom(t, .28, 740, { g: .04, a: .03, molhado: .7 });
      tom(t + .34, .4, 587, { g: .04, a: .03, molhado: .7 });
    },
    picapau(t) {                                 // toc-toc-toc na madeira
      const n = 8 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) ruidoSom(t + i * .055, .025, { f: 1500, q: 5, g: .09 * (1 - i / n * .5), a: .002, molhado: .4 });
    },
    coruja(t) {                                  // "huu... hu-huuu"
      tom(t, .45, 392, { g: .045, a: .12, vib: .006, molhado: .7, filtro: 900 });
      tom(t + .7, .2, 392, { g: .035, a: .05, molhado: .7, filtro: 900 });
      tom(t + .95, .6, 370, { g: .045, a: .1, vib: .006, molhado: .7, filtro: 900 });
    },
    folhas(t) {                                  // vento mexendo as folhas
      ruidoSom(t, rnd(1.4, 2.4), { f: 3200, q: .4, g: .03, a: .6, molhado: .2 });
    },
    abelha(t, dur = 2.2) {                       // zumbido passando
      const o = ctx.createOscillator(), env = ctx.createGain(), f = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(210, t); o.frequency.linearRampToValueAtTime(250, t + dur / 2); o.frequency.linearRampToValueAtTime(190, t + dur);
      lfo.frequency.value = 23; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.4;
      env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(.03, t + dur * .4); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(f); f.connect(env); saida(env, .2);
      o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    },
    urso(t) {                                    // rosnado grave e curto
      const o = ctx.createOscillator(), env = ctx.createGain(), f = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(92, t); o.frequency.linearRampToValueAtTime(70, t + 1.1);
      lfo.frequency.value = 17; lg.gain.value = .5;
      f.type = "lowpass"; f.frequency.value = 480;
      env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(.07, t + .25); env.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
      const trem = ctx.createGain(); trem.gain.value = .6; lfo.connect(lg); lg.connect(trem.gain);
      o.connect(f); f.connect(trem); trem.connect(env); saida(env, .3);
      o.start(t); lfo.start(t); o.stop(t + 1.3); lfo.stop(t + 1.3);
      ruidoSom(t, 1, { type: "lowpass", f: 260, g: .05, a: .2, molhado: .2 });
    },
    gota(t) {                                    // acerto: gota d'água
      tom(t, .14, 820, { g: .12, slide: 1700, a: .004, molhado: .4 });
      tom(t + .07, .1, 1400, { g: .05, slide: 2200, a: .004, molhado: .4 });
    },
    chuva(t) {                                   // chuvinha que apaga o fogo
      ruidoSom(t, 2, { type: "highpass", f: 2600, g: .028, a: .35, molhado: .2 });
      for (let i = 0; i < 6; i++) tom(t + rnd(.1, 1.6), .06, rnd(1800, 3200), { g: .02, slide: 3600, a: .003, molhado: .3 });
    },
    fogo(t, forte = false) {                     // erro/chama passou: estalos + "fuuu"
      const n = forte ? 22 : 14;
      for (let i = 0; i < n; i++) ruidoSom(t + Math.random() * .9, rnd(.008, .03), { f: rnd(1600, 3800), q: 1.2, g: rnd(.06, .16), a: .002, molhado: .1 });
      ruidoSom(t, forte ? .9 : .6, { type: "lowpass", f: 1100, f2: 260, q: .7, g: forte ? .12 : .08, a: .05, molhado: .1 });
      tom(t, .4, 170, { type: "sawtooth", g: .025, slide: 70, filtro: 700, molhado: 0 });
    },
    nivel(t) {                                   // subiu de nível: arpejo de kalimba + passarinhos
      [392, 440, 494, 587, 659, 784].forEach((f, i) => kalimba(t + i * .08, f * 2, .07));
      SFX.trinado(t + .55);
    }
  };

  /* ---- instrumentos da música ---- */
  function flauta(t, f, dur, g = .05) {
    tom(t, dur, f, { type: "sine", g, a: .07, vib: .006, molhado: .55 });
    tom(t, dur * .9, f * 2, { type: "sine", g: g * .12, a: .09, molhado: .55 });
    ruidoSom(t, Math.min(.25, dur), { f: f * 2, q: 3, g: g * .25, a: .04, molhado: .3 });   // sopro
  }
  function kalimba(t, f, g = .06) {
    tom(t, 1.3, f, { g, a: .004, molhado: .45 });
    tom(t, .25, f * 2.76, { g: g * .35, a: .002, molhado: .3 });
  }
  function pad(t, freqs, dur) {
    freqs.forEach(f => tom(t, dur, f, { type: "triangle", g: .018, a: Math.min(1.2, dur * .4), filtro: 900, molhado: .6 }));
  }
  function tambor(t, g = .32) {                 // tambor de mão (grave)
    tom(t, .32, 150, { g, slide: 55, a: .004, molhado: .15 });
    ruidoSom(t, .06, { type: "lowpass", f: 400, g: g * .4, a: .002, molhado: .1 });
  }
  function chocalho(t, g = .035) { ruidoSom(t, .07, { type: "highpass", f: 5200, g, a: .01, molhado: .05 }); }
  function bloco(t, f = 780) { tom(t, .07, f, { type: "triangle", g: .05, a: .002, molhado: .2 }); }
  function baixo(t, f, dur) { tom(t, dur, f, { type: "triangle", g: .09, a: .02, filtro: 600, molhado: .1 }); }

  // Sol maior pentatônico — soa bem sobre todos os acordes abaixo
  const ESCALA = [196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33, 659.25, 783.99];
  const ACORDES = [
    { pad: [196, 246.94, 293.66], baixo: 98 },      // Sol
    { pad: [164.81, 196, 246.94], baixo: 82.41 },   // Mi menor
    { pad: [130.81, 164.81, 196], baixo: 65.41 },   // Dó
    { pad: [146.83, 185, 220], baixo: 73.42 }       // Ré
  ];
  const CFG = { lobby: { bpm: 74 }, jogo: { bpm: 104 } };

  // cria uma frase de 2 compassos (16 colcheias) — repetida com variação, soa como música e não como notas soltas
  function novaFrase(denso) {
    const f = new Array(16).fill(null);
    let i = 4 + Math.floor(Math.random() * 3);
    for (let s = 0; s < 16;) {
      const toca = s % 8 === 0 || Math.random() < (denso ? .55 : .4);
      if (toca) {
        i = Math.max(2, Math.min(ESCALA.length - 1, i + pick([-2, -1, -1, 1, 1, 2, 0])));
        const dur = pick(denso ? [1, 1, 2] : [2, 2, 3, 4]);
        f[s] = { i, dur };
        s += dur;
      } else s++;
    }
    return f;
  }

  function agendaMusica() {
    const c = CFG[modo];
    if (!c) return;
    const col = 60 / c.bpm / 2, jogo = modo === "jogo";
    if (proximoT < ctx.currentTime) proximoT = ctx.currentTime + .05;
    while (proximoT < ctx.currentTime + .3) {
      const t = proximoT, compasso = Math.floor(passo / 8), s = passo % 8, ac = ACORDES[compasso % 4];
      if (compasso % 4 === 0 && s === 0) frase = novaFrase(jogo);
      if (s === 0) pad(t, ac.pad, col * 8.2);
      if (s === 0 || (jogo && (s === 3 || s === 4))) baixo(t, ac.baixo * (s === 3 ? 1.5 : 1), col * (s === 0 ? 3 : 1.6));

      const nota = frase[(compasso % 2) * 8 + s];
      const variar = compasso % 4 >= 2 && Math.random() < .25;
      if (nota && !(compasso % 4 === 3 && s >= 6)) {
        const f = ESCALA[Math.max(0, Math.min(ESCALA.length - 1, nota.i + (variar ? pick([-1, 1]) : 0)))];
        if (jogo) kalimba(t, f * 2, .055); else flauta(t, f * 2, col * nota.dur * 1.05, .045);
      }
      if (!jogo && Math.random() < .22) kalimba(t, pick(ac.pad) * 4, .022);   // brilhos de fundo
      if (jogo) {
        if (s === 0 || s === 4) tambor(t);
        if (s === 6 && Math.random() < .6) tambor(t, .18);
        if (s % 2 === 1) chocalho(t);
        if ((s === 2 || s === 7) && Math.random() < .6) bloco(t, s === 2 ? 780 : 980);
        if (compasso % 4 === 3 && s === 0) flauta(t, ESCALA[7] * 2, col * 3, .03);
      }
      proximoT += col;
      passo++;
    }
  }

  function loopMusica() {
    if (!rodando) return;
    ajustaVolume();
    agendaMusica();
    timerMusica = setTimeout(loopMusica, 80);
  }

  /* ---- ambiente contínuo: vento + riacho ---- */
  function criaCama(tipo) {
    const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true;
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    if (tipo === "vento") { f.type = "lowpass"; f.frequency.value = 420; g.gain.value = .02; lfo.frequency.value = .07; lg.gain.value = .014; }
    else { f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = .6; g.gain.value = .007; lfo.frequency.value = .9; lg.gain.value = .003; }
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); saida(g, .3);
    s.start(); lfo.start();
    return { parar() { try { s.stop(); lfo.stop(); } catch (e) {} } };
  }

  function ambiente() {
    if (!rodando) return;
    const t = ctx.currentTime, r = Math.random(), lobby = modo !== "jogo";
    if (r < .26) SFX.piado(t);
    else if (r < .42) SFX.bemtevi(t);
    else if (r < .55) SFX.sabia(t);
    else if (r < .65) SFX.trinado(t);
    else if (r < .74) SFX.picapau(t);
    else if (r < .84) SFX.folhas(t);
    else if (r < .92) (lobby ? SFX.cuco : SFX.piado)(t);
    else (lobby ? SFX.coruja : SFX.bemtevi)(t);
    timerAmb = setTimeout(ambiente, lobby ? rnd(2200, 5500) : rnd(3500, 7000));
  }

  function parar() {
    rodando = false;
    clearTimeout(timerMusica); clearTimeout(timerAmb); clearTimeout(timerJogo);
    camas.forEach(c => c.parar()); camas = [];
  }

  // novo: "lobby" (música calma), "jogo" (com tambores), "pausa" (só a natureza)
  function tocar(novo) {
    if (!audio()) return;
    if (rodando && modo === novo) return;
    parar();
    modo = novo; rodando = true;
    proximoT = ctx.currentTime + .15; passo = 0;
    camas = [criaCama("vento"), criaCama("riacho")];
    if (CFG[modo]) loopMusica();
    timerAmb = setTimeout(ambiente, 1200);
    ["lobby", "temaGame"].forEach(id => { const el = $(id); if (el) el.pause(); });
  }

  // o navegador só libera o som depois de um toque/clique
  const destravar = () => { if (ctx && ctx.state !== "running" && !document.hidden) ctx.resume().catch(() => {}); };
  window.addEventListener("pointerdown", destravar);
  window.addEventListener("keydown", destravar);
  // aba escondida = silêncio
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  });
  window.addEventListener("storage", e => { if (e.key === "mathlume_volume") ajustaVolume(); });
  if (window.MathLumeSom && MathLumeSom.aoMudar) MathLumeSom.aoMudar(ajustaVolume);

  // som pontual só se o áudio da floresta já estiver ligado e liberado
  // (evita fila de sons ao destravar e silêncio em telas sem música, como a de dificuldade)
  function som(fn) { if (!ctx || ctx.state !== "running") return; ajustaVolume(); fn(ctx.currentTime); }

  /* =====================================================================
     CENÁRIO
     ===================================================================== */
  const TIPOS = {
    //            largura(vh)  altura(vh)   tronco(vh)
    pinheiro:  { w: [10, 13], h: [27, 36], t: [4.5, 6] },
    cipreste:  { w: [6, 7.5], h: [28, 36], t: [3.5, 4.5] },
    carvalho:  { w: [16, 19], h: [26, 32], t: [9, 11] },
    betula:    { w: [10, 12], h: [28, 34], t: [12, 14] },
    outono:    { w: [14, 17], h: [24, 30], t: [8, 10] },
    macieira:  { w: [13, 15], h: [20, 25], t: [7, 8.5] },
    ipe:       { w: [14, 17], h: [26, 32], t: [10, 12] },
    "ipe-rosa":{ w: [14, 16], h: [24, 30], t: [9, 11] }
  };
  const REDONDAS = ["carvalho", "betula", "outono", "macieira", "ipe", "ipe-rosa"];
  const FOGO = '<div class="fire"><i class="fglow"></i><i class="fl a"></i><i class="fl b"></i><i class="fl c"></i><i class="em"></i><i class="em"></i><i class="em"></i><i class="em"></i></div>';

  function arvore(tipo, x, escala, queima) {
    const cfg = TIPOS[tipo], el = document.createElement("div");
    const w = rnd(cfg.w[0], cfg.w[1]) * escala, h = rnd(cfg.h[0], cfg.h[1]) * escala, t = rnd(cfg.t[0], cfg.t[1]) * escala;
    el.className = (queima ? "flo-tree " : "fl-arv ") + "t-" + tipo;
    el.style.cssText = `--x:${x.toFixed(1)}%;--w:${w.toFixed(1)}vh;--h:${h.toFixed(1)}vh;--t:${t.toFixed(1)}vh;--bal:${rnd(5, 9).toFixed(1)}s;--bd:${(-rnd(0, 8)).toFixed(1)}s`;
    let html = '<i class="trunk"></i>';
    if (tipo === "pinheiro") html += '<i class="c1"></i><i class="c2"></i><i class="c3"></i>';
    else if (tipo === "cipreste") html += '<i class="elip"></i>';
    else {
      if (tipo === "carvalho" || tipo === "outono") html += '<i class="galho g1"></i><i class="galho g2"></i>';
      let frutas = "";
      if (tipo === "macieira") for (let i = 0; i < 7; i++) frutas += `<u class="fruta" style="--fx:${rnd(14, 82).toFixed(0)}%;--fy:${rnd(15, 62).toFixed(0)}%"></u>`;
      html += `<span class="copa"><b></b><b></b><b></b><b></b><b></b><b></b>${frutas}</span>`;
    }
    if (queima) html += FOGO;
    el.innerHTML = html;
    return el;
  }

  // posições espalhadas, evitando o meio (onde fica o painel de resposta) nas telas largas
  function posicoes(n, evitaMeio) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      let x = (i + .5) / n * 100 + rnd(-3, 3);
      if (evitaMeio && x > 38 && x < 62) x = x < 50 ? 36 - rnd(0, 3) : 64 + rnd(0, 3);
      xs.push(Math.max(2, Math.min(98, x)));
    }
    return xs;
  }

  function embaralha(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const SVG_PASSARO = '<svg viewBox="0 0 22 11"><path d="M0 5 C3 1 5.5 1 7 4 C8.5 1 11 1 14 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 5 C15.5 2 17.5 2 22 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';

  // urso desenhado de lado (olhando para a direita)
  const SVG_URSO = `<svg viewBox="0 0 150 96" aria-hidden="true">
    <g class="pata pl"><rect x="30" y="54" width="15" height="34" rx="7" fill="#3b2110"/></g>
    <g class="pata pr"><rect x="92" y="54" width="15" height="34" rx="7" fill="#3b2110"/></g>
    <circle cx="18" cy="44" r="6" fill="#4e2c14"/>
    <ellipse cx="64" cy="50" rx="48" ry="29" fill="#5b3418"/>
    <ellipse cx="82" cy="31" rx="20" ry="14" fill="#5b3418"/>
    <ellipse cx="58" cy="38" rx="34" ry="12" fill="#7a4a24" opacity=".55"/>
    <path d="M30 60 q34 14 70 0" stroke="#3b2110" stroke-width="3" fill="none" opacity=".35"/>
    <g class="pata pl2"><rect x="24" y="57" width="17" height="34" rx="8" fill="#4e2c14"/><rect x="22" y="85" width="21" height="7" rx="3.5" fill="#2b170a"/></g>
    <g class="pata pr2"><rect x="88" y="57" width="17" height="34" rx="8" fill="#4e2c14"/><rect x="86" y="85" width="21" height="7" rx="3.5" fill="#2b170a"/></g>
    <g class="cabeca">
      <circle cx="116" cy="38" r="19" fill="#5b3418"/>
      <circle cx="107" cy="21" r="7" fill="#5b3418"/><circle cx="107" cy="21" r="3.5" fill="#2b170a"/>
      <ellipse cx="132" cy="44" rx="12" ry="8.5" fill="#b07a45"/>
      <ellipse cx="141" cy="41" rx="4" ry="3.2" fill="#140a04"/>
      <circle cx="120" cy="32" r="2.8" fill="#140a04"/><circle cx="121" cy="31" r=".9" fill="#fff"/>
      <path d="M131 50 q5 3 10 -1" stroke="#140a04" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;

  function montaFloresta() {
    const host = document.querySelector("#game .flo-bg") || document.querySelector(".flo-bg");
    if (!host || host.dataset.viva) return;
    host.dataset.viva = "1";
    const larg = innerWidth, estreita = larg < 700;

    const c = document.createElement("div");
    c.className = "fl-cena";

    /* céu: estrelas, nuvens, sol com raios */
    let ceu = '<div class="fl-estrelas"></div><div class="fl-sol"><i class="fl-raios"></i></div>';
    for (let i = 0; i < 4; i++) ceu += `<i class="fl-nuvem" style="--y:${rnd(4, 26).toFixed(1)}vh;--s:${rnd(.7, 1.4).toFixed(2)};--t:${rnd(110, 180).toFixed(0)}s;--d:${(-rnd(0, 180)).toFixed(0)}s"></i>`;
    c.insertAdjacentHTML("beforeend", ceu);

    /* montanhas e linha de árvores ao longe (SVG gerado) */
    const cume = (pontos, base, amp, seg) => {
      let d = `M0 ${base}`;
      for (let i = 0; i <= seg; i++) d += ` L${(i / seg * 1000).toFixed(0)} ${(base - rnd(amp * .35, amp)).toFixed(0)}`;
      return d + ` L1000 ${pontos} L0 ${pontos} Z`;
    };
    let longe = "";
    for (let x = -10; x < 1010; x += rnd(9, 16)) {
      const h = rnd(40, 95), w = rnd(14, 24);
      longe += Math.random() < .7
        ? `<path d="M${x.toFixed(0)} 200 L${(x + w / 2).toFixed(0)} ${(200 - h).toFixed(0)} L${(x + w).toFixed(0)} 200Z"/>`
        : `<ellipse cx="${(x + w / 2).toFixed(0)}" cy="${(200 - h * .55).toFixed(0)}" rx="${(w * .7).toFixed(0)}" ry="${(h * .5).toFixed(0)}"/><rect x="${(x + w / 2 - 1.5).toFixed(0)}" y="${(200 - h * .3).toFixed(0)}" width="3" height="${(h * .3).toFixed(0)}"/>`;
    }
    c.insertAdjacentHTML("beforeend",
      `<svg class="fl-montanhas" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
         <path class="m1" d="${cume(300, 170, 150, 9)}"/>
         <path class="m2" d="${cume(300, 230, 120, 14)}"/>
       </svg>
       <div class="fl-nevoa n1"></div>
       <svg class="fl-longe" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">${longe}</svg>
       <div class="fl-nevoa n2"></div>`);

    /* pássaros no céu */
    const aves = document.createElement("div");
    aves.className = "fl-aves";
    for (let i = 0; i < 7; i++) {
      aves.insertAdjacentHTML("beforeend",
        `<div class="flo-bird${i % 2 ? " l" : ""}" style="--y:${rnd(4, 30).toFixed(0)}%;--dur:${rnd(18, 30).toFixed(0)}s;--del:${(-rnd(0, 30)).toFixed(0)}s;--sz:${rnd(14, 24).toFixed(0)}px">${SVG_PASSARO}</div>`);
    }
    c.appendChild(aves);

    /* plano do meio: árvores menores e mais apagadas */
    const meio = document.createElement("div");
    meio.className = "fl-meio";
    const nMeio = Math.max(6, Math.min(16, Math.round(larg / 95)));
    posicoes(nMeio, false).forEach(x => meio.appendChild(arvore(pick(["pinheiro", "pinheiro", "cipreste", "carvalho", "betula", "outono", "ipe"]), x + rnd(-3, 3), .62, false)));
    // coruja num galho
    const coruja = meio.children[Math.floor(meio.children.length * .3)];
    if (coruja) coruja.insertAdjacentHTML("beforeend", '<span class="fl-coruja" aria-hidden="true">🦉</span>');
    c.appendChild(meio);

    /* trilha dos animais do meio (cervo) */
    c.insertAdjacentHTML("beforeend", '<div class="fl-trilha-meio"></div>');

    /* chão com textura, grama, pedras, tronco caído */
    const chao = document.createElement("div");
    chao.className = "fl-chao";
    chao.innerHTML = '<i class="fl-grama"></i><i class="fl-tronco-caido" style="--x:' + (estreita ? 4 : 17) + '%"><b></b></i>';
    for (let i = 0; i < (estreita ? 3 : 6); i++) chao.insertAdjacentHTML("beforeend", `<i class="fl-pedra" style="--x:${rnd(2, 96).toFixed(0)}%;--s:${rnd(.7, 1.4).toFixed(2)}"></i>`);
    c.appendChild(chao);

    /* plano da frente: árvores que pegam fogo (.flo-tree) */
    const frente = document.createElement("div");
    frente.className = "flo-forest";
    const nFrente = Math.max(5, Math.min(10, Math.round(larg / 135)));
    const tipos = embaralha(["carvalho", "pinheiro", "betula", "outono", "ipe", "macieira", "cipreste", "pinheiro", "ipe-rosa", "carvalho"].slice(0, nFrente));
    if (!tipos.includes("carvalho")) tipos[0] = "carvalho";
    posicoes(nFrente, !estreita).forEach((x, i) => frente.appendChild(arvore(tipos[i], x, estreita ? .85 : 1, true)));
    // 2 árvores altas atrás do painel, para a copa aparecer acima dele
    if (!estreita) [44, 57].forEach(x => frente.prepend(arvore(pick(["pinheiro", "cipreste"]), x, 1.15, true)));

    // colmeia pendurada no carvalho + abelhas
    const carv = frente.querySelector(".t-carvalho");
    if (carv) {
      let colmeia = '<span class="fl-colmeia" aria-hidden="true"><i></i></span>';
      for (let i = 0; i < 4; i++) colmeia += `<span class="fl-abelha z${i % 2}" style="--t:${rnd(3.5, 6).toFixed(1)}s;--d:${(-rnd(0, 6)).toFixed(1)}s" aria-hidden="true"><b>🐝</b></span>`;
      carv.insertAdjacentHTML("beforeend", colmeia);
    }
    c.appendChild(frente);

    /* frente do chão: arbustos, flores, cogumelos */
    const flores = document.createElement("div");
    flores.className = "fl-flores";
    const FLORES = ["🌼", "🌸", "🌷", "🌺", "🌼", "🍄", "🌿", "🌻"];
    const nFl = estreita ? 9 : 18;
    for (let i = 0; i < nFl; i++) {
      flores.insertAdjacentHTML("beforeend",
        `<span class="fl-flor" style="--x:${(i / nFl * 100 + rnd(0, 100 / nFl)).toFixed(1)}%;--s:${rnd(1.8, 2.8).toFixed(1)}vh;--r:${rnd(-8, 8).toFixed(0)}deg;--bd:${(-rnd(0, 4)).toFixed(1)}s">${pick(FLORES)}</span>`);
    }
    for (let i = 0; i < (estreita ? 3 : 6); i++) {
      flores.insertAdjacentHTML("beforeend", `<span class="fl-arbusto${Math.random() < .5 ? " frutas" : ""}" style="--x:${rnd(0, 97).toFixed(0)}%;--s:${rnd(.8, 1.3).toFixed(2)}"><b></b><b></b><b></b></span>`);
    }
    // abelhas visitando as flores
    for (let i = 0; i < 2; i++) flores.insertAdjacentHTML("beforeend", `<span class="fl-abelha-flor" style="--t:${rnd(14, 22).toFixed(0)}s;--d:${(-rnd(0, 20)).toFixed(0)}s;--y:${rnd(4, 9).toFixed(1)}vh"><b>🐝</b></span>`);
    c.appendChild(flores);

    /* borboletas, vagalumes e folhas caindo */
    const ar = document.createElement("div");
    ar.className = "fl-ar";
    const HUES = [0, 40, 160, 260, 300];
    for (let i = 0; i < 3; i++) ar.insertAdjacentHTML("beforeend", `<span class="fl-borboleta" style="--y:${rnd(48, 74).toFixed(0)}vh;--t:${rnd(22, 34).toFixed(0)}s;--d:${(-rnd(0, 30)).toFixed(0)}s;--hue:${pick(HUES)}deg"><b>🦋</b></span>`);
    for (let i = 0; i < 16; i++) ar.insertAdjacentHTML("beforeend", `<i class="fl-vagalume" style="--x:${rnd(0, 100).toFixed(0)}%;--y:${rnd(30, 88).toFixed(0)}%;--t:${rnd(3, 6).toFixed(1)}s;--d:${(-rnd(0, 6)).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px;--dy:${rnd(-30, 30).toFixed(0)}px"></i>`);
    const CORES_FOLHA = ["#f59e0b", "#ea580c", "#dc2626", "#facc15", "#84cc16", "#b45309"];
    for (let i = 0; i < 12; i++) ar.insertAdjacentHTML("beforeend", `<i class="fl-folha" style="--x:${rnd(0, 100).toFixed(0)}%;--t:${rnd(10, 18).toFixed(1)}s;--d:${(-rnd(0, 18)).toFixed(1)}s;--c:${pick(CORES_FOLHA)};--sw:${rnd(20, 60).toFixed(0)}px"><b></b></i>`);
    c.appendChild(ar);

    /* camada de animais que passam de vez em quando */
    const bichos = document.createElement("div");
    bichos.className = "fl-bichos";
    c.appendChild(bichos);

    c.insertAdjacentHTML("beforeend", '<div class="fl-textura"></div><div class="fl-vinheta"></div>');

    host.innerHTML = "";
    host.appendChild(c);
    // o urso caminha entre o plano do meio e as árvores da frente
    frente.before(bichos);
  }

  /* ---- animais que atravessam a tela ---- */
  function atravessa(classe, html, duracao, dir, extra = "") {
    const box = document.querySelector(".fl-bichos");
    if (!box || reduzMovimento) return null;
    const el = document.createElement("div");
    el.className = `fl-passa ${classe} ${dir < 0 ? "esq" : "dir"}`;
    el.style.cssText = `--t:${duracao}s;${extra}`;
    el.innerHTML = html;
    el.addEventListener("animationend", ev => { if (ev.target === el) el.remove(); });
    box.appendChild(el);
    return el;
  }
  function passaUrso() {
    atravessa("fl-urso", `<div class="corpo">${SVG_URSO}</div>`, rnd(26, 34).toFixed(1), Math.random() < .5 ? 1 : -1);
    setTimeout(() => som(SFX.urso), rnd(3000, 7000));
  }
  const passaCervo = () => atravessa("fl-cervo", "<b>🦌</b>", rnd(9, 13).toFixed(1), Math.random() < .5 ? 1 : -1);
  const passaCoelho = () => atravessa("fl-coelho", "<b>🐇</b>", rnd(12, 17).toFixed(1), Math.random() < .5 ? 1 : -1);
  const passaEsquilo = () => atravessa("fl-esquilo", "<b>🐿️</b>", rnd(8, 11).toFixed(1), Math.random() < .5 ? 1 : -1);
  function revoada() {                         // bando de pássaros (ao subir de nível)
    for (let i = 0; i < 6; i++) atravessa("fl-revoada", SVG_PASSARO, (rnd(5, 8)).toFixed(1), 1, `--y:${rnd(10, 40).toFixed(0)}vh;animation-delay:${(i * .15).toFixed(2)}s`);
  }

  function agendaBichos() {
    const ciclo = (fn, primeiro, min, max) => {
      const vez = () => { if (!document.hidden) fn(); setTimeout(vez, rnd(min, max)); };
      setTimeout(vez, primeiro);
    };
    ciclo(passaUrso, 5000, 38000, 55000);
    ciclo(passaCervo, 14000, 24000, 38000);
    ciclo(passaCoelho, 9000, 16000, 26000);
    ciclo(passaEsquilo, 20000, 20000, 32000);
    ciclo(() => som(t => SFX.abelha(t)), 8000, 18000, 30000);
  }

  /* =====================================================================
     API usada pelo HTML (minigamemat.html)
     ===================================================================== */
  window.musicaLobby = () => tocar("lobby");
  window.temaGamer = () => {};                  // a música da partida vem de FlorestaFX.partida()
  window.stopLob = () => {};

  window.FlorestaFX = {
    partida() {                                 // durante a contagem só a natureza; depois entra a música
      tocar("pausa");
      clearTimeout(timerJogo);
      timerJogo = setTimeout(() => { if (modo === "pausa") tocar("jogo"); }, 2900);
    },
    fim()     { clearTimeout(timerJogo); tocar("pausa"); },
    menu()    { tocar("lobby"); },
    acerto()  { som(t => { SFX.gota(t); SFX.chuva(t + .1); }); },
    erro()    { som(t => SFX.fogo(t)); },
    impacto() { som(t => SFX.fogo(t, true)); },
    nivel()   { som(SFX.nivel); revoada(); if (Math.random() < .6) passaCervo(); }
  };

  montaFloresta();
  agendaBichos();
})();
