# MathLume — Backend + Frontend

```
MathLume/
├── Backend/             ← servidor + conexão com o banco (PostgreSQL no Neon)
│   ├── server.js        ← API + serve a pasta Frontend
│   ├── db.js            ← todo acesso ao banco passa por aqui
│   ├── schema.sql       ← as tabelas (criadas sozinhas quando o servidor liga)
│   ├── env.js           ← lê o arquivo .env
│   ├── criar-admin.js   ← cria/promove ADM (ou troca a senha de um ADM)
│   ├── importar-json.js ← copia o banco antigo (data/banco.json) para o Neon — usar 1 vez
│   ├── .env.example     ← modelo de configuração (copie para .env)
│   └── package.json     ← dependência: pg (driver do PostgreSQL)
└── Frontend/
    ├── HTML/            ← tela-princ, minigamemat, dificuldade, loja, personalizacao,
    │                      TelaDeRank, TelaDeCarreira, admin
    ├── CSS/             ← um .css por tela
    ├── JS/              ← mathlume-api.js (fala com o Backend), mathlume-dados.js, sons.js
    └── assets/efeitos_sonoros/ ← músicas e efeitos (.mp3 / .wav)
```

## Banco de dados (Neon / PostgreSQL)
Tabelas: `usuarios`, `pontuacoes` e `sessoes` (veja `Backend/schema.sql`).
- Nome de usuário e e-mail não se repetem (maiúsculas/minúsculas contam como iguais) —
  garantido pelo próprio banco, não só pelo código.
- Senhas guardadas com scrypt + sal. Sessões guardam só o hash do token.
- Excluir um usuário apaga as pontuações e sessões dele junto.
- A conexão vem da variável `DATABASE_URL` (fica no `.env` local e no painel da hospedagem;
  **nunca** no GitHub).

## Rodar no seu computador
Precisa do **Node.js 18+**.
```
cd MathLume/Backend
copy .env.example .env      (no Windows; no Mac/Linux: cp .env.example .env)
# abra o .env e cole a DATABASE_URL do Neon
npm install                 (só na primeira vez)
npm start
```
Abra **http://localhost:3000**.

## Fazer alterações depois de publicado
1. Edite os arquivos e teste com `npm start`.
2. `git add .` → `git commit -m "o que mudou"` → `git push`
3. A hospedagem (Render) percebe o push e publica a nova versão sozinha em 1–3 minutos.
   Os dados (contas e ranking) ficam no Neon e **não se perdem** com o deploy.

Dica: para testar mudanças sem mexer nos dados reais, crie uma *branch* no Neon
(Branches → Create branch) e use a URL dela no seu `.env` local.

## Comandos úteis
| Comando (dentro de `Backend/`) | Para quê |
|---|---|
| `npm start` | liga o site |
| `node criar-admin.js "nome" "email" "senha"` | cria ADM, ou promove/troca a senha se o e-mail já existir |
| `node importar-json.js` | copia `data/banco.json` (banco antigo) para o Neon; pode repetir sem duplicar |

## API
| Método | Rota | Quem |
|---|---|---|
| POST | /api/cadastro, /api/login, /api/logout | todos |
| GET | /api/disponivel?usuario=&email= | todos |
| GET/PATCH | /api/me | logado |
| POST | /api/pontuacoes | logado |
| GET | /api/ranking?dificuldade=&modo= | todos |
| GET/POST/DELETE | /api/admin/... | só ADM |
| GET | /api/saude | verificação da hospedagem (não acessa o banco) |

## Cuidados ao trabalhar em equipe
- Antes de dar `push`, procure por `<<<<<<<` no projeto: marcas de conflito do Git esquecidas
  quebram a página (o JavaScript para de funcionar).
- No servidor (Linux) maiúsculas importam: `Tela.HTML` e `Tela.html` são arquivos diferentes.
  Escreva os links exatamente como o nome do arquivo.

## Limites conhecidos
- O jogo roda no navegador: a pontuação passa por checagem básica, mas um jogador técnico ainda pode forjar.
- Lumes, itens da loja e personalização continuam no `localStorage` (por navegador), ainda não estão no banco.
- Recuperação de senha por e-mail ainda não existe (o ADM pode excluir a conta, ou use `criar-admin.js` para ADMs).
