export type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente'
export type SituacaoEntrega = 'aguardando aprovação' | 'aguardando' | 'andamento' | 'concluida'
export type SolicitacaoTipo = 'revisao' | 'manifestacao' | 'complementacao' | 'analise' | 'elaboracao' | 'aprovacao'

export interface Entrega {
  id: string
  titulo: string
  descricao: string
  planoId: string
  dataInicio: string | null
  dataPrevista: string | null
  prioridade: Prioridade
  responsavelUserId: string | null
  situacao: SituacaoEntrega
  /** Contagem de anexos — a lista enxuta (kanban/calendário) não traz os anexos inteiros, só a contagem para o indicador do card. */
  anexosCount: number
}

export interface Anexo {
  id: string
  nome: string
  contentType: string
  tamanho: number
}

export interface NovoAnexoInput {
  key: string
  nome: string
  contentType: string
  tamanho: number
  notaId?: string | null
}

export interface Nota {
  id: string
  texto: string
  autor: string
  autorUserId: string | null
  tipo: 'manual' | 'sistema'
  proximoPasso: string | null
  anexo: Anexo | null
  editado: boolean
  excluido: boolean
  dataHora: Date
}

export interface SolicitacaoResposta {
  userId: string
  respondeu: boolean
  respondidoEm: Date | null
}

export interface Solicitacao {
  id: string
  tipo: SolicitacaoTipo
  descricao: string
  prazo: string | null
  prioridade: Prioridade
  criadoEm: Date
  responsaveis: SolicitacaoResposta[]
}

export interface EntregaDetalhada extends Entrega {
  anexos: Anexo[]
  notas: Nota[]
  solicitacoes: Solicitacao[]
}

export interface EntregaInput {
  titulo: string
  descricao: string
  planoId: string
  dataInicio: string | null
  dataPrevista: string | null
  prioridade: Prioridade
  responsavelUserId: string | null
  /** Só setado explicitamente no fluxo de aprovação (Operacional cria como 'aguardando aprovação'); senão usa o default do banco ('aguardando'). */
  situacao?: SituacaoEntrega
}

export interface NovaNotaInput {
  texto: string
  autor: string
  autorUserId?: string | null
  tipo: 'manual' | 'sistema'
  proximoPasso?: string | null
}

export interface NovaSolicitacaoInput {
  tipo: SolicitacaoTipo
  descricao: string
  prazo: string | null
  prioridade: Prioridade
  responsavelIds: string[]
}

export interface EntregaRepository {
  findAll(): Promise<Entrega[]>
  findByPlano(planoId: string): Promise<Entrega[]>
  findById(id: string): Promise<EntregaDetalhada | null>
  create(data: EntregaInput): Promise<Entrega>
  update(id: string, patch: Partial<EntregaInput>): Promise<Entrega | null>
  updateSituacao(id: string, situacao: SituacaoEntrega): Promise<Entrega | null>

  addNota(entregaId: string, nota: NovaNotaInput): Promise<Nota>
  findNotaById(notaId: string): Promise<Nota | null>
  editNota(notaId: string, texto: string): Promise<Nota | null>
  softDeleteNota(notaId: string): Promise<void>

  addAnexo(entregaId: string, data: NovoAnexoInput): Promise<Anexo>
  removeAnexo(anexoId: string): Promise<void>
  findAnexoForDownload(anexoId: string): Promise<{ key: string; nome: string } | null>
  findAnexoIdByNota(notaId: string): Promise<string | null>

  addSolicitacao(entregaId: string, data: NovaSolicitacaoInput): Promise<Solicitacao>
  responderSolicitacao(solicitacaoId: string, userId: string): Promise<void>
}
