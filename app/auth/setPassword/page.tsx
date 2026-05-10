"use client"

import logo from "@/assets/image/logo/nobg-gesentLogo.png"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { editPasswordState } from "@/lib/actions/users/passwordState"
import { authClient } from "@/lib/auth-client"
import { setPasswordSchema as formSchema } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import clsx from "clsx"
import { LogIn } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import z from "zod"

type Props = {}

function page({}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string }>({
    ok: false,
    text: "",
  })
  const form = useForm({
    defaultValues: {
      email: "",
      matricule: "",
      password: "",
    },
    resolver: zodResolver(formSchema),
    mode: "onChange",
  })
  const onSubmit = async (value: z.infer<typeof formSchema>) => {
    const { data, error: signInError } = await authClient.signIn.email({
      email: value.email,
      password: value.matricule,
    })

    if (signInError) {
      setMessage({
        ok: false,
        text: "Oups un erreur s'est produite votre mot de passe n'a pas pu être modifier",
      })
      return
    }

    const { error } = await authClient.changePassword({
      newPassword: value.password,
      currentPassword: value.matricule,
      revokeOtherSessions: true,
    })
    if (error) {
      setMessage({ ok: false, text: "Un erreur s'est produite" })
      return
    }

    const id = data.user.id
    const { ok } = await editPasswordState(id)

    if (!ok) {
      setMessage({
        ok: false,
        text: "Oups un erreur s'est produite votre mot de passe n'a pas pu être modifier",
      })

      await authClient.changePassword({
        newPassword: value.matricule, // required
        currentPassword: value.password, // required
        revokeOtherSessions: true,
      })

      return
    }

    setMessage({
      ok: false,
      text: "Votre mot de passe a ete defini avec success",
    })
    setTimeout(() => {
      router.push("/")
    }, 1000)
  }
  return (
    <Card className="w-sm border-transparent bg-card/70 backdrop-blur-sm">
      <CardHeader className="font-bold">
        <div className="relative mx-auto h-18 w-3xs">
          <Image src={logo.src} alt={"logo"} fill className="object-cover" />
        </div>
        <CardTitle className="mx-auto text-3xl">
          Définir un mot de passe
        </CardTitle>
        <span className="mx-auto h-2 w-32 rounded-full bg-green-400"></span>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="flex flex-col gap-6">
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email" className="t font-bold">
                    Votre Email
                  </FieldLabel>
                  <Input {...field} placeholder="@gamil.com" />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="matricule"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="matricule" className="t font-bold">
                    Votre N° de matricule
                  </FieldLabel>
                  <Input {...field} placeholder="SjSJWa" />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password" className="font-bold">
                    Votre nouveau mot de passe
                  </FieldLabel>
                  <Input {...field} placeholder="******" type="password" />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-3.5">
        <Field>
          <Button
            className="rounded-full"
            type="submit"
            onClick={() => {
              startTransition(async () => {
                await form.handleSubmit(onSubmit)()
              })
            }}
          >
            {isPending ? (
              <Spinner />
            ) : (
              <div className="flex items-center gap-2">
                {" "}
                <LogIn /> <p className="text-md">`Se connecter`</p>
              </div>
            )}
          </Button>
        </Field>

        <span className="mx-auto">
          <p
            className={clsx("text-center", {
              "text-green-400": message.ok,
              "text-destructive": !message.ok,
            })}
          >
            {message.text}
          </p>
        </span>
      </CardFooter>
    </Card>
  )
}

export default page
