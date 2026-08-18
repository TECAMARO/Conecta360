import type { LucideIcon } from 'lucide-react'

export function AuthFieldLabel({
  htmlFor,
  icon: Icon,
  children,
}: {
  htmlFor: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#1a3c34]"
    >
      <Icon className="size-4 shrink-0 text-[#1a3c34]" aria-hidden="true" />
      {children}
    </label>
  )
}
