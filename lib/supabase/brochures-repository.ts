import { supabase } from '@/src/lib/supabaseClient'
import {
  MAX_BROCHURE_BYTES,
  validateBrochureFile,
  type CorporateBrochure,
} from '@/lib/corporate-brochure'
import type { ProfileRow } from '@/lib/supabase/database.types'

const BUCKET = 'brochures'

export function getBrochurePublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

function fileNameFromUrl(url: string): string {
  const segment = url.split('/').pop()?.split('?')[0] ?? 'brochure.pdf'
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function storagePathFromPublicUrl(publicUrl: string): string | undefined {
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return undefined
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

export function rowToBrochure(row: ProfileRow): CorporateBrochure | null {
  if (!row.brochure_url) return null

  const brochureUrl = row.brochure_url
  return {
    fileName: fileNameFromUrl(brochureUrl),
    fileSize: 0,
    brochureUrl,
    uploadedAt: row.updated_at ?? new Date().toISOString(),
    storagePath: storagePathFromPublicUrl(brochureUrl),
  }
}

export async function uploadBrochure(file: File): Promise<CorporateBrochure> {
  const validationError = validateBrochureFile(file)
  if (validationError) throw new Error(validationError)

  const { data, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)
  if (!data.user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')

  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_')
  const storagePath = `${data.user.id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    })

  if (uploadError) throw new Error(uploadError.message)

  const brochureUrl = getBrochurePublicUrl(storagePath)
  return {
    fileName: file.name,
    fileSize: file.size,
    brochureUrl,
    uploadedAt: new Date().toISOString(),
    storagePath,
  }
}

export async function deleteBrochure(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) throw new Error(error.message)
}

export { MAX_BROCHURE_BYTES }
