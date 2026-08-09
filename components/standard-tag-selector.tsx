'use client'

import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { profileInputClass } from '@/components/sector-select'
import { Plus, X } from 'lucide-react'

export function StandardTagSelector({
  label,
  hint,
  options,
  tags,
  onChange,
  disabled = false,
  id,
}: {
  label: string
  hint?: string
  options: readonly string[]
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
  id?: string
}) {
  const [customDraft, setCustomDraft] = useState('')
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const customTags = tags.filter((tag) => !options.includes(tag))

  function toggleOption(option: string) {
    if (disabled) return
    if (tags.includes(option)) {
      onChange(tags.filter((tag) => tag !== option))
      return
    }
    onChange([...tags, option])
  }

  function addCustomTag(raw: string) {
    const value = raw.trim()
    if (!value) return
    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setCustomDraft('')
      return
    }
    onChange([...tags, value])
    setCustomDraft('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((item) => item !== tag))
  }

  function onCustomKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addCustomTag(customDraft)
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      {hint ? <p className="mb-2 text-xs text-muted-foreground">{hint}</p> : null}

      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-primary"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded p-0.5 hover:bg-primary/10"
                  aria-label={`Eliminar ${tag}`}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div
        className={cn(
          'rounded-xl border border-input bg-background p-3',
          disabled && 'opacity-60',
        )}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Opciones estandarizadas
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = tags.includes(option)
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => toggleOption(option)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50',
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {!disabled && (
        <div className="mt-3">
          <label
            htmlFor={`${fieldId}-custom`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            + Agregar etiqueta personalizada
          </label>
          <div className="flex gap-2">
            <input
              id={`${fieldId}-custom`}
              type="text"
              value={customDraft}
              onChange={(event) => setCustomDraft(event.target.value)}
              onKeyDown={onCustomKeyDown}
              onBlur={() => addCustomTag(customDraft)}
              placeholder="Ej. Certificación carbono neutro"
              className={cn(profileInputClass, 'flex-1 border-input bg-background')}
            />
            <button
              type="button"
              onClick={() => addCustomTag(customDraft)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-primary hover:bg-secondary"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar
            </button>
          </div>
        </div>
      )}

      {!disabled && customTags.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Etiquetas personalizadas activas: {customTags.join(', ')}
        </p>
      )}
    </div>
  )
}
