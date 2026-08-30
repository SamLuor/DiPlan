# Gestão de Entregas (Agenda DiPlan) — Fonte de verdade para desenvolvimento

> Este documento existe para orientar o Claude Code na continuidade do desenvolvimento.
> **Regra fundamental: o documento original do cliente (Seção "Documento fonte" abaixo) é a única fonte de verdade absoluta sobre regras de negócio.**
> Este arquivo interpreta, prioriza e adapta esse documento para o escopo reduzido (M1-lite) que está sendo construído primeiro — mas nunca o substitui. Em caso de dúvida ou conflito, o documento original prevalece.

---

## 1. Contexto do projeto

- **Nome do sistema (documento original):** Agenda DiPlan
- **Nome do sistema (protótipo/produto em construção):** Gestão de Entregas
- **Cliente:** setor administrativo interno (não é obra/construção civil/engenharia — entregas são documentos, relatórios, ofícios, reuniões, análises de escritório)
- **Stack de desenvolvimento:** TanStack Start (hybrid rendering, unificando back e front), auxílio de Claude Code
- **Prazo do primeiro ciclo real:** entrega funcional até 07–08/09, para a cliente já cadastrar as entregas antes do início do período de uso
- **Prototipagem visual:** feita no Claude Design (HTML/JS declarativo com `sc-if`/`sc-for`), servindo como referência de UI/UX e de fluxo de dados — **não é o código de produção**, mas define o padrão visual e a estrutura de estado a seguir

### 1.1. Mapeamento de terminologia

O documento original usa "unidade". O produto em construção usa **"eixo"** como sinônimo direto — são o mesmo conceito. Sempre que o documento disser "unidade", ler como "eixo" no contexto de implementação.

---

## 2. Decisões de escopo — o que foi reduzido do documento original (aprovado pela cliente)

O documento original descreve um sistema completo com RBAC de 3 níveis, colaboração robusta, dashboards, relatórios etc. A cliente pediu explicitamente, em reunião de alinhamento (áudio), um primeiro ciclo bem mais enxuto. As decisões abaixo são **desvios deliberados e aprovados**, não esquecimentos:

| Decisão | O que o documento original pedia | O que foi decidido para o 1º ciclo |
|---|---|---|
| Controle de acesso | RBAC completo (Diretoria/Chefia/Operacional) com matriz de permissões (Seções 3, 4) | **✅ Implementado** (branch `feature/rbac-casl`, ver `domain-info/rbac-spec.md`) — CASL, três perfis, escopo de Chefia por eixo (`eixos.chefiaUserId`), escopo de Operacional por responsabilidade (`entregas.responsavelUserId`). Duas contradições internas do documento fonte (Seção 3.3 vs. Seção 4) resolvidas e documentadas no spec |
| Eixos/unidades | Estrutura hierárquica entre unidades | Lista plana e livre de eixos, sem hierarquia entre eles |
| Vínculo usuário-eixo | Regra 1, Seção 20: "cada usuário deverá estar vinculado a uma unidade" (singular) | **Confirmado e respeitado**: 1 usuário → 1 eixo. (Uma sugestão anterior de permitir múltiplos vínculos foi descartada por não estar no documento) |
| Chefia | Regra 2, Seção 20: "cada unidade deverá possuir uma chefia responsável" | A chefia é definida na tela do eixo (campo `chefiaUserId` apontando para um usuário já vinculado àquele eixo) — não é um atributo que o usuário carrega |
| Cadastro de entrega | Campos obrigatórios incluindo tipo de entrega, competência/diretriz (Seção 6.2) | Simplificado — tipo/competência/diretriz ainda não implementados como cadastro estruturado |

---

## 3. Estado atual do protótipo (o que já está construído)

Baseado na análise do protótipo em Claude Design (`Gestao_de_Entregas_dc.html` + `support.js`).

### 3.1. Autenticação
- Tela de login (e-mail/senha), "Esqueci senha", "Definir nova senha" — fluxo de UI presente, sem backend real ainda
- Sem diferenciação de perfil no login (ver Seção 2 acima)

### 3.2. Eixos
- CRUD completo (criar, editar nome)
- Campo `chefiaUserId`: select restrito a usuários já vinculados àquele eixo
- Selo "Chefia" exibido no card do usuário quando aplicável

### 3.3. Usuários
- Cadastro: nome, e-mail, senha ou modo "convite", eixo vinculado (**singular**)
- Listagem em cards com avatar (iniciais), nome, e-mail, eixo, selo de chefia

