# Como publicar o MathLume (Neon + Render)

Arquitetura final:
```
Jogador (navegador) ──► Render (Node: server.js + Frontend)  ──►  Neon (PostgreSQL)
                         https://mathlume.onrender.com            usuários, ranking, sessões
GitHub ──push──► Render publica a nova versão sozinho
```

## 1. Neon — criar o banco (5 min)
1. Crie a conta em **neon.com** (pode entrar com o GitHub).
2. **Create project** → nome `mathlume` → Postgres na versão padrão →
   região **AWS US East 2 (Ohio)** (fica perto do servidor do Render; isso importa mais que a distância do jogador).
3. No painel do projeto, clique em **Connect** → deixe **Connection pooling** ligado →
   copie a connection string (começa com `postgresql://` e tem `-pooler` no endereço).
   Ela tem a senha do banco: **não cole em arquivos que vão para o GitHub**.

Não precisa criar tabelas: o servidor cria sozinho (`Backend/schema.sql`).

## 2. Ligar no seu PC e trazer os dados antigos (5 min)
```
cd MathLume/Backend
copy .env.example .env          (Mac/Linux: cp .env.example .env)
```
Abra o `.env`, cole a URL do Neon em `DATABASE_URL=` e defina `ADMIN_SENHA=`.
```
npm install
node importar-json.js           ← copia as contas e pontuações do banco.json para o Neon
npm start                       ← abra http://localhost:3000 e teste login/ranking
```
Rode o `importar-json.js` **antes** do primeiro `npm start`, assim o ADM antigo é mantido.
Se não lembrar a senha dele: `node criar-admin.js "admin" "admin@mathlume.com" "SenhaNova123"`.

Confira no Neon: **Tables** → `usuarios` e `pontuacoes` devem mostrar os dados.

Depois de conferir, apague `MathLume/Backend/data/banco.json` do repositório
(ele tinha e-mails e hashes de senha em público) e faça o commit:
```
git add -A
git commit -m "Banco migrado para o Neon (PostgreSQL)"
git push
```

## 3. Render — publicar o site (10 min)
1. Crie a conta em **render.com** com o GitHub.
2. **New → Web Service** → escolha o repositório do MathLume → branch `main`.
3. Preencha:
   | Campo | Valor |
   |---|---|
   | Root Directory | *(deixe vazio)* |
   | Runtime / Language | Node |
   | Build Command | `cd MathLume/Backend && npm install` |
   | Start Command | `cd MathLume/Backend && npm start` |
   | Region | Ohio (mesma região do Neon) |
   | Instance Type | Free |
4. **Environment Variables**:
   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string do Neon |
   | `ADMIN_SENHA` | uma senha forte (só usada se o banco não tiver nenhum ADM) |
   | `TRUST_PROXY` | `1` |
   | `NODE_VERSION` | `22` |
   (Não crie `PORT`: o Render define sozinho.)
5. Em **Advanced → Health Check Path**: `/api/saude`.
6. **Create Web Service**. Em ~3 minutos o site fica em `https://<nome>.onrender.com`. HTTPS já vem pronto.

## 4. Alterar o site depois
Edite → teste com `npm start` → `git push`. O Render publica sozinho (Auto-Deploy fica ligado por padrão).
Para testar sem mexer nos dados reais: crie uma branch no Neon e use a URL dela só no seu `.env`.

## Limites do plano grátis (bom para projeto de faculdade)
- **Render Free**: o site "dorme" após 15 min sem visitas; a primeira visita depois disso demora ~1 min.
  750 horas/mês por conta. Para tirar a espera, o plano pago mais barato resolve.
- **Neon Free**: 1 GB de armazenamento por projeto e 100 CU-horas/mês; o banco
  dorme após 5 min parado e acorda em ~1 s (o código já lida com isso).
  Por isso a rota `/api/saude` não toca no banco: assim a checagem do Render não mantém o Neon acordado à toa.

## Opcional
- **Domínio próprio** (ex.: mathlume.com.br): compre no registro.br e, no Render, vá em
  Settings → Custom Domains e siga as instruções de DNS.
- **Repositório privado**: o Render publica repositórios privados também; recomendado para um projeto com contas de usuários.
