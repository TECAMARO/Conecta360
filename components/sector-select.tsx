'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SECTORS } from '@/lib/event-config'
import { cn } from '@/lib/utils'
import { ChevronDown, Search } from 'lucide-react'

const inputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-sm text-[#1a3c34] outline-none transition-colors placeholder:text-[#5a6b62]/60 focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

const MENU_HEADER_HEIGHT = 76

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'bottom' | 'top'
}

export function SectorSelect({
  value,
  onChange,
  onOpenChange,
  id = 'sector',
  required = true,
  className,
  label = 'Sector Económico / Categoría',
}: {
  value: string
  onChange: (value: string) => void
  onOpenChange?: (open: boolean) => void
  id?: string
  required?: boolean
  className?: string
  label?: string
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuRect, setMenuRect] = useState<MenuPosition | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [...SECTORS]
    return SECTORS.filter((s) => s.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (!open || !triggerRef.current) return

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const padding = 12
      const spaceBelow = window.innerHeight - rect.bottom - padding
      const spaceAbove = rect.top - padding
      const preferBottom = spaceBelow >= 160 || spaceBelow >= spaceAbove
      const placement = preferBottom ? 'bottom' : 'top'
      const maxHeight = Math.min(
        340,
        Math.max(140, preferBottom ? spaceBelow : spaceAbove),
      )

      const top =
        placement === 'bottom'
          ? rect.bottom + 4
          : Math.max(padding, rect.top - maxHeight - 4)

      setMenuRect({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
        placement,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  function setOpenState(next: boolean) {
    setOpen(next)
    if (!next) setQuery('')
  }

  function select(sector: string) {
    onChange(sector)
    setQuery('')
    setOpenState(false)
  }

  const listMaxHeight = menuRect
    ? Math.max(100, menuRect.maxHeight - MENU_HEADER_HEIGHT)
    : 240

  const dropdown =
    mounted && open && menuRect
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpenState(false)}
              aria-hidden="true"
            />
            <div
              role="presentation"
              className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-[#dde8d8] bg-white shadow-xl ring-1 ring-black/5"
              style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
                maxHeight: menuRect.maxHeight,
              }}
            >
              <div className="shrink-0 border-b border-[#dde8d8] p-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#5a6b62]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar sector…"
                    className="w-full rounded-lg border border-[#dde8d8] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#8ac441]"
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 px-1 text-[11px] text-[#5a6b62]">
                  {filtered.length} de {SECTORS.length} sectores
                </p>
              </div>
              <ul
                role="listbox"
                aria-label="Sectores del evento"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
                style={{ maxHeight: listMaxHeight }}
              >
                {filtered.length > 0 ? (
                  filtered.map((sector) => (
                    <li key={sector}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === sector}
                        onClick={() => select(sector)}
                        className={cn(
                          'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#e8f0e4]',
                          value === sector && 'bg-[#e8f0e4] font-medium text-[#1a3c34]',
                        )}
                      >
                        {sector}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-4 text-center text-sm text-[#5a6b62]">
                    No se encontraron sectores
                  </li>
                )}
              </ul>
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#1a3c34]">
        {label}
      </label>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpenState(!open)}
        className={cn(
          inputClass,
          'flex items-center justify-between text-left',
          !value && 'text-[#5a6b62]/60',
        )}
      >
        <span className="truncate">{value || 'Selecciona un sector'}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          required
          onChange={() => {}}
          className="sr-only"
        />
      )}
      {dropdown}
    </div>
  )
}

export { inputClass as profileInputClass }
