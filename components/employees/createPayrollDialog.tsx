'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { createPayrollSchema } from '@/lib/zodschema'
import { useWorkers } from '@/lib/hooks/useWorkers'
import { createPayrolls } from '@/lib/actions/payrolls/createPayrolls'
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { ReactNode, useMemo, useState, useTransition } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import z from 'zod'

type Props = {
  children: ReactNode
}

const getTodayDate = () => new Date()

function CreatePayrollDialog({ children }: Props) {
  const router = useRouter()
  const { data: workersData, isLoading } = useWorkers()
  const workers = workersData ?? []
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const form = useForm<z.infer<typeof createPayrollSchema>>({
    resolver: zodResolver(createPayrollSchema) as any,
    defaultValues: {
      workerId: '',
      periodStart: getTodayDate(),
      periodEnd: getTodayDate(),
      baseSalary: 0,
      bonuses: 0,
      deductions: 0,
    },
    mode: 'onChange',
  })

  const baseSalary = Number(useWatch({ control: form.control, name: 'baseSalary' }) || 0)
  const bonuses = Number(useWatch({ control: form.control, name: 'bonuses' }) || 0)
  const deductions = Number(useWatch({ control: form.control, name: 'deductions' }) || 0)

  const netSalary = useMemo(() => baseSalary + bonuses - deductions, [baseSalary, bonuses, deductions])

  const closeDialog = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setFeedback(null)
      form.reset({
        workerId: '',
        periodStart: getTodayDate(),
        periodEnd: getTodayDate(),
        baseSalary: 0,
        bonuses: 0,
        deductions: 0,
      })
    }
  }

  const onSubmit = (values: z.infer<typeof createPayrollSchema>) => {
    startTransition(async () => {
      const result = await createPayrolls(values)
      setFeedback({ ok: result.ok, message: result.message })

      if (result.ok) {
        router.refresh()
        setTimeout(() => {
          closeDialog(false)
        }, 1000)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un bulletin de paie</DialogTitle>
          <DialogDescription>
            Sélectionnez le travailleur et complétez les champs du bulletin de paie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-2">
            <Controller
              name="workerId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Travailleur</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue
                        placeholder={isLoading ? 'Chargement des travailleurs...' : 'Choisir un travailleur'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="periodStart"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Période (début)</FieldLabel>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="periodEnd"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Période (fin)</FieldLabel>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="baseSalary"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Salaire brut</FieldLabel>
                  <Input type="number" step="0.01" min="0" {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="bonuses"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Primes</FieldLabel>
                    <Input type="number" step="0.01" min="0" {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="deductions"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Retenues</FieldLabel>
                    <Input type="number" step="0.01" min="0" {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="text-sm">
              Salaire net estimé: <span className={clsx('font-semibold', netSalary < 0 && 'text-red-500')}>{netSalary.toFixed(2)}</span>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => closeDialog(false)} className='rounded-full'>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending} className='rounded-full'>
              {isPending ? <Spinner /> : 'Créer le bulletin'}
            </Button>
          </DialogFooter>

          {feedback?.message && (
            <p className={clsx('mt-2 text-center text-sm', feedback.ok ? 'text-green-600' : 'text-red-600')}>
              {feedback.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreatePayrollDialog
