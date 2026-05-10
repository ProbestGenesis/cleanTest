import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { CACHE_CONFIG } from '@/lib/constants/caching'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly'

    let whereClause: any = {}

    // Filter by report type
    if (type === 'weekly') {
      // Get reports from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      whereClause.createdAt = {
        gte: sevenDaysAgo,
      }
    }

    const rapports = await prisma.rapport.findMany({
      where: whereClause,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            body: true,
            done: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 50,
    })

    // Map to include progress calculation
    const rapportsWithProgress = rapports.map((rapport) => ({
      ...rapport,
      progress: rapport.tasks.length > 0
        ? Math.round(
            (rapport.tasks.filter((t) => t.done).length / rapport.tasks.length) * 100
          )
        : 0,
    }))

    return NextResponse.json(
      {
        success: true,
        data: rapportsWithProgress,
        count: rapportsWithProgress.length,
      },
      {
        headers: {
          'Cache-Control': CACHE_CONFIG.API.workers,
        },
      }
    )
  } catch (error) {
    console.error('Error fetching rapports:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rapports',
      },
      { status: 500 }
    )
  }
}
