import type { NeedId } from '@/lib/data'

export function inferNeedsFromSeeking(seeking: string[]): NeedId[] {
  const needs = new Set<NeedId>()
  for (const item of seeking) {
    const text = item.toLowerCase()
    if (/cliente|comprador|mercado|demanda/.test(text)) needs.add('aliados')
    if (/inversion|financ|capital|fondo/.test(text)) needs.add('financiamiento')
    if (/aliado|alianza|socio|app|cooperaci/.test(text)) needs.add('aliados')
    if (/posicion|visibil|marca|liderazgo/.test(text)) needs.add('visibilidad')
    if (/proveedor|proyecto|oportunidad|consultor/.test(text)) needs.add('colaboracion')
  }
  return Array.from(needs)
}
