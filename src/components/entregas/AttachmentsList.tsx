import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, X } from 'lucide-react'
import type { Anexo } from '~/server/repository/entrega.repository'
import { confirmAnexoUploadFn, createAnexoUploadUrlFn, getAnexoDownloadUrlFn, removeAnexoFn } from '~/server/api/entregas.functions'

const MAX_ANEXO_BYTES = 20 * 1024 * 1024

async function uploadFile(entregaId: string, file: File) {
  if (file.size > MAX_ANEXO_BYTES) throw new Error(`"${file.name}" excede o tamanho máximo de 20MB.`)
  const contentType = file.type || 'application/octet-stream'

  const { key, uploadUrl } = await createAnexoUploadUrlFn({
    data: { entregaId, nome: file.name, contentType, tamanho: file.size },
  })

  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
  if (!res.ok) throw new Error(`Falha ao enviar "${file.name}".`)

  await confirmAnexoUploadFn({ data: { entregaId, key, nome: file.name, contentType, tamanho: file.size } })
}

export function AttachmentsList({ entregaId, anexos }: { entregaId: string; anexos: Anexo[] }) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })
    queryClient.invalidateQueries({ queryKey: ['entregas'] })
  }

  const addMutation = useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map((file) => uploadFile(entregaId, file))),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (anexoId: string) => removeAnexoFn({ data: { anexoId } }),
    onSuccess: invalidate,
  })

  const downloadMutation = useMutation({
    mutationFn: (anexoId: string) => getAnexoDownloadUrlFn({ data: { anexoId } }),
    onSuccess: (url) => window.open(url, '_blank'),
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
            if (e.target.files?.length) addMutation.mutate(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
      </div>
      {addMutation.isError && <p className="mb-2 text-xs text-destructive">{(addMutation.error as Error).message}</p>}
      {anexos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {anexos.map((anexo) => (
            <div key={anexo.id} className="flex items-center justify-between rounded-lg bg-background px-2.5 py-2 text-sm">
              <button
                type="button"
                onClick={() => downloadMutation.mutate(anexo.id)}
                className="flex items-center gap-2 overflow-hidden text-foreground/80 hover:underline"
              >
                <Paperclip className="size-3.25 flex-none" />
                <span className="truncate">{anexo.nome}</span>
              </button>
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
