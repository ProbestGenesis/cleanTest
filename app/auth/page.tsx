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
import { authClient } from "@/lib/auth-client"
import { loginSchema } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import clsx from "clsx"
import { Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  redirect,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { Suspense, useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import z from "zod"

type Props = {}

function LoginPage({}: Props) {
  const params = useSearchParams()
  const accountType = params.get("accountType")
  const pathname = usePathname()
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
      email: "",
      password: "",
      rememberMe: false,
    },
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  })

  const onSubmit = async (value: z.infer<typeof loginSchema>) => {
    const { data, error } = await authClient.signIn.email(
      {
        email: value.email,
        password: value.password,
        rememberMe: value.rememberMe,
      },
      {
        onSuccess: (ctx) => {
          setMessage({ code: "200", text: "Connexion réussi" })
          setTimeout(() => {
            redirect("/")
          }, 1000)
        },
        onError: (ctx) => {
          if (ctx.error.status === 401) {
            setMessage({
              code: ctx.error.status,
              text: "Email ou Mot de passe incorrect",
            })
          } else {
            setMessage({ code: ctx.error.status, text: ctx.error.message })
          }
        },
      }
    )
  }
  return (
    <Card className="w-sm border-transparent bg-card/70 backdrop-blur-sm">
      <CardHeader className="font-bold">
        <div className="relative mx-auto h-18 w-3xs">
          <Image src={logo.src} alt={"logo"} fill className="object-cover" />
        </div>
        <CardTitle className="mx-auto text-3xl">Connexion</CardTitle>
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
                    Email
                  </FieldLabel>
                  <Input {...field} placeholder="@gamil.com" />

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
                      placeholder={
                        accountType === "regular"
                          ? "Utiliser votre N de matricule"
                          : "*******"
                      }
                      type={showPassword ? "text" : "password"}
                      className="pr-10"
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
            type="submit"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await form.handleSubmit(onSubmit)()
              })
            }}
          >
            {isPending ? <Spinner /> : `Se connecter`}
          </Button>
        </Field>

        {accountType === "regular" ? (
          <span className="flex flex-row items-center space-x-2">
            <p className="text-sm">Vous n'avez pas encore de mot de passe? </p>{" "}
            <Link
              href="/auth/setPassword"
              className="text-accent hover:underline"
            >
              Définir
            </Link>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-2">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground transition-colors hover:text-accent"
            >
              Mot de passe oublié ?
            </Link>
          </span>
        )}
        <span>
          <p
            className={clsx("text-center", {
              "text-green-400": message.code === "200",
              "text-destructive":
                message.code !== "200" && message.code !== "201",
            })}
          >
            {message.text}
          </p>
        </span>
      </CardFooter>
    </Card>
  )
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginPage />
    </Suspense>
  )
}
