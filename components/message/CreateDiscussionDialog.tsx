"use client"

import { createDiscussion } from "@/lib/actions/message/createDiscussion"
import { createDiscussionForteam } from "@/lib/actions/message/createDiscussionForTeam"
import { Team } from "@/generated/prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { useWorkers as getWorkers, useWorkerTeams as getWorkerTeams } from "@/lib/hooks/useWorkers"
import clsx from "clsx"
import { Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

type props = {  
  small: boolean
  mutate?: any
}

type SelectedWorker = {
  name: string
  id: string
  image: string | null
}

function CreateDiscussionDialog({ small, mutate }: props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [openDialog, setOpenDialog] = useState(false)
  const [selected, setSelected] = useState<SelectedWorker | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  const { data: session } = authClient.useSession()
  const {
    data: allWorkers = [],
    isLoading: workersLoading,
    error: workersError,
  } = getWorkers({ enabled: openDialog })

  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
  } = getWorkerTeams(openDialog)

  const workers = allWorkers.filter((w) => w.id !== session?.user.workerId)

  const loading = workersLoading || teamsLoading
  const fetchError = (workersError as Error)?.message ?? (teamsError as Error)?.message

  const handleSelectWorker = (worker: SelectedWorker) => {
    setSelected(worker)
    setSelectedTeam(null)
  }

  const handleSelectTeam = (team:Team) => {
    setSelectedTeam(team)
    setSelected(null)
  }

  const clearSelection = () => {
    setSelected(null)
    setSelectedTeam(null)
  }

  const handleConfirm = async () => {
    if (selectedTeam) {
      await createDiscussionForteam(selectedTeam)
      setOpenDialog(false)
    } else if (selected) {
      await createDiscussion({ participants: [selected], isGroup: false })
      setOpenDialog(false)
    }
    if (mutate) mutate()
    router.refresh()
  }

  return (
    <>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <Button
            className={clsx("rounded-full", { "text-xs": small === true })}
            size={small ? "sm" : "lg"}
          >
            Créer une discussion <Plus />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Commencer une discussion</DialogTitle>
            <div className="space-y-4 pt-4">
              <Input placeholder="Rechercher un employé ou une équipe" />

              {/* Badge Area */}
              {(selected || selectedTeam) && (
                <div className="flex flex-wrap gap-2 border-b border-gray-100 py-2">
                  {selected && (
                    <Badge
                      variant="secondary"
                      className="gap-2 rounded-full py-1 pr-2 pl-1"
                    >
                      <Avatar className="size-6">
                        <AvatarImage src={selected.image ?? ""} />
                        <AvatarFallback>
                          {selected.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selected.name}</span>
                      <X
                        className="size-4 shrink-0 cursor-pointer transition-colors hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearSelection()
                        }}
                      />
                    </Badge>
                  )}
                  {selectedTeam && (
                    <Badge
                      variant="secondary"
                      className="gap-2 rounded-full py-1 pr-2 pl-3"
                    >
                      <span>
                        Équipe: {selectedTeam.name ?? selectedTeam.id}
                      </span>
                      <X
                        className="size-4 shrink-0 cursor-pointer transition-colors hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearSelection()
                        }}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {loading && (
            <div className="flex justify-center py-8">
              <Spinner className="size-8" />
            </div>
          )}
          {fetchError && (
            <p className="py-4 text-sm text-red-500">{fetchError}</p>
          )}

          {!loading && !fetchError && (
            <div className="custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
              <div className="space-y-4">
                <section>
                  <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Employés
                  </h4>
                  <ul className="space-y-1">
                    {workers.length > 0 ? (
                      workers.map((e: any) => {
                        const isSelected = selected?.id === e.id
                        return (
                          <li
                            key={e.id}
                            onClick={() =>
                              handleSelectWorker({
                                name: e.name,
                                id: e.id,
                                image: e.image,
                              })
                            }
                            className={clsx(
                              "group flex cursor-pointer flex-row items-center space-x-3 rounded-lg p-2 transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-accent"
                            )}
                          >
                            <Avatar className="size-10">
                              <AvatarImage src={e.image ?? ""} />
                              <AvatarFallback>
                                {e.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {e.name}
                            </span>
                          </li>
                        )
                      })
                    ) : (
                      <li className="pl-2 text-sm text-muted-foreground italic">
                        Aucun employé trouvé
                      </li>
                    )}
                  </ul>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Équipes
                  </h4>
                  <ul className="space-y-1">
                    {teams.length > 0 ? (
                      teams.map((t:any) => {
                        const isSelected = selectedTeam?.id === t.id
                        return (
                          <li
                            key={t.id}
                            onClick={() => handleSelectTeam(t)}
                            className={clsx(
                              "group flex cursor-pointer flex-row items-center space-x-3 rounded-lg p-2 transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-accent"
                            )}
                          >
                            <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                              {t.name?.slice(0, 2) ?? "TM"}
                            </div>
                            <span className="text-sm font-medium">
                              {t.name ?? t.id}
                            </span>
                          </li>
                        )
                      })
                    ) : (
                      <li className="pl-2 text-sm text-muted-foreground italic">
                        Aucune équipe trouvée
                      </li>
                    )}
                  </ul>
                </section>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t border-gray-100 pt-4">
            <Button
              className="rounded-full"
              variant="ghost"
              onClick={() => setOpenDialog(false)}
            >
              Annuler
            </Button>
            <Button
              className="rounded-full px-8"
              disabled={isPending || (!selected && !selectedTeam)}
              onClick={() => startTransition(async () => await handleConfirm())}
            >
              {isPending ? <Spinner className="size-4" /> : "Démarrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreateDiscussionDialog
