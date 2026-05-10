import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const providerId = params.id

  try {
    const purchases = await prisma.purchase.findMany({
      where: { providerId },
      include: {
        purchaseItems: true,
      },
    })

    const totalSpent = purchases.reduce((acc, p) => acc + p.totalAmount, 0)
    const totalPurchases = purchases.length
    const pendingCount = purchases.filter(p => p.status === 'PAYMENT_DONE').length

    // Average delivery delay
    const deliveredPurchases = purchases.filter(p => p.status === 'CONFIRMED' || p.status === 'DELIVERED')
    let averageDeliveryDelay = 0
    if (deliveredPurchases.length > 0) {
        const totalDelay = deliveredPurchases.reduce((acc, p) => {
            const delay = (p.updatedAt.getTime() - p.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
            return acc + delay
        }, 0)
        averageDeliveryDelay = totalDelay / deliveredPurchases.length
    }

    return NextResponse.json({
      totalSpent,
      totalPurchases,
      pendingCount,
      averageDeliveryDelay,
    })
  } catch (error) {
    console.error("Error fetching provider KPIs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
