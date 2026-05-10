import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { CACHE_CONFIG } from '@/lib/constants/caching'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let whereClause: any = {}

    // Filter by status
    if (status === 'in-progress') {
      whereClause.done = false
      whereClause.progress = {
        gt: 0,
        lt: 100,
      }
    } else if (status === 'completed') {
      whereClause.done = true
    } else if (status === 'pending') {
      whereClause.progress = 0
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo)
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        assginedBy: {
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
        count: tasks.length,
      },
      {
        headers: {
          'Cache-Control': CACHE_CONFIG.API.workers,
        },
      }
    )
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      { status: 500 }
    )
  }
}
