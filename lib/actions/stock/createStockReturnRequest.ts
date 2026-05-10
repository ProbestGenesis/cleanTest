"use server"

import { Prisma } from "@/generated/prisma/client"
import { createNotification } from "@/lib/actions/notifications"
import { isAuthedId } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { stockReturnRequest } from "@/lib/zodschema"
import { revalidatePath } from "next/cache"
import z from "zod"

export const createStockReturnRequest = async (
  value: z.infer<typeof stockReturnRequest>
) => {
  try {
    const parsed = stockReturnRequest.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Données invalides",
      }
    }

    const id = await isAuthedId()
    if (!id) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { worker: { select: { id: true, name: true } } },
    })
    if (!user?.worker) {
      return {
        ok: false,
        message: "Vous n'êtes pas enregistré en tant qu'employé",
      }
    }
    const worker = user.worker

    const superAdmins = await prisma.user.findMany({
      where: { role: "superadmin" },
      select: { id: true },
    })

    let requestedProduct: {
      id: string
      name: string
      ref: string | null
      quantity: number
    } | null = null
    let requestedQuantity = 0

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const validationCode = await tx.validationCode.findFirst({
              where: { type: "STOCK_OUT", code: parsed.data.validationCode },
              include: {
                stockOut: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        ref: true,
                        quantity: true,
                      },
                    },
                  },
                },
              },
            })

            if (!validationCode?.stockOut) {
              throw new Error("Code de validation introuvable")
            }
            if (!validationCode.usedAt) {
              throw new Error(
                "La sortie liée à ce code n'a pas encore été confirmée"
              )
            }

            if (validationCode.stockOut.type !== "STOCK_OUT") {
              throw new Error(
                "Ce code n'est pas lié à une sortie de stock valide"
              )
            }

            if (validationCode.stockOut.status !== "ISVALIDED") {
              throw new Error(
                "La sortie liée à ce code n'a pas encore été validée"
              )
            }

            const commandLabel = `Restitution sortie ${parsed.data.validationCode} (#${validationCode.stockOut.id.slice(0, 8)})`

            const existingReturns = await tx.stockEditHistorique.aggregate({
              where: {
                type: "STOCK_RETURN",
                destination: commandLabel,
                status: {
                  in: [
                    "PENDING_VALIDATION",
                    "AWAITING_CONFIRMATION",
                    "ISVALIDED",
                  ],
                },
              },
              _sum: { quantityToApply: true },
            })

            const alreadyReturned = existingReturns._sum.quantityToApply ?? 0
            const availableToReturn =
              validationCode.stockOut.quantityToApply - alreadyReturned
            if (availableToReturn <= 0) {
              throw new Error(
                "Toute la quantité de cette sortie a déjà été restituée"
              )
            }
            if (parsed.data.quantity > availableToReturn) {
              throw new Error(
                `Quantité trop élevée. Restitution possible restante: ${availableToReturn}.`
              )
            }

            await tx.stockEditHistorique.create({
              data: {
                workerId: worker.id,
                productId: validationCode.stockOut.productId,
                actualQuantity: validationCode.stockOut.product.quantity,
                reservedQuantity:
                  validationCode.stockOut.product.quantity +
                  parsed.data.quantity,
                quantityToApply: parsed.data.quantity,
                type: "STOCK_RETURN",
                reason: parsed.data.reason,
                destination: commandLabel,
                preventfieldValue: {
                  validationCode: parsed.data.validationCode,
                  sourceStockOutId: validationCode.stockOut.id,
                  quantityBeforeEdit: validationCode.stockOut.product.quantity,
                  quantityAfterEdit:
                    validationCode.stockOut.product.quantity +
                    parsed.data.quantity,
                  requestedReturnQuantity: parsed.data.quantity,
                  reason: parsed.data.reason,
                },
              },
            })

            if (superAdmins.length > 0) {
              const superAdminIds = superAdmins.map((admin) => admin.id)
              await createNotification({
                title: "Nouvelle demande de restitution de stock",
                body: `${worker.name} a demandé une restitution de stock (code ${parsed.data.validationCode}) pour ${validationCode.stockOut.product.name}.`,
                type: "STOCK",
                link: "/interne/stock",
                receiverIds: superAdminIds,
              })
            }

            return {
              product: validationCode.stockOut.product,
              quantity: parsed.data.quantity,
            }
          },
          {
            maxWait: 10_000,
            timeout: 20_000,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        )

        requestedProduct = result.product
        requestedQuantity = result.quantity
        break
      } catch (error: unknown) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? (error as { code?: string }).code
            : undefined
        if (code !== "P2034" || attempt === 2) throw error
      }
    }

    if (!requestedProduct || requestedQuantity <= 0) {
      throw new Error(
        "Impossible d'enregistrer la demande pour le moment. Veuillez réessayer."
      )
    }

    revalidatePath("/", "page")
    revalidatePath("/interne/products", "page")
    revalidatePath("/interne/stock", "page")
    revalidatePath("/interne/sales", "page")

    return {
      ok: true,
      message:
        "Demande envoyée. La restitution sera appliquée après validation du super admin et confirmation du chargé de l'inventaire.",
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Une erreur s'est produite"
    console.log(error)
    return { ok: false, message }
  }
}
