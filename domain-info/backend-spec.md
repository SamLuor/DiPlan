# Backend + banco — Spec

> Documento de especificação do backend, seguindo Spec Driven Development (`CLAUDE.md`). Escopo: só o que já existia no front original (`src/lib/types.ts`, `src/store/slices/*` — ambos removidos após a religação, ver "Front religado" abaixo) — sem RBAC, dashboards, relatórios, notificações, versionamento de anexo etc. Ver `domain-info/domain-system.md` para o domínio completo e as decisões de escopo do projeto.

## Stack

- **Runtime**: server functions do TanStack Start (`createServerFn`, `src/server/api/*.functions.ts`).
- **Banco**: Postgres 16 (local via `docker-compose.yml`).
- **ORM**: Drizzle (`src/server/infra/db/schema/*`).
- **Auth**: sessão por cookie httpOnly + tabela `sessions` (token opaco), senha com argon2id.
- **Data fetching (front)**: TanStack Query, integrado ao router via `@tanstack/react-router-ssr-query` (`setupRouterSsrQueryIntegration`). `useUiStore` (Zustand) continua só para estado de UI efêmero (modais, painel de detalhe).
- **E-mail**: Resend (`RESEND_API_KEY` em env); sem a env var, cai em fallback que loga o link no console do servidor.

## Camadas

```
src/server/
  api/         server functions (validação zod, sem acesso a Drizzle)
  core/        regras de negócio (recebe repository por parâmetro, sem import de infra — exceto auth)
  repository/  interface (*.repository.ts) + implementação Drizzle (*.repository.drizzle.ts)
  infra/       db (client, schema, seed), auth (hash, sessão), config (env)
```

## Schema

Ver `src/server/infra/db/schema/*.ts` para a definição completa (Drizzle). Resumo:

| Tabela | Campos principais | FKs |
|---|---|---|
| `eixos` | nome, chefia_user_id | → usuarios (set null) |
| `usuarios` | nome, email (unique), senha_hash (nullable), modo, eixo_id | → eixos (cascade) |
| `planos` | nome, eixo_id, status, data_inicio, data_fim | → eixos (cascade) |
| `entregas` | titulo, descricao, plano_id, data_inicio, data_prevista, prioridade, responsavel_user_id, situacao | → planos (cascade), → usuarios (set null) |
| `anexos` | entrega_id, nome (só metadado, sem upload real) | → entregas (cascade) |
| `notas` | entrega_id, texto, autor (texto livre), tipo, proximo_passo, anexo_nome, editado, **excluido** (soft delete), data_hora | → entregas (cascade) |
| `solicitacoes` | entrega_id, tipo, descricao, prazo, prioridade, criado_em | → entregas (cascade) |
| `solicitacao_responsaveis` | solicitacao_id, user_id, respondeu, respondido_em (PK composta) | → solicitacoes, usuarios (cascade) |
| `sessions` | id (token), user_id, expires_at | → usuarios (cascade) |
| `password_setup_tokens` | token (PK, opaco), user_id, expires_at, used_at (nullable) | → usuarios (cascade) |

Divergências conhecidas (deliberadas, ver `domain-system.md`):
- `responsavel_user_id` e `data_prevista` são nullable, apesar da Seção 20 regra 4 do documento fonte pedir os dois como obrigatórios — decisão de produto, não resolvida aqui.
- Sem upload real de anexo (só nome) e sem versionamento (backlog item 8 do domínio).
- `notas.autor` continua texto livre, não é FK de usuário (igual ao front hoje).

## Contrato de API (server functions)

### `auth.functions.ts`
| Função | Input | Regra |
|---|---|---|
| `loginFn` | `{ email, senha }` | busca por email, verifica hash argon2, cria sessão (cookie). Erro genérico "E-mail ou senha inválidos" (não revela qual campo errou). |
| `logoutFn` | — | apaga sessão + cookie |
| `getCurrentUserFn` | — | retorna usuário da sessão atual ou `null` |
| `requestPasswordSetupFn` | `{ email }` | sempre retorna `{ ok: true }` (não revela se o e-mail existe); se existir, gera token opaco (2 dias de validade) e envia e-mail com link `${APP_URL}/redefinir-senha?token=...`. Usada tanto por "esqueci minha senha" quanto automaticamente ao criar usuário (ver `createUsuarioFn`) |
| `validateSetupTokenFn` | `{ token }` | `{ valid: boolean }` — checa existência, não expirado, não usado. Usada pela tela de redefinir senha antes de mostrar o formulário |
| `setPasswordFn` | `{ token, senha }` | valida token, hash argon2 da nova senha (mín. 6 caracteres), grava, marca token usado (uso único) |

### `eixos.functions.ts`
| Função | Input | Regra |
|---|---|---|
| `listEixosFn` | — | lista todos |
| `createEixoFn` | `{ nome }` | nome obrigatório (trim) |
| `updateEixoFn` | `{ id, nome, chefiaUserId }` | idem |

### `usuarios.functions.ts`
| Função | Input | Regra |
|---|---|---|
| `listUsuariosFn` | — | lista todos (sem `senhaHash`) |
| `createUsuarioFn` | `{ nome, email, modo, eixoId }` | **sem campo de senha** — a senha nunca é definida no cadastro; ao criar, dispara `requestPasswordSetup(email)` automaticamente (independente do `modo`), o usuário define a própria senha pelo link recebido por e-mail |
| `updateUsuarioFn` | idem + `id` | preserva o hash de senha atual (busca por `id` via `findByIdForAuth`, não por e-mail — evita perder o hash se o e-mail for alterado na edição) |

