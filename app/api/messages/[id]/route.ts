import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = session.user.id
    const discussionId = id

    // Get the worker associated with the user
    const userWithWorker = await prisma.user.findUnique({
      where: { id: userId },
      select: { worker: { select: { id: true } } }
    })

    if (!userWithWorker?.worker) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const workerId = userWithWorker.worker.id

    // Fetch discussion with messages and members
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        groupMessage: true,
      }
    })

    if (!discussion) {
      return NextResponse.json({ ok: false, message: "Discussion introuvable" }, { status: 404 })
    }

    // Check if the user is a participant
    if (!discussion.receiptIds.includes(workerId)) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Map members (using receiptIds and receipt JSON if available)
    // For simplicity, we can assume 'receipt' field contains Member objects
    const members = (discussion.receipt as any[]) || []

    const data = {
      ...discussion,
      isGroup: !!discussion.groupMessage,
      members,
    }

    return NextResponse.json({
      ok: true,
      message: "Discussion récupérée",
      data
    })
  } catch (error) {
    console.error("Error fetching discussion:", error)
    return NextResponse.json({ ok: false, message: "Erreur serveur" }, { status: 500 })
  }
}
