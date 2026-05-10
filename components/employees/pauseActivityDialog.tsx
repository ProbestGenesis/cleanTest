"use client"

import { Worker } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { updateWorkerContract } from "@/lib/actions/workers/addWorker"
import { Coffee } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type Props = {
  data: Worker
}

type PauseStatus = "TIMEOFF" | "SICK_LEAVE" | "ACTIF" | "VACATION"

export default function PauseActivityDialog({ data }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pauseStatus, setPauseStatus] = useState<PauseStatus>(
    data.status === "ACTIF" ? "TIMEOFF" : "ACTIF"
  )

  const handleUpdateStatus = () => {
    startTransition(async () => {
      const { ok, message } = await updateWorkerContract({
        id: data.id,
        status: pauseStatus,
      })
      if (ok) {
        toast.success(message)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["workers"] }),
          queryClient.invalidateQueries({ queryKey: ["workerStats"] }),
        ])
        router.refresh()
        setIsOpen(false)
      } else {
        toast.error(message)
      }
    })
  }

  const isOnLeave = data.status !== "ACTIF"

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <span className="flex w-full cursor-pointer justify-between rounded-lg px-0.5 py-2 text-accent transition-all hover:bg-accent hover:text-accent-foreground">
          <p>{isOnLeave ? "Remettre en activité" : "Mettre en pause"}</p>
          <Coffee size={20} />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isOnLeave
              ? "Remettre l'employé en activité"
              : "Mettre l'activité en pause"}{" "}
            - {data.name}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez la raison de l&apos;indisponibilité ou remettez
            l&apos;employé en activité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Raison de la pause / Statut</Label>
            <Select
              value={pauseStatus}
              onValueChange={(val) => setPauseStatus(val as PauseStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIF">Remettre en activité </SelectItem>
                <SelectItem value="TIMEOFF">Indisponibilité / Pause</SelectItem>
                <SelectItem value="SICK_LEAVE">Congé Maladie</SelectItem>
                <SelectItem value="VACATION">Congés / Vacances</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={pauseStatus === "ACTIF" ? "default" : "destructive"}
            className="w-full rounded-full"
            onClick={handleUpdateStatus}
            disabled={isPending}
          >
            {isPending ? (
              <Spinner />
            ) : (
              <>
                {pauseStatus === "ACTIF" ? "Réactiver" : "Confirmer la pause"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
