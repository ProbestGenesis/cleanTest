import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { put } from '@vercel/blob'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json(
        { message: "Erreur d'authentification" },
        {
          status: 401,
        }
      )
    }
    const form = await request.formData()
    const file = form.get('file') as File

    const uniqueName = `${Date.now()}-${file.name}`
    const blob = await put(uniqueName, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    return NextResponse.json(blob)
  } catch (error) {
    return NextResponse.json(
      { message: "Une erreur s'est produite" },
      {
        status: 500,
      }
    )
  }
}
