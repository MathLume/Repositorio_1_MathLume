# Como publicar o MathLume (Neon + Vercel)

Arquitetura:
```
Jogador (navegador) ──► Vercel ──┬─ CDN: arquivos do MathLume/Frontend (HTML, CSS, JS, sons)
https://mathlume.vercel.app      └─ Função /api/... (api/index.js → MathLume/Backend/server.js) ──► Neon (PostgreSQL)
                                                                                                  usuários, ranking, sessões
GitHub ──push na main──► Vercel publica a nova versão sozinho
```

## Arquivos que fazem o Vercel funcionar (raiz do repositório)
| Arquivo | Para quê |
|---|---|
| `vercel.json` | diz ao Vercel: servir `MathLume/Frontend` como site, mandar `/api/...` para a função, abrir a tela inicial em `/` |
| `api/index.js` | a função do Vercel; só repassa a chamada para as rotas de `MathLume/Backend/server.js` |
| `package.json` / `package-lock.json` | dependências que o Vercel instala para a função (`pg`, `nodemailer`) |
| `.vercelignore` | impede que `.env` e `node_modules` sejam enviados |

O mesmo `server.js` continua funcionando no PC com `npm start` (veja `MathLume/LEIA-ME.md`).

## Variáveis de ambiente (Vercel → projeto `mathlume` → Settings → Environment Variables)
| Nome | Valor | Observação |
|---|---|---|
| `DATABASE_URL` | connection string **pooled** do Neon (tem `-pooler` no endereço) | tipo *Sensitive*; nunca coloque no GitHub |
| `TRUST_PROXY` | `1` | o limite de tentativas de login enxerga o IP real de cada jogador |
| `NODEJS_HELPERS` | `0` | o servidor lê o corpo das requisições sozinho |
| `ADMIN_SENHA` | *(opcional)* | só é usada se o banco não tiver nenhum ADM |

Mudou uma variável? Ela só vale a partir da **próxima** publicação (Deployments → ⋯ → Redeploy).

## Publicar uma alteração
1. Edite e teste no PC: `cd MathLume/Backend` → `npm start` → http://localhost:3000
2. Crie uma branch, faça o commit e abra um Pull Request no GitHub.
   O Vercel gera um **link de prévia** do PR (só membros do time Vercel conseguem abrir).
3. Ao juntar o PR na `main`, o Vercel publica em **https://mathlume.vercel.app** em 1–2 minutos.
   Os dados (contas e ranking) ficam no Neon e **não se perdem** com a publicação.

Para testar sem mexer nos dados reais: crie uma *branch* no Neon e use a URL dela só no seu `.env`.

## Neon — criar o banco (só se for recomeçar do zero)
1. Conta em **neon.com** → **Create project** → região **AWS US East 2 (Ohio)**
   (a função do Vercel roda em Cleveland, `cle1`, ao lado do Neon — definido no `vercel.json`).
2. **Connect** → deixe **Connection pooling** ligado → copie a connection string.
3. Não precisa criar tabelas: o servidor cria sozinho (`MathLume/Backend/schema.sql`).

## Limites do plano grátis (bom para projeto de faculdade e testes)
- **Vercel Hobby**: ~100 GB de tráfego/mês. Cada visita completa baixa ~14 MB (quase tudo são as
  músicas `temaGame.mp3` e `temaLob.mp3`), o que dá alguns milhares de visitas por mês.
  Uso pessoal / não comercial.
- **Neon Free**: 1 GB de armazenamento por projeto (hoje usamos ~8 MB) e 100 CU-horas/mês.
  O banco dorme quando fica parado e acorda em ~1 s (o código já lida com isso).
  A rota `/api/saude` não toca no banco, para não acordar o Neon à toa.

## Opcional
- **Domínio próprio** (ex.: mathlume.com.br): compre no registro.br e, no Vercel,
  Settings → Domains → Add, seguindo as instruções de DNS.
