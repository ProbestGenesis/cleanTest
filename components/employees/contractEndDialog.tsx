"use client"

import { Worker } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { updateWorkerContract } from "@/lib/actions/workers/addWorker"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, History, UserMinus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

type Props = {
  data: Worker
}

type TerminateStatus = "INACTIF" | "TIMEOFF" | "FIRED"

export default function ContractEndDialog({ data }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(
    data.officialEnd ? new Date(data.officialEnd) : undefined
  )
  const [newDuration, setNewDuration] = useState(data.contractDuration || "")
  const [terminateStatus, setTerminateStatus] =
    useState<TerminateStatus>("INACTIF")

  const refreshWorkers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workers"] }),
      queryClient.invalidateQueries({ queryKey: ["workerStats"] }),
    ])
    router.refresh()
  }

  const handleTerminate = () => {
    startTransition(async () => {
      const { ok, message } = await updateWorkerContract({
        id: data.id,
        status: terminateStatus,
      })
      if (ok) {
        toast.success(message)
        await refreshWorkers()
        setIsOpen(false)
      } else {
        toast.error(message)
      }
    })
  }

  const handleExtend = () => {
    startTransition(async () => {
      const { ok, message } = await updateWorkerContract({
        id: data.id,
        officialEnd: newEndDate,
        contractDuration: newDuration,
        status: "ACTIF",
      })
      if (ok) {
        toast.success(message)
        await refreshWorkers()
        setIsOpen(false)
      } else {
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <span className="flex w-full cursor-pointer justify-between rounded-lg px-0.5 py-2 text-accent transition-all hover:bg-accent hover:text-accent-foreground">
          <p>Gérer le contrat</p>
          <History size={20} />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestion du contrat - {data.name}</DialogTitle>
          <DialogDescription>
            Souhaitez-vous mettre fin au contrat ou le prolonger ?
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terminate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terminate">Fin de contrat</TabsTrigger>
            <TabsTrigger value="extend">Prolongation</TabsTrigger>
          </TabsList>

          <TabsContent value="terminate" className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Raison/Statut de fin</Label>
              <Select
                value={terminateStatus}
                onValueChange={(val) =>
                  setTerminateStatus(val as TerminateStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INACTIF">
                    Fin de contrat standard{" "}
                  </SelectItem>
                  <SelectItem value="TIMEOFF">
                    Mise en disponibilité / Pause{" "}
                  </SelectItem>
                  <SelectItem value="FIRED">Licenciement </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/*   <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium text-center">
                Cette action changera le statut de l'employé vers {terminateStatus}.
              </p>
            </div>*/}{" "}
            <Button
              variant="destructive"
              className="w-full rounded-full"
              onClick={handleTerminate}
              disabled={isPending}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Confirmer
            </Button>
          </TabsContent>

          <TabsContent value="extend" className="space-y-4 py-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Nouvelle durée (en mois)</Label>
                <Select value={newDuration} onValueChange={setNewDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mois</SelectItem>
                    <SelectItem value="3">3 mois</SelectItem>
                    <SelectItem value="6">6 mois</SelectItem>
                    <SelectItem value="12">12 mois</SelectItem>
                    <SelectItem value="24">24 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Nouvelle date de fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start rounded-full text-left font-normal",
                        !newEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newEndDate ? (
                        format(newEndDate, "PPP", { locale: fr })
                      ) : (
                        <span>Choisir une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newEndDate}
                      onSelect={setNewEndDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleExtend}
              disabled={isPending}
            >
              Enregistrer la prolongation
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
