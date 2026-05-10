import React from 'react'
import { Activity } from 'lucide-react'

export default function ActivityDrawer({ children, workerId }: { children: React.ReactNode, workerId: string }) {
  return (
    <div onClick={() => alert("Suivi d'activité : À implémenter")}>
      {children}
    </div>
  )
}
