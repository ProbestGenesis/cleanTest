import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { CACHE_CONFIG } from '@/lib/constants/caching'

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        chef: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        worker: {
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
        data: teams,
        count: teams.length,
      },
      {
        headers: {
          'Cache-Control': CACHE_CONFIG.API.workers,
        },
      }
    )
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams',
      },
      { status: 500 }
    )
  }
}
