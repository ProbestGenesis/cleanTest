'use client'

import { Worker } from '@/generated/prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { updateWorkerContract } from '@/lib/actions/workers/addWorker'
import { Coffee } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

type Props = {
  data: Worker
}

export default function PauseActivityDialog({ data }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pauseStatus, setPauseStatus] = useState<'TIMEOFF' | 'SICK_LEAVE' | 'ACTIF' | 'VACATION'>(
    data.status === 'ACTIF' ? 'TIMEOFF' : 'ACTIF'
  )

  const handleUpdateStatus = () => {
    startTransition(async () => {
      const { ok, message } = await updateWorkerContract({
        id: data.id,
        status: pauseStatus,
      })
      if (ok) {
        toast.success(message)
        setIsOpen(false)
      } else {
        toast.error(message)
      }
    })
  }

  const isOnLeave = data.status !== 'ACTIF'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <span className="flex justify-between w-full hover:text-accent-foreground hover:bg-accent transition-all py-2 px-0.5 rounded-lg text-accent cursor-pointer">
          <p>{isOnLeave ? 'Remettre en activité' : 'Mettre en pause'}</p>
          <Coffee size={20} />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isOnLeave ? "Remettre l'employé en activité" : "Mettre l'activité en pause"} -{' '}
            {data.name}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez la raison de l&apos;indisponibilité ou remettez l&apos;employé en activité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Raison de la pause / Statut</Label>
            <Select value={pauseStatus} onValueChange={(val: any) => setPauseStatus(val)}>
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
            variant={pauseStatus === 'ACTIF' ? 'default' : 'destructive'}
            className="w-full rounded-full"
            onClick={handleUpdateStatus}
            disabled={isPending}
          >
            {isPending ? (
              <Spinner />
            ) : (
              <>{pauseStatus === 'ACTIF' ? 'Réactiver' : 'Confirmer la pause'}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
