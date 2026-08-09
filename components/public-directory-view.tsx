'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ParticipantCard } from '@/components/participant-card'
import { ParticipantProfileModal } from '@/components/participant-profile-modal'
import { SectorFilterBar } from '@/components/sector-filter-bar'
import { fetchDirectoryParticipants } from '@/lib/directory'
import {
  ALL_SECTORS_FILTER,
  filterParticipantsByQuery,
  type SectorFilterValue,
} from '@/lib/sector-filters'
import type { Participant } from '@/lib/data'
import { Loader2, LogIn, Search } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export function PublicDirectoryView() {
  const [query, setQuery] = useState('')
  const [activeSector, setActiveSector] = useState<SectorFilterValue>(ALL_SECTORS_FILTER)
  const [profileOpen, setProfileOpen] = useState(false)
  const [selected, setSelected] = useState<Participant | null>(null)
  const [directory, setDirectory] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const published = await fetchDirectoryParticipants()
        setDirectory(published)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el directorio.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filtered = useMemo(
    () => filterParticipantsByQuery(directory, query, activeSector),
    [query, activeSector, directory],
  )

  function openProfile(participant: Participant) {
    setSelected(participant)
    setProfileOpen(true)
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#8ac441]/30 bg-[#e8f0e4]/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1a3c34]">Vista previa del directorio</p>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Explora organizaciones registradas. Inicia sesión para solicitar reuniones y acceder a
            tu agenda.
          </p>
        </div>
        <Link
          href="/login?redirect=/plataforma"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-10 shrink-0 gap-2 bg-[#1a3c34] px-5 text-white hover:bg-[#234a40]',
          )}
        >
          <LogIn className="size-4" aria-hidden="true" />
          Iniciar Sesión
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#1a3c34] sm:text-2xl">
          Directorio de Participantes
        </h1>
        <p className="mt-1 text-sm text-[#5a6b62]">
          Catálogo público de empresas y organizaciones en la rueda de negocios.
        </p>
      </header>

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#5a6b62]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, proyectos, oferta o necesidad…"
          aria-label="Buscar participantes"
          className="w-full rounded-xl border border-[#dde8d8] bg-white py-3 pl-11 pr-4 text-sm text-[#1a3c34] outline-none transition-colors placeholder:text-[#5a6b62]/60 focus-visible:border-[#8ac441] focus-visible:ring-3 focus-visible:ring-[#8ac441]/25"
        />
      </div>

      <SectorFilterBar
        activeSector={activeSector}
        onSectorChange={setActiveSector}
        tone="public"
      />

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-[#1a3c34]" aria-hidden="true" />
          <span className="sr-only">Cargando directorio…</span>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-[#5a6b62]">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'organización encontrada' : 'organizaciones encontradas'}
          </p>

          {filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  readOnly
                  onViewProfile={openProfile}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#dde8d8] bg-white p-12 text-center">
              <p className="text-sm font-medium text-[#1a3c34]">Sin resultados</p>
              <p className="mt-1 text-sm text-[#5a6b62]">
                Ajusta la búsqueda o selecciona otro sector.
              </p>
            </div>
          )}
        </>
      )}

      <ParticipantProfileModal
        participant={selected}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        readOnly
      />
    </div>
  )
}
