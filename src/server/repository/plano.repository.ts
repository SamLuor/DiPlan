export type StatusPlano = 'planejado' | 'execucao' | 'concluido'

export interface Plano {
  id: string
  nome: string
  eixoId: string
  status: StatusPlano
  dataInicio: string
  dataFim: string
}

export interface PlanoInput {
  nome: string
  eixoId: string
  status: StatusPlano
  dataInicio: string
  dataFim: string
}

export interface PlanoRepository {
  findAll(): Promise<Plano[]>
  findById(id: string): Promise<Plano | null>
  findByEixo(eixoId: string): Promise<Plano[]>
  create(data: PlanoInput): Promise<Plano>
  update(id: string, data: PlanoInput): Promise<Plano | null>
  updateStatus(id: string, status: StatusPlano): Promise<Plano | null>
}
