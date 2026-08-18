'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VerityStatus } from '@/lib/verity-status'
import { Check } from 'lucide-react'

const OPTIONS: { id: VerityStatus; className: string; label: string }[] = [
  { id: 'blue', className: 'bg-sky-500', label: 'Verity · Azul' },
  { id: 'green', className: 'bg-[#8ac441]', label: 'Verity · Verde' },
  { id: 'red', className: 'bg-red-500', label: 'Verity · Rojo (bloqueo)' },
]

function optionById(id: VerityStatus) {
  return OPTIONS.find((option) => option.id === id) ?? OPTIONS[0]
}

function VerityColorCell({
  option,
  selected,
  className,
}: {
  option: (typeof OPTIONS)[number]
  selected?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex size-7 items-center justify-center rounded-md border-2',
        option.className,
        selected ? 'border-[#1a3c34] shadow-sm' : 'border-transparent',
        className,
      )}
    >
      {selected ? (
        <Check className="size-3.5 text-white/90" strokeWidth={3} aria-hidden="true" />
      ) : null}
    </span>
  )
}

export function VerityStatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: VerityStatus
  disabled?: boolean
  onChange: (status: VerityStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = optionById(value)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function selectStatus(status: VerityStatus) {
    setOpen(false)
    if (status !== value) onChange(status)
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        title={selected.label}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${selected.label}. Cambiar estado Verity.`}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev)
        }}
        className={cn(
          'rounded-md transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c34]/30',
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90',
        )}
      >
        <VerityColorCell option={selected} selected />
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label="Seleccionar estado Verity"
          className="absolute left-0 top-full z-20 mt-1 flex flex-col gap-1 rounded-lg border border-[#dde8d8] bg-white p-1 shadow-md"
        >
          {OPTIONS.map((option) => {
            const isSelected = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                title={option.label}
                onClick={() => selectStatus(option.id)}
                className={cn(
                  'rounded-md p-0.5 transition-colors hover:bg-[#f8fbf8]',
                  isSelected && 'bg-[#f0f6ee]',
                )}
              >
                <VerityColorCell option={option} selected={isSelected} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
