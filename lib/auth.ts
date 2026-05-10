import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin as adminPlugin, customSession } from 'better-auth/plugins'
import { emailOTP } from 'better-auth/plugins/email-otp'
//import { sendEmail } from './notifications/email'
import { ac, admin, assistant_administratif, charger_inventaire, superadmin, user } from './permission'
import { prisma } from './prisma'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      passwordIsAlreadySet: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
      workerId: {
        type: 'string',
        required: false,
        input: false,
      },
      workRole: {
        type: 'string',
        required: false,
        input: false,
      },
      pageAccess: {
        type: "string[]",
        required: false,
        input: false
      },
      particularRole: {
        type: "string[]",
        required: false,
        input: false
      }
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async () => {},
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        superadmin,
        admin,
        assistant_administratif,
        charger_inventaire,
        user,
      },
    }),
    customSession(async ({ user, session }) => {
      return {
        user: {
          ...user,
          passwordIsAlreadySet: (user as any).passwordIsAlreadySet,
          workerId: (user as any).workerId,
          role: (user as any).role,
          workRole: (user as any).workRole,
          pageAccess: (user as any).pageAccess,
          particularRole: (user as any).particularRole
        },
        session,
      }
    }),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
})
