import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Paperclip } from 'lucide-react'
import { formatDateTime } from '~/lib/dates'
import { avatarClassFor, initials } from '~/lib/domain'
import type { Nota } from '~/server/repository/entrega.repository'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { deleteNotaFn, editNotaFn } from '~/server/api/entregas.functions'

export function TimelineNoteItem({ entregaId, nota, canDelete }: { entregaId: string; nota: Nota; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const isSistema = nota.tipo === 'sistema'
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(nota.texto)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })

  const editMutation = useMutation({
    mutationFn: (texto: string) => editNotaFn({ data: { notaId: nota.id, texto } }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteNotaFn({ data: { entregaId, notaId: nota.id } }),
    onSuccess: invalidate,
  })

  return (
    <div className={cn('rounded-lg p-3', isSistema ? 'bg-secondary/40' : 'bg-card shadow-[0_0_0_1px_var(--secondary)]')}>
      {isEditing ? (
        <>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-15" />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(nota.texto)
                setIsEditing(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-accent hover:text-primary"
              onClick={() => {
                editMutation.mutate(draft)
                setIsEditing(false)
              }}
            >
              Salvar
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2.5">
          {isSistema ? (
            <div className="flex size-6.5 flex-none items-center justify-center rounded-full bg-secondary">
              <Clock className="size-3.25 text-muted-foreground" />
            </div>
          ) : (
            <div className={cn('flex size-6.5 flex-none items-center justify-center rounded-full text-[11px] font-semibold', avatarClassFor(nota.autor || '?'))}>
              {initials(nota.autor)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{nota.autor}</span>
                {nota.editado && <span className="text-[10.5px] text-muted-foreground/70">(editado)</span>}
              </span>
              <span className="flex-none">{formatDateTime(nota.dataHora)}</span>
            </div>
            <div className="text-sm leading-relaxed text-foreground">{nota.texto}</div>
            {!!nota.proximoPasso && (
              <div className="mt-1.5 inline-block rounded-md bg-accent px-2.25 py-0.75 text-xs text-accent-foreground">Próximo passo: {nota.proximoPasso}</div>
            )}
            {!!nota.anexoNome && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3" />
                {nota.anexoNome}
              </div>
            )}
            {!isSistema && (
              <div className="mt-1.5 flex gap-3">
                <button type="button" onClick={() => setIsEditing(true)} className="text-[11.5px] text-muted-foreground/80">
                  Editar
                </button>
                {canDelete && (
                  <button type="button" onClick={() => deleteMutation.mutate()} className="text-[11.5px] text-destructive">
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
