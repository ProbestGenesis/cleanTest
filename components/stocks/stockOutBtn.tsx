"use client"

import { Product } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import StockOutDialog from "./stockOutDialog"
import clsx from "clsx"

type StockResponse = {
  data?: Product[]
}

function StockOutBtn() {
  const [openSelector, setOpenSelector] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [openStockOutDialog, setOpenStockOutDialog] = useState(false)

  useEffect(() => {
    if (!openSelector) return

    startTransition(async () => {
      const res = await fetch("/api/stock?limit=300&page=1")
      if (!res.ok) {
        setProducts([])
        return
      }

      const payload: StockResponse = await res.json()
      setProducts(payload.data ?? [])
    })
  }, [openSelector])

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return products
    return products.filter((item) => {
      const name = item.name?.toLowerCase() ?? ""
      const code = item.code?.toLowerCase() ?? ""
      const ref = item.ref?.toLowerCase() ?? ""
      return name.includes(value) || code.includes(value) || ref.includes(value)
    })
  }, [products, query])

  const toggleProduct = (product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.find((p) => p.id === product.id)
      if (isSelected) {
        return prev.filter((p) => p.id !== product.id)
      } else {
        return [...prev, product]
      }
    })
  }

  const removeProduct = (id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleCloseStockOutDialog = () => {
    setOpenStockOutDialog(false)
    setSelectedProducts([])
  }

  return (
    <>
      <Button variant="outline" className="rounded-full" onClick={() => setOpenSelector(true)}>
        Demande de sortie
      </Button>

      <Dialog open={openSelector} onOpenChange={setOpenSelector}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Sélectionner les produits à sortir</DialogTitle>
            <DialogDescription>
              Recherchez et cochez les produits que vous souhaitez sortir du stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Products Badges */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                {selectedProducts.map((p) => (
                  <Badge
                    key={p.id}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 flex items-center gap-1"
                  >
                    {p.name}
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="hover:bg-muted rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, code ou référence"
            />
          </div>

          <div className="flex-1 max-h-[80vh] overflow-y-scroll mt-2 pr-2">
            {isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun produit trouvé.</p>
            ) : (
              <div className="space-y-1">
                {filteredProducts.map((item) => {
                  const isSelected = selectedProducts.some((p) => p.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className={clsx(
                        "flex items-center space-x-3 w-full border rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer",
                        isSelected && "bg-muted/30 border-primary/50"
                      )}
                      onClick={() => toggleProduct(item)}
                    >
                      <Checkbox
                        id={`prod-out-${item.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleProduct(item)}
                        onClick={(e) => e.stopPropagation()} // Prevent double toggle
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-nowrap">
                           En stock: <strong>{item.quantity}</strong>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ref: {item.ref || "—"} | Code: {item.code || "—"} | Unité:{" "}
                          {item.unity || "U"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenSelector(false)}>
              Annuler
            </Button>
            <Button
              disabled={selectedProducts.length === 0}
              onClick={() => {
                setOpenSelector(false)
                setOpenStockOutDialog(true)
              }}
            >
              Suivant ({selectedProducts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openStockOutDialog && (
        <StockOutDialog
          isOpen={openStockOutDialog}
          onClose={handleCloseStockOutDialog}
          products={selectedProducts}
        />
      )}
    </>
  )
}

export default StockOutBtn
