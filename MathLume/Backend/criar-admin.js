'use strict';
/* Cria (ou promove) um usuário ADM direto no banco (Neon).
   Uso:  node criar-admin.js "nome" "email@exemplo.com" "senha"
   Precisa da DATABASE_URL no .env. Serve também para TROCAR a senha de um ADM
   (rode com o mesmo e-mail e a senha nova). */
require('./env');
const banco = require('./db');

(async () => {
  const [usuario, emailBruto, senha] = process.argv.slice(2);
  if (!usuario || !emailBruto || !senha) {
    console.log('Uso: node criar-admin.js "nome" "email@exemplo.com" "senha"');
    process.exitCode = 1; return;
  }
  const email = emailBruto.trim().toLowerCase();
  if (senha.length < 6) { console.log('❌ A senha precisa ter pelo menos 6 caracteres.'); process.exitCode = 1; return; }

  await banco.iniciar();
  const existente = await banco.porEmail(email);
  if (existente) {
    await banco.promoverAdmin(existente.id, senha);
    console.log('✅ ' + email + ' agora é ADM (senha atualizada).');
  } else {
    try { await banco.criarUsuario({ usuario, email, senha, papel: 'admin' }); console.log('✅ ADM criado: ' + email); }
    catch (e) { console.log('❌ Não foi possível criar: ' + (e.campo ? 'esse ' + e.campo + ' já existe.' : e.message)); process.exitCode = 1; }
  }
})()
  .catch((e) => { console.error('❌ ' + e.message); process.exitCode = 1; })
  .finally(() => banco.fechar());
