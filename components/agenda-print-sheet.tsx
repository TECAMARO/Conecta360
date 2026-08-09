'use client'

import { useEffect, useState } from 'react'
import type { Appointment } from '@/lib/data'
import { buildAgendaExportRows } from '@/lib/agenda-export'
import { EVENT } from '@/lib/event-config'
import { getProfileOrDefault, type UserProfile } from '@/lib/profile'

export function AgendaPrintSheet({ appointments }: { appointments: Appointment[] }) {
  const [profile, setProfile] = useState<UserProfile>(getProfileOrDefault())
  const rows = buildAgendaExportRows(appointments)

  useEffect(() => {
    setProfile(getProfileOrDefault())
  }, [])

  const organization = profile.organization || 'Organización participante'
  const representative = profile.fullName || profile.role || 'Representante'

  return (
    <section
      className="agenda-print-sheet hidden bg-white text-[#1a3c34] print:block"
      aria-hidden="true"
    >
      <header className="flex items-center gap-4 border-b-[3px] border-[#8ac441] pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Conecta360"
          className="h-[72px] w-[72px] object-contain"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">
            Conecta360 / {EVENT.name}
          </p>
          <h1 className="mt-1 text-xl font-bold text-[#1a3c34]">
            Cronograma Oficial de Reuniones Presenciales
          </h1>
          <p className="mt-1 text-sm text-[#5a6b62]">{EVENT.dateRangeLabel}</p>
        </div>
      </header>

      <div className="mt-5 rounded-lg border border-[#d4e8c8] bg-[#f3f9ef] px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4a6741]">
          Datos del participante
        </h2>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Organización:</span> {organization}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">Representante:</span> {representative}
        </p>
      </div>

      <table className="mt-6 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#1a3c34] text-white">
            <th className="border border-[#c5d4c0] px-2 py-2 text-left font-semibold">
              Día / Hora
            </th>
            <th className="border border-[#c5d4c0] px-2 py-2 text-left font-semibold">
              Organización / Contraparte
            </th>
            <th className="border border-[#c5d4c0] px-2 py-2 text-left font-semibold">
              Ubicación (Mesa)
            </th>
            <th className="border border-[#c5d4c0] px-2 py-2 text-left font-semibold">
              Propósito / Sector
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className={index % 2 === 1 ? 'bg-[#f8fbf6]' : 'bg-white'}>
              <td className="border border-[#dde8d8] px-2 py-2 align-top text-[#1a3c34]">
                {row.dateTime}
              </td>
              <td className="border border-[#dde8d8] px-2 py-2 align-top text-[#1a3c34]">
                {row.counterpart}
              </td>
              <td className="border border-[#dde8d8] px-2 py-2 align-top text-[#1a3c34]">
                {row.table}
              </td>
              <td className="border border-[#dde8d8] px-2 py-2 align-top text-[#1a3c34]">
                {row.message ? `${row.sector} — ${row.message}` : row.sector}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-8 border-t border-[#dde8d8] pt-4 text-xs leading-relaxed text-[#5a6b62]">
        <p className="font-medium text-[#1a3c34]">
          Por favor preséntate 5 minutos antes en la mesa correspondiente.
        </p>
        <p className="mt-2">
          Documento generado desde Conecta360 · Solo incluye reuniones confirmadas (
          {rows.length}).
        </p>
      </footer>
    </section>
  )
}
