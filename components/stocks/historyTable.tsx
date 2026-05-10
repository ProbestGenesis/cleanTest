'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { StockEditType } from '@/generated/prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { StockHistoryResponse } from '@/lib/actions/stock/query/historyQuery'
import { validateStockEdit } from '@/lib/actions/stock/validateStockEdit'
import clsx from 'clsx'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Filter,
  History,
  LetterText,
  Package,
  Truck,
  User,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'

type Props = {
  fallbackData: StockHistoryResponse
  validationFilter?: 'all' | 'validated' | 'not_validated'
  onlySales?: boolean
}

type DialogState = {
  id: string
  open: boolean
  type: 'approuve' | 'disapprouve' | ''
  item: any | null
}

type AvailabilityRow = {
  productId: string
  stock: number
  reserved: number
  available: number
}

const historyFetcher = async (url: string): Promise<StockHistoryResponse> => {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.message ?? "Une erreur s'est produite")
  }

  return body
}

const HistoryTabs = ({ fallbackData, validationFilter = 'all', onlySales = false }: Props) => {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [page, setPage] = useQueryState('his_page')
  const [validation, setValidation] = useQueryState('his_val')
  const [opType, setOpType] = useQueryState('his_type')

  const currentPage = Math.max(1, Number(page ?? '1') || 1)
  const currentValidation = useMemo(() => {
    const allowed = new Set(['all', 'validated', 'not_validated'])
    if (validation && allowed.has(validation)) {
      return validation as 'all' | 'validated' | 'not_validated'
    }
    return validationFilter ?? 'all'
  }, [validation, validationFilter])
  const currentOpType = useMemo(() => {
    const allowed = new Set([
      'all',
      'PURCHASE',
      'ADD',
      'STOCK_OUT',
      'STOCK_RETURN',
      'SET_QUANTITY',
      'SELL',
      'SET_NAME',
      'SET_DESCRIPTION',
      'SET_IMAGES',
    ])
    if (opType && allowed.has(opType)) {
      return opType as StockEditType | 'all'
    }
    return 'all'
  }, [opType])

  const query = useMemo(() => {
    const searchParams = new URLSearchParams({
      page: String(currentPage),
      limit: '25',
      validation: currentValidation,
      type: currentOpType,
      onlySales: String(onlySales),
    })
    return searchParams.toString()
  }, [currentPage, currentValidation, currentOpType, onlySales])

  const queryClient = useQueryClient()
  const {
    data: swrData,
    isLoading,
    isFetching: isValidating,
  } = useQuery<StockHistoryResponse>({
    queryKey: ['stock-history', query],
    queryFn: () => historyFetcher(`/api/stock/history?${query}`),
    initialData: fallbackData,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })

  const mutate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['stock-history'] })
  }

  const currentData = swrData?.data ?? fallbackData.data
  const meta = swrData?.meta ?? fallbackData.meta
  const totalPage = meta.totalPages

  useEffect(() => {
    mutate()
  }, [query, mutate])

  const [approuveDialog, setApprouveDialog] = useState<DialogState>({
    id: '',
    open: false,
    type: '',
    item: null,
  })
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; item: any | null }>({
    open: false,
    item: null,
  })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string }>({ ok: false, text: '' })
  const [availabilityByProductId, setAvailabilityByProductId] = useState<
    Record<string, AvailabilityRow>
  >({})

  const close = () => {
    setApprouveDialog({ id: '', open: false, type: '', item: null })
    setMessage({ ok: false, text: '' })
  }

  const historyTypeTrad = (item: string) => {
    switch (item) {
      case 'PURCHASE':
        return 'Achat'
      case 'SELL':
        return 'Vente'
      case 'STOCK_OUT':
        return 'Sortie hors vente'
      case 'STOCK_RETURN':
        return 'Restitution'
      case 'ADD':
        return 'Ajout'
      case 'SET_QUANTITY':
        return 'Modification de quantité'
      case 'SET_NAME':
        return 'Modif. Nom'
      case 'SET_DESCRIPTION':
        return 'Modif. Description'
      case 'SET_IMAGES':
        return 'Modif. Images'
      default:
        return item
    }
  }

  const getQuantityLabel = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'Quantité achetée'
      case 'SELL':
        return 'Quantité vendue'
      case 'STOCK_OUT':
        return 'Quantité sortie'
      case 'ADD':
        return 'Quantité ajoutée'
      case 'STOCK_RETURN':
        return 'Quantité restituée'
      case 'SET_QUANTITY':
        return 'Nouvelle quantité'
      default:
        return 'Quantité'
    }
  }

  const historyValidationStatus = (
    status: 'ISVALIDED' | 'ISREJECTED' | 'PENDING_VALIDATION' | 'AWAITING_CONFIRMATION'
  ) => {
    switch (status) {
      case 'PENDING_VALIDATION':
        return (
          <Badge  className="font-normal bg-orange-600">
            En attente
          </Badge>
        )
      case 'AWAITING_CONFIRMATION':
        return (
          <Badge variant="outline" className="font-normal">
            En attente confirmation
          </Badge>
        )
      case 'ISVALIDED':
        return (
          <Badge className="font-normal bg-green-600">
            Validé
          </Badge>
        )
      case 'ISREJECTED':
        return (
          <Badge variant="destructive" className="font-normal">
            Refusé
          </Badge>
        )
      default:
        return null
    }
  }

  const handleValidate = (action: 'approuve' | 'disapprouve') => {
    if (!approuveDialog.id) return

    startTransition(async () => {
      const res = await validateStockEdit(approuveDialog.id, action)
      setMessage({ ok: res.ok, text: res.message })

      if (res.ok) {
        await mutate()
        close()
      }
    })
  }

  const handleValidationChange = (value: 'all' | 'validated' | 'not_validated') => {
    setValidation(value)
    setPage('1')
  }

  const handleTypeChange = (value: string) => {
    setOpType(value)
    setPage('1')
  }

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
    return null
  }

  const getOperationSummary = (item: any) => {
    const before =
      toNumber(item.preventfieldValue?.quantityBeforeEdit) ??
      toNumber(item.actualQuantity) ??
      toNumber(item.currentfieldValue?.quantityBefore)
    const requested = toNumber(item.quantityToApply)
    const afterFromHistory =
      toNumber(item.preventfieldValue?.quantityAfterEdit) ??
      toNumber(item.currentfieldValue?.quantityAfter)

    if (item.type === 'SET_QUANTITY') {
      const after = afterFromHistory ?? requested
      return { label: 'Modification de quantité', before, after }
    }

    if (before === null) {
      return { label: 'Détail quantité', before, after: null }
    }

    if (item.type === 'ADD' || item.type === 'STOCK_RETURN') {
      const after = afterFromHistory ?? (requested !== null ? before + requested : null)
      return {
        label: item.type === 'STOCK_RETURN' ? 'Restitution de stock' : 'Ajout de stock',
        before,
        after,
      }
    }

    if (item.type === 'PURCHASE') {
      const after = afterFromHistory ?? (requested !== null ? before + requested : null)
      return { label: 'Entrée de stock', before, after }
    }

    if (item.type === 'SELL' || item.type === 'STOCK_OUT') {
      const after = afterFromHistory ?? (requested !== null ? before - requested : null)
      return { label: 'Sortie de stock', before, after }
    }

    return { label: 'Détail quantité', before, after: afterFromHistory ?? requested }
  }

  const visiblePages = Array.from(
    new Set([1, 2, 3, currentPage, totalPage].filter((value) => value >= 1 && value <= totalPage))
  ).sort((a, b) => a - b)

  const displayedData = useMemo(() => {
    return currentData.filter((item: any) => {
      const validationMatch =
        currentValidation === 'all'
          ? true
          : currentValidation === 'validated'
            ? item.status === 'ISVALIDED'
            : item.status === 'PENDING_VALIDATION' ||
              item.status === 'AWAITING_CONFIRMATION' ||
              item.status === 'ISREJECTED'

      const typeMatch = currentOpType === 'all' ? true : item.type === currentOpType

      return validationMatch && typeMatch
    })
  }, [currentData, currentValidation, currentOpType])
  const isTableLoading = isLoading || isValidating

  const relatedItemsForDialog = useMemo(() => {
    if (!approuveDialog.item) return []
    const requestId = approuveDialog.item.requestId
    if (!requestId) return [approuveDialog.item]

    return currentData.filter(
      (i: any) => i.requestId === requestId && i.status === 'PENDING_VALIDATION'
    )
  }, [approuveDialog.item, currentData])

  useEffect(() => {
    const productIds = Array.from(
      new Set(
        displayedData
          .map((item: any) => item?.productId ?? item?.product?.id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
      )
    )
    if (productIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailabilityByProductId({})
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/stock/availability?ids=${encodeURIComponent(productIds.join(','))}`
        )
        if (!res.ok) return
        const payload = await res.json()
        const map: Record<string, AvailabilityRow> = {}
        for (const row of (payload?.data ?? []) as AvailabilityRow[]) {
          if (row?.productId) map[row.productId] = row
        }
        if (!cancelled) setAvailabilityByProductId(map)
      } catch {
        // ignore network errors for this optional UI hint
      }
    })()

    return () => {
      cancelled = true
    }
  }, [displayedData])

  const getDynamicAvailableAfterConfirm = (item: any): number | null => {
    const status = item?.status as string | undefined
    const type = item?.type as string | undefined
    if (status !== 'PENDING_VALIDATION' && status !== 'AWAITING_CONFIRMATION') return null

    // This hint is meaningful only for operations that will debit stock.
    if (!['SELL', 'STOCK_OUT'].includes(type ?? '')) return null

    const productId = (item?.productId ?? item?.product?.id) as string | undefined
    if (!productId) return null

    const availability = availabilityByProductId[productId]
    if (!availability) return null

    const qty = toNumber(item?.quantityToApply) ?? 0
    const reservedOthers = Math.max(0, (availability.reserved ?? 0) - qty)
    const projected = Math.max(0, (availability.stock ?? 0) - qty - reservedOthers)
    return projected
  }

  return (
    <div className="w-full mt-4 flex flex-col space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-row items-center justify-between w-full bg-muted/20 p-3 rounded-full gap-4">
        <div className="flex items-center gap-3 ml-2">
          <History className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-sm hidden sm:block">Historique d&apos;activité</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <Filter className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filtres d'historique</SheetTitle>
                  <SheetDescription>
                    Sélectionnez le type d'opération et le statut de validation.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Type d'opération</label>
                    <Select value={currentOpType} onValueChange={handleTypeChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Opération" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les opérations</SelectItem>
                        <SelectItem value="PURCHASE">Achats</SelectItem>
                        <SelectItem value="SELL">Ventes</SelectItem>
                        <SelectItem value="ADD">Ajouts</SelectItem>
                        <SelectItem value="STOCK_OUT">Sorties</SelectItem>
                        <SelectItem value="STOCK_RETURN">Restitutions</SelectItem>
                        <SelectItem value="SET_QUANTITY">Modif. Quantité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Statut de validation</label>
                    <Select value={currentValidation} onValueChange={handleValidationChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Validation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="validated">Validés uniquement</SelectItem>
                        <SelectItem value="not_validated">En attente ou Refusés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button className="w-full rounded-full">Appliquer</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Filters */}
          <div className="hidden sm:flex items-center gap-3">
            <Select value={currentOpType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[160px] h-9 rounded-full bg-background border-none shadow-sm">
                <SelectValue placeholder="Opération" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes opérations</SelectItem>
                <SelectItem value="PURCHASE">Achats</SelectItem>
                <SelectItem value="SELL">Ventes</SelectItem>
                <SelectItem value="ADD">Ajouts</SelectItem>
                <SelectItem value="STOCK_OUT">Sorties</SelectItem>
                <SelectItem value="STOCK_RETURN">Restitutions</SelectItem>
                <SelectItem value="SET_QUANTITY">Modif. Qte</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currentValidation} onValueChange={handleValidationChange}>
              <SelectTrigger className="w-[160px] h-9 rounded-full bg-background border-none shadow-sm">
                <SelectValue placeholder="Validation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="not_validated">Attente/Refus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full relative min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="border-b">
              <tr>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Auteur
                </th>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Date
                </th>

                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Produit
                </th>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  QTE actuelle
                </th>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Type
                </th>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Client/Objet/Fournisseur
                </th>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Détails
                </th>
                <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                  Statut
                </th>
                {session?.user.role === 'superadmin' && (
                  <th className="p-2 text-xs font-bold uppercase tracking-wider text-muted-foreground text-left">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {isTableLoading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="h-16 w-16" />
                    </div>
                  </td>
                </tr>
              ) : displayedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Package className="h-12 w-12" />
                      <p className="text-sm font-medium">
                        Aucun résultat trouvé pour cette sélection.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedData.map((item: any) => (
                  <tr
                    key={item.id}
                    onClick={() => setDetailDialog({ open: true, item })}
                    className={clsx(
                      'border-b transition-colors hover:bg-muted/50 group cursor-pointer',
                      {
                        'bg-destructive/5': item.status === 'ISREJECTED',
                        'bg-warning/5': item.status === 'PENDING_VALIDATION',
                        'bg-primary/5': item.status === 'AWAITING_CONFIRMATION',
                        'bg-success/5': item.status === 'ISVALIDED',
                      }
                    )}
                  >
                    <td className="p-2 text-left">
                      <div className="font-semibold text-sm">{item.worker.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        {item.worker.role}
                      </div>
                    </td>

                    <td className="p-2 text-left">
                      <div className="text-sm font-medium">
                        {new Date(item.createAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(item.createAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="p-2 text-left max-w-[150px]">
                      <div className="font-bold text-sm text-primary/80">{item.product.name}</div>
                      {item.product.code && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 font-bold px-1.5 opacity-70"
                        >
                          {item.product.code}
                        </Badge>
                      )}
                    </td>

                    <td className="p-2 text-accent text-sm font-medium text-center">
                      {item.product.quantity}
                    </td>

                    <td className="p-2 text-left">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="text-xs font-semibold px-1 py-0.5 bg-muted rounded-md border text-muted-foreground whitespace-nowrap">
                            {historyTypeTrad(item.type)}
                          </span>
                        </div>
                        {item.reason && (
                          <div className="text-[10px] text-muted-foreground line-clamp-2" title={item.reason}>
                            <span className="font-semibold">Motif:</span> {item.reason}
                          </div>
                        )}
                        {item.validityTime !== null && item.validityTime !== undefined && (
                          <div className="text-[10px] text-muted-foreground">
                            <span className="font-semibold">Temps erroné:</span> {item.validityTime} min
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-2 text-xs font-medium text-left">
                      {item.type === 'PURCHASE' ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Fournisseur
                          </span>
                          <div className="flex items-center gap-2">
                            <span>
                              {item.purchase?.providerRel?.name ??
                                item.purchase?.provider ??
                                item.provider ??
                                item.preventfieldValue?.providerName ??
                                '—'}
                            </span>
                            {item.purchase?.images?.[0] ? (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="h-6 px-2 text-[10px] rounded-full"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const url = item.purchase?.images?.[0]
                                  if (!url) return
                                  window.open(url, '_blank', 'noreferrer')
                                }}
                              >
                                Facture
                              </Button>
                            ) : item.purchase?.invoiceNumber ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-4 font-bold px-1.5 opacity-70"
                              >
                                {item.purchase.invoiceNumber}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      ) : item.type === 'SELL' ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Client
                          </span>
                          <div className="flex items-center gap-2">
                            <span>
                              {item.sale?.client?.name ??
                                item.sale?.clientName ??
                                item.client ??
                                item.preventfieldValue?.clientName ??
                                '—'}
                            </span>
                            {(item.sale?.finalInvoiceId ?? item.sale?.proformaInvoiceId) ? (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="h-6 px-2 text-[10px] rounded-full"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const isFinal = Boolean(item.sale?.finalInvoiceId)
                                  const id =
                                    item.sale?.finalInvoiceId ?? item.sale?.proformaInvoiceId
                                  if (!id) return
                                  router.push(
                                    isFinal
                                      ? `/interne/invoices/final/${id}`
                                      : `/interne/invoices/proforma/${id}`
                                  )
                                }}
                              >
                                {item.sale?.finalInvoiceId ? 'Facture' : 'Pro forma'}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : item.type === 'STOCK_OUT' || item.type === 'STOCK_RETURN' ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Demandeur
                          </span>
                          <span className="line-clamp-1">{item.destination ?? '—'}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="p-2 text-left">
                      <div className="flex flex-col gap-0.5 items-start justify-start">
                        <div className="text-xs flex gap-1.5 text-left">
                          <span className="text-muted-foreground text-sm uppercase text-left">
                            {getQuantityLabel(item.type).split(' ')[0]}
                          </span>{' '}
                          <span className="font-black text-sm text-accent">
                            {item.quantityToApply}
                          </span>
                        </div>
                        {(item.status === 'PENDING_VALIDATION' ||
                          item.status === 'AWAITING_CONFIRMATION') &&
                          getDynamicAvailableAfterConfirm(item) !== null && (
                            <div className="text-[10px] font-medium text-muted-foreground text-left">
                              Disponible après confirmation: {getDynamicAvailableAfterConfirm(item)}
                            </div>
                          )}
                        {item.preventfieldValue?.totalPrice &&
                          item.preventfieldValue?.totalPrice > 0 && (
                            <div className="text-[10px] font-bold text-primary/70 text-left">
                              {item.preventfieldValue.totalPrice.toLocaleString()} fcfa
                            </div>
                          )}
                      </div>
                    </td>

                    <td className="p-2 text-left">{historyValidationStatus(item.status)}</td>

                    {session?.user.role === 'superadmin' && (
                      <td className="p-2">
                        {item.status === 'PENDING_VALIDATION' && (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size={'icon-xs'}
                              className="rounded-full bg-success  hover:bg-success/90 shadow-sm transition-transform active:scale-95"
                              onClick={(e) => {
                                e.stopPropagation()
                                setApprouveDialog({
                                  id: item.id,
                                  open: true,
                                  type: 'approuve',
                                  item,
                                })
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size={'icon-xs'}
                              variant={'destructive'}
                              className="rounded-full shadow-sm transition-transform active:scale-95"
                              onClick={(e) => {
                                e.stopPropagation()
                                setApprouveDialog({
                                  id: item.id,
                                  open: true,
                                  type: 'disapprouve',
                                  item,
                                })
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Container */}
      <div className="flex items-center justify-center py-2">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage > 1) setPage(String(currentPage - 1))
                }}
                className={clsx(currentPage <= 1 && 'pointer-events-none opacity-40')}
              />
            </PaginationItem>

            {visiblePages.map((pageNumber, index) => {
              const previousPage = visiblePages[index - 1]
              const showEllipsis = previousPage && pageNumber - previousPage > 1

              return (
                <PaginationItem key={pageNumber}>
                  {showEllipsis ? <PaginationEllipsis /> : null}
                  <PaginationLink
                    onClick={(e) => {
                      e.preventDefault()
                      setPage(String(pageNumber))
                    }}
                    isActive={currentPage === pageNumber}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPage) setPage(String(currentPage + 1))
                }}
                className={clsx(currentPage >= totalPage && 'pointer-events-none opacity-40')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Reused Dialogs from previous implementation with slight UI polish */}
      {approuveDialog.open && approuveDialog.item && (
        <Dialog open={approuveDialog.open} onOpenChange={close}>
          <DialogContent className="sm:max-w-[550px] p-0 rounded-lg shadow-lg border">
            {/* Header */}
            <div className="flex flex-col space-y-1.5 px-6 py-5 border-b">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-md border',
                    approuveDialog.type === 'approuve'
                      ? 'bg-success/10 border-success/20 text-success'
                      : 'bg-destructive/10 border-destructive/20 text-destructive'
                  )}
                >
                  {approuveDialog.type === 'approuve' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {approuveDialog.type === 'approuve'
                      ? "Validation de l'opération"
                      : "Refus de l'opération"}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-sm mt-2 pl-12">
                {approuveDialog.type === 'approuve'
                  ? "Veuillez confirmer l'approbation de cette modification de stock. Cette action mettra à jour l'inventaire."
                  : 'Le refus annulera cette demande de modification. Cette action est irréversible.'}
              </DialogDescription>
            </div>

            <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
              {relatedItemsForDialog.length > 1 && (
                <div className="bg-muted/50 p-3 rounded-md border border-border flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Demande groupée ({relatedItemsForDialog.length} articles)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      L'action s'appliquera à tous les articles listés ci-dessous.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {relatedItemsForDialog.map((dialogItem: any) => {
                  const summary = getOperationSummary(dialogItem)
                  const variation =
                    summary.before !== null && summary.after !== null
                      ? (summary.after as number) - (summary.before as number)
                      : null

                  return (
                    <div key={dialogItem.id} className="border rounded-md overflow-hidden">
                      <div className="bg-muted/30 px-4 py-3 border-b flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold">{dialogItem.product.name}</p>
                          {dialogItem.product.code && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Réf: {dialogItem.product.code}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs font-normal">
                          {historyTypeTrad(dialogItem.type)}
                        </Badge>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-4 divide-x">
                        <div className="text-center px-2">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                            Avant
                          </p>
                          <p className="text-lg font-semibold">{summary.before ?? '—'}</p>
                        </div>
                        <div className="text-center px-2">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                            Après
                          </p>
                          <p className="text-lg font-semibold">{summary.after ?? '—'}</p>
                        </div>
                        <div className="text-center px-2">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                            Variation
                          </p>
                          <p
                            className={clsx(
                              'text-lg font-semibold',
                              variation && variation > 0
                                ? 'text-success'
                                : variation && variation < 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {variation === null ? '—' : `${variation > 0 ? '+' : ''}${variation}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-muted/30 rounded-md border p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Opérateur</p>
                  <p className="font-medium">{approuveDialog.item.worker.name}</p>
                  <p className="text-xs text-muted-foreground">{approuveDialog.item.worker.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">
                    {new Date(approuveDialog.item.createAt).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(approuveDialog.item.createAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {approuveDialog.item.type !== 'ADD' && (
                  <div className="col-span-2 pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Client/Objet</p>
                    <p className="font-medium">
                      {approuveDialog.item.destination ??
                        approuveDialog.item.client ??
                        'Non spécifié'}
                    </p>
                  </div>
                )}
                {(approuveDialog.item.type === 'STOCK_OUT' ||
                  approuveDialog.item.type === 'SELL' ||
                  approuveDialog.item.type === 'STOCK_RETURN') && (
                  <div className="col-span-2 pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      {approuveDialog.item.type === 'STOCK_RETURN'
                        ? 'Raison de la restitution'
                        : 'Raison de la sortie'}
                    </p>
                    <p className="text-sm">
                      {approuveDialog.item.reason ??
                        approuveDialog.item.preventfieldValue?.reason ??
                        'Aucune raison documentée.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/10 flex sm:justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={isPending}>
                Annuler
              </Button>
              <Button
                variant={approuveDialog.type === 'approuve' ? 'default' : 'destructive'}
                onClick={() =>
                  handleValidate(approuveDialog.type === 'approuve' ? 'approuve' : 'disapprouve')
                }
                disabled={isPending}
                className="min-w-[120px]"
              >
                {isPending ? <Spinner className="h-4 w-4 mr-2" /> : null}
                {approuveDialog.type === 'approuve' ? 'Confirmer' : 'Refuser'}
              </Button>
            </DialogFooter>

            {message.text && (
              <div
                className={clsx(
                  'px-6 py-3 text-sm font-medium text-center',
                  message.ok
                    ? 'bg-success/10 text-success border-t border-success/20'
                    : 'bg-destructive/10 text-destructive border-t border-destructive/20'
                )}
              >
                {message.text}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {detailDialog.open && detailDialog.item && (
        <Dialog
          open={detailDialog.open}
          onOpenChange={() => setDetailDialog({ open: false, item: null })}
        >
          <DialogContent className="sm:max-w-[550px] p-0 rounded-lg shadow-lg border">
            {/* Header */}
            <div className="flex flex-col space-y-1.5 px-6 py-5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                      Détails de l'opération
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{(detailDialog.item.id as string).substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="font-normal text-xs bg-muted/20">
                  {historyTypeTrad(detailDialog.item.type)}
                </Badge>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Product Info */}
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 flex items-start gap-4">
                  <div className="h-10 w-10 bg-background rounded-md border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wider">
                      Produit
                    </p>
                    <p className="text-base font-semibold">{detailDialog.item.product.name}</p>
                    {detailDialog.item.product.code && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 w-fit px-1.5 py-0.5 rounded">
                        {detailDialog.item.product.code}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quantity Grid */}
                <div className="border-t grid grid-cols-3 divide-x bg-background">
                  {(() => {
                    const summary = getOperationSummary(detailDialog.item)
                    const variation =
                      summary.before !== null && summary.after !== null
                        ? (summary.after as number) - (summary.before as number)
                        : null
                    return (
                      <>
                        <div className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                            Avant
                          </p>
                          <p className="text-lg font-semibold">{summary.before ?? '—'}</p>
                        </div>
                        <div className="p-4 text-center bg-muted/10">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                            Après
                          </p>
                          <p className="text-lg font-semibold">{summary.after ?? '—'}</p>
                        </div>
                        <div className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                            Variation
                          </p>
                          <p
                            className={clsx(
                              'text-lg font-semibold',
                              variation && variation > 0
                                ? 'text-success'
                                : variation && variation < 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {variation === null ? '—' : `${variation > 0 ? '+' : ''}${variation}`}
                          </p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Meta Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3.5 bg-muted/10 flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Opérateur</p>
                    <p className="text-sm font-medium">{detailDialog.item.worker.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {detailDialog.item.worker.role}
                    </p>
                  </div>
                </div>

                <div className="border rounded-md p-3.5 bg-muted/10 flex items-start gap-3">
                  <History className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Horodatage</p>
                    <p className="text-sm font-medium">
                      {new Date(detailDialog.item.createAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(detailDialog.item.createAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Extra Details */}
              {(detailDialog.item.destination ||
                detailDialog.item.preventfieldValue?.destination ||
                detailDialog.item.reason ||
                detailDialog.item.preventfieldValue?.reason) && (
                <div className="border rounded-md p-4 bg-muted/10 space-y-4">
                  {(detailDialog.item.destination ||
                    detailDialog.item.preventfieldValue?.destination) && (
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">
                          Destination / Client
                        </span>
                      </div>
                      <p className="text-sm font-medium pl-6">
                        {detailDialog.item.destination ??
                          detailDialog.item.preventfieldValue?.destination}
                      </p>
                    </div>
                  )}

                  {(detailDialog.item.reason || detailDialog.item.preventfieldValue?.reason) && (
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                        <LetterText className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">
                          Note / Motif
                        </span>
                      </div>
                      <p className="text-sm pl-6 text-foreground/80 whitespace-pre-wrap">
                        {detailDialog.item.reason ?? detailDialog.item.preventfieldValue?.reason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/10">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setDetailDialog({ open: false, item: null })}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default HistoryTabs
