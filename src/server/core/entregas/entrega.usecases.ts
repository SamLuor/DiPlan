import type { EixoRepository } from '~/server/repository/eixo.repository'
import type { PlanoRepository } from '~/server/repository/plano.repository'
import type { UsuarioRepository } from '~/server/repository/usuario.repository'
import type {
  Entrega,
  EntregaDetalhada,
  EntregaInput,
  EntregaRepository,
  NovaSolicitacaoInput,
  SituacaoEntrega,
} from '~/server/repository/entrega.repository'
import { isChefiaAtual, situacaoLabel, solicitacaoTipoLabel } from '~/server/core/shared/rules'
import { promoteToExecucaoIfNeeded } from '~/server/core/planos/plano.usecases'
// Mesma exceção deliberada de auth.usecases.ts à regra "core não importa infra":
// gerar URL pré-assinada / apagar objeto no S3 é primitiva de infra externa,
// não regra de negócio — não compensa esconder isso atrás de uma interface aqui.
import { buildAnexoKey, createDownloadUrl, createUploadUrl, deleteObject } from '~/server/infra/storage/s3.server'

export interface Actor {
  id: string
  email: string
  perfil: 'diretoria' | 'chefia' | 'operacional'
}

export interface EntregaRepos {
  entregas: EntregaRepository
  planos: PlanoRepository
  eixos: EixoRepository
  usuarios: UsuarioRepository
}

function validarDataDentroDoPlano(dataPrevista: string | null, plano: { dataInicio: string | null; dataFim: string | null }) {
  if (!dataPrevista) return
  if (plano.dataInicio && dataPrevista < plano.dataInicio) throw new Error('Data prevista anterior ao início do plano.')
  if (plano.dataFim && dataPrevista > plano.dataFim) throw new Error('Data prevista posterior ao fim do plano.')
}

/**
 * Entrega criada por Operacional nasce 'aguardando aprovação' — só Chefia/Diretoria
 * aprovam pra ela seguir o fluxo normal (ver `domain-info/spec-task-aprovacao-entrega.md`).
 */
export async function createEntrega(repos: EntregaRepos, input: EntregaInput, actor: Actor): Promise<Entrega> {
  const titulo = input.titulo.trim()
  if (!titulo || !input.planoId) throw new Error('Título e plano são obrigatórios.')
  const plano = await repos.planos.findById(input.planoId)
  if (!plano) throw new Error('Plano não encontrado.')
  validarDataDentroDoPlano(input.dataPrevista, plano)
  const situacao = actor.perfil === 'operacional' ? 'aguardando aprovação' : undefined
  const entrega = await repos.entregas.create({ ...input, titulo, descricao: input.descricao.trim(), situacao })
  if (situacao === 'aguardando aprovação') {
    await addRegistroSistema(repos, entrega.id, `Entrega criada por ${actor.email}, aguardando aprovação da chefia.`)
  }
  return entrega
}

export async function updateEntrega(repos: EntregaRepos, id: string, patch: Partial<EntregaInput>): Promise<Entrega> {
  if (patch.dataPrevista) {
    const entrega = await repos.entregas.findById(id)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await repos.planos.findById(entrega.planoId)
    if (plano) validarDataDentroDoPlano(patch.dataPrevista, plano)
  }
  const updated = await repos.entregas.update(id, patch)
  if (!updated) throw new Error('Entrega não encontrada.')
  return updated
}

async function addRegistroSistema(repos: EntregaRepos, entregaId: string, texto: string) {
  await repos.entregas.addNota(entregaId, { texto, autor: 'Sistema', tipo: 'sistema' })
}

/** Seção 20 Regra 20 estendida por delegação (spec-task-delegar-entrega.md): não conclui com pendência de terceiros. */
async function garantirDelegacoesConcluidas(repos: EntregaRepos, entregaId: string) {
  const entrega = await repos.entregas.findById(entregaId)
  if (!entrega) return
  const pendente = entrega.solicitacoes.some((s) => s.responsaveis.some((r) => r.status !== 'concluido'))
  if (pendente) throw new Error('Existem delegações desta entrega ainda não concluídas.')
}

export async function moveEntregaToStatus(repos: EntregaRepos, id: string, status: SituacaoEntrega, actor: Actor): Promise<Entrega> {
  const entregas = await repos.entregas.findAll()
  const entrega = entregas.find((e) => e.id === id)
  if (!entrega) throw new Error('Entrega não encontrada.')
  if (entrega.situacao === 'aguardando aprovação') throw new Error('Entrega aguardando aprovação — precisa ser aprovada antes de mudar de status.')
  if (entrega.situacao === status) return entrega
  if (status === 'concluida') await garantirDelegacoesConcluidas(repos, id)
  const updated = await repos.entregas.updateSituacao(id, status)
  if (!updated) throw new Error('Entrega não encontrada.')
  if (status === 'andamento') await promoteToExecucaoIfNeeded(repos.planos, entrega.planoId)
  await addRegistroSistema(repos, id, `Status alterado para "${situacaoLabel(status)}" por ${actor.email}.`)
  return updated
}

