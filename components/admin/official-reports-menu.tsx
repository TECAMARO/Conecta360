'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react'

export type OfficialReportKind = 'pdf' | 'word' | 'excel'

type OfficialReportsMenuProps = {
  loading: OfficialReportKind | null
  onDownloadPdf: () => void | Promise<void>
  onDownloadWord: () => void | Promise<void>
  onDownloadExcel: () => void | Promise<void>
}

export function OfficialReportsMenu({
  loading,
  onDownloadPdf,
  onDownloadWord,
  onDownloadExcel,
}: OfficialReportsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function runAction(kind: OfficialReportKind, action: () => void | Promise<void>) {
    setOpen(false)
    void action()
  }

  const isBusy = loading !== null

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="sm"
        className="gap-1.5 bg-[#8ac441] text-[#1a3c34] hover:bg-[#7ab038]"
        disabled={isBusy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {isBusy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        Informes Oficiales
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[17rem] overflow-hidden rounded-xl border border-[#dde8d8] bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#1a3c34] hover:bg-[#f4f7f5] disabled:opacity-60"
            onClick={() => runAction('pdf', onDownloadPdf)}
          >
            {loading === 'pdf' ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4 shrink-0" aria-hidden="true" />
            )}
            Descargar Entregable PDF Oficial
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#1a3c34] hover:bg-[#f4f7f5] disabled:opacity-60"
            onClick={() => runAction('word', onDownloadWord)}
          >
            {loading === 'word' ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="size-4 shrink-0" aria-hidden="true" />
            )}
            Descargar Entregable Word Oficial
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#1a3c34] hover:bg-[#f4f7f5] disabled:opacity-60"
            onClick={() => runAction('excel', onDownloadExcel)}
          >
            {loading === 'excel' ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="size-4 shrink-0" aria-hidden="true" />
            )}
            Descargar Entregable Excel Oficial
          </button>
        </div>
      )}
    </div>
  )
}

async function downloadFromApi(
  endpoint: string,
  filenamePrefix: string,
  body?: unknown,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error ?? 'No se pudo generar el informe.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename=\"(.+?)\"/)
  anchor.download = match?.[1] ?? `${filenamePrefix}-${Date.now()}`
  anchor.click()
  URL.revokeObjectURL(url)
}

export { downloadFromApi }
