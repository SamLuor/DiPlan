import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { addDays, dateFromIso, formatDateShort, isoFromDate, mesesLong, startOfWeek, todayIso, weekdayShort } from '~/lib/dates'
import { entregaDatesForCalendar } from '~/lib/domain'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { entregasQueryOptions } from '~/server/api/entregas.functions'
import { useUiStore } from '~/store/useUiStore'
import { CalendarioToolbar } from '~/components/calendario/CalendarioToolbar'
import { EixoFilterChips } from '~/components/calendario/EixoFilterChips'
import { CalendarLegend } from '~/components/calendario/CalendarLegend'
import { MonthGrid } from '~/components/calendario/MonthGrid'
import { AgendaList, type AgendaDay } from '~/components/calendario/AgendaList'
import type { CalendarDateMap, CalendarModo } from '~/components/calendario/types'

export const Route = createFileRoute('/app/calendario')({
  component: CalendarioPage,
})

function CalendarioPage() {
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const { data: entregas = [] } = useQuery(entregasQueryOptions())
  const openDetail = useUiStore((s) => s.openDetail)

  const [modo, setModo] = useState<CalendarModo>('mensal')
  const [refDate, setRefDate] = useState(todayIso())
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')
  const [filtroEixos, setFiltroEixos] = useState<string[]>([])

  const dateMap: CalendarDateMap = useMemo(() => {
    const entregasComEixo = entregas.map((en) => {
      const plano = planos.find((p) => p.id === en.planoId)
      return { entrega: en, eixoId: plano ? plano.eixoId : null }
    })
    const filtered = entregasComEixo.filter(({ eixoId }) => filtroEixos.length === 0 || (eixoId && filtroEixos.includes(eixoId)))
    const map: CalendarDateMap = {}
    filtered.forEach(({ entrega }) => {
      entregaDatesForCalendar(entrega).forEach(({ date, tipo }) => {
        if (!map[date]) map[date] = []
        map[date].push({ entrega, tipo })
      })
    })
    return map
  }, [entregas, planos, filtroEixos])

  const refDateObj = dateFromIso(refDate)
  const shiftUnit = modo === 'mensal' ? 'month' : modo === 'semanal' ? 'week' : 'day'

  function shift(delta: 1 | -1) {
    const d = new Date(refDateObj)
    if (shiftUnit === 'month') d.setMonth(d.getMonth() + delta)
    else d.setDate(d.getDate() + delta * (shiftUnit === 'week' ? 7 : 1))
    setRefDate(isoFromDate(d))
  }

  let navLabel = ''
  let agendaDays: AgendaDay[] = []

  if (modo === 'mensal') {
    navLabel = `${mesesLong[refDateObj.getMonth()]} de ${refDateObj.getFullYear()}`
  } else if (modo === 'semanal') {
    const weekStart = startOfWeek(refDateObj)
    const weekEnd = addDays(weekStart, 6)
    navLabel = `${formatDateShort(isoFromDate(weekStart))} - ${formatDateShort(isoFromDate(weekEnd))}`
    agendaDays = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      const iso = isoFromDate(d)
      return { label: `${weekdayShort[d.getDay()]} · ${formatDateShort(iso)}`, items: dateMap[iso] || [] }
    })
  } else if (modo === 'diaria') {
    const iso = isoFromDate(refDateObj)
    navLabel = `${weekdayShort[refDateObj.getDay()]}, ${formatDateShort(iso)}/${refDateObj.getFullYear()}`
    agendaDays = [{ label: 'Entregas do dia', items: dateMap[iso] || [] }]
  } else if (modo === 'periodo') {
    if (periodoInicio && periodoFim && periodoFim >= periodoInicio) {
      const start = dateFromIso(periodoInicio)
      const end = dateFromIso(periodoFim)
      const totalDays = Math.min(90, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(start, i)
        const iso = isoFromDate(d)
        const items = dateMap[iso] || []
        if (items.length) agendaDays.push({ label: `${weekdayShort[d.getDay()]} · ${formatDateShort(iso)}`, items })
      }
    }
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-gray-50">
      <div className="px-8 pt-6.5">
        <h2 className="text-[25px] font-medium tracking-tight text-foreground">Calendário</h2>

        <CalendarioToolbar
          modo={modo}
          onModoChange={setModo}
          navLabel={navLabel}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onToday={() => setRefDate(todayIso())}
          periodoInicio={periodoInicio}
          periodoFim={periodoFim}
          onPeriodoInicioChange={setPeriodoInicio}
          onPeriodoFimChange={setPeriodoFim}
        />

        <EixoFilterChips
          eixos={eixos}
          filtroEixos={filtroEixos}
          onToggle={(id) => setFiltroEixos((cur) => (id === null ? [] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))}
        />

        <CalendarLegend />
      </div>

      <div className="flex-1 overflow-auto px-8 pb-7">
        {modo === 'mensal' ? (
          <MonthGrid refDate={refDateObj} dateMap={dateMap} onItemClick={openDetail} />
        ) : (
          <AgendaList days={agendaDays} onItemClick={openDetail} />
        )}
      </div>
    </main>
  )
}