### 3.4. Planos de entrega
- CRUD: nome, eixo vinculado, data início e data fim (**obrigatórias** desde a criação)
- **Situações implementadas: Planejado / Execução / Concluído** (3 estados — o documento original pede 6: Rascunho, Aguardando início, Em execução, Encerrado, Arquivado, Cancelado — Seção 5.3. Redução deliberada, revisar se precisa expandir)
- Barra de progresso em % (proporção de entregas concluídas)
- **Status do plano é automático, não editável manualmente** (sem drag-and-drop no kanban, sem seletor no formulário): começa em "Planejado", passa a "Execução" quando uma entrega interna entra em andamento, e a "Concluído" quando a data final é atingida (checagem feita na leitura, sem job/cron — mesmo padrão do atraso automático de entregas, Seção 7.2)
- **Removida** a regra anterior "plano em Planejado bloqueia execução de suas entregas" (era uma adição do protótipo, nunca validada com a cliente) — ela entrava em conflito direto com a nova regra automática acima: se toda entrega ficasse bloqueada enquanto o plano estivesse "Planejado", nenhuma entrega jamais poderia iniciar, e o plano nunca sairia de "Planejado" sozinho

### 3.5. Entregas — cadastro e kanban
- Campos: título, descrição, data de início (opcional), prazo final, prioridade (baixa/normal/alta/urgente, com cor), responsável, anexos
- **Responsável é hoje campo de texto livre — PENDENTE: deve virar select vinculado a um usuário real do eixo** (ver Backlog, item 3)
- Quadro kanban por situação: Aguardando início / Em andamento / Concluída (situação trocada manualmente via botão de ação)
- Drag-and-drop entre colunas

### 3.6. Atraso automático (Seção 7.2 do documento — implementado)
Lógica (`isOverdue()`):
- Entrega "Aguardando início" com `dataInicio` no passado → atrasada
- Entrega "Em andamento" com `dataPrevista` (prazo final) no passado → atrasada
- Reflexo visual: borda vermelha + ícone de alerta no card do kanban e no calendário; badge "Prazo vencido" no detalhe
- **Pendente:** o documento também pede detectar atraso em colaboração/revisão não devolvida no prazo (depende do módulo de colaboração, ainda não implementado) e em conclusão fora do prazo (parcialmente coberto)

### 3.7. Timeline / Registro de andamento (Seção 8 — implementado, com uma pendência)
- Registros em ordem cronológica
- Cada registro: autor, data/hora, texto, "próximo passo" opcional, anexo opcional
- Registros automáticos do sistema: "Entrega iniciada por X", "Entrega concluída por X", "Entrega reaberta por X", mudanças de status — com estilo visual diferenciado dos manuais
- Edição de registro manual mantém tag "(editado)"
- Exclusão de registro restrita a quem é chefia do eixo daquela entrega (`isChefiaAtual()`)
- **PENDENTE CRÍTICO:** a exclusão hoje é **definitiva** (`entrega.notas.filter(...)`) — contraria a Seção 8.2, que exige que o registro exista no histórico de auditoria mesmo depois de "excluído" da visualização comum. Precisa virar soft delete (ver Backlog, item 1)

### 3.8. Anexos
- Upload real (S3, via URL pré-assinada — arquivo vai direto do navegador pro bucket, sem passar pelo servidor), múltiplo, remoção (apaga o objeto no S3 também) e download
- Bucket privado; acesso só via IAM role da instância (produção) — nada de chave/segredo fixo em env. Ver `domain-info/deploy-aws-ec2.md`
- **Sem versionamento** — o documento (Seção 10) exige manter versões anteriores ao substituir um arquivo. Não implementado (Backlog, item 8)

### 3.9. Colaboração (implementado apenas parcialmente / de forma incorreta)
- Existe hoje um campo **"Observadores"**: tags simples de nome, sem tipo de solicitação, sem prazo de retorno, sem notificação de resposta
- Isso **não corresponde** ao que a Seção 9 do documento pede (tipos de solicitação, prazo para retorno, resposta/manifestação, indicação de quem já respondeu). É um placeholder informal que precisa ser substituído (ver Backlog, item 3)

### 3.10. Calendário (Seção 14 — implementado, versão adaptada ao escopo sem RBAC)
- Visualizações: diária, semanal, mensal, período personalizado
- Navegação (anterior/próximo/hoje), legenda de cores por situação
- Filtro por eixo (chips multi-seleção)
- Grid mensal + visão agenda (lista por dia)
- Clique no item abre o detalhe da entrega
- **Não implementado (depende de módulos ausentes):** visão por nível de acesso (Operacional/Chefia/Diretoria — Seção 14 último parágrafo), marcadores de "atividades delegadas" e "revisões pendentes" (dependem do módulo de colaboração)

### 3.11. Não implementado ainda
- Dashboards (Seção 15)
- Relatórios (Seção 16)
- Notificações (Seção 17)
- Tipos de entrega, competências, diretrizes como cadastro estruturado (Seção 13)
- Pesquisa e filtros de entregas por palavra-chave, período, situação etc. no kanban (Seção 12 — hoje só o calendário tem filtro, e só por eixo)
- Justificativa obrigatória ao alterar prazo, com registro de prazo anterior/novo (Seção 18, Regra 7 da Seção 20)
- Configurações administrativas centralizadas (Seção 19) — hoje só existem telas de eixo e usuário isoladas

### 3.12. Backend + banco (novo)

