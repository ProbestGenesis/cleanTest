"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useForm,
  useFieldArray,
  Controller,
  type Resolver,
} from "react-hook-form"
import z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { PurchaseSchema } from "@/lib/zodschema"
import { useCreatePurchase } from "@/lib/hooks/usePurchases"
import { PRODUCT_CATEGORIES } from "@/lib/product-code"
import {
  Trash2,
  Plus,
  UploadCloud,
  ImageIcon,
  X,
  ImagePlus,
} from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"

type PurchaseFormValues = z.infer<typeof PurchaseSchema>

export function CreatePurchaseForm({ onSuccess }: { onSuccess?: () => void }) {
  const [images, setImages] = useState<string[]>([])
  const { mutate: createPurchase, isPending } = useCreatePurchase()

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const res = await fetch("/api/providers") // Need to ensure this exists or use a service
      if (!res.ok) return []
      return res.json()
    },
  })

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(
      PurchaseSchema
    ) as unknown as Resolver<PurchaseFormValues>,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      items: [{ productName: "", quantity: 1, unitPrice: 0 }],
      type: "Achat",
      amountPaid: 0,
      images: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
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
      const currentFiles = form.getValues("images") || []
      form.setValue("images", [...currentFiles, ...fileArray])

      const newPreviews = fileArray.map((file) => URL.createObjectURL(file))
      setImages((prev) => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    const currentFiles = form.getValues("images") || []
    const nextFiles = currentFiles.filter((_, i) => i !== index)
    form.setValue("images", nextFiles)

    setImages((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-4xl space-y-6 rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ productName: "", quantity: 1, unitPrice: 0 })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Ajouter un article
          </Button>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-1 items-end gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-12"
          >
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
                    <Input
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
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
                    <Input
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </Field>
                )}
              />
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="amountPaid"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className="font-bold">Montant déjà payé</FieldLabel>
              <Input
                type="number"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </Field>
          )}
        />
        <Controller
          name="dueDate"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className="font-bold">
                Échéance de paiement
              </FieldLabel>
              <Input type="date" {...field} />
            </Field>
          )}
        />
      </div>

      <div className="space-y-4">
        <FieldLabel className="font-bold">Images / Facture</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {images.map((src, idx) => (
            <div
              key={idx}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border"
            >
              <Image src={src} alt="preview" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-0 right-0 bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-muted/50">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleImageChange}
              accept="image/*"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isPending}
        >
          Réinitialiser
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Spinner className="mr-2" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          Enregistrer l'achat
        </Button>
      </div>
    </form>
  )
}
