import { toast } from 'sonner'
import { Progress } from '~/components/ui/progress'
import { confirmAnexoUploadFn, createAnexoUploadUrlFn } from '~/server/api/entregas.functions'

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

/** Upload direto pro S3 (URL pré-assinada) com toast de progresso. `notaId` vincula o anexo a um comentário em vez da entrega. */
export async function uploadAnexo({ entregaId, notaId, file }: { entregaId: string; notaId?: string; file: File }) {
  const toastId = `anexo-upload-${file.name}-${Date.now()}`

  if (file.size > MAX_ANEXO_BYTES) {
    toast.error(`"${file.name}" excede o tamanho máximo de 20MB.`)
    return
  }

  const contentType = file.type || 'application/octet-stream'
  toast.custom(() => <UploadProgressToast nome={file.name} progress={0} />, { className: 'overflow-hidden rounded-lg', id: toastId, duration: Infinity, position: 'top-center', closeButton: false })

  try {
    const { key, uploadUrl } = await createAnexoUploadUrlFn({
      data: { entregaId, nome: file.name, contentType, tamanho: file.size },
    })

    await putWithProgress(uploadUrl, file, contentType, (pct) => {
      toast.custom(() => <UploadProgressToast nome={file.name} progress={pct} />, { id: toastId, duration: Infinity, position: 'top-center', closeButton: false })
    })

    await confirmAnexoUploadFn({ data: { entregaId, notaId, key, nome: file.name, contentType, tamanho: file.size } })
    setTimeout(() => {
      toast.dismiss(toastId)
      toast.success(`"${file.name}" enviado.`, { duration: 3000, closeButton: false, position: 'top-center' })
    }, 1000)
  } catch (error) {
    setTimeout(() => {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : `Falha ao enviar "${file.name}".`, { duration: 2000, closeButton: false, position: 'top-center' })
    }, 1000)
    throw error
  }
}
