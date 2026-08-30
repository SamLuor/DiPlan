### 1. Problema e objetivo

Hoje o sistema de Solicitações (`solicitacoes` + `solicitacao_responsaveis`) já permite pedir revisão/manifestação/complementação/análise/elaboração/aprovação de outra pessoa numa entrega, sem transferir a responsabilidade principal — isso já respeita a Seção 20 Regra 5 do documento fonte ("o responsável principal continuará responsável mesmo quando delegar parte do trabalho"). Mas o acompanhamento de cada pedido é só um booleano (`respondeu: true/false`), sem meio-termo, e quem recebe um pedido não tem hoje nenhum acesso formal à entrega/plano relacionado — só aparece pra quem já tinha permissão de ver aquela entrega por outro motivo (responsável, chefia do eixo, diretoria).

O objetivo é transformar cada solicitação enviada a uma pessoa numa "delegação" de verdade: com ciclo de vida próprio (aguardando/em andamento/concluída), que dá à pessoa delegada acesso a ver a entrega e o plano relacionados mesmo fora do seu escopo normal (mas sempre dentro do mesmo eixo da entrega — nunca entre eixos diferentes), mostrando pra ela só a própria delegação — e que trava a possibilidade dela mexer na entrega depois de marcar sua parte como concluída.

### 2. Personas e casos de uso

"Como responsável principal de uma entrega, quero pedir uma revisão pro Carlos sem deixar de ser o responsável — e quero continuar acompanhando tudo normalmente enquanto ele trabalha nisso."

"Como usuário delegado (recebi um pedido de revisão/manifestação/etc numa entrega que não é minha, mas do meu próprio eixo), quero enxergar a entrega e o plano relacionados o suficiente pra entender o que preciso fazer, sem ter acesso a tudo que não me diz respeito — só à minha própria delegação, não às de outras pessoas que também foram acionadas na mesma entrega."

"Como usuário delegado, quero poder marcar que comecei a trabalhar na minha parte e depois marcar que terminei, do mesmo jeito que já existe pra iniciar/concluir uma entrega inteira."

"Como responsável principal/chefia/diretoria, quero que só quem já tem autoridade sobre a entrega possa delegar tarefas relacionadas a ela — um delegado não deveria conseguir repassar acesso pra mais gente por conta própria."

"Como chefia de um eixo, quero ter certeza de que ninguém consegue delegar uma tarefa de uma entrega do meu eixo pra alguém de fora dele — a colaboração deve ficar dentro da própria equipe."

"Como responsável principal, se o Carlos marcar a delegação dele como concluída mas eu não concordar com o resultado, quero poder reabrir essa delegação — mas registrando o motivo, não só reabrindo sem explicação."

### 3. Escopo

Não entra ainda: notificação de quando alguém recebe uma delegação (mesma decisão de escopo do fluxo de aprovação — Seção 3 do `spec-task-aprovacao-entrega.md`); painel/calendário dedicado ao colaborador (Seção 15 do documento fonte — ainda não existe painel individual); cadeia de sub-delegação (um delegado não pode delegar pra outra pessoa).

### 4. Modelo de dados

export type DelegacaoStatus = 'aguardando' | 'andamento' | 'concluido'

SolicitacaoResponsavel (linha de `solicitacao_responsaveis`, hoje só `respondeu: boolean` + `respondidoEm`) {
  solicitacaoId: string
  userId: string
  status: DelegacaoStatus
  iniciadoEm: Date | null
  concluidoEm: Date | null
}

Solicitacao (sem mudança de forma, `responsaveis` passa a carregar o novo shape acima) {
  id: string
  tipo: SolicitacaoTipo
  descricao: string
  prazo: string | null
  prioridade: Prioridade
  criadoEm: Date
  responsaveis: SolicitacaoResponsavel[]
}

### 5. Fluxos principais, passo a passo

Responsável principal (ou chefia do eixo, ou diretoria) abre a entrega e cria uma solicitação, escolhendo tipo, descrição, prazo, prioridade e a(s) pessoa(s) responsável(is) — igual ao fluxo atual, mas o seletor de responsáveis só lista usuários vinculados ao mesmo eixo da entrega (a diretoria, que não é vinculada a eixo nenhum, não aparece como opção de delegado — ela já tem acesso a tudo por conta própria). Cada pessoa escolhida ganha sua própria linha em `solicitacao_responsaveis`, nascendo com status "aguardando".

A partir da criação, cada pessoa escolhida passa a enxergar a entrega e o plano relacionados, mesmo que normalmente não teria acesso (ex: Operacional do mesmo eixo, mas que não é o responsável da entrega). Dentro da tela da entrega, essa pessoa vê a lista de Solicitações filtrada — só a própria, não as de outras pessoas que também foram acionadas na mesma entrega. Quem já tinha acesso normal (responsável principal, chefia do eixo, diretoria) continua vendo a lista completa, sem filtro.

A pessoa delegada aciona "Iniciar" na própria delegação — status vai pra "em andamento", e um registro automático é criado na linha do tempo da entrega (mesmo padrão de "Entrega iniciada por X").

Enquanto a delegação está em "aguardando" ou "em andamento", a pessoa delegada pode adicionar notas/registros de andamento e anexos na entrega normalmente.

A pessoa delegada aciona "Concluir" na própria delegação — status vai pra "concluído", registro automático na linha do tempo (mesmo padrão de "Entrega concluída por X"). A partir daí, essa pessoa especificamente não consegue mais adicionar nada na timeline nem anexar arquivos nessa entrega — mas continua enxergando a entrega e a própria delegação (histórico).

