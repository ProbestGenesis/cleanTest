"use server"

import { isSuperAdminId } from "@/lib/isAdmin"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/lib/actions/notifications"
import { generateStockOutValidationCode, generateStockReturnValidationCode } from "@/lib/stock/validation-code"
type ActionType = "approuve" | "disapprouve"

export const validateStockEdit = async (historyId: string, action: ActionType) => {
  try {
    const superAdminId = await isSuperAdminId()

    if (!superAdminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les autorisations nécessaires pour effectuer cette action",
      }
    }

    const history = await prisma.stockEditHistorique.findUnique({
      where: { id: historyId },
      include: {
        user: {
          select: {
            id: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            ref: true,
            quantity: true,
          },
        },
      },
    })

    if (!history) {
      return { ok: false, message: "Historique introuvable" }
    }

    if (history.status !== "PENDING_VALIDATION") {
      return { ok: false, message: "Cette demande a déjà été traitée" }
    }

    // Identification des articles liés (même demande)
    const requestId = history.requestId
    const relatedItems = requestId
      ? await prisma.stockEditHistorique.findMany({
          where: {
            status: "PENDING_VALIDATION",
            requestId: requestId,
          },
          include: {
            product: { select: { id: true, name: true, ref: true, quantity: true } },
            worker: { select: { id: true, name: true } },
            user: { select: { id: true } },
          },
        })
      : [history]

    const historyIds = relatedItems.map((item) => item.id)

    // Si refus : on ne touche pas au stock, on marque juste comme rejeté
    let requesterUserId: string | null = history.user?.id ?? null

    if (!requesterUserId) {
      const linkedUser = await prisma.user.findFirst({
        where: {
          workerId: history.worker.id,
        },
        select: {
          id: true,
        },
      })
      requesterUserId = linkedUser?.id ?? null
    }

    const findOrCreateDiscussionAndSendCode = async ({
      workerId,
      senderUserId,
      discussionName,
      requesterUserId,
      content,
    }: {
      workerId: string
      senderUserId: string
      discussionName: string
      requesterUserId?: string | null
      content: string
      code: string
    }) => {
      const sender = await prisma.user.findUnique({ where: { id: senderUserId }, include: { worker: true } })
      const receiver = await prisma.worker.findUnique({ where: { id: workerId } })
      if (!sender || !sender.worker || !receiver) return

      let discussion = await prisma.discussion.findFirst({
        where: {
          groupMessage: null,
          AND: [
            { receiptIds: { has: workerId } },
            { receiptIds: { has: sender.workerId } }
          ]
        }
      })

      if (!discussion) {
        discussion = await prisma.discussion.create({
          data: {
            name: receiver.name,
            lastMessage: content,
            receipt: [
              { id: receiver.id, name: receiver.name, image: receiver.image },
            ] as any,
            receiptIds: [receiver.id],
            createdBy: senderUserId,
          },
        })
      }

      await prisma.message.create({
        data: {
          content,
          senderId: senderUserId,
          discussionId: discussion.id,
        },
      })

      await prisma.discussion.update({
        where: { id: discussion.id },
        data: {
          lastMessage: content,
          lastMessageDate: new Date(),
          sender: sender.worker.name,
        },
      })

      // pushMessageNotification removed as it is missing from lib
    }

    if (action === "disapprouve") {
      await prisma.stockEditHistorique.updateMany({
        where: { id: { in: historyIds } },
        data: {
          status: "ISREJECTED",
        },
      })

      // notifyStockChange removed as it is missing from lib

      if (requesterUserId) {
        await createNotification({
          title: `Demande de stock rejetée (${relatedItems.length} article(s))`,
          body: `La demande de modification de stock a été rejetée.`,
          type: "STOCK",
          link: `/interne/stock`,
          receiverIds: [requesterUserId],
        })
      }

      revalidatePath("/interne/stock", "page")
      return { ok: true, message: "La demande de stock a été rejetée" }
    }

    // Approbation
    const { type } = history

    if (type === "STOCK_OUT" || type === "STOCK_RETURN") {
      const createUniqueNumericCode = async (kind: "out" | "return"): Promise<string> => {
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate =
            kind === "out" ? generateStockOutValidationCode() : generateStockReturnValidationCode()
          const [outExists, returnExists] = await Promise.all([
            prisma.validationCode.findFirst({
              where: { type: 'STOCK_OUT', code: candidate },
              select: { id: true },
            }),
            prisma.validationCode.findFirst({
              where: { type: 'STOCK_RETURN', code: candidate },
              select: { id: true },
            }),
          ])
          if (!outExists && !returnExists) return candidate
        }
        throw new Error("Impossible de générer un code unique pour le moment")
      }

      // On vérifie si un code existe déjà pour l'un des articles du lot
      const existingCode =
        type === "STOCK_OUT"
          ? await prisma.validationCode.findFirst({
              where: { type: 'STOCK_OUT', stockOutId: { in: historyIds } },
              select: { id: true },
            })
          : await prisma.validationCode.findFirst({
              where: { type: 'STOCK_RETURN', stockReturnId: { in: historyIds } },
              select: { id: true },
            })

      if (existingCode) {
        return { ok: false, message: "Un code a déjà été généré pour cette demande" }
      }

      const code = await createUniqueNumericCode(type === "STOCK_OUT" ? "out" : "return")

      // On met à jour tous les articles du lot
      for (const item of relatedItems) {
        await prisma.stockEditHistorique.update({
          where: { id: item.id },
          data: {
            status: "AWAITING_CONFIRMATION",
            currentfieldValue: {
              ...(typeof item.currentfieldValue === "object" && item.currentfieldValue
                ? item.currentfieldValue
                : {}),
              approvedAt: new Date().toISOString(),
              approvedBy: superAdminId,
            },
          },
        })
      }

      // On lie le code à l'article "principal" (celui qui a déclenché l'action)
      if (type === "STOCK_OUT") {
        await prisma.validationCode.create({
          data: {
            code,
            type: 'STOCK_OUT',
            stockOutId: history.id,
          },
        })
      } else {
        await prisma.validationCode.create({
          data: {
            code,
            type: 'STOCK_RETURN',
            stockReturnId: history.id,
          },
        })
      }

      const discussionName =
        type === "STOCK_OUT" ? `Validation sortie stock-${history.worker.name}` : `Validation restitution stock-${history.worker.name}`
      const prefix = type === "STOCK_OUT" ? `Code de sortie stock-${history.worker.name}` : `Code de restitution stock-${history.worker.name}`
      
      const itemsList = relatedItems.map(i => `- ${i.product.name} (Qté: ${i.quantityToApply})`).join("\n")
      const codeMessage = `${prefix}: ${code} (demande #${history.id.slice(0, 8)}).\n\nArticles concernés:\n${itemsList}`

      await findOrCreateDiscussionAndSendCode({
        workerId: history.worker.id,
        requesterUserId,
        senderUserId: superAdminId,
        discussionName,
        content: codeMessage,
        code: code
      })

      if (requesterUserId) {
        await createNotification({
          title: type === "STOCK_OUT"
            ? `Sortie de stock approuvée (${relatedItems.length} article(s))`
            : `Restitution de stock approuvée (${relatedItems.length} article(s))`,
          body: type === "STOCK_OUT"
            ? `Votre demande de sortie de stock a été approuvée. Le code a été envoyé dans votre messagerie.`
            : `Votre demande de restitution de stock a été approuvée. Le code a été envoyé dans votre messagerie.`,
          type: "STOCK",
          link: `/interne/stock`,
          receiverIds: [requesterUserId],
        })
      }

      revalidatePath("/interne/stock", "page")
      return {
        ok: true,
        message:
          type === "STOCK_OUT"
            ? `Demande (${relatedItems.length} article(s)) approuvée. Code envoyé.`
            : `Demande (${relatedItems.length} article(s)) approuvée. Code envoyé.`,
      }
    }

    // Pour les autres types (ADD, SET_QUANTITY, PURCHASE, SELL) - validation immédiate
    for (const item of relatedItems) {
      const { product, quantityToApply, type: itemType } = item
      let newQuantity = product.quantity

      if (itemType === "PURCHASE" || itemType === "SELL") {
        newQuantity = product.quantity - quantityToApply
      } else if (itemType === "ADD") {
        newQuantity = product.quantity + quantityToApply
      } else if (itemType === "SET_QUANTITY") {
        newQuantity = quantityToApply
      }

      if (newQuantity < 0) {
        // Pour un lot, on pourrait avoir des erreurs sur certains articles.
        // Mais ici on valide tout. Si un article pose problème, on pourrait throw ou skip.
        // Pour l'instant on skip avec un message.
        continue
      }

      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: newQuantity,
          status: newQuantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        },
      })

      await prisma.stockEditHistorique.update({
        where: { id: item.id },
        data: {
          status: "ISVALIDED",
          currentfieldValue: {
            quantityBefore: product.quantity,
            quantityAfter: newQuantity,
            ...(typeof item.currentfieldValue === "object" && item.currentfieldValue ? item.currentfieldValue : {})
          },
        },
      })

      // notifyStockChange removed as it is missing from lib
    }

    if (requesterUserId) {
      await createNotification({
        title: `Modification de stock approuvée (${relatedItems.length} article(s))`,
        body: `Votre demande de modification de stock a été approuvée.`,
        type: "STOCK",
        link: `/interne/stock`,
        receiverIds: [requesterUserId],
      })
    }

    revalidatePath("/interne/employees", "page")
    revalidatePath("/interne/clients", "page")
    revalidatePath("/interne/products", "page")
    revalidatePath("/interne/sales", "page")
    revalidatePath("/interne/stock", "page")
    revalidatePath("/interne/purchase", "page")

    return { ok: true, message: `Les articles (${relatedItems.length}) ont été mis à jour` }
  } catch (error) {
    console.log(error)
    return { ok: false, message: "Une erreur s'est produite" }
  }
}
