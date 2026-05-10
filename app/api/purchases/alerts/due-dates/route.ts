import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const now = new Date()
    const alerts = await prisma.purchase.findMany({
      where: {
        isPaid: false,
        dueDate: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Due within 7 days
        },
      },
      include: {
        provider: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error("Error fetching payment alerts:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
