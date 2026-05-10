import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserStar } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import clsx from 'clsx'
import { Spinner } from '@/components/ui/spinner'
import { useTransition, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Worker } from '@/generated/prisma/client'

type Props = {
    data: Worker
}

function SetRoleDialog({data}: Props) {
    const router = useRouter()
      const [isPending, startTransition] = useTransition()
      const [isSuccess, setIsSuccess] = useState<{ message: string; ok: undefined | boolean }>({
        message: '',
        ok: undefined,
      })

      const [openDialog, setOpenDialog] = useState(false)
  const clearMessage = () => {
    setIsSuccess({ ok: false, message: '' })
  }

  const closeDialog = () => {
    setOpenDialog(false)
  }
  const handleAdmin = async () => {
    const { data: newUser, error } = await authClient.admin.createUser({
      email: data.email,
      password: data.matricule,
      name: data.name,
      role: 'admin',
    })

    if (error) {
      setIsSuccess({ message: "Une erreur s'est produite veuillez ressayer", ok: false })
    }

    setIsSuccess({
      message: `Felicitation ${data.name} a maintenant access au privilege administrateur`,
      ok: true,
    })
    setTimeout(() => {
      clearMessage()
      closeDialog()
      router.refresh()
    }, 1000)
  }
  return (
    <Dialog onOpenChange={closeDialog} open={openDialog}>
              
                <div className="flex flex-col space-y-2 cursor-pointer" onClick={() => setOpenDialog(true)}>
                  {' '}
                  <span className="flex  justify-between  w-full hover:bg-accent hover:text-accent-foreground transition-all py-2 px-0.5 rounded">
                    Definir un role
                    <UserStar size={16} />
                  </span>
                 
                </div>
              
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Définir le role de cette employé</DialogTitle>

                  <DialogDescription>
                    Lorem ipsum dolor sit, amet consectetur adipisicing elit. 
                  </DialogDescription>
                </DialogHeader>

                <div>
                    
                </div>
                <DialogFooter>
                  <div className="flex justify-end items-center space-x-4">
                    <Button className="rounded-full" variant={'outline'} onClick={() => setOpenDialog(false)}>
                      Annuler
                    </Button>
                    {!isSuccess.message && (
                      <Button
                        className="rounded-full"
                        onClick={() =>
                          startTransition(async () => {
                            await handleAdmin()
                          })
                        }
                      >
                        {isPending ? <Spinner /> : ` Ajouter comme admin`}
                      </Button>
                    )}
                  </div>
                </DialogFooter>

                {isSuccess.message && (
                  <p className={clsx('text-center mx-auto font-medium', {
                      'text-green-500': isSuccess.ok,
                      'text-destructive': isSuccess.ok === false,
                    })}>
                    {isSuccess.message}
                  </p>
                )}
              </DialogContent>
            </Dialog>
  )
}

export default SetRoleDialog