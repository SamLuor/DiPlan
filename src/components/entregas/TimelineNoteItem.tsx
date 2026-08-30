import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '~/lib/dates'
import { avatarClassFor, initials } from '~/lib/domain'
import type { Nota } from '~/server/repository/entrega.repository'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { deleteNotaFn, editNotaFn, getAnexoDownloadUrlFn, removeAnexoFn } from '~/server/api/entregas.functions'
import { uploadAnexo } from './anexoUpload'

export function TimelineNoteItem({
  entregaId,
  nota,
  canDelete,
  currentUserId,
}: {
  entregaId: string
  nota: Nota
  canDelete: boolean
  currentUserId: string | null
}) {
  const queryClient = useQueryClient()
  const isSistema = nota.tipo === 'sistema'
  const isAutor = !!currentUserId && nota.autorUserId === currentUserId
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(nota.texto)
  const [novoAnexo, setNovoAnexo] = useState<File | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })

  const editMutation = useMutation({
    mutationFn: async (texto: string) => {
      await editNotaFn({ data: { notaId: nota.id, texto } })
      if (novoAnexo) await uploadAnexo({ entregaId, notaId: nota.id, file: novoAnexo })
    },
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao editar comentário.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteNotaFn({ data: { entregaId, notaId: nota.id } }),
    onSuccess: invalidate,
  })

  const removeAnexoMutation = useMutation({
    mutationFn: (anexoId: string) => removeAnexoFn({ data: { anexoId } }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao remover anexo.'),
  })

  const downloadMutation = useMutation({
    mutationFn: (anexoId: string) => getAnexoDownloadUrlFn({ data: { anexoId } }),
    onSuccess: (url) => window.open(url, '_blank'),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao baixar anexo.'),
  })

  return (
    <div className={cn('rounded-lg p-3', isSistema ? 'bg-secondary/40' : 'bg-card shadow-[0_0_0_1px_var(--secondary)]')}>
      {isEditing ? (
        <>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-15" />
          <div className="mt-2 flex items-center justify-between gap-2">
            {nota.anexo ? (
              <button
                type="button"
                onClick={() => removeAnexoMutation.mutate(nota.anexo!.id)}
                className="flex items-center gap-1 text-[11.5px] text-destructive"
              >
                <X className="size-3" /> Remover anexo ({nota.anexo.nome})
              </button>
            ) : (
              <label htmlFor={`nota-anexo-${nota.id}`} className="flex cursor-pointer items-center gap-1 text-[11.5px] text-primary">
                <Paperclip className="size-3" />
                {novoAnexo?.name || 'Anexar arquivo'}
              </label>
            )}
            <input id={`nota-anexo-${nota.id}`} type="file" className="hidden" onChange={(e) => setNovoAnexo(e.target.files?.[0] ?? null)} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(nota.texto)
                  setNovoAnexo(null)
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
                  setNovoAnexo(null)
                  setIsEditing(false)
                }}
              >
                Salvar
              </Button>
            </div>
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
            {nota.anexo && (
              <button
                type="button"
                onClick={() => downloadMutation.mutate(nota.anexo!.id)}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
              >
                <Paperclip className="size-3" />
                {nota.anexo.nome}
              </button>
            )}
            {!isSistema && (
              <div className="mt-1.5 flex gap-3">
                {isAutor && (
                  <button type="button" onClick={() => setIsEditing(true)} className="text-[11.5px] text-muted-foreground/80">
                    Editar
                  </button>
                )}
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
