"use server"
import { prisma } from "@/lib/prisma"

export const editPasswordState = async (id: string) => {
 try{
    if(!id){
        return {
            ok: false,
            message: "Erreur d authentification"
        }
    }
    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            passwordIsAlreadySet: true
        }
    })
    return {
        ok: true,
        message: "Success"
    }
 }

 catch(error){
    return {
        ok: false,
        message: "Impossible de modifier l'état de mise à jour de votre mot de passe"
    }
 }
}