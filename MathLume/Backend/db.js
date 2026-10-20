'use strict';
/* ==========================================================
   MathLume — banco de dados em ARQUIVO JSON (vai para o GitHub)

   Backend/data/banco.json   → usuários (e-mail, usuário, senha
                               criptografada) + pontuações.
                               ESTE arquivo é commitado: é ele que
                               leva o ranking de um computador
                               para o outro.
   Backend/data/sessoes.json → logins abertos neste computador.
                               NÃO vai para o GitHub (.gitignore).

   • Não precisa instalar nada (Node 18+).
   • Se o banco.json mudar enquanto o servidor está ligado
     (ex.: você deu "git pull"), o servidor relê sozinho.
   • IDs são aleatórios (não 1, 2, 3...) para que duas pessoas
     cadastrando em computadores diferentes nunca gerem o mesmo ID.
   ========================================================== */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const ARQ_BANCO = process.env.DB_FILE || path.join(DATA_DIR, 'banco.json');
const ARQ_SESSOES = path.join(DATA_DIR, 'sessoes.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- leitura / gravação segura do JSON ---------- */
function lerJson(arquivo, padrao) {
  try {
    const txt = fs.readFileSync(arquivo, 'utf8');
    if (txt.includes('<<<<<<<') || txt.includes('>>>>>>>')) {
      throw new Error('o arquivo tem marcas de conflito do Git (<<<<<<< / >>>>>>>). Resolva o conflito antes de ligar o servidor.');
    }
    return JSON.parse(txt);
  } catch (e) {
    if (e.code === 'ENOENT') return padrao;
    console.error('\n❌ Não consegui ler ' + path.relative(process.cwd(), arquivo) + ': ' + e.message + '\n');
    process.exit(1);
  }
}

function gravarJson(arquivo, dados, bonito) {
  const tmp = arquivo + '.tmp';
  // Um registro por linha: o diff do GitHub fica fácil de ler e conflitos ficam raros.
  const txt = bonito ? formatarBanco(dados) : JSON.stringify(dados);
  fs.writeFileSync(tmp, txt, 'utf8');
  fs.renameSync(tmp, arquivo); // troca atômica: nunca deixa o arquivo pela metade
}

function formatarBanco(b) {
  const linhas = (lista) => lista.length ? '\n    ' + lista.map((x) => JSON.stringify(x)).join(',\n    ') + '\n  ' : '';
  return '{\n  "versao": 1,\n  "usuarios": [' + linhas(b.usuarios) + '],\n  "pontuacoes": [' + linhas(b.pontuacoes) + ']\n}\n';
}

/* ---------- o banco em memória (recarrega se o arquivo mudar) ---------- */
let banco = null;
let mtimeLido = 0;

function mtime() { try { return fs.statSync(ARQ_BANCO).mtimeMs; } catch (e) { return 0; } }

function dados() {
  const m = mtime();
  if (!banco || m !== mtimeLido) {
    const lido = lerJson(ARQ_BANCO, { versao: 1, usuarios: [], pontuacoes: [] });
    banco = { versao: 1, usuarios: lido.usuarios || [], pontuacoes: lido.pontuacoes || [] };
    if (!m) salvar(); else mtimeLido = m;
    avisarDuplicados();
  }
  return banco;
}
function salvar() {
  gravarJson(ARQ_BANCO, banco, true);
  mtimeLido = mtime();
}

/* Duas pessoas podem criar o mesmo nome/e-mail em PCs diferentes e o Git juntar os dois.
   O servidor avisa no terminal para o ADM resolver (excluir um deles no painel). */
function avisarDuplicados() {
  for (const campo of ['usuario', 'email']) {
    const vistos = new Map();
    for (const u of banco.usuarios) {
      const k = String(u[campo]).toLowerCase();
      if (vistos.has(k)) console.warn('⚠️  banco.json tem ' + campo + ' repetido: "' + u[campo] + '" (IDs ' + vistos.get(k) + ' e ' + u.id + '). Exclua um deles no painel ADM.');
      else vistos.set(k, u.id);
    }
  }
}

const novoId = () => crypto.randomBytes(4).toString('hex'); // ex.: "a3f9c21b"
const agora = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const igual = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/* ---------- senhas (scrypt + sal, nativo do Node) ---------- */
function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(senha, sal, 64).toString('hex');
  return sal + ':' + h;
}
function confereSenha(senha, guardado) {
  const [sal, h] = String(guardado).split(':');
  if (!sal || !h) return false;
  const calc = crypto.scryptSync(senha, sal, 64);
  const orig = Buffer.from(h, 'hex');
  return orig.length === calc.length && crypto.timingSafeEqual(orig, calc);
}

/* ---------- usuários ---------- */
const publico = (u) => u && ({ id: u.id, usuario: u.usuario, email: u.email, papel: u.papel, criado_em: u.criado_em });

function porEmail(email)   { return dados().usuarios.find((u) => igual(u.email, email)) || null; }
function porUsuario(nome)  { return dados().usuarios.find((u) => igual(u.usuario, nome)) || null; }
function porId(id)         { return publico(dados().usuarios.find((u) => u.id === String(id))); }
function contaAdmins()     { return dados().usuarios.filter((u) => u.papel === 'admin').length; }

class ErroUnico extends Error { constructor(campo) { super('UNIQUE ' + campo); this.campo = campo; } }

