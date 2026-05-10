'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useParticularTasks } from '@/lib/hooks/useWorkers'
import { assignParticularTask } from '@/lib/actions/workers/addParticularTask'
import clsx from 'clsx'
import { ShieldCheck } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

interface ParticularRoleDialogProps {
  workerId: string
  userName: string
  initialRoles: string[]
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export default function ParticularRoleDialog({
  workerId,
  userName,
  initialRoles,
  trigger,
  onSuccess,
}: ParticularRoleDialogProps) {
  const [selectedTask, setSelectedTask] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState({ ok: false, message: '' })

  const { data: tasks, isLoading } = useParticularTasks()

  useEffect(() => {
    if (tasks && initialRoles.length > 0) {
      const currentTask = (tasks as any[]).find((task) => initialRoles.includes(task.title))
      if (currentTask) {
        setSelectedTask(currentTask.id)
      }
    }
  }, [tasks, initialRoles])

  const handleToggleTasks = (roleId: string) => {
    setSelectedTask(roleId)
  }

  const handleSave = async () => {
    startTransition(async () => {
      const { ok, message } = await assignParticularTask({ taskId: selectedTask, workerId })
      if (ok) {
        setOpen(false)
        setSuccess({ ok, message })
        if (onSuccess) onSuccess()
      } else {
        setSuccess({ ok, message })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className="w-full">
        {trigger || (
          <span className="flex justify-between w-full hover:bg-accent text-accent hover:text-accent-foreground transition-all py-2 px-0.5 rounded-lg text-sm  cursor-pointer">
             <p className="t"> Rôles particuliers</p>
            <ShieldCheck size={18} />
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assigner un rôle à {userName}</DialogTitle>
          <DialogDescription>
            Sélectionnez les rôles particuliers pour cet utilisateur. Cela donnera accès à des
            fonctionnalités spécifiques sur le dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <>
            {isLoading ? (
              <div className="flex flex-col mx-auto">
                <p className="text-center mx-auto">Chargement des rôles...</p>
                <Spinner className="mx-auto text-center" />{' '}
              </div>
            ) : (
              <>
                {tasks ? (
                  <div className="flex flex-col space-y-2">
                    {tasks.length === 0  ? <p className='text-center mx-auto text-muted'>  Aucune tache disponible </p>  :
                      (tasks as any[]).map((task) => {
                        const isTakenByOtherWorker = task.workerId && task.workerId !== workerId
                        const isTakenByOtherAdjoint = task.adjointId && task.adjointId !== workerId
                        const isTaken = isTakenByOtherWorker || isTakenByOtherAdjoint
                        
                        const assignedTo = []
                        if (isTakenByOtherWorker && task.worker?.name) assignedTo.push(task.worker.name)
                        if (isTakenByOtherAdjoint && task.adjoint?.name) assignedTo.push(task.adjoint.name + " (Adjoint)")

                        return (
                          <div key={task.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`task-${workerId}-${task.id}`}
                              checked={selectedTask === task.id}
                              onCheckedChange={() => handleToggleTasks(task.id)}
                              disabled={isTaken}
                            />
                            <Label
                              htmlFor={`task-${workerId}-${task.id}`}
                              className={clsx(
                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed",
                                isTaken ? "opacity-50" : "opacity-100"
                              )}
                            >
                              {task.title} {isTaken && <span className="text-xs text-muted-foreground font-normal ml-1">
                                (Déjà assigné à {assignedTo.join(", ")})
                              </span>}
                            </Label>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-center mx-auto text-destructive">Impossible de charger les taches</p>
                )}
              </>
            )}{' '}
          </>
        </div>
        <DialogFooter className="flex flex-col w-full space-y-4">
          <div className="flex flex-row justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              fermer
            </Button>
            </DialogClose>
           {tasks && tasks.length > 0 && <Button className="rounded-full" onClick={handleSave} disabled={isPending}>
              {isPending ? <Spinner /> : 'Enregistrer'}
            </Button>}
          </div>

         <div className='flex justify-center items-center'> {success.message ? (
            <p className={clsx('text-sm', success.ok ? 'text-green-500' : 'text-red-500')}>
              {success.message}
            </p>
          ) : null} </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
