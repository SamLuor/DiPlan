export interface Eixo {
  id: string
  nome: string
  chefiaUserId: string | null
}

export interface EixoRepository {
  findAll(): Promise<Eixo[]>
  findById(id: string): Promise<Eixo | null>
  create(data: { nome: string }): Promise<Eixo>
  update(id: string, data: { nome: string; chefiaUserId: string | null }): Promise<Eixo | null>
}
