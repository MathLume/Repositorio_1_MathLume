# MathLume — Backend + Frontend

```
MathLume/
├── Backend/            ← servidor + banco de dados (arquivo JSON)
│   ├── server.js       ← API + serve a pasta Frontend (a "conexão")
│   ├── db.js           ← lê/grava o banco.json (usuários e pontuações)
│   ├── criar-admin.js  ← cria/promove ADM pelo terminal
│   ├── .env.example    ← configurações (copie para .env)
│   └── data/
│       ├── banco.json  ← O BANCO: usuários + ranking. VAI PARA O GITHUB.
│       └── sessoes.json← logins abertos no seu PC (fica fora do GitHub)
└── Frontend/
    ├── HTML/           ← tela-princ, minigamemat, loja, personalizacao, TelaDeRank, admin
    ├── CSS/            ← um .css por tela
    └── JS/             ← mathlume-dados.js (loja/itens) e mathlume-api.js (fala com o Backend)
```

## Como rodar
Precisa do **Node.js 18 ou superior** (https://nodejs.org). Não precisa de `npm install`.

```
cd Backend
node server.js
```
Abra **http://localhost:3000**. Na primeira vez, o console mostra o login do ADM
(`admin@mathlume.com` + senha). Para definir a sua, copie `.env.example` para `.env`
e preencha `ADMIN_SENHA` antes de subir.

## Como o ranking é compartilhado pelo GitHub (modo manual)
O banco de dados é o arquivo `Backend/data/banco.json`. Tudo que acontece no jogo
(cadastro, partidas, ADM) é gravado nele. Para os outros verem, basta commitar esse arquivo.

**Você (cria a conta e joga):**
```
git pull                      # pega o ranking mais novo ANTES de jogar
cd Backend && node server.js  # abre http://localhost:3000, cadastra, joga
# (Ctrl+C para desligar o servidor)
git add Backend/data/banco.json
git commit -m "ranking: nova conta e pontuação"
git push
```

**Outra pessoa:**
```
git clone <url-do-repositorio>   # (ou git pull, se já tiver)
cd MathLume/Backend && node server.js
```
Ela já vê sua pontuação no ranking, cria a conta dela, joga, e faz o mesmo
`git add / commit / push` do `banco.json`.

**Regras de ouro**
- Sempre `git pull` **antes** de jogar e antes de dar `push`. Isso evita conflito.
- Se o Git avisar conflito no `banco.json`: abra o arquivo, mantenha as linhas dos
  dois lados (cada usuário/pontuação é uma linha), apague as marcas `<<<<<<<`, `=======`,
  `>>>>>>>` e cuide para as vírgulas entre as linhas ficarem certas. O servidor recusa
  ligar enquanto houver marca de conflito no arquivo, para não estragar o banco.
- Os IDs são aleatórios (ex.: `a3f9c21b`), então duas pessoas cadastrando ao mesmo tempo
  em PCs diferentes não geram ID repetido.
- Se der `git pull` com o servidor ligado, ele relê o `banco.json` sozinho.
- ⚠️ **Privacidade:** com o repositório **público**, qualquer um vê os e-mails e nomes
  do `banco.json`. As senhas ficam criptografadas (scrypt com sal), não em texto, mas
  ainda assim use senhas que não sejam as de outros sites. Se possível, deixe o
  repositório **privado** e adicione as pessoas como colaboradoras.

Quando quiser deixar automático (sem commit), o caminho é hospedar o `Backend` num
servidor (Render, Railway, VPS...) ou trocar o `db.js` por um banco online. Como todo o
acesso ao banco passa pelo `db.js`, só ele precisa mudar: o resto do jogo continua igual.

## O que foi feito
- **Cadastro / login** de usuário (senha com scrypt, sessão por token de 30 dias).
  Ao clicar em "Criar usuário", a conta é gravada no `banco.json` e o jogador já entra logado.
  Depois, entra com **e-mail + senha**. Nome de usuário e e-mail **não se repetem**
  (maiúsculas/minúsculas contam como iguais: "Yasser" = "yasser"), e o formulário avisa
  enquanto a pessoa digita se o nome ou o e-mail já estão em uso.
- **Live Server / abrir o HTML direto**: funciona, desde que o `node server.js` esteja rodando
  (o jogo manda os dados para http://localhost:3000).
- **ADM**: criado na 1ª execução (se o banco.json ainda não tiver nenhum ADM); novos ADMs em `admin.html` ou `node criar-admin.js "nome" "email" "senha"`.
- **Pontuação**: ao fim de cada partida logada, o mini-game envia a pontuação ao servidor.
- **TelaDeRank.html**: pódio + lista, filtros por dificuldade e modo, "sua posição", atualiza a cada 30 s.
  O ranking usa a **melhor pontuação** de cada jogador.

## API
| Método | Rota | Quem |
|---|---|---|
| POST | /api/cadastro, /api/login, /api/logout | todos |
| GET | /api/disponivel?usuario=&email= | todos |
| GET/PATCH | /api/me | logado |
| POST | /api/pontuacoes | logado |
| GET | /api/ranking?dificuldade=&modo= | todos |
| GET/POST/DELETE | /api/admin/... | só ADM |

## Para publicar (importante)
- O banco é **um arquivo** (`Backend/data/banco.json`). Hospedagem que apaga o disco a cada deploy
  (ex.: plano grátis do Render) volta ao banco.json do último commit: use disco persistente/volume ou VPS.
- Defina as variáveis do `.env` no painel da hospedagem (`ADMIN_SENHA`, `TRUST_PROXY=1` se houver proxy) e use HTTPS.
- Limites conhecidos: o jogo roda no navegador, então a pontuação enviada só passa por checagem básica
  (um jogador técnico ainda pode forjar). Recuperação de senha por e-mail e os **Lumes/itens da loja**
  continuam locais (localStorage), ainda não estão no banco.
