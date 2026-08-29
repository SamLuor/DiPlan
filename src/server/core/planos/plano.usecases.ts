import type { Plano, PlanoInput, PlanoRepository, StatusPlano } from '~/server/repository/plano.repository'

function validarDatas(dataInicio: string | null, dataFim: string | null) {
  if (dataInicio && dataFim && dataFim < dataInicio) {
    throw new Error('A data de fim deve ser igual ou posterior ao início.')
  }
}

export async function createPlano(repo: PlanoRepository, input: PlanoInput): Promise<Plano> {
  const nome = input.nome.trim()
  if (!nome || !input.eixoId) throw new Error('Nome e eixo são obrigatórios.')
  validarDatas(input.dataInicio, input.dataFim)
  return repo.create({ ...input, nome })
}

export async function updatePlano(repo: PlanoRepository, id: string, input: PlanoInput): Promise<Plano> {
  const nome = input.nome.trim()
  if (!nome || !input.eixoId) throw new Error('Nome e eixo são obrigatórios.')
  validarDatas(input.dataInicio, input.dataFim)
  const updated = await repo.update(id, { ...input, nome })
  if (!updated) throw new Error('Plano não encontrado.')
  return updated
}

export async function movePlanoToStatus(repo: PlanoRepository, id: string, status: StatusPlano): Promise<Plano> {
  const updated = await repo.updateStatus(id, status)
  if (!updated) throw new Error('Plano não encontrado.')
  return updated
}
