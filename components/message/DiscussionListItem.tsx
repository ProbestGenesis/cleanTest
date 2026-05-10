'use client'

import { Discussion } from '@/generated/prisma/client'
import eware from '@/assets/image/logo/ewareLogo.svg'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useQueryState } from 'nuqs'
import { authClient } from '@/lib/auth-client'

type Props = {
  item: Discussion & { groupMessage?: any }
}

function DiscussionListItem({ item }: Props) {
  const [, setDiscussionId] = useQueryState('di')
  const { data: session } = authClient.useSession()
  const currentWorkerId = (session?.user as any)?.workerId

  const firstReceiptName = (() => {
    const firstReceipt = item.receipt?.[0]
    if (firstReceipt && typeof firstReceipt === 'object' && 'name' in firstReceipt) {
      const name = (firstReceipt as { name?: unknown }).name
      return typeof name === 'string' ? name : null
    }
    return null
  })()

  const interlocutor = (() => {
    if (item.groupMessage) return null
    if (!Array.isArray(item.receipt)) return null
    return item.receipt.find((p: any) => p && typeof p === 'object' && p.id !== currentWorkerId) as
      | { name?: string; image?: string }
      | undefined
  })()

  const isValidationMessage = item.name?.toLowerCase().includes('validation')
  const displayName = isValidationMessage ? item.name : (interlocutor?.name || item.name || `${firstReceiptName || ''}`)
  const displayImage = isValidationMessage ? eware.src : (interlocutor?.image || item.image || '')

  return (
    <li
      className="flex flex-row items-center gap-3 w-full min-w-0"
      onClick={() => {
        setDiscussionId(item.id)
      }}
    >
      <Avatar className="size-11 shrink-0">
        <AvatarImage src={displayImage} />
        <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col min-w-0 w-full">
        <h3 className="text-accent text-sm mb-1 capitalize truncate">{displayName}</h3>

        <span className="flex items-center justify-between w-full gap-2">
          <p className="text-xs text-muted-foreground truncate">{`${item.lastMessage}`}</p>
          {!item.isView && <span className="rounded-full bg-primary h-2 w-2 shrink-0" />}
        </span>
      </div>
    </li>
  )
}

export default DiscussionListItem
