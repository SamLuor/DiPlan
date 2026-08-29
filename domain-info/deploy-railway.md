# Deploy no Railway — homologação/demo

> Guia de deploy, seguindo Spec Driven Development (`CLAUDE.md`). Escopo: primeiro ambiente fora do localhost, pra cliente testar. Banco limpo, sem dados fictícios de teste (nada do seed de dev com 3 eixos/5 usuários/17 entregas) — só 1 eixo + 1 usuário admin, criado pelo fluxo real de convite por e-mail.

## O que sobe

Um único serviço Railway roda a aplicação (front + back, é o mesmo processo — TanStack Start). O banco é o plugin Postgres do Railway, serviço separado.

## Passo a passo

### 1. Banco

No projeto Railway: **New → Database → PostgreSQL**. Railway já expõe uma variável `DATABASE_URL` própria desse plugin — não precisa criar senha/usuário na mão.

### 2. Serviço da aplicação

**New → GitHub Repo** (conecta este repositório). O Railway detecta Node + `pnpm-lock.yaml` automaticamente (Nixpacks) e usa os scripts do `package.json`:
- Build: `pnpm run build` (`vite build && tsc --noEmit` — se o typecheck falhar, o deploy falha; isso é intencional)
- Start: `pnpm run start` (roda `drizzle-kit migrate` contra o banco de produção **antes** de subir o servidor, depois `node .output/server/index.mjs`) — logo toda migration pendente é aplicada automaticamente a cada deploy/restart, sem passo manual

O servidor de produção (Nitro) já lê `PORT`/`HOST` do ambiente sozinho — o Railway injeta isso automaticamente, não precisa configurar.

### 3. Variáveis de ambiente do serviço da aplicação

No painel do serviço (Variables), configurar:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Referenciar a do plugin Postgres: `${{Postgres.DATABASE_URL}}` (Railway resolve automaticamente ao linkar os dois serviços) |
| `SESSION_SECRET` | Gerar com `openssl rand -hex 32` — qualquer valor forte serve, não precisa guardar/lembrar |
| `APP_URL` | O domínio público que o Railway gerar pro serviço (`https://xxxxx.up.railway.app`), ou o domínio customizado se configurar um |
| `RESEND_API_KEY` | A chave real do Resend (a mesma usada em dev, ou uma dedicada a este ambiente) |
| `RESEND_FROM` | Remetente verificado no Resend — **atenção**: `onboarding@resend.dev` (padrão de dev) só entrega pro e-mail da própria conta Resend; em homologação isso já pode ser um problema se o admin cadastrado não for esse e-mail. Melhor verificar um domínio no Resend, ou usar como `HOMOLOG_ADMIN_EMAIL` (passo 4) o e-mail da conta Resend enquanto o domínio não é verificado |
| `NODE_ENV` | `production` (o cookie de sessão só fica `secure: true` com isso — ver `session.server.ts`) |

### 4. Seed do usuário admin (uma vez, após o primeiro deploy)

Não roda automaticamente (diferente das migrations) — é intencional, pra não recriar o eixo/usuário a cada restart. Via Railway CLI, depois do primeiro deploy:

```bash
railway link              # conecta o CLI a este projeto Railway
railway run --service <nome-do-serviço> \
  env HOMOLOG_ADMIN_EMAIL=email-do-admin@dominio.com \
  pnpm db:seed:homolog:prod
```

Isso cria 1 eixo ("Administração") + 1 usuário (chefia desse eixo, modo convite) e dispara o e-mail real de definição de senha pro endereço informado. Sem `RESEND_API_KEY` configurada (não deveria ser o caso em homologação), o link cai no log do serviço — visível em **Deployments → View Logs** no painel do Railway.

Repetir o `railway run` com um e-mail diferente (ou apagar o usuário pelo próprio app depois) se quiser recriar o admin.

## Diferença entre os dois seeds

| | `db:seed` (dev) | `db:seed:homolog:prod` |
|---|---|---|
| Dados | 3 eixos, 5 usuários, 4 planos, 17 entregas, notas, anexos — fictícios, pra testar a UI localmente | 1 eixo, 1 usuário — mínimo pra cliente começar a cadastrar o resto pelo sistema |
| Senha do usuário | Já vem pronta (`trocar123`), inserção direta no banco | Não tem senha — só é criado, e-mail real de definição de senha é enviado (mesmo fluxo de produção) |
| Uso | `localhost`, banco local via `docker-compose.yml` | Ambiente hospedado (Railway ou outro), banco real |

## Verificação após o deploy

- `railway logs` ou o painel: build e start sem erro, migrations aplicadas (log do `drizzle-kit migrate`).
- Abrir `APP_URL` no navegador: tela de login carrega, sem 500.
- Rodar o seed (passo 4), conferir que o e-mail chegou (ou o link apareceu no log), abrir o link, definir senha, logar.
- Confirmar que criar eixo/plano/entrega pelo app funciona contra o Postgres do Railway (não é dado fictício de seed).
