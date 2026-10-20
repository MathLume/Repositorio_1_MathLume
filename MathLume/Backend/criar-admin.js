'use strict';
/* Cria (ou promove) um usuário ADM direto pelo terminal.
   Uso:  node criar-admin.js "nome" "email@exemplo.com" "senha"
   Depois, commite o Backend/data/banco.json para o ADM valer no GitHub. */
const banco = require('./db');

const [usuario, emailBruto, senha] = process.argv.slice(2);
if (!usuario || !emailBruto || !senha) {
  console.log('Uso: node criar-admin.js "nome" "email@exemplo.com" "senha"');
  process.exit(1);
}
const email = emailBruto.trim().toLowerCase();
if (senha.length < 6) { console.log('❌ A senha precisa ter pelo menos 6 caracteres.'); process.exit(1); }

const existente = banco.porEmail(email);
if (existente) {
  banco.promoverAdmin(existente.id, senha);
  console.log('✅ ' + email + ' agora é ADM (senha atualizada).');
} else {
  try { banco.criarUsuario({ usuario, email, senha, papel: 'admin' }); console.log('✅ ADM criado: ' + email); }
  catch (e) { console.log('❌ Não foi possível criar: ' + (e.campo ? 'esse ' + e.campo + ' já existe.' : e.message)); process.exit(1); }
}
