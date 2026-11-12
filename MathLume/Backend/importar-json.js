'use strict';
/* Copia o banco ANTIGO (data/banco.json) para o Neon — rode UMA vez.
   Uso:  node importar-json.js            (lê data/banco.json)
         node importar-json.js outro.json
   Pode rodar de novo sem medo: o que já existe no Neon é ignorado (não duplica).
   As senhas continuam valendo (o formato scrypt é o mesmo). */
require('./env');
const fs = require('fs');
const path = require('path');
const banco = require('./db');

(async () => {
  const arquivo = path.resolve(process.argv[2] || path.join(__dirname, 'data', 'banco.json'));
  const txt = fs.readFileSync(arquivo, 'utf8');
  if (txt.includes('<<<<<<<')) throw new Error('o arquivo tem marcas de conflito do Git. Resolva antes de importar.');
  const { usuarios = [], pontuacoes = [] } = JSON.parse(txt);

  await banco.iniciar();
  const cliente = await banco.pool.connect();
  let nu = 0, np = 0, pulados = [];
  try {
    await cliente.query('BEGIN');
    for (const u of usuarios) {
      // SAVEPOINT: se um usuário der conflito (nome/e-mail já usado), só ele é pulado.
      await cliente.query('SAVEPOINT s');
      try {
        const r = await cliente.query(
          `INSERT INTO usuarios (id, usuario, email, senha_hash, papel, criado_em)
           VALUES ($1, $2, lower($3), $4, $5, COALESCE($6::timestamp AT TIME ZONE 'UTC', now()))
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.usuario, u.email, u.senha_hash, u.papel === 'admin' ? 'admin' : 'usuario', u.criado_em || null]
        );
        nu += r.rowCount;
        await cliente.query('RELEASE SAVEPOINT s');
      } catch (e) {
        await cliente.query('ROLLBACK TO SAVEPOINT s');
        if (e.code !== '23505') throw e;
        pulados.push(u.usuario + ' <' + u.email + '>');
      }
    }
    for (const p of pontuacoes) {
      const r = await cliente.query(
        `INSERT INTO pontuacoes (id, usuario_id, pontos, nivel, combo_max, acertos, modo, dificuldade, venceu, criado_em)
         SELECT $1, $2::varchar, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamp AT TIME ZONE 'UTC', now())
          WHERE EXISTS (SELECT 1 FROM usuarios WHERE id = $2::varchar)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.usuario_id, p.pontos | 0, p.nivel | 0, p.combo_max | 0, p.acertos | 0, p.modo, p.dificuldade, !!p.venceu, p.criado_em || null]
      );
      np += r.rowCount;
    }
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
  console.log('✅ Importado para o Neon: ' + nu + ' usuário(s) e ' + np + ' pontuação(ões) novos.');
  if (pulados.length) console.log('⚠️  Pulados (nome ou e-mail já existe no Neon com outro ID): ' + pulados.join(', '));
})()
  .catch((e) => { console.error('❌ Importação cancelada (nada foi gravado): ' + e.message); process.exitCode = 1; })
  .finally(() => banco.fechar());
