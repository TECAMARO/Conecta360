'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ALL_SECTORS_FILTER,
  DIRECTORY_SECTORS,
  FEATURED_SECTORS,
  type SectorFilterValue,
} from '@/lib/sector-filters'
import { Search, SlidersHorizontal, X } from 'lucide-react'

type Tone = 'platform' | 'public'

const toneStyles: Record<
  Tone,
  {
    pillActive: string
    pillInactive: string
    panel: string
    input: string
    sectorItem: string
    sectorItemActive: string
  }
> = {
  platform: {
    pillActive: 'border-primary bg-primary text-primary-foreground',
    pillInactive:
      'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
    panel: 'border-border bg-card',
    input: 'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30',
    sectorItem: 'text-foreground hover:bg-muted',
    sectorItemActive: 'bg-primary text-primary-foreground hover:bg-primary',
  },
  public: {
    pillActive: 'border-[#1a3c34] bg-[#1a3c34] text-white',
    pillInactive:
      'border-[#dde8d8] bg-white text-[#5a6b62] hover:border-[#8ac441]/40 hover:text-[#1a3c34]',
    panel: 'border-[#dde8d8] bg-white',
    input:
      'border-[#dde8d8] bg-white text-[#1a3c34] placeholder:text-[#5a6b62]/60 focus-visible:border-[#8ac441] focus-visible:ring-[#8ac441]/25',
    sectorItem: 'text-[#1a3c34] hover:bg-[#e8f0e4]/80',
    sectorItemActive: 'bg-[#1a3c34] text-white hover:bg-[#234a40]',
  },
}

export function SectorFilterBar({
  activeSector,
  onSectorChange,
  tone = 'platform',
}: {
  activeSector: SectorFilterValue
  onSectorChange: (sector: SectorFilterValue) => void
  tone?: Tone
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sectorSearch, setSectorSearch] = useState('')
  const styles = toneStyles[tone]

  const visiblePills = useMemo(() => {
    const featured = FEATURED_SECTORS.filter((s) => s !== activeSector)
    const pills =
      activeSector !== ALL_SECTORS_FILTER &&
      !FEATURED_SECTORS.includes(activeSector as (typeof FEATURED_SECTORS)[number])
        ? [activeSector, ...featured]
        : featured
    return pills.slice(0, 6)
  }, [activeSector])

  const filteredSectorOptions = useMemo(() => {
    const q = sectorSearch.trim().toLowerCase()
    if (!q) return DIRECTORY_SECTORS
    return DIRECTORY_SECTORS.filter((s) => s.toLowerCase().includes(q))
  }, [sectorSearch])

  function selectSector(sector: SectorFilterValue) {
    onSectorChange(sector)
    setAdvancedOpen(false)
    setSectorSearch('')
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Filtrar por sector">
        <FilterPill
          label="Todas"
          active={activeSector === ALL_SECTORS_FILTER}
          onClick={() => selectSector(ALL_SECTORS_FILTER)}
          styles={styles}
        />
        {visiblePills.map((sector) => (
          <FilterPill
            key={sector}
            label={sector}
            active={activeSector === sector}
            onClick={() => selectSector(sector)}
            styles={styles}
          />
        ))}
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
            advancedOpen ? styles.pillActive : styles.pillInactive,
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
          Filtros avanzados
        </button>
      </div>

      {activeSector !== ALL_SECTORS_FILTER && (
        <p className="text-xs text-muted-foreground">
          Filtro activo:{' '}
          <span className="font-medium text-foreground">{activeSector}</span>
          <button
            type="button"
            onClick={() => selectSector(ALL_SECTORS_FILTER)}
            className="ml-2 text-primary hover:underline"
          >
            Limpiar
          </button>
        </p>
      )}

      {advancedOpen && (
        <div className={cn('rounded-2xl border p-4 shadow-sm', styles.panel)}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Buscar categoría / sector</p>
            <button
              type="button"
              onClick={() => setAdvancedOpen(false)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted"
              aria-label="Cerrar filtros avanzados"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={sectorSearch}
              onChange={(e) => setSectorSearch(e.target.value)}
              placeholder='Ej. "Agro", "Financiero", "ONG"…'
              aria-label="Buscar sector en la lista de categorías"
              className={cn(
                'w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus-visible:ring-3',
                styles.input,
              )}
            />
          </div>
          <ul
            className="max-h-56 space-y-1 overflow-y-auto pr-1"
            role="listbox"
            aria-label="Sectores disponibles"
          >
            {filteredSectorOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No hay sectores que coincidan con &quot;{sectorSearch}&quot;.
              </li>
            ) : (
              filteredSectorOptions.map((sector) => {
                const isActive = activeSector === sector
                return (
                  <li key={sector}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => selectSector(sector)}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        isActive ? styles.sectorItemActive : styles.sectorItem,
                      )}
                    >
                      {sector}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick,
  styles,
}: {
  label: string
  active: boolean
  onClick: () => void
  styles: (typeof toneStyles)[Tone]
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'max-w-full truncate rounded-full border px-3.5 py-2 text-sm font-medium transition-colors min-h-11',
        active ? styles.pillActive : styles.pillInactive,
      )}
      title={label}
    >
      {label}
    </button>
  )
}
