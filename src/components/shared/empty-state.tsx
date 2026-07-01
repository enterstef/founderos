import { ReactNode } from 'react'
import { FileIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg border-dashed bg-muted/20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        {icon || <FileIcon className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
