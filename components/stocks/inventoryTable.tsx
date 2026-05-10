'use client'

import { Product } from '@/generated/prisma/client'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { updateProductQuantityInStock } from '@/lib/actions/stock/updateProductQuantityInStock'
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { Filter, PackagePlus, Pencil, Search, Share } from 'lucide-react'
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
import { useQueryState } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { CACHE_CONFIG } from '@/lib/constants/caching'
import z from 'zod'
//ts-ignore
//import ProductDialog from '../stocks/addProductDialog'
import ProductInfoDialog from './productInfoDialog'
import StockOutDialog from './stockOutDialog'

type Props = {
  fallbackData: StockResponse
  totalProducts: number
  initialCategory?: string
}

export enum TypeDialog {
  update = "update",
  create = "create",
}


export type StockResponse = {
  ok: boolean
  data: Product[]
  categories: string[]
  meta: {
    total: number
    totalPages: number
    page: number
    limit: number
  }
  message?: string
}

export const quantityFormSchema = z.object({
  quantity: z
    .number('Veuillez saisir un nombre valide')
    .nonnegative('Veuillez saisir un nombre positif')
    .min(0),
  reason: z.string().min(1, 'Le motif est obligatoire'),
})

type QuantityFormValues = z.infer<typeof quantityFormSchema>

const stockFetcher = async (url: string): Promise<StockResponse> => {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.message ?? "Une erreur s'est produite")
  }

  return body
}

function QuantityCell({
  item,
  onSave,
  onCancel,
}: {
  item: Product
  onSave: (id: string, quantity: number, reason: string) => Promise<void>
  onCancel: () => void
}) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuantityFormValues>({
    defaultValues: { quantity: item.quantity, reason: '' },
    resolver: zodResolver(quantityFormSchema),
  })

  return (
    <form
      onSubmit={handleSubmit((values) => onSave(item.id, values.quantity, values.reason))}
      className="flex items-center gap-1"
    >
      <Field>
        <FieldContent>
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <Input
                type="number"
                min={0}
                className="w-20 h-7 text-sm"
                aria-invalid={!!errors.quantity}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
                autoFocus
              />
            )}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <Input
                placeholder="Motif..."
                className="w-24 h-7 text-xs ml-1"
                aria-invalid={!!errors.reason}
                {...field}
              />
            )}
          />
        </FieldContent>
      </Field>

      <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={isSubmitting}>
        ✓
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={onCancel}
      >
        ✕
      </Button>
    </form>
  )
}

