'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthFieldLabel } from '@/components/auth/auth-field-label'
import { PasswordInput } from '@/components/auth/password-input'
import { SectorSelect, profileInputClass } from '@/components/sector-select'
import { Button } from '@/components/ui/button'
import { signUpWithEmail } from '@/lib/supabase/auth-service'
import { EVENT } from '@/lib/event-config'
import { cn } from '@/lib/utils'
import { Briefcase, Building2, Loader2, LockKeyhole, Mail, User } from 'lucide-react'

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/plataforma'
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [organization, setOrganization] = useState('')
  const [sectors, setSectors] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sectors.length === 0) return
    setError(null)
    setLoading(true)
    try {
      await signUpWithEmail({
        email,
        password,
        fullName,
        role,
        organization,
        sectors,
      })
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Crear Cuenta"
      subtitle={`Registro para ${EVENT.shortName}`}
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <AuthFieldLabel htmlFor="fullName" icon={User}>
            Nombre completo
          </AuthFieldLabel>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Nombre y apellidos"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={profileInputClass}
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="role" icon={Briefcase}>
            Cargo
          </AuthFieldLabel>
          <input
            id="role"
            type="text"
            required
            autoComplete="organization-title"
            placeholder="Director, Gerente, Coordinador…"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={profileInputClass}
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="organization" icon={Building2}>
            Empresa u Organización
          </AuthFieldLabel>
          <input
            id="organization"
            type="text"
            required
            autoComplete="organization"
            placeholder="Entidad o empresa"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className={profileInputClass}
          />
        </div>

        <SectorSelect
          multiple
          value={sectors}
          onChange={setSectors}
          autoCollapseOnInactivity="after-first"
        />

        <div className="border-t border-[#dde8d8] pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">
            Datos de acceso
          </p>
          <div className="space-y-4">
            <div>
              <AuthFieldLabel htmlFor="email" icon={Mail}>
                Correo electrónico
              </AuthFieldLabel>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="contacto@organizacion.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={profileInputClass}
              />
            </div>
            <div>
              <AuthFieldLabel htmlFor="password" icon={LockKeyhole}>
                Contraseña
              </AuthFieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                value={password}
                onChange={setPassword}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className={cn('mt-2 h-11 w-full bg-[#1a3c34] text-white hover:bg-[#234a40]')}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Crear Cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#5a6b62]">
        ¿Ya tienes cuenta?{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
          className="font-semibold text-[#1a3c34] underline-offset-4 hover:text-[#8ac441] hover:underline"
        >
          Iniciar Sesión
        </Link>
      </p>
    </AuthShell>
  )
}

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  )
}
