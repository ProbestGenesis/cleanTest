import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { CACHE_CONFIG } from '@/lib/constants/caching'

export async function GET(request: NextRequest) {
  try {
    const tasks = await prisma.particularTask.findMany({
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        adjoint: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: tasks,
      },
      {
        headers: {
          'Cache-Control': CACHE_CONFIG.API.workers, // Reusing workers cache policy for now or we can add a specific one
        },
      }
    )
  } catch (error) {
    console.error('Error fetching particular tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch particular tasks',
      },
      { status: 500 }
    )
  }
}
