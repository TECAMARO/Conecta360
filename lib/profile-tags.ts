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
  'Suministro de insumos',
  'Asesoría en proyectos',
  'Estrategia comercial',
  'Acceso a nuevos mercados y canales de distribución',
  'Consultoría en sostenibilidad',
  'Articulación institucional y proyectos APP',
  'Fondos, programas y cooperación internacional',
  'Visibilidad de marca y liderazgo sectorial',
  'Desarrollo tecnológico',
  'Experiencia turística',
  'Gestión ambiental y circular',
  'Construcción sostenible',
  'Productores orgánicos y sostenibles',
] as const

/** Etiquetas legacy → nuevas (migración de perfiles existentes). */
export const OFFER_TAG_LEGACY_RENAMES: Record<string, string> = {
  'Suministro de insumos y proveeduría': 'Suministro de insumos',
  'Representación comercial y co-inversión': 'Estrategia comercial',
  'Consultoría, inteligencia de mercado y mentoría': 'Consultoría en sostenibilidad',
  'Prototipos, proyectos y portafolio de innovación': 'Asesoría en proyectos',
}

export const OFFER_TAG_LEGACY_REMOVED = ['Capacidad de compra / Demanda comercial'] as const

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
