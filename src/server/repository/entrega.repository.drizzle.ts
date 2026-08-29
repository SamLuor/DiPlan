import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '~/server/infra/db/client'
import { anexos, entregas, notas, solicitacaoResponsaveis, solicitacoes } from '~/server/infra/db/schema'
import type { Entrega, EntregaDetalhada, EntregaRepository, Solicitacao } from './entrega.repository'

const LIST_COLUMNS = {
  id: entregas.id,
  titulo: entregas.titulo,
  descricao: entregas.descricao,
  planoId: entregas.planoId,
  dataInicio: entregas.dataInicio,
  dataPrevista: entregas.dataPrevista,
  prioridade: entregas.prioridade,
  responsavelUserId: entregas.responsavelUserId,
  situacao: entregas.situacao,
  anexosCount: sql<number>`(select count(*)::int from ${anexos} where ${anexos.entregaId} = ${entregas.id})`.as('anexos_count'),
}

async function loadSolicitacoes(entregaId: string): Promise<Solicitacao[]> {
  const sols = await db.select().from(solicitacoes).where(eq(solicitacoes.entregaId, entregaId))
  if (sols.length === 0) return []
  const respostas = await db
    .select()
    .from(solicitacaoResponsaveis)
    .where(
      inArray(
        solicitacaoResponsaveis.solicitacaoId,
        sols.map((s) => s.id),
      ),
    )
  return sols.map((s) => ({
    ...s,
    responsaveis: respostas
      .filter((r) => r.solicitacaoId === s.id)
      .map((r) => ({ userId: r.userId, respondeu: r.respondeu, respondidoEm: r.respondidoEm })),
  }))
}

export const entregaRepository: EntregaRepository = {
  async findAll() {
    return db.select(LIST_COLUMNS).from(entregas)
  },

  async findByPlano(planoId) {
    return db.select(LIST_COLUMNS).from(entregas).where(eq(entregas.planoId, planoId))
  },

  async findById(id) {
    const [entrega] = await db.select(LIST_COLUMNS).from(entregas).where(eq(entregas.id, id)).limit(1)
    if (!entrega) return null
    const [entregaAnexos, entregaNotas, entregaSolicitacoes] = await Promise.all([
      db.select().from(anexos).where(eq(anexos.entregaId, id)),
      db.select().from(notas).where(eq(notas.entregaId, id)),
      loadSolicitacoes(id),
    ])
    const detalhada: EntregaDetalhada = { ...(entrega as Entrega), anexos: entregaAnexos, notas: entregaNotas, solicitacoes: entregaSolicitacoes }
    return detalhada
  },

  async create(data) {
    const [row] = await db.insert(entregas).values(data).returning(LIST_COLUMNS)
    return row as Entrega
  },

  async update(id, patch) {
    const [row] = await db.update(entregas).set({ ...patch, updatedAt: new Date() }).where(eq(entregas.id, id)).returning(LIST_COLUMNS)
    return row ?? null
  },

  async updateSituacao(id, situacao) {
    const [row] = await db.update(entregas).set({ situacao, updatedAt: new Date() }).where(eq(entregas.id, id)).returning(LIST_COLUMNS)
    return row ?? null
  },

  async addNota(entregaId, nota) {
    const [row] = await db
      .insert(notas)
      .values({
        entregaId,
        texto: nota.texto,
        autor: nota.autor,
        tipo: nota.tipo,
        proximoPasso: nota.proximoPasso ?? null,
        anexoNome: nota.anexoNome ?? null,
      })
      .returning()
    return row!
  },

  async editNota(notaId, texto) {
    const [row] = await db.update(notas).set({ texto, editado: true }).where(eq(notas.id, notaId)).returning()
    return row ?? null
  },

  async softDeleteNota(notaId) {
    await db.update(notas).set({ excluido: true }).where(eq(notas.id, notaId))
  },

  async addAnexos(entregaId, nomes) {
    if (nomes.length === 0) return []
    return db
      .insert(anexos)
      .values(nomes.map((nome) => ({ entregaId, nome })))
      .returning()
  },

  async removeAnexo(anexoId) {
    await db.delete(anexos).where(eq(anexos.id, anexoId))
  },

  async addSolicitacao(entregaId, data) {
    const [sol] = await db
      .insert(solicitacoes)
      .values({ entregaId, tipo: data.tipo, descricao: data.descricao, prazo: data.prazo, prioridade: data.prioridade })
      .returning()
    if (data.responsavelIds.length > 0) {
      await db.insert(solicitacaoResponsaveis).values(data.responsavelIds.map((userId) => ({ solicitacaoId: sol!.id, userId })))
    }
    return {
      ...sol!,
      responsaveis: data.responsavelIds.map((userId) => ({ userId, respondeu: false, respondidoEm: null })),
    }
  },

  async responderSolicitacao(solicitacaoId, userId) {
    await db
      .update(solicitacaoResponsaveis)
      .set({ respondeu: true, respondidoEm: new Date() })
      .where(and(eq(solicitacaoResponsaveis.solicitacaoId, solicitacaoId), eq(solicitacaoResponsaveis.userId, userId)))
  },
}
