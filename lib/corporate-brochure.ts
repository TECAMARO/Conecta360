export const MAX_BROCHURE_BYTES = 5 * 1024 * 1024

export type CorporateBrochure = {
  fileName: string
  fileSize: number
  brochureUrl: string
  uploadedAt: string
  storagePath?: string
  /** @deprecated Prefer brochureUrl */
  dataUrl?: string
  /** @deprecated Prefer brochureUrl */
  publicUrl?: string
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateBrochureFile(file: File): string | null {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) return 'Solo se permiten archivos PDF.'
  if (file.size > MAX_BROCHURE_BYTES) {
    return `El archivo supera el límite de ${formatFileSize(MAX_BROCHURE_BYTES)}.`
  }
  return null
}

export function readBrochureFile(file: File): Promise<CorporateBrochure> {
  return new Promise((resolve, reject) => {
    const error = validateBrochureFile(file)
    if (error) {
      reject(new Error(error))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('No se pudo leer el archivo.'))
        return
      }
      resolve({
        fileName: file.name,
        fileSize: file.size,
        brochureUrl: reader.result,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      })
    }
    reader.onerror = () => reject(new Error('Error al cargar el archivo PDF.'))
    reader.readAsDataURL(file)
  })
}

export function getBrochureUrl(brochure: CorporateBrochure): string {
  return brochure.brochureUrl || brochure.publicUrl || brochure.dataUrl || ''
}

export function hasBrochure(
  brochure?: CorporateBrochure | null,
): brochure is CorporateBrochure {
  return Boolean(brochure?.fileName && getBrochureUrl(brochure))
}

export function previewBrochure(brochure: CorporateBrochure) {
  const url = getBrochureUrl(brochure)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
