'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { STOCK_OUT_CODE_VALIDATION_TASK_TITLE } from '@/lib/constants/particularTasks'
import StockOutCodeValidationDialog from './stockOutCodeValidationDialog'
import { ShieldCheck } from 'lucide-react'

export default function StockCodeValidationTrigger() {
  const { data: session } = authClient.useSession()
  const roles = (session?.user as { particularRole?: string[] } | null | undefined)?.particularRole
  const allowed = roles?.includes(STOCK_OUT_CODE_VALIDATION_TASK_TITLE) ?? false

  if (!allowed) return null

  return (
    <StockOutCodeValidationDialog>
      <Button variant="outline" size="icon" className="rounded-full" title="Valider un code">
        <ShieldCheck className="size-5" />
      </Button>
    </StockOutCodeValidationDialog>
  )
}

