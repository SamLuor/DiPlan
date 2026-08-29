export const weekdayShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const mesesLong = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay())
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

export function formatDateTime(value: Date | string): string {
  const dt = value instanceof Date ? value : new Date(value)
  return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatPrazo(inicio?: string | null, fim?: string | null): string {
  const a = inicio ? formatDateShort(inicio) : '?'
  const b = fim ? formatDateShort(fim) : '?'
  return `${a} a ${b}`
}
