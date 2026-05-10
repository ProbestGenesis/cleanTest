'use client'

import React, { useState } from 'react'
import { usePurchases } from '@/lib/hooks/usePurchases'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PurchaseList({ onSelect }: { onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1)
  const limit = 10
  const { data, isLoading } = usePurchases({ page, limit })

  if (isLoading) {
    return (
      <div className="space-y-2 border rounded-xl p-4 bg-card">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const totalPages = data?.pages || 1

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Fournisseur</TableHead>
              <TableHead className="font-bold">Désignation</TableHead>
              <TableHead className="font-bold text-right">Total</TableHead>
              <TableHead className="font-bold">Statut</TableHead>
              <TableHead className="font-bold">Paiement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.purchases?.length > 0 ? (
              data.purchases.map((purchase: any) => (
                <TableRow key={purchase.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    {format(new Date(purchase.purchaseDate), 'PP', { locale: fr })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {purchase.provider?.name || purchase.category || 'Inconnu'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                      {purchase.designation || purchase.purchaseItems?.[0]?.productName || '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {purchase.totalAmount.toLocaleString()} XOF
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      purchase.status === 'CONFIRMED' ? 'default' :
                      purchase.status === 'DELIVERED' ? 'secondary' : 'outline'
                    } className="capitalize">
                      {purchase.status === 'CONFIRMED' ? 'Confirmé' :
                       purchase.status === 'DELIVERED' ? 'Livré' : purchase.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={purchase.isPaid ? 'default' : 'destructive'} className="font-bold">
                      {purchase.isPaid ? 'PAYÉ' : 'À PAYER'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onSelect(purchase.id)} className="rounded-full">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aucun achat enregistré pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full"
              >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
              </Button>
              <span className="text-sm font-medium">Page {page} sur {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full"
              >
                  Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
          </div>
      )}
    </div>
  )
}
