'use strict';
/* ==========================================================
   MathLume — servidor
   • Serve a pasta ../Frontend  (é aqui que o Backend "conecta" ao Frontend)
   • Expõe a API em /api/...    (cadastro, login, ADM, pontuação, ranking)
   • Banco: PostgreSQL no Neon (variável DATABASE_URL)
   Rodar:  npm install  (só na 1ª vez)  e depois  npm start
   ========================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('./env'); // carrega o .env (DATABASE_URL, ADMIN_SENHA...)
const banco = require('./db');
const { confereSenha, criarUsuario, criarSessao, usuarioDaSessao, encerrarSessao, limparSessoesExpiradas } = banco;

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND = path.resolve(__dirname, '..', 'Frontend');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const PAGINA_INICIAL = '/HTML/tela-princ.html';

/* ---------- administrador inicial ---------- */
async function garantirAdmin() {
  if (await banco.contaAdmins() > 0) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@mathlume.com').toLowerCase();
  const usuario = process.env.ADMIN_USUARIO || 'admin';
  let senha = process.env.ADMIN_SENHA, gerada = false;
  if (!senha) { senha = crypto.randomBytes(6).toString('base64url'); gerada = true; }
  try {
    await criarUsuario({ usuario, email, senha, papel: 'admin' });
    console.log('\n🔐 Usuário ADM criado:');
    console.log('   e-mail: ' + email);
    console.log('   senha : ' + senha + (gerada ? '   (gerada agora — anote! não será mostrada de novo)' : ''));
    console.log('   Para criar outro ADM:  node criar-admin.js "nome" "email" "senha"\n');
  } catch (e) {
    console.error('Não foi possível criar o ADM inicial:', e.message);
  }
}
setInterval(() => limparSessoesExpiradas().catch(() => {}), 3600000).unref();

/* ---------- utilitários ---------- */
class ErroHttp extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function ipDe(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'ip';
}

const limites = new Map();
function limitar(chave, max, janelaMs) {
  const agora = Date.now();
  let l = limites.get(chave);
  if (!l || l.fim < agora) { l = { n: 0, fim: agora + janelaMs }; limites.set(chave, l); }
  if (++l.n > max) throw new ErroHttp(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');
}
setInterval(() => { const a = Date.now(); limites.forEach((v, k) => { if (v.fim < a) limites.delete(k); }); }, 600000).unref();

function responder(res, status, obj) {
  const corpo = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(corpo);
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let tam = 0; const partes = [];
    req.on('data', (c) => {
      tam += c.length;
      if (tam > 100 * 1024) { falha(new ErroHttp(413, 'Requisição grande demais.')); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => {
      if (!partes.length) return ok({});
      try { ok(JSON.parse(Buffer.concat(partes).toString('utf8'))); }
      catch (e) { falha(new ErroHttp(400, 'JSON inválido.')); }
    });
    req.on('error', falha);
  });
}

function usuarioAtual(req) {
  const h = req.headers.authorization || '';
  return usuarioDaSessao(h.startsWith('Bearer ') ? h.slice(7) : '');
}
async function exigeLogin(req) {
  const u = await usuarioAtual(req);
  if (!u) throw new ErroHttp(401, 'Faça login para continuar.');
  return u;
}
async function exigeAdmin(req) {
  const u = await exigeLogin(req);
  if (u.papel !== 'admin') throw new ErroHttp(403, 'Apenas administradores podem fazer isso.');
  return u;
}

/* ---------- validações ---------- */
function validarNovoUsuario(b) {
  const usuario = String(b.usuario || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const senha = String(b.senha || '');
  if (usuario.length < 3 || usuario.length > 24) throw new ErroHttp(400, 'O usuário deve ter de 3 a 24 caracteres.');
  if (!/^[\p{L}\p{N}_.-]+$/u.test(usuario)) throw new ErroHttp(400, 'O usuário só pode ter letras, números, ponto, hífen e _ (sem espaços).');
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, 'E-mail inválido.');
  if (senha.length < 6 || senha.length > 100) throw new ErroHttp(400, 'A senha deve ter pelo menos 6 caracteres.');
  return { usuario, email, senha };
}

async function cadastrar(dados, papel) {
  try {
    return await criarUsuario({ ...dados, papel });
  } catch (e) {
    if (e instanceof banco.ErroUnico) {
      throw new ErroHttp(409, e.campo === 'email' ? 'Este e-mail já está cadastrado.' : 'Este nome de usuário já está em uso.');
    }
    throw e;
  }
}

const publico = (u) => ({ id: u.id, usuario: u.usuario, email: u.email, papel: u.papel });
const int = (v) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : NaN);

/* ---------- rotas da API ---------- */
const rotas = [];
const rota = (metodo, padrao, fn) => rotas.push({ metodo, re: new RegExp('^' + padrao.replace(/:id/g, '([a-zA-Z0-9]+)') + '$'), fn });

