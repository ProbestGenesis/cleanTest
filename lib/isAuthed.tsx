"use server"
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Session =  {
    session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined;
        userAgent?: string | null | undefined;
        impersonatedBy?: string | null | undefined;
    };
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
    };
}

export const isAuthed = async (): Promise<any> => {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if(!session){
      return null
    }
    return session
}

export const isAuthedId = async ()  => {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if(!session){
      return null
    }
    return session.user.id
}


export const isAuthedIdWithRole = async ()  => {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if(!session){
    return { id: null, role: null }
  }
  return { id: session.user.id, role: session.user.role }
}