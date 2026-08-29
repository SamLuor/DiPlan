import type { Entrega } from '~/server/repository/entrega.repository'

export type CalendarModo = 'diaria' | 'semanal' | 'mensal' | 'periodo'

export interface CalendarDateEntry {
  entrega: Entrega
  tipo: string
}

export type CalendarDateMap = Record<string, CalendarDateEntry[]>
