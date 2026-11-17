/* =====================================================
   MathLume — TEMA CIDADE · camada viva (JS/cidade.js)
   Carregar no FIM do <body>, DEPOIS de sons.js.
   Só age quando o tema "cidade" está equipado.
   ===================================================== */
(() => {
  if (!window.MathLumeTemas || MathLumeTemas.atual().id !== "cidade") return;

  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const volume = () => Math.max(0, Math.min(1, Number(localStorage.getItem("mathlume_volume") ?? 70) / 100));

  /* ================= ÁUDIO (sintetizado com Web Audio) ================= */
  let ctx = null, bus = null, ruido = null, cama = null;
  let rodando = false, modo = "lobby", proximoT = 0, passo = 0, timerMusica = null, timerAmb = null;

  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bus = ctx.createGain();
      bus.connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    bus.gain.setTargetAtTime(volume(), ctx.currentTime, .05);
    return ctx;
  }

  function ruidoSom(t, dur, { type = "bandpass", f = 900, f2 = null, q = 1, g = .3 } = {}) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + Math.min(.03, dur * .3));
    env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(env); env.connect(bus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + .05);
  }

  function tom(t, dur, freq, { type = "sine", g = .15, slide = null, a = .01 } = {}) {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    env.gain.setValueAtTime(.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + a);
    env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(env); env.connect(bus);
    o.start(t); o.stop(t + dur + .05);
  }

  const SFX = {
    buzina(t) {
      tom(t, .45, 392, { type: "square", g: .05 });
      tom(t, .45, 494, { type: "square", g: .05 });
      ruidoSom(t, .45, { f: 1800, q: 2, g: .03 });
    },
    carro(t, dur = 1.6) {                              // passagem com efeito doppler
      ruidoSom(t, dur, { f: 2400, f2: 350, q: 1.2, g: .22 });
      tom(t, dur, 70, { type: "sawtooth", g: .02, slide: 55 });
    },
    heli(t, dur = 3.5) {                               // pás do helicóptero: ruído pulsado
      const s = ctx.createBufferSource();
      s.buffer = ruido; s.loop = true;
      const fl = ctx.createBiquadFilter();
      fl.type = "lowpass"; fl.frequency.value = 600;
      const env = ctx.createGain();
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 9; lg.gain.value = .1;
      lfo.connect(lg); lg.connect(env.gain);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(.14, t + .5);
      env.gain.setValueAtTime(.14, t + dur - .6);
      env.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(fl); fl.connect(env); env.connect(bus);
      s.start(t); lfo.start(t);
      s.stop(t + dur + .1); lfo.stop(t + dur + .1);
    },
    sirene(t, dur = 2.4) {
      const o = ctx.createOscillator(), env = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(620, t);
      for (let k = 0; k < dur / 1.2; k++) {
        o.frequency.linearRampToValueAtTime(980, t + k * 1.2 + .6);
        o.frequency.linearRampToValueAtTime(620, t + k * 1.2 + 1.2);
      }
      env.gain.setValueAtTime(.07, t);
      env.gain.setValueAtTime(.07, t + dur - .2);
      env.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(env); env.connect(bus);
      o.start(t); o.stop(t + dur + .1);
    },
    respingo(t) {                                      // slime atingindo a cidade
      tom(t, .3, 220, { g: .25, slide: 60 });
      ruidoSom(t, .18, { f: 1400, q: .8, g: .18 });
    },
    bip(t) {                                           // acerto
      tom(t, .14, 1320, { type: "square", g: .05 });
      tom(t + .08, .18, 1760, { type: "square", g: .05 });
    },
    erro(t) {
      tom(t, .3, 300, { type: "sawtooth", g: .06, slide: 120 });
    },
    // ---- sons de cidade em estilo desenho animado ----
    carroDesenho(t) {                       // "vrum" que sobe + "boing" + bipe curto
      tom(t, 1.2, 180, { type: "sine", g: .07, slide: 420, a: .05 });
      tom(t + .05, .35, 700, { type: "triangle", g: .045, slide: 1100 });
      tom(t + 1.3, .12, 660, { type: "square", g: .035 });
      tom(t + 1.45, .12, 660, { type: "square", g: .035 });
    },
    buzinaDesenho(t) {                      // "bip-bip" alegre
      [0, .18, .36].forEach(d => tom(t + d, .12, 740, { type: "square", g: .035, slide: 880 }));
    },
    pessoas(t, n = 6) {                     // falatório de personagem de desenho
      for (let i = 0; i < n; i++) {
        const f = rnd(260, 620), st = t + i * rnd(.12, .18);
        tom(st, .11, f, { type: "triangle", g: .05, slide: f * rnd(.7, 1.4), a: .01 });
      }
    },
    risada(t) {                             // "hi-hi" de desenho
      tom(t, .12, 900, { type: "triangle", g: .05, slide: 1300 });
      tom(t + .14, .12, 900, { type: "triangle", g: .05, slide: 1300 });
    },
    passos(t) {                             // tap-tap de sapato
      tom(t, .05, 1600, { type: "square", g: .015, a: .002 });
      tom(t + .3, .05, 1400, { type: "square", g: .015, a: .002 });
    }
  };

  /* ---- Música: lobby (calmo) e jogo (com bateria) ---- */
  const ACORDES = [[110, 165, 220], [98, 147, 196], [87, 131, 175], [98, 147, 196]];
  const CFG = { lobby: { bpm: 80, bateria: false }, jogo: { bpm: 98, bateria: true } };

  function agendaMusica() {
    const c = CFG[modo], colcheia = 60 / c.bpm / 2;
    if (proximoT < ctx.currentTime) proximoT = ctx.currentTime;
    while (proximoT < ctx.currentTime + .25) {
      const acorde = ACORDES[Math.floor(passo / 8) % 4], i = passo % 8;
      if (i % 4 === 0) tom(proximoT, colcheia * 3.6, acorde[0] / 2, { type: "triangle", g: .12, a: .03 });
      tom(proximoT, colcheia * .9, acorde[i % 3] * 2, { type: "sine", g: .012, a: .03 });
      if (c.bateria) {
        if (i % 4 === 0) tom(proximoT, .18, 150, { g: .25, slide: 50 });               // bumbo
        if (i % 4 === 2) ruidoSom(proximoT, .12, { f: 1800, q: .6, g: .06 });        // caixa
      }
      if (i % 2 === 1) ruidoSom(proximoT, .04, { type: "highpass", f: 7000, g: .02 }); // chimbal
      proximoT += colcheia;
      passo++;
    }
  }

  function loopMusica() {
    if (!rodando) return;
    agendaMusica();
    timerMusica = setTimeout(loopMusica, 60);
  }

  /* ---- Zumbido de cidade contínuo + buzinas/carros/helicópteros aleatórios ---- */
  function criaCama() {
    const s = ctx.createBufferSource();
    s.buffer = ruido; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 320;
    const g = ctx.createGain(); g.gain.value = .022;
    s.connect(f); f.connect(g); g.connect(bus);
    s.start();
    return s;
  }

  function ambiente() {
    if (!rodando) return;
    const r = Math.random(), t = ctx.currentTime;
    if (r < .25) SFX.buzinaDesenho(t);
    else if (r < .5) SFX.carroDesenho(t);
    else if (r < .65) SFX.pessoas(t, 5 + Math.floor(Math.random() * 4));
    else if (r < .78) { SFX.risada(t); SFX.pessoas(t + .3, 4); }
    else if (r < .9) SFX.passos(t);
    else SFX.heli(t, 4);
    timerAmb = setTimeout(ambiente, modo === "jogo" ? rnd(4000, 7000) : rnd(5000, 10000));
  }

  function parar() {
    rodando = false;
    clearTimeout(timerMusica);
    clearTimeout(timerAmb);
    if (cama) { try { cama.stop(); } catch (e) {} cama = null; }
  }

  function tocar(novo) {
    audio();
    parar();
    modo = novo; rodando = true;
    proximoT = ctx.currentTime + .1; passo = 0;
    cama = criaCama();
    loopMusica();
    timerAmb = setTimeout(ambiente, 1500);
    ["lobby", "temaGame"].forEach(id => { const el = $(id); if (el) el.pause(); });
  }

  // Ao toque/clique, destrava o áudio se o navegador tiver suspendido
  window.addEventListener("pointerdown", () => { if (ctx && ctx.state !== "running") ctx.resume(); });

  /* ================= CENÁRIO VIVO ================= */
  const CORES_JANELA = ["#fde68a", "#fef3c7", "#67e8f9", "#fbbf24", "#f0abfc"];
  const CARROS = ["🚗", "🚕", "🚙", "🚌", "🚓", "🚑", "🚚", "🏎️", "🛻", "🚐"];
  const LOJAS = [
    { nome: "PIZZARIA",    ic: "🍕", cor: "#ef4444", gira: true },
    { nome: "RESTAURANTE", ic: "🍝", cor: "#f59e0b" },
    { nome: "HAMBÚRGUER",  ic: "🍔", cor: "#f97316" },
    { nome: "CAFÉ",        ic: "☕", cor: "#a16207" },
    { nome: "FARMÁCIA",    ic: "✚",  cor: "#ff2a2a", neon: true },
    { nome: "PADARIA",     ic: "🥖", cor: "#eab308" },
    { nome: "SORVETES",    ic: "🍦", cor: "#ec4899" },
    { nome: "SUSHI",       ic: "🍣", cor: "#14b8a6" },
    { nome: "LANCHONETE",  ic: "🌭", cor: "#84cc16" }
  ];
  // 3 planos de profundidade: longe (pequeno e apagado), médio e perto (alto, com lojas)
  const CAMADAS = {
    far:  { classe: "cv-far",  alt: [18, 34], larg: [22, 44], base: 24, cores: ["#1d2a5c", "#16214a"] },
    mid:  { classe: "cv-mid",  alt: [26, 48], larg: [34, 62], base: 15, cores: ["#1b2656", "#131c44"] },
    near: { classe: "cv-near", alt: [30, 52], larg: [56, 96], base: 8,  cores: ["#262b56", "#1d2245", "#2c2046"], lojas: true }
  };

  function fachada() {
    const l = pick(LOJAS), f = document.createElement("div");
    f.className = "cv-fachada";
    f.innerHTML =
      `<div class="cv-placa${l.neon ? " neon" : ""}" style="--cor:${l.cor}">` +
        `<span class="${l.gira ? "gira" : "bob"}">${l.ic}</span> ${l.nome}</div>` +
      `<div class="cv-toldo" style="--cor:${l.cor}"></div>` +
      `<div class="cv-vitrine"></div>`;
    return f;
  }

  function camada(nome) {
    const cfg = CAMADAS[nome], box = document.createElement("div");
    box.className = "cv-camada " + cfg.classe;
    box.style.bottom = cfg.base + "vh";
    for (let soma = 0; soma < innerWidth + 200;) {
      const w = Math.round(rnd(cfg.larg[0], cfg.larg[1]));
      const el = document.createElement("div");
      el.className = "cv-pred " + pick(["vidro", "tijolo", "concreto", "concreto"]) +
        (Math.random() < .3 ? " apagado" : "") + (Math.random() < .3 ? " pisca" : "");
      el.style.width = w + "px";
      el.style.height = rnd(cfg.alt[0], cfg.alt[1]).toFixed(1) + "vh";
      el.style.setProperty("--c1", pick(cfg.cores));
      el.style.setProperty("--wc", pick(CORES_JANELA));
      el.style.setProperty("--janela-dly", (-Math.random() * 3).toFixed(2) + "s");
      if (Math.random() < .35) el.insertAdjacentHTML("beforeend", '<i class="cv-antena"></i>');
      if (Math.random() < .3) el.insertAdjacentHTML("beforeend", '<i class="cv-caixa-dagua"></i>');
      if (cfg.lojas) el.appendChild(fachada());
      box.appendChild(el);
      soma += w + 2;
    }
    return box;
  }

  function montaCidade() {
    const host = $("cidBg");
    if (!host || host.querySelector(".cv-cidade")) return;

    const c = document.createElement("div");
    c.className = "cv-cidade";
    c.innerHTML = '<div class="cv-ceu"></div><div class="cv-lua"></div><div class="cv-estrelas"></div>';
    c.appendChild(camada("far"));
    c.appendChild(camada("mid"));
    c.appendChild(camada("near"));

    // Rua com carros nos dois sentidos
    const rua = document.createElement("div");
    rua.className = "cv-rua";
    rua.innerHTML = '<i class="cv-faixa"></i>';
    for (let f = 0; f < 2; f++) for (let i = 0; i < 4; i++) {
      const car = document.createElement("div");
      car.className = "cv-carro" + (f ? " esq" : "");
      car.style.setProperty("--faixa", f ? "58%" : "14%");
      car.style.setProperty("--t", rnd(9, 16).toFixed(1) + "s");
      car.style.setProperty("--d", (-rnd(0, 16)).toFixed(1) + "s");
      car.innerHTML = `<span>${pick(CARROS)}</span>`;
      rua.appendChild(car);
    }
    c.appendChild(rua);

    // Pedestres na calçada
    for (let i = 0; i < 4; i++) {
      const p = document.createElement("div");
      p.className = "cv-pedestre" + (i % 2 ? " esq" : "");
      p.style.setProperty("--t", rnd(24, 40).toFixed(1) + "s");
      p.style.setProperty("--d", (-rnd(0, 30)).toFixed(1) + "s");
      p.innerHTML = `<span>${pick(["🚶", "🚶‍♀️", "🏃"])}</span>`;
      c.appendChild(p);
    }

    // Céu: aviões, helicóptero e pássaros
    const ar = document.createElement("div");
    ar.className = "cv-ar";
    ar.innerHTML =
      '<div class="cv-aviao" style="--y:12vh;--t:34s;--d:-4s"><span>✈️</span></div>' +
      '<div class="cv-aviao" style="--y:22vh;--t:44s;--d:-30s"><span>✈️</span></div>' +
      '<div class="cv-heli" style="--y:17vh;--t:38s;--d:-9s"><span>🚁</span></div>' +
      '<div class="cv-bando" style="--y:30vh;--t:26s;--d:-5s"><span>🐦</span><span>🐦</span><span>🐦</span></div>' +
      '<div class="cv-bando" style="--y:9vh;--t:33s;--d:-18s"><span>🕊️</span><span>🐦</span></div>';
    c.appendChild(ar);

    host.prepend(c); // fica atrás dos elementos do jogo
  }

  // Ambulância cruzando a rua (usada ao subir de nível)
  function passaAmbulancia() {
    const host = $("cidBg");
    if (!host) return;
    const a = document.createElement("div");
    a.className = "cv-ambulancia";
    a.innerHTML = "<span>🚑</span>";
    host.appendChild(a);
    setTimeout(() => a.remove(), 3500);
  }

  /* ================= API usada pelo HTML ================= */
  window.musicaLobby = () => tocar("lobby");

  window.CidadeFX = {
    partida()  { tocar("jogo"); },
    fim()      { parar(); },
    acerto()   { audio(); SFX.bip(ctx.currentTime); },
    erro()     { audio(); SFX.erro(ctx.currentTime); },
    impacto()  { audio(); SFX.respingo(ctx.currentTime); },
    nivel()    { audio(); SFX.sirene(ctx.currentTime); passaAmbulancia(); }
  };

  montaCidade();
})();
