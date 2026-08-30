import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { addNotaFn } from '~/server/api/entregas.functions'
import { uploadAnexo } from './anexoUpload'

export function NoteComposer({ entregaId }: { entregaId: string }) {
  const queryClient = useQueryClient()
  const [texto, setTexto] = useState('')
  const [proximoPasso, setProximoPasso] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const nota = await addNotaFn({ data: { entregaId, texto, proximoPasso } })
      if (file) await uploadAnexo({ entregaId, notaId: nota.id, file })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })
      setTexto('')
      setProximoPasso('')
      setFile(null)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao adicionar comentário.'),
  })

  function handleAdd() {
    if (!texto.trim()) return
    mutation.mutate()
  }

  return (
    <div className="flex flex-col gap-2 border-t px-6 pt-3.5 pb-5">
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Descreva uma atualização..." className="min-h-14" />
      <Input value={proximoPasso} onChange={(e) => setProximoPasso(e.target.value)} placeholder="Próximo passo (opcional)" />
      <div className="flex items-center justify-between gap-2.5">
        <label htmlFor="registro-anexo-input" className="flex cursor-pointer items-center gap-1.5 text-xs text-primary">
          <Paperclip className="size-3.25" />
          {file?.name || 'Anexar arquivo'}
        </label>
        <input id="registro-anexo-input" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" className="flex-none border-primary text-primary hover:bg-accent hover:text-primary" onClick={handleAdd}>
          Adicionar
        </Button>
      </div>
    </div>
  )
}