- Stack: server functions do TanStack Start (`src/server/api/*.functions.ts`) + Postgres via Drizzle, em camadas `api → core → repository (interface + implementação Drizzle) → infra`. Ver `domain-info/backend-spec.md` para o contrato completo.
- Login real: senha com hash argon2id, sessão por cookie httpOnly + tabela `sessions` (token opaco, 7 dias). Ainda sem diferenciação de perfil (decisão de escopo da Seção 2).
- Schema cobre 1:1 o que já existia no front: `eixos`, `usuarios`, `planos`, `entregas`, `anexos` (só metadado), `notas` (com soft delete via `excluido`), `solicitacoes` + `solicitacao_responsaveis` (tabela de junção, substitui o mapa `respostas` do front por relação de verdade).
- `docker-compose.yml` sobe um Postgres local; `pnpm db:generate`/`db:migrate`/`db:seed` geram e aplicam a migration e populam com os mesmos dados de `src/lib/seedData.ts`.
- **Front religado**: todos os componentes/rotas usam TanStack Query contra as server functions (nada mais em `localStorage`); `useUiStore` (Zustand) ficou só para estado de UI efêmero (modais, painel de detalhe). Autenticação virou guarda real via `beforeLoad`, lendo o cookie httpOnly no servidor.
- **E-mail de definição de senha**: ao cadastrar um usuário (qualquer `modo`) ou pedir "esqueci minha senha", o sistema gera um token opaco de uso único (tabela `password_setup_tokens`, validade 2 dias) e envia um e-mail (Resend, com fallback de log no console em dev sem `RESEND_API_KEY`) com link para `/redefinir-senha?token=...`. O cadastro de usuário não tem mais campo de senha — a senha só é definida pelo próprio usuário por esse link.
- Passagem de segurança com Semgrep (`semgrep --config auto src/`) rodada sobre o código-fonte após a religação: 0 achados. Ver `domain-info/backend-spec.md` para o contrato completo e o registro de verificação.

### 3.13. RBAC completo (branch `feature/rbac-casl`)

- Três perfis (`usuarios.perfil`): Diretoria (`can('manage', 'all')`), Chefia (escopo por eixo, via `eixos.chefiaUserId`) e Operacional (escopo por `entregas.responsavelUserId`).
- Módulo isomórfico `src/lib/ability.ts` (CASL) — mesma lógica usada no servidor (enforcement, não contornável) e no client (`src/hooks/useAbility.ts`, só esconde/desabilita UI).
- Enforcement aplicado nos endpoints de criação/edição/ação de plano e entrega, e nos endpoints administrativos de usuário/eixo (`src/server/core/auth/actor.ts#requireActorWithAbility`).
- Tela nova **Perfil e Permissões** (`/app/admin/permissoes`, Diretoria-only): atribui perfil por usuário e mostra a matriz de referência.
- Duas contradições internas do documento fonte (Seção 3.3 vs. Seção 4, ambas sobre o perfil Operacional) resolvidas e documentadas em `domain-info/rbac-spec.md` — não improvisadas silenciosamente no código. A contradição 2 ("criar entrega... com aprovação") foi resolvida ali negando a criação por Operacional; a Seção 3.14 abaixo resolve isso de fato com o fluxo de aprovação.
- **Fora deste primeiro RBAC**: exclusão de plano (não implementada em nenhum lugar do sistema ainda), telas de relatórios (não existem ainda).

### 3.14. Fluxo de aprovação de entregas do Operacional (branch `feature/aprovacao-entrega`, a partir de `feature/rbac-casl`)

Spec original em `domain-info/spec-task-aprovacao-entrega.md`. Resolve de vez a contradição 2 do `rbac-spec.md` — Operacional volta a poder criar entrega, só que agora com aprovação de verdade:

- Nova situação de entrega: **"aguardando aprovação"** (`SituacaoEntrega`, antes da "Aguardando início"). Entrega criada por Operacional nasce nesse estado; criada por Chefia/Diretoria nasce direto em "Aguardando início" (não precisam se auto-aprovar).
- Enquanto pendente: Operacional pode editar (título, descrição, datas, responsável, prioridade) e ver a própria entrega, mas **não pode** mudar a situação (iniciar/concluir/reabrir bloqueados até aprovação — `performAcao`/`moveEntregaToStatus` rejeitam explicitamente).
- Aprovação (`aprovarEntrega`, verbo `aprovar` no CASL) restrita a Chefia do eixo ou Diretoria — transiciona pra "Aguardando início" (fluxo normal) e registra na timeline.
- Depois de aprovada: Operacional **perde** a edição desses mesmos campos (só Chefia/Diretoria editam a partir daí) — expresso na condição CASL do `update` (`situacao: 'aguardando aprovação'` obrigatório pra Operacional editar).
- Kanban de entregas ganhou uma 4ª coluna "Aguardando aprovação" (só leitura, sem drag) — mais a tela dedicada **Solicitações de Aprovação** (`/app/aprovacoes`, Chefia/Diretoria) agregando pendências de todos os planos, com contador no menu lateral.
- Fora de escopo (igual à spec original): notificação pra chefia/diretoria quando uma entrega entra em aprovação.

---

## 4. Backlog priorizado (próximos passos)

Ordenado por impacto na integridade dos dados e na experiência de uso diário:

