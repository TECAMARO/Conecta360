'use client'

import { useEffect, useMemo, useState } from 'react'
import { ParticipantCard } from '@/components/participant-card'
import { SectorFilterBar } from '@/components/sector-filter-bar'
import { fetchDirectoryParticipants } from '@/lib/directory'
import { getAuthSession } from '@/lib/auth'
import { setParticipantRegistry } from '@/lib/participant-registry'
import {
  ALL_SECTORS_FILTER,
  filterParticipantsByQuery,
  type SectorFilterValue,
} from '@/lib/sector-filters'
import type { Participant } from '@/lib/data'
import { Loader2, Search } from 'lucide-react'

export function ExploreView({
  onRequest,
  onViewProfile,
  requestDisabled = false,
}: {
  onRequest: (participant: Participant) => void
  onViewProfile: (participant: Participant) => void
  requestDisabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [activeSector, setActiveSector] = useState<SectorFilterValue>(ALL_SECTORS_FILTER)
  const [directory, setDirectory] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function refresh() {
      try {
        setLoading(true)
        setError(null)
        const userId = getAuthSession()?.userId
        const published = await fetchDirectoryParticipants(userId)
        setDirectory(published)
        setParticipantRegistry(published)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el directorio.')
      } finally {
        setLoading(false)
      }
    }

    void refresh()
    window.addEventListener('conecta360-profile-updated', refresh)
    return () => window.removeEventListener('conecta360-profile-updated', refresh)
  }, [])

  const filtered = useMemo(
    () => filterParticipantsByQuery(directory, query, activeSector),
    [query, activeSector, directory],
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Explorar Participantes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Descubre organizaciones con perfil publicado y agenda reuniones estratégicas.
        </p>
      </header>

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, proyectos, oferta o necesidad…"
          aria-label="Buscar participantes"
          className="w-full max-w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
        />
      </div>

      <SectorFilterBar
        activeSector={activeSector}
        onSectorChange={setActiveSector}
        tone="platform"
      />

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Cargando participantes…</span>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'organización publicada' : 'organizaciones publicadas'}
          </p>

          {filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  onRequest={p.isCurrentUser ? undefined : onRequest}
                  onViewProfile={onViewProfile}
                  requestDisabled={requestDisabled}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm font-medium text-foreground">Sin resultados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajusta la búsqueda, el sector o publica tu perfil estratégico para aparecer en el
                directorio.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
