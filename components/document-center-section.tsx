'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatFileSize,
  MAX_BROCHURE_BYTES,
  validateBrochureFile,
  previewBrochure,
  type CorporateBrochure,
} from '@/lib/corporate-brochure'
import { Eye, FileText, Loader2, Trash2, Upload } from 'lucide-react'

export function DocumentCenterSection({
  brochure,
  onUpload,
  onRemove,
}: {
  brochure?: CorporateBrochure | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void> | void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    const validationError = validateBrochureFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setBusy(true)
      setError(null)
      setSuccess(null)
      await onUpload(file)
      setSuccess('Brochure PDF subido y enlace guardado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo adjuntar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    void handleFiles(event.dataTransfer.files)
  }

  async function handleRemove() {
    try {
      setBusy(true)
      setError(null)
      await onRemove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Centro de Documentos / Dossier Corporativo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjunta tu brochure o pitch deck en PDF para que otras organizaciones lo consulten en el
          directorio. Se almacena en Supabase Storage (bucket brochures).
        </p>
      </div>

      {brochure ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-100">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{brochure.fileName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {brochure.fileSize > 0 ? `${formatFileSize(brochure.fileSize)} · ` : ''}PDF
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busy}
              onClick={() => previewBrochure(brochure)}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
              📄 Ver / Descargar Brochure PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={busy}
              onClick={() => void handleRemove()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              🗑️ Eliminar / Reemplazar
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragOver
              ? 'border-primary bg-secondary/70'
              : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-secondary/40',
            busy && 'pointer-events-none opacity-60',
          )}
        >
          {busy ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">Subiendo archivo…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Guardando en Supabase Storage (bucket brochures)
              </p>
            </>
          ) : (
            <Upload className="size-8 text-primary" aria-hidden="true" />
          )}
          <p className="mt-3 text-sm font-medium text-foreground">
            📄 Adjuntar Brochure o Pitch Deck (PDF max {formatFileSize(MAX_BROCHURE_BYTES)})
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Arrastra tu archivo aquí o haz clic para seleccionarlo
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
        aria-label="Adjuntar brochure PDF"
      />

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-3 rounded-lg border border-[#8ac441]/30 bg-[#e8f0e4]/70 px-3 py-2 text-sm text-[#1a3c34]">
          {success}
        </p>
      )}
    </section>
  )
}
