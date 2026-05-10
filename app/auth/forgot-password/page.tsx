'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { forgotPasswordSchema } from '@/lib/zodschema'
import logo from "@/assets/image/logo/nobg-gesentLogo.png"
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import Image from "next/image"
import z from 'zod'
import { requestManualReset } from '@/lib/actions/password-reset'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isManualPending, setIsManualPending] = useState(false)
  
  const form = useForm({
    defaultValues: {
      email: '',
    },
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  })

  const onSendOTP = async (value: z.infer<typeof forgotPasswordSchema>) => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: value.email,
      type: "forget-password",
    })

    if (error) {
      toast.error(error.message || "Erreur lors de l'envoi du code")
    } else {
      toast.success("Code OTP envoyé sur votre email")
      router.push(`/auth/reset-password?email=${encodeURIComponent(value.email)}`)
    }
  }

  const onRequestManual = async () => {
    const email = form.getValues('email')
    if (!email || form.getFieldState('email').invalid) {
      form.trigger('email')
      return
    }

    setIsManualPending(true)
    const res = await requestManualReset(email)
    setIsManualPending(false)

    if (res.ok) {
      toast.success("Demande envoyée à l'administration")
    } else {
      toast.error(res.error || "Une erreur est survenue")
    }
  }

  return (
    <Card className="w-sm bg-card/70 border-transparent backdrop-blur-sm shadow-xl">
      <CardHeader className="font-bold text-center">
        <div className='w-3xs h-18 relative mx-auto mb-2'>
          <Image src={logo.src} alt={"logo"} fill className='object-contain' />
        </div>
        <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
        <span className="mx-auto h-1 rounded-full w-24 bg-accent/60"></span>
        <p className="text-xs text-muted-foreground mt-2 font-normal">
          Choisissez une option pour réinitialiser votre accès
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSendOTP)} className="space-y-6">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email" className="font-bold">
                  Votre Email professional
                </FieldLabel>
                <div className="relative">
                  <Input {...field} placeholder="email@exemple.com" className="pl-10" />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="flex flex-col gap-3">
            <Button
              className="w-full rounded-full bg-accent hover:bg-accent/90"
              type="submit"
              disabled={isPending}
            >
              {isPending ? <Spinner /> : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Envoyer un code OTP
                </span>
              )}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/20"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-full border-accent/30 hover:bg-accent/5"
              type="button"
              disabled={isManualPending}
              onClick={onRequestManual}
            >
              {isManualPending ? <Spinner /> : (
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Demander une réinitialisation
                </span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col border-t border-muted-foreground/10 pt-4">
        <Link 
          href="/auth" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la connexion
        </Link>
      </CardFooter>
    </Card>
  )
}