rota('GET', '/api/saude', () => ({ ok: true }));

rota('POST', '/api/cadastro', async (req) => {
  limitar('cad:' + ipDe(req), 15, 15 * 60000);
  const user = await cadastrar(validarNovoUsuario(await lerCorpo(req)), 'usuario');
  return { status: 201, corpo: { usuario: publico(user), token: await criarSessao(user.id) } };
});

// Confere, enquanto a pessoa digita, se o usuário/e-mail já existem no banco.
rota('GET', '/api/disponivel', async (req, url) => {
  limitar('disp:' + ipDe(req), 120, 60000);
  const usuario = String(url.searchParams.get('usuario') || '').trim();
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
  return {
    usuario: usuario ? !(await banco.porUsuario(usuario)) : null,
    email: email ? !(await banco.porEmail(email)) : null
  };
});

rota('POST', '/api/login', async (req) => {
  limitar('login:' + ipDe(req), 15, 15 * 60000);
  const b = await lerCorpo(req);
  const email = String(b.email || '').trim().toLowerCase();
  const u = await banco.porEmail(email);
  if (!u || !confereSenha(String(b.senha || ''), u.senha_hash)) throw new ErroHttp(401, 'E-mail ou senha incorretos.');
  return { usuario: publico(u), token: await criarSessao(u.id) };
});

rota('POST', '/api/logout', async (req) => {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) await encerrarSessao(h.slice(7));
  return { ok: true };
});

rota('GET', '/api/me', async (req) => ({ usuario: publico(await exigeLogin(req)) }));

rota('PATCH', '/api/me', async (req) => {
  const u = await exigeLogin(req);
  const nome = String((await lerCorpo(req)).usuario || '').trim();
  if (nome.length < 3 || nome.length > 24 || !/^[\p{L}\p{N}_.-]+$/u.test(nome)) throw new ErroHttp(400, 'Usuário inválido (3 a 24 caracteres, sem espaços).');
  try { return { usuario: publico(await banco.renomearUsuario(u.id, nome)) }; }
  catch (e) {
    if (e instanceof banco.ErroUnico) throw new ErroHttp(409, 'Este nome de usuário já está em uso.');
    throw e;
  }
});

rota('POST', '/api/pontuacoes', async (req) => {
  const u = await exigeLogin(req);
  limitar('pont:' + u.id, 60, 60000);
  const b = await lerCorpo(req);
  const pontos = int(b.pontos), nivel = int(b.nivel), combo = int(b.comboMax), acertos = int(b.acertos);
  const modo = b.modo, dif = b.dificuldade;
  if (![pontos, nivel, combo, acertos].every((n) => Number.isInteger(n) && n >= 0)) throw new ErroHttp(400, 'Dados da partida inválidos.');
  if (!['finito', 'infinito'].includes(modo) || !['facil', 'medio', 'dificil'].includes(dif)) throw new ErroHttp(400, 'Modo ou dificuldade inválidos.');
  // Cada acerto vale no máximo 60 pts (30 de combo × 2 do booster). Barra números absurdos.
  if (pontos > acertos * 60 || pontos > 1000000 || nivel > 1000 || combo > acertos) throw new ErroHttp(400, 'Pontuação inconsistente.');
  const r = await banco.adicionarPontuacao(u.id, { pontos, nivel: Math.max(1, nivel), combo_max: combo, acertos, modo, dificuldade: dif, venceu: !!b.venceu });
  return { status: 201, corpo: { ok: true, id: r.id, novoRecorde: pontos >= r.melhor && pontos > 0, melhor: r.melhor } };
});

rota('GET', '/api/ranking', async (req, url) => {
  const dif = ['facil', 'medio', 'dificil'].includes(url.searchParams.get('dificuldade')) ? url.searchParams.get('dificuldade') : null;
  const modo = ['finito', 'infinito'].includes(url.searchParams.get('modo')) ? url.searchParams.get('modo') : null;
  const limite = Math.min(100, Math.max(1, int(url.searchParams.get('limite')) || 50));
  const todos = (await banco.ranking(dif, modo)).map((r, i) => ({ posicao: i + 1, ...r }));
  const u = await usuarioAtual(req);
  const eu = u ? todos.find((r) => r.id === u.id) || null : null;
  return {
    ranking: todos.slice(0, limite).map((r) => ({ ...r, voce: !!(u && r.id === u.id) })),
    eu, totalJogadores: todos.length, filtros: { dificuldade: dif, modo }
  };
});

/* ----- administração ----- */
rota('GET', '/api/admin/usuarios', async (req) => {
  await exigeAdmin(req);
  return { usuarios: await banco.listarUsuariosAdmin() };
});

