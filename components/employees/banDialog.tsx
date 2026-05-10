"use client"

import React, { useTransition, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AlertTriangle, UserCheck } from "lucide-react"
import clsx from "clsx"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { Worker } from "@/generated/prisma/client"
import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

type Props = {
  data: Worker & { workAccount: { id: string; banned: boolean | null } | null }
}

export const banSchema = z.object({
  banReason: z
    .string()
    .nonempty("Veuillez donner la raison de la mise à pieds"),
  banDuration: z
    .number("Vueillez saisir la duree de la mise a pieds")
    .nonnegative("Veuillez saisir un nombre supérieur à 0")
    .min(1, "La durée minimale est de 1 jour"),
})

type BanFormValues = z.infer<typeof banSchema>

function BanWorkerDialog({ data }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState<{
    message: string
    ok: undefined | boolean
  }>({
    message: "",
    ok: undefined,
  })
  const [openDialog, setOpenDialog] = useState(false)
  const queryClient = useQueryClient()

  const invalidateWorkers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workers"] }),
      queryClient.invalidateQueries({ queryKey: ["workerStats"] }),
    ])
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BanFormValues>({
    resolver: zodResolver(banSchema),
    defaultValues: {
      banReason: "",
      banDuration: undefined,
    },
  })

  const clearMessage = () => {
    setIsSuccess({ ok: undefined, message: "" })
  }

  const closeDialog = () => {
    setOpenDialog(false)
    reset()
    clearMessage()
  }

  const banWorker = async (values: BanFormValues) => {
    if (!data.workAccount) return

    const { error } = await authClient.admin.banUser({
      userId: data.workAccount.id,
      banReason: values.banReason,
      banExpiresIn: values.banDuration * 24 * 60 * 60,
    })

    if (error) {
      setIsSuccess({
        message: "Une erreur s'est produite, veuillez réessayer.",
        ok: false,
      })
      return
    }

    setIsSuccess({
      message: `L'utilisateur ${data.name} a reçu une mise à pieds et ne pourra plus accéder à la plateforme pendant ${values.banDuration} jour(s).`,
      ok: true,
    })

    await invalidateWorkers()
    router.refresh()

    setTimeout(() => {
      clearMessage()
      closeDialog()
    }, 2000)
  }

  const unbanWorker = async () => {
    if (!data.workAccount) return

    const { error } = await authClient.admin.unbanUser({
      userId: data.workAccount.id,
    })

    if (error) {
      setIsSuccess({
        message: "Une erreur s'est produite, veuillez réessayer.",
        ok: false,
      })
      return
    }

    setIsSuccess({
      message: `La mise à pieds de ${data.name} a été annulée.`,
      ok: true,
    })

    await invalidateWorkers()
    router.refresh()

    setTimeout(() => {
      clearMessage()
      closeDialog()
    }, 2000)
  }

  return (
    <Dialog onOpenChange={(open) => !open && closeDialog()} open={openDialog}>
      <div
        className="flex cursor-pointer flex-col space-y-2"
        onClick={() => setOpenDialog(true)}
      >
        <span className="flex w-full justify-between rounded-lg px-0.5 py-2 transition-all hover:bg-accent hover:text-accent-foreground">
          {data.workAccount?.banned
            ? "Annuler la mise à pieds"
            : "Mise à pieds"}
          {data.workAccount?.banned ? (
            <UserCheck size={16} color="green" />
          ) : (
            <AlertTriangle size={16} color="red" />
          )}
        </span>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {data.workAccount?.banned
              ? "Annuler la mise à pieds"
              : "Mise à pieds"}
          </DialogTitle>
          <DialogDescription>
            {data.workAccount?.banned
              ? `Confirmez-vous l'annulation de la mise à pieds pour ${data.name} ?`
              : "Un utilisateur ayant reçu une mise à pieds ne pourra plus se connecter à la plateforme pendant la durée déterminée."}
          </DialogDescription>
        </DialogHeader>

        {!data.workAccount?.banned ? (
          <form
            onSubmit={handleSubmit((values) =>
              startTransition(() => banWorker(values))
            )}
            className="space-y-4"
          >
            <FieldGroup>
              {/* Raison */}
              <Field>
                <FieldLabel htmlFor="banReason">
                  Raison de la mise à pieds
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="banReason"
                    render={({ field }) => (
                      <Input
                        id="banReason"
                        placeholder="Ex : comportement inapproprié, absences répétées..."
                        aria-invalid={!!errors.banReason}
                        {...field}
                      />
                    )}
                  />
                </FieldContent>
                {errors.banReason && (
                  <FieldError>{errors.banReason.message}</FieldError>
                )}
              </Field>

              {/* Durée */}
              <Field>
                <FieldLabel htmlFor="banDuration">Durée (en jours)</FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="banDuration"
                    render={({ field }) => (
                      <Input
                        id="banDuration"
                        type="number"
                        placeholder="Ex : 7"
                        min={1}
                        aria-invalid={!!errors.banDuration}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                      />
                    )}
                  />
                  <FieldDescription>Saisir la durée en jour</FieldDescription>
                </FieldContent>
                {errors.banDuration && (
                  <FieldError>{errors.banDuration.message}</FieldError>
                )}
              </Field>
            </FieldGroup>

            {/* Message de retour */}
            {isSuccess.message && (
              <p
                className={clsx("text-sm font-medium", {
                  "text-green-500": isSuccess.ok,
                  "text-destructive": isSuccess.ok === false,
                })}
              >
                {isSuccess.message}
              </p>
            )}

            <DialogFooter>
              <div className="flex items-center justify-end space-x-4">
                <Button
                  type="button"
                  className="rounded-full"
                  variant="outline"
                  onClick={closeDialog}
                >
                  Annuler
                </Button>
                {!isSuccess.ok && (
                  <Button
                    type="submit"
                    className="rounded-full"
                    disabled={isPending}
                  >
                    {isPending ? <Spinner /> : "Confirmer la mise à pieds"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {isSuccess.message && (
              <p
                className={clsx("text-sm font-medium", {
                  "text-green-500": isSuccess.ok,
                  "text-destructive": isSuccess.ok === false,
                })}
              >
                {isSuccess.message}
              </p>
            )}
            <DialogFooter>
              <div className="flex items-center justify-end space-x-4">
                <Button
                  type="button"
                  className="rounded-full"
                  variant="outline"
                  onClick={closeDialog}
                >
                  Annuler
                </Button>
                {!isSuccess.ok && (
                  <Button
                    type="button"
                    className="rounded-full"
                    disabled={isPending}
                    onClick={() => startTransition(() => unbanWorker())}
                  >
                    {isPending ? <Spinner /> : "Confirmer l'annulation"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BanWorkerDialog
