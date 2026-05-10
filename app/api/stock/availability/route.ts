import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsString = searchParams.get('ids')
    if (!idsString) {
      return NextResponse.json({ success: true, data: [] })
    }

    const ids = idsString.split(',')

    const pendingReservations = await prisma.stockEditHistorique.groupBy({
      by: ['productId'],
      where: {
        productId: { in: ids },
        status: { in: ['PENDING_VALIDATION', 'AWAITING_CONFIRMATION'] },
        type: { in: ['SELL', 'STOCK_OUT'] },
      },
      _sum: { quantityToApply: true },
    })

    const pendingMap = new Map(
      pendingReservations.map((p) => [p.productId, p._sum.quantityToApply || 0])
    )

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, quantity: true },
    })

    const data = products.map((p) => {
      const reserved = pendingMap.get(p.id) || 0
      return {
        productId: p.id,
        stock: p.quantity,
        reserved: reserved,
        available: p.quantity - reserved,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch availability' }, { status: 500 })
  }
}
