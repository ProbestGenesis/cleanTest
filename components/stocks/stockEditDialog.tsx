'use client'

import { Dispatch } from "react"
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  stockEditDialog: {
    open: boolean,
    type: string,
    productId: string
  },
  setStockEditDialog: Dispatch<{
    open: boolean;
    type: string;
    productId: string;
  }>
}

function StockEditDialogComponent({ setStockEditDialog, stockEditDialog }: Props) {

  return (
    <Dialog open={stockEditDialog.open} onOpenChange={(open) => setStockEditDialog({ ...stockEditDialog, open })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {`Demande d'autorisation ${stockEditDialog.type === "withdrawal" ? "de retrait" : "d'ajout"} dans le stock`}
          </DialogTitle>
          <DialogDescription>
            Veuillez remplir les informations ci-dessous pour confirmer l’opération.
          </DialogDescription>
        </DialogHeader>

        {stockEditDialog.type === "withdrawal" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdrawal-reason">Raison du retrait</Label>
              <Input id="withdrawal-reason" placeholder="Ex: produit endommagé" />
            </div>
            <div>
              <Label htmlFor="withdrawal-quantity">Quantité</Label>
              <Input id="withdrawal-quantity" type="number" min={1} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-quantity">Quantité à ajouter</Label>
              <Input id="add-quantity" type="number" min={1} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setStockEditDialog({ ...stockEditDialog, open: false })}>
            Annuler
          </Button>
          <Button>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StockEditDialogComponent
