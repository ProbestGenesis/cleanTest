'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { resetPasswordSchema } from '@/lib/zodschema'
import logo from "@/assets/image/logo/nobg-gesentLogo.png"
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import Image from "next/image"
import z from 'zod'
import { logEmailReset } from '@/lib/actions/password-reset'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  
  const form = useForm({
    defaultValues: {
      email: email,
      otp: '',
      password: '',
      password_confirmation: '',
    },
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  })

  const onSubmit = async (value: z.infer<typeof resetPasswordSchema>) => {
    startTransition(async () => {
      const { error } = await authClient.emailOtp.resetPassword({
        email: value.email,
        otp: value.otp,
        password: value.password,
      })

      if (error) {
        toast.error(error.message || "Code invalide ou expiré")
      } else {
        await logEmailReset(value.email)
        toast.success("Mot de passe réinitialisé avec succès")
        setTimeout(() => {
          router.push('/auth')
        }, 1500)
      }
    })
  }

  return (
    <Card className="w-sm bg-card/70 border-transparent backdrop-blur-sm shadow-xl">
      <CardHeader className="font-bold text-center">
        <div className='w-3xs h-18 relative mx-auto mb-2'>
          <Image src={logo.src} alt={"logo"} fill className='object-contain' />
        </div>
        <CardTitle className="text-2xl">Réinitialisation</CardTitle>
        <span className="mx-auto h-1 rounded-full w-24 bg-green-400/60"></span>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold">Email</FieldLabel>
                <div className="relative">
                  <Input {...field} disabled className="pl-10 bg-muted/50" />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                </div>
              </Field>
            )}
          />

          <Controller
            name="otp"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold">Code OTP (6 chiffres)</FieldLabel>
                <Input {...field} placeholder="000000" className="text-center tracking-widest text-lg font-mono" maxLength={6} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold">Nouveau mot de passe</FieldLabel>
                <div className="relative">
                  <Input 
                    {...field} 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="********" 
                    className="pl-10 pr-10" 
                  />
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password_confirmation"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold">Confirmer le mot de passe</FieldLabel>
                <Input {...field} type="password" placeholder="********" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button
            className="w-full rounded-full mt-2"
            type="submit"
            disabled={isPending}
          >
            {isPending ? <Spinner /> : "Réinitialiser mon mot de passe"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col border-t border-muted-foreground/10 pt-4">
        <Link 
          href="/auth/forgot-password" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