Essa trava é só da pessoa que concluiu a própria delegação: outras pessoas com delegações ativas na mesma entrega não são afetadas, e o responsável principal/chefia/diretoria nunca são afetados por isso.

Se o responsável principal da entrega não concordar com a conclusão de uma delegação, ele pode reabri-la — a delegação volta pro status "em andamento" e é obrigatório informar uma justificativa. Essa justificativa entra na linha do tempo da entrega junto com o registro automático (ex: "Delegação de revisão reaberta por {responsável}: {justificativa}"). Depois de reaberta, a pessoa delegada volta a poder adicionar nota/anexo normalmente — a trava é removida.

### 6. Regras de negócio explícitas

Criar uma solicitação (delegar) é restrito a quem já tem autoridade sobre a entrega: responsável principal, chefia do eixo, ou diretoria. Um usuário que só tem acesso à entrega por conta de uma delegação recebida não pode criar novas solicitações nessa entrega.

Só é possível delegar pra usuários vinculados ao mesmo eixo da entrega — não é possível escolher como responsável de uma solicitação alguém de outro eixo. A colaboração fica sempre dentro do próprio eixo.

Cada linha de `solicitacao_responsaveis` tem status independente — uma solicitação com múltiplos responsáveis tem múltiplas delegações rodando em paralelo, cada uma no seu próprio ritmo.

Quem tem uma delegação (em qualquer status) numa entrega ganha acesso de leitura à entrega e ao plano relacionados, mesmo fora do escopo normal de visibilidade do seu perfil.

Quem só tem acesso a uma entrega por causa de uma delegação enxerga, na lista de Solicitações daquela entrega, só a própria — nunca as de outras pessoas.

Só o próprio delegado pode iniciar ou concluir a própria delegação (não é o responsável principal quem marca por ele).

Delegação só pode ir de "aguardando" pra "em andamento", e de "em andamento" pra "concluído" — não pula etapa, não volta sozinha. A única exceção é a reabertura abaixo.

Depois que a própria delegação está "concluído", o delegado não pode mais adicionar nota, registro de andamento ou anexo naquela entrega — continua podendo consultar (entrega, timeline, a própria delegação).

Só o responsável principal da entrega pode reabrir uma delegação concluída — chefia/diretoria e o próprio delegado não têm esse botão. A reabertura exige justificativa (texto obrigatório) e volta a delegação pro status "em andamento", removendo a trava de escrita do delegado.

A responsabilidade principal da entrega nunca muda por causa de uma delegação (Seção 20 Regra 5) — isso já é garantido hoje e continua sem alteração.

Não deve ser possivel concluir a entrega se alguma deleção não estiver como concluida

### 7. Critérios de aceite

Dado que sou responsável por uma entrega
Quando crio uma solicitação de revisão pro Carlos (do mesmo eixo da entrega, mas que não é responsável, chefia do eixo, nem diretoria)
Então Carlos passa a enxergar a entrega e o plano relacionados, mesmo sem ter acesso normal a eles

Dado que sou responsável por uma entrega
Quando tento criar uma solicitação escolhendo como responsável alguém de outro eixo
Então o sistema não permite — o seletor de responsáveis só mostra usuários do mesmo eixo da entrega, e a criação é rejeitada se algum id enviado não pertencer a esse eixo

Dado que Carlos recebeu uma delegação numa entrega que tem outras solicitações de outras pessoas
Quando Carlos abre a tela da entrega
Então ele vê na lista de Solicitações só a própria delegação, não as dos outros

Dado que Carlos tem uma delegação com status "aguardando" numa entrega
Quando ele tenta criar uma nova solicitação nessa mesma entrega
Então o sistema rejeita, pois só responsável principal, chefia do eixo ou diretoria podem delegar

Dado que Carlos tem uma delegação com status "aguardando"
Quando ele aciona "Iniciar"
Então o status vai para "em andamento" e um registro automático aparece na linha do tempo da entrega

Dado que Carlos tem uma delegação com status "em andamento"
Quando ele adiciona uma nota ou um anexo na entrega
Então a ação é permitida normalmente

Dado que Carlos tem uma delegação com status "em andamento"
Quando ele aciona "Concluir"
Então o status vai para "concluído" e um registro automático aparece na linha do tempo da entrega

Dado que a delegação de Carlos está "concluído"
Quando ele tenta adicionar uma nova nota ou anexo nessa entrega
Então o sistema rejeita, mas ele continua conseguindo visualizar a entrega e a própria delegação

Dado que a delegação de Carlos está "concluído" e existe outra delegação ativa de outra pessoa (ex: Maria) na mesma entrega
Quando Maria adiciona uma nota nessa entrega
Então a ação é permitida normalmente para Maria, sem nenhuma trava

Dado que a delegação de Carlos está "concluído"
Quando o responsável principal da entrega (que nunca deixou de ser responsável) adiciona uma nota ou anexo
Então a ação é permitida normalmente, sem nenhuma trava

Dado que a delegação de Carlos está "concluído" e o responsável principal não concorda com a conclusão
Quando o responsável principal reabre a delegação sem informar justificativa
Então o sistema rejeita a reabertura, exigindo o texto da justificativa

Dado que a delegação de Carlos está "concluído"
Quando o responsável principal reabre a delegação informando uma justificativa
Então o status volta para "em andamento", um registro automático com a justificativa aparece na linha do tempo, e Carlos volta a poder adicionar nota/anexo na entrega

Dado que a delegação de Carlos está "concluído"
Quando a chefia do eixo (não é o responsável principal) tenta reabrir a delegação
Então o sistema rejeita — só o responsável principal da entrega pode reabrir uma delegação
