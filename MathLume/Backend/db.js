'use strict';
/* ==========================================================
   MathLume — banco de dados PostgreSQL (Neon)

   • A conexão vem da variável DATABASE_URL (no .env local ou
     no painel da hospedagem). Ela NUNCA vai para o GitHub.
   • As tabelas estão em schema.sql e são criadas sozinhas
     na primeira vez que o servidor liga.
   • Todo o acesso ao banco passa por aqui: o server.js só
     chama estas funções (todas assíncronas).
   ========================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const URL_BANCO = process.env.DATABASE_URL;
if (!URL_BANCO) {
  console.error('\n❌ Falta a variável DATABASE_URL (a "connection string" do Neon).');
  console.error('   Local: copie .env.example para .env e cole a URL do Neon nela.');
  console.error('   Hospedagem: cadastre DATABASE_URL nas variáveis de ambiente do painel.\n');
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(URL_BANCO);

const pool = new Pool({
  connectionString: URL_BANCO,
  ssl: local ? false : true,      // o Neon exige SSL
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000  // o Neon "acorda" em ~1 s depois de parado
});
// O Neon desliga o banco ocioso e derruba conexões paradas: só registra, não derruba o site.
pool.on('error', (e) => console.warn('⚠️  Conexão com o banco caiu (vai reconectar sozinho):', e.message));

const q = async (sql, params) => (await pool.query(sql, params)).rows;
const um = async (sql, params) => (await q(sql, params))[0] || null;

const novoId = () => crypto.randomBytes(6).toString('hex'); // ex.: "a3f9c21b04e7"
const DATA = (col) => "to_char(" + col + " AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')";
const COLS_USUARIO = 'id, usuario, email, papel, ' + DATA('criado_em') + ' AS criado_em';

/* ---------- inicialização ---------- */
async function iniciar() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}
const fechar = () => pool.end();

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
class ErroUnico extends Error { constructor(campo) { super('UNIQUE ' + campo); this.campo = campo; } }

// Converte o erro de "valor repetido" do Postgres (código 23505) em ErroUnico.
function tratarUnico(e) {
  if (e && e.code === '23505') {
    const onde = (e.constraint || '') + ' ' + (e.detail || '');
    throw new ErroUnico(/email/i.test(onde) ? 'email' : 'usuario');
  }
  throw e;
}

// Com senha_hash (usado no login). Não devolva isto para o navegador.
const porEmail   = (email) => um('SELECT ' + COLS_USUARIO + ', senha_hash FROM usuarios WHERE lower(email) = lower($1)', [email]);
const porUsuario = (nome)  => um('SELECT ' + COLS_USUARIO + ' FROM usuarios WHERE lower(usuario) = lower($1)', [nome]);
const porId      = (id)    => um('SELECT ' + COLS_USUARIO + ' FROM usuarios WHERE id = $1', [String(id)]);
const contaAdmins = async () => (await um("SELECT count(*)::int AS n FROM usuarios WHERE papel = 'admin'")).n;

async function criarUsuario({ usuario, email, senha, papel }) {
  try {
    return await um(
      'INSERT INTO usuarios (id, usuario, email, senha_hash, papel) VALUES ($1, $2, $3, $4, $5) RETURNING ' + COLS_USUARIO,
      [novoId(), usuario, String(email).toLowerCase(), hashSenha(senha), papel === 'admin' ? 'admin' : 'usuario']
    );
  } catch (e) { tratarUnico(e); }
}

async function renomearUsuario(id, nome) {
  try { return await um('UPDATE usuarios SET usuario = $2 WHERE id = $1 RETURNING ' + COLS_USUARIO, [id, nome]); }
  catch (e) { tratarUnico(e); }
}

async function promoverAdmin(id, senha) {
  const r = senha
    ? await pool.query("UPDATE usuarios SET papel = 'admin', senha_hash = $2 WHERE id = $1", [id, hashSenha(senha)])
    : await pool.query("UPDATE usuarios SET papel = 'admin' WHERE id = $1", [id]);
  return r.rowCount > 0;
}