function InventoryTable({ fallbackData, totalProducts, initialCategory = 'all' }: Props) {
  const { data: session } = authClient.useSession()
  const [page, setPage] = useQueryState('inv_page')
  const [searchInput, setSearchInput] = useQueryState('inv_search')
  const [category, setCategory] = useQueryState('inv_cat')
  const [stockOption] = useQueryState('inv_opt')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('updatedAt')
  const [message, setMessage] = useState({ ok: false, text: '' })
  const [showUpdateProductDialog, setShowUpdateProductDialog] = useState(false)

  const selectedCategory = category ?? initialCategory ?? 'all'
  const normalizedSearch = (searchInput ?? '').trim()
  const currentPage = Math.max(1, Number(page ?? fallbackData.meta.page ?? '1') || 1)
  const canRequestStockChange =
    session?.user?.role === 'superadmin' || session?.user?.role === 'admin'
  const hasMounted = useRef(false)

  const [productToUpdate, setProductToUpdate] = useState<Product | undefined>(undefined)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }

    setPage('1')
  }, [normalizedSearch, selectedCategory, stockOption, setPage])

  const query = useMemo(() => {
    const searchParams = new URLSearchParams({
      page: String(currentPage),
      limit: '25',
    })

    if (normalizedSearch) {
      searchParams.set('search', normalizedSearch)
    }

    if (selectedCategory && selectedCategory !== 'all') {
      searchParams.set('category', selectedCategory)
    }

    if (stockOption) {
      searchParams.set('option', stockOption)
    }

    return searchParams.toString()
  }, [currentPage, normalizedSearch, selectedCategory, stockOption])

  const queryClient = useQueryClient()
  const {
    data: swrData,
    error,
    isLoading,
    isFetching: isValidating,
  } = useQuery<StockResponse>({
    queryKey: ['stock', query],
    queryFn: () => stockFetcher(`/api/stock?${query}`),
    initialData: fallbackData,
    placeholderData: keepPreviousData,
    staleTime: CACHE_CONFIG.STOCK.staleTime,
    gcTime: CACHE_CONFIG.STOCK.gcTime,
  })

  const mutate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['stock'] })
  }

  const currentData = swrData?.data ?? fallbackData.data
  const availableCategories = swrData?.categories ?? fallbackData.categories
  const currentTotalProducts = swrData?.meta?.total ?? fallbackData.meta.total ?? totalProducts
  const totalPage = Math.max(1, Math.ceil(currentTotalProducts / 25))
  const visibleData = useMemo(() => {
    if (!normalizedSearch) {
      return currentData
    }

    const needle = normalizedSearch.toLowerCase()

    return currentData.filter((item) => {
      return [item.name, item.code, item.ref].some((value) =>
        (value ?? '').toLowerCase().includes(needle)
      )
    })
  }, [currentData, normalizedSearch])

  useEffect(() => {
    mutate()
  }, [query, mutate])

  const [stockOutDialog, setStockOutDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  })

  const [showDialog, setDialog] = useState<{ data: Product | undefined; open: boolean }>({
    data: undefined,
    open: false,
  })

  const closeStockOutDialog = () => {
    setStockOutDialog({ open: false, product: null })
  }

  const onClose = () => {
    setDialog({ data: undefined, open: false })
  }

  const handleQuantitySave = async (id: string, quantity: number, reason: string) => {
    try {
      const res = await updateProductQuantityInStock(id, quantity, reason)
      setMessage({ ok: res.ok, text: res.message })
      await mutate()
    } finally {
      setEditingId(null)
    }
  }


  const sortedData = [...visibleData].sort((a, b) => {
    if (sortBy === 'updatedAt') {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return dateB - dateA
    }
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '')
    }
    if (sortBy === 'category') {
      return (a.category || '').localeCompare(b.category || '')
    }
    return 0
  })

  const visiblePages = Array.from(
    new Set([1, 2, 3, currentPage, totalPage].filter((value) => value >= 1 && value <= totalPage))
  ).sort((a, b) => a - b)

  const isInitialLoading = isLoading && currentData.length === 0
  const isTableLoading = isInitialLoading
  // Lors d'un changement de catégorie/filtre, isValidating est true mais
  // keepPreviousData garde les anciennes données → on signale visuellement
  const isRevalidating = isValidating && !isInitialLoading

  return (
    <div className="flex flex-col space-y-6">
      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center">
          <Spinner className="size-22" />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  className="h-10 pl-9 pr-4 w-full rounded-full bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-accent"
                  value={searchInput ?? ''}
                  onChange={(e) => setSearchInput(e.target.value || null)}
                />
              </div>

              {/* Mobile Filter Button */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle>Filtres</SheetTitle>
                      <SheetDescription>
                        Affinez la liste des produits selon vos besoins.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Catégorie</label>
                        <Select
                          value={selectedCategory}
                          onValueChange={(value) => setCategory(value === 'all' ? null : value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Toutes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les catégories</SelectItem>
                            {availableCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Trier par</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Aucun" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="updatedAt">Plus récents</SelectItem>
                            <SelectItem value="name">Nom</SelectItem>
                            <SelectItem value="category">Catégorie</SelectItem>
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
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Catégorie:</span>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setCategory(value === 'all' ? null : value)}
                >
                  <SelectTrigger className="w-[180px] h-9 rounded-full bg-muted/20 border-none">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trier:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px] h-9 rounded-full bg-muted/20 border-none">
                    <SelectValue placeholder="Défaut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt">Récents</SelectItem>
                    <SelectItem value="name">Nom</SelectItem>
                    <SelectItem value="category">Catégorie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error?.message ? <p className="mb-4 text-sm text-destructive">{error.message}</p> : null}

          {!message.ok && message.text ? (
            <p className="mb-4 text-sm text-destructive">{message.text}</p>
          ) : null}

          <table className={clsx("w-full text-sm overflow-hidden transition-opacity", { "opacity-50 pointer-events-none": isRevalidating })}>
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Code produit </th>
                <th className="text-left p-2">Produit</th>
                <th className="text-left p-2">Catégorie</th>
                <th className="text-center p-2">Quantité</th>
                <th className="text-center p-2">Unité</th>
                <th className="text-center p-2">Prix</th>
                <th className="text-center p-2">Statut</th>
                <th className="text-center p-2 w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isTableLoading ? (
                <tr>
                  <td colSpan={8} className="py-16">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="h-16 w-16" />
                      
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    {normalizedSearch ? "Aucun produit ne correspond à votre recherche." : "Aucun produit trouvé."}
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    if (editingId !== item.id) setDialog({ data: item, open: true })
                  }}
                >
                  <td className="p-2"> {item.code ?? '----'} </td>
                  <td className="p-2 w-md capitalize">{item.name ?? '----'}</td>
                  <td className="p-2 capitalize">{item.category ?? '----'}</td>
                  <td className="p-2 text-center min-w-10">
                    {editingId === item.id ? (
                      <QuantityCell
                        item={item}
                        onSave={handleQuantitySave}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        {item.quantity <= item.threshold ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <span
                                className={clsx('min-w-10 text-accent font-medium', {
                                  'hover:underline hover:text-primary cursor-text':
                                    canRequestStockChange,
                                  'text-destructive': item.quantity <= item.threshold,
                                })}
                                onClick={(e) => {
                                  if (!canRequestStockChange) return
                                  e.stopPropagation()
                                  setEditingId(item.id)
                                }}
                                title={
                                  canRequestStockChange
                                    ? 'Cliquer pour demander une modification'
                                    : undefined
                                }
                              >
                                {item.quantity}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>En rouge si quantite en dessous du sueil</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span
                            className={clsx('min-w-10 text-accent font-medium', {
                              'hover:underline hover:text-primary cursor-text':
                                canRequestStockChange,
                              'text-destructive': item.quantity <= item.threshold,
                            })}
                            onClick={(e) => {
                              if (!canRequestStockChange) return
                              e.stopPropagation()
                              setEditingId(item.id)
                            }}
                            title={
                              canRequestStockChange
                                ? 'Cliquer pour demander une modification'
                                : undefined
                            }
                          >
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="text-center">{item.unity}</td>

                  <td className="p-2 text-center">
                    {item.sellingPrice ? item.sellingPrice : `----`} fcfa
                  </td>

                  <td className="p-2 text-center">
                    <span
                      className={clsx('px-2   py-1 rounded text-xs font-semibold', {
                        'bg-green-100 text-green-800': item.status === 'IN_STOCK',
                        'bg-red-100 text-red-800': item.status === 'OUT_OF_STOCK',
                        'bg-orange-100 text-orange-500': item.quantity < item.threshold,
                      })}
                    >
                      {item.status === 'IN_STOCK' ? 'En Stock' : 'Rupture'}
                    </span>
                  </td>

                  <td className="p-2 gap-0.5 w-[80px] flex items-center justify-center text-center">
                    <Button
                      size={'icon-xs'}
                      className="rounded-full mx-0.5"
                      variant={'outline'}
                      onClick={(e) => {
                        e.stopPropagation()
                        setStockOutDialog({ open: true, product: item })
                      }}
                    >
                      <Share />
                    </Button>

                    <Button
                      size={'icon-xs'}
                      className="rounded-full mx-0.5"
                      variant={'outline'}
                      disabled={!canRequestStockChange}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!canRequestStockChange) return
                        setEditingId(item.id)
                      }}
                    >
                      <PackagePlus />
                    </Button>

                    <Button
                      size={'icon-xs'}
                      className="rounded-full mx-0.5"
                      variant={'outline'}
                      disabled={!canRequestStockChange}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!canRequestStockChange) return
                        setShowUpdateProductDialog(true)
                        setProductToUpdate(item)
                      }}
                    >
                      <Pencil />
                    </Button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>

          {stockOutDialog.open && stockOutDialog.product && (
            <StockOutDialog
              isOpen={stockOutDialog.open}
              product={stockOutDialog.product}
              onClose={closeStockOutDialog}
            />
          )}

          {/*showUpdateProductDialog && productToUpdate && (
            <ProductDialog
              isOpen={showUpdateProductDialog}
              onClose={() => {
                setShowUpdateProductDialog(false)
                setProductToUpdate(undefined)
              }}
              data={productToUpdate}
              mutate={mutate}
              type={TypeDialog.update}
            />
          )*/}
        </div>
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault()
                setPage(String(Math.max(1, currentPage - 1)))
              }}
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
                setPage(String(Math.min(totalPage, currentPage + 1)))
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {showDialog.open && <ProductInfoDialog showDialog={showDialog} onClose={onClose} />}
    </div>
  )
}

export default InventoryTable
