import type { Entrega } from '~/server/repository/entrega.repository'
import type { Plano } from '~/server/repository/plano.repository'
import type { Eixo } from '~/server/repository/eixo.repository'
import type { Usuario } from '~/server/repository/usuario.repository'

/**
 * Portado de `src/lib/domain.ts` (front) — Seção 7.2 do documento fonte
 * (`domain-info/domain-system.md`): identificação automática de atraso.
 */
export function isOverdue(entrega: Entrega): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (entrega.situacao === 'aguardando' && entrega.dataInicio) {
    if (new Date(entrega.dataInicio + 'T00:00:00') < today) return true
  }
  if (entrega.situacao === 'andamento' && entrega.dataPrevista) {
    if (new Date(entrega.dataPrevista + 'T00:00:00') < today) return true
  }
  return false
}

/**
 * Portado de `src/lib/domain.ts` — usado para restringir exclusão de nota
 * (Seção 8.2: exclusão restrita à chefia do eixo) e para "quem pode responder"
 * numa solicitação de colaboração.
 */
export function isChefiaAtual(eixo: Eixo | null, usuarios: Usuario[], loginEmail: string): boolean {
  if (!eixo || !eixo.chefiaUserId) return false
  const chefia = usuarios.find((u) => u.id === eixo.chefiaUserId)
  if (!chefia) return false
  return chefia.email.trim().toLowerCase() === (loginEmail || '').trim().toLowerCase()
}

const SITUACAO_LABEL: Record<Entrega['situacao'], string> = {
  'aguardando aprovação': 'Aguardando aprovação',
  aguardando: 'Aguardando início',
  andamento: 'Em andamento',
  concluida: 'Concluída',
}

export function situacaoLabel(situacao: Entrega['situacao']): string {
  return SITUACAO_LABEL[situacao]
}

const SOLICITACAO_TIPO_LABEL: Record<string, string> = {
  revisao: 'Revisão',
  manifestacao: 'Manifestação',
  complementacao: 'Complementação',
  analise: 'Análise',
  elaboracao: 'Elaboração de uma parte',
  aprovacao: 'Aprovação',
}

export function solicitacaoTipoLabel(tipo: string): string {
  return SOLICITACAO_TIPO_LABEL[tipo] ?? tipo
}

export function planoProgress(plano: Plano, entregas: Entrega[]): { total: number; percent: number } {
  const entregasPlano = entregas.filter((en) => en.planoId === plano.id)
  const total = entregasPlano.length
  const concluidas = entregasPlano.filter((en) => en.situacao === 'concluida').length
  const percent = total > 0 ? Math.round((concluidas / total) * 100) : 0
  return { total, percent }
}
