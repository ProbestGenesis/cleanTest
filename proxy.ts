import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { superAdminIsAlreadySet } from './lib/isAdmin'
import { getPageAccessIdFromPath, normalizePageAccess } from './lib/pageAccess'

const adminRoutes = ['/interne/accounting']
const registerRoute = ['/auth/register']
const publicRoutes = ['/', '/auth']
const internePrefix = '/interne'

export async function proxy(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const path = req.nextUrl.pathname
  const isAdminRoute = adminRoutes.some(
    (adminRoute) => path === adminRoute || path.startsWith(`${adminRoute}/`)
  )
  const isPublicRoute = publicRoutes.includes(path)
  const isInterneRoute = path === internePrefix || path.startsWith(`${internePrefix}/`)
  const isRegisterRoute = registerRoute.includes(path)
  const superAdminExist = await superAdminIsAlreadySet()

  // --- Cas : pas de session
  if (!session) {

    if(path === "/"){
      return NextResponse.redirect(new URL('/auth', req.nextUrl))
    }
    // Autoriser la page d'enregistrement
    if (isRegisterRoute) {
      return NextResponse.next()
    }

    // Si aucun superadmin n'existe encore, forcer l'enregistrement (sauf si on est déjà sur /auth/register)
    if (!superAdminExist) {
      return NextResponse.redirect(new URL('/auth/register', req.nextUrl))
    }

    // Toutes les pages internes sont protégées
    if (isInterneRoute) {
      return NextResponse.redirect(new URL('/auth', req.nextUrl))
    }

    // Pages publiques ou autres -> laisser passer
    return NextResponse.next()
  }

  // --- Cas : session présente
  const role = session.user?.role

  // Si route admin et rôle non autorisé -> dashboard
  if (isAdminRoute && role !== 'admin' && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  // Contrôle fin des pages internes pour les employés
  if (isInterneRoute && role !== 'admin' && role !== 'superadmin') {
    const requiredAccess = getPageAccessIdFromPath(path)
    if (requiredAccess) {
      const allowedAccess = normalizePageAccess(session.user?.pageAccess)
      if (!allowedAccess.includes(requiredAccess)) {
        return NextResponse.redirect(new URL('/', req.nextUrl))
      }
    }
  }

  // Si utilisateur connecté tente d'accéder à une page publique (login/home) -> dashboard
  // On évite de rediriger si on est déjà sur la destination ('/')
  if ((isPublicRoute && path !== '/') || (isRegisterRoute && superAdminExist)) {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
    '/interne/:path*',
    '/auth/:path*',
  ],
}
