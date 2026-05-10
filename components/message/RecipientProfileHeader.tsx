import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Bell, Video, Users, Loader2 } from 'lucide-react'
import type { Member } from './CreateGroupDiscussionDialog'

const getInitials = (name: string | null | undefined) =>
  name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

interface RecipientProfileHeaderProps {
  recipient: Member | null | undefined
  onTag: () => void
  onMeet: () => void
  onGroup: () => void
  isGeneratingMeet: boolean
}

export function RecipientProfileHeader({
  recipient,
  onTag,
  onMeet,
  onGroup,
  isGeneratingMeet,
}: RecipientProfileHeaderProps) {
  if (!recipient) return null

  return (
    <div className="flex flex-col items-center py-8 mb-6 border-b border-slate-100 bg-white/50 rounded-2xl mx-2 mt-2">
      <div className="relative mb-4">
        <Avatar className="size-24 border-4 border-white shadow-xl">
          <AvatarImage src={recipient.image ?? ""} />
          <AvatarFallback className="text-2xl text-primary font-bold">
            {getInitials(recipient.name)}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 mb-1">{recipient.name}</h2>
      <p className="text-sm text-slate-500 mb-6 font-medium bg-slate-100 px-3 py-1 rounded-full">Discussion individuelle</p>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full flex items-center gap-2 px-4 h-10 border-slate-200 hover:border-primary hover:text-primary transition-all bg-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onTag()
          }}
        >
          <Bell className="w-4 h-4" />
          <span className="font-semibold text-xs tracking-wider">TAG</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full flex items-center gap-2 px-4 h-10 border-slate-200 hover:border-primary hover:text-primary transition-all bg-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onMeet()
          }}
          disabled={isGeneratingMeet}
        >
          {isGeneratingMeet ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Video className="w-4 h-4 shrink-0" />
          )}
          <span className="font-semibold text-xs tracking-wider">MEET</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full flex items-center gap-2 px-4 h-10 border-slate-200 hover:border-primary hover:text-primary transition-all bg-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onGroup()
          }}
        >
          <Users className="w-4 h-4" />
          <span className="font-semibold text-xs tracking-wider">GROUPE</span>
        </Button>
      </div>
    </div>
  )
}
