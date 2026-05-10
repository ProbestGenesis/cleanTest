import { prisma } from "@/lib/prisma"
import type {
  Prisma,
  WorkerStatus,
  WorkerType,
} from "@/generated/prisma/client"
import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

const workerTypes: WorkerType[] = ["CDI", "CDD", "TRAINEE"]
const workerStatuses: WorkerStatus[] = [
  "ACTIF",
  "INACTIF",
  "FIRED",
  "TIMEOFF",
  "VACATION",
  "SICK_LEAVE",
]

const isWorkerType = (value: string): value is WorkerType =>
  workerTypes.includes(value as WorkerType)

const isWorkerStatus = (value: string): value is WorkerStatus =>
  workerStatuses.includes(value as WorkerStatus)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")?.toLowerCase()
    const type = searchParams.get("type")

    const whereClause: Prisma.WorkerWhereInput = {}

    // Filtrer par type (CDI, CDD, TRAINEE)
    if (type && isWorkerType(type)) {
      whereClause.type = type
    }

    // Filtrer par statut
    if (status && status !== "all") {
      if (status === "active") {
        whereClause.status = {
          in: ["ACTIF", "TIMEOFF", "VACATION", "SICK_LEAVE"],
        }
      } else if (status === "inactive") {
        whereClause.status = {
          in: ["INACTIF", "FIRED"],
        }
      } else if (isWorkerStatus(status)) {
        whereClause.status = status
      }
    }

    // Filtrer par recherche (nom, email, téléphone)
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    // Exclure les Directeurs et les Superadmins
    whereClause.NOT = [
      { role: { equals: "Directeur", mode: "insensitive" } },
      {
        workAccount: {
          OR: [
            { role: { equals: "superadmin", mode: "insensitive" } },
            { workRole: { equals: "Directeur", mode: "insensitive" } },
          ],
        },
      },
    ]

    const workers = await prisma.worker.findMany({
      where: whereClause,
      include: {
        workAccount: {
          select: {
            id: true,
            role: true,
            banned: true,
            pageAccess: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(
      {
        success: true,
        data: workers,
        count: workers.length,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching workers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workers",
      },
      { status: 500 }
    )
  }
}
