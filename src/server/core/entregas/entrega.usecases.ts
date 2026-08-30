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
// Mesma exceção deliberada de auth.usecases.ts à regra "core não importa infra":
// gerar URL pré-assinada / apagar objeto no S3 é primitiva de infra externa,
// não regra de negócio — não compensa esconder isso atrás de uma interface aqui.
import { buildAnexoKey, createDownloadUrl, createUploadUrl, deleteObject } from '~/server/infra/storage/s3.server'

export interface Actor {
  id: string
  email: string
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

export async function createEntrega(repos: EntregaRepos, input: EntregaInput): Promise<Entrega> {
  const titulo = input.titulo.trim()
  if (!titulo || !input.planoId) throw new Error('Título e plano são obrigatórios.')
  const plano = await repos.planos.findById(input.planoId)
  if (!plano) throw new Error('Plano não encontrado.')
  validarDataDentroDoPlano(input.dataPrevista, plano)
  return repos.entregas.create({ ...input, titulo, descricao: input.descricao.trim() })
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

/**
 * Plano "planejado" bloqueia início/execução das suas entregas — regra do
 * protótipo ainda **não validada com a cliente** contra o documento fonte
 * (ver `domain-info/domain-system.md`, Seção 6).
 */
async function garantirPlanoNaoBloqueado(repos: EntregaRepos, entrega: Entrega) {
  const plano = await repos.planos.findById(entrega.planoId)
  if (plano && (plano.status ?? 'planejado') === 'planejado') {
    throw new Error('Plano planejado — execução bloqueada.')
  }
}

export async function moveEntregaToStatus(repos: EntregaRepos, id: string, status: SituacaoEntrega, actor: Actor): Promise<Entrega> {
  const entregas = await repos.entregas.findAll()
  const entrega = entregas.find((e) => e.id === id)
  if (!entrega) throw new Error('Entrega não encontrada.')
  if (entrega.situacao === status) return entrega
  await garantirPlanoNaoBloqueado(repos, entrega)
  const updated = await repos.entregas.updateSituacao(id, status)
  if (!updated) throw new Error('Entrega não encontrada.')
  await addRegistroSistema(repos, id, `Status alterado para "${situacaoLabel(status)}" por ${actor.email}.`)
  return updated
}

export async function performAcao(repos: EntregaRepos, id: string, actor: Actor): Promise<Entrega> {
  const entregas = await repos.entregas.findAll()
  const entrega = entregas.find((e) => e.id === id)
  if (!entrega) throw new Error('Entrega não encontrada.')
  await garantirPlanoNaoBloqueado(repos, entrega)

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

  const updated = await repos.entregas.updateSituacao(id, proximo)
  if (!updated) throw new Error('Entrega não encontrada.')
  await addRegistroSistema(repos, id, mensagem)
  return updated
}

export async function addNota(repos: EntregaRepos, entregaId: string, input: { texto: string; proximoPasso?: string }, actor: Actor) {
  const texto = input.texto.trim()
  if (!texto) throw new Error('Texto da nota é obrigatório.')
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

export async function createAnexoUploadUrl(repos: EntregaRepos, entregaId: string, meta: NovoAnexoMeta) {
  if (!meta.nome.trim()) throw new Error('Nome do arquivo é obrigatório.')
  if (meta.tamanho <= 0 || meta.tamanho > MAX_ANEXO_BYTES) throw new Error('Arquivo excede o tamanho máximo permitido (20MB).')
  const entrega = await repos.entregas.findById(entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')

  const key = buildAnexoKey(entregaId)
  const uploadUrl = await createUploadUrl(key, meta.contentType)
  return { key, uploadUrl }
}

/**
 * Um comentário tem no máximo um anexo: se `notaId` já tiver um anexo anterior,
 * ele é removido (S3 + banco) antes de confirmar o novo, sem depender do front
 * pra fazer essa troca em duas chamadas separadas.
 */
export async function confirmAnexoUpload(repos: EntregaRepos, entregaId: string, data: { key: string; notaId?: string | null } & NovoAnexoMeta) {
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

export async function addSolicitacao(repos: EntregaRepos, entregaId: string, input: NovaSolicitacaoInput, actor: Actor) {
  const descricao = input.descricao.trim()
  if (!descricao || input.responsavelIds.length === 0) {
    throw new Error('Descrição e ao menos um responsável são obrigatórios.')
  }
  const solicitacao = await repos.entregas.addSolicitacao(entregaId, { ...input, descricao })
  const responsaveis = await Promise.all(input.responsavelIds.map((id) => repos.usuarios.findById(id)))
  const nomes = responsaveis
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => u.nome)
    .join(', ')
  await addRegistroSistema(repos, entregaId, `Solicitação de ${solicitacaoTipoLabel(input.tipo).toLowerCase()} enviada para ${nomes} por ${actor.email}.`)
  return solicitacao
}

export async function responderSolicitacao(repos: EntregaRepos, entrega: EntregaDetalhada, solicitacaoId: string, actor: Actor) {
  const solicitacao = entrega.solicitacoes.find((s) => s.id === solicitacaoId)
  if (!solicitacao) throw new Error('Solicitação não encontrada.')
  await repos.entregas.responderSolicitacao(solicitacaoId, actor.id)
  const usuario = await repos.usuarios.findById(actor.id)
  await addRegistroSistema(
    repos,
    entrega.id,
    `Solicitação de ${solicitacaoTipoLabel(solicitacao.tipo).toLowerCase()} respondida por ${usuario ? usuario.nome : actor.email}.`,
  )
}
