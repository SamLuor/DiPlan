# RBAC completo (CASL) — Spec

> Documento de especificação, seguindo Spec Driven Development (`CLAUDE.md`). Reverte a decisão M1-lite documentada em `domain-info/domain-system.md` Seção 2 ("sem RBAC por enquanto") — decisão explícita do usuário, tomada em `feature/rbac-casl` (branch separada de `master`, que já tem as Tarefas 1 e 2 — comentários com anexo real e status automático de plano).

## Perfis

Três perfis (`usuarios.perfil`), mapeados 1:1 das Seções 3.1–3.3 do documento fonte:

- **Diretoria** — acesso total, equivalente a `can('manage', 'all')`.
- **Chefia** — escopo limitado ao(s) eixo(s) do(s) qual(is) é chefia (`eixos.chefiaUserId`, não necessariamente o mesmo eixo ao qual o próprio usuário está vinculado).
- **Operacional** — escopo limitado às entregas das quais é responsável (`entregas.responsavelUserId`).

## Duas contradições do documento fonte — resolvidas aqui

O documento fonte (Seções 3 e 4) tem duas inconsistências internas envolvendo o perfil Operacional. Resolvidas assim, por decisão do usuário (confirmada antes da implementação):

1. **"Editar o descritivo da própria entrega"** — a matriz da Seção 4 diz que Operacional **não** pode; a prosa da Seção 3.3 diz explicitamente que pode ("atualizar o descritivo da entrega"). **Resolução**: Operacional **pode** editar entregas das quais é responsável (segue a prosa, mais específica) — não pode editar entregas de terceiros.
2. **"Criar entrega... com aprovação"** — não existe fluxo de aprovação implementado no sistema hoje. **Resolução**: Operacional **não pode** criar entrega, por enquanto. (Nota: existe uma spec separada, `domain-info/spec-task-aprovacao-entrega.md`, desenhando esse fluxo de aprovação de verdade — fica para uma tarefa futura à parte, não faz parte deste RBAC.)

## Matriz → regras CASL

| Ação (Seção 4) | Diretoria | Chefia | Operacional | Regra CASL (Chefia/Operacional) |
|---|---|---|---|---|
| Ver todas as entregas da Unidade | Sim | Não | Não | — |
| Ver entregas da própria equipe | Sim | Sim | Só quando participa | Chefia: `read Entrega` com `eixoId ∈ eixosChefiados`. Operacional: `read Entrega` com `responsavelUserId = self` |
| Ver só as próprias entregas | Sim | Sim | Sim | (coberto acima) |
| Criar plano | Sim | Sim | Não | Chefia: `create Plano` com `eixoId ∈ eixosChefiados` |
| Editar plano | Sim | Sim | Não | Chefia: `update Plano` com `eixoId ∈ eixosChefiados` |
| Excluir plano | Sim | Sim | Não | Chefia: `delete Plano` com `eixoId ∈ eixosChefiados` (não há exclusão de plano implementada hoje no sistema — regra registrada, sem endpoint pra aplicar ainda) |
| Criar entrega | Sim | Sim | **Não** (contradição 2) | Chefia: `create Entrega` com `eixoId ∈ eixosChefiados` |
| Editar descritivo da própria entrega | Sim | Sim | **Sim, se responsável** (contradição 1) | Chefia: `update Entrega` com `eixoId ∈ eixosChefiados`. Operacional: `update Entrega` com `responsavelUserId = self` |
| Alterar prazo oficial | Sim | Sim | Não | Chefia: `update Entrega` (mesmo escopo acima) — Operacional explicitamente sem essa ação |
| Excluir entrega | Sim | Sim | Não | Chefia: `delete Entrega` com `eixoId ∈ eixosChefiados` |
| Iniciar entrega | Sim | Sim | Sim | Operacional: `iniciar Entrega` com `responsavelUserId = self` |
| Registrar andamento | Sim | Sim | Sim | Operacional: `registrarAndamento Entrega` com `responsavelUserId = self` |
| Inserir anexos | Sim | Sim | Sim | Operacional: `anexar Entrega` com `responsavelUserId = self` |
| Delegar atividade específica | Sim | Sim | Sim | Operacional: `delegar Entrega` com `responsavelUserId = self` |
| Solicitar revisão | Sim | Sim | Sim | Operacional: `solicitarRevisao Entrega` com `responsavelUserId = self` |
| Informar conclusão | Sim | Sim | Sim | Operacional: `concluir Entrega` com `responsavelUserId = self` |
| Reabrir entrega concluída | Sim | Sim | Não | Chefia: `reabrir Entrega` com `eixoId ∈ eixosChefiados` |
| Ver relatórios gerais | Sim | Não | Não | (sem tela de relatórios implementada ainda — regra registrada) |
| Ver relatório da unidade | Sim | Sim | Não | Chefia: `ver-unidade Relatorio` |
| Ver relatório individual | Sim | Sim | Sim | Operacional: `ver-individual Relatorio` |
| Administrar usuários e unidades | Sim | Não | Não | — (Diretoria only) |
| Administrar tipos e diretrizes | Sim | Não | Não | — (Diretoria only; sem cadastro de tipos/diretrizes implementado ainda) |

