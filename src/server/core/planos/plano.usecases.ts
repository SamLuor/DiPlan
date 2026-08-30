import type { Plano, PlanoInput, PlanoRepository, StatusPlano } from '~/server/repository/plano.repository'

/** Dados que o client pode enviar — `status` nunca vem do client, é sempre controlado pelo servidor. */
export type PlanoFormInput = Omit<PlanoInput, 'status'>

function validarDatas(dataInicio: string | null, dataFim: string | null) {
  if (!dataInicio || !dataFim) throw new Error('Data de início e fim são obrigatórias.')
  if (dataFim < dataInicio) throw new Error('A data de fim deve ser igual ou posterior ao início.')
}

export async function createPlano(repo: PlanoRepository, input: PlanoFormInput): Promise<Plano> {
  const nome = input.nome.trim()
  if (!nome || !input.eixoId) throw new Error('Nome e eixo são obrigatórios.')
  validarDatas(input.dataInicio, input.dataFim)
  return repo.create({ ...input, nome, status: 'planejado' })
}

export async function updatePlano(repo: PlanoRepository, id: string, input: PlanoFormInput): Promise<Plano> {
  const nome = input.nome.trim()
  if (!nome || !input.eixoId) throw new Error('Nome e eixo são obrigatórios.')
  validarDatas(input.dataInicio, input.dataFim)
  const existente = await repo.findById(id)
  if (!existente) throw new Error('Plano não encontrado.')
  // Status nunca é alterado por aqui — só pelas transições automáticas abaixo.
  const updated = await repo.update(id, { ...input, nome, status: existente.status })
  if (!updated) throw new Error('Plano não encontrado.')
  return updated
}

/** Chamado quando uma entrega do plano entra em andamento — evento único, sem necessidade de checagem preguiçosa. */
export async function promoteToExecucaoIfNeeded(repo: PlanoRepository, planoId: string): Promise<void> {
  const plano = await repo.findById(planoId)
  if (plano && plano.status === 'planejado') {
    await repo.updateStatus(planoId, 'execucao')
  }
}

/**
 * Sem cron: a conclusão por data é recalculada "preguiçosamente" sempre que o
 * plano é lido (ver `getPlanosComStatusAtualizado`), mesmo padrão já usado
 * pro atraso automático de entregas (`isOverdue`, calculado na leitura).
 */
function recalcularStatusPorData(plano: Plano): StatusPlano {
  const hoje = new Date().toISOString().slice(0, 10)
  if (plano.status !== 'concluido' && plano.dataFim && plano.dataFim < hoje) return 'concluido'
  return plano.status
}

/** Aplica o recálculo e grava (write-through) qualquer status que tenha mudado antes de devolver a lista/plano. */
export async function getPlanosComStatusAtualizado(repo: PlanoRepository, planos: Plano[]): Promise<Plano[]> {
  return Promise.all(
    planos.map(async (plano) => {
      const novoStatus = recalcularStatusPorData(plano)
      if (novoStatus === plano.status) return plano
      return (await repo.updateStatus(plano.id, novoStatus)) ?? plano
    }),
  )
}

export async function getPlanoComStatusAtualizado(repo: PlanoRepository, plano: Plano): Promise<Plano> {
  const novoStatus = recalcularStatusPorData(plano)
  if (novoStatus === plano.status) return plano
  return (await repo.updateStatus(plano.id, novoStatus)) ?? plano
}
