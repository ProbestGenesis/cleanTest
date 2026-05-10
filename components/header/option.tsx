"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Clock,
  MessageSquare,
  ShieldCheck,
  SquareCheck,
  User,
} from "lucide-react"
import * as React from "react"
import { CHARGER_DU_POINTAGE, CHARGER_DU_STOCK } from "../../lib/assignedRole"
import { authClient } from "../../lib/auth-client"
import Image from "next/image";

type Opt = {
  name: string
  icon: React.ComponentType<any>
  visibleFor: string | string[],
  image?:  string 
}

function Options() {
  const { data: session } = authClient.useSession()

  const particularRole = (session?.user?.particularRole ?? []) as string[]

  const options: Opt[] = [
    { name: "gestion des tâches", icon: SquareCheck, visibleFor: "all" },
    { name: "messagerie", icon: MessageSquare, visibleFor: "all" },
    { name: "annonces", icon: MessageSquare, visibleFor: "all" },
    { name: "annonces", icon: MessageSquare, visibleFor: "all" },
    { name: "annonces", icon: MessageSquare, visibleFor: "all" },
    {
      name: "Charger du stock",
      icon: ShieldCheck,
      visibleFor: CHARGER_DU_STOCK,
    },
    {
      name: "Charger du pointage",
      icon: Clock,
      visibleFor: CHARGER_DU_POINTAGE,
    },
    { name: "Profil", icon: User, visibleFor: "all" },
  ]

  const isVisible = (visibleFor: string | string[]) => {
    if (visibleFor === "all") return true
    const list = Array.isArray(visibleFor) ? visibleFor : [visibleFor]
    return list.some((r) => particularRole.includes(r))
  }

  const visibleOptions = options.filter((o) => isVisible(o.visibleFor))

  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        {visibleOptions.map((opt) => {
          const Icon = opt.icon
          return (
            <Tooltip key={opt.name}>
              <TooltipTrigger>
                <Button variant="ghost" size={opt.image ? "icon-lg"  :"icon"} aria-label={opt.name}>
                {opt.image ?  <Image className="rounded-full w-full h-full " src={opt.image}  alt={`${session?.user.name} profil`} /> :  <Icon size={16} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{opt.name}</TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
}

export default Options
