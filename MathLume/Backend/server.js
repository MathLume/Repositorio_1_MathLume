'use strict';
/* ==========================================================
   MathLume — servidor (sem dependências externas)
   • Serve a pasta ../Frontend  (é aqui que o Backend "conecta" ao Frontend)
   • Expõe a API em /api/...    (cadastro, login, ADM, pontuação, ranking)
   Rodar:  node server.js   (ou: npm start)
   ========================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ---------- .env simples (sem biblioteca) ---------- */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !l.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* sem .env: tudo bem */ }

const banco = require('./db');
const { confereSenha, criarUsuario, criarSessao, usuarioDaSessao, encerrarSessao, limparSessoesExpiradas } = banco;

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND = path.resolve(__dirname, '..', 'Frontend');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const PAGINA_INICIAL = '/HTML/tela-princ.html';

/* ---------- administrador inicial ---------- */
function garantirAdmin() {
  if (banco.contaAdmins() > 0) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@mathlume.com').toLowerCase();
  const usuario = process.env.ADMIN_USUARIO || 'admin';
  let senha = process.env.ADMIN_SENHA, gerada = false;
  if (!senha) { senha = crypto.randomBytes(6).toString('base64url'); gerada = true; }
  try {
    criarUsuario({ usuario, email, senha, papel: 'admin' });
    console.log('\n🔐 Usuário ADM criado:');
    console.log('   e-mail: ' + email);
    console.log('   senha : ' + senha + (gerada ? '   (gerada agora — anote! não será mostrada de novo)' : ''));
    console.log('   Para criar outro ADM:  node criar-admin.js "nome" "email" "senha"\n');
  } catch (e) {
    console.error('Não foi possível criar o ADM inicial:', e.message);
  }
}
garantirAdmin();
setInterval(limparSessoesExpiradas, 3600000).unref();

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
function exigeLogin(req) {
  const u = usuarioAtual(req);
  if (!u) throw new ErroHttp(401, 'Faça login para continuar.');
  return u;
}
function exigeAdmin(req) {
  const u = exigeLogin(req);
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

function cadastrar(dados, papel) {
  try {
    return criarUsuario({ ...dados, papel });
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
  const user = cadastrar(validarNovoUsuario(await lerCorpo(req)), 'usuario');
  return { status: 201, corpo: { usuario: publico(user), token: criarSessao(user.id) } };
});

// Confere, enquanto a pessoa digita, se o usuário/e-mail já existem no banco.
rota('GET', '/api/disponivel', (req, url) => {
  limitar('disp:' + ipDe(req), 120, 60000);
  const usuario = String(url.searchParams.get('usuario') || '').trim();
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
  return {
    usuario: usuario ? !banco.porUsuario(usuario) : null,
    email: email ? !banco.porEmail(email) : null
  };
});

rota('POST', '/api/login', async (req) => {
  limitar('login:' + ipDe(req), 15, 15 * 60000);
  const b = await lerCorpo(req);
  const email = String(b.email || '').trim().toLowerCase();
  const u = banco.porEmail(email);
  if (!u || !confereSenha(String(b.senha || ''), u.senha_hash)) throw new ErroHttp(401, 'E-mail ou senha incorretos.');
  return { usuario: publico(u), token: criarSessao(u.id) };
});

rota('POST', '/api/logout', (req) => {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) encerrarSessao(h.slice(7));
  return { ok: true };
});

rota('GET', '/api/me', (req) => ({ usuario: publico(exigeLogin(req)) }));

rota('PATCH', '/api/me', async (req) => {
  const u = exigeLogin(req);
  const nome = String((await lerCorpo(req)).usuario || '').trim();
  if (nome.length < 3 || nome.length > 24 || !/^[\p{L}\p{N}_.-]+$/u.test(nome)) throw new ErroHttp(400, 'Usuário inválido (3 a 24 caracteres, sem espaços).');
  try { return { usuario: publico(banco.renomearUsuario(u.id, nome)) }; }
  catch (e) { throw new ErroHttp(409, 'Este nome de usuário já está em uso.'); }
});

