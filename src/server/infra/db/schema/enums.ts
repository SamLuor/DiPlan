import { pgEnum } from 'drizzle-orm/pg-core'

export const userModoEnum = pgEnum('user_modo', ['senha', 'convite'])
export const statusPlanoEnum = pgEnum('status_plano', ['planejado', 'execucao', 'concluido'])
export const situacaoEntregaEnum = pgEnum('situacao_entrega', ['aguardando', 'andamento', 'concluida'])
export const prioridadeEnum = pgEnum('prioridade', ['baixa', 'normal', 'alta', 'urgente'])
export const notaTipoEnum = pgEnum('nota_tipo', ['manual', 'sistema'])
export const solicitacaoTipoEnum = pgEnum('solicitacao_tipo', [
  'revisao',
  'manifestacao',
  'complementacao',
  'analise',
  'elaboracao',
  'aprovacao',
])
