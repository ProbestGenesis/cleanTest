import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({
      where: {
        NOT: [
          { role: { equals: "Directeur", mode: "insensitive" } },
          {
            workAccount: {
              OR: [
                { role: { equals: "superadmin", mode: "insensitive" } },
                { workRole: { equals: "Directeur", mode: "insensitive" } },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        salary: true,
        socialContributions: true,
      },
    })

    const onLeaveEmployees = workers.filter(
      (w) => w.status === "TIMEOFF" || w.status === "VACATION"
    )
    const inactiveEmployees = workers.filter(
      (w) => w.status === "INACTIF" || w.status === "FIRED"
    )

    const permanentWorkers = workers.filter((w) => w.type === "CDI")
    const temporaryWorkers = workers.filter((w) => w.type === "CDD")
    const traineeWorkers = workers.filter((w) => w.type === "TRAINEE")

    const stats = {
      permanents: permanentWorkers.length,
      temporaries: temporaryWorkers.length,
      trainees: traineeWorkers.length,
      onLeave: onLeaveEmployees.length,
      inactive: inactiveEmployees.length,
      onLeaveEmployees: onLeaveEmployees.map((w) => ({
        id: w.id,
        name: w.name,
        status: w.status,
      })),
      inactiveEmployees: inactiveEmployees.map((w) => ({
        id: w.id,
        name: w.name,
        status: w.status,
      })),
      totalSalary: workers.reduce((sum, w) => sum + w.salary, 0),
      totalTraineeSalary: traineeWorkers.reduce((sum, w) => sum + w.salary, 0),
      totalContributions: workers.reduce(
        (sum, w) => sum + (w.socialContributions || 0),
        0
      ),
      workerSalaries: workers.map((w) => ({
        id: w.id,
        name: w.name,
        salary: w.salary,
        socialContributions: w.socialContributions || w.salary * 0.315, // Fallback to 31.5% if not set
      })),
    }

    return NextResponse.json(
      { success: true, data: stats },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