1. ✅ **[Correção crítica] Soft delete na timeline** — implementado no front (`excluido: true`) e agora também no banco (coluna `notas.excluido`, ver Seção 3.12).
2. ✅ **[Correção] Responsável como vínculo real de usuário** — implementado no front (`responsavelUserId`) e no banco (FK `entregas.responsavel_user_id`).
3. ✅ **[Evolução] Colaboração/delegação/revisão real** — implementado no front ("Solicitações de colaboração": tipo, responsáveis múltiplos, prazo, prioridade, status pendente/respondida, registro automático na timeline) e no banco (`solicitacoes` + `solicitacao_responsaveis`).
4. **[Governança] Justificativa obrigatória para alteração de prazo** — registrar prazo anterior, novo prazo, autor, data/hora, justificativa (Regra 7, Seção 20; Seção 18).
5. **[Governança] Justificativa obrigatória para exclusão de entrega** — restrita a chefia/Diretoria, com motivo registrado (Regra 9, Seção 20). Depende de RBAC mínimo (ao menos identificar "chefia do eixo", que já existe).
6. **Tipos de entrega, competências e diretrizes** — cadastro estruturado (Seção 13), substituindo texto livre atual no campo tipo.
7. **Pesquisa e filtros no kanban de entregas** — por plano, período, situação, prioridade, palavra-chave (Seção 12.1, aplicável independente de RBAC).
8. **Versionamento de anexos** (Seção 10).
9. ✅ **RBAC completo** (Seções 3, 4) — implementado com CASL, branch `feature/rbac-casl`. Ver `domain-info/rbac-spec.md`.
10. **Dashboards** (Seção 15).
11. **Relatórios** (Seção 16).
12. **Notificações** (Seção 17).
13. **Configurações administrativas centralizadas** (Seção 19).

---

## 5. Regras gerais obrigatórias (Seção 20 do documento) — status de implementação

