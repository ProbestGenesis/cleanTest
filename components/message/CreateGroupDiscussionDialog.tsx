"use client"

import { createDiscussion } from "@/lib/actions/message/createDiscussion"
import { createDiscussionForteam } from "@/lib/actions/message/createDiscussionForTeam"
import { Worker, Team } from "@/generated/prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import clsx from "clsx"
import { UsersRound, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { SetStateAction, useEffect, useState, useTransition } from "react"

type props = {
  small: boolean
  mutate?: any
}

export type Member = {
  id: string
  name: string | null
  image: string | null
  role?: string
}

function CreateGroupDiscussionDialog({ small, mutate }: props) {
  const router = useRouter()
  const [isPending, startTranstion] = useTransition()
  const [employees, setEmployees] = useState<Worker[] | null>(null)
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: session } = authClient.useSession()
  const workerId = session?.user.workerId

  const [selected, setSelected] = useState<Member[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(
    null
  )

  const [openGroupDialog, setOpenGroupDialog] = useState(false)
  const [groupName, setGroupName] = useState("")

  const fetchEmployee = async () => {
    const res = await fetch("/api/worker")
    if (!res.ok) throw new Error("Erreur lors de la récupération des employés")
    const { data } = await res.json()
    return data
  }

  const fetchTeam = async () => {
    const res = await fetch("/api/worker/team")
    if (!res.ok) throw new Error("Erreur lors de la récupération des équipes")
    const { data } = await res.json()
    return data
  }

  useEffect(() => {
    if (!openDialog) return
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.all([fetchEmployee(), fetchTeam()])
      .then(([employeesData, teamsData]) => {
        if (!mounted) return
        setEmployees(employeesData)
        setTeams(teamsData)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message ?? "Une erreur est survenue")
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [openDialog])

  const toggleSelect = ({ name, id, image, role }: Member) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === id)) {
        const newSelected = prev.filter((p) => p.id !== id)
        setChecked((c) => ({ ...c, ids: newSelected.map((p) => p.id) }))
        return newSelected
      } else {
        const newSelected = [...prev, { id, name, image, role }]
        setChecked((c) => ({ ...c, ids: newSelected.map((p) => p.id) }))
        return newSelected
      }
    })
  }

  const handleConfirm = async () => {
    if (selectedTeam) {
      await createDiscussionForteam(selectedTeam)
    }
    if (selected.length === 1) {
      setError("Vous devez choisir plus d'un élement")
    } else {
      setOpenGroupDialog(true)
    }

    if (mutate) mutate()
    router.refresh()
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Nom du groupe requis.")
      return
    }
    await createDiscussion({
      participants: selected,
      isGroup: true,
      groupName: groupName.trim(),
    })
    setOpenGroupDialog(false)
    setOpenDialog(false)
    setGroupName("")
    setSelected([])
    setChecked({ ids: [], state: false })
    if (mutate) mutate()
    router.refresh()
  }

  const [checked, setChecked] = useState<{ ids: string[]; state: boolean }>({
    ids: [],
    state: false,
  })

  return (
    <>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <Button
            className={clsx("rounded-full", {
              "text-xs": small === true,
            })}
            size={small ? "sm" : "lg"}
          >
            Créer un groupe <UsersRound />{" "}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une discussion de groupe</DialogTitle>
            <div className="space-y-4 pt-4">
              <Input placeholder="Rechercher un employé" />

              {/* Selected Members Badges */}
              {selected.length > 0 && (
                <div className="flex max-h-32 flex-wrap items-baseline gap-2 overflow-y-auto border-b border-gray-100 py-2">
                  {selected.map((m) => (
                    <Badge
                      key={m.id}
                      variant="secondary"
                      className="gap-2 rounded-full py-1 pr-2 pl-1"
                    >
                      <Avatar className="size-6">
                        <AvatarImage src={m.image ?? ""} />
                        <AvatarFallback>
                          {m.name?.slice(0, 2) ?? "??"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[80px] truncate">{m.name}</span>
                      <X
                        className="size-4 shrink-0 cursor-pointer transition-colors hover:text-destructive"
                        onClick={() => toggleSelect(m)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          {loading && (
            <div className="flex justify-center py-8">
              <Spinner className="size-8" />
            </div>
          )}
          {error && <p className="py-2 text-sm text-red-500">{error}</p>}

          {!loading && !error && (
            <div className="custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
              <div className="space-y-6">
                <section>
                  <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Employés
                  </h4>
                  <ul className="space-y-1">
                    {employees && employees?.length > 0 ? (
                      employees
                        .filter((e) => e.id !== workerId)
                        .map((e) => {
                          const isSelected = selected.some(
                            (item) => item.id === e.id
                          )
                          return (
                            <ItemOfWorkers
                              key={e.id}
                              e={e}
                              toggleSelect={toggleSelect}
                              setChecked={setChecked}
                              isSelected={isSelected}
                              checked={checked}
                            />
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
                    {teams && teams.length > 0 ? (
                      teams?.map((t) => (
                        <li
                          key={t.id}
                          className={clsx(
                            "group flex cursor-pointer flex-row items-center space-x-3 rounded-lg p-2 transition-colors",
                            selectedTeam?.id === t.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-accent"
                          )}
                          onClick={() => setSelectedTeam(t)}
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                            {t.name?.slice(0, 2) ?? "TM"}
                          </div>
                          <span className="text-sm font-medium">
                            {t.name ?? t.id}
                          </span>
                        </li>
                      ))
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
              variant={"ghost"}
              onClick={() => {
                setOpenDialog(false)
              }}
            >
              Annuler
            </Button>

            <Button
              className="rounded-full px-8"
              disabled={isPending || selected.length <= 1}
              onClick={() => {
                startTranstion(async () => {
                  await handleConfirm()
                })
              }}
            >
              {isPending ? (
                <Spinner className="size-4" />
              ) : (
                `Suivant (${selected.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour nom du groupe */}
      <Dialog open={openGroupDialog} onOpenChange={setOpenGroupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Donner un nom au groupe</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nom du groupe"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpenGroupDialog(false)}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              disabled={isPending || !groupName.trim()}
              onClick={() => {
                startTranstion(async () => {
                  await handleCreateGroup()
                })
              }}
              className="rounded-full px-8"
            >
              {isPending ? <Spinner className="size-4" /> : `Créer`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ItemOfWorkers = ({
  e,
  toggleSelect,
  setChecked,
  isSelected,
  checked,
}: {
  e: Worker
  toggleSelect: ({ name, id, image, role }: Member) => void
  setChecked: (
    value: SetStateAction<{
      ids: string[]
      state: boolean
    }>
  ) => void
  isSelected: boolean
  checked: {
    ids: string[]
    state: boolean
  }
}) => {
  return (
    <li
      key={e.id}
      onClick={() => {
        toggleSelect({ name: e.name, id: e.id, image: e.image, role: e.role })
        setChecked((prev: any) => {
          if (prev.ids.includes(e.id)) {
            const newIds = prev.ids.filter((item: any) => item !== e.id)
            return { ids: newIds, state: newIds.length > 0 }
          }

          const newIds = [...prev.ids, e.id]
          return { ids: newIds, state: true }
        })
      }}
      className={clsx(
        "group flex cursor-pointer flex-row items-center justify-between space-x-3 rounded-lg p-2 transition-colors",
        isSelected ? "bg-primary/10" : "hover:bg-accent"
      )}
    >
      <div className="flex items-center space-x-3">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={e.image ?? ""} />
          <AvatarFallback>{e.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span
          className={clsx(
            "text-sm font-medium",
            isSelected ? "text-primary" : "text-foreground"
          )}
        >
          {e.name}
        </span>
      </div>

      <Checkbox
        checked={isSelected}
        className={clsx(
          "size-5 rounded-full",
          isSelected ? "border-primary bg-primary" : "border-gray-300"
        )}
        onCheckedChange={() => {}} // déjà géré par le li click
      />
    </li>
  )
}
export default CreateGroupDiscussionDialog
