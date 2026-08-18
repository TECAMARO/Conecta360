'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { profileInputClass } from '@/components/sector-select'
import {
  MAX_PROFILE_CARD_TAGS,
  toggleProfileCardTag,
} from '@/lib/profile-card-tags'
import { Plus, X, AlertTriangle, Check, Square } from 'lucide-react'

export function StandardTagSelector({
  label,
  hint,
  options,
  tags,
  cardTags = null,
  onChange,
  onCardTagsChange,
  disabled = false,
  hasError = false,
  id,
}: {
  label: string
  hint?: ReactNode
  options: readonly string[]
  tags: string[]
  cardTags?: string[] | null
  onChange: (tags: string[]) => void
  onCardTagsChange?: (cardTags: string[]) => void
  disabled?: boolean
  hasError?: boolean
  id?: string
}) {
  const [customDraft, setCustomDraft] = useState('')
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const customTags = tags.filter((tag) => !options.includes(tag))
  const cardSelectionActive = !disabled && Boolean(onCardTagsChange)
  const selectedCardTags = cardTags ?? []
  const cardLimitReached = selectedCardTags.length >= MAX_PROFILE_CARD_TAGS

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

  function toggleCardSelection(tag: string) {
    if (!onCardTagsChange || disabled) return
    onCardTagsChange(toggleProfileCardTag(cardTags, tag))
  }

  function onCustomKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addCustomTag(customDraft)
    }
  }

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
        {label}
        {hasError ? (
          <AlertTriangle
            className="size-4 shrink-0 text-red-600"
            aria-hidden="true"
            title="Campo requerido para publicar"
          />
        ) : null}
      </p>
      {hint ? <p className="mb-2 text-xs text-muted-foreground">{hint}</p> : null}
      {cardSelectionActive ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Marca hasta {MAX_PROFILE_CARD_TAGS} etiquetas para mostrarlas en tu tarjeta de Explorar
          Participantes. Si no marcas ninguna, se mostrarán hasta {MAX_PROFILE_CARD_TAGS}{' '}
          automáticamente.
        </p>
      ) : null}

      {tags.length > 0 && (
        <div className={cn('mb-3', cardSelectionActive ? 'space-y-2' : 'flex flex-wrap gap-2')}>
          {tags.map((tag) => {
            const onCard = selectedCardTags.includes(tag)
            const cardToggleDisabled = cardSelectionActive && cardLimitReached && !onCard

            if (cardSelectionActive) {
              return (
                <div
                  key={tag}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{tag}</span>
                  <button
                    type="button"
                    disabled={cardToggleDisabled}
                    aria-pressed={onCard}
                    aria-label={
                      onCard
                        ? `Quitar ${tag} de la tarjeta del directorio`
                        : `Mostrar ${tag} en la tarjeta del directorio`
                    }
                    onClick={() => toggleCardSelection(tag)}
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                      onCard
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                      cardToggleDisabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {onCard ? (
                      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <Square className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                    aria-label={`Eliminar ${tag}`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )
            }

            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            )
          })}
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
