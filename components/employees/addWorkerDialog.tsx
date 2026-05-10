"use client"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Worker } from "@/generated/prisma/client"
import { addWorker, updateWorker } from "@/lib/actions/workers/addWorker"
import { useWorkerRoles } from "@/lib/hooks/useWorkers"
import { cn } from "@/lib/utils"
import { createWorker } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import {
  AlertCircle,
  Calendar1Icon,
  CalendarCheck,
  Check,
  ChevronsUpDown,
  ImageIcon,
  X,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import z from "zod"

type Props = {
  onClose: () => void
  isOpen: boolean
  type: TypeDialog
  data?: Worker
}

export enum TypeDialog {
  update = "update",
  create = "create",
}

function AddWorkerDialog({ isOpen, onClose, type, data }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: existingRoles = [] } = useWorkerRoles()

  const [matricule, setMatricule] = useState("")
  const [date, setDate] = useState<Date | undefined>(data?.officalStart)
  const [img, setImg] = useState("")
  const [showMatriculeDialog, setShowMatriculeDialog] = useState(false)
  const [showAdditionalField, setShowAdditionalField] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string }>({
    ok: false,
    text: "",
  })
  const [openRole, setOpenRole] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!data?.officalStart) {
      const now = new Date()
      setDate(now)
      form.setValue("date", now)
    }
  }, [data])

  const invalidateWorkers = () => {
    queryClient.invalidateQueries({ queryKey: ["workers"] })
    queryClient.invalidateQueries({ queryKey: ["workerStats"] })
    queryClient.invalidateQueries({ queryKey: ["workerRoles"] })
  }

  const clearMessage = () => {
    setMessage({ ok: false, text: "" })
  }

  const clearPrvImage = () => {
    setImg("")
    form.resetField("image")
  }

  const [isPending, StartTransition] = useTransition()

  const form = useForm({
    defaultValues: {
      name: data?.name ?? "",
      date: data?.officalStart,
      email: data?.email ?? "",
      phone: data?.phone ?? "",
      role: data?.role ?? "",
      type: data?.type,
      address: data?.address ?? "",
      contractDuration: data?.contractDuration ?? "",
    },
    resolver: zodResolver(createWorker),
    mode: "onChange",
  })

  const workerType = form.watch("type")
  const salaryGross = form.watch("salary.gross")

  useEffect(() => {
    if (workerType === "CDD" || workerType === "TRAINEE") {
      setShowAdditionalField(true)
    } else {
      setShowAdditionalField(false)
    }
  }, [workerType])

  useEffect(() => {
    if (workerType && workerType !== "TRAINEE" && salaryGross) {
      const calculatedCharges = Number((salaryGross * 0.315).toFixed(2))
      form.setValue("employerCharges.socialContributions", calculatedCharges)
    }
  }, [workerType, salaryGross, form])

  const onSubmit = async (value: z.infer<typeof createWorker>) => {
    StartTransition(async () => {
      const { ok, message, matricule } = await addWorker(value)
      setMessage({ ok, text: message })

      if (ok) {
        setTimeout(() => {
          clearMessage()
          onClose()
          setMatricule(matricule as string)
          setShowMatriculeDialog(true)
        }, 1000)
        form.reset()
        invalidateWorkers()
        router.refresh()
      }
    })
  }

  const onSubmitUpdate = async (value: z.infer<typeof createWorker>) => {
    StartTransition(async () => {
      if (!data?.id) {
        return
      }

      const { ok, message } = await updateWorker({ id: data?.id, value: value })
      setMessage({ ok, text: message })

      if (ok) {
        setTimeout(() => {
          clearMessage()
          onClose()
        }, 1000)
        form.reset()
        invalidateWorkers()
        router.refresh()
        return
      }
    })
  }

  const handleFormSubmit =
    type === TypeDialog.update
      ? form.handleSubmit(onSubmitUpdate)
      : form.handleSubmit(onSubmit)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="min-w-lg">
          {type === "create" && (
            <DialogHeader>
              <DialogTitle>Ajouter un employe</DialogTitle>
              <DialogDescription>
                Ce formulaire permet d'enregistrer les informations du nouvelle
                employé et de créer automatiquement son compte utilisateur.
              </DialogDescription>
            </DialogHeader>
          )}

          {type === "update" && (
            <DialogHeader>
              <DialogTitle>Modifier les informations</DialogTitle>
              <DialogDescription>
                A utiliser pour mettre à jour les informations de l'employé
              </DialogDescription>
            </DialogHeader>
          )}

          <div className="mx-2">
            <form onSubmit={handleFormSubmit}>
              <ScrollArea className="max-h-[80vh]">
                <FieldGroup className="gap-2">
                  <div className="flex flex-row gap-2">
                    <Controller
                      name="date"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="name" className="font-bold">
                            Date d'embauche
                          </FieldLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                className="rounded-lg"
                                variant={"outline"}
                              >
                                {date ? (
                                  date.toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                ) : (
                                  <p>Selectionner une date </p>
                                )}

                                {date ? <CalendarCheck /> : <Calendar1Icon />}
                              </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-auto border-transparent p-0">
                              <Calendar
                                mode="single"
                                onSelect={(data) => {
                                  if (!data) return
                                  setDate(data)
                                  form.setValue("date", data)
                                }}
                                className="h-9 rounded-lg border"
                                captionLayout="dropdown"
                              />
                            </PopoverContent>
                          </Popover>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="name" className="font-bold">
                            Nom
                          </FieldLabel>
                          <Input {...field} placeholder="John Doe" />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="email" className="font-bold">
                          Email
                        </FieldLabel>
                        <Input
                          {...field}
                          type="email"
                          placeholder="john@example.com"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  {/* Téléphone / Adresse */}
                  <div className="flex flex-row space-x-4">
                    <Controller
                      name="phone"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="phone" className="font-bold">
                            Téléphone
                          </FieldLabel>
                          <Input {...field} placeholder="+228 97 55 44 66" />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="address"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="address" className="font-bold">
                            Adresse
                          </FieldLabel>
                          <Input {...field} placeholder="123 Rue..." />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Rôle / Type */}
                  <div className="flex flex-row space-x-4">
                    <Controller
                      name="role"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="role" className="font-bold">
                            Rôle
                          </FieldLabel>
                          <Popover open={openRole} onOpenChange={setOpenRole}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openRole}
                                className="w-full justify-between font-normal"
                              >
                                {field.value
                                  ? field.value
                                  : "Sélectionner un rôle..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Rechercher un rôle..."
                                  onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                  <CommandEmpty className="p-0">
                                    {searchQuery && (
                                      <div
                                        className="relative flex cursor-default cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        onClick={() => {
                                          field.onChange(searchQuery)
                                          setOpenRole(false)
                                          setSearchQuery("")
                                        }}
                                      >
                                        Ajouter "{searchQuery}"
                                      </div>
                                    )}
                                    {!searchQuery && (
                                      <p className="py-6 text-center text-sm text-muted-foreground">
                                        Aucun rôle trouvé.
                                      </p>
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {existingRoles.map((role) => (
                                      <CommandItem
                                        key={role}
                                        value={role}
                                        onSelect={(currentValue) => {
                                          field.onChange(
                                            currentValue === field.value
                                              ? ""
                                              : currentValue
                                          )
                                          setOpenRole(false)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === role
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {role}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="type"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="type" className="font-bold">
                            Type
                          </FieldLabel>

                          <Select
                            value={field.value ?? ""}
                            onValueChange={(val: string) => field.onChange(val)}
                          >
                            <SelectTrigger aria-invalid={fieldState.invalid}>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="CDI">CDI</SelectItem>
                                <SelectItem value="CDD">CDD</SelectItem>
                                <SelectItem value="TRAINEE">
                                  Stagiaire
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>

                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Durée du contrat (affiché conditionnellement) et salaire structuré */}
                  <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-3">
                    {showAdditionalField && (
                      <Controller
                        name="contractDuration"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel
                              htmlFor="contractDuration"
                              className="font-bold"
                            >
                              Durée du contrat
                            </FieldLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(val: string) =>
                                field.onChange(val)
                              }
                            >
                              <SelectTrigger
                                aria-invalid={fieldState.invalid}
                                className=""
                              >
                                <SelectValue placeholder="Sélectionner une durée" />
                              </SelectTrigger>

                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="1">1 mois</SelectItem>
                                  <SelectItem value="3">3 mois</SelectItem>
                                  <SelectItem value="6">6 mois</SelectItem>

                                  <SelectItem value="12">12 mois</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    )}

                    {/* Salaire : on contrôle salary.gross (nombre) */}
                    <Controller
                      name="salary.gross"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor="salary.gross"
                            className="font-bold"
                          >
                            Salaire brut
                          </FieldLabel>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="50000"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="salary.net"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor="salary.net"
                            className="font-bold"
                          >
                            Salaire net (optionnel)
                          </FieldLabel>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="40000"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Charges employeur (optionnel) */}
                  <div className="mt-2 flex flex-row space-x-4">
                    <Controller
                      name="employerCharges.socialContributions"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="font-bold">
                            Cotisations sociales
                          </FieldLabel>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="0"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  {img ? (
                    <div className="relative h-18 w-18 rounded">
                      <Button
                        variant={"destructive"}
                        size={"icon-xs"}
                        className="absolute top-0 right-0 z-10 rounded-full"
                        onClick={() => clearPrvImage()}
                      >
                        <X />
                      </Button>
                      <Image src={img} fill alt="product image" />
                    </div>
                  ) : (
                    <Controller
                      name="image"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className="relative mt-2 flex h-24 flex-col items-center justify-center rounded-lg border-2 border-dotted"
                        >
                          <Input
                            type="file"
                            className="absolute h-full w-full opacity-0"
                            onChange={(e) => {
                              const file = e.currentTarget?.files?.[0]
                              if (file) {
                                const imgUrl = URL.createObjectURL(file)
                                setImg(imgUrl)
                                form.setValue("image", file)
                              }
                            }}
                          />
                          <div className="flex flex-col space-y-2">
                            <ImageIcon className="mx-auto" />
                            <FieldLabel
                              htmlFor="image"
                              className="mx-auto font-bold"
                            >
                              Ajouter une photo
                            </FieldLabel>
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  )}
                </FieldGroup>

                <ScrollBar />
              </ScrollArea>

              <DialogFooter className="mt-4 flex flex-col">
                <div>
                  <Field
                    orientation={"horizontal"}
                    className="flex justify-end space-x-4"
                  >
                    <Button
                      type="button"
                      variant={"outline"}
                      className="rounded-full"
                      onClick={() => {
                        clearMessage()
                        onClose()
                      }}
                    >
                      {message.ok ? `Fermer` : `Annuler`}
                    </Button>

                    {!message.ok && (
                      <Button
                        type="submit"
                        className="rounded-full"
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Spinner />
                        ) : type === TypeDialog.update ? (
                          `Mettre à jour`
                        ) : (
                          `Ajouter`
                        )}
                      </Button>
                    )}
                  </Field>

                  <div>
                    {message.text && (
                      <p
                        className={clsx("mt-2.5 text-center", {
                          "text-destructive": !message.ok,
                          "text-green-400": message.ok,
                        })}
                      >
                        {message.text}
                      </p>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {showMatriculeDialog && (
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="mx-auto flex flex-col items-center justify-center">
                <AlertCircle className="h-24 w-24 text-orange-400" />
                <p>Numero de matricule de l'employé</p>
              </AlertDialogTitle>

              <AlertDialogDescription>
                Veuillez conserver ce numéro en lieu sûr et demandez à l'employé
                de faire de même. Ce numéro est son mot de passe initial.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div>
              <h3 className="text-xl font-medium tracking-widest">
                {matricule}
              </h3>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                className="rounded-full"
                onClick={() => {
                  setMatricule("")
                  setShowMatriculeDialog(false)
                }}
              >
                Fermer
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

export default AddWorkerDialog
