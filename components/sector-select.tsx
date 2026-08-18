'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { SECTORS } from '@/lib/event-config'
import { MAX_PROFILE_SECTORS, toggleProfileSector } from '@/lib/profile-sectors'
import type { PlatformTheme } from '@/lib/platform-preferences'
import { platformThemedSurfaceClass } from '@/lib/platform-themed-surface'
import { cn } from '@/lib/utils'
import { ChevronDown, Search, AlertTriangle, Check, Layers } from 'lucide-react'

const MENU_HEADER_HEIGHT = 76

export const profileInputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-sm text-[#1a3c34] outline-none transition-colors placeholder:text-[#5a6b62]/60 focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'bottom' | 'top'
}

type SectorSelectBase = {
  onOpenChange?: (open: boolean) => void
  id?: string
  required?: boolean
  hasError?: boolean
  className?: string
  label?: string
  labelIcon?: ReactNode
  appearance?: 'auth' | 'platform'
  theme?: PlatformTheme
  maxSelections?: number
}

type SectorSelectSingleProps = SectorSelectBase & {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

type SectorSelectMultipleProps = SectorSelectBase & {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

export function SectorSelect(props: SectorSelectSingleProps | SectorSelectMultipleProps) {
  const {
    onOpenChange,
    id = 'sector',
    required = true,
    hasError = false,
    className,
    label = 'Sector Económico / Categoría',
    labelIcon,
    appearance = 'auth',
    theme = 'light',
    maxSelections = MAX_PROFILE_SECTORS,
    multiple = false,
  } = props

  const selected = multiple
    ? props.value
    : props.value
      ? [props.value]
      : []

  const triggerRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuRect, setMenuRect] = useState<MenuPosition | null>(null)

  const isPlatform = appearance === 'platform'

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

  function isSelected(sector: string) {
    return selected.includes(sector)
  }

  function select(sector: string) {
    if (multiple) {
      props.onChange(toggleProfileSector(selected, sector, { minSelection: required ? 1 : 0 }))
      return
    }

    props.onChange(sector)
    setQuery('')
    setOpenState(false)
  }

  function triggerLabel() {
    if (selected.length === 0) {
      return multiple ? 'Selecciona uno o más sectores' : 'Selecciona un sector'
    }
    if (!multiple || selected.length === 1) return selected[0]
    return selected.join(' · ')
  }

  const atMax = multiple && selected.length >= maxSelections

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
              className={
                isPlatform
                  ? platformThemedSurfaceClass(
                      theme,
                      'fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl ring-1 ring-black/5',
                    )
                  : 'fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-[#dde8d8] bg-white text-[#1a3c34] shadow-xl ring-1 ring-black/5'
              }
              style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
                maxHeight: menuRect.maxHeight,
              }}
            >
              <div
                className={cn(
                  'shrink-0 border-b p-2',
                  isPlatform ? 'border-border' : 'border-[#dde8d8]',
                )}
              >
                <div className="relative">
                  <Search
                    className={cn(
                      'pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2',
                      isPlatform ? 'text-muted-foreground' : 'text-[#5a6b62]',
                    )}
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar sector…"
                    className={cn(
                      'w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none',
                      isPlatform
                        ? 'border-input bg-background text-foreground focus:border-primary'
                        : 'border-[#dde8d8] bg-white text-[#1a3c34] focus:border-[#8ac441]',
                    )}
                    autoFocus
                  />
                </div>
                <p
                  className={cn(
                    'mt-1.5 px-1 text-[11px]',
                    isPlatform ? 'text-muted-foreground' : 'text-[#5a6b62]',
                  )}
                >
                  {filtered.length} de {SECTORS.length} sectores
                  {multiple ? ` · ${selected.length}/${maxSelections} seleccionados` : ''}
                </p>
              </div>
              <ul
                role="listbox"
                aria-label="Sectores del evento"
                aria-multiselectable={multiple || undefined}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
                style={{ maxHeight: listMaxHeight }}
              >
                {filtered.length > 0 ? (
                  filtered.map((sector) => {
                    const active = isSelected(sector)
                    const optionDisabled = multiple && atMax && !active

                    return (
                      <li key={sector}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          disabled={optionDisabled}
                          onClick={() => select(sector)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                            isPlatform
                              ? 'hover:bg-muted/70'
                              : 'hover:bg-[#e8f0e4]',
                            active &&
                              (isPlatform
                                ? 'bg-muted font-medium text-foreground'
                                : 'bg-[#e8f0e4] font-medium text-[#1a3c34]'),
                            optionDisabled && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <span>{sector}</span>
                          {multiple && active ? (
                            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                          ) : null}
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li
                    className={cn(
                      'px-3 py-4 text-center text-sm',
                      isPlatform ? 'text-muted-foreground' : 'text-[#5a6b62]',
                    )}
                  >
                    No se encontraron sectores
                  </li>
                )}
              </ul>
            </div>
          </>,
          document.body,
        )
      : null

  const inputClass = cn(
    'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors',
    isPlatform
      ? 'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25'
      : 'border-[#dde8d8] bg-white text-[#1a3c34] placeholder:text-[#5a6b62]/60 focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25',
  )

  const icon = labelIcon ?? (
    <Layers className="size-4 shrink-0 text-primary" aria-hidden="true" />
  )

  return (
    <div className={cn('relative', className)}>
      <label
        htmlFor={id}
        className={cn(
          'mb-1.5 flex items-center gap-2 text-sm font-medium',
          isPlatform ? 'text-foreground' : 'text-[#1a3c34]',
        )}
      >
        {icon}
        {label}
        {hasError ? (
          <AlertTriangle
            className="size-4 shrink-0 text-red-600"
            aria-hidden="true"
            title="Campo requerido para publicar"
          />
        ) : null}
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
          selected.length === 0 && (isPlatform ? 'text-muted-foreground' : 'text-[#5a6b62]/60'),
          hasError && 'border-red-300 ring-1 ring-red-200',
        )}
      >
        <span className="truncate">{triggerLabel()}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value={multiple ? selected.join('|') : selected[0] ?? ''}
          required={required && selected.length === 0}
          onChange={() => {}}
          className="sr-only"
        />
      )}
      {dropdown}
    </div>
  )
}
