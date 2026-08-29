import type { Eixo } from '~/server/repository/eixo.repository'
import type { Usuario } from '~/server/repository/usuario.repository'
import type { Plano, StatusPlano } from '~/server/repository/plano.repository'
import type { Entrega, Prioridade, SolicitacaoTipo } from '~/server/repository/entrega.repository'

export interface Meta {
  label: string
  /** Tailwind classes for a light badge: background + text. */
  badgeClass: string
}

const PRIORITY_MAP: Record<Prioridade, Meta> = {
  baixa: { label: 'Baixa', badgeClass: 'bg-secondary text-secondary-foreground' },
  normal: { label: 'Normal', badgeClass: 'bg-accent text-accent-foreground' },
  alta: { label: 'Alta', badgeClass: 'bg-warning text-warning-foreground' },
  urgente: { label: 'Urgente', badgeClass: 'bg-destructive/15 text-destructive font-bold' },
}

export function priorityMeta(key: Prioridade): Meta {
  return PRIORITY_MAP[key] || PRIORITY_MAP.normal
}

const STATUS_MAP: Record<StatusPlano, Meta> = {
  planejado: { label: 'Planejado', badgeClass: 'bg-secondary text-secondary-foreground' },
  execucao: { label: 'Execução', badgeClass: 'bg-warning text-warning-foreground' },
  concluido: { label: 'Concluído', badgeClass: 'bg-accent text-accent-foreground' },
}

export function statusMeta(status: StatusPlano): Meta {
  return STATUS_MAP[status] || STATUS_MAP.planejado
}

/** Avatar background/text pairs, cycling by a hashed seed (name/id). */
const AVATAR_PALETTE = [
  'bg-accent text-accent-foreground',
  'bg-warning text-warning-foreground',
  'bg-destructive/15 text-destructive',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
]

export function hashStr(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function avatarClassFor(seed: string): string {
  return AVATAR_PALETTE[hashStr(seed) % AVATAR_PALETTE.length]!
}

export function initials(name: string | null | undefined): string {
  if (!name) return ''
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

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

export interface MarkerMeta {
  /** Tailwind classes for a light badge: background + text. */
  badgeClass: string
  /** Tailwind class for a solid dot/legend marker. */
  dotClass: string
}

export function markerMeta(entrega: Entrega): MarkerMeta {
  if (entrega.situacao === 'concluida') return { badgeClass: 'bg-accent text-accent-foreground', dotClass: 'bg-accent-foreground' }
  if (isOverdue(entrega) || entrega.prioridade === 'urgente') return { badgeClass: 'bg-destructive/15 text-destructive', dotClass: 'bg-destructive' }
  if (entrega.situacao === 'andamento') return { badgeClass: 'bg-accent text-accent-foreground', dotClass: 'bg-accent-foreground' }
  return { badgeClass: 'bg-secondary text-secondary-foreground', dotClass: 'bg-secondary-foreground' }
}

export function isChefiaAtual(
  entrega: Entrega,
  planos: Plano[],
  eixos: Eixo[],
  usuarios: Usuario[],
  loginEmail: string,
): boolean {
  const plano = planos.find((p) => p.id === entrega.planoId)
  const eixo = plano ? eixos.find((e) => e.id === plano.eixoId) : null
  if (!eixo || !eixo.chefiaUserId) return false
  const chefia = usuarios.find((u) => u.id === eixo.chefiaUserId)
  if (!chefia) return false
  return chefia.email.trim().toLowerCase() === (loginEmail || '').trim().toLowerCase()
}

export function findUsuarioByEmail(usuarios: Usuario[], email: string): Usuario | undefined {
  const target = (email || '').trim().toLowerCase()
  return usuarios.find((u) => u.email.trim().toLowerCase() === target)
}

export function eixoDaEntrega(entrega: Entrega, planos: Plano[], eixos: Eixo[]): Eixo | undefined {
  const plano = planos.find((p) => p.id === entrega.planoId)
  return plano ? eixos.find((e) => e.id === plano.eixoId) : undefined
}

const SOLICITACAO_TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  revisao: 'Revisão',
  manifestacao: 'Manifestação',
  complementacao: 'Complementação',
  analise: 'Análise',
  elaboracao: 'Elaboração de uma parte',
  aprovacao: 'Aprovação',
}

export const SOLICITACAO_TIPOS: SolicitacaoTipo[] = ['revisao', 'manifestacao', 'complementacao', 'analise', 'elaboracao', 'aprovacao']

export function solicitacaoTipoLabel(tipo: SolicitacaoTipo): string {
  return SOLICITACAO_TIPO_LABEL[tipo] || tipo
}

export function planoProgress(plano: Plano, entregas: Entrega[]): { total: number; percent: number } {
  const entregasPlano = entregas.filter((en) => en.planoId === plano.id)
  const total = entregasPlano.length
  const concluidas = entregasPlano.filter((en) => en.situacao === 'concluida').length
  const percent = total > 0 ? Math.round((concluidas / total) * 100) : 0
  return { total, percent }
}

export function entregaDatesForCalendar(en: Entrega): Array<{ date: string; tipo: string }> {
  if (en.dataInicio && en.dataPrevista && en.dataInicio !== en.dataPrevista) {
    return [
      { date: en.dataInicio, tipo: 'Início' },
      { date: en.dataPrevista, tipo: 'Prazo' },
    ]
  }
  if (en.dataPrevista) return [{ date: en.dataPrevista, tipo: 'Prazo' }]
  if (en.dataInicio) return [{ date: en.dataInicio, tipo: 'Início' }]
  return []
}
