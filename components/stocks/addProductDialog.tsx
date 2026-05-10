'use client'

import { upload } from '@vercel/blob/client'
import { Product } from '@/generated/prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { PRODUCT_CATEGORIES } from '@/lib/product-code'
import { createProduct as formSchema } from '@/lib/zodschema'
//import { addProduct, getNextProductCode, updatePrdoduct } from '@/lib/actions/products'

import { addProduct, getNextProductCode, updateProduct } from "@/lib/actions/products/products"
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { ImageIcon, ImagePlus, Trash2, UploadCloud, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import z from 'zod'
import { TypeDialog } from './inventoryTable';
import { useQueryClient } from '@tanstack/react-query'


type Props = {
  onClose: () => void
  isOpen: boolean
  type?: TypeDialog
  data?: Product
  mutate?: () => Promise<any>
}

function ProductDialog({ isOpen, onClose, type, data, mutate }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [existingImgs, setExistingImgs] = useState<string[]>([])
  const [newImgs, setNewImgs] = useState<string[]>([])
  const [removeExistingImages, setRemoveExistingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const [isCodeLoading, setIsCodeLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string }>({
    ok: false,
    text: '',
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const clearMessage = () => {
    setMessage({ ok: false, text: '' })
  }
  const [isPending, StartTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      name: data?.name ?? '',
      category: data?.category ?? '',
      quantity: data?.quantity ?? 0,
      purchasePrice: data?.purchasePrice ?? 0,
      sellingPrice: data?.sellingPrice ?? 0,
      code: data?.code ?? '',
      unity: data?.unity ?? '',
      brand: data?.brand ?? '',
    },
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  })
  const selectedCategory = form.watch('category')
  const handleSubmitForm = form.handleSubmit(async (value) => {
    if (type === TypeDialog.update) {
      await onSubmitUpdate(value)
      return
    }

    await onSubmit(value)
  })

  useEffect(() => {
    if (!isOpen) return

    if (type === TypeDialog.update && data) {
      form.reset({
        name: data.name ?? '',
        category: data.category ?? '',
        quantity: data.quantity ?? 0,
        purchasePrice: data.purchasePrice ?? 0,
        sellingPrice: data.sellingPrice ?? 0,
        code: data.code ?? '',
        unity: data.unity ?? '',
        brand: data.brand ?? '',
      })
      return
    }

    if (type !== TypeDialog.update) {
      form.reset({
        name: '',
        category: '',
        quantity: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        code: '',
        unity: '',
        brand: '',
      })
    }
  }, [data, form, isOpen, type])

  useEffect(() => {
    let isCancelled = false
    const setGeneratedCode = async () => {
      if (!selectedCategory) {
        if (type === TypeDialog.update && data?.code) {
          form.setValue('code', data.code, { shouldValidate: true })
        } else {
          form.setValue('code', '', { shouldValidate: true })
        }
        return
      }

      const isUpdate = type === TypeDialog.update
      const categoryChangedOnUpdate = isUpdate && data?.category && selectedCategory !== data.category

      if (isUpdate && !categoryChangedOnUpdate) {
        form.setValue('code', data?.code ?? '', { shouldValidate: true })
        return
      }

      setIsCodeLoading(true)
      const response = await getNextProductCode(selectedCategory)
      if (!isCancelled && response.ok) {
        form.setValue('code', response.code, { shouldValidate: true })
      }
      if (!isCancelled) {
        setIsCodeLoading(false)
      }
    }

    setGeneratedCode()

    return () => {
      isCancelled = true
    }
  }, [data?.category, data?.code, form, selectedCategory, type])

  useEffect(() => {
    if (type === TypeDialog.update && data) {
      const savedImages = (data.images ?? []).filter(Boolean)
      setExistingImgs(savedImages)
      setNewImgs([])
      setRemoveExistingImages(false)
      return
    }

    setExistingImgs([])
    setNewImgs([])
    setRemoveExistingImages(false)
  }, [data, type, isOpen])

  const clearPrvImage = (img: string, idx: number) => {
    URL.revokeObjectURL(img)
    const nextImgs = newImgs.filter((_, index) => index !== idx)
    setNewImgs(nextImgs)
    const currentFiles = form.getValues('images') ?? []
    const nextFiles = currentFiles.filter((_, index) => index !== idx)
    form.setValue('images', nextFiles, { shouldValidate: true })
  }
  const onSubmit = async (value: z.infer<typeof formSchema>) => {
    let finalImages: string[] = []
    
    if (value.images && value.images.length > 0) {
      setMessage({ ok: true, text: "Enregistrement en cours..." })
      setUploadProgress(0)
      try {
        const progressMap: { [key: number]: number } = {}
        const totalFiles = value.images.length

        const uploadPromises = value.images.map(async (img, idx) => {
          if (img instanceof File) {
            const uniqueName = `${Date.now()}-${img.name}`
            const newBlob = await upload(uniqueName, img, {
              access: 'public',
              handleUploadUrl: '/api/upload/blob',
              onUploadProgress: (progressEvent) => {
                progressMap[idx] = progressEvent.percentage
                const currentTotalProgress = Object.values(progressMap).reduce((a, b) => a + b, 0)
                setUploadProgress(Math.round(currentTotalProgress / totalFiles))
              }
            })
            return newBlob.url
          }
          progressMap[idx] = 100
          const currentTotalProgress = Object.values(progressMap).reduce((a, b) => a + b, 0)
          setUploadProgress(Math.round(currentTotalProgress / totalFiles))
          return img as string
        })
        finalImages = await Promise.all(uploadPromises)
      } catch (error) {
        console.error("Error uploading images:", error)
        setMessage({ ok: false, text: "Erreur lors de l'upload des images" })
        setUploadProgress(0)
        return
      }
    }

    const { ok, message } = await addProduct({ ...value, images: finalImages })
    setMessage({ ok, text: message })
    if (ok) {
      if (mutate) {
        await mutate()
      } else {
        await queryClient.invalidateQueries({ queryKey: ['stock'] })
      }
      setTimeout(() => {
        clearMessage()
        onClose()
      }, 500)
      router.refresh()
    }
  }

  const onSubmitUpdate = async (value: z.infer<typeof formSchema>) => {
    if (!data) return null
    
    let finalImages: string[] = []
    
    if (value.images && value.images.length > 0) {
      setMessage({ ok: true, text: "Upload des nouvelles images..." })
      setUploadProgress(0)
      try {
        const progressMap: { [key: number]: number } = {}
        const totalFiles = value.images.length

        const uploadPromises = value.images.map(async (img, idx) => {
          if (img instanceof File) {
            const uniqueName = `${Date.now()}-${img.name}`
            const newBlob = await upload(uniqueName, img, {
              access: 'public',
              handleUploadUrl: '/api/upload/blob',
              onUploadProgress: (progressEvent) => {
                progressMap[idx] = progressEvent.percentage
                const currentTotalProgress = Object.values(progressMap).reduce((a, b) => a + b, 0)
                setUploadProgress(Math.round(currentTotalProgress / totalFiles))
              }
            })
            return newBlob.url
          }
          progressMap[idx] = 100
          const currentTotalProgress = Object.values(progressMap).reduce((a, b) => a + b, 0)
          setUploadProgress(Math.round(currentTotalProgress / totalFiles))
          return img as string
        })
        finalImages = await Promise.all(uploadPromises)
      } catch (error) {
        console.error("Error uploading images:", error)
        setMessage({ ok: false, text: "Erreur lors de l'upload des images" })
        setUploadProgress(0)
        return
      }
    }

    const { ok, message } = await updateProduct({
      value: { ...value, images: finalImages },
      id: data.id,
      removeExistingImages,
    })
    setMessage({ ok, text: message })
    if (ok) {
      if (mutate) {
        await mutate()
      } else {
        await queryClient.invalidateQueries({ queryKey: ['stock'] })
      }
      setTimeout(() => {
        clearMessage()
        router.refresh()
        onClose()
      }, 500)
    }
  }

  
  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto">
        <DialogHeader>
         {type === TypeDialog.update ? <DialogTitle>Modifier un produit</DialogTitle> : <DialogTitle>Ajouter un produit</DialogTitle>}
          <DialogDescription>
            Veuillez renseigner les informations nécessaires pour ajouter un nouveau produit.
          </DialogDescription>
        </DialogHeader>

        <div>
          <form onSubmit={handleSubmitForm}>
            <FieldGroup className="gap-1">
              <div className="flex flex-row space-x-4">
                {' '}
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="name" className="font-bold">
                        Nom
                      </FieldLabel>
                      <Input {...field} placeholder="Barre métalique" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-sm" />}
                    </Field>
                  )}
                />
                 <Controller
                  name="unity"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="unity" className="font-bold">
                        Unité
                      </FieldLabel>
                      <Input {...field} placeholder="U" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-sm" />}
                    </Field>
                  )}
                />
               
                <Controller
                  name="code"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="code" className="font-bold">
                        Code produit
                      </FieldLabel>
                      <Input
                        {...field}
                        type="text"
                        readOnly={type !== TypeDialog.update}
                        placeholder={isCodeLoading ? 'Génération...' : 'Code automatique'}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} className="text-sm"  />}
                    </Field>
                  )}
                />
              </div>
              <div className="flex flex-row space-x-4">
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="category" className="font-bold">
                        Catégorie
                      </FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryList.map((cat) => (
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
                  name="brand"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="brand" className="font-bold">
                        Marque
                      </FieldLabel>
                      <Input {...field} placeholder="Schneider" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="quantity"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="quantity" className="font-bold">
                      Nombre d&apos;articles disponible
                    </FieldLabel>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        field.onChange(Number(e.target.value))
                      }}
                      placeholder="100"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    {type === TypeDialog.update && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Toute modification de quantité nécessite une validation du superadmin.
                      </p>
                    )}
                  </Field>
                )}
              />
              <div className="flex flex-row space-x-4">
                <Controller
                  name="purchasePrice"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="purchasePrice" className="font-bold">
                        Prix d&apos;achat
                      </FieldLabel>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                        }}
                        placeholder="40 000"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="sellingPrice"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="sellingPrice" className="font-bold">
                        Prix de revente
                      </FieldLabel>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                        }}
                        placeholder="20 000"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {existingImgs.length > 0 || newImgs.length > 0 ? (
                <div className="space-y-2 mt-3">
                  {type === TypeDialog.update && existingImgs.length > 0 && !removeExistingImages ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => {
                          setExistingImgs([])
                          setRemoveExistingImages(true)
                        }}
                      >
                        <Trash2 className="size-4" />
                        Supprimer l&apos;ancienne photo
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-row space-x-2">
                  {existingImgs.map((item, idx) => (
                    <div key={`existing-${idx.toString()}`} className="w-18 h-18 rounded relative">
                      <Image src={item} fill alt="existing product image" />
                    </div>
                  ))}
                  {newImgs.map((item, idx) => (
                    <div key={idx.toString()} className="w-18 h-18 rounded relative">
                      <Button
                        type="button"
                        variant={'destructive'}
                        size={'icon-xs'}
                        className="absolute rounded-full z-10 top-0 right-0"
                        onClick={() => clearPrvImage(item, idx)}
                      >
                        <X />
                      </Button>
                      <Image src={item} fill alt="product image" />
                    </div>
                  ))}
                  </div>
                </div>
              ) : null}
              <Controller
                name="images"
                control={form.control}
                render={({ fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={clsx(
                      'relative flex items-center justify-center flex-col transition-colors',
                      newImgs.length > 0
                        ? 'h-auto border-0 bg-transparent p-0'
                        : 'rounded-xl border-2 border-dashed h-36',
                      (type === TypeDialog.update) && newImgs.length === 0
                        ? 'bg-muted/30 border-muted-foreground/30 hover:border-primary/50'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    <Input
                      ref={(element) => {
                        imageInputRef.current = element
                      }}
                      multiple
                      type="file"
                      className={clsx(
                        newImgs.length > 0 ? 'hidden' : 'opacity-0 h-full w-full absolute cursor-pointer'
                      )}
                      onChange={(e) => {
                        const files = e.currentTarget.files
                        if (files) {
                          const fileArray = Array.from(files)
                          const currentFiles = form.getValues('images') ?? []
                          const mergedFiles = [...currentFiles, ...fileArray]
                          const newPreviews = fileArray.map((item) => URL.createObjectURL(item))

                          setNewImgs((prev) => [...prev, ...newPreviews])
                          form.setValue('images', mergedFiles, { shouldValidate: true })
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    {newImgs.length > 0 ? (
                      <div className="w-full flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size={'icon'}
                          className="rounded-full"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImagePlus />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        {type === TypeDialog.update ? (
                          <UploadCloud className="mx-auto size-6 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="mx-auto size-6 text-muted-foreground" />
                        )}
                        <FieldLabel htmlFor="image" className="font-bold mx-auto">
                          {type === TypeDialog.update ? 'Remplacer la photo du produit' : 'Ajouter une photo'}
                        </FieldLabel>
                        <p className="text-xs text-muted-foreground text-center">
                          Cliquez pour sélectionner une ou plusieurs images.
                        </p>
                      </div>
                    )}
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </div>

        <DialogFooter className="flex flex-col ">
          <div className="w-full space-y-4">
            {isPending && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Upload des images...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}

            <Field orientation={'horizontal'} className="space-x-4 flex justify-end">
              <Button
                type="button"
                variant={'outline'}
                className="rounded-full"
                onClick={() => {
                  clearMessage()
                  onClose()
                }}
              >
                {message.ok ? `Fermer` : `Annuler`}
              </Button>

              {!message.ok && type !== TypeDialog.update && (
                <Button
                  type="button"
                  onClick={() => {
                    StartTransition(() => {
                      void handleSubmitForm()
                    })
                  }}
                  className="rounded-full"
                >
                  {isPending ? <Spinner /> : `Ajouter`}
                </Button>
              )}

              {!message.ok && type === TypeDialog.update && (
                <Button
                  type="button"
                  onClick={() => {
                    StartTransition(() => {
                      void handleSubmitForm()
                    })
                  }}
                  className="rounded-full"
                >
                  {isPending ? <Spinner /> : `Modifier`}
                </Button>
              )}
            </Field>

            <div>
              {message && (
                <p
                  className={clsx(' text-center mt-2.5', {
                    'text-destructive': message.ok === false,
                    'text-green-400': message.ok,
                  })}
                >
                  {' '}
                  {message.text}{' '}
                </p>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const categoryList = PRODUCT_CATEGORIES

export default ProductDialog
