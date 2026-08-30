1. Problema e objetivo

Usuários do Operacional Recorrentemente criam entregas desnecessarias que a Chefia do eixo/setor correspondente ou Diretoria acabam não aprovando e apagando causando re-trabalho

2. Personas e casos de uso

"Como usuário de perfil operacional quero criar uma entrega sem ter perigo de executar e finalizar para no final descobrir pela diretoria ou chefia que não era para atuar nessa tarefa e nem era para ela existir"
"Como usuário de perfil Chefia quero evitar ter que ficar analisando perdidamente as entregas dos planos do meu eixo entre as colunas do kanban de entregas que não fazem sentido e que não deveriam existir para poder apagar"
"Como usuário de perfil Diretoria quero evitar ter que ficar analisando perdidamente entre as colunas entregas dos planos de todos os eixos que não fazem sentido e que não deveriam existir para poder apagar"

3. Escopo

Não vai entrar notificação da chefia do operacional nem da diretoria ainda quando é criada alguma tarefa para revisão da chefia do eixo respectivo e nem da diretoria

4. Modelo de dados

export type SituacaoEntrega = 'aguardando aprovação' | 'aguardando' | 'andamento' | 'concluida'

Entrega {
  id: string
  titulo: string
  descricao: string
  planoId: string
  dataInicio: string | null
  dataPrevista: string | null
  prioridade: Prioridade
  responsavelUserId: string | null
  situacao: SituacaoEntrega
  anexosCount: number
}

5. Fluxos principais, passo a passo

Após o operacional criar uma entrega, a entrega criada vai com situação "aguardando aprovação" e cai na coluna "aguardando aprovação" esperando que a chefia do setor ou alguem da diretoria aprove e vá para "aguardando" seguindo o fluxo normal
Após a Chefia ou Diretoria aprovar a entrega algumas informações não podem ser editadas pelo operacional titulo, descrição, data de inicio e de fim, responsavel, prioridade. Mas a Chefia do setor ou diretoria pode

Dado que o usuário logado é chefia é possivel ter acesso a uma página que lista entregas criadas aguardando aprovação para facilitar visualização e não ser necessario abrir plano por plano do setor correspondente.
Dado que o usuário logado é diretoria é possivel ter acesso a uma página que lista entregas criadas aguardando aprovação para facilitar visualização e não ser necessario abrir eixo por exito e plano por plano.

6. Regras de negócio explícitas

Entregas não aprovadas não serão alteradas a situação pelo operacional;
Após aprovação o operacional não poderá alterar titulo, descrição, data de inicio e de fim, responsavel e prioridade da entrega.

7. Critérios de aceite

Dado que uma entrega foi criada pelo operacional e foi para aguardando aprovação
Quando usuário de perfil chefia do setor respectivo ou diretoria aprova essa entrega
Então essa entrega é liberada e vai para aguardando liberando execução pelo operacional

Dado que uma entrega foi criada pelo operacional e foi para aguardando aprovação
Quando usuario do perfil diretoria ou chefia do setor ainda não aprovou a entrega
Então usuário do operacional não pode alterar situação da entrega até que aprovada pela chefia ou diretoria

Dado que a chefia ou diretoria aprovou uma entrega e foi para aguardando
Quando usuario do perfil operacional for editar
Então usuário do operacional não pode alterar dados como titulo, descrição, data de inicio e de fim, responsavel e prioridade da entrega.

Dado que uma entrega foi criada pelo operacional e foi para aguardando aprovação
Quando usuário do perfil chefia respectivo ao setor logar deve ser possivel abrir tela de Solicitações de Aprovação
Então visualizar todas as entregas do setor que estão aguardando aprovação organizadas por plano

Dado que uma entrega foi criada pelo operacional e foi para aguardando aprovação
Quando usuário do perfil diretor logar deve ser possivel abrir tela de Solicitações de Aprovação
Então visualizar todas as entregas por eixo que estão aguardando aprovação organizadas por plano