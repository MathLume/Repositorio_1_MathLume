/* ==========================================================
   MathLume — cliente da API (fala com o Backend)
   Usado por: tela-princ, minigamemat, TelaDeRank e admin.
   A sessão (token) fica no localStorage do navegador.
   ========================================================== */
(function () {
  'use strict';

  var CHAVE_TOKEN = 'mathlume_token';
  var CHAVE_USER = 'mathlume_usuario';

  // Servido pelo Backend (porta 3000 ou site publicado): mesma origem ('').
  // Aberto direto do disco (file://) ou pelo Live Server do VS Code (porta 5500 etc.):
  // aponta para o Backend local, senão o cadastro não chega no banco.
  var local = location.protocol === 'file:' ||
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== '3000');
  var BASE = local ? 'http://localhost:3000' : '';

  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  function token() { return ler(CHAVE_TOKEN); }
  function usuario() {
    try { return JSON.parse(ler(CHAVE_USER) || 'null'); } catch (e) { return null; }
  }
  function guardarSessao(u, t) {
    if (t) gravar(CHAVE_TOKEN, t);
    gravar(CHAVE_USER, JSON.stringify(u));
  }
  function limparSessao() { gravar(CHAVE_TOKEN, null); gravar(CHAVE_USER, null); }

  function chamar(metodo, caminho, corpo) {
    var opts = { method: metodo, headers: {} };
    if (corpo !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(corpo); }
    if (token()) opts.headers.Authorization = 'Bearer ' + token();
    return fetch(BASE + caminho, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (dados) {
        if (!r.ok) {
          if (r.status === 401 && token()) limparSessao(); // sessão expirou
          var e = new Error(dados.erro || 'Erro inesperado. Tente novamente.');
          e.status = r.status;
          throw e;
        }
        return dados;
      });
    }, function () {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o Backend está rodando.');
    });
  }

  window.MathLumeAPI = {
    base: BASE,
    token: token,
    usuario: usuario,
    logado: function () { return !!(token() && usuario()); },
    ehAdmin: function () { var u = usuario(); return !!(u && u.papel === 'admin'); },

    // Cria o usuário no banco e já deixa ele logado.
    cadastrar: function (nome, email, senha) {
      return chamar('POST', '/api/cadastro', { usuario: nome, email: email, senha: senha }).then(function (d) {
        guardarSessao(d.usuario, d.token);
        return d.usuario;
      });
    },
    // { usuario: true/false/null, email: true/false/null }  (true = livre)
    disponivel: function (nome, email) {
      var p = [];
      if (nome) p.push('usuario=' + encodeURIComponent(nome));
      if (email) p.push('email=' + encodeURIComponent(email));
      return chamar('GET', '/api/disponivel?' + p.join('&'));
    },
    entrar: function (email, senha) {
      return chamar('POST', '/api/login', { email: email, senha: senha }).then(function (d) {
        guardarSessao(d.usuario, d.token);
        return d.usuario;
      });
    },
    sair: function () {
      var p = token() ? chamar('POST', '/api/logout').catch(function () {}) : Promise.resolve();
      limparSessao();
      return p;
    },
    // Confere no servidor se a sessão guardada ainda vale; devolve o usuário ou null.
    restaurar: function () {
      if (!token()) return Promise.resolve(null);
      return chamar('GET', '/api/me').then(function (d) { guardarSessao(d.usuario); return d.usuario; },
        function (e) { if (e.status === 401) limparSessao(); return e.status ? null : usuario(); });
    },
    mudarNome: function (nome) {
      return chamar('PATCH', '/api/me', { usuario: nome }).then(function (d) { guardarSessao(d.usuario); return d.usuario; });
    },

    salvarPontuacao: function (partida) { return chamar('POST', '/api/pontuacoes', partida); },
    ranking: function (filtros) {
      var p = [];
      filtros = filtros || {};
      ['dificuldade', 'modo', 'limite'].forEach(function (k) { if (filtros[k]) p.push(k + '=' + encodeURIComponent(filtros[k])); });
      return chamar('GET', '/api/ranking' + (p.length ? '?' + p.join('&') : ''));
    },

    admin: {
      usuarios: function () { return chamar('GET', '/api/admin/usuarios'); },
      criarAdmin: function (nome, email, senha) { return chamar('POST', '/api/admin/usuarios', { usuario: nome, email: email, senha: senha }); },
      excluirUsuario: function (id) { return chamar('DELETE', '/api/admin/usuarios/' + id); },
      zerarPontosUsuario: function (id) { return chamar('DELETE', '/api/admin/usuarios/' + id + '/pontuacoes'); },
      zerarRanking: function () { return chamar('DELETE', '/api/admin/pontuacoes'); }
    }
  };
})();
