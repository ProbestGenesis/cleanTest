"use client"

import logo from "@/assets/image/logo/nobg-gesentLogo.png"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { defineSuperAdmin } from "@/lib/actions/defineSuperAdmin"
import { authClient } from "@/lib/auth-client"
import { registerSchema } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import clsx from "clsx"
import { Eye, EyeOff, LogIn } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import z from "zod"

type Props = {}

function page({}: Props) {
  const router = useRouter()
  const [message, setMessage] = useState<{
    code?: number | string
    text: string
  }>({
    code: "",
    text: "",
  })
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (value: z.infer<typeof registerSchema>) => {
    try {
      const { data, error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      })

      if (error) {
        console.error(error)
        setMessage({
          code: error.status ?? "500",
          text: error.message ?? "Une erreur s'est produite",
        })
        return
      }

      if (data) {
        const { success } = await defineSuperAdmin(data.user.id)
        console.log(success)

        if (!success) {
          setMessage({ code: "500", text: "Une erreur s'est produite" })
        }

        setMessage({ code: "201", text: "Votre compte a été créé" })

        setTimeout(() => {
          router.push("/")
        }, 500)
      }
    } catch (err) {
      console.error(err)
      setMessage({
        code: "500",
        text: "Une erreur inattendue s'est produite",
      })
    }
  }

  return (
    <Card className="w-md border-transparent bg-card/70 backdrop-blur-sm">
      <CardHeader className="font-bold">
        <div className="relative mx-auto h-18 w-3xs">
          <Image src={logo.src} alt={"logo"} fill className="object-cover" />
        </div>
        <CardTitle className="mx-auto text-xl">
          Bievenue sur la plateforme de gestion{" "}
        </CardTitle>
        <span className="mx-auto h-2 w-32 rounded-full bg-green-400"></span>

        <CardDescription className="mx-auto font-medium">
          Cet formulaire est uniquement destiné au directeur
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="flex flex-col gap-3.5">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name" className="font-bold">
                    Nom complet
                  </FieldLabel>
                  <Input {...field} placeholder="John doe" />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email" className="font-bold">
                    Email
                  </FieldLabel>
                  <Input {...field} placeholder="@gamil.com" type="email" />

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
                    Mot de passe
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      disabled={isPending}
                      placeholder="*******"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isPending}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password_confirmation"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="password_confirmation"
                    className="font-bold"
                  >
                    Confirmé le mot de passe
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      disabled={isPending}
                      placeholder="*******"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isPending}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await form.handleSubmit(onSubmit)()
              })
            }}
          >
            {isPending ? (
              <Spinner />
            ) : (
              <div className="flex flex-row items-center gap-2">
                {" "}
                <LogIn />
                <p>S'inscrire </p>{" "}
              </div>
            )}
          </Button>
        </Field>

        {/*  <span className="flex flex-row items-center space-x-2">
          <p className="text-sm">Vous avez déjà un compte? </p>{" "}
          <Link href="/auth/login" className="text-accent">
            Se connecter
          </Link>
        </span>*/}

        <span>
          <p
            className={clsx("text-center", {
              "text-green-400": message.code === "201",
              "text-destructive":
                message.code !== "201" && message.code !== "201",
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
