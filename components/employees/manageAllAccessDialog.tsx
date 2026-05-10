/**Ne pas oublier de rendre coherent les routes pour la recuperation du worker */

"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings } from "lucide-react"
import PageAccessDialog from "./pageAccessDialog"
import { Worker } from "@/generated/prisma/client"
import { useWorkers } from "@/lib/hooks/useWorkers"

type WorkerWithAccount = Worker & {
  workAccount: {
    id: string
    role: string | null
    pageAccess: string[]
  } | null
}

export default function ManageAllAccessDialog() {
  const queryClient = useQueryClient()
  const { data: workers = [], isLoading, error } = useWorkers()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          <p className='max-sm:hidden'>Gérer les accès globaux</p>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]  flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestion des accès par utilisateur</DialogTitle>
          <DialogDescription>
            Modifier les droits d'accès aux pages pour tous les employés ayant un compte.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="p-4 text-center text-red-500">
            Une erreur est survenue lors du chargement des données.
          </div>
        )}
        
        {isLoading && (
          <div className="p-4 text-center">Chargement...</div>
        )}
        
       <div className="max-h-[80vh] overflow-y-auto">
         <ScrollArea className="pr-4 mt-2"> {workers && (
          
            <div className="space-y-4">
              {workers
                .filter((worker) => worker.workAccount?.role !== "superadmin")
                .map((worker) => (
                <div
                  key={worker.id}
                  className="flex flex-1 items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={worker.image || ""} />
                      <AvatarFallback>{worker.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.role}</p>

                      <p className="text-wrap text-xs max-w-3xs">
                        {worker.workAccount?.pageAccess.join(", ")}
                      </p>
                    </div>
                  </div>
                  
                  {worker.workAccount && (
                    <PageAccessDialog
                      userId={worker.workAccount.id}
                      userName={worker.name}
                      initialAccess={worker.workAccount.pageAccess}
                      userRole={worker.workAccount.role}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['workers-accounts'] })}
                      trigger={
                        <Button variant="ghost" size="sm" className="w-fit rounded-full">
                          Modifier
                        </Button>
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          
        )}</ScrollArea>
        
        </div> 
      
      </DialogContent>
    </Dialog>
  )
}
