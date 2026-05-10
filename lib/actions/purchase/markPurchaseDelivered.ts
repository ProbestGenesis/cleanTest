"use server"

import { isAuthedId } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { generatePurchaseValidationCode } from "@/lib/stock/validation-code"
import { revalidatePath } from "next/cache"
import z from "zod"

const markPurchaseDeliveredSchema = z.object({
  purchaseId: z.string().min(1, "Achat invalide"),
})

export const markPurchaseDelivered = async (
  value: z.infer<typeof markPurchaseDeliveredSchema>
) => {
  try {
    const parsed = markPurchaseDeliveredSchema.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Données invalides",
      }
    }

    const userId = await isAuthedId()
    if (!userId)
      return { ok: false as const, message: "Erreur d'authentification" }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { worker: { select: { id: true, name: true } } },
    })
    if (!user?.worker)
      return {
        ok: false as const,
        message: "Vous n'êtes pas enregistré en tant qu'employé",
      }
    const worker = user.worker

    const purchase = await prisma.purchase.findUnique({
      where: { id: parsed.data.purchaseId },
      include: {
        product: {
          select: { id: true, quantity: true, name: true, ref: true },
        },
        validationCode: true,
        user: {
          select: {
            id: true,
            name: true,
            worker: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })

    if (!purchase) return { ok: false as const, message: "Achat introuvable" }
    if (purchase.userId !== userId && user.role !== "superadmin") {
      return {
        ok: false as const,
        message: "Vous n'êtes pas autorisé à modifier cet achat",
      }
    }
    if (purchase.status === "CONFIRMED") {
      return {
        ok: false as const,
        message: "Cet achat a déjà été confirmé par le stock.",
      }
    }
    if (!purchase.productId || !purchase.product) {
      return {
        ok: false as const,
        message: "Le produit lié à cet achat est introuvable.",
      }
    }
    const product = purchase.product
    const initiatorWorker = purchase.user?.worker ?? null

    const existingCode = purchase.validationCode?.code ?? null
    if (existingCode && purchase.status === "DELIVERED") {
      return {
        ok: true as const,
        message:
          "La livraison a déjà été déclarée. Le code de confirmation est déjà disponible.",
        data: {
          code: existingCode,
          purchaseId: purchase.id,
          status: purchase.status,
        },
      }
    }

    const code = generatePurchaseValidationCode()
    const quantity = Number.parseInt(String(purchase.quantity), 10) || 0
    if (quantity <= 0) {
      return {
        ok: false as const,
        message: "La quantité de l’achat est invalide.",
      }
    }

    const validationWorkers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "superadmin" },
          { particularRole: { has: "Validation code achat" } },
        ],
      },
      select: { id: true },
    })

    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "DELIVERED" },
      })

      await tx.validationCode.upsert({
        where: { purchaseId: purchase.id },
        create: {
          code,
          type: "PURCHASE",
          purchase: { connect: { id: purchase.id } },
        },
        update: {
          code,
          usedAt: null,
          usedByWorkerId: null,
        },
      })

      await tx.stockEditHistorique.upsert({
        where: { purchaseId: purchase.id },
        create: {
          workerId: worker.id,
          userId,
          productId: purchase.productId!,
          purchaseId: purchase.id,
          type: "PURCHASE",
          quantityToApply: quantity,
          actualQuantity: product.quantity,
          reservedQuantity: 0,
          status: "AWAITING_CONFIRMATION",
          client: purchase.contact || null,
          reason: purchase.designation || purchase.category,
          destination: purchase.provider,
        },
        update: {
          workerId: worker.id,
          userId,
          productId: purchase.productId!,
          type: "PURCHASE",
          quantityToApply: quantity,
          actualQuantity: product.quantity,
          reservedQuantity: 0,
          status: "AWAITING_CONFIRMATION",
          client: purchase.contact || null,
          reason: purchase.designation || purchase.category,
          destination: purchase.provider,
        },
      })

      if (validationWorkers.length > 0) {
        await tx.notification.create({
          data: {
            emitter: { connect: { id: userId } },
            receiptIds: validationWorkers.map((worker) => worker.id),
            readByIds: validationWorkers.some((worker) => worker.id === userId)
              ? [userId]
              : [],
            type: "PURCHASE",
            title: "Livraison d’achat à confirmer",
            body: `${worker.name} a déclaré la livraison de l'achat "${purchase.designation || purchase.category}". Code: ${code}`,
            link: "/interne/purchases",
          },
        })
      }
    })

    if (initiatorWorker) {
      await sendPurchaseCodeToInitiator({
        initiatorId: purchase.userId,
        initiatorWorker,
        code,
        purchaseId: purchase.id,
        purchaseLabel: purchase.designation || purchase.category,
        invoiceNumber: purchase.invoiceNumber ?? null,
      })
    }

    revalidatePath("/interne/purchases")
    revalidatePath("/interne/stock")
    revalidatePath("/interne/products")
    revalidatePath("/")
    revalidatePath("/interne/messages")

    return {
      ok: true as const,
      message: "Livraison déclarée. Le code de confirmation est prêt.",
      data: { code, purchaseId: purchase.id, status: "DELIVERED" as const },
    }
  } catch (error) {
    console.log(error)
    return { ok: false as const, message: "Une erreur s'est produite" }
  }
}

async function sendPurchaseCodeToInitiator({
  initiatorId,
  initiatorWorker,
  code,
  purchaseId,
  purchaseLabel,
  invoiceNumber,
}: {
  initiatorId: string
  initiatorWorker: { id: string; name: string; image: string | null }
  code: string
  purchaseId: string
  purchaseLabel: string | null
  invoiceNumber: string | null
}) {
  const threadName = "Validation d’achat"
  const existingThread = await prisma.discussion.findFirst({
    where: {
      createdBy: initiatorId,
      name: threadName,
    },
    select: { id: true },
  })

  const discussionId =
    existingThread?.id ??
    (
      await prisma.discussion.create({
        data: {
          name: threadName,
          lastMessage: "Nouveau code de validation d’achat",
          lastMessageDate: new Date(),
          sender: initiatorId,
          createdBy: initiatorId,
          receipt: [
            {
              id: initiatorWorker.id,
              name: initiatorWorker.name,
              image: initiatorWorker.image,
            },
          ] as any,
          receiptIds: [initiatorWorker.id],
          deletedBy: [],
        },
        select: { id: true },
      })
    ).id

  const messageContent = [
    `Code de confirmation d’achat: ${code}`,
    purchaseLabel ? `Achat: ${purchaseLabel}` : null,
    invoiceNumber ? `Facture: ${invoiceNumber}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  await prisma.message.create({
    data: {
      discussionId,
      senderId: initiatorId,
      content: messageContent,
      receipt: [initiatorWorker.id],
    },
    select: { id: true },
  })

  await prisma.discussion.update({
    where: { id: discussionId },
    data: {
      lastMessage: `Code achat: ${code}`,
      lastMessageDate: new Date(),
      sender: initiatorId,
      deletedBy: [],
    },
    select: { id: true },
  })
}
