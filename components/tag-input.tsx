'use client'

import { useState, type KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { profileInputClass } from '@/components/sector-select'

export function TagInput({
  label,
  hint,
  tags,
  onChange,
  placeholder,
  disabled = false,
  id,
}: {
  label: string
  hint?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}) {
  const [draft, setDraft] = useState('')
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  function addTag(raw: string) {
    const value = raw.trim()
    if (!value) return
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...tags, value])
    setDraft('')
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? <p className="mb-2 text-xs text-muted-foreground">{hint}</p> : null}

      <div
        className={cn(
          'rounded-xl border border-input bg-background px-3 py-2.5',
          disabled && 'opacity-60',
        )}
      >
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-primary"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="rounded p-0.5 hover:bg-primary/10"
                  aria-label={`Eliminar ${tag}`}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}

          {!disabled && (
            <input
              id={inputId}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => addTag(draft)}
              placeholder={tags.length === 0 ? placeholder : 'Agregar otra…'}
              className={cn(
                profileInputClass,
                'min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0',
              )}
            />
          )}
        </div>
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => addTag(draft)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar etiqueta
        </button>
      )}
    </div>
  )
}
