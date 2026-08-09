/** Standardized profile tag options for Qué Busca / Qué Ofrece. */

export const SEEKING_TAG_OPTIONS = [
  'Conseguir nuevos clientes',
  'Conseguir inversionistas / Buscar financiación',
  'Conseguir aliados estratégicos',
  'Conseguir proveedores',
  'Conseguir compradores',
  'Presentar un proyecto',
  'Conseguir socios comerciales',
  'Expandir mi mercado',
  'Identificar oportunidades de negocio',
  'Generar alianzas público-privadas',
  'Conseguir cooperación internacional',
  'Posicionar mi organización',
] as const

export const OFFER_TAG_OPTIONS = [
  'Productos, servicios y soluciones B2B',
  'Financiamiento e Inversión de capital',
  'Alianzas estratégicas y articulación',
  'Suministro de insumos y proveeduría',
  'Capacidad de compra / Demanda comercial',
  'Prototipos, proyectos y portafolio de innovación',
  'Representación comercial y co-inversión',
  'Acceso a nuevos mercados y canales de distribución',
  'Consultoría, inteligencia de mercado y mentoría',
  'Articulación institucional y proyectos APP',
  'Fondos, programas y cooperación internacional',
  'Visibilidad de marca y liderazgo sectorial',
] as const

export type SeekingTagOption = (typeof SEEKING_TAG_OPTIONS)[number]
export type OfferTagOption = (typeof OFFER_TAG_OPTIONS)[number]

export function isPredefinedSeekingTag(tag: string): boolean {
  return (SEEKING_TAG_OPTIONS as readonly string[]).includes(tag)
}

export function isPredefinedOfferTag(tag: string): boolean {
  return (OFFER_TAG_OPTIONS as readonly string[]).includes(tag)
}

export function customTags(tags: string[], predefined: readonly string[]): string[] {
  return tags.filter((tag) => !predefined.includes(tag))
}