// As pontuações e sessões do usuário somem junto (ON DELETE CASCADE).
async function excluirUsuario(id) {
  return (await pool.query('DELETE FROM usuarios WHERE id = $1', [id])).rowCount > 0;
}

/* ---------- pontuações ---------- */
async function adicionarPontuacao(usuarioId, p) {
  const r = await um(
    `WITH nova AS (
       INSERT INTO pontuacoes (id, usuario_id, pontos, nivel, combo_max, acertos, modo, dificuldade, venceu)
       VALUES ($1, $2::varchar, $3, $4, $5, $6, $7, $8, $9) RETURNING id, pontos
     )
     SELECT nova.id, GREATEST(nova.pontos, COALESCE((SELECT max(pontos) FROM pontuacoes WHERE usuario_id = $2::varchar), 0))::int AS melhor
     FROM nova`,
    [novoId(), usuarioId, p.pontos, p.nivel, p.combo_max, p.acertos, p.modo, p.dificuldade, !!p.venceu]
  );
  return { id: r.id, melhor: r.melhor };
}

const zerarPontuacoesUsuario = (id) => pool.query('DELETE FROM pontuacoes WHERE usuario_id = $1', [id]);
const zerarTodasPontuacoes = () => pool.query('DELETE FROM pontuacoes');

/* Melhor pontuação de cada jogador (com filtros opcionais). */
function ranking(dificuldade, modo) {
  return q(
    `SELECT u.id, u.usuario,
            max(p.pontos)::int    AS pontos,
            max(p.nivel)::int     AS nivel,
            max(p.combo_max)::int AS combo,
            count(*)::int         AS partidas
       FROM pontuacoes p
       JOIN usuarios u ON u.id = p.usuario_id
      WHERE ($1::text IS NULL OR p.dificuldade = $1::text)
        AND ($2::text IS NULL OR p.modo = $2::text)
      GROUP BY u.id, u.usuario
      ORDER BY pontos DESC, partidas ASC, lower(u.usuario) ASC`,
    [dificuldade || null, modo || null]
  );
}

function listarUsuariosAdmin() {
  return q(
    `SELECT u.id, u.usuario, u.email, u.papel, ${DATA('u.criado_em')} AS criado_em,
            count(p.id)::int AS partidas, COALESCE(max(p.pontos), 0)::int AS melhor
       FROM usuarios u
       LEFT JOIN pontuacoes p ON p.usuario_id = u.id
      GROUP BY u.id
      ORDER BY u.criado_em`
  );
}

/* ---------- sessões (login por token, 30 dias) ---------- */
const DIAS_SESSAO = 30;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    "INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, now() + make_interval(days => $3))",
    [sha(token), usuarioId, DIAS_SESSAO]
  );
  return token;
}
function usuarioDaSessao(token) {
  if (!token) return null;
  return um(
    'SELECT u.id, u.usuario, u.email, u.papel, ' + DATA('u.criado_em') + ' AS criado_em' +
    ' FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = $1 AND s.expira_em > now()',
    [sha(token)]
  );
}
const encerrarSessao = (token) => pool.query('DELETE FROM sessoes WHERE token_hash = $1', [sha(token)]);
const limparSessoesExpiradas = () => pool.query('DELETE FROM sessoes WHERE expira_em <= now()');

module.exports = {
  iniciar, fechar, pool, hashSenha, confereSenha, ErroUnico,
  porEmail, porUsuario, porId, contaAdmins, criarUsuario, renomearUsuario, promoverAdmin, excluirUsuario,
  adicionarPontuacao, zerarPontuacoesUsuario, zerarTodasPontuacoes, ranking, listarUsuariosAdmin,
  criarSessao, usuarioDaSessao, encerrarSessao, limparSessoesExpiradas
};
