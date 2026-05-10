import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getStockQueryResponse } from '@/lib/actions/stock/query/query'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const option = searchParams.get('option')

    const result = await getStockQueryResponse({
      page,
      limit,
      search,
      category,
      option,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json({ ok: false, message: 'Failed to fetch stock' }, { status: 500 })
  }
}