export async function performAcao(repos: EntregaRepos, id: string, actor: Actor): Promise<Entrega> {
  const entregas = await repos.entregas.findAll()
  const entrega = entregas.find((e) => e.id === id)
  if (!entrega) throw new Error('Entrega não encontrada.')
  if (entrega.situacao === 'aguardando aprovação') throw new Error('Entrega aguardando aprovação — precisa ser aprovada antes de iniciar.')

  let proximo: SituacaoEntrega
  let mensagem: string
  if (entrega.situacao === 'aguardando') {
    proximo = 'andamento'
    mensagem = `Entrega iniciada por ${actor.email}.`
  } else if (entrega.situacao === 'andamento') {
    proximo = 'concluida'
    mensagem = `Entrega concluída por ${actor.email}.`
  } else {
    proximo = 'andamento'
    mensagem = `Entrega reaberta por ${actor.email}.`
  }

  if (proximo === 'concluida') await garantirDelegacoesConcluidas(repos, id)
  const updated = await repos.entregas.updateSituacao(id, proximo)
  if (!updated) throw new Error('Entrega não encontrada.')
  if (proximo === 'andamento') await promoteToExecucaoIfNeeded(repos.planos, entrega.planoId)
  await addRegistroSistema(repos, id, mensagem)
  return updated
}

/**
 * Aprovação de entrega criada por Operacional (ver `domain-info/spec-task-aprovacao-entrega.md`).
 * Quem pode chamar isso é decidido na API layer via ability (`aprovar Entrega`, escopado por
 * eixo pra Chefia) — aqui só valida o estado e faz a transição.
 */
export async function aprovarEntrega(repos: EntregaRepos, id: string, actor: Actor): Promise<Entrega> {
  const entrega = await repos.entregas.findById(id)
  if (!entrega) throw new Error('Entrega não encontrada.')
  if (entrega.situacao !== 'aguardando aprovação') throw new Error('Esta entrega não está aguardando aprovação.')

  const updated = await repos.entregas.updateSituacao(id, 'aguardando')
  if (!updated) throw new Error('Entrega não encontrada.')
  await addRegistroSistema(repos, id, `Entrega aprovada por ${actor.email}.`)
  return updated
}

/**
 * Trava de escrita pós-delegação (spec-task-delegar-entrega.md): quem tem acesso normal à
 * entrega (responsável principal, chefia do eixo, diretoria) nunca é afetado. Quem só chegou
 * aqui via uma delegação recebida perde a escrita assim que TODAS as suas próprias delegações
 * nessa entrega estiverem concluídas — outras pessoas delegadas na mesma entrega não são afetadas.
 */
async function garantirPodeEscreverNaEntrega(repos: EntregaRepos, entrega: EntregaDetalhada, actor: Actor) {
  if (actor.perfil === 'diretoria') return
  if (entrega.responsavelUserId === actor.id) return
  const plano = await repos.planos.findById(entrega.planoId)
  const eixo = plano ? await repos.eixos.findById(plano.eixoId) : null
  if (eixo?.chefiaUserId === actor.id) return
  const minhasDelegacoes = entrega.solicitacoes.flatMap((s) => s.responsaveis.filter((r) => r.userId === actor.id))
  if (minhasDelegacoes.length === 0) return
  const temDelegacaoAberta = minhasDelegacoes.some((r) => r.status !== 'concluido')
  if (!temDelegacaoAberta) {
    throw new Error('Sua delegação nesta entrega já foi concluída — você não pode mais adicionar registros.')
  }
}