| # | Regra | Status |
|---|---|---|
| 1 | Cada usuário vinculado a uma unidade (eixo) | ✅ Implementado |
| 2 | Cada unidade (eixo) possui chefia responsável | ✅ Implementado |
| 3 | Toda entrega vinculada a um plano | ✅ Implementado |
| 4 | Toda entrega possui responsável principal e prazo final | ⚠️ Parcial — responsável já é vínculo real de usuário (Backlog #2 ✅), mas nem ele nem o prazo final são obrigatórios hoje (front e banco aceitam nulo) — exigir preenchimento é decisão de produto ainda não tomada |
| 5 | Responsável principal continua responsável ao delegar parte do trabalho | ⏸️ Depende do módulo de colaboração (Backlog #3) |
| 6 | Somente chefia e Diretoria alteram entrega e prazo oficial | ⏸️ Sem RBAC ainda — hoje qualquer usuário altera |
| 7 | Toda alteração de prazo exige justificativa | ❌ Não implementado (Backlog #4) |
| 8 | Operacional não pode excluir entregas | ⏸️ Sem RBAC ainda |
| 9 | Exclusão por chefia/Diretoria exige justificativa e fica registrada | ❌ Não implementado (Backlog #5) |
| 10 | Entregas concluídas continuam disponíveis para consulta | ✅ Implementado |
| 11 | Todo registro identifica autor, data e horário | ✅ Implementado (timeline) |
| 12 | Sistema calcula atrasos automaticamente | ✅ Implementado (Seção 7.2) |
| 13 | Visibilidade respeita hierarquia e participação do usuário | ⏸️ Sem RBAC ainda — hoje visibilidade é total |
| 14 | Cadastro de entregas e registros rápido e objetivo | ✅ Respeitado no design |
| 15 | Anexos e versões anteriores preservados | ❌ Sem versionamento (Backlog #8) |
| 16 | Delegações, revisões e colaborações vinculadas à entrega original | ⏸️ Depende do módulo de colaboração (Backlog #3) |
| 17 | Diretoria acesso completo | ⏸️ Sem RBAC ainda |
| 18 | Chefia acesso completo à sua equipe | ⏸️ Sem RBAC ainda |
| 19 | Operacional visualiza suas entregas e as que participa | ⏸️ Sem RBAC ainda |
| 20 | Reabertura/cancelamento/mudança relevante registrada no histórico | ✅ Implementado para reabertura (gera registro automático na timeline) |

---

## 6. Notas técnicas para o Claude Code

- Manter o padrão de nomenclatura já usado no protótipo: `eixo`, `plano`, `entrega`, `nota`/`registro` (timeline), `chefiaUserId`, `isOverdue`, `isChefiaAtual`.
- Ao implementar soft delete (Backlog #1), preservar a assinatura de dados já usada (`{ id, texto, autor, dataHora, tipo, editado }`), apenas adicionando `excluido: boolean` e um `excluidoPor`/`excluidoEm` para rastreabilidade.
- Ao trocar "Responsável" de texto livre para vínculo de usuário (Backlog #2), garantir migração/fallback para entregas já cadastradas com texto livre (não quebrar dados existentes).
- Qualquer nova regra de negócio implementada deve ser conferida contra a Seção correspondente do documento original antes de ser dada como concluída — **não improvisar regras que pareçam razoáveis mas não estão no documento** (ex: o bloqueio de execução de entregas em plano "Planejado" foi uma adição do protótipo que ainda não foi validada com a cliente contra o documento).

---

## 7. Documento fonte (íntegra — fonte de verdade absoluta)

> Reproduzido na íntegra abaixo. Em qualquer divergência entre este arquivo e o texto abaixo, o texto abaixo prevalece.

### Base de requisitos do sistema — Agenda DiPlan

**1. Nome do sistema:** Agenda DiPlan

**2. Objetivo geral**

O Agenda DiPlan será um sistema para planejamento, distribuição, acompanhamento e controle de todas as entregas realizadas por um setor.

O sistema deverá permitir: organizar as entregas em planos com períodos definidos; distribuir responsabilidades entre gestores, chefes e integrantes das equipes; acompanhar prazos e andamento das entregas; registrar o histórico completo de cada entrega; delegar atividades e solicitar colaboração ou revisão; armazenar documentos e anexos; visualizar compromissos em calendário; gerar relatórios gerenciais; disponibilizar painéis de acompanhamento conforme o nível de acesso do usuário; manter o histórico das entregas, inclusive depois de concluídas.

O sistema deverá ser simples, prático e rápido, evitando cadastros extensos ou excesso de informações.

**3. Estrutura organizacional**

O sistema deverá permitir reproduzir a estrutura hierárquica do setor.

**3.1. Nível estratégico — Diretoria**

A Diretoria será o nível máximo de gestão do sistema. O gestor da Diretoria deverá: visualizar todas as unidades, equipes, usuários, planos e entregas; administrar toda a estrutura organizacional; criar, editar, movimentar, ativar ou desativar unidades; cadastrar e gerenciar usuários; vincular usuários às respectivas unidades; definir chefias; criar, editar e excluir planos de entrega; criar, editar, excluir ou redistribuir entregas; alterar responsáveis e prazos; visualizar e administrar todas as configurações; cadastrar tipos de entrega, competências e diretrizes; consultar todos os relatórios, calendários e painéis; acessar o histórico completo de qualquer entrega; realizar todas as ações disponíveis aos demais níveis.

**3.2. Nível tático — Chefias (tipo 1 e 2)**

O nível tático será composto pelos responsáveis pelas unidades ou equipes subordinadas à Diretoria. O chefe deverá: visualizar todas as entregas da sua unidade ou equipe; cadastrar novas entregas; editar entregas da sua unidade e das equipes; excluir entregas, conforme as regras do sistema; definir e alterar prazos; alterar datas de início e de conclusão; designar ou substituir responsáveis; acompanhar o trabalho dos integrantes da equipe; cadastrar atividades e registros de andamento; delegar atividades; solicitar revisão ou colaboração de tarefa ou documento; visualizar o calendário da equipe; consultar relatórios e painéis da sua unidade; concluir ou reabrir entregas, quando permitido; administrar os planos da sua unidade, conforme autorização da Diretoria.

Como regra geral, a chefia deverá administrar somente a sua unidade e os usuários vinculados a ela. A Diretoria poderá conceder permissões adicionais quando necessário.

**3.3. Nível operacional — Integrantes das equipes**

O nível operacional será composto pelos usuários responsáveis pela execução das entregas. O usuário operacional deverá: visualizar as entregas sob sua responsabilidade; iniciar uma entrega; registrar o andamento do trabalho; inserir informações, observações e anexos; atualizar o descritivo da entrega; solicitar colaboração ou revisão; delegar uma atividade específica relacionada à entrega; informar que sua parte foi cumprida; marcar entrega como concluída, conforme a regra definida; consultar seu calendário, painel e relatórios individuais; pesquisar suas entregas em andamento ou concluídas; solicitar revisão e/ou colaboração em documentos (para membros da sua equipe ou de outras equipes).

O usuário operacional não poderá: excluir uma entrega; alterar o prazo oficial; alterar a data final prevista; modificar o tipo, a diretriz ou a competência da entrega sem autorização; acessar entregas de outros usuários, exceto quando participar delas; administrar unidades, equipes ou configurações gerais.

**4. Matriz básica de permissões**

| Ação | Diretoria | Chefia 1 e 2 | Operacional |
|---|---|---|---|
| Visualizar todas as entregas da Unidade | Sim | Não | Não |
| Visualizar entregas da própria equipe | Sim | Sim | Somente quando participar |
| Visualizar apenas as próprias entregas | Sim | Sim | Sim |
| Criar plano de entrega | Sim | Sim | Não |
| Editar plano | Sim | Sim | Não |
| Excluir plano | Sim | Sim | Não |
| Criar entrega | Sim | Sim | Com aprovação |
| Editar o descritivo da própria entrega | Sim | Sim | Não |
| Alterar prazo oficial | Sim | Sim | Não |
| Excluir entrega | Sim | Sim | Não |
| Iniciar entrega | Sim | Sim | Sim |
| Registrar andamento | Sim | Sim | Sim |
| Inserir anexos | Sim | Sim | Sim |
| Delegar atividade específica | Sim | Sim | Sim |
| Solicitar revisão | Sim | Sim | Sim |
| Informar conclusão | Sim | Sim | Sim |
| Reabrir entrega concluída | Sim | Sim | Não |
| Visualizar relatórios gerais | Sim | Não | Não |
| Visualizar relatório da unidade | Sim | Sim | Não |
| Visualizar relatório individual | Sim | Sim | Sim |
| Administrar usuários e unidades | Sim | Não | Não |
| Administrar tipos e diretrizes | Sim | Não | Não |

**5. Planos de entrega**

**5.1. Conceito**

O Plano de Entrega será o agrupador principal das entregas do setor durante determinado período. Exemplos: Plano de Entregas de agosto de 2026; Plano de Entregas do 3º trimestre de 2026; Plano de Entregas anual; Plano de Entregas de determinado projeto.

**5.2. Informações mínimas do plano**

Cada plano deverá conter: nome do plano; unidade responsável; período de vigência; data inicial; data final; responsável pela gestão; descrição ou objetivo, quando necessário; situação do plano; progressão do Plano (com escala em % de avanços/conclusões); entregas vinculadas.

**5.3. Situações do plano**

O plano poderá apresentar as seguintes situações: Rascunho (ainda está sendo elaborado e configurado); Aguardando início (está ativo e disponível no sistema, mas seu período de execução ainda não começou); Em execução (está dentro do período definido e possui entregas em andamento); Encerrado (seu período de execução foi concluído); Arquivado (permanece disponível somente para consulta); Cancelado (deixou de ser executado antes da sua conclusão).

**6. Entregas**

**6.1. Conceito**

A Entrega será o resultado, produto, serviço, documento ou providência que deverá ser realizado dentro de um plano. Exemplos: elaboração de um ofício; produção de um relatório; realização de uma reunião; análise de um processo; atualização de uma planilha; elaboração de uma minuta; realização de levantamento ou pesquisa.

**6.2. Cadastro rápido da entrega**

O cadastro deverá ser simples e conter apenas os dados essenciais (*obrigatório): título da entrega*; descrição resumida; plano ao qual pertence*; unidade responsável*; tipo de entrega*; competência ou diretriz relacionada*; responsável principal*; demais participantes, se houver*; data prevista para início*; prazo final*; prioridade*; anexos iniciais, quando houver.

Informações complementares poderão ficar em uma área opcional, evitando tornar o cadastro inicial demorado.

**6.3. Prioridade**

A entrega poderá ser classificada como: baixa; normal; alta; urgente. Indicar com cores no card da entrega.

**7. Situações da entrega**

O sistema deverá utilizar situações claras e, sempre que possível, calculadas automaticamente.

**7.1. Situações principais**

Aguardando início (cadastrada, mas ainda não iniciada); Em andamento (iniciada e dentro do prazo); Em andamento com atraso (iniciada, mas com prazo vencido); Aguardando colaboração (depende de atividade atribuída a outra pessoa); Aguardando revisão (documento ou resultado submetido para conferência); Aguardando retorno externo (depende de pessoa ou instituição externa); Suspensa (temporariamente interrompida); Concluída no prazo (finalizada até a data prevista); Concluída com atraso (finalizada depois do prazo); Cancelada (deixou de ser necessária).

**7.2. Identificação automática de atraso**

O sistema deverá identificar automaticamente: entrega que ainda não foi iniciada e cujo início previsto já passou; entrega em andamento cujo prazo final venceu; colaboração ou revisão que não foi devolvida no prazo; entrega concluída depois da data prevista.

A classificação do atraso não deverá depender somente de atualização manual do usuário. Todos os status devem ser mostrados no card com cores, para fácil identificação.

**8. Início e acompanhamento da entrega**

Ao abrir uma entrega, o usuário deverá encontrar o botão "Iniciar entrega". Quando esse botão for acionado, o sistema deverá: registrar quem iniciou; registrar data e horário; alterar a situação para "Em andamento"; abrir a área destinada ao acompanhamento; manter o registro na linha do tempo da entrega.

**8.1. Registro de andamento**

O nome sugerido para o histórico das ações é Registro de andamento. Na tela, ele poderá ser apresentado como uma Linha do tempo da entrega.

Cada registro deverá conter: descrição do que foi realizado; data da ação; usuário responsável pelo registro; situação ou etapa correspondente; anexos, quando houver; pessoas envolvidas; próximo passo, se informado; prazo relacionado, quando houver.

Exemplos: "Entrega iniciada"; "Realizado contato com a unidade responsável"; "Minuta do ofício elaborada"; "Documento encaminhado para revisão"; "Revisão recebida e ajustes realizados"; "Documento encaminhado ao destinatário"; "Entrega concluída".

**8.2. Regras da linha do tempo**

Os registros deverão aparecer em ordem cronológica. Cada registro deverá indicar autor, data e horário. Um registro corrigido deverá manter a informação de que houve edição. A exclusão de registros deverá ser restrita às chefias e à Diretoria. Mesmo que um registro seja excluído da visualização comum, sua existência deverá permanecer no histórico de auditoria. A linha do tempo deverá continuar disponível após a conclusão da entrega. O histórico deverá ser pesquisável a qualquer momento.

**9. Colaboração, delegação e revisão**

Qualquer usuário poderá atribuir a outra pessoa uma atividade específica relacionada à sua entrega. Exemplo: o responsável elabora um ofício e solicita que outro usuário revise o documento.

**9.1. Tipos de solicitação**

O sistema deverá permitir: solicitar revisão; solicitar manifestação; solicitar complementação; solicitar análise; solicitar elaboração de uma parte; solicitar aprovação; delegar uma atividade específica.

**9.2. Informações da solicitação**

A solicitação deverá conter: entrega de origem; tipo de colaboração; descrição do que deverá ser feito; uma ou mais pessoas responsáveis; prazo para retorno; documento ou anexo relacionado; prioridade; observações.

**9.3. Regras de funcionamento**

Uma solicitação poderá ser encaminhada para uma ou mais pessoas. A solicitação não transferirá automaticamente a responsabilidade principal pela entrega. Cada colaborador deverá receber uma atividade vinculada à entrega original. A atividade deverá aparecer no painel e no calendário do colaborador com destaque ao abrir a tela na parte superior. O colaborador poderá registrar sua manifestação e anexar a versão revisada. O responsável principal deverá ser notificado quando houver resposta. A entrega poderá ficar identificada como "Aguardando colaboração" ou "Aguardando revisão". O histórico deverá mostrar o envio, o recebimento e a conclusão da colaboração. O sistema deverá registrar atrasos nas devolutivas. Quando houver duas ou mais pessoas, deverá ficar claro quem já respondeu e quem ainda está pendente.

**10. Anexos e documentos**

O sistema deverá permitir anexar arquivos: no cadastro da entrega; em cada registro de andamento; nas solicitações de revisão ou colaboração; na conclusão da entrega.

Cada anexo deverá registrar: nome do arquivo; usuário que anexou; data e horário; registro ou atividade relacionada; versão, quando houver atualização do mesmo documento.

O sistema deverá manter as versões anteriores dos documentos, evitando que a substituição de um arquivo apague o histórico.

**11. Conclusão da entrega**

Ao finalizar o trabalho, o usuário deverá selecionar "Concluir entrega" ou "Informar conclusão". O sistema deverá solicitar: breve descrição do resultado; data da conclusão; anexo final, quando necessário; indicação de pendências, se houver; confirmação da conclusão.

Ao concluir, o sistema deverá: registrar o usuário responsável; registrar data e horário; verificar se a conclusão ocorreu dentro ou fora do prazo; atualizar automaticamente a situação; manter a entrega disponível para consulta; bloquear alterações nos dados principais.

A chefia e a Diretoria poderão reabrir uma entrega concluída. A reabertura deverá exigir justificativa e ficar registrada na linha do tempo.

**12. Pesquisa e filtros**

**12.1. Filtros do usuário operacional**

O usuário poderá filtrar suas entregas por: plano; período; situação; prazo; prioridade; tipo de entrega; diretriz ou competência; entregas concluídas; entregas pendentes; entregas atrasadas; entregas aguardando colaboração; atividades recebidas de outras pessoas; palavra-chave.

**12.2. Filtros da chefia**

Além dos filtros anteriores, a chefia poderá filtrar por: integrante da equipe; conjunto de integrantes; unidade; responsável principal; participante; entregas sem responsável; entregas próximas do vencimento; entregas com colaboração pendente.

**12.3. Filtros da Diretoria**

A Diretoria poderá utilizar todos os filtros e também pesquisar por: qualquer unidade; chefia; usuário; plano; tipo de entrega; diretriz; desempenho por unidade; quantidade de entregas por período; percentual de entregas concluídas no prazo.

**13. Tipos de entrega, competências e diretrizes**

O sistema deverá possuir uma base de classificação previamente cadastrada.

**13.1. Tipo de entrega**

Representa a natureza do trabalho. Exemplos: relatório; ofício; parecer; reunião; planejamento; análise de processo; levantamento; projeto; acompanhamento; atualização de informação.

**13.2. Competência (não obrigatório)**

Representa a atribuição institucional da unidade relacionada à entrega. Cada competência deverá estar vinculada a uma ou mais unidades.

**13.3. Diretriz (não obrigatório)**

Representa a orientação, objetivo ou linha de atuação que fundamenta a entrega. A diretriz poderá estar vinculada: à Diretoria; a uma unidade; a uma competência; a um tipo de entrega; a determinado plano.

Durante o cadastro, o sistema deverá apresentar somente as opções relacionadas à unidade e ao plano selecionados, tornando o preenchimento mais rápido.

**14. Calendário de entregas**

O sistema deverá possuir calendário com visualização: diária; semanal; mensal; por período personalizado.

O calendário deverá mostrar: início previsto; prazo final; atividades delegadas; revisões pendentes; entregas atrasadas; entregas concluídas; compromissos próximos.

As cores poderão identificar as diferentes situações, com legenda clara e acessível.

Cada nível visualizará: Operacional (suas entregas e colaborações); Chefia (calendário da sua equipe); Diretoria (calendário de todo o setor, com filtro por unidade).

**15. Dashboard**

**15.1. Dashboard operacional**

Deverá apresentar: entregas aguardando início; entregas em andamento; entregas próximas do prazo; entregas atrasadas; atividades recebidas; revisões pendentes; entregas concluídas no período; calendário resumido.

**15.2. Dashboard da chefia**

Deverá apresentar: total de entregas da equipe; entregas por integrante; entregas por situação; entregas atrasadas; entregas próximas do vencimento; solicitações de revisão pendentes; percentual de conclusão no prazo; distribuição da carga de trabalho; entregas sem movimentação recente.

**15.3. Dashboard da Diretoria**

Deverá apresentar: visão geral de todas as unidades; quantidade total de planos e entregas; desempenho por unidade; entregas concluídas dentro e fora do prazo; unidades com maior número de pendências; entregas prioritárias ou urgentes; evolução mensal; distribuição por tipo, competência e diretriz; indicadores gerais do setor.

**16. Relatórios**

O sistema deverá possuir uma área própria de relatórios.

**16.1. Relatórios individuais**

Entregas previstas; entregas em andamento; entregas concluídas; entregas atrasadas; atividades recebidas; atividades delegadas; histórico de atividades por período.

**16.2. Relatórios da chefia**

Entregas da unidade; entregas por usuário; entregas por situação; cumprimento de prazos; carga de trabalho da equipe; entregas por tipo; entregas por competência ou diretriz; colaborações e revisões pendentes.

**16.3. Relatórios da Diretoria**

Relatório consolidado de todo o setor; comparação entre unidades; evolução das entregas; cumprimento dos planos; resultados por período; entregas previstas e realizadas; indicadores de prazo; relatório por tipo, competência e diretriz.

**16.4. Períodos dos relatórios**

Os relatórios deverão permitir seleção por: semana; mês; trimestre; semestre; ano; período personalizado; período de determinado plano. Também deverão ser exportáveis, futuramente, em formatos como PDF e planilha.

**17. Notificações e alertas**

O sistema deverá notificar o usuário quando: receber uma nova entrega; receber uma solicitação de colaboração ou revisão; uma entrega estiver próxima do prazo; uma entrega ficar atrasada; o prazo for alterado; houver novo registro em entrega da qual participa; uma colaboração for respondida; uma entrega for concluída, reaberta ou cancelada; houver menção direta ao seu nome.

As notificações deverão indicar claramente: qual entrega foi alterada; quem realizou a ação; qual ação foi realizada; qual é o novo prazo, quando houver.

**18. Histórico e rastreabilidade**

O sistema deverá registrar as principais ações realizadas pelos usuários: criação; edição; alteração de prazo; mudança de responsável; delegação; envio para revisão; inclusão de anexos; conclusão; reabertura; cancelamento; exclusão.

Nenhuma alteração relevante deverá apagar completamente a informação anterior.

Especialmente quando o prazo for alterado, o sistema deverá registrar: prazo anterior; novo prazo; usuário que fez a alteração; data e horário; justificativa obrigatória.

**19. Configurações administrativas**

A Diretoria deverá possuir uma área de configurações para administrar: estrutura organizacional; unidades e equipes; usuários; níveis de acesso; chefias; planos; tipos de entrega; competências; diretrizes; prioridades; situações; regras de prazo; notificações; relatórios; parâmetros gerais do sistema.

**20. Regras gerais obrigatórias**

1. Cada usuário deverá estar vinculado a uma unidade.
2. Cada unidade deverá possuir uma chefia responsável.
3. Toda entrega deverá estar vinculada a um plano.
4. Toda entrega deverá possuir responsável principal e prazo final.
5. O responsável principal continuará responsável mesmo quando delegar parte do trabalho.
6. Somente a chefia e a Diretoria poderão alterar a entrega e seu prazo oficial.
7. Toda alteração de prazo deverá exigir justificativa.
8. O usuário operacional não poderá excluir entregas.
9. A exclusão realizada por chefia ou Diretoria deverá exigir justificativa e permanecer registrada.
10. As entregas concluídas deverão continuar disponíveis para consulta.
11. Todo registro deverá identificar autor, data e horário.
12. O sistema deverá calcular automaticamente os atrasos.
13. A visibilidade das informações deverá respeitar a hierarquia e a participação do usuário.
14. O cadastro de entregas e dos registros de andamento deverá ser rápido e objetivo.
15. Anexos e versões anteriores deverão permanecer preservados.
16. Delegações, revisões e colaborações deverão ficar vinculadas à entrega original.
17. A Diretoria deverá ter acesso completo a todas as informações.
18. A chefia deverá ter acesso completo às informações da sua equipe.
19. O usuário operacional deverá visualizar suas entregas e aquelas das quais participa.
20. Qualquer reabertura, cancelamento ou mudança relevante deverá ficar registrada no histórico.