## Escopo de Chefia

`eixosChefiados` = lista de `eixos.id` onde `eixos.chefiaUserId === usuario.id`, resolvida contra a lista global de usuários — mesma lógica já usada em `isChefiaAtual` (`src/server/core/shared/rules.ts`). **Não** é necessariamente o `usuarios.eixoId` do próprio usuário — uma chefia é definida por eixo, não por vínculo pessoal.

## Visibilidade (leitura) — filtrada nas listagens, não só nas ações

A matriz da Seção 4 fala de ações de escrita, mas a leitura também precisa respeitar o mesmo escopo — senão a UI mostraria dado que o usuário não tem permissão de ver. Aplicado em `listEixosFn`, `listPlanosFn`, `listEntregasFn` e `getEntregaFn`:

- **Eixos**: Diretoria vê todos; Chefia vê só o(s) eixo(s) do(s) qual(is) é chefia (`eixosChefiados`); Operacional vê só o próprio eixo (`usuarios.eixoId`).
- **Planos**: Diretoria vê todos; Chefia vê só os planos do(s) eixo(s) que chefia; Operacional vê só planos que tenham ao menos uma entrega da qual ele é responsável (`planosComEntregaPropria`, calculado em `requireActorWithAbility`/`useAbility`, já que não dá pra expressar isso como condição de campo direto no CASL — é uma relação com outra entidade).
- **Entregas**: Diretoria vê todas; Chefia vê as do(s) eixo(s) que chefia; Operacional vê só as próprias (`responsavelUserId = self`). `getEntregaFn` devolve `null` (não um erro) quando o usuário não tem acesso — não revela se a entrega existe.

## Vínculo usuário ↔ chefia (na criação/edição do usuário)

Chefia só pode ser de **um** eixo — o próprio eixo do usuário (`usuarios.eixoId`), reforçando a Regra 1/2 da Seção 20 do documento fonte. Em vez de só editável na tela do eixo, `createUsuario`/`updateUsuario`/`updateUsuarioPerfil` (`usuario.usecases.ts#sincronizarChefia`) sincronizam automaticamente `eixos.chefiaUserId` sempre que o perfil muda:
- Definir alguém como perfil Chefia → vira chefia do próprio eixo (removendo qualquer outro eixo onde ainda constasse como chefia).
- Tirar alguém do perfil Chefia (ou apagar/trocar seu eixo) → o `chefiaUserId` do eixo onde ele era chefia é limpo.

## Diretoria não precisa de eixo

`usuarios.eixo_id` é **nullable** — só faz sentido ficar nulo pra Diretoria (acesso total, sem vínculo com um setor específico). Chefia e Operacional continuam exigindo eixo obrigatório (Regra 1, Seção 20).

## O que fica fora deste primeiro RBAC

- Fluxo de aprovação de entregas (`spec-task-aprovacao-entrega.md`) — tarefa futura separada.
- Exclusão de plano (não implementada em nenhum lugar do sistema hoje — a regra CASL existe na tabela acima só como referência, sem endpoint).
- Relatórios (nenhuma tela existe ainda — regras registradas pra quando a feature existir).
- Notificações — fora de escopo total (Seção 2 do `domain-system.md`).
