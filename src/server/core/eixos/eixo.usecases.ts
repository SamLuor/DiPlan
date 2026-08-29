import type { Eixo, EixoRepository } from '~/server/repository/eixo.repository'

export async function createEixo(repo: EixoRepository, nome: string): Promise<Eixo> {
  const trimmed = nome.trim()
  if (!trimmed) throw new Error('Nome do eixo é obrigatório.')
  return repo.create({ nome: trimmed })
}

export async function updateEixo(
  repo: EixoRepository,
  id: string,
  data: { nome: string; chefiaUserId: string | null },
): Promise<Eixo> {
  const trimmed = data.nome.trim()
  if (!trimmed) throw new Error('Nome do eixo é obrigatório.')
  const updated = await repo.update(id, { nome: trimmed, chefiaUserId: data.chefiaUserId })
  if (!updated) throw new Error('Eixo não encontrado.')
  return updated
}
