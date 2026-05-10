import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = session.user.id

    // Get the worker associated with the user
    const userWithWorker = await prisma.user.findUnique({
      where: { id: userId },
      select: { worker: { select: { id: true } } }
    })

    if (!userWithWorker?.worker) {
      return NextResponse.json({ ok: true, data: [] })
    }

    const workerId = userWithWorker.worker.id

    // Fetch discussions where the user is a participant and has not "deleted" it
    const discussions = await prisma.discussion.findMany({
      where: {
        receiptIds: { has: workerId },
        NOT: {
          deletedBy: { has: userId }
        }
      },
      include: {
        groupMessage: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      ok: true,
      message: "Discussions récupérées",
      data: discussions
    })
  } catch (error) {
    console.error("Error fetching discussions:", error)
    return NextResponse.json({ ok: false, message: "Erreur serveur" }, { status: 500 })
  }
}
