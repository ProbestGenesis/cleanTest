"use client"

import { Client, Product, Sale } from "@/generated/prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import clsx from "clsx"
import {
  Box,
  CircleDollarSign,
  History,
  Info,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useState, useTransition } from "react"
import StockOutDialog from "./stockOutDialog"

type SaleDataType = Sale & { client: Client }
type Props = {
  showDialog: { data: Product | undefined; open: boolean }
  onClose: () => void
}

function ProductInfoDialog({ showDialog, onClose }: Props) {
  const [isPending, startTransiition] = useTransition()
  const product = showDialog.data
  const [salesData, setSalesData] = useState<SaleDataType[]>([])

  {
    /* const { data } = useSwr(`/api/sale/product/${product?.id}`, (...args) => {
    fetch(...args).then((res) => res.json()
    )
  })*/
  }
  const getSales = async () => {
    if (!product) return null
    startTransiition(async () => {
      const res = await fetch(`/api/sale/product/${product?.id}`)
      const data = await res.json()
      if (data.ok) {
        setSalesData(data.data)
        console.log(data)
      }
    })
  }

  useEffect(() => {
    getSales()
  }, [product])

  const [openStockOutDialiag, setOpenStockOutDialiag] = useState(false)
  const [openSellingDialog, setOpenSellingDialog] = useState(false)

  return (
    <>
      <Dialog
        open={showDialog.open}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-hidden overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Détails du Produit
                </DialogTitle>
                <DialogDescription>
                  Consultez les informations complètes et l'historique de ce
                  produit.
                </DialogDescription>
              </div>
              {product?.status && (
                <Badge
                  className={clsx("px-3 py-1 text-sm", product.status === "IN_STOCK" && product.quantity <= (product.threshold || 0) && "bg-yellow-500")}
                >
                  {product.status === "IN_STOCK"
                    ? product.quantity <= (product.threshold || 0)
                      ? "Stock Faible"
                      : "En Stock"
                    : "Rupture de Stock"}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="px-6 pb-6">
            <Tabs defaultValue="stock" className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-3">
                <TabsTrigger
                  value="general"
                  className="flex items-center gap-2"
                >
                  <Info className="size-4" /> Général
                </TabsTrigger>
                <TabsTrigger value="stock" className="flex items-center gap-2">
                  <Package className="size-4" /> Stock & Prix
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2"
                >
                  <History className="size-4" /> Historique Ventes
                </TabsTrigger>
              </TabsList>

              {/* Tab: General Information */}
              <TabsContent
                value="general"
                className="animate-in space-y-6 duration-300 fade-in-50"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted">
                      {product?.thumbnails ? (
                        <Image
                          src={product.thumbnails}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Box className="size-12" />
                          <span className="text-xs">Pas d'image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <InfoItem label="Nom" value={product?.name} highlight />
                      <InfoItem label="Marque" value={product?.brand} />
                      <InfoItem label="Code" value={product?.code} />
                      <InfoItem label="Catégorie" value={product?.category} />
                      <InfoItem
                        label="Fabricant"
                        value={product?.manufacturer}
                      />
                      <InfoItem
                        label="Pays d'origine"
                        value={product?.country}
                      />
                    </div>
                    {/*product?.designation && (
                    <div className="pt-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Désignation
                      </h4>
                      <p className="text-sm capitalize leading-relaxed text-foreground/80">
                        {product.designation}
                      </p>
                    </div>
                  )*/}
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Stock & Pricing */}
              <TabsContent
                value="stock"
                className="animate-in space-y-6 duration-300 fade-in-50"
              >
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <Package className="size-5 text-primary" /> État du Stock
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="rounded-xl border bg-muted/50 p-4">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Quantité Actuelle
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-3xl font-bold">
                            {product?.quantity}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {product?.unity || "Unités"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <CircleDollarSign className="size-5 text-primary" />{" "}
                      Tarification
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                        <span className="text-sm font-medium">
                          Prix de Vente
                        </span>
                        <span className="text-lg font-bold text-emerald-600">
                          {product?.sellingPrice?.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                        <span className="text-sm font-medium">
                          Prix d'Achat
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {product?.purchasePrice?.toLocaleString()} FCFA
                        </span>
                      </div>
                      {product?.sellingPrice && product?.purchasePrice && (
                        <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                          <div className="flex items-center gap-2">
                            {product.sellingPrice - product.purchasePrice >
                            0 ? (
                              <TrendingUp className="size-4 text-green-600" />
                            ) : (
                              <TrendingDown className="size-4 text-destructive" />
                            )}
                            <span className="text-sm font-medium">
                              Marge estimée
                            </span>
                          </div>
                          <span
                            className={clsx("text-lg font-bold", {
                              "text-green-600":
                                product.sellingPrice - product.purchasePrice >
                                0,
                              "text-destructive":
                                product.sellingPrice - product.purchasePrice <
                                0,
                            })}
                          >
                            {(
                              product.sellingPrice - product.purchasePrice
                            ).toLocaleString()}{" "}
                            FCFA
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Sales History */}
              <TabsContent
                value="history"
                className="animate-in space-y-4 duration-300 fade-in-50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ventes récentes</h3>
                  <Badge variant="outline" className="bg-orange-600 text-white">
                    {salesData.length} transaction(s)
                  </Badge>
                </div>

                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {isPending ? (
                      <div className="flex h-48 flex-col items-center justify-center space-y-4">
                        <Spinner className="size-8" />
                        <p className="text-sm text-muted-foreground">
                          Chargement de l'historique...
                        </p>
                      </div>
                    ) : salesData.length === 0 ? (
                      <div className="flex h-48 flex-col items-center justify-center">
                        <p className="text-muted-foreground">
                          Aucune vente enregistrée pour ce produit
                        </p>
                      </div>
                    ) : (
                      salesData.map((item) => (
                        <div
                          key={item.id}
                          className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="size-12 border-2 border-background">
                              <AvatarImage src={item.client?.image || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary uppercase">
                                {item.client?.name?.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">
                                {item.client?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.createAt &&
                                  new Date(item.createAt).toLocaleDateString(
                                    "fr-FR",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">
                              Qté: {item.quantity}
                            </p>
                            <p className="text-xs font-medium text-emerald-600">
                              {item.totalPrice?.toLocaleString()} FCFA
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <ScrollBar />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />
          <DialogFooter className="bg-muted/30 p-4">
            <Button
              className="rounded-full px-8"
              variant="outline"
              onClick={() => {
                setSalesData([])
                onClose()
              }}
            >
              Fermer
            </Button>

            <Button
              className="rounded-full px-8"
              variant="outline"
              onClick={() => {
                setOpenStockOutDialiag(true)
              }}
            >
              Demande de Sortie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openStockOutDialiag && (
        <StockOutDialog
          isOpen={openStockOutDialiag}
          onClose={() => {
            setOpenStockOutDialiag(false)
          }}
          product={product as any}
        />
      )}
    </>
  )
}

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string | null | undefined
  highlight?: boolean
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground capitalize">
        {label}
      </h4>
      <p
        className={clsx(
          "text-sm font-medium capitalize",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value || "----"}
      </p>
    </div>
  )
}

export default ProductInfoDialog
