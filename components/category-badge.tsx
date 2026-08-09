import { cn } from '@/lib/utils'
import { categoryLabel, type CategoryId } from '@/lib/data'
import { Leaf, Lightbulb, Recycle, Coins } from 'lucide-react'

const styles: Record<
  CategoryId,
  { className: string; icon: typeof Leaf }
> = {
  conservacion: {
    className: 'bg-[#e3f1e0] text-[#1b5e20]',
    icon: Leaf,
  },
  'innovacion-social': {
    className: 'bg-[#e0eef7] text-[#1b4a66]',
    icon: Lightbulb,
  },
  'economia-circular': {
    className: 'bg-[#e6f2e8] text-[#256b3a]',
    icon: Recycle,
  },
  financiamiento: {
    className: 'bg-[#f0ecdd] text-[#7a5b17]',
    icon: Coins,
  },
}

export function CategoryBadge({
  category,
  className,
}: {
  category: CategoryId
  className?: string
}) {
  const { className: color, icon: Icon } = styles[category]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        color,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {categoryLabel(category)}
    </span>
  )
}
