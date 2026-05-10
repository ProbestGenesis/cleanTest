import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(providers)
  } catch (error) {
    console.error("Error fetching providers:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
