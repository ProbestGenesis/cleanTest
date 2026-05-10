import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        provider: true,
        purchaseItems: {
            include: {
                product: true
            }
        },
        author: true,
        project: true
      },
    })

    if (!purchase) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error("Error fetching purchase details:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
