'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { confirmStockOutOperation } from '@/lib/actions/stock/confirmStockOutOperation'
import { confirmStockReturnOperation } from '@/lib/actions/stock/confirmStockReturnOperation'
import { confirmSaleOperation } from '@/lib/actions/stock/confirmSaleOperation'
import { confirmPurchaseOperation } from '@/lib/actions/purchase/confirmPurchaseOperation'
import { verifyStockOutValidationCode } from '@/lib/actions/stock/verifyStockOutValidationCode'
import { verifyStockReturnValidationCode } from '@/lib/actions/stock/verifyStockReturnValidationCode'
import { verifySaleValidationCode } from '@/lib/actions/stock/verifySaleValidationCode'
import { verifyPurchaseValidationCode } from '@/lib/actions/purchase/verifyPurchaseValidationCode'
import clsx from 'clsx'
import Link from 'next/link'
import { ReactNode, useMemo, useState, useTransition } from 'react'

type Props = {
  children: ReactNode
  defaultKind?: OperationKind
}

type OperationKind = 'STOCK_OUT' | 'STOCK_RETURN' | 'SALE' | 'PURCHASE'

function StockOutCodeValidationDialog({ children, defaultKind = 'STOCK_OUT' }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string }>({ ok: false, text: '' })
  const [kind, setKind] = useState<OperationKind>(defaultKind)
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState<
    | {
        ok: boolean
        kind: 'STOCK_OUT' | 'STOCK_RETURN'
        productName: string | null
        productRef: string | null
        quantity: number | null
        products?: { name: string; ref: string | null; quantity: number | null }[]
      }
    | {
        ok: boolean
        kind: 'SALE'
        invoiceUrl: string | null
        invoiceNumber: string | null
        buyerName: string | null
        totalTTC: number | null
        products?: { name: string; ref: string | null; quantity: number | null }[]
      }
    | {
        ok: boolean
        kind: 'PURCHASE'
        supplierName: string | null
        productName: string | null
        productRef: string | null
        quantity: number | null
        products?: { name: string; ref: string | null; quantity: number | null }[]
      }
    | null
  >(null)

  const canSubmitCode = useMemo(() => /^\d{6}$/.test(code), [code])

  const resetDialog = () => {
    setMessage({ ok: false, text: '' })
    setCode('')
    setKind(defaultKind)
    setVerified(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) resetDialog()
  }

  const onVerify = () => {
    if (!canSubmitCode) {
      setMessage({ ok: false, text: 'Le code doit contenir 6 chiffres' })
      return
    }

    startTransition(async () => {
      if (kind === 'SALE') {
        const res = await verifySaleValidationCode({ code })
        if (res?.ok && res.data) {
          setMessage({ ok: true, text: res?.message ?? 'Code vérifié avec succès' })
          setVerified({
            ok: true,
            kind: 'SALE',
            invoiceUrl: res.data.finalInvoiceId ? `/interne/invoices/final/${res.data.finalInvoiceId}` : null,
            invoiceNumber: res.data.invoiceNumber ?? null,
            buyerName: res.data.buyerName ?? null,
            totalTTC: res.data.totalTTC ?? null,
            products: res.data.products ?? [],
          })
          return
        }

        setVerified(null)
        setMessage({ ok: false, text: res?.message ?? "Une erreur s'est produite" })
        return
      }

      if (kind === 'PURCHASE') {
        const res = await verifyPurchaseValidationCode({ code })
        if (res?.ok) {
          setMessage({ ok: true, text: res?.message ?? 'Code vérifié avec succès' })
          setVerified({
            ok: true,
            kind: 'PURCHASE',
            supplierName: res.data?.supplierName ?? null,
            productName: res.data?.productName ?? null,
            productRef: res.data?.productRef ?? null,
            quantity: res.data?.quantity ?? null,
            products: res.data?.products ?? [],
          })
          return
        }

        const fallback = await verifyStockOutValidationCode({ code })
        if (fallback?.ok) {
          setKind('STOCK_OUT')
          setMessage({
            ok: true,
            text: "Code vérifié. Le type d'opération a été ajusté automatiquement.",
          })
          setVerified({
            ok: true,
            kind: 'STOCK_OUT',
            productName: fallback?.data?.productName ?? null,
            productRef: fallback?.data?.productRef ?? null,
            quantity: fallback?.data?.quantity ?? null,
            products: fallback?.data?.products ?? [],
          })
          return
        }

        setVerified(null)
        setMessage({
          ok: false,
          text: res?.message ?? fallback?.message ?? "Une erreur s'est produite",
        })
        return
      }

      const primary =
        kind === 'STOCK_OUT'
          ? await verifyStockOutValidationCode({ code })
          : await verifyStockReturnValidationCode({ code })

      if (primary?.ok) {
        setMessage({ ok: true, text: primary?.message ?? 'Code vérifié avec succès' })
        setVerified({
          ok: true,
          kind,
          productName: primary?.data?.productName ?? null,
          productRef: primary?.data?.productRef ?? null,
          quantity: primary?.data?.quantity ?? null,
          products: primary?.data?.products ?? [],
        })
        return
      }

      // Si le type choisi ne correspond pas, on tente l'autre opération et on ajuste le select.
      const fallback =
        kind === 'STOCK_OUT'
          ? await verifyStockReturnValidationCode({ code })
          : await verifyStockOutValidationCode({ code })

      if (fallback?.ok) {
        setKind(kind === 'STOCK_OUT' ? 'STOCK_RETURN' : 'STOCK_OUT')
        setMessage({
          ok: true,
          text: "Code vérifié. Le type d'opération a été ajusté automatiquement.",
        })
        setVerified({
          ok: true,
          kind: kind === 'STOCK_OUT' ? 'STOCK_RETURN' : 'STOCK_OUT',
          productName: fallback?.data?.productName ?? null,
          productRef: fallback?.data?.productRef ?? null,
          quantity: fallback?.data?.quantity ?? null,
          products: fallback?.data?.products ?? [],
        })
        return
      }

      setVerified(null)
      setMessage({
        ok: false,
        text: primary?.message ?? fallback?.message ?? "Une erreur s'est produite",
      })
    })
  }

  const onConfirm = () => {
    if (!canSubmitCode) {
      setMessage({ ok: false, text: 'Le code doit contenir 6 chiffres' })
      return
    }
    if (!verified?.ok) {
      setMessage({ ok: false, text: 'Veuillez d\u2019abord vérifier le code' })
      return
    }

    startTransition(async () => {
      const res =
        kind === 'SALE'
          ? await confirmSaleOperation({ code })
          : kind === 'PURCHASE'
            ? await confirmPurchaseOperation({ code })
          : kind === 'STOCK_OUT'
            ? await confirmStockOutOperation({ code })
            : await confirmStockReturnOperation({ code })
      setMessage({ ok: !!res?.ok, text: res?.message ?? "Une erreur s'est produite" })
      if (res?.ok) {
        setTimeout(() => {
          setOpen(false)
        }, 800)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Validation de code</DialogTitle>
          <DialogDescription>
            Vérifiez le code à 6 chiffres puis confirmez l&apos;opération pour mettre à jour le stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Type d&apos;opération</FieldLabel>
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(v as OperationKind)
                setVerified(null)
                setMessage({ ok: false, text: '' })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="SALE">Vente</SelectItem>
              <SelectItem value="PURCHASE">Achat</SelectItem>
              <SelectItem value="STOCK_OUT">Sortie de stock</SelectItem>
              <SelectItem value="STOCK_RETURN">Restitution de stock</SelectItem>
            </SelectContent>
          </Select>
        </Field>

          <Field>
            <FieldLabel>Code à 6 chiffres</FieldLabel>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                setVerified(null)
                setMessage({ ok: false, text: '' })
              }}
              placeholder="000000"
              inputMode="numeric"
            />
          </Field>

          {verified?.ok && (verified.kind === 'STOCK_OUT' || verified.kind === 'STOCK_RETURN') && (
            <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-3">
              <p className="font-bold text-xs uppercase text-muted-foreground border-b pb-1">Articles de la demande</p>
              {verified.products && verified.products.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {verified.products.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 p-2 rounded bg-background/50 border border-border/50">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.ref && <p className="text-[10px] text-muted-foreground">Réf: {p.ref}</p>}
                      </div>
                      <p className="font-bold whitespace-nowrap">Qté: {p.quantity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2">
                  <p className="font-medium">{verified.productName ?? 'Produit'}</p>
                  <p className="text-muted-foreground">Quantité demandée: {verified.quantity ?? '—'}</p>
                  {verified.productRef ? (
                    <p className="text-muted-foreground">Référence: {verified.productRef}</p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {verified?.ok && verified.kind === 'SALE' && (
            <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-3">
              <div className="space-y-1 border-b pb-2">
                <p className="font-medium">
                  Facture:{' '}
                  {verified.invoiceUrl ? (
                    <Link
                      href={verified.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 text-primary"
                      title="Ouvrir la facture"
                    >
                      {verified.invoiceNumber ?? '—'}
                    </Link>
                  ) : (
                    (verified.invoiceNumber ?? '—')
                  )}
                </p>
                <p className="text-muted-foreground">Client: {verified.buyerName ?? '—'}</p>
                <p className="text-muted-foreground">
                  Total TTC: {verified.totalTTC?.toLocaleString?.('fr-FR') ?? '—'} fcfa
                </p>
              </div>

              <p className="font-bold text-xs uppercase text-muted-foreground">Articles de la facture</p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {verified.products?.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 p-2 rounded bg-background/50 border border-border/50">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.ref && <p className="text-[10px] text-muted-foreground">Réf: {p.ref}</p>}
                    </div>
                    <p className="font-bold whitespace-nowrap">Qté: {p.quantity}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {verified?.ok && verified.kind === 'PURCHASE' && (
            <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-3">
              <div className="border-b pb-2">
                <p className="font-medium">Fournisseur: {verified.supplierName ?? '—'}</p>
              </div>
              <p className="font-bold text-xs uppercase text-muted-foreground">Articles de l&apos;achat</p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {verified.products?.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 p-2 rounded bg-background/50 border border-border/50">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.ref && <p className="text-[10px] text-muted-foreground">Réf: {p.ref}</p>}
                    </div>
                    <p className="font-bold whitespace-nowrap">Qté: {p.quantity}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {message.text && (
          <p className={clsx('text-sm text-center', message.ok ? 'text-green-600' : 'text-destructive')}>
            {message.text}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="rounded-full">
            Annuler
          </Button>
          {!verified?.ok ? (
            <Button
              onClick={onVerify}
              disabled={isPending || !canSubmitCode}
              className="rounded-full"
              variant="secondary"
            >
              {isPending ? <Spinner className="h-4 w-4" /> : 'Vérifier'}
            </Button>
          ) : (
            <Button onClick={onConfirm} disabled={isPending || !canSubmitCode} className="rounded-full">
              {isPending ? <Spinner className="h-4 w-4" /> : 'Confirmer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StockOutCodeValidationDialog