### `planos.functions.ts`
| Função | Input | Regra |
|---|---|---|
| `listPlanosFn` | `{ eixoId? }` | filtra por eixo se informado |
| `createPlanoFn` / `updatePlanoFn` | dados do plano | valida `dataFim >= dataInicio` |
| `movePlanoToStatusFn` | `{ id, status }` | — |

### `entregas.functions.ts`
| Função | Input | Regra |
|---|---|---|
| `listEntregasFn` | `{ planoId? }` | filtra por plano ou lista tudo (calendário) |
| `getEntregaFn` | `{ id }` | inclui anexos/notas (sem excluídas na UI, mas o dado fica no banco)/solicitações |
| `createEntregaFn` | dados da entrega | valida `dataPrevista` dentro do range do plano |
| `updateEntregaFn` | patch parcial | idem, se `dataPrevista` vier no patch |
| `moveEntregaToStatusFn`, `performAcaoFn` | `{ id, status? }` | **bloqueado se o plano estiver `planejado`** (regra não validada com a cliente, ver `domain-system.md` Seção 6); gera registro automático na timeline |
| `addNotaFn`, `editNotaFn` | — | `editado=true` ao editar |
| `deleteNotaFn` | `{ entregaId, notaId }` | soft delete, **restrito a quem é chefia do eixo daquela entrega** (busca a chefia na lista global de usuários, não só nos do eixo — replica exatamente `isChefiaAtual` do front) |
| `addAnexosFn`, `removeAnexoFn` | — | só metadado |
| `addSolicitacaoFn` | `{ tipo, descricao, prazo, prioridade, responsavelIds }` | exige descrição + ao menos 1 responsável; gera registro automático |
| `responderSolicitacaoFn` | `{ entregaId, solicitacaoId }` | marca a resposta do usuário autenticado; gera registro automático |

Todas as funções que precisam saber "quem está fazendo a ação" (`moveEntregaToStatusFn`, `performAcaoFn`, `deleteNotaFn`, `addSolicitacaoFn`, `responderSolicitacaoFn`) exigem sessão ativa (lançam erro "Não autenticado." se não houver).

## Env vars relevantes ao e-mail

- `APP_URL` (default `http://localhost:3000`) — usada para montar o link `${APP_URL}/redefinir-senha?token=...`.
- `RESEND_API_KEY` (opcional) — sem ela, o mailer só loga o link no console do servidor (dev sem custo).
- `RESEND_FROM` (default `onboarding@resend.dev`) — remetente sandbox da Resend só entrega para o próprio e-mail verificado da conta até um domínio ser verificado; usar isso em mente ao testar em dev.

## Scripts

- `pnpm db:up` / `db:down` — sobe/derruba o Postgres local (docker-compose)
- `pnpm db:generate` — gera migration a partir do schema
- `pnpm db:migrate` — aplica migrations pendentes
- `pnpm db:seed` — popula com os mesmos dados de `src/lib/seedData.ts` (senha padrão dos usuários seed: `trocar123`)

## Front religado (TanStack Query)

O front (`src/routes/*`, `src/components/*`) foi religado às server functions via TanStack Query — não lê/escreve mais em `localStorage`. Removidos: `src/store/slices/*`, `useAppStore.ts`, `persistence.ts`, `lib/migrate.ts`, `lib/seedData.ts`, `lib/types.ts` (tipos agora vêm direto de `~/server/repository/*.repository`). `lib/domain.ts` continua existindo para lógica de apresentação (cores, labels, `isOverdue`/`isChefiaAtual` para exibição) — a duplicação com `server/core/shared/rules.ts` é esperada (client calcula pra exibir, server recalcula pra validar).

Autenticação passou a ser uma guarda real via `beforeLoad` das rotas (`queryClient.ensureQueryData(currentUserQueryOptions())` + `redirect`), lendo o cookie httpOnly no servidor — sem mais o hack de `hasHydrated`/flag em `localStorage`.

## Verificação feita

- `docker compose up -d` + `pnpm db:generate` + `pnpm db:migrate` + `pnpm db:seed`: schema aplicado (incluindo `password_setup_tokens`), 3 eixos / 5 usuários / 4 planos / 17 entregas / 12 notas / 5 anexos, chefias vinculadas corretamente.
- Smoke test manual chamando os `core` use-cases direto (fase de backend isolado, antes da religação do front): login com senha certa/errada, criar eixo/plano/entrega, bloqueio de execução em plano planejado, liberação após mudar status do plano, timeline (nota manual + registros automáticos), soft delete de nota restrito à chefia (achado e corrigido um bug real: a checagem de chefia estava restringindo a busca aos usuários do eixo, divergindo do front — corrigido para buscar na lista global), solicitação de colaboração + resposta. Todos os cenários passaram.
- `tsc --noEmit` e `vite build` limpos em todo o projeto (front religado + backend), sem dependências server-only (drizzle-orm, resend, argon2, pg) vazando pro bundle do client.
- `semgrep --config auto src/` (escopo correto — `.output/` são artefatos de build, não código-fonte, e derrubavam o scan por OOM ao serem incluídos; `.semgrepignore` adicionado): **0 achados**.
- Verificação end-to-end pelo navegador (login → CRUD → kanban → timeline/solicitações → e-mail de definição de senha → logout): a fazer manualmente pelo usuário (sandbox de execução sem Chrome instalado para automação via Playwright).
