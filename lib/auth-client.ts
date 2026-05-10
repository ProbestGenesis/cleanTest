import { adminClient, customSessionClient, emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { ac, admin, superadmin, user } from './permission'

import type { auth } from '@/lib/auth'
export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    emailOTPClient(),
    adminClient({
      ac,
      roles: {
        superadmin,
        admin,
        user,
      },
    }),
    customSessionClient<typeof auth>(),
  ],
})
