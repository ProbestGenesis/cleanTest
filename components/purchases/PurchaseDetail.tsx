'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { markPurchaseDelivered } from '@/lib/actions/purchase/markPurchaseDelivered'
import { toast } from 'sonner'
import { Receipt, Truck, CreditCard, Calendar } from 'lucide-react'

export function PurchaseDetail({ purchaseId, onBack }: { purchaseId: string, onBack: () => void }) {
  const { data: purchase, isLoading, refetch } = useQuery({
    queryKey: ['purchase-detail', purchaseId],
    queryFn: async () => {
      const res = await fetch(`/api/purchases/${purchaseId}`)
      if (!res.ok) throw new Error('Failed to fetch purchase details')
      return res.json()
    },
    enabled: !!purchaseId
  })

  const handleMarkDelivered = async () => {
      const res = await markPurchaseDelivered({ purchaseId })
      if (res.ok) {
          toast.success(res.message)
          refetch()
      } else {
          toast.error(res.message)
      }
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>
  if (!purchase) return <div className="p-8 text-center border rounded-xl bg-card">Achat non trouvé</div>

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Achat #{purchase.invoiceNumber || purchase.id.slice(0, 8)}
          </h2>
          <p className="text-muted-foreground flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Commandé le {format(new Date(purchase.purchaseDate), 'PPP', { locale: fr })}
          </p>
        </div>
        <div className="flex gap-2">
           {purchase.status !== 'CONFIRMED' && purchase.status !== 'DELIVERED' && (
               <Button onClick={handleMarkDelivered} className="rounded-full">
                 <Truck className="w-4 h-4 mr-2" /> Déclarer la livraison
               </Button>
           )}
           <Button variant="outline" onClick={onBack} className="rounded-full">Retour</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" /> Articles commandés
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produit</TableHead>
                                <TableHead className="text-right">Quantité</TableHead>
                                <TableHead className="text-right">Prix Unit.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchase.purchaseItems.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.unitPrice.toLocaleString()} XOF</TableCell>
                                    <TableCell className="text-right font-bold">{item.totalPrice.toLocaleString()} XOF</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" /> Informations Financières
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Fournisseur</span>
                        <span className="font-semibold">{purchase.provider?.name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Total de l'achat</span>
                        <span className="text-xl font-bold">{purchase.totalAmount.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Montant payé</span>
                        <span className="text-green-600 font-bold">{purchase.amountPaid.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Reste à payer</span>
                        <span className="text-destructive font-bold">{(purchase.totalAmount - purchase.amountPaid).toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Échéance</span>
                        <Badge variant={purchase.isPaid ? 'default' : 'destructive'}>
                            {purchase.dueDate ? format(new Date(purchase.dueDate), 'PP', { locale: fr }) : 'Non définie'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Détails du Fournisseur</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p><strong>Pays:</strong> {purchase.country || '—'}</p>
                    <p><strong>Contact:</strong> {purchase.contact || '—'}</p>
                    <p><strong>NIF:</strong> {purchase.NIF || '—'}</p>
                    <p><strong>Catégorie:</strong> {purchase.category || '—'}</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
