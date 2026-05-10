"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ParticularTask } from "@/generated/prisma/client"
import {
  addParticularTask,
  assignParticularTask,
  deleteParticularTask,
  updateParticularTask,
} from "@/lib/actions/workers/addParticularTask"
import {
  ATTENDANCE_RECORDER_TASK_DESCRIPTION,
  ATTENDANCE_RECORDER_TASK_TITLE,
  STOCK_MANAGEMENT_TASK_DESCRIPTION,
  STOCK_MANAGEMENT_TASK_TITLE,
} from "@/lib/constants/particularTasks"
import { useParticularTasks, useWorkers } from "@/lib/hooks/useWorkers"
import { ParticularTaskSchema } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import { Pencil, Trash, UserPlus } from "lucide-react"
import React, { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import z from "zod"

type Props = {
  children: React.ReactNode
}

type Worker = {
  id: string
  name: string
}

function ParticularTaskDefineDialog({ children }: Props) {
  const [open, setOpen] = useState(false)

  //ajouter tache dialog
  const [addOpen, setAddOpen] = useState(false)

  // assigneer tache dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedTaskForAssign, setSelectedTaskForAssign] =
    useState<ParticularTask | null>(null)
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])

  //modifier tache dialog
  const [editOpen, setEditOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<ParticularTask | null>(null)

  // feedback
  const [isSuccess, setIsSuccess] = useState({ ok: false, message: "" })
  const [editWorkerId, setEditWorkerId] = useState<string>("")
  const [editAdjointId, setEditAdjointId] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const { data: fetchedTasks, isLoading: tasksLoading } = useParticularTasks()
  const { data: fetchedWorkers, isLoading: workersLoading } = useWorkers()

  const tasks: ParticularTask[] = fetchedTasks ?? []
  const workers = (fetchedWorkers ?? []).map((w) => ({
    id: w.id,
    name: w.name,
  }))

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ["particularTasks"] })
  }

  const getWorkerName = (id: string | null | undefined) => {
    if (!id) return "—"
    return workers.find((w) => w.id === id)?.name ?? id
  }

  // Add form (separate dialog)
  const addForm = useForm<z.infer<typeof ParticularTaskSchema>>({
    resolver: zodResolver(ParticularTaskSchema),
    defaultValues: { title: "", description: "" },
  })

  // Edit form
  const editForm = useForm<z.infer<typeof ParticularTaskSchema>>({
    resolver: zodResolver(ParticularTaskSchema),
    defaultValues: { title: "", description: "" },
  })

  // When opening edit, populate form
  useEffect(() => {
    if (taskToEdit) {
      editForm.reset({
        title: taskToEdit.title,
        description: taskToEdit.description ?? "",
      })
    }
  }, [taskToEdit, editForm])

  // --- MUTATIONS ---

  const addTaskMutation = useMutation({
    mutationFn: (data: z.infer<typeof ParticularTaskSchema>) =>
      addParticularTask(data),
    onSuccess: (res) => {
      if (res?.ok) {
        setIsSuccess({ ok: true, message: res.message ?? "Tâche ajoutée" })
        addForm.reset()
        setTimeout(() => {
          setAddOpen(false)
          setIsSuccess({ ok: false, message: "" })
        }, 800)
        invalidateTasks()
      } else {
        setIsSuccess({
          ok: false,
          message: res?.message ?? "Erreur lors de l'ajout",
        })
      }
    },
    onError: () => setIsSuccess({ ok: false, message: "Erreur réseau" }),
  })

  const stockTaskMutation = useMutation({
    mutationFn: () =>
      addParticularTask({
        title: STOCK_MANAGEMENT_TASK_TITLE,
        description: STOCK_MANAGEMENT_TASK_DESCRIPTION,
      }),
    onSuccess: (res) => {
      setIsSuccess({
        ok: !!res?.ok,
        message: res?.message ?? "Erreur lors de la création de la tâche",
      })
      if (res?.ok) {
        invalidateTasks()
      }
      setTimeout(() => setIsSuccess({ ok: false, message: "" }), 500)
    },
    onError: () => setIsSuccess({ ok: false, message: "Erreur réseau" }),
  })

  const attendanceTaskMutation = useMutation({
    mutationFn: () =>
      addParticularTask({
        title: ATTENDANCE_RECORDER_TASK_TITLE,
        description: ATTENDANCE_RECORDER_TASK_DESCRIPTION,
      }),
    onSuccess: (res) => {
      setIsSuccess({
        ok: !!res?.ok,
        message: res?.message ?? "Erreur lors de la création de la tâche",
      })
      if (res?.ok) {
        invalidateTasks()
      }
      setTimeout(() => setIsSuccess({ ok: false, message: "" }), 500)
    },
    onError: () => setIsSuccess({ ok: false, message: "Erreur réseau" }),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({
      id,
      data,
      workerId,
      adjointId,
    }: {
      id: string
      data: z.infer<typeof ParticularTaskSchema>
      workerId: string
      adjointId: string | null
    }) => updateParticularTask(id, data, workerId, adjointId),
    onSuccess: (res) => {
      if (res?.ok) {
        setIsSuccess({ ok: true, message: res.message ?? "Tâche modifiée" })
        setTimeout(() => {
          setEditOpen(false)
          setTaskToEdit(null)
          setIsSuccess({ ok: false, message: "" })
        }, 800)
        invalidateTasks()
      } else {
        setIsSuccess({
          ok: false,
          message: res?.message ?? "Erreur lors de la modification",
        })
      }
    },
    onError: () => setIsSuccess({ ok: false, message: "Erreur réseau" }),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteParticularTask(taskId),
    onSuccess: (res) => {
      if (res?.ok) {
        setIsSuccess({ ok: true, message: res.message ?? "Tâche supprimée" })
        invalidateTasks()
        setTimeout(() => setIsSuccess({ ok: false, message: "" }), 1000)
      } else {
        setIsSuccess({
          ok: false,
          message: res?.message ?? "Erreur lors de la suppression",
        })
      }
    },
    onError: () => setIsSuccess({ ok: false, message: "Erreur réseau" }),
  })

  const assignTaskMutation = useMutation({
    mutationFn: (data: {
      taskId: string
      workerId: string
      adjointId: string
    }) => assignParticularTask(data),
    onSuccess: (res) => {
      if (res.ok) {
        setIsSuccess({
          ok: true,
          message: res.message ?? "Assignation enregistrée",
        })
        setTimeout(() => {
          setAssignOpen(false)
          setSelectedTaskForAssign(null)
          setSelectedWorkers([])
          setIsSuccess({ ok: false, message: "" })
        }, 800)
        invalidateTasks()
      } else {
        setIsSuccess({
          ok: false,
          message: res?.message ?? "Erreur lors de l'assignation",
        })
      }
    },
    onError: () => setIsSuccess({ ok: false, message: "Erreur réseau" }),
  })

  // --- HANDLERS ---

  const onAddSubmit = (data: z.infer<typeof ParticularTaskSchema>) => {
    addTaskMutation.mutate(data)
  }

  const createStockManagementTask = () => {
    stockTaskMutation.mutate()
  }

  const createAttendanceRecorderTask = () => {
    attendanceTaskMutation.mutate()
  }

  const onEditSubmit = (data: z.infer<typeof ParticularTaskSchema>) => {
    if (!taskToEdit) return
    updateTaskMutation.mutate({
      id: taskToEdit.id,
      data,
      workerId: editWorkerId,
      adjointId: editAdjointId,
    })
  }

  const onDelete = (taskId: string) => {
    if (!confirm("Supprimer cette tâche ?")) return
    deleteTaskMutation.mutate(taskId)
  }

  const submitAssign = async () => {
    if (!selectedTaskForAssign) return
    assignTaskMutation.mutate({
      taskId: selectedTaskForAssign.id,
      workerId: selectedWorkers[0],
      adjointId: selectedWorkers[1],
    })
  }

  // Open assign dialog for a task
  const openAssignFor = (task: ParticularTask) => {
    setSelectedTaskForAssign(task)
    setSelectedWorkers([])
    setAssignOpen(true)
  }

  // Toggle worker selection (max 2)
  const toggleWorker = (id: string) => {
    setSelectedWorkers((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 2) return prev // ignore additional selections
      return [...prev, id]
    })
  }


  const alreadyTake = (task: ParticularTask) => {
    return task.workerId ? true : false
  }
  return (
    <>
      {/* Main dialog: liste des tâches */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent className="max-w-4xl">
          <DialogHeader className="relative">
            <DialogTitle>Liste des tâches particulières</DialogTitle>
            <DialogDescription>
              Voir, assigner, modifier ou supprimer une tâche.
            </DialogDescription>

            {/* Bouton Ajouter ouvre un second dialog contenant le formulaire */}
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {tasks.find(
                (t) => t.title === STOCK_MANAGEMENT_TASK_TITLE
              ) ? null : (
                <Button
                  variant="outline"
                  size={"sm"}
                  className="rounded-full"
                  onClick={createStockManagementTask}
                  disabled={stockTaskMutation.isPending}
                >
                  {stockTaskMutation.isPending ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    "Gestion du stock"
                  )}
                </Button>
              )}

              {tasks.find(
                (t) => t.title === ATTENDANCE_RECORDER_TASK_TITLE
              ) ? null : (
                <Button
                  variant="outline"
                  size={"sm"}
                  className="rounded-full"
                  onClick={createAttendanceRecorderTask}
                  disabled={attendanceTaskMutation.isPending}
                >
                  {attendanceTaskMutation.isPending ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    "Charger de pointage"
                  )}
                </Button>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setAddOpen(true)}
                  >
                    Ajouter une tache
                  </Button>
                </DialogTrigger>
                {/* Add dialog content is implemented below as controlled by addOpen */}
              </Dialog>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-muted-foreground">Aucune tâche définie.</p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className={clsx(
                      "flex flex-col rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                      alreadyTake(t) && "bg-green-50"
                    )}
                  >
                    <div>
                      <h4 className="font-medium">{t.title}</h4>
                      {t.description && (
                        <p className="text-xs text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                      {t.workerId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Assigné: {getWorkerName(t.workerId)}{" "}
                          {t.adjointId
                            ? `, adjoint: ${getWorkerName(t.adjointId)}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2 sm:mt-0">
                      <Button
                        size="icon-sm"
                        disabled={alreadyTake(t)}
                        variant="outline"
                        className="rounded-full"
                        onClick={() => openAssignFor(t)}
                      >
                        <UserPlus />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          setTaskToEdit(t)
                          setEditWorkerId(t.workerId ?? "")
                          setEditAdjointId(t.adjointId ?? null)
                          setEditOpen(true)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => onDelete(t.id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="mt-4">
            <div className="flex w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-full"
              >
                Fermer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog (controlled) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Définir une tâche particulière</DialogTitle>
            <DialogDescription>
              Créer une nouvelle tâche particulière.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={addForm.handleSubmit(onAddSubmit)}>
            <FieldGroup>
              <Controller
                name="title"
                control={addForm.control}
                render={({ field, fieldState: { error } }) => (
                  <Field>
                    <FieldLabel>Titre</FieldLabel>
                    <Input {...field} />
                    {error && <FieldError>{error.message}</FieldError>}
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={addForm.control}
                render={({ field, fieldState: { error } }) => (
                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea {...field} />
                    {error && <FieldError>{error.message}</FieldError>}
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter className="flex w-full flex-col space-y-2 mt-2">
              
              <div className="mt-2 flex items-end justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setAddOpen(false)}
                >
                  Fermer
                </Button>
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={addTaskMutation.isPending}
                >
                  {addTaskMutation.isPending ? <Spinner /> : `Soumettre`}
                </Button>
              </div>

              <div className="flex justify-center mx-auto w-full">
                {" "}
                {isSuccess.message && (
                  <p
                    className={clsx(
                      "mx-auto text-center",
                      isSuccess.ok ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {isSuccess.message}
                  </p>
                )}
              </div>
            </DialogFooter>
          </form>

          
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
            <DialogDescription>
              Modifier le titre ou la description.
            </DialogDescription>

            {taskToEdit?.workerId && (
              <p className="mt-1 text-sm text-muted-foreground">
                Assigné: {getWorkerName(taskToEdit.workerId)}{" "}
                {taskToEdit.adjointId
                  ? `, adjoint: ${getWorkerName(taskToEdit.adjointId)}`
                  : ""}
              </p>
            )}
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <FieldGroup>
              <Controller
                name="title"
                control={editForm.control}
                render={({ field, fieldState: { error } }) => (
                  <Field>
                    <FieldLabel>Titre</FieldLabel>
                    <Input {...field} />
                    {error && <FieldError>{error.message}</FieldError>}
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={editForm.control}
                render={({ field, fieldState: { error } }) => (
                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea {...field} />
                    {error && <FieldError>{error.message}</FieldError>}
                  </Field>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Responsable (Charger)</FieldLabel>
                  <select
                    className="w-full rounded-md border bg-transparent p-2 text-sm"
                    value={editWorkerId || ""}
                    onChange={(e) => setEditWorkerId(e.target.value)}
                  >
                    <option value="">Non assigné</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field>
                  <FieldLabel>Adjoint</FieldLabel>
                  <select
                    className="w-full rounded-md border bg-transparent p-2 text-sm"
                    value={editAdjointId || ""}
                    onChange={(e) => setEditAdjointId(e.target.value || null)}
                  >
                    <option value="">Non assigné</option>
                    {workers.map((w) => (
                      <option
                        key={w.id}
                        value={w.id}
                        disabled={w.id === editWorkerId}
                      >
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </FieldGroup>

            <DialogFooter className="flex w-full flex-col space-y-2">
              <div className="mt-2 flex w-full justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setEditOpen(false)}
                >
                  Fermer
                </Button>
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? <Spinner /> : `Enregistrer`}
                </Button>
              </div>
            </DialogFooter>
          </form>
          <div className="mx-auto flex w-full items-center justify-center">
            {" "}
            {isSuccess.message && (
              <p
                className={clsx(
                  "mx-auto text-center",
                  isSuccess.ok ? "text-green-500" : "text-red-500"
                )}
              >
                {isSuccess.message}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner la tâche</DialogTitle>
            <DialogDescription>
              Sélectionnez jusqu&apos;à deux travailleurs (Charger et adjoint).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {workersLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner />
              </div>
            ) : workers.length === 0 ? (
              <p className="text-muted-foreground">
                Aucun travailleur disponible.
              </p>
            ) : (
              <div className="grid gap-2">
                {workers.map((w) => {
                  const checked = selectedWorkers.includes(w.id)
                  const disabled = !checked && selectedWorkers.length >= 2
                  return (
                    <label
                      key={w.id}
                      className={clsx(
                        "flex items-center gap-2 rounded-md border p-2",
                        disabled && "opacity-60"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleWorker(w.id)}
                        disabled={disabled}
                      />
                      <span>{w.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex w-full flex-col space-y-2">
            <div className="mt-2 flex w-full justify-end space-x-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setAssignOpen(false)}
              >
                Annuler
              </Button>
              <Button
                className="rounded-full"
                onClick={submitAssign}
                disabled={selectedWorkers.length === 0 || assignTaskMutation.isPending}
              >
                {assignTaskMutation.isPending ? <Spinner /> : "Assigner"}
              </Button>
            </div>

            <div className="mx-auto w-full">
              {" "}
              {isSuccess.message && (
                <p
                  className={clsx(
                    "mx-auto text-center",
                    isSuccess.ok ? "text-green-500" : "text-red-500"
                  )}
                >
                  {isSuccess.message}
                </p>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ParticularTaskDefineDialog
