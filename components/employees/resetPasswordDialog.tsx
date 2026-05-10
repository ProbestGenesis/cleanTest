import React from 'react'
import { Key } from 'lucide-react'

export default function ResetPasswordDialog({ workerId, workerName, matricule }: any) {
  return (
    <div className="flex flex-col space-y-2 cursor-pointer" onClick={() => alert("Réinitialisation de mot de passe : À implémenter")}>
      <span className="flex justify-between w-full hover:bg-accent hover:text-accent-foreground transition-all py-2 px-0.5 rounded-lg text-sm">
        Réinitialiser mot de passe
        <Key size={16} />
      </span>
    </div>
  )
}
