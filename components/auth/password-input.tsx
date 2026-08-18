'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export const authPasswordInputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white py-2.5 pl-3.5 pr-11 text-sm text-[#1a3c34] outline-none transition-colors placeholder:text-[#5a6b62]/60 focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

export const platformPasswordInputClass =
  'w-full rounded-lg border border-border bg-background py-2.5 pl-3.5 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/25'

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required = true,
  className,
  tone = 'auth',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: 'current-password' | 'new-password'
  minLength?: number
  required?: boolean
  className?: string
  /** `auth` = login/registro (fondo claro fijo). `platform` = plataforma con dark mode. */
  tone?: 'auth' | 'platform'
}) {
  const [visible, setVisible] = useState(false)
  const inputClass = tone === 'platform' ? platformPasswordInputClass : authPasswordInputClass

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, className)}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className={cn(
          'absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2',
          tone === 'platform'
            ? 'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary/40'
            : 'text-[#5a6b62] hover:bg-[#eef3ea] hover:text-[#1a3c34] focus-visible:ring-[#8ac441]/40',
        )}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