rota('POST', '/api/pontuacoes', async (req) => {
  const u = exigeLogin(req);
  limitar('pont:' + u.id, 60, 60000);
  const b = await lerCorpo(req);
  const pontos = int(b.pontos), nivel = int(b.nivel), combo = int(b.comboMax), acertos = int(b.acertos);
  const modo = b.modo, dif = b.dificuldade;
  if (![pontos, nivel, combo, acertos].every((n) => Number.isInteger(n) && n >= 0)) throw new ErroHttp(400, 'Dados da partida inválidos.');
  if (!['finito', 'infinito'].includes(modo) || !['facil', 'medio', 'dificil'].includes(dif)) throw new ErroHttp(400, 'Modo ou dificuldade inválidos.');
  // Cada acerto vale no máximo 60 pts (30 de combo × 2 do booster). Barra números absurdos.
  if (pontos > acertos * 60 || pontos > 1000000 || nivel > 1000 || combo > acertos) throw new ErroHttp(400, 'Pontuação inconsistente.');
  const r = banco.adicionarPontuacao(u.id, { pontos, nivel: Math.max(1, nivel), combo_max: combo, acertos, modo, dificuldade: dif, venceu: !!b.venceu });
  return { status: 201, corpo: { ok: true, id: r.id, novoRecorde: pontos >= r.melhor && pontos > 0, melhor: r.melhor } };
});

rota('GET', '/api/ranking', (req, url) => {
  const dif = ['facil', 'medio', 'dificil'].includes(url.searchParams.get('dificuldade')) ? url.searchParams.get('dificuldade') : null;
  const modo = ['finito', 'infinito'].includes(url.searchParams.get('modo')) ? url.searchParams.get('modo') : null;
  const limite = Math.min(100, Math.max(1, int(url.searchParams.get('limite')) || 50));
  const todos = banco.ranking(dif, modo).map((r, i) => ({ posicao: i + 1, ...r }));
  const u = usuarioAtual(req);
  const eu = u ? todos.find((r) => r.id === u.id) || null : null;
  return {
    ranking: todos.slice(0, limite).map((r) => ({ ...r, voce: !!(u && r.id === u.id) })),
    eu, totalJogadores: todos.length, filtros: { dificuldade: dif, modo }
  };
});

/* ----- administração ----- */
rota('GET', '/api/admin/usuarios', (req) => {
  exigeAdmin(req);
  return { usuarios: banco.listarUsuariosAdmin() };
});

rota('POST', '/api/admin/usuarios', async (req) => {
  exigeAdmin(req);
  const user = cadastrar(validarNovoUsuario(await lerCorpo(req)), 'admin');
  return { status: 201, corpo: { usuario: publico(user) } };
});

rota('DELETE', '/api/admin/usuarios/:id', (req, url, id) => {
  const adm = exigeAdmin(req);
  if (id === adm.id) throw new ErroHttp(400, 'Você não pode excluir a sua própria conta.');
  if (!banco.excluirUsuario(id)) throw new ErroHttp(404, 'Usuário não encontrado.');
  return { ok: true };
});

rota('DELETE', '/api/admin/usuarios/:id/pontuacoes', (req, url, id) => {
  exigeAdmin(req);
  banco.zerarPontuacoesUsuario(id);
  return { ok: true };
});

rota('DELETE', '/api/admin/pontuacoes', (req) => {
  exigeAdmin(req);
  banco.zerarTodasPontuacoes();
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
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2'
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
    res.writeHead(200, { 'Content-Type': MIME[path.extname(caminho).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(caminho).pipe(res);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return tratarApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  servirArquivo(req, res, url);
}).listen(PORT, () => {
  console.log('✅ MathLume rodando em http://localhost:' + PORT);
  console.log('   Frontend servido de: ' + FRONTEND);
  console.log('   Banco de dados:      ' + banco.ARQ_BANCO + '  (commite este arquivo para salvar no GitHub)');
});
