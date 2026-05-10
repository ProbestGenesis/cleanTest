"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Client, Product } from "@/generated/prisma/client"
import { sellProduct } from "@/lib/actions/products/sell"
import { createBulkStockOutRequest } from "@/lib/actions/stock/createBulkStockOutRequest"
import { useAvailability } from "@/lib/hooks/useAvailability"
import { useClients } from "@/lib/hooks/useClients"
import { useStock } from "@/lib/hooks/useStock"
import { bulkStockOutRequest, sellProducts } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import z from "zod"

type Props = {
  product?: Product // Keeping for backward compatibility
  products?: Product[] // Support for multiple products
  onClose: () => void
  isOpen: boolean
}

type OperationType = "STOCK_OUT" | "SELL"

function StockOutDialog({
  isOpen,
  onClose,
  product,
  products: providedProducts,
}: Props) {
  const [message, setMessage] = useState<{ ok: boolean; text: string }>({
    ok: false,
    text: "",
  })
  const [isPending, startTransition] = useTransition()
  const [operationType, setOperationType] = useState<OperationType>("STOCK_OUT")
  const [clientSearch, setClientSearch] = useState("")
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedClientName, setSelectedClientName] = useState("")
  const queryClient = useQueryClient()

  // Hooks for data
  const stockData = useStock({ limit: 100 })
  const allProducts = (stockData.data as Product[]) || []
  const { data: clientsData } = useClients(clientSearch)
  const allClients = clientsData?.data || []

  const initialStockOutItems = useMemo(() => {
    if (providedProducts && providedProducts.length > 0) {
      return providedProducts.map((p) => ({
        productId: p.id,
        quantity: 1,
        reason: "",
        destination: "",
      }))
    }
    if (product) {
      return [
        {
          productId: product.id,
          quantity: 1,
          reason: "",
          destination: "",
        },
      ]
    }
    return []
  }, [product, providedProducts])

  const initialSellItems = useMemo(() => {
    if (providedProducts && providedProducts.length > 0) {
      return providedProducts.map((p) => ({
        productId: p.id,
        quantity: 1,
        purchasePrice: p.sellingPrice || 0,
      }))
    }
    if (product) {
      return [
        {
          productId: product.id,
          quantity: 1,
          purchasePrice: product.sellingPrice || 0,
        },
      ]
    }
    return []
  }, [product, providedProducts])

  const form = useForm({
    defaultValues: operationType === "STOCK_OUT" 
      ? { items: initialStockOutItems }
      : {
          name: "",
          type: "DIRECT",
          items: initialSellItems,
        },
    resolver: zodResolver(
      operationType === "STOCK_OUT" 
        ? bulkStockOutRequest as z.ZodSchema
        : (sellProducts as z.ZodSchema)
    ),
    mode: "onChange",
    reValidateMode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const productIds = fields
    .map((_, idx) => form.watch(`items.${idx}`)?.productId)
    .filter(Boolean) as string[]
  const { data: availabilityData } = useAvailability(productIds)

  const availabilityById = useMemo(() => {
    const next: Record<
      string,
      { stock: number; reserved: number; available: number }
    > = {}
    availabilityData?.data?.forEach((item) => {
      next[item.productId] = item
    })
    return next
  }, [availabilityData])

  useEffect(() => {
    if (isOpen) {
      if (operationType === "STOCK_OUT") {
        form.reset({ items: initialStockOutItems })
      } else {
        form.reset({
          name: "",
          type: "DIRECT",
          items: initialSellItems,
        })
      }
      setMessage({ ok: false, text: "" })
      setSelectedClientId("")
      setSelectedClientName("")
      setClientSearch("")
    }
  }, [isOpen, operationType, initialStockOutItems, initialSellItems, form])

  const handleClose = () => {
    setMessage({ ok: false, text: "" })
    onClose()
  }

  const onSubmit = (value: z.infer<typeof bulkStockOutRequest> | z.infer<typeof sellProducts>) => {
    startTransition(async () => {
      // Check availability
      for (const item of value.items) {
        const availability = availabilityById[item.productId]
        if (availability && item.quantity > availability.available) {
          setMessage({
            ok: false,
            text: `Quantité insuffisante pour un produit. Disponible réel: ${availability.available}.`,
          })
          return
        }
      }

      let result: { ok: boolean; message: string }
      if (operationType === "SELL") {
        const sellValue = value as z.infer<typeof sellProducts>
        result = await sellProduct({
          value: {
            name: selectedClientName || sellValue.name,
            type: sellValue.type,
            items: sellValue.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              purchasePrice: it.purchasePrice,
            })),
          },
          clientId: selectedClientId || undefined,
        })
      } else {
        const stockOutValue = value as z.infer<typeof bulkStockOutRequest>
        result = await createBulkStockOutRequest(stockOutValue)
      }

      setMessage({ ok: result.ok, text: result.message })
      if (result.ok) {
        // Invalidate queries to refresh UI
        void queryClient.invalidateQueries({ queryKey: ["stock"] })
        void queryClient.invalidateQueries({ queryKey: ["stock-history"] })
        void queryClient.invalidateQueries({ queryKey: ["stock-availability"] })

        setTimeout(() => {
          handleClose()
        }, 1500)
      }
    })
  }

  const productMap = useMemo(
    () => new Map((allProducts || []).map((p) => [p.id, p])),
    [allProducts]
  )

  const sharedDestination = form.watch("items.0.destination") ?? ""
  const sharedReason = form.watch("items.0.reason") ?? ""
  const sharedDestinationError =
    form.formState.errors.items?.[0]?.destination?.message
  const sharedReasonError = form.formState.errors.items?.[0]?.reason?.message

  const updateSharedDestination = (value: string) => {
    fields.forEach((_, index) => {
      form.setValue(`items.${index}.destination`, value, {
        shouldDirty: true,
        shouldValidate: true,
      })
    })
  }

  const updateSharedReason = (value: string) => {
    fields.forEach((_, index) => {
      form.setValue(`items.${index}.reason`, value, {
        shouldDirty: true,
        shouldValidate: true,
      })
    })
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id)
    setSelectedClientName(client.name)
    setIsClientPopoverOpen(false)
  }

  const handleManualClientEntry = (name: string) => {
    setSelectedClientId("")
    setSelectedClientName(name)
    setIsClientPopoverOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex w-[95vw] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/20 px-6 pt-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">Sortie de stock</DialogTitle>
                <DialogDescription>
                  {operationType === "STOCK_OUT"
                    ? "Renseignez la sortie de stock hors vente. La quantité sera retirée après validation."
                    : "Enregistrez une vente directe ou avec livraison."}
                </DialogDescription>
              </div>
              <Tabs
                value={operationType}
                onValueChange={(v) => setOperationType(v as OperationType)}
                className="w-[300px]"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="STOCK_OUT">Sortie simple</TabsTrigger>
                  <TabsTrigger value="SELL">Vente</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </DialogHeader>

        <form
          id="stock-out-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-1 flex-col overflow-y-auto"
        >
          <div className="space-y-6 px-6 py-6">
            {/* Header fields specific to operation type */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {operationType === "SELL" ? (
                <>
                  <Field>
                    <FieldLabel className="font-bold">Client</FieldLabel>
                    <Popover
                      open={isClientPopoverOpen}
                      onOpenChange={setIsClientPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isClientPopoverOpen}
                          className="h-10 w-full justify-between px-3 font-normal"
                        >
                          {selectedClientName ||
                            "Rechercher ou saisir un client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Rechercher un client..."
                            value={clientSearch}
                            onValueChange={setClientSearch}
                          />
                          <CommandList>
                            <CommandEmpty className="p-0">
                              <div className="px-4 py-6 text-center">
                                <p className="mb-4 text-sm text-muted-foreground">
                                  Aucun client trouvé.
                                </p>
                                {clientSearch && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      handleManualClientEntry(clientSearch)
                                    }
                                    className="w-full"
                                  >
                                    Utiliser "{clientSearch}"
                                  </Button>
                                )}
                              </div>
                            </CommandEmpty>
                            <CommandGroup heading="Clients existants">
                              {allClients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.id}
                                  onSelect={() => handleClientSelect(client)}
                                >
                                  <Check
                                    className={clsx(
                                      "mr-2 h-4 w-4",
                                      selectedClientId === client.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{client.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {client.phone || client.email}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {!selectedClientName && (
                      <FieldError>
                        Veuillez sélectionner ou saisir un client
                      </FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel className="font-bold">Type de vente</FieldLabel>
                    <Controller
                      name="type"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DIRECT">
                              Vente Directe
                            </SelectItem>
                            <SelectItem value="DELIVERY">
                              Vente avec Livraison
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field>
                    <FieldLabel className="font-bold">
                      Objet / Destination
                    </FieldLabel>
                    <Input
                      value={sharedDestination}
                      onChange={(e) => updateSharedDestination(e.target.value)}
                      className="h-10"
                      placeholder="Ex: Chantier 1"
                    />
                    {sharedDestinationError && (
                      <FieldError>{sharedDestinationError}</FieldError>
                    )}
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel className="font-bold">Raison</FieldLabel>
                    <Textarea
                      value={sharedReason}
                      onChange={(e) => updateSharedReason(e.target.value)}
                      placeholder="Pourquoi sortir ces produits ?"
                      rows={2}
                      className="min-h-[76px]"
                    />
                    {sharedReasonError && (
                      <FieldError>{sharedReasonError}</FieldError>
                    )}
                  </Field>
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="border-b pb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Produits
              </h3>
              {fields.map((field, index) => {
                const itemValues = form.watch(`items.${index}`)
                const currentProduct = productMap.get(itemValues?.productId)
                const availability =
                  availabilityById[itemValues?.productId ?? ""]

                return (
                  <div
                    key={field.id}
                    className="relative space-y-4 rounded-xl border bg-card/50 p-5"
                  >
                    <div className="flex flex-col gap-6 md:flex-row">
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-6">
                          <Controller
                            name={`items.${index}.productId`}
                            control={form.control}
                            render={({ field: selectField }) => (
                              <Field>
                                <FieldLabel className="font-bold">
                                  Produit
                                </FieldLabel>
                                <Select
                                  onValueChange={(val) => {
                                    selectField.onChange(val)
                                    const prod = productMap.get(val)
                                    if (prod) {
                                      form.setValue(
                                        `items.${index}.purchasePrice`,
                                        prod.sellingPrice || 0
                                      )
                                    }
                                  }}
                                  value={selectField.value}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Sélectionner un produit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allProducts.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name} ({p.code || "Sans code"})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {form.formState.errors.items?.[index]
                                  ?.productId && (
                                  <FieldError>
                                    {
                                      form.formState.errors.items[index]
                                        ?.productId?.message
                                    }
                                  </FieldError>
                                )}
                              </Field>
                            )}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <Controller
                            name={`items.${index}.quantity`}
                            control={form.control}
                            render={({ field: qtyField }) => (
                              <Field>
                                <FieldLabel className="font-bold">
                                  Quantité
                                </FieldLabel>
                                <Input
                                  {...qtyField}
                                  type="number"
                                  min={1}
                                  className="h-10"
                                  onChange={(e) =>
                                    qtyField.onChange(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                                <div className="mt-2 space-y-1">
                                  <p className="text-[11px] text-muted-foreground">
                                    Stock:{" "}
                                    <strong>
                                      {currentProduct?.quantity ?? 0}
                                    </strong>
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Libre:{" "}
                                    <strong className="text-green-600">
                                      {availability?.available ?? 0}
                                    </strong>
                                  </p>
                                </div>
                                {form.formState.errors.items?.[index]
                                  ?.quantity && (
                                  <FieldError>
                                    {
                                      form.formState.errors.items[index]
                                        ?.quantity?.message
                                    }
                                  </FieldError>
                                )}
                              </Field>
                            )}
                          />
                        </div>

                        {operationType === "SELL" && (
                          <div className="md:col-span-3">
                            <Controller
                              name={`items.${index}.purchasePrice`}
                              control={form.control}
                              render={({ field: priceField }) => (
                                <Field>
                                  <FieldLabel className="font-bold">
                                    Prix de vente
                                  </FieldLabel>
                                  <Input
                                    {...priceField}
                                    type="number"
                                    min={0}
                                    className="h-10"
                                    onChange={(e) =>
                                      priceField.onChange(
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                  />
                                  {form.formState.errors.items?.[index]
                                    ?.purchasePrice && (
                                    <FieldError>
                                      {
                                        form.formState.errors.items[index]
                                          ?.purchasePrice?.message
                                      }
                                    </FieldError>
                                  )}
                                </Field>
                              )}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 text-destructive hover:bg-destructive/10"
                          disabled={fields.length <= 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full max-w-xs rounded-full border-dashed"
                onClick={() => {
                  const first = allProducts?.[0]
                  append({
                    productId: first?.id || "",
                    quantity: 1,
                    reason: operationType === "STOCK_OUT" ? sharedReason : "",
                    destination:
                      operationType === "STOCK_OUT" ? sharedDestination : "",
                    purchasePrice: first?.sellingPrice || 0,
                  })
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
          </div>
        </form>

        {message.text && (
          <div
            className={clsx(
              "mx-6 my-4 animate-in rounded-lg p-3 text-center text-sm font-medium fade-in slide-in-from-bottom-2",
              message.ok
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-destructive/20 bg-destructive/10 text-destructive"
            )}
          >
            {message.text}
          </div>
        )}

        <DialogFooter className="gap-3 border-t bg-muted/20 px-6 py-4">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={handleClose}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="stock-out-form"
            className="rounded-full px-8 shadow-lg shadow-primary/20"
            disabled={isPending || fields.length === 0}
          >
            {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {operationType === "SELL"
              ? "Confirmer la vente"
              : "Envoyer la demande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StockOutDialog