function criarUsuario({ usuario, email, senha, papel }) {
  if (porEmail(email)) throw new ErroUnico('email');
  if (porUsuario(usuario)) throw new ErroUnico('usuario');
  const u = {
    id: novoId(), usuario, email: String(email).toLowerCase(), senha_hash: hashSenha(senha),
    papel: papel === 'admin' ? 'admin' : 'usuario', criado_em: agora()
  };
  dados().usuarios.push(u);
  salvar();
  return publico(u);
}

function renomearUsuario(id, nome) {
  const outro = porUsuario(nome);
  if (outro && outro.id !== id) throw new ErroUnico('usuario');
  const u = dados().usuarios.find((x) => x.id === id);
  if (u) { u.usuario = nome; salvar(); }
  return publico(u);
}

function promoverAdmin(id, senha) {
  const u = dados().usuarios.find((x) => x.id === id);
  if (!u) return false;
  u.papel = 'admin';
  if (senha) u.senha_hash = hashSenha(senha);
  salvar();
  return true;
}

function excluirUsuario(id) {
  const b = dados();
  const antes = b.usuarios.length;
  b.usuarios = b.usuarios.filter((u) => u.id !== id);
  if (b.usuarios.length === antes) return false;
  b.pontuacoes = b.pontuacoes.filter((p) => p.usuario_id !== id);
  salvar();
  return true;
}

/* ---------- pontuações ---------- */
function adicionarPontuacao(usuarioId, p) {
  const reg = {
    id: novoId(), usuario_id: usuarioId, pontos: p.pontos, nivel: p.nivel, combo_max: p.combo_max,
    acertos: p.acertos, modo: p.modo, dificuldade: p.dificuldade, venceu: p.venceu ? 1 : 0, criado_em: agora()
  };
  dados().pontuacoes.push(reg);
  salvar();
  const melhor = Math.max(...dados().pontuacoes.filter((x) => x.usuario_id === usuarioId).map((x) => x.pontos));
  return { id: reg.id, melhor };
}

function zerarPontuacoesUsuario(id) {
  dados().pontuacoes = dados().pontuacoes.filter((p) => p.usuario_id !== id);
  salvar();
}
function zerarTodasPontuacoes() { dados().pontuacoes = []; salvar(); }

/* Melhor pontuação de cada jogador (com filtros opcionais). */
function ranking(dificuldade, modo) {
  const b = dados();
  const nomes = new Map(b.usuarios.map((u) => [u.id, u.usuario]));
  const por = new Map();
  for (const p of b.pontuacoes) {
    if (!nomes.has(p.usuario_id)) continue;
    if (dificuldade && p.dificuldade !== dificuldade) continue;
    if (modo && p.modo !== modo) continue;
    let r = por.get(p.usuario_id);
    if (!r) { r = { id: p.usuario_id, usuario: nomes.get(p.usuario_id), pontos: 0, nivel: 0, combo: 0, partidas: 0 }; por.set(p.usuario_id, r); }
    r.pontos = Math.max(r.pontos, p.pontos);
    r.nivel = Math.max(r.nivel, p.nivel);
    r.combo = Math.max(r.combo, p.combo_max);
    r.partidas++;
  }
  return [...por.values()].sort((a, c) => c.pontos - a.pontos || a.partidas - c.partidas || a.usuario.localeCompare(c.usuario));
}

function listarUsuariosAdmin() {
  const b = dados();
  return b.usuarios.map((u) => {
    const ps = b.pontuacoes.filter((p) => p.usuario_id === u.id);
    return { ...publico(u), partidas: ps.length, melhor: ps.length ? Math.max(...ps.map((p) => p.pontos)) : 0 };
  });
}

/* ---------- sessões (só neste computador, fora do GitHub) ---------- */
const DIAS_SESSAO = 30;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
let sessoes = lerJson(ARQ_SESSOES, {});
const salvarSessoes = () => gravarJson(ARQ_SESSOES, sessoes, false);

function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessoes[sha(token)] = { usuario_id: usuarioId, expira_em: Date.now() + DIAS_SESSAO * 86400000 };
  salvarSessoes();
  return token;
}
function usuarioDaSessao(token) {
  if (!token) return null;
  const s = sessoes[sha(token)];
  if (!s) return null;
  if (s.expira_em < Date.now()) { encerrarSessao(token); return null; }
  return porId(s.usuario_id) || null; // usuário apagado → sessão não vale mais
}
function encerrarSessao(token) {
  if (sessoes[sha(token)]) { delete sessoes[sha(token)]; salvarSessoes(); }
}
function limparSessoesExpiradas() {
  const a = Date.now(); let mudou = false;
  for (const k of Object.keys(sessoes)) if (sessoes[k].expira_em < a) { delete sessoes[k]; mudou = true; }
  if (mudou) salvarSessoes();
}

module.exports = {
  ARQ_BANCO, hashSenha, confereSenha, ErroUnico,
  porEmail, porUsuario, porId, contaAdmins, criarUsuario, renomearUsuario, promoverAdmin, excluirUsuario,
  adicionarPontuacao, zerarPontuacoesUsuario, zerarTodasPontuacoes, ranking, listarUsuariosAdmin,
  criarSessao, usuarioDaSessao, encerrarSessao, limparSessoesExpiradas
};
