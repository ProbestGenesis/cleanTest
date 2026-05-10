'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PurchaseSchema } from '@/lib/zodschema'
import { useCreatePurchase } from '@/lib/hooks/usePurchases'
import { PRODUCT_CATEGORIES } from '@/lib/product-code'
import { Trash2, Plus, UploadCloud, ImageIcon, X, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'

export function CreatePurchaseForm({ onSuccess }: { onSuccess?: () => void }) {
  const [images, setImages] = useState<string[]>([])
  const { mutate: createPurchase, isPending } = useCreatePurchase()

  const { data: providers } = useQuery({
      queryKey: ['providers'],
      queryFn: async () => {
          const res = await fetch('/api/providers') // Need to ensure this exists or use a service
          if (!res.ok) return []
          return res.json()
      }
  })

  const form = useForm({
    resolver: zodResolver(PurchaseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      items: [{ productName: '', quantity: 1, unitPrice: 0 }],
      type: 'Achat',
      amountPaid: 0,
      images: [] as any[],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const onSubmit = form.handleSubmit((data) => {
    createPurchase(data, {
      onSuccess: (res) => {
        if (res.ok) {
          toast.success(res.message)
          form.reset()
          setImages([])
          onSuccess?.()
        } else {
          toast.error(res.message)
        }
      },
    })
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const fileArray = Array.from(files)
      const currentFiles = form.getValues('images') || []
      form.setValue('images', [...currentFiles, ...fileArray])

      const newPreviews = fileArray.map(file => URL.createObjectURL(file))
      setImages(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
      const currentFiles = form.getValues('images') || []
      const nextFiles = currentFiles.filter((_, i) => i !== index)
      form.setValue('images', nextFiles)

      setImages(prev => {
          URL.revokeObjectURL(prev[index])
          return prev.filter((_, i) => i !== index)
      })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl mx-auto p-4 bg-card border rounded-xl shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="provider"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className="font-bold">Fournisseur (Nom)</FieldLabel>
              <Input {...field} placeholder="Nom du fournisseur" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className="font-bold">Date d'achat</FieldLabel>
              <Input type="date" {...field} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="category"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="font-bold">Catégorie</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="invoiceNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="font-bold">N° Facture</FieldLabel>
                <Input {...field} placeholder="FAC-2024-001" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Articles</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: '', quantity: 1, unitPrice: 0 })}>
            <Plus className="w-4 h-4 mr-2" /> Ajouter un article
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border rounded-lg bg-muted/30">
            <div className="md:col-span-5">
              <Controller
                name={`items.${index}.productName`}
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs">Produit</FieldLabel>
                    <Input {...field} placeholder="Désignation" />
                  </Field>
                )}
              />
            </div>
            <div className="md:col-span-2">
              <Controller
                name={`items.${index}.quantity`}
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs">Qté</FieldLabel>
                    <Input type="number" {...field} />
                  </Field>
                )}
              />
            </div>
            <div className="md:col-span-3">
              <Controller
                name={`items.${index}.unitPrice`}
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs">Prix Unitaire</FieldLabel>
                    <Input type="number" {...field} />
                  </Field>
                )}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="amountPaid"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="font-bold">Montant déjà payé</FieldLabel>
                <Input type="number" {...field} />
              </Field>
            )}
          />
          <Controller
            name="dueDate"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="font-bold">Échéance de paiement</FieldLabel>
                <Input type="date" {...field} />
              </Field>
            )}
          />
      </div>

      <div className="space-y-4">
          <FieldLabel className="font-bold">Images / Facture</FieldLabel>
          <div className="flex flex-wrap gap-2">
              {images.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 border rounded-lg overflow-hidden group">
                      <Image src={src} alt="preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0 right-0 bg-destructive text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                          <X className="w-3 h-3" />
                      </button>
                  </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <input type="file" multiple className="hidden" onChange={handleImageChange} accept="image/*" />
              </label>
          </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isPending}>Réinitialiser</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner className="mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
          Enregistrer l'achat
        </Button>
      </div>
    </form>
  )
}
