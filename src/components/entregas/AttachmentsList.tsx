import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '~/components/ui/progress'
import type { Anexo } from '~/server/repository/entrega.repository'
import { confirmAnexoUploadFn, createAnexoUploadUrlFn, getAnexoDownloadUrlFn, removeAnexoFn } from '~/server/api/entregas.functions'

const MAX_ANEXO_BYTES = 20 * 1024 * 1024

function UploadProgressToast({ nome, progress }: { nome: string; progress: number }) {
  return (
    <div className="flex w-full flex-col py-0.5 min-w-[350px] min-h-[80px] justify-center gap-2 p-3 rounded-xl border border-green-600 bg-gray-50 overflow-hidden">
      <span className="truncate text-sm text-foreground">Enviando "{nome}"…</span>
      <span>
        <Progress value={progress} className="h-1.5" />
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </span>
    </div>
  )
}

function putWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha ao enviar "${file.name}".`)))
    xhr.onerror = () => reject(new Error(`Falha ao enviar "${file.name}".`))
    xhr.send(file)
  })
}

async function uploadFile(entregaId: string, file: File) {
  const toastId = `anexo-upload-${file.name}-${Date.now()}`

  if (file.size > MAX_ANEXO_BYTES) {
    toast.error(`"${file.name}" excede o tamanho máximo de 20MB.`)
    return
  }

  const contentType = file.type || 'application/octet-stream'
  toast.custom(() => <UploadProgressToast nome={file.name} progress={0} />, { className: "overflow-hidden rounded-lg", id: toastId, duration: Infinity, position: "top-center", closeButton: false })

  try {
    const { key, uploadUrl } = await createAnexoUploadUrlFn({
      data: { entregaId, nome: file.name, contentType, tamanho: file.size },
    })

    await putWithProgress(uploadUrl, file, contentType, (pct) => {
      toast.custom(() => <UploadProgressToast nome={file.name} progress={pct} />, { id: toastId, duration: Infinity, position: "top-center", closeButton: false })
    })

    await confirmAnexoUploadFn({ data: { entregaId, key, nome: file.name, contentType, tamanho: file.size } })
    toast.success(`"${file.name}" enviado.`, { id: toastId, duration: 3000, closeButton: false })
  } catch (error) {
    setTimeout(() => {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : `Falha ao enviar "${file.name}".`, { duration: 2000, closeButton: false, position: "top-center" })
    }, 1000)
    throw error
  }
}

export function AttachmentsList({ entregaId, anexos }: { entregaId: string; anexos: Anexo[] }) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })
    queryClient.invalidateQueries({ queryKey: ['entregas'] })
  }

  const addMutation = useMutation({
    mutationFn: (files: File[]) => Promise.allSettled(files.map((file) => uploadFile(entregaId, file))),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (anexoId: string) => removeAnexoFn({ data: { anexoId } }),
    onSuccess: () => {
      invalidate()
      toast.success('Anexo removido.')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao remover anexo.'),
  })

  const downloadMutation = useMutation({
    mutationFn: (anexoId: string) => getAnexoDownloadUrlFn({ data: { anexoId } }),
    onSuccess: (url) => window.open(url, '_blank'),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao baixar anexo.'),
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
