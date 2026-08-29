import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, X } from 'lucide-react'
import type { Anexo } from '~/server/repository/entrega.repository'
import { addAnexosFn, removeAnexoFn } from '~/server/api/entregas.functions'

export function AttachmentsList({ entregaId, anexos }: { entregaId: string; anexos: Anexo[] }) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })
    queryClient.invalidateQueries({ queryKey: ['entregas'] })
  }

  const addMutation = useMutation({
    mutationFn: (nomes: string[]) => addAnexosFn({ data: { entregaId, nomes } }),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (anexoId: string) => removeAnexoFn({ data: { anexoId } }),
    onSuccess: invalidate,
  })

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-muted-foreground">Anexos</h4>
        <label htmlFor="anexo-input" className="cursor-pointer text-xs text-primary">
          + Adicionar
        </label>
        <input
          id="anexo-input"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addMutation.mutate(Array.from(e.target.files).map((f) => f.name))
            e.target.value = ''
          }}
        />
      </div>
      {anexos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {anexos.map((anexo) => (
            <div key={anexo.id} className="flex items-center justify-between rounded-lg bg-background px-2.5 py-2 text-sm">
              <span className="flex items-center gap-2 overflow-hidden text-foreground/80">
                <Paperclip className="size-3.25 flex-none" />
                <span className="truncate">{anexo.nome}</span>
              </span>
              <button type="button" onClick={() => removeMutation.mutate(anexo.id)} className="flex-none text-muted-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