rota('POST', '/api/admin/usuarios', async (req) => {
  await exigeAdmin(req);
  const user = await cadastrar(validarNovoUsuario(await lerCorpo(req)), 'admin');
  return { status: 201, corpo: { usuario: publico(user) } };
});

rota('DELETE', '/api/admin/usuarios/:id', async (req, url, id) => {
  const adm = await exigeAdmin(req);
  if (id === adm.id) throw new ErroHttp(400, 'Você não pode excluir a sua própria conta.');
  if (!(await banco.excluirUsuario(id))) throw new ErroHttp(404, 'Usuário não encontrado.');
  return { ok: true };
});

rota('DELETE', '/api/admin/usuarios/:id/pontuacoes', async (req, url, id) => {
  await exigeAdmin(req);
  await banco.zerarPontuacoesUsuario(id);
  return { ok: true };
});

rota('DELETE', '/api/admin/pontuacoes', async (req) => {
  await exigeAdmin(req);
  await banco.zerarTodasPontuacoes();
  return { ok: true };
});

async function tratarApi(req, res, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try {
    for (const r of rotas) {
      const m = r.re.exec(url.pathname);
      if (m && r.metodo === req.method) {
        const saida = await r.fn(req, url, ...m.slice(1));
        return saida && saida.corpo ? responder(res, saida.status || 200, saida.corpo) : responder(res, 200, saida);
      }
    }
    throw new ErroHttp(404, 'Rota não encontrada.');
  } catch (e) {
    if (e instanceof ErroHttp) return responder(res, e.status, { erro: e.message });
    console.error(e);
    return responder(res, 500, { erro: 'Erro interno do servidor.' });
  }
}

/* ---------- arquivos do Frontend ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'
};

function servirArquivo(req, res, url) {
  if (url.pathname === '/') { res.writeHead(302, { Location: PAGINA_INICIAL }); return res.end(); }
  let caminho;
  try { caminho = path.resolve(FRONTEND, '.' + decodeURIComponent(url.pathname)); }
  catch (e) { res.writeHead(400); return res.end('Requisição inválida'); }
  if (caminho !== FRONTEND && !caminho.startsWith(FRONTEND + path.sep)) { res.writeHead(403); return res.end('Acesso negado'); }
  fs.stat(caminho, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>Página não encontrada. <a href="' + PAGINA_INICIAL + '">Voltar ao início</a></p>');
    }
    const ext = path.extname(caminho).toLowerCase();
    const midia = /^\.(mp3|wav|ogg|mp4|png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/.test(ext);
    const cab = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // HTML/CSS/JS: sempre confere se mudou (deploy novo aparece na hora). Sons/imagens: guarda 1 dia.
      'Cache-Control': midia ? 'public, max-age=86400' : 'no-cache',
      'Last-Modified': st.mtime.toUTCString(),
      'Accept-Ranges': 'bytes'
    };
    if (req.headers['if-modified-since'] && Math.floor(st.mtimeMs / 1000) <= Math.floor(Date.parse(req.headers['if-modified-since']) / 1000)) {
      res.writeHead(304, cab); return res.end();
    }
    // Pedido de um pedaço do arquivo (o navegador faz isso com áudio, ex.: audio.currentTime = 0.2).
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (r && (r[1] || r[2])) {
      let ini = r[1] ? Number(r[1]) : Math.max(0, st.size - Number(r[2]));
      let fim = r[1] && r[2] ? Math.min(Number(r[2]), st.size - 1) : st.size - 1;
      if (ini > fim || ini >= st.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
      res.writeHead(206, { ...cab, 'Content-Range': 'bytes ' + ini + '-' + fim + '/' + st.size, 'Content-Length': fim - ini + 1 });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(caminho, { start: ini, end: fim }).pipe(res);
    }
    res.writeHead(200, { ...cab, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(caminho).pipe(res);
  });
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return tratarApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  servirArquivo(req, res, url);
});

/* ---------- liga: cria as tabelas (se faltarem), garante o ADM e abre a porta ---------- */
(async () => {
  try {
    await banco.iniciar();
    await garantirAdmin();
  } catch (e) {
    console.error('\n❌ Não consegui conectar ao banco de dados: ' + e.message);
    console.error('   Confira a DATABASE_URL (copie de novo do painel do Neon).\n');
    process.exit(1);
  }
  servidor.listen(PORT, () => {
    console.log('✅ MathLume rodando em http://localhost:' + PORT);
    console.log('   Frontend servido de: ' + FRONTEND);
    console.log('   Banco de dados:      PostgreSQL (Neon) conectado');
  });
})();

// A hospedagem manda SIGTERM ao reiniciar/publicar: fecha tudo com calma.
process.on('SIGTERM', () => {
  setTimeout(() => process.exit(0), 5000).unref();
  servidor.close(() => banco.fechar().finally(() => process.exit(0)));
});
process.on('unhandledRejection', (e) => console.error('Erro não tratado:', e));
