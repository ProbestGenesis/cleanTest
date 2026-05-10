import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Bell, Video, Loader2, Users } from 'lucide-react'

interface GroupProfileHeaderProps {
  name: string | null | undefined
  image: string | null | undefined
  memberCount?: number
  onTag: () => void
  onMeet: () => void
  isGeneratingMeet: boolean
}

export function GroupProfileHeader({
  name,
  image,
  memberCount,
  onTag,
  onMeet,
  isGeneratingMeet,
}: GroupProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center py-8 mb-6 border-b border-slate-100 bg-white/50 rounded-2xl mx-2 mt-2">
      <div className="relative mb-4">
        <Avatar className="size-24 border-4 border-white shadow-xl">
          <AvatarImage src={image ?? ''} />
          <AvatarFallback className="text-2xl text-primary font-bold bg-primary/10">
            {name?.slice(0, 2)?.toUpperCase() ?? '??'}
          </AvatarFallback>
        </Avatar>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-1">{name ?? 'Groupe'}</h2>

      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-6 font-medium bg-slate-100 px-3 py-1 rounded-full">
        <Users className="w-3.5 h-3.5" />
        <span>
          {memberCount !== undefined
            ? `${memberCount} membre${memberCount > 1 ? 's' : ''}`
            : 'Discussion de groupe'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* TAG — envoie une notification à tous les membres */}
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

        {/* MEET — envoie un lien Google Meet */}
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
      </div>
    </div>
  )
}