export async function addNota(repos: EntregaRepos, entregaId: string, input: { texto: string; proximoPasso?: string }, actor: Actor) {
  const texto = input.texto.trim()
  if (!texto) throw new Error('Texto da nota é obrigatório.')
  const entrega = await repos.entregas.findById(entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')
  await garantirPodeEscreverNaEntrega(repos, entrega, actor)
  const usuario = await repos.usuarios.findById(actor.id)
  return repos.entregas.addNota(entregaId, {
    texto,
    autor: usuario?.nome ?? actor.email,
    autorUserId: actor.id,
    tipo: 'manual',
    proximoPasso: input.proximoPasso?.trim() || null,
  })
}

/** Edição restrita ao próprio autor do comentário — diferente da exclusão, que é restrita à chefia (`deleteNota`). */
export async function editNota(repos: EntregaRepos, notaId: string, texto: string, actor: Actor) {
  const trimmed = texto.trim()
  if (!trimmed) throw new Error('Texto da nota é obrigatório.')
  const nota = await repos.entregas.findNotaById(notaId)
  if (!nota) throw new Error('Nota não encontrada.')
  if (nota.autorUserId !== actor.id) throw new Error('Somente o autor pode editar este comentário.')
  const updated = await repos.entregas.editNota(notaId, trimmed)
  if (!updated) throw new Error('Nota não encontrada.')
  return updated
}

/**
 * Exclusão de nota restrita a quem é chefia do eixo daquela entrega
 * (Seção 8.2 do documento fonte) — e é soft delete: `excluido=true`, nunca
 * remove a linha, preservando o histórico de auditoria.
 */
export async function deleteNota(repos: EntregaRepos, entrega: EntregaDetalhada, notaId: string, actor: Actor): Promise<void> {
  const plano = await repos.planos.findById(entrega.planoId)
  const eixo = plano ? await repos.eixos.findById(plano.eixoId) : null
  // Busca em TODOS os usuários, não só nos do eixo: a checagem original do front
  // (src/lib/domain.ts, isChefiaAtual) resolve `eixo.chefiaUserId` na lista global.
  const usuarios = await repos.usuarios.findAll()
  if (!isChefiaAtual(eixo, usuarios, actor.email)) {
    throw new Error('Somente a chefia do eixo pode excluir registros da timeline.')
  }
  await repos.entregas.softDeleteNota(notaId)
}

const MAX_ANEXO_BYTES = 20 * 1024 * 1024 // 20MB — só um limite de bom senso; a URL pré-assinada de PUT não impõe isso sozinha.

export interface NovoAnexoMeta {
  nome: string
  contentType: string
  tamanho: number
}

export async function createAnexoUploadUrl(repos: EntregaRepos, entregaId: string, meta: NovoAnexoMeta, actor: Actor) {
  if (!meta.nome.trim()) throw new Error('Nome do arquivo é obrigatório.')
  if (meta.tamanho <= 0 || meta.tamanho > MAX_ANEXO_BYTES) throw new Error('Arquivo excede o tamanho máximo permitido (20MB).')
  const entrega = await repos.entregas.findById(entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')
  await garantirPodeEscreverNaEntrega(repos, entrega, actor)

  const key = buildAnexoKey(entregaId)
  const uploadUrl = await createUploadUrl(key, meta.contentType)
  return { key, uploadUrl }
}

/**
 * Um comentário tem no máximo um anexo: se `notaId` já tiver um anexo anterior,
 * ele é removido (S3 + banco) antes de confirmar o novo, sem depender do front
 * pra fazer essa troca em duas chamadas separadas.
 */
export async function confirmAnexoUpload(repos: EntregaRepos, entregaId: string, data: { key: string; notaId?: string | null } & NovoAnexoMeta, actor: Actor) {
  const entrega = await repos.entregas.findById(entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')
  await garantirPodeEscreverNaEntrega(repos, entrega, actor)
  if (data.notaId) {
    const anteriorId = await repos.entregas.findAnexoIdByNota(data.notaId)
    if (anteriorId) await removeAnexo(repos, anteriorId)
  }
  return repos.entregas.addAnexo(entregaId, data)
}

export async function getAnexoDownloadUrl(repos: EntregaRepos, anexoId: string) {
  const anexo = await repos.entregas.findAnexoForDownload(anexoId)
  if (!anexo) throw new Error('Anexo não encontrado.')
  return createDownloadUrl(anexo.key, anexo.nome)
}

export async function removeAnexo(repos: EntregaRepos, anexoId: string) {
  const anexo = await repos.entregas.findAnexoForDownload(anexoId)
  if (anexo) await deleteObject(anexo.key)
  await repos.entregas.removeAnexo(anexoId)
}

/**
 * Delegar (criar solicitação) só é permitido dentro do próprio eixo da entrega — a colaboração
 * fica sempre dentro da equipe (spec-task-delegar-entrega.md). Quem pode delegar (responsável
 * principal/chefia/diretoria) já é resolvido na API layer via `ability.can('delegar', ...)`.
 */
export async function addSolicitacao(repos: EntregaRepos, entregaId: string, input: NovaSolicitacaoInput, actor: Actor) {
  const descricao = input.descricao.trim()
  if (!descricao || input.responsavelIds.length === 0) {
    throw new Error('Descrição e ao menos um responsável são obrigatórios.')
  }
  const entrega = await repos.entregas.findById(entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')
  const plano = await repos.planos.findById(entrega.planoId)
  if (!plano) throw new Error('Plano não encontrado.')
  const responsaveis = await Promise.all(input.responsavelIds.map((id) => repos.usuarios.findById(id)))
  if (responsaveis.some((u) => !u || u.perfil === 'diretoria' || u.eixoId !== plano.eixoId)) {
    throw new Error('Só é possível delegar para usuários do mesmo eixo da entrega.')
  }
  const solicitacao = await repos.entregas.addSolicitacao(entregaId, { ...input, descricao })
  const nomes = responsaveis
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => u.nome)
    .join(', ')
  await addRegistroSistema(repos, entregaId, `Solicitação de ${solicitacaoTipoLabel(input.tipo).toLowerCase()} enviada para ${nomes} por ${actor.email}.`)
  return solicitacao
}

export async function iniciarDelegacao(repos: EntregaRepos, solicitacaoId: string, actor: Actor) {
  const solicitacao = await repos.entregas.findSolicitacaoById(solicitacaoId)
  if (!solicitacao) throw new Error('Solicitação não encontrada.')
  const minha = solicitacao.responsaveis.find((r) => r.userId === actor.id)
  if (!minha) throw new Error('Você não é responsável por esta delegação.')
  if (minha.status !== 'aguardando') throw new Error('Esta delegação já foi iniciada.')
  await repos.entregas.iniciarDelegacao(solicitacaoId, actor.id)
  const usuario = await repos.usuarios.findById(actor.id)
  await addRegistroSistema(
    repos,
    solicitacao.entregaId,
    `Delegação de ${solicitacaoTipoLabel(solicitacao.tipo).toLowerCase()} iniciada por ${usuario ? usuario.nome : actor.email}.`,
  )
}

export async function concluirDelegacao(repos: EntregaRepos, solicitacaoId: string, actor: Actor) {
  const solicitacao = await repos.entregas.findSolicitacaoById(solicitacaoId)
  if (!solicitacao) throw new Error('Solicitação não encontrada.')
  const minha = solicitacao.responsaveis.find((r) => r.userId === actor.id)
  if (!minha) throw new Error('Você não é responsável por esta delegação.')
  if (minha.status !== 'andamento') throw new Error('Esta delegação precisa estar em andamento para ser concluída.')
  await repos.entregas.concluirDelegacao(solicitacaoId, actor.id)
  const usuario = await repos.usuarios.findById(actor.id)
  await addRegistroSistema(
    repos,
    solicitacao.entregaId,
    `Delegação de ${solicitacaoTipoLabel(solicitacao.tipo).toLowerCase()} concluída por ${usuario ? usuario.nome : actor.email}.`,
  )
}

/**
 * Reabertura restrita ao responsável principal da entrega (não chefia/diretoria, não o próprio
 * delegado) e com justificativa obrigatória — igual à reabertura de entrega (Seção 11), mas
 * aqui a justificativa é exigida de fato (spec-task-delegar-entrega.md).
 */
export async function reabrirDelegacao(repos: EntregaRepos, solicitacaoId: string, responsavelId: string, justificativa: string, actor: Actor) {
  const texto = justificativa.trim()
  if (!texto) throw new Error('Justificativa é obrigatória para reabrir uma delegação.')
  const solicitacao = await repos.entregas.findSolicitacaoById(solicitacaoId)
  if (!solicitacao) throw new Error('Solicitação não encontrada.')
  const delegacao = solicitacao.responsaveis.find((r) => r.userId === responsavelId)
  if (!delegacao) throw new Error('Delegação não encontrada.')
  if (delegacao.status !== 'concluido') throw new Error('Só é possível reabrir uma delegação concluída.')
  const entrega = await repos.entregas.findById(solicitacao.entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')
  if (entrega.responsavelUserId !== actor.id) throw new Error('Somente o responsável principal da entrega pode reabrir uma delegação.')
  await repos.entregas.reabrirDelegacao(solicitacaoId, responsavelId)
  const [delegado, responsavel] = await Promise.all([repos.usuarios.findById(responsavelId), repos.usuarios.findById(actor.id)])
  await addRegistroSistema(
    repos,
    solicitacao.entregaId,
    `Delegação de ${solicitacaoTipoLabel(solicitacao.tipo).toLowerCase()} de ${delegado ? delegado.nome : responsavelId} reaberta por ${responsavel ? responsavel.nome : actor.email}: ${texto}`,
  )
}
