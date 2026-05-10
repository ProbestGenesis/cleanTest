import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get("providerId")
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const skip = (page - 1) * limit

  try {
    const where: any = {}
    if (providerId) where.providerId = providerId
    if (status) where.status = status

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          provider: true,
          purchaseItems: true,
          author: true,
        },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ])

    return NextResponse.json({
      purchases,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
